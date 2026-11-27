export const ANIMATION_TIMING = {
  liveEvent: 220,
  demoEvent: 800,
  demoTravel: 400,
  reducedMotion: 80,
  dealCard: 400,
  dealStagger: 220,
  holeCardFlip: 500,
  boardPause: 500,
  flopStagger: 150,
  flopFlip: 600,
  turnRiverFlip: 700,
  allInPause: 900,
  chipStagger: 50,
  collectStagger: 120,
  payout: 1400,
  payoutChipStagger: 60,
} as const

export const ANIMATION_EASING = {
  card: 'cubic-bezier(0.22, 1, 0.36, 1)',
  chip: 'cubic-bezier(0.45, 0, 0.2, 1)',
} as const

export const ANIMATION_SPEED = {
  relaxed: 1,
  fast: 0.6,
  slowDemo: 2,
} as const

export type AnimationSpeed = typeof ANIMATION_SPEED[keyof typeof ANIMATION_SPEED]
