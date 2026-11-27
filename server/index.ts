import type { ServerWebSocket } from 'bun'
import { AVATARS, BLIND_PRESETS } from '../src/data/mock'
import { applyMove, createGame, getLegalActions, HAND_RESULT_DELAY_MS, startHand } from '../src/game/engine'
import type { GameState, Move, Player, PlayerSeed } from '../src/game/engine'
import type { OnlineMessage, RoomSnapshot, ServerMessage } from '../src/game/onlineProtocol'

interface SocketData {
  roomCode?: string
  playerId?: string
}

interface Member {
  id: string
  token: string
  name: string
  avatar: string
  chips: number | null
  socket: ServerWebSocket<SocketData> | null
  expiresAt: number | null
}

interface Room {
  code: string
  hostId: string
  members: Member[]
  maxPlayers: number
  smallBlind: number
  bigBlind: number
  game: GameState | null
  messages: OnlineMessage[]
  nextMessageId: number
  nextHandAt: number | null
  nextHandTimer: ReturnType<typeof setTimeout> | null
}

const RECONNECT_MS = 60_000
const MAX_MESSAGE_BYTES = 4096

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function send(socket: ServerWebSocket<SocketData>, message: ServerMessage) {
  socket.send(JSON.stringify(message))
}

function error(socket: ServerWebSocket<SocketData>, message: string, fatal = false) {
  send(socket, { type: 'error', message, fatal })
  if (fatal) socket.close()
}

function validProfile(name: unknown, avatar: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 16 &&
    typeof avatar === 'string' && AVATARS.includes(avatar)
}

function makeCode(rooms: Map<string, Room>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code: string
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
  } while (rooms.has(code))
  return code
}

function seed(member: Member, chips: number): PlayerSeed {
  return { id: member.id, name: member.name, avatar: member.avatar, chips, isYou: false, isBot: false }
}

function newPlayer(member: Member, chips: number, seat: number): Player {
  return {
    ...seed(member, chips), seat, bet: 0, totalBet: 0, cards: [], folded: false,
    allIn: false, acted: false, lastActedBet: null, lastAction: null, revealed: false, winAmount: 0,
  }
}

function viewGame(game: GameState, playerId: string): GameState {
  return {
    ...game,
    deck: [],
    players: game.players.map((player) => {
      const visible = player.id === playerId || player.revealed
      return {
        ...player,
        isYou: player.id === playerId,
        cards: visible ? player.cards : [],
        hiddenCardCount: visible ? 0 : player.cards.length,
      }
    }),
  }
}

function snapshot(room: Room, playerId: string): RoomSnapshot {
  return {
    code: room.code,
    hostId: room.hostId,
    playerId,
    maxPlayers: room.maxPlayers,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    players: room.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      connected: member.socket !== null,
      waiting: room.game !== null && !room.game.players.some((player) => player.id === member.id),
      chips: member.chips,
    })),
    game: room.game ? viewGame(room.game, playerId) : null,
    nextHandAt: room.nextHandAt,
    messages: room.messages,
  }
}

function broadcast(room: Room) {
  for (const member of room.members) {
    if (member.socket) send(member.socket, { type: 'snapshot', room: snapshot(room, member.id) })
  }
}

function assignHost(room: Room) {
  if (room.members.some((member) => member.id === room.hostId && member.socket)) return
  const next = room.members.find((member) => member.socket)
  if (next) room.hostId = next.id
}

function foldDisconnectedTurns(room: Room) {
  while (room.game?.phase === 'playing') {
    const actor = room.game.players[room.game.turn]
    if (!actor || room.members.some((member) => member.id === actor.id && member.socket)) break
    const next = applyMove(room.game, room.game.turn, { kind: 'fold' })
    if (next === room.game) break
    room.game = next
  }
}

function removeExpired(room: Room, now: number) {
  room.members = room.members.filter((member) => member.expiresAt === null || member.expiresAt > now)
  assignHost(room)
  foldDisconnectedTurns(room)
}

