export type Suit = 's' | 'h' | 'd' | 'c'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  rank: Rank
  suit: Suit
}

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
export const SUITS: Suit[] = ['s', 'h', 'd', 'c']

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

export const SUIT_NAME_TH: Record<Suit, string> = {
  s: 'โพดำ',
  h: 'โพแดง',
  d: 'ข้าวหลามตัด',
  c: 'ดอกจิก',
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit })
  }
  return deck
}

/** Fisher–Yates shuffle on a copy. */
export function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

export function rankLabel(rank: Rank): string {
  return rank === 'T' ? '10' : rank
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function isRed(card: Card): boolean {
  return card.suit === 'h' || card.suit === 'd'
}
