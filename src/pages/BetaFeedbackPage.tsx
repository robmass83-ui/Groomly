import { Check, Star } from 'lucide-react'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useBeta } from '../components/beta/BetaProvider'
import { SFUMATURA_BETA } from '../components/beta/CardInvitoBeta'
import { messaggioErroreBeta, nomePiano, riempi } from '../components/beta/testi'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { AttesaZampe } from '../components/ui/Zampette'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { APP_VERSION } from '../lib/appVersion'
import { PAGHERESTI, TESTO_FEEDBACK_MAX, type FasciaPrezzo, type GiudizioFunzione, type Pagheresti } from '../lib/betaFeedback'
import { FUNZIONI_FEEDBACK } from '../lib/funzioniFeedback'
import type { FeatureKey } from '../lib/piano'
import { PRO_SEAT_LIMIT } from '../lib/salonAccess'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const PASSI = 4
const GIUDIZI: { valore: GiudizioFunzione; chiave: 'betaUtile' | 'betaPoco' | 'betaNo' }[] = [
  { valore: 'utile', chiave: 'betaUtile' },
  { valore: 'poco-utile', chiave: 'betaPoco' },
  { valore: 'non-usata', chiave: 'betaNo' },
]
const ETICHETTE_PAGHERESTI: Record<Pagheresti, 'betaPagSi' | 'betaPagForse' | 'betaPagNo'> = { si: 'betaPagSi', forse: 'betaPagForse', no: 'betaPagNo' }
const FASCE: { valore: FasciaPrezzo; chiave: 'betaFascia1' | 'betaFascia2' | 'betaFascia3' | 'betaFascia4' }[] = [
  { valore: 'meno-5', chiave: 'betaFascia1' },
  { valore: '5-10', chiave: 'betaFascia2' },
  { valore: '10-20', chiave: 'betaFascia3' },
  { valore: 'piu-20', chiave: 'betaFascia4' },
]

function pagherestiDi(valore: string | null): Pagheresti | null {
  return PAGHERESTI.find((p) => p === valore) ?? null
}

