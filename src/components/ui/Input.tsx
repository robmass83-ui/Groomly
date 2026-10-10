import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  error?: string
  size?: 'md' | 'lg'
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, id, size = 'md', icon, style, ...props },
  ref,
) {
  const inputId = id ?? label
  const tall = size === 'lg'
  return (
    <label htmlFor={inputId} style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap, margin: 0, fontSize: TYPE.base }}>
      <span style={{ fontSize: SIZES.field.label, fontWeight: 600, margin: 0, color: 'var(--tx2)' }}>{label}</span>
      <span style={{ position: 'relative', display: 'block' }}>
        {icon ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--tx3)',
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          {...props}
          style={{
            height: tall ? SIZES.field.hLg : SIZES.field.h,
            boxSizing: 'border-box',
            width: '100%',
            borderRadius: SIZES.field.radius,
            border: `1px solid ${error ? 'var(--bad)' : 'var(--line2)'}`,
            background: 'var(--card)',
            color: 'var(--tx)',
            padding: icon ? '0 10px 0 28px' : '0 10px',
            font: 'inherit',
            boxShadow: error ? '0 0 0 3px var(--bad-s)' : undefined,
            ...style,
          }}
        />
      </span>
      {error ? <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{error}</span> : null}
    </label>
  )
})
