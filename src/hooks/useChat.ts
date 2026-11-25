import { useCallback, useRef, useState } from 'react'

export interface ChatMessage {
  id: number
  kind: 'user' | 'system' | 'player'
  author: string
  avatar?: string
  text: string
  time: string
}

function stamp(): string {
  return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

let nextId = 1

export function useChat(initial: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial)
  const seeded = useRef(false)
  if (!seeded.current) {
    seeded.current = true
    nextId = initial.length + 1
  }

  const push = useCallback((message: Omit<ChatMessage, 'id' | 'time'>) => {
    setMessages((prev) => [...prev, { ...message, id: nextId++, time: stamp() }])
  }, [])

  const send = useCallback(
    (text: string, author: string, avatar?: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      push({ kind: 'user', author, avatar, text: trimmed })
    },
    [push],
  )

  const system = useCallback((text: string) => push({ kind: 'system', author: 'ระบบ', text }), [push])

  const player = useCallback(
    (author: string, avatar: string, text: string) => push({ kind: 'player', author, avatar, text }),
    [push],
  )

  return { messages, send, system, player }
}

export type Chat = ReturnType<typeof useChat>
