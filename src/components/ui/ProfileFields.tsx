import { AVATARS } from '../../data/mock'
import type { PlayerProfile } from '../../types'

export default function ProfileFields({
  profile,
  onProfileChange,
}: {
  profile: PlayerProfile
  onProfileChange: (profile: PlayerProfile) => void
}) {
  return (
    <>
      <label className="field__label" htmlFor="player-name">โปรไฟล์ผู้เล่น</label>
      <input
        id="player-name"
        className="input"
        value={profile.name}
        maxLength={16}
        onChange={(event) => onProfileChange({ ...profile, name: event.target.value })}
        placeholder="ใส่ชื่อเล่น"
      />
      <div className="avatar-picker">
        {AVATARS.map((avatar) => (
          <button
            type="button"
            key={avatar}
            className={`avatar-option ${profile.avatar === avatar ? 'is-active' : ''}`}
            onClick={() => onProfileChange({ ...profile, avatar })}
            aria-label={`เลือกอวตาร ${avatar}`}
          >
            {avatar}
          </button>
        ))}
      </div>
    </>
  )
}
