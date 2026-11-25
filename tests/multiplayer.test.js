import { afterEach, describe, expect, test } from 'bun:test'
import { createPokerServer } from '../server/index.ts'
import { applyMove, createGame } from '../src/game/engine.ts'

const origin = 'http://localhost:5173'
let server
let clients = []

class Client {
  constructor(socket) {
    this.socket = socket
    this.messages = []
    this.listeners = []
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.messages.push(message)
      for (const listener of this.listeners) listener()
    }
  }

  static async connect(url) {
    const socket = new WebSocket(url, { headers: { Origin: origin } })
    const client = new Client(socket)
    await new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
    clients.push(client)
    return client
  }

  send(message) {
    this.socket.send(JSON.stringify(message))
  }

  async waitFor(predicate) {
    const deadline = Date.now() + 4000
    while (Date.now() < deadline) {
      const index = this.messages.findIndex(predicate)
      if (index >= 0) return this.messages.splice(index, 1)[0]
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this.listeners = this.listeners.filter((listener) => listener !== wake)
          resolve()
        }, Math.max(0, deadline - Date.now()))
        const wake = () => {
          clearTimeout(timer)
          this.listeners = this.listeners.filter((listener) => listener !== wake)
          resolve()
        }
        this.listeners.push(wake)
      })
    }
    throw new Error('Timed out waiting for server message')
  }

  async snapshot(predicate = () => true) {
    return (await this.waitFor((message) => message.type === 'snapshot' && predicate(message.room))).room
  }
}

afterEach(() => {
  for (const client of clients) client.socket.close()
  clients = []
  server?.stop()
})

