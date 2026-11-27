import { ANIMATION_LABELS } from '../../animation/events'
import { ANIMATION_SPEED } from '../../animation/constants'
import type { AnimationTimeline } from '../../animation/useAnimationTimeline'

export default function AnimationControls({ timeline, demo = false, onSkip }: {
  timeline: AnimationTimeline
  demo?: boolean
  onSkip?: () => void
}) {
  const { speed, setSpeed, current, pending, error, skip } = timeline
  return (
    <div className={`animation-controls${demo ? ' animation-controls--demo' : ''}`}>
      <label className="animation-controls__speed">
        <span>จังหวะภาพ</span>
        <select aria-label="ความเร็วอนิเมชัน" value={speed} onChange={(event) => {
          const value = Number(event.currentTarget.value)
          const selected = Object.values(ANIMATION_SPEED).find((option) => option === value)
          if (selected === undefined) throw new Error('ความเร็วอนิเมชันไม่ถูกต้อง')
          setSpeed(selected)
        }}>
          <option value={ANIMATION_SPEED.relaxed}>ผ่อนคลาย 1.0</option>
          <option value={ANIMATION_SPEED.fast}>เร็ว 0.6</option>
          {demo && <option value={ANIMATION_SPEED.slowDemo}>ช้า 0.5x</option>}
        </select>
      </label>
      <button type="button" className="animation-controls__skip" onClick={onSkip ?? skip} disabled={!current && !pending}>
        ข้ามอนิเมชัน
      </button>
      {current && <span className="animation-controls__status">คิวภาพ: {ANIMATION_LABELS[current.kind]}{pending > 0 ? ` · รอ ${pending}` : ''}</span>}
      {error && <span className="animation-controls__error" role="alert">{error}</span>}
    </div>
  )
}
