import type { Card } from './cards'
import { RANK_VALUE } from './cards'
import type { GameState, Move } from './engine'
import { getLegalActions, totalPot } from './engine'
import { evaluateHand } from './handEval'

function preflopStrength(cards: Card[]): number {
  if (cards.length < 2) return 0.4
  const [a, b] = cards
  const hi = Math.max(RANK_VALUE[a.rank], RANK_VALUE[b.rank])
  const lo = Math.min(RANK_VALUE[a.rank], RANK_VALUE[b.rank])
  const pair = a.rank === b.rank
  const suited = a.suit === b.suit
  const gap = hi - lo

  let score: number
  if (pair) {
    score = 0.5 + ((hi - 2) / 12) * 0.45
  } else {
    score = ((hi - 2) / 12) * 0.55 + ((lo - 2) / 12) * 0.22
    if (suited) score += 0.05
    if (gap === 1) score += 0.04
    if (gap > 3) score -= 0.06
  }
  return Math.min(0.98, Math.max(0.05, score))
}

function postflopStrength(cards: Card[]): number {
  const hand = evaluateHand(cards)
  const table = [0.18, 0.36, 0.52, 0.66, 0.74, 0.8, 0.88, 0.95, 0.99]
  return table[hand.category] ?? 0.3
}

function roundToChip(value: number): number {
  return Math.max(1, Math.round(value / 5) * 5)
}

/**
 * Simple heuristic opponent. Swap this out for a server-driven AI later —
 * the table only needs `chooseBotMove(state, index): Move`.
 */
export function chooseBotMove(state: GameState, index: number): Move {
  const player = state.players[index]
  const legal = getLegalActions(state, index)
  if (!player || !legal) return { kind: 'check' }

  const strength =
    player.cards.length === 2
      ? state.community.length >= 3
        ? postflopStrength([...player.cards, ...state.community])
        : preflopStrength(player.cards)
      : 0.4

  const pot = totalPot(state)
  const toCall = legal.callAmount
  const pressure = pot > 0 ? toCall / (pot + toCall) : 0
  const roll = Math.random()

  if (legal.canRaise && strength > 0.62 && roll > 0.22) {
    const sizing = strength > 0.86 ? 0.9 : 0.55
    const target = Math.min(
      legal.maxRaiseTo,
      Math.max(legal.minRaiseTo, roundToChip(state.currentBet + Math.max(state.bigBlind, pot * sizing))),
    )
    return { kind: 'raise', amount: target }
  }

  // Occasional bluff so the table does not feel scripted.
  if (legal.canRaise && strength < 0.3 && roll > 0.94) {
    return { kind: 'raise', amount: legal.minRaiseTo }
  }

  if (toCall === 0) return { kind: 'check' }
  if (strength > 0.45 || pressure < 0.12 || (toCall <= player.chips * 0.05 && roll > 0.35)) {
    return { kind: 'call' }
  }
  return { kind: 'fold' }
}
