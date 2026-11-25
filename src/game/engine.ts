import type { Card } from './cards'
import { createDeck, shuffle } from './cards'
import type { HandValue } from './handEval'
import { compareHand, evaluateHand } from './handEval'

export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type Phase = 'playing' | 'handOver'
export type MoveKind = 'fold' | 'check' | 'call' | 'raise' | 'allin'

export interface Move {
  kind: MoveKind
  /** For `raise`: the total bet-to amount for this street. */
  amount?: number
}

export interface Player {
  id: string
  name: string
  avatar: string
  chips: number
  /** Chips committed on the current street. */
  bet: number
  /** Chips committed during the whole hand (drives pot + side pots). */
  totalBet: number
  cards: Card[]
  folded: boolean
  allIn: boolean
  acted: boolean
  isYou: boolean
  isBot: boolean
  lastAction: string | null
  revealed: boolean
  winAmount: number
  seat: number
}

export interface Winner {
  playerId: string
  amount: number
  handName: string
  handText: string
  bestFive: Card[]
}

export interface GameState {
  players: Player[]
  community: Card[]
  deck: Card[]
  street: Street
  phase: Phase
  dealerIndex: number
  smallBlindIndex: number
  bigBlindIndex: number
  turn: number
  currentBet: number
  minRaise: number
  smallBlind: number
  bigBlind: number
  handNumber: number
  winners: Winner[]
  showdown: boolean
  message: string
  /** Bumped on every state transition — handy for effects/timers. */
  actionCount: number
  startingChips: number
}

export interface PlayerSeed {
  id: string
  name: string
  avatar: string
  chips: number
  isYou: boolean
  isBot: boolean
}

export interface LegalActions {
  toCall: number
  callAmount: number
  canCheck: boolean
  canCall: boolean
  canRaise: boolean
  isOpeningBet: boolean
  minRaiseTo: number
  maxRaiseTo: number
  canAllIn: boolean
}

export const STREET_LABEL: Record<Street, string> = {
  preflop: 'พรีฟลอป',
  flop: 'ฟลอป',
  turn: 'เทิร์น',
  river: 'ริเวอร์',
}

export function totalPot(state: GameState): number {
  return state.players.reduce((sum, p) => sum + p.totalBet, 0)
}

export function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !p.folded)
}

function nextToAct(players: Player[], from: number): number {
  const n = players.length
  for (let step = 1; step <= n; step++) {
    const i = (from + step + n) % n
    const p = players[i]
    if (!p.folded && !p.allIn && p.chips > 0) return i
  }
  return -1
}

function nextIndexWithChips(players: Player[], from: number): number {
  const n = players.length
  for (let step = 1; step <= n; step++) {
    const i = (from + step + n) % n
    if (players[i].chips > 0) return i
  }
  return -1
}

function isBettingClosed(state: GameState): boolean {
  const contenders = state.players.filter((p) => !p.folded && !p.allIn)
  if (contenders.length === 0) return true
  return contenders.every((p) => p.acted && p.bet === state.currentBet)
}

export function getLegalActions(state: GameState, index: number): LegalActions | null {
  const player = state.players[index]
  if (!player) return null
  if (state.phase !== 'playing' || state.turn !== index) return null
  if (player.folded || player.allIn || player.chips <= 0) return null

  const toCall = Math.max(0, state.currentBet - player.bet)
  const maxRaiseTo = player.bet + player.chips
  const minRaiseTo = Math.min(maxRaiseTo, Math.max(state.currentBet + state.minRaise, state.bigBlind))
  return {
    toCall,
    callAmount: Math.min(player.chips, toCall),
    canCheck: toCall === 0,
    canCall: toCall > 0,
    canRaise: player.chips > toCall && maxRaiseTo > state.currentBet,
    isOpeningBet: state.currentBet === 0,
    minRaiseTo,
    maxRaiseTo,
    canAllIn: player.chips > 0,
  }
}

