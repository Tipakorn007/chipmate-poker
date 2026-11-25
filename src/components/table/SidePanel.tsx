import type { Chat } from '../../hooks/useChat'
import type { PokerGame } from '../../hooks/usePokerGame'
import type { TableConfig } from '../../types'
import type { ToastTone } from '../../hooks/useToasts'
import Icon from '../ui/Icon'
import ChatPanel from './ChatPanel'
import PlayerList from './PlayerList'
import RoomPanel from './RoomPanel'

export type PanelTab = 'players' | 'chat' | 'room'

interface SidePanelProps {
  game: PokerGame
  config: TableConfig
  chat: Chat
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  open: boolean
  onClose: () => void
  inviteLink: string
  onCopyInvite: () => void
  onLeave: () => void
  onSendChat: (text: string) => void
  notify: (text: string, tone?: ToastTone) => void
}

export default function SidePanel({
  game,
  config,
  chat,
  tab,
  onTabChange,
  open,
  onClose,
  inviteLink,
  onCopyInvite,
  onLeave,
  onSendChat,
  notify,
}: SidePanelProps) {
  return (
    <>
      {open && <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="แผงข้อมูลห้อง">
        <div className="sidebar__tabs">
          <button
            className={`tab ${tab === 'players' ? 'is-active' : ''}`}
            onClick={() => onTabChange('players')}
          >
            <Icon name="users" size={15} /> ผู้เล่น
            <span className="tab__count">{game.state.players.length}</span>
          </button>
          <button
            className={`tab ${tab === 'chat' ? 'is-active' : ''}`}
            onClick={() => onTabChange('chat')}
          >
            <Icon name="chat" size={15} /> แชต
          </button>
          <button
            className={`tab ${tab === 'room' ? 'is-active' : ''}`}
            onClick={() => onTabChange('room')}
          >
            <Icon name="link" size={15} /> ห้อง
          </button>
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="ปิดแผง">
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="sidebar__body">
          {tab === 'players' && <PlayerList state={game.state} />}
          {tab === 'chat' && (
            <ChatPanel
              chat={chat}
              onSend={onSendChat}
              youName={config.profile.name}
              youAvatar={config.profile.avatar}
            />
          )}
          {tab === 'room' && (
            <RoomPanel
              config={config}
              inviteLink={inviteLink}
              onCopyInvite={onCopyInvite}
              onLeave={onLeave}
              playerCount={game.state.players.length}
              notify={notify}
            />
          )}
        </div>
      </aside>
    </>
  )
}
