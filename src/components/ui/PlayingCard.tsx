import type { Card } from '../../game/cards'
import { isRed, rankLabel, SUIT_SYMBOL } from '../../game/cards'

export type CardSize = 'xs' | 'sm' | 'md' | 'lg'

interface PlayingCardProps {
  card?: Card
  faceDown?: boolean
  size?: CardSize
  highlight?: boolean
  dim?: boolean
}

export default function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  highlight = false,
  dim = false,
}: PlayingCardProps) {
  if (faceDown || !card) {
    return (
      <div className={`pcard pcard--back pcard--${size}`} aria-label="ไพ่ปิด">
        <span className="pcard__backmark" />
      </div>
    )
  }

  const red = isRed(card)
  const classes = [
    'pcard',
    `pcard--${size}`,
    red ? 'pcard--red' : 'pcard--black',
    highlight ? 'pcard--win' : '',
    dim ? 'pcard--dim' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`

  return (
    <div className={classes} aria-label={label}>
      <span className="pcard__corner pcard__corner--tl">
        <span className="pcard__rank">{rankLabel(card.rank)}</span>
        <span className="pcard__suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>
    </div>
  )
}