export function createGame(opts: {
  seeds: PlayerSeed[]
  smallBlind: number
  bigBlind: number
}): GameState {
  const players: Player[] = opts.seeds.map((seed, index) => ({
    ...seed,
    seat: index,
    bet: 0,
    totalBet: 0,
    cards: [],
    folded: false,
    allIn: false,
    acted: false,
    lastAction: null,
    revealed: false,
    winAmount: 0,
  }))

  const base: GameState = {
    players,
    community: [],
    deck: [],
    street: 'preflop',
    phase: 'playing',
    dealerIndex: -1,
    smallBlindIndex: -1,
    bigBlindIndex: -1,
    turn: -1,
    currentBet: 0,
    minRaise: opts.bigBlind,
    smallBlind: opts.smallBlind,
    bigBlind: opts.bigBlind,
    handNumber: 0,
    winners: [],
    showdown: false,
    message: '',
    actionCount: 0,
    startingChips: players[0]?.chips ?? 1000,
  }

  return startHand(base)
}

export function startHand(state: GameState): GameState {
  // Bots rebuy automatically so a prototype table never dries up.
  const topped = state.players.map((p) =>
    p.chips === 0 && p.isBot ? { ...p, chips: state.startingChips } : p,
  )
  const players: Player[] = topped.map((p) => ({
    ...p,
    bet: 0,
    totalBet: 0,
    cards: [],
    folded: false,
    allIn: false,
    acted: false,
    lastAction: null,
    revealed: false,
    winAmount: 0,
  }))

  const alive = players.filter((p) => p.chips > 0).length
  if (alive < 2) {
    return {
      ...state,
      players,
      phase: 'handOver',
      turn: -1,
      winners: [],
      message: 'ต้องมีผู้เล่นที่มีชิปอย่างน้อย 2 คน',
      actionCount: state.actionCount + 1,
    }
  }

  const dealerIndex =
    state.handNumber === 0
      ? nextIndexWithChips(players, -1)
      : nextIndexWithChips(players, state.dealerIndex)

  const n = players.length
  const order: number[] = []
  for (let step = 1; step <= n; step++) {
    const i = (dealerIndex + step) % n
    if (players[i].chips > 0) order.push(i)
  }

  let deck = shuffle(createDeck())
  for (let round = 0; round < 2; round++) {
    for (const i of order) {
      const card = deck.pop()
      if (!card) continue
      players[i] = { ...players[i], cards: [...players[i].cards, card] }
    }
  }

  const smallBlindIndex = order.length === 2 ? dealerIndex : nextIndexWithChips(players, dealerIndex)
  const bigBlindIndex = nextIndexWithChips(players, smallBlindIndex)

  const postBlind = (index: number, amount: number) => {
    const p = players[index]
    const pay = Math.min(p.chips, amount)
    players[index] = {
      ...p,
      chips: p.chips - pay,
      bet: p.bet + pay,
      totalBet: p.totalBet + pay,
      allIn: p.chips - pay === 0,
    }
  }
  postBlind(smallBlindIndex, state.smallBlind)
  postBlind(bigBlindIndex, state.bigBlind)

  const currentBet = Math.max(...players.map((p) => p.bet))
  const turn = nextToAct(players, bigBlindIndex)

  const handNumber = state.handNumber + 1
  const next: GameState = {
    ...state,
    players,
    deck,
    community: [],
    street: 'preflop',
    phase: 'playing',
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    currentBet,
    minRaise: state.bigBlind,
    turn,
    handNumber,
    winners: [],
    showdown: false,
    message: `มือที่ ${handNumber} — ${STREET_LABEL.preflop}`,
    actionCount: state.actionCount + 1,
  }

  if (turn === -1) return runOutBoard(next)
  return next
}

