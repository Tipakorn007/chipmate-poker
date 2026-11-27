import { describe, expect, test } from 'bun:test'
import { applyMove, createGame, totalPot } from '../src/game/engine'

function headsUp(stacks) {
  return createGame({
    seeds: stacks.map((chips, index) => ({
      id: String(index),
      name: String(index),
      avatar: '🦊',
      chips,
      isYou: index === 0,
      isBot: false,
    })),
    smallBlind: 5,
    bigBlind: 10,
  })
}

function card(code) {
  return { rank: code[0], suit: code[1] }
}

function tiedShowdown(contributions, folded, allIn = []) {
  const game = createGame({
    seeds: contributions.map((_, index) => ({
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
  const holes = [['2c', '2d'], ['3c', '3d'], ['4c', '4d'], ['5c', '5d'], ['6c', '6d']]
  const turn = contributions.findIndex((_, index) => !folded.includes(index) && !allIn.includes(index))
  const state = {
    ...game,
    street: 'river',
    dealerIndex: 0,
    currentBet: 0,
    turn,
    community: ['As', 'Ks', 'Qs', 'Js', 'Ts'].map(card),
    players: game.players.map((player, index) => ({
      ...player,
      chips: allIn.includes(index) ? 0 : 1000 - contributions[index],
      bet: 0,
      totalBet: contributions[index],
      cards: holes[index].map(card),
      folded: folded.includes(index),
      allIn: allIn.includes(index),
      acted: index !== turn,
      lastActedBet: index === turn ? null : 0,
    })),
  }
  return applyMove(state, turn, { kind: 'check' })
}

function payouts(state) {
  return state.players.map((player) => player.winAmount)
}

describe('uncalled bets', () => {
  test('returns 60 before awarding a pot when 100 is met by an all-in of 40', () => {
    let game = headsUp([200, 40])
    game = applyMove(game, 0, { kind: 'raise', amount: 100 })
    game = {
      ...game,
      players: game.players.map((player, index) => ({
        ...player,
        cards: (index === 0 ? ['2c', '3d'] : ['Ah', 'Ad']).map(card),
      })),
      deck: ['9s', 'Qc', '6d', 'Kc', '4s', '8h', 'Ts', 'Jc'].map(card),
    }
    game = applyMove(game, 1, { kind: 'allin' })

    expect(game.phase).toBe('handOver')
    expect(game.players.map((player) => player.totalBet)).toEqual([40, 40])
    expect(totalPot(game)).toBe(80)
    expect(game.players.map((player) => player.chips)).toEqual([160, 80])
    expect(game.players[0].winAmount).toBe(0)
    expect(game.players[1].winAmount).toBe(80)
  })

  test('does not return anything when the 100 bet is fully called', () => {
    let game = headsUp([200, 200])
    game = applyMove(game, 0, { kind: 'raise', amount: 100 })
    game = applyMove(game, 1, { kind: 'call' })

    expect(game.street).toBe('flop')
    expect(game.players.map((player) => player.totalBet)).toEqual([100, 100])
    expect(game.players.map((player) => player.chips)).toEqual([100, 100])
    expect(totalPot(game)).toBe(200)
  })

  test('returns the unmatched amount before awarding the pot when everyone else folds', () => {
    let game = headsUp([200, 200])
    game = applyMove(game, 0, { kind: 'raise', amount: 100 })
    game = applyMove(game, 1, { kind: 'fold' })

    expect(game.phase).toBe('handOver')
    expect(game.players.map((player) => player.totalBet)).toEqual([10, 10])
    expect(totalPot(game)).toBe(20)
    expect(game.players[0].chips).toBe(210)
    expect(game.players[0].winAmount).toBe(20)
    expect(game.winners[0].amount).toBe(20)
  })
})

describe('odd chips', () => {
  test('a tied player immediately left of the dealer receives the odd chip', () => {
    const game = tiedShowdown([5, 5, 3], [2])
    expect(game.phase).toBe('handOver')
    expect(payouts(game)).toEqual([6, 7, 0])
  })

  test('two odd chips go to the first two tied players left of the dealer', () => {
    const game = tiedShowdown([5, 5, 5, 2], [3])
    expect(payouts(game)).toEqual([5, 6, 6, 0])
  })

  test('assigns odd chips independently for each side pot', () => {
    const game = tiedShowdown([3, 5, 5, 2, 4], [3, 4], [0])
    expect(payouts(game)).toEqual([4, 9, 6, 0, 0])
    expect(totalPot(game)).toBe(19)
  })
})

describe('folds and side pots', () => {
  test('a free fold is treated as a check', () => {
    let game = createGame({
      seeds: [0, 1, 2].map((index) => ({
        id: String(index), name: String(index), avatar: '🦊',
        chips: 200, isYou: index === 0, isBot: false,
      })),
      smallBlind: 5,
      bigBlind: 10,
    })
    game = applyMove(game, 0, { kind: 'call' })
    game = applyMove(game, 1, { kind: 'call' })
    game = applyMove(game, 2, { kind: 'check' })
    expect(game.street).toBe('flop')
    game = applyMove(game, 1, { kind: 'fold' })
    expect(game.players[1].folded).toBe(false)
    expect(game.players[1].lastAction).toBe('เช็ค')
    expect(game.turn).toBe(2)
  })

  test('contested folds remain folds', () => {
    const game = applyMove(headsUp([200, 200]), 0, { kind: 'fold' })
    expect(game.players[0].folded).toBe(true)
    expect(game.phase).toBe('handOver')
  })

  test('folded A and C each recover their 15 chips in a side pot above the 55 all-in', () => {
    const stacks = [95, 45, 145, 30, 65, 30]
    const contributions = [70, 45, 70, 30, 55, 30]
    const game = createGame({
      seeds: stacks.map((chips, index) => ({
        id: String(index), name: String(index), avatar: '🦊',
        chips, isYou: index === 0, isBot: false,
      })),
      smallBlind: 5,
      bigBlind: 10,
    })
    const holes = [['2c', '2d'], ['3c', '3d'], ['4c', '4d'], ['5c', '5d'], ['6c', '6d'], ['7c', '7d']]
    const state = {
      ...game,
      street: 'river',
      dealerIndex: 0,
      currentBet: 0,
      turn: 4,
      community: ['As', 'Ks', 'Qs', 'Js', 'Ts'].map(card),
      players: game.players.map((player, index) => ({
        ...player,
        chips: stacks[index] - contributions[index],
        bet: 0,
        totalBet: contributions[index],
        cards: holes[index].map(card),
        folded: index === 0 || index === 2,
        allIn: stacks[index] === contributions[index],
        acted: index !== 4,
        lastActedBet: index === 4 ? null : 0,
      })),
    }

    const finished = applyMove(state, 4, { kind: 'check' })
    expect(finished.phase).toBe('handOver')
    expect(finished.players[0].chips).toBe(40)
    expect(finished.players[2].chips).toBe(90)
    expect(finished.players[0].winAmount).toBe(0)
    expect(finished.players[2].winAmount).toBe(0)
    expect(finished.players.map((player) => player.totalBet)).toEqual([55, 45, 55, 30, 55, 30])
    expect(totalPot(finished)).toBe(270)
    expect(finished.players.reduce((sum, player) => sum + player.chips, 0))
      .toBe(stacks.reduce((sum, chips) => sum + chips, 0))
  })

  test('returns ineligible side pots even when the last other player folds', () => {
    const stacks = [95, 45, 145, 30, 55, 30]
    const contributions = [70, 45, 70, 30, 55, 30]
    const game = createGame({
      seeds: stacks.map((chips, index) => ({
        id: String(index), name: String(index), avatar: '🦊',
        chips, isYou: index === 0, isBot: false,
      })),
      smallBlind: 5,
      bigBlind: 10,
    })
    const state = {
      ...game,
      street: 'river',
      turn: 2,
      currentBet: 10,
      players: game.players.map((player, index) => ({
        ...player,
        chips: stacks[index] - contributions[index],
        bet: index === 4 ? 10 : 0,
        totalBet: contributions[index],
        folded: index !== 2 && index !== 4,
        allIn: index === 4,
      })),
    }

    const finished = applyMove(state, 2, { kind: 'fold' })
    expect(finished.phase).toBe('handOver')
    expect(finished.players.map((player) => player.totalBet)).toEqual([45, 45, 45, 30, 45, 30])
    expect(finished.players[0].chips).toBe(50)
    expect(finished.players[2].chips).toBe(100)
    expect(finished.players[4].winAmount).toBe(240)
    expect(totalPot(finished)).toBe(240)
    expect(finished.players.reduce((sum, player) => sum + player.chips, 0))
      .toBe(stacks.reduce((sum, chips) => sum + chips, 0))
  })

  test('three contested levels include folded chips but restrict each player to eligible pots', () => {
    const contributions = [50, 120, 200, 30, 200]
    const game = createGame({
      seeds: contributions.map((_, index) => ({
        id: String(index), name: String(index), avatar: '🦊',
        chips: 1000, isYou: index === 0, isBot: false,
      })),
      smallBlind: 5,
      bigBlind: 10,
    })
    const holes = [['7c', '7s'], ['Ah', 'Ad'], ['Kh', 'Kd'], ['Ts', '8s'], ['4h', '5d']]
    const state = {
      ...game,
      street: 'river',
      dealerIndex: 0,
      currentBet: 0,
      turn: 2,
      community: ['2c', '7d', '9h', 'Js', 'Qc'].map(card),
      players: game.players.map((player, index) => ({
        ...player,
        chips: index < 2 ? 0 : 1000 - contributions[index],
        bet: 0,
        totalBet: contributions[index],
        cards: holes[index].map(card),
        folded: index === 3,
        allIn: index < 2,
        acted: index !== 2,
        lastActedBet: index === 2 ? null : 0,
      })),
    }
    const finished = applyMove(state, 2, { kind: 'check' })
    expect(finished.phase).toBe('handOver')
    expect(payouts(finished)).toEqual([230, 210, 160, 0, 0])
    expect(totalPot(finished)).toBe(600)
  })
})
