import { useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/layout/Dialog'
import { useFrasi } from '../i18n/LinguaContext'
import { useSession } from './useSession'

/** «Esci» con avviso: se ci sono modifiche non ancora inviate chiede conferma prima di cancellare il telefono. */
export function useEsci(): { esci: () => void; foglio: ReactNode; occupato: boolean } {
  const frasi = useFrasi()
  const session = useSession()
  const [aperto, setAperto] = useState(false)
  // Dal tocco fino alla ripartenza i pulsanti Esci restano occupati: il controllo può durare fino a 1,5 s.
  const [occupato, setOccupato] = useState(false)
  const occupatoRef = useRef(false)
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''

  function prendi(): boolean {
    if (occupatoRef.current) return false
    occupatoRef.current = true
    setOccupato(true)
    return true
  }

  function esci() {
    if (!prendi()) return
    void (async () => {
      let inSospeso = false
      try {
        const client = await import('../data/firebase/client')
        inSospeso = uid ? await client.modificheInSospeso(uid) : false
      } catch {
        inSospeso = false
      }
      if (inSospeso) {
        occupatoRef.current = false
        setOccupato(false)
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
      <Button variant="bad" disabled={occupato} aria-busy={occupato || undefined} onClick={() => { if (prendi()) session.logout() }}>
        {occupato ? `${frasi.esciComunque}…` : frasi.esciComunque}
      </Button>
    </Dialog>
  )

  return { esci, foglio, occupato }
}
