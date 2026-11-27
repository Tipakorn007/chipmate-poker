import { useEffect, useRef, useState } from 'react'
import type { GameState, Player } from '../../game/engine'
import { cardKey } from '../../game/cards'
import { formatChips } from '../../lib/utils'
import ChipIcon from '../ui/ChipIcon'
import PlayingCard from '../ui/PlayingCard'

interface SeatProps {
  player: Player
  index: number
  state: GameState
  x: number
  y: number
  highlightedCards: ReadonlySet<string>
  handLabel: string
}

export default function Seat({ player, index, state, x, y, highlightedCards, handLabel }: SeatProps) {
  const [notice, setNotice] = useState<{ text: string; actionCount: number } | null>(null)
  const previous = useRef({ hand: state.handNumber, turn: state.turn, actionCount: state.actionCount })
  const isTurn = state.phase === 'playing' && state.turn === index
  const lower = y > 55
  const isDealer = state.dealerIndex === index
  const isSmallBlind = state.smallBlindIndex === index && state.phase === 'playing'
  const isBigBlind = state.bigBlindIndex === index && state.phase === 'playing'
  const showFaces = player.isYou || player.revealed

  useEffect(() => {
    const before = previous.current
    // แสดงเฉพาะแอ็กชันใหม่ ไม่ย้อนเล่นป้ายจากสถานะที่เพิ่งโหลดหรือเชื่อมต่อกลับ
    if (before.hand !== state.handNumber) {
      setNotice(null)
    } else if (before.turn === index && before.actionCount !== state.actionCount && player.lastAction) {
      setNotice({ text: player.lastAction, actionCount: state.actionCount })
    }
    previous.current = { hand: state.handNumber, turn: state.turn, actionCount: state.actionCount }
  }, [index, player.lastAction, state.actionCount, state.handNumber, state.turn])

  useEffect(() => {
    if (!notice) return
    // ป้ายใช้ transform และ opacity แล้วลบออกหลังแสดง โดยไม่เปลี่ยนสถานะเกม
    const timer = window.setTimeout(() => setNotice(null), 1900)
    return () => window.clearTimeout(timer)
  }, [notice])

  const classes = ['seat', lower ? 'seat--lower' : 'seat--upper']
  if (y < 40) classes.push('seat--top')
  if (x < 35) classes.push('seat--left')
  if (x > 65) classes.push('seat--right')
  if (player.isYou) classes.push('seat--you')
  if (isTurn) classes.push('seat--turn')
  if (player.folded) classes.push('seat--folded')
  if (player.allIn) classes.push('seat--allin')
  if (state.phase === 'handOver' && player.winAmount > 0) classes.push('seat--winner')

  return (
    <div className={classes.join(' ')} style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`${player.name}${player.isYou ? ' คุณ' : ''}${isTurn ? ' ถึงตาเล่น' : ''}${player.folded ? ' หมอบแล้ว' : ''}`}>
      <div className="seat__body">
        <div className="seat__avatar">
          {isTurn && <span className="seat__turn-ring" aria-hidden="true" />}
          <span className="seat__emoji">{player.avatar}</span>
          {isDealer && <span className="seat__dealer">D</span>}
        </div>

        <div className="seat__plate">
          <div className="seat__name-row">
            <span className="seat__name" title={player.name}>{player.name}</span>
            {isSmallBlind && <em className="seat__blind">SB</em>}
            {isBigBlind && <em className="seat__blind">BB</em>}
          </div>
          <span className="seat__chips">
            <ChipIcon size={11} />
            {formatChips(player.chips)}
          </span>
          {player.allIn && !player.folded && <span className="seat__allin-label">ออลอิน</span>}
        </div>
        {notice && <span className="seat__action" key={notice.actionCount}>{notice.text}</span>}
        {player.isYou && handLabel && <span className="seat__hand" aria-live="polite">ไพ่ของคุณ: {handLabel}</span>}
      </div>

      {!player.folded && (player.cards.length > 0 || (player.hiddenCardCount ?? 0) > 0) && (
        <div className="seat__cards" key={state.handNumber}>
          {showFaces
            ? player.cards.map((card) => (
                <PlayingCard key={cardKey(card)} card={card} size={player.isYou ? 'lg' : 'sm'}
                  highlight={player.isYou && highlightedCards.has(cardKey(card))} />
              ))
            : Array.from({ length: player.hiddenCardCount ?? player.cards.length }, (_, cardIndex) => (
                <PlayingCard key={`${player.id}-back-${cardIndex}`} faceDown size="sm" />
              ))}
        </div>
      )}

      {player.bet > 0 && (
        <div className="seat__bet">
          <ChipIcon size={11} />
          {formatChips(player.bet)}
        </div>
      )}

      {state.phase === 'handOver' && player.winAmount > 0 && (
        <div className="seat__win">+{formatChips(player.winAmount)}</div>
      )}
    </div>
  )
}
