import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Option<T extends string> = { value: T; label: string }

export function Segmented<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            style={{
              border: 0,
              borderRadius: 6,
              background: selected ? 'var(--card)' : 'transparent',
              color: selected ? 'var(--tx)' : 'var(--tx2)',
              fontWeight: 600,
              fontSize: TYPE.rowSub,
              padding: '4px 10px',
              minHeight: SIZES.button.h,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
