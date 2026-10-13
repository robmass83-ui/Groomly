import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Dialog({ open, title, onClose, fill = false, children }: { open: boolean; title: string; onClose: () => void; fill?: boolean; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div data-testid="dialog-backdrop" aria-hidden="true" onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(12,15,21,.45)' }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          position: 'relative',
          width: 'min(100%, 390px)',
          maxHeight: fill ? 'calc(100dvh - 32px)' : 'min(90dvh, calc(100dvh - 32px))',
          height: fill ? 'calc(100dvh - 32px)' : undefined,
          background: 'var(--card)',
          borderRadius: 18,
          boxShadow: 'var(--sh-3)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div
          style={fill
            ? { flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }
            : { display: 'flex', flexDirection: 'column', gap: 9, overflow: 'auto', minHeight: 0, padding: 3, margin: -3 }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