const domanda: CSSProperties = { margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.3 }
const area: CSSProperties = { font: 'inherit', minHeight: 96, padding: 12, borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', resize: 'none' }

function Scelta({ scelto, onClick, children, stile, etichetta }: { scelto: boolean; onClick: () => void; children: ReactNode; stile?: CSSProperties; etichetta?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={scelto}
      aria-label={etichetta}
      onClick={onClick}
      style={{ border: `1.5px solid ${scelto ? 'var(--pri)' : 'var(--line)'}`, background: scelto ? 'var(--pri-s)' : 'var(--card)', color: scelto ? 'var(--pri-ink)' : 'var(--tx)', borderRadius: 10, font: 'inherit', fontWeight: 700, fontSize: 13, ...stile }}
    >
      {children}
    </button>
  )
}

// Modulo feedback beta a passi (spec 9.4). Si arriva anche dalla domanda di fine: ?pagheresti=si|forse|no&fine=1.
export function BetaFeedbackPage() {
  const frasi = useFrasi()
  const beta = useBeta()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [parametri] = useSearchParams()
  const fineBeta = parametri.get('fine') === '1'
  const [passo, setPasso] = useState(1)
  const [voto, setVoto] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [funzioni, setFunzioni] = useState<Partial<Record<FeatureKey, GiudizioFunzione>>>({})
  const [nonVa, setNonVa] = useState('')
  const [manca, setManca] = useState('')
  const [pagheresti, setPagheresti] = useState<Pagheresti | null>(() => pagherestiDi(parametri.get('pagheresti')))
  const [quanto, setQuanto] = useState<FasciaPrezzo | null>(null)
  const [ricontatto, setRicontatto] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState('')
  const [grazie, setGrazie] = useState(false)
  const inVolo = useRef(false)
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined

  if (!beta.pronto) return <ShellFrame><Header title={frasi.betaFeedbackTitolo} backTo="/impostazioni" /></ShellFrame>
  if (!beta.feedbackVisibile || ruolo === 'collaboratore' || !beta.piano) return <Navigate to="/impostazioni" replace />

  const piano = beta.piano
  const nome = nomePiano(frasi, piano)
  const sfumatura = SFUMATURA_BETA[piano]
  const avantiSpento = (passo === 1 && voto === null) || (passo === PASSI && pagheresti === null) || attesa

  function torna() {
    // Si torna alla pagina di partenza; aperta da un link diretto, alle Impostazioni.
    if (location.key !== 'default') navigate(-1)
    else navigate('/impostazioni', { replace: true })
  }

  async function invia() {
    if (voto === null || pagheresti === null || inVolo.current) return
    inVolo.current = true
    setAttesa(true)
    setErrore('')
    try {
      const { inviaFeedbackBeta } = await import('../data/firebase/betaClient')
      await inviaFeedbackBeta({
        voto,
        funzioni,
        nonVa: nonVa.trim(),
        manca: manca.trim(),
        pagheresti,
        quanto: pagheresti === 'no' ? null : quanto,
        ricontatto,
        fineBeta,
        versioneApp: APP_VERSION,
      })
      beta.ricordaFeedback()
      setAttesa(false)
      setGrazie(true)
    } catch (error) {
      setErrore(messaggioErroreBeta(frasi, error))
      inVolo.current = false
      setAttesa(false)
    }
  }

  function avanti() {
    if (avantiSpento) return
    if (passo < PASSI) setPasso(passo + 1)
    else void invia()
  }

  return (
    <ShellFrame>
      <Header title={frasi.betaFeedbackTitolo} subtitle={riempi(frasi.betaPasso, { n: passo })} onBack={passo > 1 ? () => setPasso(passo - 1) : torna} />
      <div style={{ padding: `10px ${SIZES.pagePadX}px 128px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="progressbar" aria-label={riempi(frasi.betaPasso, { n: passo })} aria-valuemin={1} aria-valuemax={PASSI} aria-valuenow={passo} style={{ height: 6, borderRadius: 3, background: 'var(--surf2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(passo / PASSI) * 100}%`, background: sfumatura, borderRadius: 3 }} />
        </div>

        {passo === 1 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={domanda}>{riempi(frasi.betaComeTiTrovi, { piano: nome })}</h2>
            <div role="radiogroup" aria-label={riempi(frasi.betaComeTiTrovi, { piano: nome })} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
              {([1, 2, 3, 4, 5] as const).map((n) => {
                const piena = voto !== null && n <= voto
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={voto === n}
                    aria-label={n === 1 ? frasi.betaStella : riempi(frasi.betaStelle, { n })}
                    onClick={() => setVoto(n)}
                    style={{ height: 42, minHeight: 44, borderRadius: 10, border: `1.5px solid ${piena ? '#E3A008' : 'var(--line)'}`, background: piena ? '#FDF3D6' : 'var(--card)', display: 'grid', placeItems: 'center' }}
                  >
                    <Star size={22} strokeWidth={2} aria-hidden color={piena ? '#E3A008' : 'var(--tx3)'} fill={piena ? '#E3A008' : 'none'} />
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {passo === 2 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={domanda}>{frasi.betaQualiFunzioni}</h2>
            <div style={{ background: 'var(--card)', borderRadius: 12, boxShadow: 'var(--sh-1)' }}>
              {FUNZIONI_FEEDBACK[piano].map(({ feature, chiave }, index) => {
                const testo = chiave === 'abbFPosti' ? frasi.abbFPosti.replace('{{n}}', String(PRO_SEAT_LIMIT)) : frasi[chiave]
                return (
                  <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: TYPE.rowSub, fontWeight: 600, lineHeight: 1.3 }}>{testo}</span>
                    <div role="radiogroup" aria-label={testo} style={{ display: 'flex', gap: 4, flex: 'none' }}>
                      {GIUDIZI.map(({ valore, chiave: etichetta }) => (
                        <Scelta key={valore} scelto={funzioni[feature] === valore} onClick={() => setFunzioni((prima) => ({ ...prima, [feature]: valore }))} stile={{ width: 48, height: 32, minHeight: 32, padding: 0, fontSize: 12 }}>
                          {frasi[etichetta]}
                        </Scelta>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {passo === 3 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={domanda}>{frasi.betaNonVa}</span>
              <textarea value={nonVa} maxLength={TESTO_FEEDBACK_MAX} placeholder={frasi.betaFacoltativo} onChange={(event) => setNonVa(event.target.value)} style={area} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
              <span style={domanda}>{frasi.betaManca}</span>
              <textarea value={manca} maxLength={TESTO_FEEDBACK_MAX} placeholder={frasi.betaFacoltativo} onChange={(event) => setManca(event.target.value)} style={area} />
            </label>
          </section>
        ) : null}

        {passo === 4 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={domanda}>{riempi(frasi.betaPagheresti, { piano: nome })}</h2>
            <div role="radiogroup" aria-label={riempi(frasi.betaPagheresti, { piano: nome })} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
              {PAGHERESTI.map((valore) => (
                <Scelta key={valore} scelto={pagheresti === valore} onClick={() => setPagheresti(valore)} stile={{ minHeight: 44 }}>{frasi[ETICHETTE_PAGHERESTI[valore]]}</Scelta>
              ))}
            </div>
            {pagheresti === 'si' || pagheresti === 'forse' ? (
              <>
                <h3 style={{ ...domanda, fontSize: 15 }}>{frasi.betaQuanto}</h3>
                <div role="radiogroup" aria-label={frasi.betaQuanto} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
                  {FASCE.map(({ valore, chiave }) => (
                    <Scelta key={valore} scelto={quanto === valore} onClick={() => setQuanto(valore)} stile={{ minHeight: 44 }}>{frasi[chiave]}</Scelta>
                  ))}
                </div>
              </>
            ) : null}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={ricontatto} onChange={(event) => setRicontatto(event.target.checked)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
              <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, flex: 'none', display: 'grid', placeItems: 'center', border: `2px solid ${ricontatto ? 'var(--pri)' : 'var(--line2)'}`, background: ricontatto ? 'var(--pri-solid)' : 'transparent', color: 'var(--on-pri)' }}>
                {ricontatto ? <Check size={14} strokeWidth={3} /> : null}
              </span>
              {frasi.betaRicontatto}
            </label>
          </section>
        ) : null}

        {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.rowSub, fontWeight: 600 }}>{errore}</p> : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={passo > 1 ? () => setPasso(passo - 1) : torna} style={{ flex: 1 }}>{frasi.homeIndietro}</Button>
          <Button onClick={avanti} disabled={avantiSpento} style={{ flex: 1, background: sfumatura, color: '#fff', opacity: avantiSpento ? 0.5 : 1 }}>
            {passo === PASSI ? frasi.betaInvia : frasi.betaAvanti}
          </Button>
        </div>
      </div>
      <AttesaZampe testo={attesa ? frasi.authInvio : null} />
      <Dialog open={grazie} title={frasi.betaFeedbackTitolo} onClose={torna} portal>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.betaGrazie}</p>
        <Button onClick={torna}>{frasi.chiudi}</Button>
      </Dialog>
    </ShellFrame>
  )
}
