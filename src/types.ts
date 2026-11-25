/** Shared app-level types (not part of the game engine). */

export interface PlayerProfile {
  name: string
  avatar: string
}

export interface FriendSeed {
  name: string
  avatar: string
}

/** Everything the table screen needs to bootstrap a local game. */
export interface TableConfig {
  mode: 'bot' | 'online'
  roomCode: string
  smallBlind: number
  bigBlind: number
  profile: PlayerProfile
  /** Mock friends that "joined" from the lobby. Simulated by bots in this prototype. */
  friends: FriendSeed[]
  botCount: number
}

/** Lobby / waiting room draft. */
export interface RoomDraft {
  code: string
  smallBlind: number
  bigBlind: number
  maxPlayers: number
  profile: PlayerProfile
  friends: FriendSeed[]
}
