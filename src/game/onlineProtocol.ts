import type { GameState, Move } from './engine'

export interface OnlinePlayer {
  id: string
  name: string
  avatar: string
  connected: boolean
  waiting: boolean
  chips: number | null
}

export interface OnlineMessage {
  id: number
  playerId: string
  name: string
  avatar: string
  text: string
  time: string
}

export interface RoomSnapshot {
  code: string
  hostId: string
  playerId: string
  maxPlayers: number
  smallBlind: number
  bigBlind: number
  players: OnlinePlayer[]
  game: GameState | null
  messages: OnlineMessage[]
}

export type ClientMessage =
  | { type: 'create'; name: string; avatar: string; smallBlind: number; bigBlind: number; maxPlayers: number }
  | { type: 'join'; code: string; name: string; avatar: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'rebuy' }
  | { type: 'move'; move: Move }
  | { type: 'chat'; text: string }
  | { type: 'leave' }

export type ServerMessage =
  | { type: 'session'; code: string; token: string }
  | { type: 'snapshot'; room: RoomSnapshot }
  | { type: 'error'; message: string; fatal?: boolean }
