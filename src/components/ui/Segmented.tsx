import { USER_TEXT } from '../../theme/text'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

type Option<T extends string> = { value: T; label: string; badge?: number }

export function Segmented<T extends string>({ label, value, onChange, options, fill = false, solid = false }: {
  label: string
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  fill?: boolean
  solid?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: fill ? 'flex' : 'inline-flex', background: 'var(--surf2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.badge ? `${option.label}, ${option.badge} da fissare` : undefined}
            onClick={() => onChange(option.value)}
            style={{
              flex: fill ? 1 : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              border: 0,
              borderRadius: 6,
              background: selected ? (solid ? 'var(--pri-solid)' : 'var(--surf3)') : 'transparent',
              color: selected ? (solid ? 'var(--on-pri)' : 'var(--tx)') : 'var(--tx2)',
              boxShadow: selected ? (solid ? 'var(--sh-btn)' : 'var(--sh-1), 0 0 0 1px var(--line)') : undefined,
              fontWeight: 600,
              fontSize: TYPE.rowSub,
              fontFamily: 'inherit',
              lineHeight: 1.25,
              padding: fill ? '8px 6px' : '8px 12px',
              minHeight: SIZES.button.h,
              height: 'auto',
              ...USER_TEXT,
            }}
          >
            <span>{option.label}</span>
            {option.badge ? (
              <span
                aria-hidden
                style={{
                  minWidth: 18,
                  minHeight: 18,
                  height: 'auto',
                  padding: '0 5px',
                  borderRadius: 999,
                  background: 'var(--warn-s)',
                  color: 'var(--warn)',
                  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--warn) 40%, transparent)',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: '18px',
                  textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                  flex: 'none',
                }}
              >
                {option.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
