import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { USER_TEXT } from '../../theme/text'
import { SIZES } from '../../theme/sizes'

export function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: SIZES.filterChip.h,
        height: 'auto',
        maxWidth: '100%',
        padding: `8px ${SIZES.filterChip.padX}px`,
        ...USER_TEXT,
        gap: SIZES.serviceChip.gap,
        fontSize: SIZES.filterChip.font,
        borderRadius: 999,
        border: pressed ? '1px solid var(--pri)' : '1px solid var(--line2)',
        background: pressed ? 'var(--pri-s)' : 'var(--card)',
        color: pressed ? 'var(--pri-ink)' : 'var(--tx2)',
        boxShadow: pressed ? '0 0 0 3px var(--focus)' : 'var(--sh-1)',
      }}
    >
      {pressed ? <Check size={13} aria-hidden /> : null}
      {children}
    </button>
  )
}
