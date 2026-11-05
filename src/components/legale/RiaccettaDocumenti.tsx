import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { accountNonEliminabile } from '../../lib/accountProtetto'
import { linkLegale } from '../../lib/distribuzione'
import { apriEsterno } from '../../lib/openDocument'
import { VERSIONE_DOCUMENTI, deveRiaccettare, mancaSuServer } from '../../lib/versioneLegale'
import { SIZES } from '../../theme/sizes'
import { Button } from '../ui/Button'

const PAGINA_ELIMINA = '/impostazioni/account/elimina'

// Valgono per l'apertura dell'app: senza rete si entra, e la richiesta torna alla prossima.
let rimandataPer: string | null = null
let provaSilenziosaPer: string | null = null

/** Solo per i test. */
export function __resetRiaccetta(): void {
  rimandataPer = null
  provaSilenziosaPer = null
}

// Senza connessione vera l'SDK risponde «internal», e su Android onLine può restare vero: blocca solo un rifiuto del server.
const RIFIUTI = new Set(['functions/invalid-argument', 'functions/unauthenticated', 'functions/permission-denied'])

function senzaRete(error?: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (error === undefined) return false
  return !RIFIUTI.has(String((error as { code?: unknown } | null)?.code))
}

export function RiaccettaDocumenti({ richiesta = VERSIONE_DOCUMENTI, children }: { richiesta?: number; children: ReactNode }) {
  const session = useSession()
  const piano = usePiano()
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? null
  const [occupato, setOccupato] = useState(false)
  const [errore, setErrore] = useState(false)
  const [, setRimandata] = useState(false)

  useEffect(() => {
    if (!uid || provaSilenziosaPer === uid || !mancaSuServer(account?.termini)) return
    provaSilenziosaPer = uid
    void import('../../data/firebase/client')
      .then((mod) => mod.callRegistraAccettazione())
      .catch(() => undefined)
  }, [uid, account?.termini])

  const blocca = account !== null
    && deveRiaccettare(account.termini, richiesta)
    && rimandataPer !== uid
    && pathname !== PAGINA_ELIMINA
    && !senzaRete()
  if (!blocca) return <>{children}</>

  const protetto = accountNonEliminabile({
    email: account.email,
    salonId: account.salonId,
    uid: account.uid,
    vip: piano.livelloNome === 'vip',
  })

  async function accetta() {
    if (occupato) return
    setOccupato(true)
    setErrore(false)
    try {
      const mod = await import('../../data/firebase/client')
      await mod.callRegistraAccettazione()
      session.replaceAccount(await mod.accountRiletto())
    } catch (error) {
      if (senzaRete(error)) {
        rimandataPer = uid
        setRimandata(true)
      } else {
        setErrore(true)
      }
    } finally {
      setOccupato(false)
    }
  }

  const documenti = [
    { titolo: frasi.legPrivacy, voce: 'privacy' },
    { titolo: frasi.legTermini, voce: 'termini' },
    { titolo: frasi.legDpa, voce: 'dpa' },
  ] as const

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--tx)', padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SIZES.sectionGap }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>{frasi.riaccTitolo}</h1>
      <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.riaccTesto}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documenti.map(({ titolo, voce }) => (
          <Button key={voce} variant="secondary" onClick={() => { void apriEsterno(linkLegale(voce, lingua)) }}>{titolo}</Button>
        ))}
      </div>
      {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{frasi.riaccErrore}</p> : null}
      <Button onClick={() => { void accetta() }} disabled={occupato}>{frasi.riaccAccetto}</Button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button variant="secondary" onClick={session.logout}>{frasi.riaccEsci}</Button>
        {protetto ? null : <Button variant="secondary" onClick={() => navigate(PAGINA_ELIMINA)}>{frasi.eliminaAccount}</Button>}
      </div>
    </main>
  )
}