describe('online poker', () => {
  test('handles invitations, private cards, late joins, full rooms, chat and the next hand', async () => {
    server = createPokerServer(0, [origin])
    const url = `ws://127.0.0.1:${server.server.port}/ws`
    const host = await Client.connect(url)
    host.send({ type: 'create', name: 'Host', avatar: '🦊', smallBlind: 5, bigBlind: 10, maxPlayers: 4 })
    const session = await host.waitFor((message) => message.type === 'session')
    const initial = await host.snapshot()
    expect(initial.players).toHaveLength(1)
    host.send({ type: 'start' })
    expect((await host.waitFor((message) => message.type === 'error')).message).toContain('2')

    const guest = await Client.connect(url)
    guest.send({ type: 'join', code: session.code, name: 'Friend', avatar: '🐼' })
    await guest.waitFor((message) => message.type === 'session')
    const guestLobby = await guest.snapshot((room) => room.players.length === 2)
    expect(guestLobby.game).toBeNull()
    host.send({ type: 'start' })
    const hostGame = await host.snapshot((room) => room.game?.phase === 'playing')
    const guestGame = await guest.snapshot((room) => room.game?.phase === 'playing')
    expect(hostGame.game.deck).toEqual([])
    expect(guestGame.game.deck).toEqual([])
    for (const room of [hostGame, guestGame]) {
      const own = room.game.players.find((player) => player.isYou)
      const opponent = room.game.players.find((player) => !player.isYou)
      expect(own.cards).toHaveLength(2)
      expect(opponent.cards).toEqual([])
      expect(opponent.hiddenCardCount).toBe(2)
    }

    const late = await Client.connect(url)
    late.send({ type: 'join', code: session.code, name: 'Late', avatar: '🐯' })
    await late.waitFor((message) => message.type === 'session')
    const lateRoom = await late.snapshot((room) => room.players.length === 3)
    expect(lateRoom.players.find((player) => player.id === lateRoom.playerId).waiting).toBe(true)
    expect(lateRoom.game.players).toHaveLength(2)
    const fourth = await Client.connect(url)
    fourth.send({ type: 'join', code: session.code, name: 'Fourth', avatar: '🐸' })
    await fourth.waitFor((message) => message.type === 'session')
    await fourth.snapshot((room) => room.players.length === 4)
    const extra = await Client.connect(url)
    extra.send({ type: 'join', code: session.code, name: 'Extra', avatar: '🦉' })
    expect((await extra.waitFor((message) => message.type === 'error')).message).toContain('เต็ม')

    late.send({ type: 'chat', text: 'สวัสดี' })
    expect((await host.snapshot((room) => room.messages.length === 1)).messages[0].text).toBe('สวัสดี')
    const actorId = hostGame.game.players[hostGame.game.turn].id
    const actor = hostGame.playerId === actorId ? host : guest
    const other = actor === host ? guest : host
    other.send({ type: 'move', move: { kind: 'fold' } })
    expect((await other.waitFor((message) => message.type === 'error')).message).toContain('ไม่ถูกต้อง')
    actor.send({ type: 'move', move: { kind: 'fold' } })
    await host.snapshot((room) => room.game?.phase === 'handOver')
    host.send({ type: 'next' })
    const next = await late.snapshot((room) => room.game?.handNumber === 2)
    expect(next.players.find((player) => player.id === next.playerId).waiting).toBe(false)
    expect(next.game.players).toHaveLength(4)
    expect(next.game.players.find((player) => player.isYou).cards).toHaveLength(2)
  })

  test('reconnects a reserved seat and does not allow an untrusted origin', async () => {
    server = createPokerServer(0, [origin])
    const url = `ws://127.0.0.1:${server.server.port}/ws`
    const host = await Client.connect(url)
    host.send({ type: 'create', name: 'Host', avatar: '🦊', smallBlind: 5, bigBlind: 10, maxPlayers: 4 })
    const session = await host.waitFor((message) => message.type === 'session')
    const initial = await host.snapshot()
    const guest = await Client.connect(url)
    guest.send({ type: 'join', code: session.code, name: 'Friend', avatar: '🐼' })
    await guest.waitFor((message) => message.type === 'session')
    await guest.snapshot((room) => room.players.length === 2)
    host.socket.close()
    await guest.snapshot((room) => room.players.some((player) => player.id === initial.playerId && !player.connected))
    const reconnected = await Client.connect(url)
    reconnected.send({ type: 'resume', code: session.code, token: session.token })
    await reconnected.waitFor((message) => message.type === 'session')
    const restored = await reconnected.snapshot()
    expect(restored.playerId).toBe(initial.playerId)
    expect(restored.players).toHaveLength(2)
    const closed = new Promise((resolve) => { reconnected.socket.onclose = resolve })
    const replacement = await Client.connect(url)
    replacement.send({ type: 'resume', code: session.code, token: session.token })
    await replacement.waitFor((message) => message.type === 'session')
    expect((await closed).code).toBe(4001)
    expect((await replacement.snapshot()).playerId).toBe(initial.playerId)

    const response = await fetch(`http://127.0.0.1:${server.server.port}/ws`, {
      headers: { Origin: 'https://untrusted.example' },
    })
    expect(response.status).toBe(403)
  })

  test('folds a disconnected actor and allows the remaining host to start a new hand', async () => {
    server = createPokerServer(0, [origin])
    const url = `ws://127.0.0.1:${server.server.port}/ws`
    const host = await Client.connect(url)
    host.send({ type: 'create', name: 'Host', avatar: '🦊', smallBlind: 5, bigBlind: 10, maxPlayers: 4 })
    const session = await host.waitFor((message) => message.type === 'session')
    const hostRoom = await host.snapshot()
    const guest = await Client.connect(url)
    guest.send({ type: 'join', code: session.code, name: 'Friend', avatar: '🐼' })
    await guest.waitFor((message) => message.type === 'session')
    await guest.snapshot((room) => room.players.length === 2)
    host.send({ type: 'start' })
    const started = await host.snapshot((room) => room.game?.phase === 'playing')
    expect(started.game.players[started.game.turn].id).toBe(hostRoom.playerId)
    host.socket.close()
    const finished = await guest.snapshot((room) => room.game?.phase === 'handOver')
    expect(finished.hostId).toBe(finished.playerId)
    const late = await Client.connect(url)
    late.send({ type: 'join', code: session.code, name: 'Late', avatar: '🐯' })
    await late.waitFor((message) => message.type === 'session')
    await late.snapshot((room) => room.players.length === 3)
    guest.send({ type: 'next' })
    const next = await late.snapshot((room) => room.game?.handNumber === 2)
    expect(next.game.players).toHaveLength(2)
    expect(next.game.players.some((player) => player.id === hostRoom.playerId)).toBe(false)
  })

  test('does not deal a busted player into the hand', () => {
    const seeds = ['a', 'b', 'c'].map((id, index) => ({
      id, name: id, avatar: '🦊', chips: index === 2 ? 0 : 1000, isYou: false, isBot: false,
    }))
    const game = createGame({ seeds, smallBlind: 5, bigBlind: 10 })
    expect(game.players[2].folded).toBe(true)
    expect(game.players[2].cards).toEqual([])
    expect(applyMove(game, game.turn, { kind: 'fold' }).phase).toBe('handOver')
  })
})
