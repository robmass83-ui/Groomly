import { useState } from 'react'
import { Sheet } from '../layout/Sheet'
import { useFrasi } from '../../i18n/LinguaContext'
import type { Lingua } from '../../i18n/lingua'
import { useSettings } from '../../hooks/useSettings'
import { dataBreve } from '../../i18n/format'
import { linkMessaggio, testoMessaggio, type TipoMessaggio } from '../../lib/messaggiManuali'
import { strumentoAcceso } from '../../lib/strumenti'

const TIPI: TipoMessaggio[] = ['promemoria', 'conferma', 'pronto', 'richiamo', 'auguri']

export function PulsanteMessaggi({
  telefono,
  valori,
  quando,
}: {
  telefono: string
  valori: { nome: string; cane: string; servizio: string }
  quando?: Date
}) {
  const frasi = useFrasi()
  const { settings } = useSettings()
  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState<TipoMessaggio>('promemoria')
  const [bozza, setBozza] = useState('')
  const [toccata, setToccata] = useState(false)
  const lingua: Lingua = settings.linguaClienti ?? 'it'
  const compilati = { ...valori, quando: quando ? dataBreve(lingua, quando) : '' }
  const testo = toccata ? bozza : testoMessaggio(lingua, tipo, compilati)
  if (!strumentoAcceso(settings, 'messaggi')) return null
  const href = linkMessaggio(telefono, testo)
  if (!href) return null
  const etichette: Record<TipoMessaggio, string> = {
    promemoria: frasi.strumPromemoria,
    conferma: frasi.strumConferma,
    pronto: frasi.strumPronto,
    richiamo: frasi.strumRichiamo,
    auguri: frasi.strumAuguri,
  }
  return (
    <>
      <button type="button" onClick={() => setAperto(true)} style={{ minHeight: 48 }}>{frasi.strumMessaggi}</button>
      <Sheet open={aperto} title={frasi.strumMessaggi} onClose={() => setAperto(false)}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TIPI.map((voce) => (
            <button key={voce} type="button" aria-pressed={tipo === voce} onClick={() => { setTipo(voce); setToccata(false) }}>{etichette[voce]}</button>
          ))}
        </div>
        <textarea aria-label={frasi.strumMessaggi} value={testo} onChange={(event) => { setToccata(true); setBozza(event.target.value) }} rows={5} style={{ width: '100%', marginTop: 12 }} />
        <a href={href}>{frasi.strumApriWa}</a>
      </Sheet>
    </>
  )
}
