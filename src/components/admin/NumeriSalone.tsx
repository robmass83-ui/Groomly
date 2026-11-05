import { useEffect, useRef, useState } from 'react'
import { NOMI_LINGUA } from '../../i18n/lingua'
import { useFrasi } from '../../i18n/LinguaContext'
import type { SchedaAggregata } from '../../data/firebase/adminClient'
import { Card, Row } from '../ui/Card'
import { SectionTitle } from '../ui/SectionTitle'

const TRATTINO = '—'

/** Numeri aggregati del salone. Se la chiamata fallisce resta un trattino: la scheda serve lo stesso. */
export function NumeriSalone({ carica }: { carica: () => Promise<SchedaAggregata> }) {
  const frasi = useFrasi()
  const [numeri, setNumeri] = useState<SchedaAggregata | null>(null)
  const chiama = useRef(carica)
  chiama.current = carica
  useEffect(() => {
    let vivo = true
    void chiama.current().then((esito) => { if (vivo) setNumeri(esito) }).catch(() => undefined)
    return () => { vivo = false }
  }, [])
  const voci: [string, string][] = [
    [frasi.consCani, numeri ? String(numeri.cani) : TRATTINO],
    [frasi.consAppuntamenti, numeri ? String(numeri.appuntamenti) : TRATTINO],
    [frasi.consUltimi30, numeri ? String(numeri.appuntamenti30) : TRATTINO],
    [frasi.consPersone, numeri ? String(numeri.persone) : TRATTINO],
    [frasi.consVersione, numeri?.versioneApp ?? TRATTINO],
    [frasi.consLingua, numeri?.lingua ? NOMI_LINGUA[numeri.lingua] : TRATTINO],
  ]
  return (
    <>
      <SectionTitle color="var(--tx3)">{frasi.consNumeri}</SectionTitle>
      <Card>
        {voci.map(([nome, valore], indice) => (
          <Row key={nome} style={indice === 0 ? { borderTop: 'none' } : undefined}>
            <span style={{ flex: 1 }}>{nome}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{valore}</strong>
          </Row>
        ))}
      </Card>
    </>
  )
}
