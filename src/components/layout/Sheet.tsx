import { X } from 'lucide-react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { SWIPE_CLOSE_PX } from '../../lib/sheetRoute'
import { SIZES } from '../../theme/sizes'

export function Sheet({ open, title, onClose, closeButton = false, closeLabel = 'Chiudi', children }: { open: boolean; title: string; onClose: () => void; closeButton?: boolean; closeLabel?: string; children: ReactNode }) {
  const [drag, setDrag] = useState(0)
  const startY = useRef<number | null>(null)

  if (!open) return null

  function grab(event: PointerEvent<HTMLDivElement>) {
    startY.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return
    setDrag(Math.max(0, event.clientY - startY.current))
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return
    const distance = event.clientY - startY.current
    startY.current = null
    setDrag(0)
    if (distance >= SWIPE_CLOSE_PX) onClose()
  }

  function cancel() {
    startY.current = null
    setDrag(0)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {closeButton ? (
        <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,15,21,.45)' }} />
      ) : (
        <button type="button" aria-label={closeLabel} onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(12,15,21,.45)' }} />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          width: 'min(100%, 390px)',
          maxHeight: '94dvh',
          background: 'var(--card)',
          borderRadius: `${SIZES.sheet.radiusTop}px ${SIZES.sheet.radiusTop}px 0 0`,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          transform: drag > 0 ? `translateY(${drag}px)` : undefined,
          transition: drag > 0 ? 'none' : 'transform 160ms ease-out',
        }}
      >
        <div
          data-testid="sheet-grabber"
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={cancel}
          style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 6px', margin: '-4px 0 -6px', touchAction: 'none' }}
        >
          <span style={{ width: SIZES.sheet.grab.w, height: SIZES.sheet.grab.h, borderRadius: 999, background: 'var(--line)' }} />
        </div>
        {closeButton ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
              style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
            >
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
