import { Minus, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'

const tasto: CSSProperties = { width: 44, height: 44, display: 'grid', placeItems: 'center', border: 0, borderRadius: 12, background: 'var(--surf)', color: 'var(--tx)', cursor: 'pointer' }

export function Contatore({ etichetta, valore, onChange, min = 0, max = 9999 }: { etichetta: string; valore: number; onChange: (valore: number) => void; min?: number; max?: number }) {
  const frasi = useFrasi()
  return (
    <span role="group" aria-label={etichetta} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flex: 'none' }}>
      <button type="button" aria-label={frasi.magMeno} disabled={valore <= min} onClick={() => onChange(valore - 1)} style={{ ...tasto, opacity: valore <= min ? 0.5 : 1 }}>
        <Minus size={16} strokeWidth={2.2} aria-hidden />
      </button>
      <strong aria-live="polite" style={{ minWidth: 36, textAlign: 'center', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{valore}</strong>
      <button type="button" aria-label={frasi.magPiu} disabled={valore >= max} onClick={() => onChange(valore + 1)} style={{ ...tasto, background: 'var(--pri-s)', color: 'var(--pri)' }}>
        <Plus size={16} strokeWidth={2.2} aria-hidden />
      </button>
    </span>
  )
}
