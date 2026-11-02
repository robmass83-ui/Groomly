import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/layout/Dialog'
import { useFrasi } from '../i18n/LinguaContext'
import { useSession } from './useSession'

/** «Esci» con avviso: se ci sono modifiche non ancora inviate chiede conferma prima di cancellare il telefono. */
export function useEsci(): { esci: () => void; foglio: ReactNode } {
  const frasi = useFrasi()
  const session = useSession()
  const [aperto, setAperto] = useState(false)
  const occupato = useRef(false)
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''

  function esci() {
    if (occupato.current) return
    occupato.current = true
    void (async () => {
      let inSospeso = false
      try {
        const client = await import('../data/firebase/client')
        inSospeso = uid ? await client.modificheInSospeso(uid) : false
      } catch {
        inSospeso = false
      }
      if (inSospeso) {
        occupato.current = false
        setAperto(true)
        return
      }
      session.logout()
    })()
  }

  const foglio = (
    <Dialog open={aperto} title={frasi.impEsciDomanda} onClose={() => setAperto(false)}>
      <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{frasi.esciModificheInSospeso}</p>
      <Button variant="secondary" onClick={() => setAperto(false)}>{frasi.appResta}</Button>
      <Button variant="bad" onClick={() => { if (!occupato.current) { occupato.current = true; session.logout() } }}>{frasi.esciComunque}</Button>
    </Dialog>
  )

  return { esci, foglio }
}
