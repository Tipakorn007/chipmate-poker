import type { GameState, Street } from '../game/engine'

export type AnimationEventKind = 'deal' | 'bet' | 'collect' | 'board' | 'showdown' | 'payout'

export interface AnimationEvent {
  kind: AnimationEventKind
  handNumber: number
  actorId?: string
  amount?: number
  street?: Street
  fromCards?: number
  toCards?: number
}

export const ANIMATION_LABELS: Record<AnimationEventKind, string> = {
  deal: 'แจกไพ่',
  bet: 'วางเดิมพัน',
  collect: 'กวาดชิป',
  board: 'เปิดไพ่กลาง',
  showdown: 'โชว์ไพ่',
  payout: 'จ่ายชิป',
}

export function eventsFromSnapshots(before: GameState, after: GameState): AnimationEvent[] {
  if (after.handNumber !== before.handNumber) {
    return after.handNumber > before.handNumber ? [{ kind: 'deal', handNumber: after.handNumber }] : []
  }
  if (after.actionCount <= before.actionCount) return []

  const events: AnimationEvent[] = []
  const handNumber = after.handNumber
  const actor = before.players[before.turn]
  const updatedActor = actor && after.players.find((player) => player.id === actor.id)
  const added = actor && updatedActor ? updatedActor.totalBet - actor.totalBet : 0
  if (before.phase === 'playing' && actor && added > 0) {
    events.push({ kind: 'bet', handNumber, actorId: actor.id, amount: added })
  }

  if (before.phase === 'playing' &&
    (before.street !== after.street || after.phase === 'handOver') &&
    (before.players.some((player) => player.bet > 0) || added > 0)) {
    events.push({ kind: 'collect', handNumber })
  }
  if (after.community.length > before.community.length) {
    events.push({
      kind: 'board', handNumber, street: after.street,
      fromCards: before.community.length, toCards: after.community.length,
    })
  }
  if (before.phase !== 'handOver' && after.phase === 'handOver') {
    if (after.showdown) events.push({ kind: 'showdown', handNumber })
    if (after.winners.length > 0) events.push({ kind: 'payout', handNumber })
  }
  return events
}
