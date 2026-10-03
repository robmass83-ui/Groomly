import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }

export function IconButton({ label, children, style, ...props }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      style={{
        width: SIZES.headerIconBtn,
        height: SIZES.headerIconBtn,
        borderRadius: SIZES.headerIconRadius,
        border: 'none',
        background: 'var(--surf)',
        color: 'var(--tx2)',
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
