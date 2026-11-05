import type { ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Tone = 'prim' | 'ok' | 'warn' | 'bad' | 'neutral'

const TONE: Record<Tone, { color: string; background: string }> = {
  prim: { color: 'var(--pri-ink)', background: 'var(--pri-s)' },
  ok: { color: 'var(--ok)', background: 'var(--ok-s)' },
  warn: { color: 'var(--warn)', background: 'var(--warn-s)' },
  bad: { color: 'var(--bad)', background: 'var(--bad-s)' },
  neutral: { color: 'var(--tx2)', background: 'var(--surf)' },
}

export function StatusPill({ tone, children, aCapo = false }: { tone: Tone; children: ReactNode; aCapo?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: aCapo ? 'auto' : SIZES.pill.h,
        minHeight: SIZES.pill.h,
        padding: `${aCapo ? 2 : 0}px ${SIZES.pill.padX}px`,
        gap: SIZES.serviceChip.gap,
        borderRadius: aCapo ? 12 : 999,
        fontSize: TYPE.chip,
        fontWeight: 700,
        whiteSpace: aCapo ? 'normal' : 'nowrap',
        ...TONE[tone],
      }}
    >
      <span aria-hidden style={{ width: SIZES.pill.dot, height: SIZES.pill.dot, borderRadius: 999, background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  )
}
