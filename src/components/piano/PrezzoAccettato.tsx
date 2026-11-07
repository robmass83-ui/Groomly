import { useEffect, useState } from 'react'
import { firebaseEnabled } from '../../data/firebase/enabled'
import { useFrasi } from '../../i18n/LinguaContext'
import { TYPE } from '../../theme/theme'

/** Riga discreta: il cliente ha spuntato «Ho capito che il prezzo è indicativo» sulla pagina pubblica. */
export function RigaPrezzoAccettato({ prezzo }: { prezzo: number }) {
  const frasi = useFrasi()
  return (
    <p data-testid="prezzo-accettato" style={{ margin: 0, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
      {frasi.prezzoAccettato.replace('{{importo}}', String(prezzo))}
    </p>
  )
}

/** Nel dettaglio della visita: legge la richiesta online da cui è nata, se c'è. */
export function PrezzoAccettatoVisita({ richiestaId }: { richiestaId?: string }) {
  const [prezzo, setPrezzo] = useState<number | null>(null)
  useEffect(() => {
    setPrezzo(null)
    if (!richiestaId || !firebaseEnabled()) return
    let vivo = true
    void import('../../data/firebase/client')
      .then((client) => client.leggiPrezzoAccettato(richiestaId))
      .then((valore) => { if (vivo) setPrezzo(valore) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [richiestaId])
  return prezzo === null ? null : <RigaPrezzoAccettato prezzo={prezzo} />
}
