import { describe, expect, spyOn, test } from 'bun:test'
import { applyMove, createGame, getLegalActions, startHand, totalPot } from '../src/game/engine'

function randomSource(seed) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function seededShuffle(random) {
  return (cards) => {
    const shuffled = cards.slice()
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

function templateGame() {
  return createGame({
    seeds: Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      name: String(index),
      avatar: '🦊',
      chips: 1000,
      isYou: index === 0,
      isBot: false,
    })),
    smallBlind: 5,
    bigBlind: 10,
  })
}

function newSeededHand(template, seed) {
  const random = randomSource(seed)
  const count = 2 + Math.floor(random() * 5)
  const stacks = Array.from({ length: count }, () => 10 + Math.floor(random() * 60) * 5)
  const initial = {
    ...template,
    handNumber: 0,
    dealerIndex: -1,
    actionCount: 0,
    players: template.players.slice(0, count).map((player, index) => ({
      ...player,
      chips: stacks[index],
    })),
  }
  return {
    game: startHand(initial, seededShuffle(random)),
    random,
    total: stacks.reduce((sum, chips) => sum + chips, 0),
  }
}

describe('seeded poker hands', () => {
  test('startHand uses the supplied shuffle and does not change its input', () => {
    const initial = templateGame()
    const before = structuredClone(initial)
    let calls = 0
    const identityShuffle = (cards) => {
      calls++
      return cards.slice()
    }
    const first = startHand(initial, identityShuffle)
    const second = startHand(initial, identityShuffle)
    expect(calls).toBe(2)
    expect(first).toEqual(second)
    expect(initial).toEqual(before)
  })

  test('the same seed deals the same hand and different seeds change the deck', () => {
    const initial = templateGame()
    const first = newSeededHand(initial, 12345).game
    const again = newSeededHand(initial, 12345).game
    const different = newSeededHand(initial, 67890).game
    expect(first).toEqual(again)
    expect(first.deck).not.toEqual(different.deck)
  })

  test('the default shuffle still uses crypto', () => {
    const initial = templateGame()
    const cryptoRandom = spyOn(crypto, 'getRandomValues').mockImplementation((values) => {
      values.fill(0)
      return values
    })
    try {
      const first = startHand(initial)
      const second = startHand(initial)
      expect(cryptoRandom).toHaveBeenCalled()
      expect(first).toEqual(second)
    } finally {
      cryptoRandom.mockRestore()
    }
  })

  test('10,000 reproducible hands preserve every chip at every transition', () => {
    const template = templateGame()
    const baseSeed = 0x1a2b3c4d
    const replay = newSeededHand(template, baseSeed)
    expect(replay.game).toEqual(newSeededHand(template, baseSeed).game)

    for (let hand = 0; hand < 10_000; hand++) {
      const seed = (baseSeed + hand) >>> 0
      const { random, total, game: initial } = newSeededHand(template, seed)
      let game = initial
      let moves = 0

      while (true) {
        const chips = game.players.reduce((sum, player) => sum + player.chips, 0)
        const actual = chips + (game.phase === 'playing' ? totalPot(game) : 0)
        if (actual !== total) {
          throw new Error(`seed=${seed} hand=${hand} expected=${total} actual=${actual} state=${JSON.stringify(game)}`)
        }
        if (game.phase === 'handOver') break
        if (++moves > 150) {
          throw new Error(`seed=${seed} hand=${hand} exceeded move limit state=${JSON.stringify(game)}`)
        }
        const legal = getLegalActions(game, game.turn)
        if (!legal) throw new Error(`seed=${seed} hand=${hand} no legal actions state=${JSON.stringify(game)}`)
        const actions = [{ kind: 'fold' }]
        if (legal.canCheck) actions.push({ kind: 'check' })
        if (legal.canCall) actions.push({ kind: 'call' })
        if (legal.canRaise) {
          const amount = legal.minRaiseTo + Math.floor(random() * (legal.maxRaiseTo - legal.minRaiseTo + 1))
          actions.push({ kind: 'raise', amount })
        }
        if (legal.canAllIn) actions.push({ kind: 'allin' })
        const action = actions[Math.floor(random() * actions.length)]
        const next = applyMove(game, game.turn, action)
        if (next === game) {
          throw new Error(`seed=${seed} hand=${hand} rejected=${JSON.stringify(action)} state=${JSON.stringify(game)}`)
        }
        game = next
      }
    }
  }, 120_000)
})
