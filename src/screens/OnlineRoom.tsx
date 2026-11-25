import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/ui/Icon'
import Logo from '../components/ui/Logo'
import ShareInviteButton from '../components/ui/ShareInviteButton'
import { getLegalActions, totalPot } from '../game/engine'
import { evaluateHand, holeLabel } from '../game/handEval'
import type { GameState } from '../game/engine'
import type { ClientMessage, RoomSnapshot, ServerMessage } from '../game/onlineProtocol'
import type { Chat } from '../hooks/useChat'
import type { PokerGame } from '../hooks/usePokerGame'
import type { ToastTone } from '../hooks/useToasts'
import { buildInviteLink, copyText, formatChips } from '../lib/utils'
import type { PlayerProfile, TableConfig } from '../types'
import { TableView } from './TableScreen'

export type OnlineIntent =
  | { kind: 'create'; profile: PlayerProfile; smallBlind: number; bigBlind: number; maxPlayers: number }
  | { kind: 'join'; profile: PlayerProfile; code: string }

interface Props {
  intent: OnlineIntent
  onLeave: () => void
  notify: (text: string, tone?: ToastTone) => void
}

function serverUrl(): string {
  const configured = import.meta.env.VITE_POKER_SERVER_URL
  if (!configured && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_POKER_SERVER_URL สำหรับเซิร์ฟเวอร์เกม')
  }
  const url = new URL(configured || `ws://${window.location.hostname}:3001/ws`)
  if (!['ws:', 'wss:'].includes(url.protocol) || (window.location.protocol === 'https:' && url.protocol !== 'wss:')) {
    throw new Error('URL เซิร์ฟเวอร์เกมไม่ถูกต้อง เว็บ HTTPS ต้องใช้ wss://')
  }
  return url.href
}

function OnlineTable({
  room, state, send, onLeave, notify,
}: {
  room: RoomSnapshot
  state: GameState
  send: (message: ClientMessage) => void
  onLeave: () => void
  notify: Props['notify']
}) {
  const youIndex = state.players.findIndex((player) => player.isYou)
  const you = state.players[youIndex]
  const yourHand = you?.cards.length === 2 && state.community.length >= 3
    ? evaluateHand([...you.cards, ...state.community])
    : null
  const game: PokerGame = {
    state,
    you,
    youIndex,
    currentActor: state.players[state.turn],
    pot: totalPot(state),
    legal: getLegalActions(state, youIndex),
    isYourTurn: state.phase === 'playing' && state.turn === youIndex && youIndex >= 0,
    yourHand,
    yourHandLabel: yourHand?.text ?? (you?.cards.length === 2 ? holeLabel(you.cards) : ''),
    act: (move) => send({ type: 'move', move }),
    rebuy: () => send({ type: 'rebuy' }),
  }
  const me = room.players.find((player) => player.id === room.playerId)
  if (!me) return <p role="alert">ไม่พบข้อมูลผู้เล่นในห้อง กรุณาเข้าห้องอีกครั้ง</p>
  const config: TableConfig = {
    mode: 'online',
    roomCode: room.code,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    profile: { name: me.name, avatar: me.avatar },
    botCount: 0,
  }
  const chat: Chat = {
    messages: room.messages.map((message) => ({
      id: message.id,
      kind: message.playerId === room.playerId ? 'user' : 'player',
      author: message.name,
      avatar: message.avatar,
      text: message.text,
      time: message.time,
    })),
    send: (text) => send({ type: 'chat', text }),
    system: () => {},
    player: () => {},
  }
  return (
    <TableView
      config={config}
      game={game}
      chat={chat}
      notify={notify}
      onLeave={onLeave}
      nextHandPending={typeof room.nextHandAt === 'number'}
      waitingCount={room.players.filter((player) => player.waiting && player.connected).length}
    />
  )
}

