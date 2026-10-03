import { Search } from 'lucide-react'
import { SIZES } from '../../theme/sizes'

export function SearchBar({ placeholder = 'Cerca nome, proprietario, razza', onClick }: { placeholder?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerca"
      style={{
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
        textAlign: 'left',
      }}
    >
      <Search size={14} strokeWidth={2} aria-hidden />
      <span>{placeholder}</span>
    </button>
  )
}