export function applyMove(state: GameState, index: number, move: Move): GameState {
  if (state.phase !== 'playing' || state.turn !== index) return state
  const source = state.players[index]
  if (!source || source.folded || source.allIn) return state

  const players = state.players.map((p) => ({ ...p }))
  const actor = players[index]
  let currentBet = state.currentBet
  let minRaise = state.minRaise
  const toCall = Math.max(0, currentBet - actor.bet)

  switch (move.kind) {
    case 'fold': {
      actor.folded = true
      actor.acted = true
      actor.lastAction = 'หมอบ'
      break
    }
    case 'check': {
      if (toCall > 0) return state
      actor.acted = true
      actor.lastAction = 'เช็ค'
      break
    }
    case 'call': {
      const pay = Math.min(actor.chips, toCall)
      actor.chips -= pay
      actor.bet += pay
      actor.totalBet += pay
      actor.acted = true
      if (actor.chips === 0) {
        actor.allIn = true
        actor.lastAction = 'ออลอิน'
      } else {
        actor.lastAction = `เรียก ${pay}`
      }
      break
    }
    case 'raise':
    case 'allin': {
      const maxTarget = actor.bet + actor.chips
      const requested =
        move.kind === 'allin' ? maxTarget : Math.floor(move.amount ?? state.currentBet + minRaise)
      let target = Math.min(Math.max(requested, currentBet + minRaise), maxTarget)
      if (target <= currentBet) target = maxTarget // short all-in
      if (target <= actor.bet) return state

      const pay = target - actor.bet
      const raiseSize = target - currentBet
      actor.chips -= pay
      actor.bet = target
      actor.totalBet += pay
      actor.acted = true
      if (actor.chips === 0) actor.allIn = true

      if (target > currentBet) {
        const wasOpeningBet = currentBet === 0
        currentBet = target
        minRaise = Math.max(minRaise, raiseSize)
        for (const other of players) {
          if (other.id !== actor.id && !other.folded && !other.allIn) other.acted = false
        }
        actor.lastAction = actor.allIn
          ? `ออลอิน ${target}`
          : wasOpeningBet
            ? `เดิมพัน ${target}`
            : `เพิ่มเป็น ${target}`
      } else {
        actor.lastAction = 'ออลอิน'
      }
      break
    }
  }

  const next: GameState = {
    ...state,
    players,
    currentBet,
    minRaise,
    actionCount: state.actionCount + 1,
  }
  return settleAfterMove(next, index)
}

function settleAfterMove(state: GameState, actorIndex: number): GameState {
  const alive = state.players.filter((p) => !p.folded)
  if (alive.length === 1) return awardUncontested(state, alive[0].id)
  if (isBettingClosed(state)) return endStreet(state)
  const turn = nextToAct(state.players, actorIndex)
  if (turn === -1) return endStreet(state)
  return { ...state, turn }
}

function endStreet(state: GameState): GameState {
  const alive = state.players.filter((p) => !p.folded)
  if (alive.length === 1) return awardUncontested(state, alive[0].id)
  if (state.street === 'river') return showdown(state)

  const players = state.players.map((p) => ({
    ...p,
    bet: 0,
    acted: false,
    lastAction: p.folded ? p.lastAction : null,
  }))
  const deck = state.deck.slice()
  const community = state.community.slice()
  let street: Street = state.street

  if (state.street === 'preflop') {
    deck.pop()
    community.push(...deck.splice(deck.length - 3, 3))
    street = 'flop'
  } else if (state.street === 'flop') {
    deck.pop()
    community.push(deck.pop() as Card)
    street = 'turn'
  } else if (state.street === 'turn') {
    deck.pop()
    community.push(deck.pop() as Card)
    street = 'river'
  }

  const next: GameState = {
    ...state,
    players,
    deck,
    community,
    street,
    currentBet: 0,
    minRaise: state.bigBlind,
    turn: -1,
    actionCount: state.actionCount + 1,
    message: `${STREET_LABEL[street]} — เริ่มรอบเดิมพันใหม่`,
  }

  const canAct = players.filter((p) => !p.folded && !p.allIn && p.chips > 0).length
  if (canAct <= 1) return runOutBoard(next)

  const turn = nextToAct(players, state.dealerIndex)
  if (turn === -1) return runOutBoard(next)
  return { ...next, turn }
}

