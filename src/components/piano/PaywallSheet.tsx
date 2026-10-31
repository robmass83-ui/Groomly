import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { useFrasi } from '../../i18n/LinguaContext'
import { livelloMinimo, type FeatureKey } from '../../lib/piano'
import { TESTI_PAYWALL } from '../../lib/paywallTesti'
import { SegnoPlus } from './SegnoPlus'

/** Finestra B: anteprima di un messaggio WhatsApp e le cinque categorie, Promemoria scelto. */
function AnteprimaMessaggi() {
  const frasi = useFrasi()
  const categorie = [frasi.strumPromemoria, frasi.strumConferma, frasi.strumPronto, frasi.strumRichiamo, frasi.strumAuguri]
  return (
    <>
      <div data-testid="anteprima-whatsapp" style={{ background: '#ECE5DD', borderRadius: 18, padding: '16px 14px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: '#D9FDD3', color: '#111B21', borderRadius: '14px 14px 4px 14px', padding: '10px 12px', fontSize: 14, lineHeight: 1.4, boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
          {frasi.pwMessaggiAnteprima}
          <div aria-hidden style={{ textAlign: 'right', fontSize: 11, color: '#667781', marginTop: 4 }}>16:02</div>
        </div>
      </div>
      <ul aria-label={frasi.strumMessaggi} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categorie.map((nome, indice) => (
          <li
            key={nome}
            aria-current={indice === 0 ? 'true' : undefined}
            style={{
              fontSize: 13,
              fontWeight: indice === 0 ? 700 : 600,
              color: indice === 0 ? 'var(--on-pri)' : 'var(--tx)',
              background: indice === 0 ? 'var(--pri-solid)' : 'var(--surf)',
              padding: '7px 12px',
              borderRadius: 999,
            }}
          >
            {nome}
          </li>
        ))}
      </ul>
    </>
  )
}

export function PaywallSheet({
  open,
  feature,
  mostraProva,
  abbonamentiAttivi,
  esitoProva = 'spento',
  messaggioProva = '',
  onClose,
  onAvvisami,
  onProva,
  onAbbonati,
}: {
  open: boolean
  feature: FeatureKey | null
  mostraProva: boolean
  abbonamentiAttivi: boolean
  esitoProva?: 'spento' | 'attesa' | 'ok' | 'errore'
  messaggioProva?: string
  onClose: () => void
  onAvvisami: () => void
  onProva: () => void | Promise<void>
  onAbbonati: (percorso: string) => void
}) {
  const frasi = useFrasi()
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  const inCorso = esitoProva === 'attesa' || attesa
  const testi = feature ? TESTI_PAYWALL[feature] : null
  const salone = feature !== null && livelloMinimo(feature) === 'salone'
  const percorso = salone ? '/impostazioni/abbonamento/salone' : '/impostazioni/abbonamento/plus'
  const Icona = testi?.icona
  const messaggi = feature === 'messaggiCategoria'

  async function prova() {
    if (inCorso) return
    setErrore('')
    setAttesa(true)
    try {
      await onProva()
    } catch {
      setErrore(frasi.authSalvataggio)
    } finally {
      setAttesa(false)
    }
  }

  return (
    <Dialog
      open={open}
      portal
      title={testi ? frasi[testi.titolo] : frasi.abbPlus}
      titleExtra={messaggi ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--plus-cta) 12%, var(--card))' }}><SegnoPlus feature="messaggiCategoria" /></span> : undefined}
      onClose={onClose}
    >
      {Icona && !messaggi ? <Icona data-testid="icona-paywall" aria-hidden size={32} color="var(--pri)" style={{ alignSelf: 'flex-start', flex: 'none' }} /> : null}
      {esitoProva === 'ok' ? (
        <>
          <p style={{ margin: 0, lineHeight: 1.4 }}>{frasi.provaAttiva}</p>
          <Button onClick={onClose}>{frasi.notCapito}</Button>
        </>
      ) : (
        <>
          {testi ? <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi[testi.testo]}</p> : null}
          {messaggi ? <AnteprimaMessaggi /> : null}
          {esitoProva === 'errore' ? <p style={{ margin: 0, color: 'var(--bad)' }}>{messaggioProva || frasi.authSalvataggio}</p> : null}
          {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
          {mostraProva && !salone ? <Button onClick={() => { void prova() }} disabled={inCorso}>{frasi.provaGratis}</Button> : null}
          {abbonamentiAttivi
            ? <Button onClick={() => onAbbonati(percorso)}>{frasi.abbAbbonati}</Button>
            : <Button onClick={onAvvisami}>{frasi.avvisami}</Button>}
        </>
      )}
    </Dialog>
  )
}
