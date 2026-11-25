import type { Card } from './cards'
import { RANK_VALUE } from './cards'

export interface HandValue {
  /** 8 = straight flush … 0 = high card */
  category: number
  name: string
  tiebreak: number[]
  /** Best five cards, sorted by rank (descending). */
  cards: Card[]
  text: string
}

const CATEGORY_NAME = [
  'ไพ่สูง',
  'หนึ่งคู่',
  'สองคู่',
  'ตอง',
  'สเตรท',
  'ฟลัช',
  'ฟูลเฮาส์',
  'โฟร์การ์ด',
  'สเตรทฟลัช',
]

const RANK_TEXT: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

function rl(value: number): string {
  return RANK_TEXT[value] ?? String(value)
}

function sortByRankDesc(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])
}

function evaluateFive(cards: Card[]): HandValue {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const isFlush = cards.every((c) => c.suit === cards[0].suit)
  const unique = [...new Set(values)].sort((a, b) => b - a)

  let straightHigh = 0
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0]
    else if (unique[0] === 14 && unique[1] === 5) straightHigh = 5 // wheel A-2-3-4-5
  }

  const ordered = sortByRankDesc(cards)
  const make = (category: number, tiebreak: number[], text: string): HandValue => ({
    category,
    name: CATEGORY_NAME[category],
    tiebreak,
    cards: ordered,
    text,
  })

  if (isFlush && straightHigh) return make(8, [straightHigh], `สเตรทฟลัช ${rl(straightHigh)} สูง`)
  if (groups[0][1] === 4) return make(7, [groups[0][0], groups[1][0]], `โฟร์การ์ด ${rl(groups[0][0])}`)
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return make(6, [groups[0][0], groups[1][0]], `ฟูลเฮาส์ ${rl(groups[0][0])} เต็ม ${rl(groups[1][0])}`)
  }
  if (isFlush) return make(5, values, `ฟลัช ${rl(values[0])} สูง`)
  if (straightHigh) return make(4, [straightHigh], `สเตรท ${rl(straightHigh)} สูง`)
  if (groups[0][1] === 3) {
    return make(3, [groups[0][0], groups[1][0], groups[2][0]], `ตอง ${rl(groups[0][0])}`)
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return make(
      2,
      [groups[0][0], groups[1][0], groups[2][0]],
      `สองคู่ ${rl(groups[0][0])} และ ${rl(groups[1][0])}`,
    )
  }
  if (groups[0][1] === 2) {
    return make(
      1,
      [groups[0][0], groups[1][0], groups[2][0], groups[3][0]],
      `คู่ ${rl(groups[0][0])}`,
    )
  }
  return make(0, values, `ไพ่สูง ${rl(values[0])}`)
}

function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = []
  const combo: T[] = []
  const walk = (start: number) => {
    if (combo.length === k) {
      out.push(combo.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i])
      walk(i + 1)
      combo.pop()
    }
  }
  walk(0)
  return out
}

export function compareHand(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category
  const len = Math.max(a.tiebreak.length, b.tiebreak.length)
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] ?? 0
    const bv = b.tiebreak[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

/** Best five-card hand from 2–7 cards. */
export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length >= 5) {
    let best: HandValue | null = null
    for (const combo of combinations(cards, 5)) {
      const value = evaluateFive(combo)
      if (!best || compareHand(value, best) > 0) best = value
    }
    return best as HandValue
  }

  const ordered = sortByRankDesc(cards)
  const values = ordered.map((c) => RANK_VALUE[c.rank])
  if (ordered.length === 2 && ordered[0].rank === ordered[1].rank) {
    return {
      category: 1,
      name: CATEGORY_NAME[1],
      tiebreak: values,
      cards: ordered,
      text: `คู่ ${rl(values[0])}`,
    }
  }
  return {
    category: 0,
    name: CATEGORY_NAME[0],
    tiebreak: values,
    cards: ordered,
    text: ordered.length > 0 ? `ไพ่สูง ${rl(values[0])}` : '',
  }
}

/** Short label for the pre-flop hole cards, e.g. "คู่ A" or "A สูง". */
export function holeLabel(cards: Card[]): string {
  if (cards.length < 2) return ''
  const [a, b] = cards
  if (a.rank === b.rank) return `คู่ ${rl(RANK_VALUE[a.rank])}`
  const hi = RANK_VALUE[a.rank] >= RANK_VALUE[b.rank] ? a : b
  const suited = a.suit === b.suit
  return `${rl(RANK_VALUE[hi.rank])} สูง${suited ? ' ( suited )' : ''}`
}
