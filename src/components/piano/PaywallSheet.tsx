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
  const percorso = feature && livelloMinimo(feature) === 'salone' ? '/impostazioni/abbonamento/salone' : '/impostazioni/abbonamento/plus'

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
      {esitoProva === 'ok' ? (
        <p style={{ margin: 0, lineHeight: 1.4 }}>{frasi.provaAttiva}</p>
      ) : (
        <>
          {testi ? <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi[testi.testo]}</p> : null}
          {esitoProva === 'errore' ? <p style={{ margin: 0, color: 'var(--bad)' }}>{messaggioProva || frasi.authSalvataggio}</p> : null}
          {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
          {mostraProva ? <Button onClick={() => { void prova() }} disabled={inCorso}>{frasi.provaGratis}</Button> : null}
          {abbonamentiAttivi
            ? <Button onClick={() => onAbbonati(percorso)}>{frasi.abbAbbonati}</Button>
            : <Button onClick={onAvvisami}>{frasi.avvisami}</Button>}
        </>
      )}
    </Dialog>
  )
}
