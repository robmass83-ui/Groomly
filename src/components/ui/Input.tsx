import { forwardRef, type InputHTMLAttributes } from 'react'
import { TYPE } from '../../theme/theme'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, error, id, ...props }, ref) {
  const inputId = id ?? label
  return (
    <label htmlFor={inputId} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        {...props}
        style={{
          height: 34,
          borderRadius: 9,
          border: `1px solid ${error ? 'var(--bad)' : 'var(--line)'}`,
          background: 'var(--card)',
          color: 'var(--tx)',
          padding: '0 10px',
          font: 'inherit',
        }}
      />
      {error ? <span style={{ color: 'var(--bad)', fontSize: TYPE.meta }}>{error}</span> : null}
    </label>
  )
})
