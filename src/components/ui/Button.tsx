import type { ButtonHTMLAttributes } from 'react'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }

export function Button({ variant = 'primary', style, children, type = 'button', ...props }: Props) {
  const primary = variant === 'primary'
  return (
    <button
      type={type}
      {...props}
      style={{
        height: SIZES.button.hLg,
        borderRadius: SIZES.button.radiusLg,
        border: primary ? 'none' : '1px solid var(--line)',
        background: primary ? 'var(--pri)' : 'transparent',
        color: primary ? '#fff' : 'var(--tx)',
        fontWeight: 600,
        fontSize: TYPE.base,
        padding: '0 12px',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
