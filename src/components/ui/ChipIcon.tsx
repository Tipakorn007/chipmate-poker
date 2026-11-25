export default function ChipIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      className="chip-icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="10" cy="10" r="8.4" fill="currentColor" opacity="0.18" />
      <circle
        cx="10"
        cy="10"
        r="8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeDasharray="2.4 3.2"
      />
      <circle cx="10" cy="10" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.75" />
    </svg>
  )
}
