export class AnimationQueue<T> {
  private pending: T[] = []
  private controller: AbortController | null = null
  private generation = 0
  private running = false
  private disposed = false

  constructor(
    private readonly play: (event: T, signal: AbortSignal) => Promise<void>,
    private readonly onChange: (event: T | null, pending: number) => void,
    private readonly onError: (error: unknown) => void,
  ) {}

  enqueue(events: readonly T[]): void {
    if (this.disposed || events.length === 0) return
    this.pending.push(...events)
    if (!this.running) {
      this.running = true
      void this.drain(this.generation)
    } else {
      this.onChange(this.current, this.pending.length)
    }
  }

  private current: T | null = null

  // คิวเล่นเหตุการณ์ทีละรายการ รอรายการปัจจุบันจบก่อนเริ่มรายการถัดไป
  private async drain(generation: number): Promise<void> {
    while (!this.disposed && generation === this.generation && this.pending.length > 0) {
      const event = this.pending.shift()!
      const controller = new AbortController()
      this.controller = controller
      this.current = event
      this.onChange(event, this.pending.length)
      try {
        await this.play(event, controller.signal)
      } catch (error) {
        if (controller.signal.aborted || generation !== this.generation || this.disposed) return
        this.pending = []
        this.current = null
        this.controller = null
        this.running = false
        this.onChange(null, 0)
        this.onError(error)
        return
      }
      if (this.disposed || generation !== this.generation) return
      this.controller = null
      this.current = null
    }
    if (this.disposed || generation !== this.generation) return
    this.running = false
    this.onChange(null, 0)
  }

  skip(): void {
    if (this.disposed) return
    // เปลี่ยน generation เพื่อไม่ให้งานเก่าที่ถูกยกเลิกกลับมาเล่นทับคิวใหม่
    this.generation++
    this.pending = []
    this.controller?.abort()
    this.controller = null
    this.current = null
    this.running = false
    this.onChange(null, 0)
  }

  dispose(): void {
    this.disposed = true
    this.generation++
    this.pending = []
    this.controller?.abort()
    this.controller = null
    this.current = null
    this.running = false
  }
}

export function waitForAnimation(duration: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const timer = setTimeout(finish, duration)
    function finish() {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    signal.addEventListener('abort', finish, { once: true })
  })
}
