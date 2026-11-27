import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import AnimationControls from '../components/table/AnimationControls'
import { ANIMATION_EASING, ANIMATION_SPEED, ANIMATION_TIMING } from '../animation/constants'
import { ANIMATION_LABELS, type AnimationEvent } from '../animation/events'
import { useAnimationTimeline } from '../animation/useAnimationTimeline'

const DEMO_EVENTS: AnimationEvent[] = [
  { kind: 'deal', handNumber: 1 },
  { kind: 'bet', handNumber: 1 },
  { kind: 'collect', handNumber: 1 },
  { kind: 'board', handNumber: 1, street: 'flop', fromCards: 0, toCards: 3 },
  { kind: 'bet', handNumber: 1 },
  { kind: 'collect', handNumber: 1 },
  { kind: 'board', handNumber: 1, street: 'turn', fromCards: 3, toCards: 4 },
  { kind: 'bet', handNumber: 1 },
  { kind: 'collect', handNumber: 1 },
  { kind: 'board', handNumber: 1, street: 'river', fromCards: 4, toCards: 5 },
  { kind: 'showdown', handNumber: 1 },
  { kind: 'payout', handNumber: 1 },
]

function eventLabel(event: AnimationEvent): string {
  if (event.kind === 'board' && event.street) {
    return `เปิด ${event.street === 'flop' ? 'flop' : event.street === 'turn' ? 'turn' : 'river'}`
  }
  return ANIMATION_LABELS[event.kind]
}

export default function AnimationDemo({ onLeave }: { onLeave: () => void }) {
  const timeline = useAnimationTimeline('demo')
  const { current, speed, reducedMotion, replay, skip } = timeline
  const [lastIndex, setLastIndex] = useState(0)
  const [skipped, setSkipped] = useState(false)
  const [run, setRun] = useState(0)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const pathRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const targetRefs = useRef<(HTMLSpanElement | null)[]>([])
  const placedRef = useRef(false)
  const currentIndex = current ? DEMO_EVENTS.indexOf(current) : lastIndex

  useEffect(() => {
    replay(DEMO_EVENTS)
  }, [replay])

  useEffect(() => {
    if (current) setLastIndex(DEMO_EVENTS.indexOf(current))
  }, [current])

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const observer = new ResizeObserver(() => setLayoutVersion((value) => value + 1))
    observer.observe(path)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const path = pathRef.current
    const marker = markerRef.current
    const target = targetRefs.current[currentIndex]
    if (!path || !marker || !target) return

    // FLIP วัดตำแหน่งก่อนและปลายทางจริง แล้วใช้ transform เคลื่อนระหว่างสองจุด
    // จึงไม่ต้องเปลี่ยน top/left ระหว่างเล่นและไม่ทำให้ layout คำนวณใหม่ทุกเฟรม
    const start = marker.getBoundingClientRect()
    const end = target.getBoundingClientRect()
    const parent = path.getBoundingClientRect()
    const fromX = start.left - parent.left
    const fromY = start.top - parent.top
    const toX = end.left + end.width / 2 - parent.left - start.width / 2
    const toY = end.top + end.height / 2 - parent.top - start.height / 2
    const finalTransform = `translate(${toX}px, ${toY}px)`
    marker.style.transform = finalTransform

    if (!placedRef.current || skipped) {
      placedRef.current = true
      return
    }

    marker.style.willChange = reducedMotion ? 'opacity' : 'transform, opacity'
    const animation = marker.animate(
      reducedMotion
        ? [{ opacity: 0.45 }, { opacity: 1 }]
        : [
            { transform: `translate(${fromX}px, ${fromY}px)`, opacity: 0.75 },
            { transform: finalTransform, opacity: 1 },
          ],
      {
        duration: reducedMotion ? ANIMATION_TIMING.reducedMotion : ANIMATION_TIMING.demoTravel * speed,
        easing: ANIMATION_EASING.card,
        fill: 'both',
      },
    )
    animation.onfinish = () => {
      marker.style.willChange = ''
      animation.cancel()
    }
    return () => {
      const currentPosition = marker.getBoundingClientRect()
      animation.cancel()
      marker.style.transform = `translate(${currentPosition.left - parent.left}px, ${currentPosition.top - parent.top}px)`
      marker.style.willChange = ''
    }
  }, [currentIndex, layoutVersion, reducedMotion, run, skipped, speed])

  const restart = () => {
    setSkipped(false)
    setLastIndex(0)
    setRun((value) => value + 1)
    replay(DEMO_EVENTS)
  }
  const skipDemo = () => {
    setSkipped(true)
    setLastIndex(DEMO_EVENTS.length - 1)
    skip()
  }

  return (
    <main className="animation-demo">
      <div className="animation-demo__panel">
        <div className="animation-demo__heading">
          <div>
            <span className="animation-demo__eyebrow">CHIPMATE · ANIMATION LAB</span>
            <h1>เดโมคิวอนิเมชัน</h1>
            <p>ตัวอย่างลำดับหนึ่งมือแบบจำลอง ไม่ใช้เซิร์ฟเวอร์หรือชิปจริง</p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onLeave}>กลับหน้าหลัก</button>
        </div>

        <AnimationControls timeline={timeline} demo onSkip={skipDemo} />
        <div className="animation-demo__actions">
          <button type="button" className="btn btn--primary" onClick={restart}>เล่นซ้ำ</button>
          <button type="button" className="btn btn--ghost" onClick={() => timeline.setSpeed(ANIMATION_SPEED.slowDemo)}
            aria-pressed={speed === ANIMATION_SPEED.slowDemo}>ช้าลง 0.5x</button>
        </div>

        <div className="animation-demo__summary" aria-live="polite">
          <span>{current ? `กำลังเล่น: ${eventLabel(current)}` : skipped ? 'ข้ามไปยังสถานะสุดท้ายแล้ว' : 'จบลำดับตัวอย่างแล้ว'}</span>
          <strong>{currentIndex + 1} / {DEMO_EVENTS.length}</strong>
        </div>

        <div className="animation-demo__path" ref={pathRef}>
          <span className="animation-demo__marker" ref={markerRef} aria-hidden="true" />
          {DEMO_EVENTS.map((event, index) => (
            <div key={index} className={`animation-demo__step${index === currentIndex ? ' is-active' : ''}${index < currentIndex ? ' is-done' : ''}`}
              aria-current={index === currentIndex ? 'step' : undefined}>
              <span className="animation-demo__dot" ref={(node) => { targetRefs.current[index] = node }} />
              <span className="animation-demo__number">{String(index + 1).padStart(2, '0')}</span>
              <span>{eventLabel(event)}</span>
            </div>
          ))}
        </div>
        <p className="animation-demo__note">
          ขั้นนี้แสดงลำดับคิวและจังหวะเท่านั้น ภาพไพ่ ชิป และการจ่ายจริงจะเพิ่มในขั้นถัดไป
          {reducedMotion && ' · เปิดโหมดลดการเคลื่อนไหว'}
        </p>
      </div>
    </main>
  )
}
