export function formatChips(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

export function formatTime(date = new Date()): string {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

export function makeRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function buildInviteLink(code: string): string {
  if (typeof window === 'undefined') return `?room=${code}`
  return `${window.location.origin}${window.location.pathname}?room=${code}`
}

/** Clipboard with a legacy fallback for non-secure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to execCommand */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
