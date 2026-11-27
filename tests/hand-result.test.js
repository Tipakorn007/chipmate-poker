import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import HandResult from '../src/components/table/HandResult'
import { applyMove, createGame } from '../src/game/engine'

function resultState() {
  const game = createGame({
    seeds: [
      { id: 'you', name: 'You', avatar: '🦊', chips: 100, isYou: true, isBot: false },
      { id: 'other', name: 'Other', avatar: '🐼', chips: 100, isYou: false, isBot: true },
    ],
    smallBlind: 5,
    bigBlind: 10,
  })
  return applyMove(game, game.turn, { kind: 'fold' })
}

function renderResult(state, mode, nextHandPending) {
  return renderToStaticMarkup(createElement(HandResult, {
    state, mode, nextHandPending, onRebuy: () => {},
  }))
}

describe('hand result', () => {
  test.each(['bot', 'online'])('%s shows each payout without a dialog', (mode) => {
    const state = resultState()
    state.winners = [
      { playerId: 'you', amount: 125, handText: 'คู่', bestFive: [] },
      { playerId: 'other', amount: 75, handText: 'คู่', bestFive: [] },
    ]
    const html = renderResult(state, mode, true)
    expect(html).toContain('You</strong> ได้ 125 ชิป')
    expect(html).toContain('Other</strong> ได้ 75 ชิป')
    expect(html).toContain('กำลังเริ่มมือถัดไปอัตโนมัติ')
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('ออกจากห้อง')
  })

  test('offers rebuy when a player has no chips and the game cannot continue', () => {
    const state = resultState()
    state.players.find((player) => player.isYou).chips = 0
    const html = renderResult(state, 'bot', false)
    expect(html).toContain('เติมชิปตัวอย่าง')
    expect(html).toContain('ชิปของคุณหมดแล้ว')
    expect(html).not.toContain('role="dialog"')
  })

  test('does not show results during play', () => {
    const state = resultState()
    state.phase = 'playing'
    expect(renderResult(state, 'online', false)).toBe('')
  })
})