function runOutBoard(state: GameState): GameState {
  const deck = state.deck.slice()
  const community = state.community.slice()
  while (community.length < 5) {
    deck.pop()
    const count = community.length === 0 ? 3 : 1
    community.push(...deck.splice(deck.length - count, count))
  }
  return showdown({ ...state, deck, community, street: 'river', turn: -1 })
}

function awardUncontested(state: GameState, winnerId: string): GameState {
  const amount = totalPot(state)
  const players = state.players.map((p) => ({
    ...p,
    chips: p.id === winnerId ? p.chips + amount : p.chips,
    winAmount: p.id === winnerId ? amount : 0,
  }))
  const winner = players.find((p) => p.id === winnerId)
  return {
    ...state,
    players,
    phase: 'handOver',
    turn: -1,
    showdown: false,
    winners: [
      {
        playerId: winnerId,
        amount,
        handName: '',
        handText: '',
        bestFive: [],
      },
    ],
    message: `${winner?.name ?? 'ผู้เล่น'} ชนะ ${amount} ชิป`,
    actionCount: state.actionCount + 1,
  }
}

function buildPots(players: Player[]): { amount: number; eligible: string[] }[] {
  const levels = [...new Set(players.map((p) => p.totalBet))]
    .filter((v) => v > 0)
    .sort((a, b) => a - b)
  const pots: { amount: number; eligible: string[] }[] = []
  let prev = 0
  for (const level of levels) {
    let amount = 0
    const eligible: string[] = []
    for (const p of players) {
      amount += Math.min(p.totalBet, level) - Math.min(p.totalBet, prev)
      if (!p.folded && p.totalBet >= level) eligible.push(p.id)
    }
    if (amount > 0) pots.push({ amount, eligible })
    prev = level
  }
  return pots
}

function showdown(state: GameState): GameState {
  const contenders = state.players.filter((p) => !p.folded)
  const hands = new Map<string, HandValue>()
  for (const p of contenders) hands.set(p.id, evaluateHand([...p.cards, ...state.community]))

  const pots = buildPots(state.players)
  const payouts = new Map<string, number>()

  for (const pot of pots) {
    const eligible = pot.eligible.length > 0 ? pot.eligible : contenders.map((p) => p.id)
    let best: HandValue | null = null
    let potWinners: string[] = []
    for (const id of eligible) {
      const hand = hands.get(id)
      if (!hand) continue
      if (!best || compareHand(hand, best) > 0) {
        best = hand
        potWinners = [id]
      } else if (compareHand(hand, best) === 0) {
        potWinners.push(id)
      }
    }
    if (potWinners.length === 0) continue
    const share = Math.floor(pot.amount / potWinners.length)
    let remainder = pot.amount - share * potWinners.length
    for (const id of potWinners) {
      const extra = remainder > 0 ? 1 : 0
      if (remainder > 0) remainder -= 1
      payouts.set(id, (payouts.get(id) ?? 0) + share + extra)
    }
  }

  const players = state.players.map((p) => {
    const payout = payouts.get(p.id) ?? 0
    return {
      ...p,
      chips: p.chips + payout,
      winAmount: payout,
      revealed: !p.folded,
      lastAction: p.folded ? p.lastAction : p.lastAction,
    }
  })

  const winners: Winner[] = [...payouts.entries()]
    .map(([playerId, amount]) => {
      const hand = hands.get(playerId)
      return {
        playerId,
        amount,
        handName: hand?.name ?? '',
        handText: hand?.text ?? '',
        bestFive: hand?.cards ?? [],
      }
    })
    .sort((a, b) => b.amount - a.amount)

  const total = winners.reduce((sum, w) => sum + w.amount, 0)
  const names = winners
    .map((w) => players.find((p) => p.id === w.playerId)?.name ?? 'ผู้เล่น')
    .join(', ')

  return {
    ...state,
    players,
    phase: 'handOver',
    turn: -1,
    showdown: true,
    winners,
    message: `${names} ชนะ ${total} ชิป`,
    actionCount: state.actionCount + 1,
  }
}
