import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button type="button" aria-label="Chiudi" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(12,15,21,.45)' }} />
      <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'relative', width: 'min(100%, 390px)', background: 'var(--card)', borderRadius: `${SIZES.sheet.radiusTop}px ${SIZES.sheet.radiusTop}px 0 0`, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ width: SIZES.sheet.grab.w, height: SIZES.sheet.grab.h, borderRadius: 999, background: 'var(--line)', alignSelf: 'center' }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
