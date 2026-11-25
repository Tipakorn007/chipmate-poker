import { useMemo, useRef, useState } from 'react'
import Logo from '../components/ui/Logo'
import Icon from '../components/ui/Icon'
import { BOT_ROSTER } from '../data/mock'
import { buildInviteLink, copyText, formatChips } from '../lib/utils'
import type { FriendSeed, RoomDraft } from '../types'
import type { ToastTone } from '../hooks/useToasts'

interface LobbyScreenProps {
  room: RoomDraft
  onStart: (friends: FriendSeed[]) => void
  onLeave: () => void
  notify: (text: string, tone?: ToastTone) => void
}

interface Notice {
  id: number
  text: string
  tone: 'join' | 'leave' | 'info'
}

export default function LobbyScreen({ room, onStart, onLeave, notify }: LobbyScreenProps) {
  const [friends, setFriends] = useState<FriendSeed[]>(room.friends)
  const [notices, setNotices] = useState<Notice[]>([
    { id: 1, text: 'สร้างห้องแล้ว — แชร์ลิงก์เพื่อชวนเพื่อนเข้าห้อง', tone: 'info' },
  ])
  const noticeId = useRef(2)
  const inviteLink = useMemo(() => buildInviteLink(room.code), [room.code])

  const addNotice = (text: string, tone: Notice['tone']) => {
    setNotices((prev) => [...prev, { id: noticeId.current++, text, tone }])
  }

  const handleCopy = async () => {
    const ok = await copyText(inviteLink)
    notify(ok ? 'คัดลอกลิงก์เชิญแล้ว' : 'คัดลอกไม่สำเร็จ — เลือกลิงก์แล้วกด Ctrl+C', ok ? 'success' : 'warn')
  }

  const handleAddFriend = () => {
    if (friends.length + 1 >= room.maxPlayers) {
      notify('ที่นั่งเต็มแล้ว', 'warn')
      return
    }
    const used = new Set(friends.map((f) => f.name))
    const next = BOT_ROSTER.find((bot) => !used.has(bot.name)) ?? BOT_ROSTER[0]
    setFriends((prev) => [...prev, next])
    addNotice(`${next.name} เข้าร่วมห้อง`, 'join')
    notify(`${next.name} เข้าร่วมห้อง`, 'success')
  }

  const handleRemoveFriend = () => {
    if (friends.length === 0) return
    const last = friends[friends.length - 1]
    setFriends((prev) => prev.slice(0, -1))
    addNotice(`${last.name} ออกจากห้อง`, 'leave')
    notify(`${last.name} ออกจากห้อง`, 'info')
  }

  const seats = Array.from({ length: room.maxPlayers }, (_, index) => {
    if (index === 0) {
      return { kind: 'you' as const }
    }
    const friend = friends[index - 1]
    return friend ? { kind: 'friend' as const, friend } : { kind: 'empty' as const }
  })

  const canStart = friends.length >= 1

  return (
    <div className="lobby">
      <header className="lobby__nav">
        <Logo size={30} />
        <button className="btn btn--ghost btn--sm" onClick={onLeave}>
          <Icon name="door" size={16} /> ออกจากห้อง
        </button>
      </header>

      <main className="lobby__grid">
        <section className="panel lobby-card">
          <div className="lobby-card__top">
            <span className="badge badge--amber">ห้องส่วนตัว</span>
            <span className="badge badge--muted">
              เบลด {room.smallBlind}/{room.bigBlind}
            </span>
          </div>

          <div className="room-code">
            <span className="room-code__label">รหัสห้อง</span>
            <span className="room-code__value">{room.code}</span>
          </div>

          <div className="invite-box">
            <span className="field__label">ลิงก์เชิญเพื่อน</span>
            <div className="invite-box__row">
              <input
                className="input invite-box__input"
                readOnly
                value={inviteLink}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="btn btn--primary" onClick={handleCopy}>
                <Icon name="copy" size={16} /> คัดลอก
              </button>
            </div>
          </div>

          <div className="seat-slots">
            {seats.map((seat, index) => (
              <div
                key={index}
                className={`seat-slot ${seat.kind === 'empty' ? 'seat-slot--empty' : ''}`}
              >
                {seat.kind === 'you' && (
                  <>
                    <span className="seat-slot__avatar">{room.profile.avatar}</span>
                    <span className="seat-slot__name">{room.profile.name || 'คุณ'}</span>
                    <span className="seat-slot__tag">เจ้าของห้อง</span>
                  </>
                )}
                {seat.kind === 'friend' && (
                  <>
                    <span className="seat-slot__avatar">{seat.friend.avatar}</span>
                    <span className="seat-slot__name">{seat.friend.name}</span>
                    <span className="seat-slot__tag seat-slot__tag--muted">พร้อมเล่น</span>
                  </>
                )}
                {seat.kind === 'empty' && (
                  <>
                    <span className="seat-slot__avatar seat-slot__avatar--empty">
                      <Icon name="plus" size={16} />
                    </span>
                    <span className="seat-slot__name seat-slot__name--muted">รอผู้เล่น</span>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="lobby-card__controls">
            <button className="btn btn--ghost btn--sm" onClick={handleAddFriend}>
              <Icon name="plus" size={15} /> จำลองเพื่อนเข้าห้อง
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={handleRemoveFriend}
              disabled={friends.length === 0}
            >
              <Icon name="minus" size={15} /> จำลองเพื่อนออก
            </button>
          </div>

          <button
            className="btn btn--primary btn--block btn--lg"
            onClick={() => onStart(friends)}
            disabled={!canStart}
          >
            {canStart ? `เริ่มเกม (${friends.length + 1} คน)` : 'รอผู้เล่นอย่างน้อย 2 คน'}
          </button>

          <p className="demo-note">
            ต้นแบบ UI: ปุ่ม “จำลองเพื่อน” ใช้ทดสอบสถานะห้องและการแจ้งเตือน
            ยังไม่มีการเชื่อมต่อเซิร์ฟเวอร์จริง · ชิปเริ่มต้น {formatChips(room.bigBlind * 100)}
          </p>
        </section>

        <aside className="panel lobby-side">
          <h2 className="panel__title">
            <Icon name="spark" size={16} /> ความเคลื่อนไหวในห้อง
          </h2>
          <ul className="notice-list">
            {notices.map((notice) => (
              <li key={notice.id} className={`notice notice--${notice.tone}`}>
                <span className="notice__dot" />
                {notice.text}
              </li>
            ))}
          </ul>
          <p className="lobby-side__hint">
            เมื่อเชื่อมต่อระบบจริง รายการนี้จะแสดงผู้เล่นที่เข้าหรือออกจากห้องแบบเรียลไทม์
            พร้อมเสียงแจ้งเตือนและข้อความในแชต
          </p>
          <div className="lobby-side__status">
            <span className="waiting-dots">
              <i />
              <i />
              <i />
            </span>
            รอผู้เล่น {friends.length + 1}/{room.maxPlayers}
          </div>
        </aside>
      </main>
    </div>
  )
}
