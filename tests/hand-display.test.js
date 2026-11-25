import { describe, expect, test } from 'bun:test'
import { cardKey } from '../src/game/cards'
import { evaluateHand, handHighlightCards } from '../src/game/handEval'

function highlights(input) {
  const cards = input.split(' ').map((code) => ({ rank: code[0], suit: code[1] }))
  const hand = evaluateHand(cards)
  return { category: hand.category, cards: handHighlightCards(hand).map(cardKey).sort() }
}

describe('hand highlights', () => {
  test('highlights only the pair or two pairs, not kickers', () => {
    expect(highlights('9c 2s 9h As Kd 7c')).toEqual({ category: 1, cards: ['9c', '9h'] })
    expect(highlights('3c 9s Ac 9c Kd 3h 8h')).toEqual({
      category: 2,
      cards: ['3c', '3h', '9c', '9s'],
    })
    expect(highlights('9c 9h')).toEqual({ category: 1, cards: ['9c', '9h'] })
  })

  test('highlights combinations made entirely from the board', () => {
    expect(highlights('2c 4d As Ah Ks Kh 7c')).toEqual({
      category: 2,
      cards: ['Ah', 'As', 'Kh', 'Ks'],
    })
  })

  test('highlights only the defining cards for high card, trips and four of a kind', () => {
    expect(highlights('Ah Kd 9c 7s 3h 2d 4c')).toEqual({ category: 0, cards: ['Ah'] })
    expect(highlights('Ah Ad Ac 7s 3h 2d 4c')).toEqual({ category: 3, cards: ['Ac', 'Ad', 'Ah'] })
    expect(highlights('Ah Ad Ac As 3h 2d 4c')).toEqual({ category: 7, cards: ['Ac', 'Ad', 'Ah', 'As'] })
  })

  test('highlights all five cards in full houses, straights and flushes', () => {
    expect(highlights('Ah Ad Ac Kh Kd 2s 3s')).toEqual({
      category: 6,
      cards: ['Ac', 'Ad', 'Ah', 'Kd', 'Kh'],
    })
    expect(highlights('Ah 2s 3d 4c 5h Ks Qd')).toEqual({
      category: 4,
      cards: ['2s', '3d', '4c', '5h', 'Ah'],
    })
    expect(highlights('Ah Jh 8h 4h 2h Kh 9c')).toEqual({
      category: 5,
      cards: ['4h', '8h', 'Ah', 'Jh', 'Kh'],
    })
    expect(highlights('Ah 2h 3h 4h 5h Ks Qd')).toEqual({
      category: 8,
      cards: ['2h', '3h', '4h', '5h', 'Ah'],
    })
  })
})
