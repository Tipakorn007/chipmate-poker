import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import PokerTable from '../src/components/table/PokerTable'
import { createGame, totalPot } from '../src/game/engine'

function gameWithViewerAtSecondSeat() {
  const state = createGame({
    seeds: [
      { id: 'one', name: 'One', avatar: '🐯', chips: 1000, isYou: false, isBot: false },
      { id: 'you', name: 'You', avatar: '🦊', chips: 1000, isYou: true, isBot: false },
    ],
    smallBlind: 5,
    bigBlind: 10,
  })
  return {
    state, you: state.players[1], pot: totalPot(state), yourHand: null, yourHandLabel: '',
  }
}

describe('table seats', () => {
  test('keeps the viewer at bottom and distinguishes waiting players from empty seats', () => {
    const game = gameWithViewerAtSecondSeat()
    const html = renderToStaticMarkup(createElement(PokerTable, {
      game,
      seatCapacity: 6,
      waitingPlayers: [{ id: 'waiting', name: 'Waiting', avatar: '🐼' }],
    }))

    expect(html).toMatch(/class="seat[^"]*seat--you[^"]*" style="left:50%;top:93%"/)
    expect(html.match(/aria-label="ที่นั่งว่าง"/g)).toHaveLength(3)
    expect(html).toContain('Waiting')
    expect(html).toContain('รอมือถัดไป')
  })

  test('marks the active player and dims a folded seat without replaying old actions', () => {
    const game = gameWithViewerAtSecondSeat()
    game.state.turn = 1
    game.state.players[0].folded = true
    game.state.players[0].lastAction = 'หมอบ'
    const html = renderToStaticMarkup(createElement(PokerTable, { game, seatCapacity: 2 }))

    expect(html).toContain('seat--folded')
    expect(html).toContain('seat__turn-ring')
    expect(html).toContain('You คุณ ถึงตาเล่น')
    expect(html).not.toContain('class="seat__action"')
  })
})
