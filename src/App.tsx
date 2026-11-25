import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import TableScreen from './screens/TableScreen'
import ToastStack from './components/ui/ToastStack'
import { useToasts, type ToastTone } from './hooks/useToasts'
import { makeRoomCode } from './lib/utils'
import type { FriendSeed, PlayerProfile, RoomDraft, TableConfig } from './types'

type Screen =
  | { name: 'home' }
  | { name: 'lobby'; room: RoomDraft }
  | { name: 'table'; config: TableConfig }

function LobbyRoute({
  room,
  notify,
  onBack,
  onStart,
}: {
  room: RoomDraft
  notify: (text: string, tone?: ToastTone) => void
  onBack: () => void
  onStart: (config: TableConfig) => void
}) {
  return (
    <LobbyScreen
      room={room}
      notify={notify}
      onLeave={onBack}
      onStart={(friends: FriendSeed[]) =>
        onStart({
          mode: 'online',
          roomCode: room.code,
          smallBlind: room.smallBlind,
          bigBlind: room.bigBlind,
          profile: room.profile,
          friends,
          botCount: 0,
        })
      }
    />
  )
}

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>({ name: 'ผู้เล่นใหม่', avatar: '🦊' })
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const { toasts, push } = useToasts()
  const displayName = profile.name.trim() || 'คุณ'

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen
          profile={profile}
          onProfileChange={setProfile}
          onPlayBot={(opts) =>
            setScreen({
              name: 'table',
              config: {
                mode: 'bot',
                roomCode: makeRoomCode(),
                smallBlind: opts.smallBlind,
                bigBlind: opts.bigBlind,
                profile: { ...profile, name: displayName },
                friends: [],
                botCount: opts.botCount,
              },
            })
          }
          onCreateRoom={(opts) =>
            setScreen({
              name: 'lobby',
              room: {
                code: makeRoomCode(),
                smallBlind: opts.smallBlind,
                bigBlind: opts.bigBlind,
                maxPlayers: opts.maxPlayers,
                profile: { ...profile, name: displayName },
                friends: [],
              },
            })
          }
        />
      )}

      {screen.name === 'lobby' && (
        <LobbyRoute
          room={screen.room}
          notify={push}
          onBack={() => setScreen({ name: 'home' })}
          onStart={(config) => setScreen({ name: 'table', config })}
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