function WaitingRoom({
  room, send, onLeave, notify,
}: {
  room: RoomSnapshot
  send: (message: ClientMessage) => void
  onLeave: () => void
  notify: Props['notify']
}) {
  const isHost = room.hostId === room.playerId
  const waitingForHand = room.game !== null
  const me = room.players.find((player) => player.id === room.playerId)
  const inviteLink = buildInviteLink(room.code)
  const onlineCount = room.players.filter((player) => player.connected).length
  const copy = async () => {
    const ok = await copyText(inviteLink)
    notify(ok ? 'คัดลอกลิงก์เชิญแล้ว' : 'คัดลอกไม่สำเร็จ — เลือกลิงก์แล้วกด Ctrl+C', ok ? 'success' : 'warn')
  }
  const copyCode = async () => {
    const ok = await copyText(room.code)
    notify(ok ? 'คัดลอกรหัสห้องแล้ว' : 'คัดลอกรหัสไม่สำเร็จ กรุณาส่งรหัสที่แสดงให้เพื่อน', ok ? 'success' : 'warn')
  }

  return (
    <div className="lobby">
      <header className="lobby__nav">
        <Logo size={30} />
        <button className="btn btn--ghost btn--sm" onClick={onLeave}>
          <Icon name="door" size={16} /> ออกจากห้อง
        </button>
      </header>
      <main className="lobby__grid">
        <section className="panel lobby-card">
          <div className="lobby-card__top">
            <span className="badge badge--mint">ห้องออนไลน์</span>
            <span className="badge badge--muted">เบลด {room.smallBlind}/{room.bigBlind}</span>
          </div>
          <div className="room-code">
            <span className="room-code__label">รหัสห้อง</span>
            <div className="room-code__row">
              <span className="room-code__value">{room.code}</span>
              <button className="btn btn--ghost btn--sm" onClick={copyCode}>คัดลอกรหัส</button>
            </div>
          </div>
          <div className="invite-box">
            <span className="field__label">ลิงก์เชิญเพื่อน</span>
            <div className="invite-box__row">
              <input className="input invite-box__input" readOnly value={inviteLink}
                onFocus={(event) => event.currentTarget.select()} aria-label="ลิงก์เชิญเพื่อน" />
              <button className="btn btn--primary" onClick={copy}>
                <Icon name="copy" size={16} /> คัดลอก
              </button>
            </div>
            <ShareInviteButton inviteLink={inviteLink} notify={notify} />
          </div>
          <div className="seat-slots">
            {Array.from({ length: room.maxPlayers }, (_, index) => {
              const player = room.players[index]
              return (
                <div key={player?.id ?? `empty-${index}`} className={`seat-slot ${player ? '' : 'seat-slot--empty'}`}>
                  <span className={`seat-slot__avatar ${player ? '' : 'seat-slot__avatar--empty'}`}>
                    {player ? player.avatar : <Icon name="plus" size={16} />}
                  </span>
                  <span className="seat-slot__name">{player?.name ?? 'รอผู้เล่น'}</span>
                  {player && (
                    <span className="seat-slot__tag seat-slot__tag--muted">
                      {!player.connected ? 'หลุดการเชื่อมต่อ' : player.id === room.hostId ? 'เจ้าของห้อง' : 'พร้อมเล่น'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {waitingForHand ? (
            <>
              <p className="demo-note">
                {room.game?.phase === 'handOver' && room.nextHandAt === null
                  ? 'รอผู้เล่นออนไลน์ที่มีชิปอย่างน้อย 2 คนเพื่อเริ่มมือถัดไป'
                  : 'เกมกำลังดำเนินอยู่ คุณจะได้เข้าร่วมมือถัดไปโดยอัตโนมัติ'}
              </p>
              {me?.chips === 0 && room.game?.phase === 'handOver' && (
                <button className="btn btn--primary btn--block" onClick={() => send({ type: 'rebuy' })}>
                  เติมชิปตัวอย่าง
                </button>
              )}
            </>
          ) : isHost ? (
            <button className="btn btn--primary btn--block btn--lg"
              onClick={() => send({ type: 'start' })} disabled={onlineCount < 2}>
              {onlineCount < 2 ? 'รอผู้เล่นอย่างน้อย 2 คน' : `เริ่มเกม (${onlineCount} คน)`}
            </button>
          ) : (
            <p className="demo-note">รอเจ้าของห้องเริ่มเกม</p>
          )}
          <p className="demo-note">ใช้ชิปสมมติเท่านั้น · ชิปเริ่มต้น {formatChips(room.bigBlind * 100)}</p>
        </section>
        <aside className="panel lobby-side">
          <h2 className="panel__title"><Icon name="users" size={16} /> ผู้เล่นในห้อง</h2>
          <p className="lobby-side__hint">แชร์ลิงก์ให้เพื่อนเปิด เลือกชื่อ แล้วกดเข้าห้อง</p>
          <div className="lobby-side__status">
            <span className="waiting-dots"><i /><i /><i /></span>
            ผู้เล่น {room.players.length}/{room.maxPlayers}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default function OnlineRoom({ intent, onLeave, notify }: Props) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'failed'>('connecting')
  const [failure, setFailure] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const sessionRef = useRef<{ code: string; token: string } | null>(null)

  useEffect(() => {
    let stopped = false
    let fatal = false
    let retry: number | undefined
    let socket: WebSocket | null = null
    if (intent.kind === 'join') {
      try {
        const token = sessionStorage.getItem(`chipmate-session-${intent.code}`)
        if (token) sessionRef.current = { code: intent.code, token }
      } catch {
        notify('ไม่สามารถบันทึกการเชื่อมต่อในเบราว์เซอร์ได้ หากรีเฟรชต้องเข้าห้องใหม่', 'warn')
      }
    }

    const connect = () => {
      let url: string
      try {
        url = serverUrl()
      } catch (error) {
        setFailure(error instanceof Error ? error.message : 'URL เซิร์ฟเวอร์ไม่ถูกต้อง')
        setStatus('failed')
        return
      }
      socket = new WebSocket(url)
      socketRef.current = socket
      socket.onopen = () => {
        if (!socket) return
        const session = sessionRef.current
        const message: ClientMessage = session
          ? { type: 'resume', ...session }
          : intent.kind === 'create'
            ? { type: 'create', name: intent.profile.name, avatar: intent.profile.avatar,
                smallBlind: intent.smallBlind, bigBlind: intent.bigBlind, maxPlayers: intent.maxPlayers }
            : { type: 'join', code: intent.code, name: intent.profile.name, avatar: intent.profile.avatar }
        socket.send(JSON.stringify(message))
      }
      socket.onmessage = (event) => {
        let message: ServerMessage
        try {
          message = JSON.parse(event.data) as ServerMessage
        } catch {
          fatal = true
          setFailure('ได้รับข้อมูลไม่ถูกต้องจากเซิร์ฟเวอร์เกม')
          setStatus('failed')
          socket?.close()
          return
        }
        if (message.type === 'session') {
          sessionRef.current = { code: message.code, token: message.token }
          try {
            sessionStorage.setItem(`chipmate-session-${message.code}`, message.token)
          } catch {
            notify('ไม่สามารถบันทึกการเชื่อมต่อในเบราว์เซอร์ได้ หากรีเฟรชต้องเข้าห้องใหม่', 'warn')
          }
          const url = new URL(window.location.href)
          url.searchParams.set('room', message.code)
          window.history.replaceState(null, '', url)
        } else if (message.type === 'snapshot') {
          setRoom(message.room)
          setStatus('connected')
        } else if (message.type === 'error') {
          if (message.fatal) {
            fatal = true
            setFailure(message.message)
            setStatus('failed')
            const session = sessionRef.current
            if (session) {
              try {
                sessionStorage.removeItem(`chipmate-session-${session.code}`)
              } catch {
                notify('ไม่สามารถลบข้อมูลการเชื่อมต่อในเบราว์เซอร์ได้', 'warn')
              }
            }
          } else {
            notify(message.message, 'warn')
          }
        }
      }
      socket.onclose = (event) => {
        if (stopped || fatal) return
        if (event.code === 4001) {
          setFailure('ห้องนี้ถูกเปิดด้วยเซสชันเดียวกันในแท็บอื่น')
          setStatus('failed')
          return
        }
        setStatus('reconnecting')
        retry = window.setTimeout(connect, 1500)
      }
      socket.onerror = () => {
        if (!stopped && !fatal) setFailure('เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้ กำลังลองใหม่')
      }
    }
    connect()
    return () => {
      stopped = true
      window.clearTimeout(retry)
      socket?.close()
      socketRef.current = null
    }
  }, [intent, notify])

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      notify('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์เกม', 'warn')
      return
    }
    socketRef.current.send(JSON.stringify(message))
  }, [notify])

  const leave = () => {
    const session = sessionRef.current
    if (session) {
      try {
        sessionStorage.removeItem(`chipmate-session-${session.code}`)
      } catch {
        notify('ไม่สามารถลบข้อมูลการเชื่อมต่อในเบราว์เซอร์ได้', 'warn')
      }
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) send({ type: 'leave' })
    onLeave()
  }

  if (status !== 'connected' || !room) {
    return (
      <div className="lobby">
        <header className="lobby__nav"><Logo size={30} /></header>
        <main className="panel lobby-card">
          <h2 className="panel__title">
            {status === 'failed' ? 'เข้าห้องไม่สำเร็จ' : status === 'reconnecting' ? 'กำลังเชื่อมต่อใหม่' : 'กำลังเชื่อมต่อ'}
          </h2>
          <p className="demo-note">{failure || 'กำลังเชื่อมต่อเซิร์ฟเวอร์เกม...'}</p>
          <button className="btn btn--ghost" onClick={leave}>กลับหน้าหลัก</button>
        </main>
      </div>
    )
  }
  const pending = room.players.find((player) => player.id === room.playerId)?.waiting
  return room.game && !pending
    ? <OnlineTable room={room} state={room.game} send={send} onLeave={leave} notify={notify} />
    : <WaitingRoom room={room} send={send} onLeave={leave} notify={notify} />
}
