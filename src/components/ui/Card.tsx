import type { HTMLAttributes, ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

export function Card({ children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...props} style={{ background: 'var(--card)', border: `${SIZES.card.border}px solid var(--line)`, borderRadius: SIZES.card.radius, boxShadow: 'var(--sh-2)', overflow: 'hidden', ...props.style }}>
      {children}
    </div>
  )
}

export function Row({ children, pressed, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; pressed?: boolean }) {
  return (
    <div {...props} aria-pressed={pressed} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, minHeight: SIZES.row.minH, borderTop: `${SIZES.card.border}px solid var(--line)`, ...props.style }}>
      {children}
    </div>
  )
}
