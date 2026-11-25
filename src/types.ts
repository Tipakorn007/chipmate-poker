/** Shared app-level types (not part of the game engine). */

export interface PlayerProfile {
  name: string
  avatar: string
}

/** Everything the table screen needs to display a game. */
export interface TableConfig {
  mode: 'bot' | 'online'
  roomCode: string
  smallBlind: number
  bigBlind: number
  profile: PlayerProfile
  botCount: number
}
