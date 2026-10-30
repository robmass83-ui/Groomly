import type { ButtonHTMLAttributes } from 'react'
import { USER_TEXT } from '../../theme/text'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { ZampeMini } from './Zampette'

type Variant = 'primary' | 'tonal' | 'ok' | 'bad' | 'ghost' | 'secondary'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const HEIGHT = {
  sm: SIZES.button.h,
  md: SIZES.button.hMd,
  lg: SIZES.button.hLg,
} as const

const RADIUS = {
  sm: SIZES.button.radius,
  md: SIZES.button.radiusMd,
  lg: SIZES.button.radiusLg,
} as const

const VARIANT: Record<Variant, { background: string; color: string; border: string; boxShadow: string }> = {
  primary: {
    background: 'var(--pri-solid)',
    color: 'var(--on-pri)',
    border: 'none',
    boxShadow: 'var(--sh-btn)',
  },
  tonal: {
    background: 'var(--pri-s)',
    color: 'var(--pri-ink)',
    border: 'none',
    boxShadow: 'none',
  },
  ok: {
    background: 'var(--ok-s)',
    color: 'var(--ok)',
    border: 'none',
    boxShadow: 'none',
  },
  bad: {
    background: 'var(--bad-s)',
    color: 'var(--bad)',
    border: 'none',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--tx2)',
    border: 'none',
    boxShadow: 'none',
  },
  secondary: {
    background: 'var(--card)',
    color: 'var(--tx)',
    border: '1px solid var(--line2)',
    boxShadow: 'var(--sh-1)',
  },
}

export function Button({
  variant = 'primary',
  size = 'lg',
  style,
  children,
  type = 'button',
  ...props
}: Props) {
  // occupato: tre zampette camminano accanto alla scritta e il bottone resta pieno invece di sbiadire
  const busy = props['aria-busy'] === true || props['aria-busy'] === 'true'
  return (
    <button
      type={type}
      {...props}
      style={{
        minHeight: HEIGHT[size],
        height: 'auto',
        boxSizing: 'border-box',
        borderRadius: RADIUS[size],
        fontWeight: 600,
        fontSize: TYPE.base,
        fontFamily: 'inherit',
        lineHeight: 1.25,
        padding: '8px 12px',
        cursor: 'pointer',
        ...USER_TEXT,
        ...VARIANT[variant],
        ...style,
      }}
    >
      {busy ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
          {children}
          <ZampeMini />
        </span>
      ) : children}
    </button>
  )
}
