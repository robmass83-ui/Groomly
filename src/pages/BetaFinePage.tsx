import { Hourglass } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { SchedaAbbonamento } from '../components/abbonamento/SchedaAbbonamento'
import { useBeta } from '../components/beta/BetaProvider'
import { SFUMATURA_BETA } from '../components/beta/CardInvitoBeta'
import { dataBeta, nomePiano, riempi, testoOfferta } from '../components/beta/testi'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Pagheresti } from '../lib/betaFeedback'
import { CONFIG_PIANI_DEFAULT } from '../lib/configPiani'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const scheda: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  minHeight: 56,
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  boxShadow: 'var(--sh-2)',
  color: 'inherit',
  textDecoration: 'none',
}

// Domanda di fine beta (spec 9.5): l'ultimo giorno o dopo la fine. La risposta apre il modulo feedback.
export function BetaFinePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const beta = useBeta()
  const configPiani = usePiano().configPiani ?? CONFIG_PIANI_DEFAULT
  const session = useSession()
  const navigate = useNavigate()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined

  if (!beta.pronto) return <ShellFrame><Header title={frasi.betaTipoAvviso} backTo="/" /></ShellFrame>
  if (!beta.domandaFine || !beta.piano || ruolo === 'collaboratore') return <Navigate to="/" replace />

  const nome = nomePiano(frasi, beta.piano)
  const finita = beta.fase === 'finita'
  // Il giorno della fine è il primo su Go.
  const giorno = beta.fine ? dataBeta(lingua, beta.fine) : ''
  const offerta = beta.earlyAdopter ? testoOfferta(configPiani.offertaEarlyAdopter, lingua) : ''
  const rispondi = (valore: Pagheresti) => navigate(`/impostazioni/beta/feedback?pagheresti=${valore}&fine=1`)

  return (
    <ShellFrame>
      <Header title={frasi.betaTipoAvviso} backTo="/" />
      <div style={{ padding: `12px ${SIZES.pagePadX}px 128px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <section style={{ background: 'var(--card)', borderRadius: 16, boxShadow: 'var(--sh-2)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <span style={{ width: 64, height: 64, borderRadius: 32, background: beta.piano === 'salone' ? 'var(--sal-s)' : 'var(--plus-s)', color: beta.piano === 'salone' ? 'var(--sal-ink)' : 'var(--plus-ink)', display: 'grid', placeItems: 'center' }}>
            <Hourglass size={28} strokeWidth={1.9} aria-hidden />
          </span>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{riempi(finita ? frasi.betaFinita : frasi.betaFineDomani, { piano: nome })}</h2>
          <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.rowSub, lineHeight: 1.45 }}>{finita ? frasi.betaFineTestoFinita : riempi(frasi.betaFineTesto, { giorno })}</p>
          <p style={{ margin: '6px 0 2px', fontWeight: 800, fontSize: 16, lineHeight: 1.35 }}>{riempi(frasi.betaContinuare, { piano: nome })}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'stretch' }}>
            <Button onClick={() => rispondi('si')} style={{ width: '100%', background: SFUMATURA_BETA[beta.piano], color: '#fff' }}>{frasi.betaSi}</Button>
            <Button variant="secondary" onClick={() => rispondi('forse')} style={{ width: '100%' }}>{frasi.betaForse}</Button>
            <Button variant="secondary" onClick={() => rispondi('no')} style={{ width: '100%' }}>{frasi.betaNoGo}</Button>
          </div>
          {offerta ? <p style={{ margin: '4px 0 0', fontSize: TYPE.meta, color: 'var(--tx2)', lineHeight: 1.4 }}>{riempi(frasi.betaFondatori, { testo: offerta })}</p> : null}
        </section>
        <SchedaAbbonamento stile={scheda} stileBollino={{}} titolare={beta.titolare} />
      </div>
    </ShellFrame>
  )
}
