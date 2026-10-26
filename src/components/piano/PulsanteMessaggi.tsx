import { Capacitor } from '@capacitor/core'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import type { Lingua } from '../../i18n/lingua'
import { useSettings } from '../../hooks/useSettings'
import { dataConOra } from '../../i18n/format'
import { hrefMessaggio, hrefMessaggioApp, testoMessaggio, type TipoMessaggio } from '../../lib/messaggiManuali'
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

function WhatsAppMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.63-.61-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.29.57-.36.76-.36h.55c.17 0 .4-.07.63.48.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.41.5-.14.14-.28.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
    </svg>
  )
}

export function PulsanteMessaggi({
  telefono,
  valori,
  quando,
  aspetto = 'testo',
}: {
  telefono: string
  valori: { nome: string; cane: string; servizio: string }
  quando?: Date
  aspetto?: 'testo' | 'whatsapp'
}) {
  const frasi = useFrasi()
  const toast = useToast()
  const { lingua: linguaApp } = useLingua()
  const { settings } = useSettings()
  const piano = usePiano()
  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState<TipoMessaggio>('promemoria')
  const [bozza, setBozza] = useState('')
  const [toccata, setToccata] = useState(false)
  const [lingua, setLingua] = useState<Lingua>(() => leggiLinguaMessaggio(telefono, linguaApp))
  const conOrario = tipo === 'promemoria' || tipo === 'conferma' || tipo === 'richiamo'
  const compilati = { ...valori, quando: conOrario && quando ? dataConOra(lingua, quando) : '' }
  const testo = toccata ? bozza : testoMessaggio(lingua, tipo, compilati)
  if (!strumentoVisibile('messaggi', settings, piano.funzioni)) return null
  const href = hrefMessaggio(telefono, testo)
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
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={aspetto === 'whatsapp' ? 'WhatsApp' : undefined}
        onClick={apri}
        style={aspetto === 'whatsapp'
          ? { minHeight: 48, width: '100%', border: 0, borderRadius: 16, background: '#128C7E', color: '#fff', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
          : { minHeight: 48 }}
      >
        {aspetto === 'whatsapp' ? <WhatsAppMark /> : null}
        {aspetto === 'whatsapp' ? 'WhatsApp' : frasi.strumMessaggi}
      </button>
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
          onClick={(event) => {
            if (!Capacitor.isNativePlatform()) return
            event.preventDefault()
            try {
              window.location.assign(hrefMessaggioApp(href))
            } catch {
              toast.show(frasi.schedaWhatsappChiuso, 'plain')
            }
          }}
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