function beginNextHand(room: Room): boolean {
  if (!room.game || room.game.phase !== 'handOver') return false
  const members = room.members.filter((member) => member.socket)
  if (members.length < 2) return false
  const oldPlayers = room.game.players
  for (const member of room.members) {
    const player = oldPlayers.find((item) => item.id === member.id)
    if (player) member.chips = player.chips
  }
  const keep = new Set(members.map((member) => member.id))
  const players = oldPlayers.filter((player) => keep.has(player.id))
  for (const member of members) {
    if (!players.some((player) => player.id === member.id)) {
      players.push(newPlayer(member, member.chips ?? room.game.startingChips, players.length))
    }
  }
  if (players.filter((player) => player.chips > 0).length < 2) return false
  const oldDealer = room.game.dealerIndex
  let dealerIndex = -1
  for (let step = 0; step < oldPlayers.length; step++) {
    const candidate = oldPlayers[(oldDealer - step + oldPlayers.length) % oldPlayers.length]
    const index = players.findIndex((player) => player.id === candidate?.id)
    if (index >= 0) {
      dealerIndex = index
      break
    }
  }
  room.game = startHand({
    ...room.game,
    players: players.map((player, index) => ({ ...player, seat: index })),
    dealerIndex,
  })
  return true
}

function validMove(value: unknown, game: GameState, playerId: string): Move | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null
  const index = game.players.findIndex((player) => player.id === playerId)
  const legal = getLegalActions(game, index)
  if (!legal) return null
  if (value.kind === 'fold') return { kind: 'fold' }
  if (value.kind === 'check' && legal.canCheck) return { kind: 'check' }
  if (value.kind === 'call' && legal.canCall) return { kind: 'call' }
  if (value.kind === 'allin' && legal.canAllIn) return { kind: 'allin' }
  if (
    value.kind === 'raise' && legal.canRaise && typeof value.amount === 'number' &&
    Number.isSafeInteger(value.amount) && value.amount >= legal.minRaiseTo && value.amount <= legal.maxRaiseTo
  ) return { kind: 'raise', amount: value.amount }
  return null
}

