import type { GameState } from '../../game/engine'
import { formatChips } from '../../lib/utils'
import ChipIcon from '../ui/ChipIcon'

export default function PlayerList({ state }: { state: GameState }) {
  return (
    <ul className="players">
      {state.players.map((player, index) => {
        const tags: string[] = []
        if (state.dealerIndex === index) tags.push('D')
        if (state.phase === 'playing' && state.smallBlindIndex === index) tags.push('SB')
        if (state.phase === 'playing' && state.bigBlindIndex === index) tags.push('BB')
        if (player.folded) tags.push('หมอบ')
        if (player.allIn) tags.push('ออลอิน')

        return (
          <li
            key={player.id}
            className={`player-row ${player.isYou ? 'is-you' : ''} ${
              state.turn === index && state.phase === 'playing' ? 'is-turn' : ''
            } ${player.folded ? 'is-folded' : ''}`}
          >
            <span className="player-row__avatar">{player.avatar}</span>
            <div className="player-row__meta">
              <span className="player-row__name">
                {player.name}
                {player.isYou && <em>คุณ</em>}
              </span>
              <span className="player-row__stack">
                <ChipIcon size={11} /> {formatChips(player.chips)}
                {player.bet > 0 && <span className="player-row__bet">· ลง {formatChips(player.bet)}</span>}
              </span>
            </div>
            <div className="player-row__tags">
              {tags.map((tag) => (
                <span key={tag} className={`mini-tag mini-tag--${tag === 'D' ? 'dealer' : 'muted'}`}>
                  {tag}
                </span>
              ))}
              {state.turn === index && state.phase === 'playing' && (
                <span className="mini-tag mini-tag--live">ตา</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
