import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { useFrasi } from '../../i18n/LinguaContext'

export function PaywallSheet({
  open,
  puoProvare,
  onClose,
  onAvvisami,
  onProva,
}: {
  open: boolean
  puoProvare: boolean
  onClose: () => void
  onAvvisami: () => void
  onProva: () => void | Promise<void>
}) {
  const frasi = useFrasi()
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  async function prova() {
    if (attesa) return
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
    <Dialog open={open} title={frasi.abbonamentiInArrivo} onClose={onClose}>
      <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.prezziPlay}</p>
      {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
      <Button onClick={onAvvisami}>{frasi.avvisami}</Button>
      {puoProvare ? <Button onClick={() => { void prova() }} disabled={attesa}>{frasi.provaGratis}</Button> : null}
    </Dialog>
  )
}
