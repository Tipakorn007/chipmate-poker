import { useState } from 'react'
import Logo from '../components/ui/Logo'
import Icon from '../components/ui/Icon'
import { AVATARS, BLIND_PRESETS } from '../data/mock'
import { formatChips } from '../lib/utils'
import type { PlayerProfile } from '../types'

interface HomeScreenProps {
  profile: PlayerProfile
  onProfileChange: (profile: PlayerProfile) => void
  onPlayBot: (opts: { botCount: number; smallBlind: number; bigBlind: number }) => void
  onCreateRoom: (opts: { smallBlind: number; bigBlind: number; maxPlayers: number }) => void
}

export default function HomeScreen({
  profile,
  onProfileChange,
  onPlayBot,
  onCreateRoom,
}: HomeScreenProps) {
  const [botCount, setBotCount] = useState(3)
  const [blindIndex, setBlindIndex] = useState(0)
  const [maxPlayers, setMaxPlayers] = useState(6)

  const blinds = BLIND_PRESETS[blindIndex]
  const startingChips = blinds.bigBlind * 100

  return (
    <div className="home">
      <header className="home__nav">
        <Logo size={32} />
        <div className="home__nav-right">
          <span className="badge badge--mint">ชิปสมมติ 100%</span>
          <span className="badge badge--muted">ไม่ใช้เงินจริง</span>
        </div>
      </header>

      <main className="home__hero">
        <div className="hero__copy">
          <span className="hero__eyebrow">CHIPMATE · TEXAS HOLD&rsquo;EM</span>
          <h1 className="hero__title">
            เปิดโต๊ะ
            <br />
            <em>แล้วเริ่มเล่นได้เลย</em>
          </h1>
          <p className="hero__sub">
            เล่นกับบอทหรือสร้างห้องส่วนตัว ชิปสมมติเท่านั้น ไม่ต้องเติมเงินหรือดาวน์โหลด
          </p>
          <ul className="hero__points">
            <li>
              <Icon name="users" size={16} /> ห้องส่วนตัวสูงสุด 6 ที่นั่ง
            </li>
            <li>
              <Icon name="chat" size={16} /> แชตในห้องและลิงก์เชิญในคลิกเดียว
            </li>
            <li>
              <Icon name="spark" size={16} /> ไพ่เปิดเฉพาะจังหวะ showdown
            </li>
          </ul>
        </div>

        <div className="hero__art" aria-hidden="true">
          <div className="mini-table">
            <div className="mini-table__felt">
              <span className="mini-seat mini-seat--a">🐯</span>
              <span className="mini-seat mini-seat--b">🐼</span>
              <span className="mini-seat mini-seat--c">🦉</span>
              <div className="mini-table__center">
                <div className="mini-cards">
                  <span className="mini-card mini-card--red">A♥</span>
                  <span className="mini-card">K♠</span>
                  <span className="mini-card mini-card--red">Q♦</span>
                </div>
                <span className="mini-pot">กองกลาง 1,240</span>
              </div>
              <div className="mini-hand">
                <span className="mini-card mini-card--red">A♦</span>
                <span className="mini-card">A♣</span>
              </div>
              <span className="mini-d-label">D</span>
            </div>
          </div>
        </div>
      </main>

      <section className="home__setup">
        <div className="profile">
          <span className="field__label">โปรไฟล์ผู้เล่น</span>
          <input
            className="input"
            value={profile.name}
            maxLength={16}
            onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
            placeholder="ใส่ชื่อเล่น"
          />
          <div className="avatar-picker">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                className={`avatar-option ${profile.avatar === avatar ? 'is-active' : ''}`}
                onClick={() => onProfileChange({ ...profile, avatar })}
                aria-label={`เลือกอวตาร ${avatar}`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        <div className="options">
          <article className="option-card">
            <div className="option-card__head">
              <span className="option-card__icon option-card__icon--mint">
                <Icon name="bot" size={22} />
              </span>
              <div>
                <h2>เล่นกับบอท</h2>
                <p>ซ้อมมือกับคู่แข่งที่เล่นคนละสไตล์ เริ่มได้ทันที</p>
              </div>
            </div>

            <div className="option-card__body">
              <div className="field">
                <span className="field__label">จำนวนบอท</span>
                <div className="segmented">
                  {[2, 3, 5].map((count) => (
                    <button
                      key={count}
                      className={`segmented__btn ${botCount === count ? 'is-active' : ''}`}
                      onClick={() => setBotCount(count)}
                    >
                      {count} คน
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field__label">ระดับเบลด</span>
                <div className="segmented">
                  {BLIND_PRESETS.map((preset, index) => (
                    <button
                      key={preset.label}
                      className={`segmented__btn ${blindIndex === index ? 'is-active' : ''}`}
                      onClick={() => setBlindIndex(index)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="option-card__foot">
              <span className="option-card__hint">ชิปเริ่มต้น {formatChips(startingChips)}</span>
              <button
                className="btn btn--primary"
                onClick={() =>
                  onPlayBot({
                    botCount,
                    smallBlind: blinds.smallBlind,
                    bigBlind: blinds.bigBlind,
                  })
                }
              >
                เริ่มโต๊ะ
              </button>
            </div>
          </article>

          <article className="option-card option-card--room">
            <div className="option-card__head">
              <span className="option-card__icon option-card__icon--amber">
                <Icon name="link" size={22} />
              </span>
              <div>
                <h2>สร้างห้องกับเพื่อน</h2>
                <p>เปิดห้องส่วนตัว แชร์ลิงก์ให้เพื่อนเข้าห้องได้ทันที</p>
              </div>
            </div>

            <div className="option-card__body">
              <div className="field">
                <span className="field__label">จำนวนที่นั่ง</span>
                <div className="segmented">
                  {[4, 6].map((count) => (
                    <button
                      key={count}
                      className={`segmented__btn ${maxPlayers === count ? 'is-active' : ''}`}
                      onClick={() => setMaxPlayers(count)}
                    >
                      {count} ที่นั่ง
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field__label">ระดับเบลด</span>
                <div className="segmented">
                  {BLIND_PRESETS.map((preset, index) => (
                    <button
                      key={preset.label}
                      className={`segmented__btn ${blindIndex === index ? 'is-active' : ''}`}
                      onClick={() => setBlindIndex(index)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="option-card__foot">
              <span className="option-card__hint">เจ้าของห้องกำหนดเบลดได้</span>
              <button
                className="btn btn--amber"
                onClick={() =>
                  onCreateRoom({
                    smallBlind: blinds.smallBlind,
                    bigBlind: blinds.bigBlind,
                    maxPlayers,
                  })
                }
              >
                สร้างห้อง
              </button>
            </div>
          </article>
        </div>
      </section>

      <footer className="home__note">
        <Icon name="spark" size={15} />
        Chipmate เป็นเกมเพื่อความบันเทิงเท่านั้น ชิปในเกมไม่มีมูลค่า ไม่มีการเติมเงินหรือถอนเงิน
      </footer>
    </div>
  )
}
