import type { PokerGame } from '../../hooks/usePokerGame'
import { STREET_LABEL } from '../../game/engine'
import { cardKey } from '../../game/cards'
import { evaluateHand, handHighlightCards } from '../../game/handEval'
import CommunityCards from './CommunityCards'
import PotDisplay from './PotDisplay'
import Seat from './Seat'
import type { OnlinePlayer } from '../../game/onlineProtocol'

interface PokerTableProps {
  game: PokerGame
  seatCapacity: number
  waitingPlayers?: Pick<OnlinePlayer, 'id' | 'name' | 'avatar'>[]
}

export default function PokerTable({ game, seatCapacity, waitingPlayers = [] }: PokerTableProps) {
  const { state, pot, you } = game
  const participants = [...state.players, ...waitingPlayers]
  const count = Math.max(seatCapacity, participants.length)
  const youIndex = state.players.findIndex((p) => p.isYou)
  const youSlot = youIndex < 0 ? 0 : Math.floor(youIndex * count / participants.length)
  const showHand = Boolean(you && !you.folded && you.cards.length === 2)
  const hand = showHand && you ? game.yourHand ?? evaluateHand(you.cards) : null
  const highlightedCards = new Set(hand ? handHighlightCards(hand).map(cardKey) : [])
  const positions = Array.from({ length: count }, (_, slot) => {
    const relative = (slot - youSlot + count) % count
    const angle = ((90 + (360 / count) * relative) * Math.PI) / 180
    return { x: 50 + 45 * Math.cos(angle), y: 50 + 43 * Math.sin(angle) }
  })
  const occupiedSlots = new Map(participants.map((player, index) => [
    Math.floor(index * count / participants.length), player,
  ]))

  return (
    <div className="table-stage">
      <div className="felt">
        <div className="table-dealer" key={`${state.handNumber}-${state.community.length}`} role="img" aria-label="ดีลเลอร์อัตโนมัติ">
          <svg className="table-dealer__robot" viewBox="0 0 84 78" aria-hidden="true">
            <path d="M42 8V3m-4 0h8" stroke="#e8d49f" strokeWidth="3" strokeLinecap="round" />
            <rect x="12" y="12" width="60" height="48" rx="20" fill="#224738" stroke="#e8d49f" strokeWidth="3" />
            <rect x="18" y="19" width="48" height="30" rx="12" fill="#102c26" />
            <circle cx="32" cy="33" r="4" fill="#d9e8cc" />
            <circle cx="52" cy="33" r="4" fill="#d9e8cc" />
            <path d="M37 41q5 4 10 0" fill="none" stroke="#d9e8cc" strokeWidth="2" strokeLinecap="round" />
            <path d="M25 59q17 10 34 0l6 12H19z" fill="#d4b87b" />
            <g className="table-dealer__hand">
              <path d="M57 56l10 5" stroke="#e8d49f" strokeWidth="5" strokeLinecap="round" />
              <rect x="63" y="52" width="13" height="17" rx="2" fill="#f7f3e7" transform="rotate(18 69 60)" />
              <path d="M68 57l3 2-3 3-2-3z" fill="#648d6b" />
            </g>
          </svg>
          <span className="table-dealer__label">DEALER</span>
        </div>
        <div className="felt__inner">
          <div className="felt__watermark" aria-hidden="true">
            <span className="felt__brand">CHIPMATE</span>
            <span className="felt__blinds">
              เบลด {state.smallBlind}/{state.bigBlind}
            </span>
          </div>

          <div className="felt__center">
            <div className={`felt__status ${hand ? 'felt__status--has-hand' : ''}`}>
              <span className="street-badge">
                {STREET_LABEL[state.street]} · มือที่ {state.handNumber}
              </span>
              {hand && <span className="hand-indicator" aria-live="polite">ไพ่ของคุณ: {game.yourHandLabel}</span>}
            </div>
            <CommunityCards cards={state.community} highlightedCards={highlightedCards} />
            <PotDisplay pot={pot} />
          </div>
        </div>
      </div>

      <div className="seats">
        {positions.map(({ x, y }, slot) => {
          const occupant = occupiedSlots.get(slot)
          if (!occupant) return (
            <div key={`empty-${slot}`} className="seat seat--empty" style={{ left: `${x}%`, top: `${y}%` }}
              aria-label="ที่นั่งว่าง">
              <span className="seat__avatar seat__avatar--empty" aria-hidden="true" />
              <span className="seat__empty-label">ที่นั่งว่าง</span>
            </div>
          )
          const index = state.players.findIndex((player) => player.id === occupant.id)
          if (index >= 0) return (
            <Seat key={occupant.id} player={state.players[index]} index={index} state={state} x={x} y={y}
              highlightedCards={highlightedCards} handLabel={hand ? game.yourHandLabel : ''} />
          )
          return (
            <div key={occupant.id} className="seat seat--waiting" style={{ left: `${x}%`, top: `${y}%` }}>
              <div className="seat__avatar"><span className="seat__emoji">{occupant.avatar}</span></div>
              <div className="seat__plate">
                <span className="seat__name">{occupant.name}</span>
                <span className="seat__waiting-label">รอมือถัดไป</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
