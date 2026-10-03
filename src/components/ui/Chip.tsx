import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

const TONE = {
  neutral: { background: 'var(--surf2)', color: 'var(--tx2)' },
  ok: { background: 'var(--ok-s)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-s)', color: 'var(--warn)' },
} as const

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 'max-content',
        alignItems: 'center',
        gap: 3,
        padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
        borderRadius: SIZES.chip.radius,
        fontSize: SIZES.chip.font,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...TONE[tone],
      }}
    >
      {children}
    </span>
  )
}
