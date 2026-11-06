import type { CSSProperties } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { euro } from '../../i18n/format'
import type { Riepilogo as DatiRiepilogo } from '../../lib/stimeMagazzino'
import { TYPE } from '../../theme/theme'
import { SegnoPlus } from '../piano/SegnoPlus'
import { Card } from '../ui/Card'

const voce: CSSProperties = { flex: '1 1 0', minWidth: 90, display: 'flex', flexDirection: 'column', gap: 2 }

export function Riepilogo({ dati }: { dati: DatiRiepilogo }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const numeri = [
    { etichetta: frasi.magValore, valore: euro(lingua, dati.valore) },
    { etichetta: frasi.magSpesaMese, valore: euro(lingua, dati.spesaMese) },
    ...(dati.incidenza === null ? [] : [{ etichetta: frasi.magIncidenza, valore: new Intl.NumberFormat(lingua, { style: 'percent', maximumFractionDigits: 1 }).format(dati.incidenza) }]),
  ]
  return (
    <Card aria-label={frasi.magRiepilogo}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 12 }}>
        {numeri.map((numero) => (
          <div key={numero.etichetta} style={voce}>
            <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{numero.etichetta}</small>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{numero.valore}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RiepilogoBloccato({ onApri }: { onApri: () => void }) {
  const frasi = useFrasi()
  return (
    <button type="button" onClick={onApri} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 14, background: 'var(--card)', color: 'var(--tx)', font: 'inherit', fontWeight: 650, cursor: 'pointer' }}>
      {frasi.magRiepilogo}
      <SegnoPlus feature="stimeMagazzino" />
    </button>
  )
}
