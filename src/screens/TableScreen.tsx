import { useEffect, useMemo, useRef, useState } from 'react'
import ActionBar from '../components/table/ActionBar'
import PokerTable from '../components/table/PokerTable'
import SidePanel, { type PanelTab } from '../components/table/SidePanel'
import TableHeader from '../components/table/TableHeader'
import { BOT_LINES } from '../data/mock'
import { useChat, type Chat } from '../hooks/useChat'
import { usePokerGame, type PokerGame } from '../hooks/usePokerGame'
import type { ToastTone } from '../hooks/useToasts'
import { buildInviteLink, copyText } from '../lib/utils'
import type { TableConfig } from '../types'
import type { OnlinePlayer } from '../game/onlineProtocol'

interface TableScreenProps {
  config: TableConfig
  onLeave: () => void
  notify: (text: string, tone?: ToastTone) => void
}

export default function TableScreen({ config, onLeave, notify }: TableScreenProps) {
  const game = usePokerGame({
    profile: config.profile,
    botCount: config.botCount,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
  })
  const chat = useChat()
  return <TableView config={config} onLeave={onLeave} notify={notify} game={game} chat={chat} />
}

export function TableView({
  config, onLeave, notify, game, chat, nextHandPending, waitingCount = 0, seatCapacity = 6, waitingPlayers = [],
}: TableScreenProps & {
  game: PokerGame
  chat: Chat
  nextHandPending?: boolean
  waitingCount?: number
  seatCapacity?: number
  waitingPlayers?: Pick<OnlinePlayer, 'id' | 'name' | 'avatar'>[]
}) {
  const inviteLink = useMemo(() => buildInviteLink(config.roomCode), [config.roomCode])
  const [tab, setTab] = useState<PanelTab>('chat')
  const [panelOpen, setPanelOpen] = useState(false)
  const loggedHand = useRef(0)
  const announced = useRef(false)

  useEffect(() => {
    if (config.mode === 'online') return
    if (announced.current) return
    announced.current = true
    chat.system(`คุณเข้าห้อง ${config.roomCode} แล้ว — เล่นชิปสมมติเท่านั้น`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { phase, handNumber, winners } = game.state
  const autoNext = config.mode === 'bot'
    ? Boolean(game.you && game.you.chips > 0 && game.state.players.filter((player) => player.chips > 0).length >= 2)
    : Boolean(nextHandPending)

  useEffect(() => {
    if (config.mode === 'online') return
    if (phase !== 'handOver' || winners.length === 0) return
    if (loggedHand.current === handNumber) return
    loggedHand.current = handNumber
    const winner = game.state.players.find((p) => p.id === winners[0].playerId)
    chat.system(
      `มือที่ ${handNumber}: ${winners.map((item) => {
        const player = game.state.players.find((p) => p.id === item.playerId)
        return `${player?.name ?? 'ผู้เล่น'} ได้ ${item.amount} ชิป${item.handText ? ` ด้วย ${item.handText}` : ''}`
      }).join(' · ')}`,
    )
    if (winner && !winner.isYou && Math.random() > 0.45) {
      chat.player(winner.name, winner.avatar, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, handNumber])

  const handleCopyInvite = async () => {
    const ok = await copyText(inviteLink)
    notify(
      ok ? 'คัดลอกลิงก์เชิญแล้ว — ส่งให้เพื่อนได้เลย' : 'คัดลอกไม่สำเร็จ — เลือกลิงก์แล้วกด Ctrl+C',
      ok ? 'success' : 'warn',
    )
  }

  const openPanel = (panel: PanelTab) => {
    setTab(panel)
    setPanelOpen(true)
  }

  return (
    <div className="table-screen">
      <TableHeader
        config={config}
        state={game.state}
        onCopyInvite={handleCopyInvite}
        onLeave={onLeave}
        onOpenPanel={openPanel}
        waitingCount={waitingCount}
      />

      <PokerTable game={game} seatCapacity={seatCapacity} waitingPlayers={waitingPlayers} />
      <ActionBar game={game} nextHandPending={autoNext} mode={config.mode} />

      <SidePanel
        game={game}
        config={config}
        chat={chat}
        tab={tab}
        onTabChange={setTab}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        inviteLink={inviteLink}
        onCopyInvite={handleCopyInvite}
        onLeave={onLeave}
        onSendChat={() => undefined}
        notify={notify}
      />

    </div>
  )
}
