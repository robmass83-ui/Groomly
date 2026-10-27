import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { useFrasi } from '../../i18n/LinguaContext'

export function PaywallSheet({
  open,
  puoProvare,
  esitoProva = 'spento',
  messaggioProva = '',
  onClose,
  onAvvisami,
  onProva,
}: {
  open: boolean
  puoProvare: boolean
  esitoProva?: 'spento' | 'attesa' | 'ok' | 'errore'
  messaggioProva?: string
  onClose: () => void
  onAvvisami: () => void
  onProva: () => void | Promise<void>
}) {
  const frasi = useFrasi()
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  const inCorso = esitoProva === 'attesa' || attesa

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
    <Dialog open={open} portal title={frasi.abbonamentiInArrivo} onClose={onClose}>
      {esitoProva === 'ok' ? (
        <p style={{ margin: 0, lineHeight: 1.4 }}>{frasi.provaAttiva}</p>
      ) : (
        <>
          <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.prezziPlay}</p>
          {esitoProva === 'errore' ? <p style={{ margin: 0, color: 'var(--bad)' }}>{messaggioProva || frasi.authSalvataggio}</p> : null}
          {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
          <Button onClick={onAvvisami}>{frasi.avvisami}</Button>
          {puoProvare ? <Button onClick={() => { void prova() }} disabled={inCorso}>{frasi.provaGratis}</Button> : null}
        </>
      )}
    </Dialog>
  )
}
