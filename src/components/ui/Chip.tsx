import type { ReactNode } from 'react'
import { USER_TEXT } from '../../theme/text'
import { SIZES } from '../../theme/sizes'

const TONE = {
  neutral: { background: 'var(--surf2)', color: 'var(--tx2)' },
  ok: { background: 'var(--ok-s)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-s)', color: 'var(--warn)' },
  bad: { background: 'var(--bad-s)', color: 'var(--bad)' },
  sen: { background: 'var(--sen-s)', color: 'var(--sen)' },
  tea: { background: 'var(--tea-s)', color: 'var(--tea)' },
  pri: { background: 'var(--pri-s)', color: 'var(--pri)' },
  out: { background: 'transparent', color: 'var(--tx2)', border: '1px solid var(--line)' },
  sel: { background: 'var(--pri)', color: '#fff' },
} as const

export function Chip({
  children,
  tone = 'neutral',
  dashed,
  round,
  roomy,
}: {
  children: ReactNode
  tone?: keyof typeof TONE
  dashed?: boolean
  round?: boolean
  roomy?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: 'max-content',
        alignItems: 'center',
        gap: roomy ? 4 : 3,
        padding: roomy ? '6px 8px' : `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
        borderRadius: SIZES.chip.radius,
        fontSize: roomy ? 13 : SIZES.chip.font,
        fontWeight: roomy ? 700 : 600,
        minHeight: SIZES.serviceChip.h,
        height: 'auto',
        ...USER_TEXT,
        ...TONE[tone],
        ...(dashed ? { background: 'transparent', border: '1px dashed var(--line2)' } : {}),
        ...(round ? { borderRadius: SIZES.chip.radius } : {}),
      }}
    >
      {children}
    </span>
  )
}
