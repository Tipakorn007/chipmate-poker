import Icon from '../ui/Icon'
import ShareInviteButton from '../ui/ShareInviteButton'
import type { TableConfig } from '../../types'
import type { ToastTone } from '../../hooks/useToasts'

interface RoomPanelProps {
  config: TableConfig
  inviteLink: string
  onCopyInvite: () => void
  onLeave: () => void
  playerCount: number
  notify: (text: string, tone?: ToastTone) => void
}

export default function RoomPanel({
  config,
  inviteLink,
  onCopyInvite,
  onLeave,
  playerCount,
  notify,
}: RoomPanelProps) {
  return (
    <div className="room-panel">
      <div className="room-panel__code">
        <span className="room-code__label">รหัสห้อง</span>
        <span className="room-code__value">{config.roomCode}</span>
      </div>

      {config.mode === 'online' && (
        <div className="invite-box">
          <span className="field__label">ลิงก์เชิญเพื่อน</span>
          <input
            className="input invite-box__input"
            readOnly
            value={inviteLink}
            onFocus={(e) => e.currentTarget.select()}
          />
          <button className="btn btn--primary btn--block" onClick={onCopyInvite}>
            <Icon name="copy" size={16} /> คัดลอกลิงก์เชิญ
          </button>
          <ShareInviteButton inviteLink={inviteLink} notify={notify} />
        </div>
      )}

      <dl className="room-facts">
        <div>
          <dt>โหมด</dt>
          <dd>{config.mode === 'bot' ? 'เล่นกับบอท' : 'ห้องส่วนตัว'}</dd>
        </div>
        <div>
          <dt>เบลด</dt>
          <dd>
            {config.smallBlind} / {config.bigBlind}
          </dd>
        </div>
        <div>
          <dt>ผู้เล่น</dt>
          <dd>{playerCount} คน</dd>
        </div>
      </dl>

      <p className="demo-note">
        {config.mode === 'online'
          ? 'เพื่อนที่เข้าระหว่างมือจะรอเล่นในมือถัดไป'
          : 'โหมดฝึกซ้อมเล่นกับบอทในเบราว์เซอร์นี้'}
      </p>

      <button className="btn btn--ghost btn--block" onClick={onLeave}>
        <Icon name="door" size={16} /> ออกจากห้อง
      </button>
    </div>
  )
}
