import { Check } from 'lucide-react'

export function SceltaLista<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 12,
              border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
              background: selected ? 'var(--pri-s)' : 'var(--surf)',
              color: 'var(--tx)',
              font: 'inherit',
              fontWeight: 650,
              padding: '0 12px',
              textAlign: 'left',
            }}
          >
            <span style={{ flex: 1 }}>{option.label}</span>
            {selected ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
          </button>
        )
      })}
    </div>
  )
}
