import type { GameState } from '../../game/engine'
import { formatChips } from '../../lib/utils'

interface HandResultProps {
  state: GameState
  onRebuy: () => void
  nextHandPending: boolean
  mode: 'bot' | 'online'
}

export default function HandResult({ state, onRebuy, nextHandPending, mode }: HandResultProps) {
  if (state.phase !== 'handOver') return null

  const you = state.players.find((player) => player.isYou)
  const broke = !!you && you.chips === 0

  return (
    <div className="hand-result">
      <div className="hand-result__winners" role="status" aria-label="ผลมือ">
        {state.winners.map((winner) => {
          const player = state.players.find((item) => item.id === winner.playerId)
          return (
            <span className="hand-result__winner" key={winner.playerId}>
              <strong>{player?.name ?? 'ผู้เล่น'}</strong> ได้ {formatChips(winner.amount)} ชิป
              {winner.handText && <span className="hand-result__hand"> · {winner.handText}</span>}
            </span>
          )
        })}
      </div>
      <div className="hand-result__next">
        <span>
          {nextHandPending
            ? 'กำลังเริ่มมือถัดไปอัตโนมัติ...'
            : broke
              ? 'ชิปของคุณหมดแล้ว'
              : mode === 'bot'
                ? 'เกมจบแล้ว — เหลือผู้เล่นที่มีชิปไม่ถึง 2 คน'
                : 'รอผู้เล่นออนไลน์ที่มีชิปอย่างน้อย 2 คน'}
        </span>
        {broke && (
          <button className="btn btn--primary btn--sm" onClick={onRebuy}>
            เติมชิปตัวอย่าง
          </button>
        )}
      </div>
    </div>
  )
}
