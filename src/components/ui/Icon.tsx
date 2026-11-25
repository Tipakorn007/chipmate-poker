type IconName =
  | 'copy'
  | 'users'
  | 'chat'
  | 'link'
  | 'close'
  | 'send'
  | 'door'
  | 'plus'
  | 'minus'
  | 'check'
  | 'bot'
  | 'spark'

const PATHS: Record<IconName, string> = {
  copy: 'M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3 M9 9h9v11H9z',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 5.6a3 3 0 0 1 0 5.8 M17.4 14.4c2 .9 3.4 2.9 3.4 5.6',
  chat: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-5 4v-4.2A2.5 2.5 0 0 1 4 13.5z',
  link: 'M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 1 0-5.7-5.7l-1.3 1.3 M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 1 0 5.7 5.7l1.3-1.3',
  close: 'M6 6l12 12 M18 6L6 18',
  send: 'M4 12l16-7-5.5 15-3.2-6.2L4 12z',
  door: 'M10 4H5v16h5 M15 8l4 4-4 4 M9 12h10',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 13l4.5 4.5L19 7',
  bot: 'M4 9h16v10H4z M9 13.5h.01 M15 13.5h.01 M12 9V5 M8 5h8 M2.5 13v3 M21.5 13v3',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
}

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

export type { IconName }
