import Logo from '../ui/Logo'
import Icon from '../ui/Icon'
import type { GameState } from '../../game/engine'
import { STREET_LABEL } from '../../game/engine'
import type { TableConfig } from '../../types'

interface TableHeaderProps {
  config: TableConfig
  state: GameState
  onCopyInvite: () => void
  onLeave: () => void
  onOpenPanel: (panel: 'players' | 'chat' | 'room') => void
  waitingCount?: number
}

export default function TableHeader({
  config,
  state,
  onCopyInvite,
  onLeave,
  onOpenPanel,
  waitingCount = 0,
}: TableHeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <Logo size={26} compact />
        <div className="room-chip">
          <span className="room-chip__label">ห้อง</span>
          <span className="room-chip__code">{config.roomCode}</span>
          {config.mode === 'online' && (
            <button className="icon-btn" onClick={onCopyInvite} aria-label="คัดลอกลิงก์เชิญ">
              <Icon name="copy" size={15} />
            </button>
          )}
        </div>
        {config.mode === 'online' && <span className="badge badge--muted">ออนไลน์</span>}
        {waitingCount > 0 && <span className="badge badge--amber">รอมือถัดไป {waitingCount} คน</span>}
      </div>

      <div className="topbar__right">
        <span className="badge">
          Blind {config.smallBlind}/{config.bigBlind}
        </span>
        <span className="badge">มือ #{state.handNumber}</span>
        <span className="badge badge--mint">{STREET_LABEL[state.street]}</span>

        <div className="topbar__tools">
          <button className="icon-btn" onClick={() => onOpenPanel('players')} aria-label="รายชื่อผู้เล่น">
            <Icon name="users" size={17} />
          </button>
          <button className="icon-btn" onClick={() => onOpenPanel('chat')} aria-label="แชต">
            <Icon name="chat" size={17} />
          </button>
          <button className="icon-btn" onClick={() => onOpenPanel('room')} aria-label="ห้องและลิงก์เชิญ">
            <Icon name="link" size={17} />
          </button>
        </div>

        <button className="btn btn--ghost btn--sm topbar__leave" onClick={onLeave}>
          <Icon name="door" size={15} /> ออก
        </button>
      </div>
    </header>
  )
}
