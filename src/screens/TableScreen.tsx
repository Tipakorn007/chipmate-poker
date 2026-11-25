import { useEffect, useMemo, useRef, useState } from 'react'
import ActionBar from '../components/table/ActionBar'
import HandResultModal from '../components/table/HandResultModal'
import PokerTable from '../components/table/PokerTable'
import SidePanel, { type PanelTab } from '../components/table/SidePanel'
import TableHeader from '../components/table/TableHeader'
import { BOT_LINES } from '../data/mock'
import { useChat } from '../hooks/useChat'
import { usePokerGame } from '../hooks/usePokerGame'
import type { ToastTone } from '../hooks/useToasts'
import { buildInviteLink, copyText } from '../lib/utils'
import type { TableConfig } from '../types'

interface TableScreenProps {
  config: TableConfig
  onLeave: () => void
  notify: (text: string, tone?: ToastTone) => void
}

export default function TableScreen({ config, onLeave, notify }: TableScreenProps) {
  const game = usePokerGame({
    mode: config.mode,
    profile: config.profile,
    friends: config.friends,
    botCount: config.botCount,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
  })
  const inviteLink = useMemo(() => buildInviteLink(config.roomCode), [config.roomCode])
  const chat = useChat()
  const [tab, setTab] = useState<PanelTab>('chat')
  const [panelOpen, setPanelOpen] = useState(false)
  const loggedHand = useRef(0)
  const announced = useRef(false)

  useEffect(() => {
    if (announced.current) return
    announced.current = true
    chat.system(`คุณเข้าห้อง ${config.roomCode} แล้ว — เล่นชิปสมมติเท่านั้น`)
    if (config.mode === 'online') {
      for (const friend of config.friends) {
        chat.system(`${friend.name} เข้าร่วมห้อง`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { phase, handNumber, winners } = game.state

  useEffect(() => {
    if (phase !== 'handOver' || winners.length === 0) return
    if (loggedHand.current === handNumber) return
    loggedHand.current = handNumber
    const winner = game.state.players.find((p) => p.id === winners[0].playerId)
    const total = winners.reduce((sum, w) => sum + w.amount, 0)
    chat.system(
      `มือที่ ${handNumber}: ${winner?.name ?? 'ผู้เล่น'} ชนะ ${total} ชิป${
        winners[0].handText ? ` ด้วย ${winners[0].handText}` : ''
      }`,
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
      />

      <PokerTable game={game} />
      <ActionBar game={game} />

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
      />

      <HandResultModal
        state={game.state}
        onNext={game.nextHand}
        onRebuy={() => {
          game.rebuy()
          game.nextHand()
        }}
        onLeave={onLeave}
      />
    </div>
  )
}