export function createPokerServer(port: number, allowedOrigins: string[], hostname = '127.0.0.1') {
  const rooms = new Map<string, Room>()
  function updateNextHand(room: Room) {
    const game = room.game
    const canContinue = game?.phase === 'handOver' && room.members.filter((member) => {
      if (!member.socket) return false
      const player = game.players.find((item) => item.id === member.id)
      return (player?.chips ?? member.chips ?? game.startingChips) > 0
    }).length >= 2
    if (!canContinue) {
      if (room.nextHandTimer) clearTimeout(room.nextHandTimer)
      room.nextHandTimer = null
      room.nextHandAt = null
      return
    }
    if (room.nextHandTimer) return
    room.nextHandAt = Date.now() + HAND_RESULT_DELAY_MS
    room.nextHandTimer = setTimeout(() => {
      room.nextHandTimer = null
      room.nextHandAt = null
      if (!beginNextHand(room)) {
        console.error('Unable to start a scheduled poker hand')
        for (const member of room.members) {
          if (member.socket) error(member.socket, 'ไม่สามารถเริ่มมือถัดไปได้ กรุณาลองอีกครั้ง')
        }
        broadcast(room)
        return
      }
      updateNextHand(room)
      broadcast(room)
    }, HAND_RESULT_DELAY_MS)
    room.nextHandTimer.unref()
  }

  const server = Bun.serve<SocketData>({
    port,
    hostname,
    fetch(request, server) {
      const url = new URL(request.url)
      if (url.pathname === '/health') return new Response('ok')
      if (url.pathname !== '/ws') return new Response('Not found', { status: 404 })
      const origin = request.headers.get('origin')
      if (!origin || !allowedOrigins.includes(origin)) return new Response('Origin not allowed', { status: 403 })
      if (server.upgrade(request, { data: {} })) return
      return new Response('WebSocket required', { status: 400 })
    },
    websocket: {
      maxPayloadLength: MAX_MESSAGE_BYTES,
      open(socket) {
        const timer = setTimeout(() => {
          if (!socket.data.roomCode && socket.readyState === WebSocket.OPEN) {
            error(socket, 'หมดเวลาเข้าห้อง', true)
          }
        }, 10_000)
        timer.unref()
      },
      message(socket, raw) {
        if (typeof raw !== 'string') return error(socket, 'ข้อความไม่ถูกต้อง')
        let value: unknown
        try {
          value = JSON.parse(raw)
        } catch {
          return error(socket, 'ข้อความไม่ถูกต้อง')
        }
        if (!isRecord(value) || typeof value.type !== 'string') return error(socket, 'ข้อความไม่ถูกต้อง')

        if (!socket.data.roomCode) {
          if (value.type === 'create') {
            if (
              !validProfile(value.name, value.avatar) || typeof value.avatar !== 'string' ||
              (value.maxPlayers !== 4 && value.maxPlayers !== 6) ||
              !BLIND_PRESETS.some((blind) => blind.smallBlind === value.smallBlind && blind.bigBlind === value.bigBlind)
            ) return error(socket, 'ข้อมูลห้องไม่ถูกต้อง', true)
            const member: Member = {
              id: crypto.randomUUID(), token: crypto.randomUUID(), name: value.name.trim(),
              avatar: value.avatar, chips: null, socket, expiresAt: null,
            }
            const blind = BLIND_PRESETS.find((item) => item.smallBlind === value.smallBlind && item.bigBlind === value.bigBlind)
            if (!blind) return error(socket, 'ระดับเบลดไม่ถูกต้อง', true)
            const room: Room = {
              code: makeCode(rooms), hostId: member.id, members: [member], maxPlayers: value.maxPlayers,
              smallBlind: blind.smallBlind, bigBlind: blind.bigBlind, game: null, messages: [], nextMessageId: 1,
              nextHandAt: null, nextHandTimer: null,
            }
            rooms.set(room.code, room)
            socket.data.roomCode = room.code
            socket.data.playerId = member.id
            send(socket, { type: 'session', code: room.code, token: member.token })
            broadcast(room)
            return
          }
          if (value.type === 'join' || value.type === 'resume') {
            if (typeof value.code !== 'string' || !/^[A-HJ-NP-Z2-9]{8}$/.test(value.code)) {
              return error(socket, 'รหัสห้องไม่ถูกต้อง', true)
            }
            const room = rooms.get(value.code)
            if (!room) return error(socket, 'ไม่พบห้องหรือห้องหมดอายุแล้ว', true)
            removeExpired(room, Date.now())
            let member: Member | undefined
            if (value.type === 'resume') {
              if (typeof value.token !== 'string') return error(socket, 'ข้อมูลเชื่อมต่อไม่ถูกต้อง', true)
              member = room.members.find((item) => item.token === value.token)
              if (!member) return error(socket, 'การเชื่อมต่อหมดอายุ กรุณาเข้าห้องอีกครั้ง', true)
              const previous = member.socket
              member.socket = socket
              member.expiresAt = null
              previous?.close(4001, 'Session resumed elsewhere')
            } else {
              if (!validProfile(value.name, value.avatar) || typeof value.avatar !== 'string') {
                return error(socket, 'ข้อมูลผู้เล่นไม่ถูกต้อง', true)
              }
              if (room.members.length >= room.maxPlayers) return error(socket, 'ห้องเต็มแล้ว', true)
              member = {
                id: crypto.randomUUID(), token: crypto.randomUUID(), name: value.name.trim(),
                avatar: value.avatar, chips: null, socket, expiresAt: null,
              }
              room.members.push(member)
            }
            socket.data.roomCode = room.code
            socket.data.playerId = member.id
            assignHost(room)
            send(socket, { type: 'session', code: room.code, token: member.token })
            updateNextHand(room)
            broadcast(room)
            return
          }
          return error(socket, 'กรุณาเข้าห้องก่อน', true)
        }

        const room = rooms.get(socket.data.roomCode)
        const member = room?.members.find((item) => item.id === socket.data.playerId && item.socket === socket)
        if (!room || !member) return error(socket, 'ไม่พบการเชื่อมต่อห้อง', true)
        if (value.type === 'leave') {
          room.members = room.members.filter((item) => item.id !== member.id)
          socket.data = {}
          assignHost(room)
          foldDisconnectedTurns(room)
          updateNextHand(room)
          broadcast(room)
          if (room.members.length === 0) rooms.delete(room.code)
          socket.close()
          return
        }
        if (value.type === 'start') {
          if (room.hostId !== member.id || room.game) return error(socket, 'ไม่สามารถเริ่มเกมได้')
          const active = room.members.filter((item) => item.socket)
          if (active.length < 2) return error(socket, 'ต้องมีผู้เล่นออนไลน์อย่างน้อย 2 คน')
          room.game = createGame({
            seeds: active.map((item) => seed(item, room.bigBlind * 100)),
            smallBlind: room.smallBlind, bigBlind: room.bigBlind,
          })
        } else if (value.type === 'next') {
          if (room.hostId !== member.id || !beginNextHand(room)) {
            return error(socket, 'เริ่มมือถัดไปไม่ได้ ต้องมีผู้เล่นที่มีชิปอย่างน้อย 2 คน')
          }
        } else if (value.type === 'rebuy') {
          if (!room.game) return error(socket, 'เกมยังไม่เริ่ม')
          const player = room.game.players.find((item) => item.id === member.id)
          if (room.game.phase !== 'handOver' && player && (!player.folded || player.cards.length > 0)) {
            return error(socket, 'เติมชิปได้เมื่อจบมือเท่านั้น')
          }
          if (!player && member.chips === 0) {
            member.chips = room.game.startingChips
          } else if (player && player.chips === 0) {
            const startingChips = room.game.startingChips
            room.game = {
              ...room.game,
              players: room.game.players.map((item) =>
                item.id === member.id ? { ...item, chips: startingChips } : item),
            }
          } else {
            return error(socket, 'เติมชิปได้เมื่อชิปหมดเท่านั้น')
          }
        } else if (value.type === 'move') {
          if (!room.game) return error(socket, 'เกมยังไม่เริ่ม')
          const move = validMove(value.move, room.game, member.id)
          if (!move) return error(socket, 'แอ็กชันไม่ถูกต้องหรือยังไม่ถึงตาคุณ')
          room.game = applyMove(room.game, room.game.turn, move)
          foldDisconnectedTurns(room)
        } else if (value.type === 'chat') {
          if (typeof value.text !== 'string' || value.text.trim().length === 0 || value.text.trim().length > 160) {
            return error(socket, 'ข้อความแชตไม่ถูกต้อง')
          }
          room.messages.push({
            id: room.nextMessageId++, playerId: member.id, name: member.name, avatar: member.avatar,
            text: value.text.trim(), time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          })
          if (room.messages.length > 100) room.messages.shift()
        } else {
          return error(socket, 'คำสั่งไม่ถูกต้อง')
        }
        updateNextHand(room)
        broadcast(room)
      },
      close(socket) {
        const room = socket.data.roomCode ? rooms.get(socket.data.roomCode) : undefined
        const member = room?.members.find((item) => item.id === socket.data.playerId && item.socket === socket)
        if (!room || !member) return
        member.socket = null
        member.expiresAt = Date.now() + RECONNECT_MS
        assignHost(room)
        foldDisconnectedTurns(room)
        updateNextHand(room)
        broadcast(room)
      },
    },
  })
  const cleanup = setInterval(() => {
    for (const room of rooms.values()) {
      const before = room.members.length
      removeExpired(room, Date.now())
      updateNextHand(room)
      if (room.members.length === 0) rooms.delete(room.code)
      else if (before !== room.members.length) broadcast(room)
    }
  }, 10_000)
  cleanup.unref()
  return { server, stop: () => {
    clearInterval(cleanup)
    for (const room of rooms.values()) if (room.nextHandTimer) clearTimeout(room.nextHandTimer)
    server.stop(true)
  } }
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean)
  if (origins.length === 0) throw new Error('ALLOWED_ORIGINS must not be empty')
  createPokerServer(port, origins, process.env.HOST ?? '127.0.0.1')
  console.log(`Poker server listening on port ${port}`)
}
