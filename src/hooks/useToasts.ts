import { useCallback, useRef, useState } from 'react'

export type ToastTone = 'info' | 'success' | 'warn'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(1)

  const push = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = counter.current++
    setToasts((prev) => [...prev, { id, text, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return { toasts, push }
}

export type Toasts = ReturnType<typeof useToasts>
