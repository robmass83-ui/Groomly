import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog } from '../layout/Dialog'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import type { Lingua } from '../../i18n/lingua'
import { useSettings } from '../../hooks/useSettings'
import { dataBreve } from '../../i18n/format'
import { linkMessaggio, testoMessaggio, type TipoMessaggio } from '../../lib/messaggiManuali'
import { leggiLinguaMessaggio, scriviLinguaMessaggio } from '../../lib/linguaMessaggio'
import { usePiano } from '../../hooks/usePiano'
import { strumentoVisibile } from '../../lib/funzioniPiano'
import { TYPE } from '../../theme/theme'

const TIPI: TipoMessaggio[] = ['promemoria', 'conferma', 'pronto', 'richiamo', 'auguri']
const LINGUE: { value: Lingua; label: string }[] = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

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
  const { lingua: linguaApp } = useLingua()
  const { settings } = useSettings()
  const piano = usePiano()
  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState<TipoMessaggio>('promemoria')
  const [bozza, setBozza] = useState('')
  const [toccata, setToccata] = useState(false)
  const [lingua, setLingua] = useState<Lingua>(() => leggiLinguaMessaggio(telefono, linguaApp))
  const compilati = { ...valori, quando: quando ? dataBreve(lingua, quando) : '' }
  const testo = toccata ? bozza : testoMessaggio(lingua, tipo, compilati)
  if (!strumentoVisibile('messaggi', settings, piano.funzioni)) return null
  const href = linkMessaggio(telefono, testo)
  if (!href) return null
  const etichette: Record<TipoMessaggio, string> = {
    promemoria: frasi.strumPromemoria,
    conferma: frasi.strumConferma,
    pronto: frasi.strumPronto,
    richiamo: frasi.strumRichiamo,
    auguri: frasi.strumAuguri,
  }
  function apri() {
    const ricordata = leggiLinguaMessaggio(telefono, linguaApp)
    if (ricordata !== lingua) {
      setToccata(false)
      setBozza('')
    }
    setLingua(ricordata)
    setAperto(true)
  }
  function scegliLingua(prossima: Lingua) {
    scriviLinguaMessaggio(telefono, prossima)
    setLingua(prossima)
    setToccata(false)
    setBozza('')
  }
  function scegliTipo(prossimo: TipoMessaggio) {
    setTipo(prossimo)
    setToccata(false)
    setBozza('')
  }
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={apri} style={{ minHeight: 48 }}>{frasi.strumMessaggi}</button>
      <Dialog open={aperto} title={frasi.strumMessaggi} onClose={() => setAperto(false)}>
        <div role="radiogroup" aria-label={frasi.linguaMessaggio} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {LINGUE.map((voce) => {
            const selected = voce.value === lingua
            return (
              <button
                key={voce.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => scegliLingua(voce.value)}
                style={{
                  minHeight: 48,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  borderRadius: 12,
                  border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
                  background: selected ? 'var(--pri-s)' : 'var(--surf)',
                  color: 'var(--tx)',
                  font: 'inherit',
                  fontWeight: 650,
                  fontSize: TYPE.meta,
                  padding: '6px 4px',
                  textAlign: 'center',
                }}
              >
                <span>{voce.label}</span>
                {selected ? <Check size={14} strokeWidth={2} aria-hidden /> : <span style={{ height: 14 }} aria-hidden />}
              </button>
            )
          })}
        </div>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.linguaMessaggioAiuto}</p>
        <div role="radiogroup" aria-label={frasi.strumMessaggi} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TIPI.map((voce) => {
            const selected = tipo === voce
            return (
              <button
                key={voce}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => scegliTipo(voce)}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
                  background: selected ? 'var(--pri-s)' : 'var(--surf)',
                  color: 'var(--tx)',
                  font: 'inherit',
                  fontWeight: 650,
                  padding: '0 12px',
                }}
              >
                {etichette[voce]}
              </button>
            )
          })}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--tx2)', fontSize: TYPE.meta }}>
          {frasi.strumMessaggi}
          <textarea
            aria-label={frasi.strumMessaggi}
            value={testo}
            onChange={(event) => { setToccata(true); setBozza(event.target.value) }}
            rows={5}
            style={{ width: '100%', color: 'var(--tx)', font: 'inherit', fontSize: TYPE.base }}
          />
        </label>
        <a
          href={href}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 48,
            background: 'var(--pri-solid)',
            color: 'var(--on-pri)',
            textDecoration: 'none',
            borderRadius: 12,
            fontWeight: 700,
          }}
        >
          {frasi.strumApriWa}
        </a>
      </Dialog>
    </>
  )
}
