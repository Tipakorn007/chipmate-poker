import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameState } from '../game/engine'
import { ANIMATION_SPEED, ANIMATION_TIMING, type AnimationSpeed } from './constants'
import { eventsFromSnapshots, type AnimationEvent } from './events'
import { AnimationQueue, waitForAnimation } from './queue'

export function useAnimationTimeline(mode: 'live' | 'demo') {
  const [speed, setSpeedState] = useState<AnimationSpeed>(ANIMATION_SPEED.relaxed)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [current, setCurrent] = useState<AnimationEvent | null>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const speedRef = useRef(speed)
  const reducedRef = useRef(reducedMotion)
  const queueRef = useRef<AnimationQueue<AnimationEvent> | null>(null)
  const previousRef = useRef<GameState | null>(null)
  speedRef.current = speed
  reducedRef.current = reducedMotion

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    update()
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const queue = new AnimationQueue<AnimationEvent>(
      async (_event, signal) => {
        const duration = reducedRef.current
          ? ANIMATION_TIMING.reducedMotion
          : (mode === 'demo' ? ANIMATION_TIMING.demoEvent : ANIMATION_TIMING.liveEvent) * speedRef.current
        await waitForAnimation(duration, signal)
      },
      (event, count) => {
        setCurrent(event)
        setPending(count)
      },
      (reason) => {
        console.error('คิวอนิเมชันทำงานไม่สำเร็จ', reason)
        setError('เล่นคิวอนิเมชันไม่สำเร็จ แต่สถานะเกมยังเป็นปัจจุบัน')
      },
    )
    queueRef.current = queue
    return () => {
      queue.dispose()
      if (queueRef.current === queue) queueRef.current = null
      previousRef.current = null
    }
  }, [mode])

  const setSpeed = useCallback((value: AnimationSpeed) => {
    speedRef.current = value
    setSpeedState(value)
  }, [])

  const skip = useCallback(() => {
    queueRef.current?.skip()
  }, [])

  const reset = useCallback(() => {
    previousRef.current = null
    queueRef.current?.skip()
  }, [])

  const acceptSnapshot = useCallback((state: GameState) => {
    const previous = previousRef.current
    previousRef.current = state
    // สถานะแรกหลังเข้าโต๊ะหรือเชื่อมต่อกลับใช้เป็นจุดเริ่ม ไม่ย้อนเล่นภาพเก่า
    if (previous) queueRef.current?.enqueue(eventsFromSnapshots(previous, state))
  }, [])

  const replay = useCallback((events: readonly AnimationEvent[]) => {
    setError('')
    queueRef.current?.skip()
    queueRef.current?.enqueue(events)
  }, [])

  return { speed, setSpeed, reducedMotion, current, pending, error, skip, reset, acceptSnapshot, replay }
}

export type AnimationTimeline = ReturnType<typeof useAnimationTimeline>
