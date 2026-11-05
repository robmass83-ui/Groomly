import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { codiceErroreServer } from '../../i18n/errori'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type Attesa = { conferma: () => void; annulla: () => void }

/** Quando il server chiede un accesso recente: domanda la password e ripete l'azione una volta sola. */
export function useRiconferma(): { conRiconferma: <T>(azione: () => Promise<T>) => Promise<T>; dialogo: ReactNode } {
  const frasi = useFrasi()
  const [aperta, setAperta] = useState(false)
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [occupato, setOccupato] = useState(false)
  const attesa = useRef<Attesa | null>(null)

  const conRiconferma = useCallback(async <T,>(azione: () => Promise<T>): Promise<T> => {
    try {
      return await azione()
    } catch (error) {
      if (codiceErroreServer(error)?.codice !== 'riconferma_richiesta') throw error
      await new Promise<void>((conferma, annulla) => {
        attesa.current = { conferma, annulla: () => annulla(error) }
        setAperta(true)
      })
      return azione()
    }
  }, [])

  function chiudi() {
    setAperta(false)
    setPassword('')
    setErrore('')
  }

  function annulla() {
    if (occupato) return
    chiudi()
    attesa.current?.annulla()
    attesa.current = null
  }

  async function conferma() {
    setOccupato(true)
    setErrore('')
    try {
      const { riconfermaPassword } = await import('../../data/firebase/client')
      await riconfermaPassword(password)
      chiudi()
      attesa.current?.conferma()
      attesa.current = null
    } catch {
      setErrore(frasi.authWrong)
    } finally {
      setOccupato(false)
    }
  }

  const dialogo = (
    <Dialog open={aperta} title={frasi.rifTitolo} onClose={annulla} portal>
      <p style={{ margin: 0 }}>{frasi.rifTesto}</p>
      <Input label={frasi.accPasswordAttuale} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
      <Button disabled={occupato || password.length === 0} onClick={() => { void conferma() }}>{frasi.uteConferma}</Button>
      <Button variant="ghost" disabled={occupato} onClick={annulla}>{frasi.homeAnnulla}</Button>
    </Dialog>
  )

  return { conRiconferma, dialogo }
}
