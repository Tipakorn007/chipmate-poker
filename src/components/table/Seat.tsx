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
}

export default function Seat({ player, index, state, x, y, highlightedCards }: SeatProps) {
  const isTurn = state.phase === 'playing' && state.turn === index
  const lower = y > 55
  const isDealer = state.dealerIndex === index
  const isSmallBlind = state.smallBlindIndex === index && state.phase === 'playing'
  const isBigBlind = state.bigBlindIndex === index && state.phase === 'playing'
  const showFaces = player.isYou || player.revealed

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
    <div className={classes.join(' ')} style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="seat__body">
        <div className="seat__avatar">
          <span className="seat__emoji">{player.avatar}</span>
          {isDealer && <span className="seat__dealer">D</span>}
        </div>

        <div className="seat__plate">
          <span className="seat__name">
            {player.name}
            {isSmallBlind && <em className="seat__blind">SB</em>}
            {isBigBlind && <em className="seat__blind">BB</em>}
          </span>
          <span className="seat__chips">
            <ChipIcon size={11} />
            {formatChips(player.chips)}
          </span>
          <span
            className={`seat__action ${isTurn || player.lastAction || player.folded ? '' : 'is-empty'} ${
              isTurn ? 'is-turn' : ''
            }`}
          >
            {player.folded
              ? 'หมอบ'
              : isTurn
                ? 'กำลังเล่น…'
                : player.lastAction ?? (player.allIn ? 'ออลอิน' : '')}
          </span>
          {isTurn && <span className="seat__timer" key={`timer-${state.actionCount}`} />}
        </div>
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
