import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import TableScreen from './screens/TableScreen'
import OnlineRoom, { type OnlineIntent } from './screens/OnlineRoom'
import ToastStack from './components/ui/ToastStack'
import { useToasts } from './hooks/useToasts'
import { makeRoomCode } from './lib/utils'
import type { PlayerProfile, TableConfig } from './types'

type Screen =
  | { name: 'home' }
  | { name: 'online'; intent: OnlineIntent }
  | { name: 'table'; config: TableConfig }

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>({ name: 'ผู้เล่นใหม่', avatar: '🦊' })
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [inviteCode, setInviteCode] = useState(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase())
  const { toasts, push } = useToasts()
  const displayName = profile.name.trim() || 'คุณ'

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen
          profile={profile}
          onProfileChange={setProfile}
          inviteCode={inviteCode}
          onJoinRoom={() => {
            if (inviteCode) setScreen({
              name: 'online',
              intent: { kind: 'join', code: inviteCode, profile: { ...profile, name: displayName } },
            })
          }}
          onPlayBot={(opts) =>
            setScreen({
              name: 'table',
              config: {
                mode: 'bot',
                roomCode: makeRoomCode(),
                smallBlind: opts.smallBlind,
                bigBlind: opts.bigBlind,
                profile: { ...profile, name: displayName },
                botCount: opts.botCount,
              },
            })
          }
          onCreateRoom={(opts) =>
            setScreen({
              name: 'online',
              intent: {
                kind: 'create',
                ...opts,
                profile: { ...profile, name: displayName },
              },
            })
          }
        />
      )}

      {screen.name === 'online' && (
        <OnlineRoom
          intent={screen.intent}
          notify={push}
          onLeave={() => {
            const url = new URL(window.location.href)
            url.searchParams.delete('room')
            window.history.replaceState(null, '', url)
            setInviteCode(undefined)
            setScreen({ name: 'home' })
          }}
        />
      )}

      {screen.name === 'table' && (
        <TableScreen
          config={screen.config}
          notify={push}
          onLeave={() => setScreen({ name: 'home' })}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  )
}
