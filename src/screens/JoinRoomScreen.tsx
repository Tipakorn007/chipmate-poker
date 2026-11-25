import { useState, type FormEvent } from 'react'
import Logo from '../components/ui/Logo'
import ProfileFields from '../components/ui/ProfileFields'
import type { PlayerProfile } from '../types'

export default function JoinRoomScreen({
  initialCode,
  profile,
  onProfileChange,
  onJoin,
  onBack,
}: {
  initialCode: string
  profile: PlayerProfile
  onProfileChange: (profile: PlayerProfile) => void
  onJoin: (code: string) => void
  onBack: () => void
}) {
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) {
      setError('กรุณาใส่รหัสห้อง 8 ตัวตามที่เพื่อนส่งให้')
      return
    }
    onJoin(normalized)
  }

  return (
    <div className="lobby join-screen">
      <header className="lobby__nav">
        <Logo size={30} />
        <button className="btn btn--ghost btn--sm" onClick={onBack}>กลับหน้าหลัก</button>
      </header>
      <main className="panel lobby-card">
        <div>
          <span className="hero__eyebrow">CHIPMATE · PRIVATE ROOM</span>
          <h1 className="join-screen__title">เข้าห้องกับเพื่อน</h1>
          <p className="join-screen__intro">เลือกชื่อและอวตาร แล้วใช้รหัสห้องที่เพื่อนส่งมา</p>
        </div>
        <form className="join-screen__form" onSubmit={submit}>
          <div className="profile">
            <ProfileFields profile={profile} onProfileChange={onProfileChange} />
          </div>
          <label className="field" htmlFor="room-code">
            <span className="field__label">รหัสห้อง</span>
            <input
              id="room-code"
              className="input join-screen__code"
              value={code}
              onChange={(event) => { setCode(event.target.value.toUpperCase()); setError('') }}
              placeholder="ใส่รหัสห้อง 8 ตัว"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'room-code-error' : undefined}
            />
          </label>
          {error && <p id="room-code-error" className="join-screen__error" role="alert">{error}</p>}
          <button className="btn btn--primary btn--block btn--lg" type="submit">เข้าห้อง</button>
        </form>
      </main>
    </div>
  )
}
