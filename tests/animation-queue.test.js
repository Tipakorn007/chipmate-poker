import { describe, expect, test } from 'bun:test'
import { AnimationQueue, waitForAnimation } from '../src/animation/queue'
import { eventsFromSnapshots } from '../src/animation/events'

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('animation queue', () => {
  test('plays events in order without overlapping, including new arrivals', async () => {
    const started = []
    const resolvers = []
    const errors = []
    const queue = new AnimationQueue(
      (event) => {
        started.push(event)
        return new Promise((resolve) => resolvers.push(resolve))
      },
      () => {},
      (error) => errors.push(error),
    )
    queue.enqueue(['deal', 'bet'])
    queue.enqueue(['collect'])
    expect(started).toEqual(['deal'])
    resolvers.shift()()
    await flush()
    expect(started).toEqual(['deal', 'bet'])
    resolvers.shift()()
    await flush()
    expect(started).toEqual(['deal', 'bet', 'collect'])
    resolvers.shift()()
    await flush()
    expect(errors).toEqual([])
    queue.dispose()
  })

  test('skip cancels current work, discards pending events and permits a fresh queue', async () => {
    const started = []
    const resolvers = []
    const queue = new AnimationQueue(
      (event, signal) => {
        started.push({ event, signal })
        return new Promise((resolve) => resolvers.push(resolve))
      },
      () => {},
      (error) => { throw error },
    )
    queue.enqueue(['old', 'discard'])
    queue.skip()
    expect(started[0].signal.aborted).toBe(true)
    queue.enqueue(['new'])
    expect(started.map((item) => item.event)).toEqual(['old', 'new'])
    resolvers[0]()
    await flush()
    expect(started.map((item) => item.event)).toEqual(['old', 'new'])
    resolvers[1]()
    await flush()
    queue.dispose()
  })

  test('aborted waiting ends immediately', async () => {
    const controller = new AbortController()
    const waiting = waitForAnimation(60_000, controller.signal)
    controller.abort()
    await waiting
    expect(controller.signal.aborted).toBe(true)
  })

  test('reports playback errors and does not continue the failed sequence', async () => {
    const started = []
    const errors = []
    const queue = new AnimationQueue(
      async (event) => {
        started.push(event)
        if (event === 'bad') throw new Error('playback failed')
      },
      () => {},
      (error) => errors.push(error.message),
    )
    queue.enqueue(['bad', 'discard'])
    await flush()
    expect(started).toEqual(['bad'])
    expect(errors).toEqual(['playback failed'])
    queue.enqueue(['next'])
    await flush()
    expect(started).toEqual(['bad', 'next'])
    queue.dispose()
  })
})

describe('snapshot animation events', () => {
  const before = {
    handNumber: 1, actionCount: 7, phase: 'playing', street: 'preflop', turn: 0,
    community: [], players: [{ id: 'a', totalBet: 10, bet: 10 }], winners: [], showdown: false,
  }

  test('orders bet, collection, board, showdown and payout for an all-in runout', () => {
    const after = {
      ...before, actionCount: 9, phase: 'handOver', street: 'river',
      community: [1, 2, 3, 4, 5], players: [{ id: 'a', totalBet: 40, bet: 0 }],
      winners: [{ playerId: 'a' }], showdown: true,
    }
    expect(eventsFromSnapshots(before, after).map((event) => event.kind))
      .toEqual(['bet', 'collect', 'board', 'showdown', 'payout'])
    expect(eventsFromSnapshots(before, after)[0].amount).toBe(30)
  })

  test('does not fabricate showdown for a fold or replay unchanged snapshots', () => {
    const after = {
      ...before, actionCount: 8, phase: 'handOver', winners: [{ playerId: 'a' }],
    }
    expect(eventsFromSnapshots(before, after).map((event) => event.kind)).toEqual(['collect', 'payout'])
    expect(eventsFromSnapshots(before, { ...before })).toEqual([])
    expect(eventsFromSnapshots(after, { ...before, handNumber: 2 }).map((event) => event.kind)).toEqual(['deal'])
  })
})
