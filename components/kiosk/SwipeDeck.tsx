'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Dependency-free horizontal swipe deck.
 *
 * Why hand-rolled: on the kiosk's RK3568 / Mali-G52 we want a single
 * GPU-composited transform (translate3d) and to render only the slides
 * near the current index. No carousel library, no per-slide React churn.
 */
interface SwipeDeckProps<T> {
  items: T[]
  index: number
  onIndexChange: (i: number) => void
  renderItem: (item: T, i: number, active: boolean) => React.ReactNode
  keyFor: (item: T, i: number) => string
  /** How many slides to keep mounted on each side of the active one. */
  window?: number
  onInteract?: () => void
}

const SNAP_MS = 320

export default function SwipeDeck<T>({
  items,
  index,
  onIndexChange,
  renderItem,
  keyFor,
  window: win = 2,
  onInteract,
}: SwipeDeckProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)

  const drag = useRef<{ id: number; startX: number; startT: number } | null>(null)
  const last = items.length - 1

  // Measure the track so transforms are in real pixels.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep index in range if the item list shrinks.
  useEffect(() => {
    if (index > last) onIndexChange(Math.max(0, last))
  }, [index, last, onIndexChange])

  function onPointerDown(e: React.PointerEvent) {
    if (items.length <= 1) return
    drag.current = { id: e.pointerId, startX: e.clientX, startT: performance.now() }
    setDragging(true)
    onInteract?.()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    let delta = e.clientX - d.startX
    // Rubber-band resistance at the ends.
    if ((index === 0 && delta > 0) || (index === last && delta < 0)) delta *= 0.35
    setDx(delta)
  }

  function endDrag(e: React.PointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    const elapsed = performance.now() - d.startT
    const velocity = dx / Math.max(elapsed, 1) // px/ms
    const threshold = width * 0.18

    let next = index
    if (dx <= -threshold || velocity < -0.5) next = Math.min(last, index + 1)
    else if (dx >= threshold || velocity > 0.5) next = Math.max(0, index - 1)

    drag.current = null
    setDragging(false)
    setDx(0)
    if (next !== index) onIndexChange(next)
    onInteract?.()
  }

  function go(next: number) {
    const clamped = Math.max(0, Math.min(last, next))
    if (clamped !== index) onIndexChange(clamped)
    onInteract?.()
  }

  const offset = -index * width + dx

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(${offset}px,0,0)`,
            transition: dragging ? 'none' : `transform ${SNAP_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
          }}
        >
          {items.map((item, i) => {
            if (Math.abs(i - index) > win) return null
            return (
              <div
                key={keyFor(item, i)}
                className="absolute top-0 h-full w-full"
                style={{ left: `${i * 100}%` }}
              >
                {renderItem(item, i, i === index)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edge chevrons — large touch targets, fade at the ends */}
      <button
        type="button"
        aria-label="Previous"
        onClick={() => go(index - 1)}
        className={`absolute left-2 top-1/2 -translate-y-1/2 grid h-16 w-16 place-items-center rounded-full bg-black/35 text-white text-3xl backdrop-blur-sm transition-opacity ${index === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => go(index + 1)}
        className={`absolute right-2 top-1/2 -translate-y-1/2 grid h-16 w-16 place-items-center rounded-full bg-black/35 text-white text-3xl backdrop-blur-sm transition-opacity ${index === last ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        ›
      </button>

      {/* Position counter */}
      {items.length > 0 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  )
}
