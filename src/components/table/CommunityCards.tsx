import type { Card } from '../../game/cards'
import { cardKey } from '../../game/cards'
import PlayingCard from '../ui/PlayingCard'

interface CommunityCardsProps {
  cards: Card[]
}

export default function CommunityCards({ cards }: CommunityCardsProps) {
  return (
    <div className="board" aria-label="ไพ่กองกลาง">
      {Array.from({ length: 5 }, (_, index) => {
        const card = cards[index]
        return card ? (
          <PlayingCard key={cardKey(card)} card={card} size="lg" />
        ) : (
          <div key={`slot-${index}`} className="board__slot" aria-hidden="true" />
        )
      })}
    </div>
  )
}
