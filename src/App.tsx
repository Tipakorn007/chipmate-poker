import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import JoinRoomScreen from './screens/JoinRoomScreen'
import TableScreen from './screens/TableScreen'
import AnimationDemo from './screens/AnimationDemo'
import OnlineRoom, { type OnlineIntent } from './screens/OnlineRoom'
import ToastStack from './components/ui/ToastStack'
import { useToasts } from './hooks/useToasts'
import { makeRoomCode } from './lib/utils'
import type { PlayerProfile, TableConfig } from './types'

type Screen =
  | { name: 'home' }
  | { name: 'join'; code: string }
  | { name: 'online'; intent: OnlineIntent }
  | { name: 'table'; config: TableConfig }
  | { name: 'demo' }

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>({ name: 'ผู้เล่นใหม่', avatar: '🦊' })
  const [screen, setScreen] = useState<Screen>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('demo')) return { name: 'demo' }
    const code = params.get('room')
    return code === null ? { name: 'home' } : { name: 'join', code: code.toUpperCase() }
  })
  const { toasts, push } = useToasts()
  const displayName = profile.name.trim() || 'คุณ'
  const goHome = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('room')
    url.searchParams.delete('demo')
    window.history.replaceState(null, '', url)
    setScreen({ name: 'home' })
  }

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen
          profile={profile}
          onProfileChange={setProfile}
          onJoinRoom={() => setScreen({ name: 'join', code: '' })}
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

      {screen.name === 'join' && (
        <JoinRoomScreen
          initialCode={screen.code}
          profile={profile}
          onProfileChange={setProfile}
          onBack={goHome}
          onJoin={(code) => setScreen({
            name: 'online',
            intent: { kind: 'join', code, profile: { ...profile, name: displayName } },
          })}
        />
      )}

      {screen.name === 'online' && (
        <OnlineRoom
          intent={screen.intent}
          notify={push}
          onLeave={goHome}
        />
      )}

      {screen.name === 'table' && (
        <TableScreen
          config={screen.config}
          notify={push}
          onLeave={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'demo' && <AnimationDemo onLeave={goHome} />}

      <ToastStack toasts={toasts} />
    </div>
  )
}
