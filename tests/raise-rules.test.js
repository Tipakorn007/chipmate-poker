import { describe, expect, test } from 'bun:test'
import { applyMove, createGame, getLegalActions } from '../src/game/engine'

function gameWithStacks(stacks) {
  return createGame({
    seeds: stacks.map((chips, index) => ({
      id: String(index),
      name: String(index),
      avatar: '🦊',
      chips,
      isYou: index === 0,
      isBot: false,
    })),
    smallBlind: 50,
    bigBlind: 100,
  })
}

function move(game, index, action) {
  expect(game.turn).toBe(index)
  const next = applyMove(game, index, action)
  expect(next).not.toBe(game)
  return next
}

describe('minimum raise and reopening betting', () => {
  test('100 to 150 short all-in lets previous players call but not raise or shove', () => {
    let game = gameWithStacks([1000, 1000, 150])
    game = move(game, 0, { kind: 'call' })
    game = move(game, 1, { kind: 'call' })
    game = move(game, 2, { kind: 'allin' })

    const legal = getLegalActions(game, 0)
    expect(legal.toCall).toBe(50)
    expect(legal.canCall).toBe(true)
    expect(legal.canRaise).toBe(false)
    expect(legal.canAllIn).toBe(false)
    expect(applyMove(game, 0, { kind: 'raise', amount: 250 })).toBe(game)
    expect(applyMove(game, 0, { kind: 'allin' })).toBe(game)

    game = move(game, 0, { kind: 'call' })
    expect(getLegalActions(game, 1).canRaise).toBe(false)
    game = move(game, 1, { kind: 'call' })
    expect(game.street).toBe('flop')
  })

  test.each([200, 250])('a full all-in raise to %i reopens betting', (stack) => {
    let game = gameWithStacks([1000, 1000, stack])
    game = move(game, 0, { kind: 'call' })
    game = move(game, 1, { kind: 'call' })
    game = move(game, 2, { kind: 'allin' })
    const legal = getLegalActions(game, 0)
    expect(legal.canRaise).toBe(true)
    expect(legal.canAllIn).toBe(true)
    expect(legal.minRaiseTo).toBe(stack + stack - 100)
    expect(applyMove(game, 0, { kind: 'raise', amount: legal.minRaiseTo - 1 })).toBe(game)
    game = move(game, 0, { kind: 'call' })
    expect(getLegalActions(game, 1).canRaise).toBe(true)
  })

  test('a player who has not acted may raise over a short all-in', () => {
    let game = gameWithStacks([150, 1000, 1000, 1000])
    game = move(game, 3, { kind: 'call' })
    game = move(game, 0, { kind: 'allin' })
    expect(getLegalActions(game, 1).canRaise).toBe(true)
    game = move(game, 1, { kind: 'raise', amount: 250 })
    expect(game.currentBet).toBe(250)
  })

  test('multiple short all-ins reopen betting once the total increase reaches a full raise', () => {
    let game = gameWithStacks([150, 200, 1000, 1000, 1000])
    game = move(game, 3, { kind: 'call' })
    game = move(game, 4, { kind: 'call' })
    game = move(game, 0, { kind: 'allin' })
    game = move(game, 1, { kind: 'allin' })
    game = move(game, 2, { kind: 'call' })
    expect(getLegalActions(game, 3).canRaise).toBe(true)
    expect(getLegalActions(game, 3).minRaiseTo).toBe(300)
  })

  test('cumulative increases are measured separately for each player', () => {
    let game = gameWithStacks([150, 1000, 200, 1000, 1000])
    game = move(game, 3, { kind: 'call' })
    game = move(game, 4, { kind: 'call' })
    game = move(game, 0, { kind: 'allin' })
    game = move(game, 1, { kind: 'call' })
    game = move(game, 2, { kind: 'allin' })
    expect(getLegalActions(game, 3).canRaise).toBe(true)
    game = move(game, 3, { kind: 'call' })
    game = move(game, 4, { kind: 'call' })
    expect(getLegalActions(game, 1).canRaise).toBe(false)
    expect(getLegalActions(game, 1).canCall).toBe(true)
  })

  test('checking before a short opening all-in does not remove the right to raise', () => {
    let game = gameWithStacks([1000, 1000, 150])
    game = move(game, 0, { kind: 'call' })
    game = move(game, 1, { kind: 'call' })
    game = move(game, 2, { kind: 'check' })
    expect(game.street).toBe('flop')
    game = move(game, 1, { kind: 'check' })
    game = move(game, 2, { kind: 'allin' })
    game = move(game, 0, { kind: 'call' })
    expect(getLegalActions(game, 1).canRaise).toBe(true)
  })

  test('a player may call all-in without raising after a short all-in', () => {
    let game = gameWithStacks([120, 1000, 150])
    game = move(game, 0, { kind: 'call' })
    game = move(game, 1, { kind: 'call' })
    game = move(game, 2, { kind: 'allin' })
    const legal = getLegalActions(game, 0)
    expect(legal.canRaise).toBe(false)
    expect(legal.canAllIn).toBe(true)
    game = move(game, 0, { kind: 'allin' })
    expect(game.players[0].bet).toBe(120)
    expect(game.players[0].allIn).toBe(true)
  })
})
