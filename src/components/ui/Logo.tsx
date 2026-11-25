export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="2.5 4"
        opacity="0.6"
      />
      <path
        d="M13.5 27.5c3.2 0 4.7-2.4 6.4-2.4 1.7 0 2.1 2.4 3.9 2.4 1.8 0 2.4-2.4 4.1-2.4 1.7 0 3.1 2.4 6.1 2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="24" cy="16.5" r="2.3" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ size = 30, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="logo">
      <span className="logo__mark">
        <LogoMark size={size} />
      </span>
      {!compact && (
        <span className="logo__word">
          Chip<span className="logo__accent">mate</span>
        </span>
      )}
    </span>
  )
}
