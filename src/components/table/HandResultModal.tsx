import type { GameState } from '../../game/engine'
import { cardKey } from '../../game/cards'
import { evaluateHand } from '../../game/handEval'
import { formatChips } from '../../lib/utils'
import Modal from '../ui/Modal'
import PlayingCard from '../ui/PlayingCard'

interface HandResultModalProps {
  state: GameState
  onRebuy: () => void
  onLeave: () => void
  nextHandPending: boolean
  mode: 'bot' | 'online'
}

export default function HandResultModal({
  state,
  onRebuy,
  onLeave,
  nextHandPending,
  mode,
}: HandResultModalProps) {
  const open = state.phase === 'handOver'
  const you = state.players.find((p) => p.isYou)
  const main = state.winners[0]
  const winner = state.players.find((p) => p.id === main?.playerId)
  const youWon = state.winners.some((w) => w.playerId === you?.id)
  const broke = !!you && you.chips === 0

  const showdownRows = state.showdown
    ? state.players
        .filter((p) => !p.folded && p.cards.length === 2)
        .map((p) => ({ player: p, hand: evaluateHand([...p.cards, ...state.community]) }))
    : []

  return (
    <Modal open={open} label="สรุปผลมือ">
      <div className="result">
        <div className={`result__badge ${youWon ? 'is-win' : ''}`}>
          {youWon ? '🏆' : '🃏'}
        </div>
        <p className="result__eyebrow">{state.showdown ? 'ผลการเปิดไพ่' : 'จบมือ'}</p>
        <h2 className="result__title">
          {youWon ? 'คุณชนะมือนี้' : winner ? `${winner.name} ชนะมือนี้` : 'จบมือ'}
        </h2>

        {main && (
          <div className="result__amount">
            +{formatChips(main.amount)} <span>ชิป</span>
          </div>
        )}

        {main && main.bestFive.length > 0 && (
          <div className="result__hand">
            <span className="result__handname">{main.handText}</span>
            <div className="result__cards">
              {main.bestFive.map((card) => (
                <PlayingCard key={cardKey(card)} card={card} size="md" highlight />
              ))}
            </div>
          </div>
        )}

        {!state.showdown && (
          <p className="result__note">ทุกคนหมอบ — ไม่มีการเปิดไพ่ในมือนี้</p>
        )}

        {state.winners.length > 1 && (
          <p className="result__note">พอตถูกแบ่งให้ {state.winners.length} ผู้เล่น</p>
        )}

        {showdownRows.length > 1 && (
          <ul className="result__list">
            {showdownRows.map(({ player, hand }) => (
              <li
                key={player.id}
                className={`result__row ${player.winAmount > 0 ? 'is-winner' : ''}`}
              >
                <span className="result__row-avatar">{player.avatar}</span>
                <span className="result__row-name">
                  {player.name}
                  {player.isYou && <em>คุณ</em>}
                </span>
                <span className="result__row-hand">{hand.text}</span>
                <span className="result__row-cards">
                  {player.cards.map((card) => (
                    <PlayingCard key={cardKey(card)} card={card} size="xs" />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}

        {you && !youWon && (
          <p className="result__you">
            {you.folded
              ? 'คุณหมอบในมือนี้'
              : `ชิปคงเหลือ ${formatChips(you.chips)}`}
          </p>
        )}

        <div className="result__actions">
          {broke && (
            <button className="btn btn--primary btn--block btn--lg" onClick={onRebuy}>
              เติมชิปตัวอย่าง
            </button>
          )}
          <p className="result__note">
            {nextHandPending
              ? 'กำลังเริ่มมือถัดไปอัตโนมัติ...'
              : broke
                ? 'ชิปของคุณหมดแล้ว'
                : mode === 'bot'
                  ? 'เกมจบแล้ว — เหลือผู้เล่นที่มีชิปไม่ถึง 2 คน'
                  : 'รอผู้เล่นออนไลน์ที่มีชิปอย่างน้อย 2 คน'}
          </p>
          <button className="btn btn--ghost btn--block" onClick={onLeave}>
            ออกจากห้อง
          </button>
        </div>
      </div>
    </Modal>
  )
}
