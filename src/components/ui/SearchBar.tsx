import type { Ref } from 'react'
import { Search } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'

const barStyle = {
  height: SIZES.search.h,
  borderRadius: SIZES.search.radius,
  border: '1px solid var(--line)',
  background: 'var(--surf)',
  color: 'var(--tx3)',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  width: '100%',
  padding: '0 10px',
  font: 'inherit',
  textAlign: 'left' as const,
}

export function SearchBar({
  placeholder,
  onClick,
  mode = 'button',
  value,
  onChange,
  inputRef,
}: {
  placeholder?: string
  onClick?: () => void
  mode?: 'button' | 'input'
  value?: string
  onChange?: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}) {
  const frasi = useFrasi()
  const testo = placeholder ?? frasi.cercaPlaceholder
  if (mode === 'input') {
    return (
      <div style={barStyle}>
        <Search size={14} strokeWidth={2} aria-hidden />
        <input
          ref={inputRef}
          aria-label={frasi.caniCerca}
          placeholder={testo}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: 'var(--tx)', font: 'inherit', padding: 0 }}
        />
      </div>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={frasi.caniCerca} style={barStyle}>
      <Search size={14} strokeWidth={2} aria-hidden />
      <span>{testo}</span>
    </button>
  )
}
