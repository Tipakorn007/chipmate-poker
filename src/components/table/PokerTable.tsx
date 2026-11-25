import type { PokerGame } from '../../hooks/usePokerGame'
import { STREET_LABEL } from '../../game/engine'
import CommunityCards from './CommunityCards'
import PotDisplay from './PotDisplay'
import Seat from './Seat'

/** Cup holders spaced around the padded rail, like a real card room table. */
const CUPS = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2 - Math.PI / 2
  return {
    left: 50 + 48.6 * Math.cos(angle),
    top: 50 + 47 * Math.sin(angle),
  }
})

/** Seats are laid out clockwise around an ellipse, you always at the bottom. */
export default function PokerTable({ game }: { game: PokerGame }) {
  const { state, pot } = game
  const youSeat = state.players.findIndex((p) => p.isYou)
  const count = state.players.length

  return (
    <div className="table-stage">
      <div className="felt">
        {CUPS.map((cup, index) => (
          <span
            key={`cup-${index}`}
            className="felt__cup"
            style={{ left: `${cup.left}%`, top: `${cup.top}%` }}
            aria-hidden="true"
          />
        ))}

        <div className="felt__inner">
          <div className="felt__watermark" aria-hidden="true">
            <span className="felt__brand">CHIPMATE</span>
            <span className="felt__blinds">
              เบลด {state.smallBlind}/{state.bigBlind}
            </span>
          </div>

          <div className="felt__center">
            <span className="street-badge">
              {STREET_LABEL[state.street]} · มือที่ {state.handNumber}
            </span>
            <CommunityCards cards={state.community} />
            <PotDisplay pot={pot} />
          </div>
        </div>
      </div>

      <div className="seats">
        {state.players.map((player, index) => {
          const relative = (index - youSeat + count) % count
          const angle = ((90 - (360 / count) * relative) * Math.PI) / 180
          const x = 50 + 45 * Math.cos(angle)
          const y = 50 + 43 * Math.sin(angle)
          return (
            <Seat key={player.id} player={player} index={index} state={state} x={x} y={y} />
          )
        })}
      </div>
    </div>
  )
}
