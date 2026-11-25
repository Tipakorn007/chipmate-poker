import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card } from '../game/cards'
import { chooseBotMove } from '../game/bot'
import type { GameState, Move, PlayerSeed } from '../game/engine'
import { applyMove, createGame, getLegalActions, startHand, totalPot } from '../game/engine'
import { evaluateHand, holeLabel } from '../game/handEval'
import type { PlayerProfile } from '../types'
import { BOT_ROSTER } from '../data/mock'

export interface UsePokerGameArgs {
  profile: PlayerProfile
  botCount: number
  smallBlind: number
  bigBlind: number
}

function buildSeeds(args: UsePokerGameArgs): PlayerSeed[] {
  const startingChips = args.bigBlind * 100
  const you: PlayerSeed = {
    id: 'you',
    name: args.profile.name || 'คุณ',
    avatar: args.profile.avatar,
    chips: startingChips,
    isYou: true,
    isBot: false,
  }

  const bots = BOT_ROSTER.slice(0, Math.max(1, Math.min(args.botCount, BOT_ROSTER.length)))
  return [
    you,
    ...bots.map((bot, i) => ({
      id: `bot-${i}`,
      name: bot.name,
      avatar: bot.avatar,
      chips: startingChips,
      isYou: false,
      isBot: true,
    })),
  ]
}

export function usePokerGame(args: UsePokerGameArgs) {
  const [state, setState] = useState<GameState>(() =>
    createGame({
      seeds: buildSeeds(args),
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
    }),
  )

  const youIndex = useMemo(() => state.players.findIndex((p) => p.isYou), [state.players])
  const you = youIndex >= 0 ? state.players[youIndex] : undefined
  const currentActor = state.players[state.turn]
  const pot = totalPot(state)
  const legal = youIndex >= 0 ? getLegalActions(state, youIndex) : null
  const isYourTurn = state.phase === 'playing' && youIndex >= 0 && state.turn === youIndex

  const yourHand = useMemo(() => {
    if (!you || you.cards.length < 2) return null
    if (state.community.length >= 3) {
      return evaluateHand([...you.cards, ...state.community])
    }
    return null
  }, [you, state.community])

  const yourHandLabel = useMemo(() => {
    if (!you || you.cards.length < 2) return ''
    if (yourHand) return yourHand.text
    return holeLabel(you.cards)
  }, [you, yourHand])

  const act = useCallback((move: Move) => {
    setState((prev) => {
      const index = prev.players.findIndex((p) => p.isYou)
      if (index < 0 || prev.turn !== index) return prev
      return applyMove(prev, index, move)
    })
  }, [])

  const nextHand = useCallback(() => {
    setState((prev) => startHand(prev))
  }, [])

  const rebuy = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.isYou && p.chips === 0 ? { ...p, chips: prev.startingChips } : p,
      ),
    }))
  }, [])

  // Drive bot turns with a human-ish delay.
  useEffect(() => {
    if (state.phase !== 'playing') return
    const actor = state.players[state.turn]
    if (!actor || !actor.isBot) return
    const delay = 650 + Math.random() * 900
    const timer = window.setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== 'playing') return prev
        const current = prev.players[prev.turn]
        if (!current || !current.isBot) return prev
        return applyMove(prev, prev.turn, chooseBotMove(prev, prev.turn))
      })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [state.phase, state.turn, state.actionCount, state.players])

  return {
    state,
    you,
    youIndex,
    currentActor,
    pot,
    legal,
    isYourTurn,
    yourHand,
    yourHandLabel,
    act,
    nextHand,
    rebuy,
  }
}

export type PokerGame = ReturnType<typeof usePokerGame>
export type { Card }
