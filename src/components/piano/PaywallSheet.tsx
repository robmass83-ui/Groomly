import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { useFrasi } from '../../i18n/LinguaContext'
import { livelloMinimo, type FeatureKey } from '../../lib/piano'
import { TESTI_PAYWALL } from '../../lib/paywallTesti'

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
    <Dialog open={open} portal title={testi ? frasi[testi.titolo] : frasi.abbPlus} onClose={onClose}>
      {Icona ? <Icona data-testid="icona-paywall" aria-hidden size={32} color="var(--pri)" style={{ alignSelf: 'flex-start', flex: 'none' }} /> : null}
      {esitoProva === 'ok' ? (
        <>
          <p style={{ margin: 0, lineHeight: 1.4 }}>{frasi.provaAttiva}</p>
          <Button onClick={onClose}>{frasi.notCapito}</Button>
        </>
      ) : (
        <>
          {testi ? <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi[testi.testo]}</p> : null}
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
