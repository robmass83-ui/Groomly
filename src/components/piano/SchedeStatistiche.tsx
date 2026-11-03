import type { CSSProperties } from 'react'
import { Card } from '../ui/Card'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { euro as formatoEuro } from '../../i18n/format'
import { t } from '../../i18n/t'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

const NASCOSTO = '•••'

const lista: CSSProperties = { padding: `4px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 8 }
const scheda: CSSProperties = { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }
const etichetta: CSSProperties = { fontSize: TYPE.meta, fontWeight: 600, color: 'var(--tx3)' }
const valoreStile: CSSProperties = { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }
const sotto: CSSProperties = { fontSize: TYPE.meta, color: 'var(--tx2)' }

export function SchedeStatistiche({
  mostra,
  euro,
  atteso,
  ritardo,
  nascondi,
  mese,
}: {
  mostra: boolean
  euro: number | null
  atteso: number
  ritardo: number
  nascondi: boolean
  mese: string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  if (!mostra) return null
  const euroOra = euro === null ? '—' : nascondi ? NASCOSTO : formatoEuro(lingua, euro)
  const previsto = nascondi ? NASCOSTO : formatoEuro(lingua, atteso)
  return (
    <section aria-label={frasi.statistiche} style={lista}>
      <Card style={scheda}>
        <span style={etichetta}>{frasi.euroOra}</span>
        <span style={valoreStile}>{euroOra}</span>
        <span style={sotto}>{frasi.euroOraSotto}</span>
      </Card>
      <Card style={scheda}>
        <span style={etichetta}>{frasi.previsioneMese}</span>
        <span style={valoreStile}>{previsto}</span>
        <span style={sotto}>{t(lingua, 'previsioneSotto', { mese })}</span>
      </Card>
      <Card style={scheda}>
        <span style={etichetta}>{frasi.clientiInRitardo}</span>
        <span style={valoreStile}>{ritardo}</span>
        <span style={sotto}>{frasi.inRitardoSotto}</span>
      </Card>
    </section>
  )
}
