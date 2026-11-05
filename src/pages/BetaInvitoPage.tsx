import { ArrowLeft, CalendarCheck, Check, FlaskConical, Gift, MessageCircle, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import iconaPlus from '../assets/brand/groomly-plus-icon-tonda.svg'
import scrittaPlus from '../assets/brand/groomly-plus-scritta-scura.svg'
import iconaSalone from '../assets/brand/groomly-salon-icon-tonda.svg'
import scrittaSalone from '../assets/brand/groomly-salon-scritta-scura.svg'
import { FUNZIONI, sfondoPiano } from '../components/abbonamento/Vetrina'
import { useBeta } from '../components/beta/BetaProvider'
import { dataBeta, messaggioErroreBeta, MOTIVO_ALTRO, nomePiano, riempi, testoOfferta } from '../components/beta/testi'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { usePiano } from '../hooks/usePiano'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { COLORE_PIANO, COLORE_PIANO_SCURO } from '../lib/abbonamento'
import { CONFIG_PIANI_DEFAULT } from '../lib/configPiani'
import { ALTRO_RIFIUTO_MAX, MOTIVI_RIFIUTO_BETA, type MotivoRifiutoBeta } from '../lib/betaInvito'
import { traccia } from '../lib/metricheNative'
import { PRO_SEAT_LIMIT } from '../lib/salonAccess'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const GIORNO_MS = 24 * 60 * 60 * 1000

const MARCHIO = {
  pro: { vetrina: 'plus', icona: iconaPlus, scritta: scrittaPlus },
  salone: { vetrina: 'salone', icona: iconaSalone, scritta: scrittaSalone },
} as const

const MOTIVI: Record<MotivoRifiutoBeta, 'betaMotivoServe' | 'betaMotivoComplicato' | 'betaMotivoPagherei' | 'betaMotivoAltro'> = {
  'non-serve': 'betaMotivoServe',
  complicato: 'betaMotivoComplicato',
  'non-pagherei': 'betaMotivoPagherei',
  altro: 'betaMotivoAltro',
}

const indietro: CSSProperties = { width: 40, height: 40, borderRadius: 20, background: '#fff', color: '#1B2533', display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.18)' }
const riga: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontWeight: 600, fontSize: 14, lineHeight: 1.3 }
const cerchio: CSSProperties = { width: 24, height: 24, borderRadius: 12, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center', flex: 'none' }

// Pagina dell'invito alla beta (spec 9.2): a tutta pagina, come la Vetrina. Solo per il titolare.
export function BetaInvitoPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const beta = useBeta()
  const configPiani = usePiano().configPiani ?? CONFIG_PIANI_DEFAULT
  const navigate = useNavigate()
  const toast = useToast()
  const [capito, setCapito] = useState(false)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState('')
  const [rifiuto, setRifiuto] = useState(false)
  const inVolo = useRef(false)
  const idInvito = beta.avvisi.find((avviso) => avviso.tipo === 'invito')?.id
  const { segnaLetto } = beta

  // Aprire la pagina conta come leggere l'avviso dell'invito.
  useEffect(() => {
    if (idInvito) segnaLetto(idInvito)
  }, [idInvito, segnaLetto])

  if (!beta.titolare) return <Navigate to="/" replace />
  if (!beta.pronto) return <PhoneShell showFab={false}><div style={{ height: 'calc(100dvh - var(--safe-top))', background: sfondoPiano('plus') }} /></PhoneShell>
  if (beta.fase === 'in-corso') return <Navigate to="/impostazioni/abbonamento" replace />
  if (!beta.invitoValido || !beta.invito || !beta.piano) return <InvitoNonValido />

  const piano = beta.piano
  const nome = nomePiano(frasi, piano)
  const marchio = MARCHIO[piano]
  const scuro = COLORE_PIANO_SCURO[marchio.vetrina]
  const giorni = beta.invito.giorni
  const fino = dataBeta(lingua, new Date(Date.now() + giorni * GIORNO_MS))
  const offerta = testoOfferta(configPiani.offertaEarlyAdopter, lingua)
  const garanzie: { icona: LucideIcon; testo: string }[] = [
    { icona: CalendarCheck, testo: riempi(frasi.betaGratisFino, { n: giorni, data: fino }) },
    { icona: ShieldCheck, testo: frasi.betaNessunPagamento },
    { icona: MessageCircle, testo: frasi.betaInCambio },
    ...(offerta ? [{ icona: Gift, testo: offerta }] : []),
    { icona: FlaskConical, testo: frasi.betaCambiano },
  ]

  async function partecipa() {
    if (!capito || inVolo.current) return
    inVolo.current = true
    setAttesa(true)
    setErrore('')
    try {
      const { rispondiInvitoBeta } = await import('../data/firebase/betaClient')
      const { scadeIl } = await rispondiInvitoBeta({ accetta: true })
      traccia({ nome: 'beta_accettata' })
      const fine = scadeIl ? new Date(scadeIl) : new Date(Date.now() + giorni * GIORNO_MS)
      toast.show(riempi(frasi.betaBenvenuto, { piano: nome, data: dataBeta(lingua, fine) }), 'ok', undefined, undefined, 4000)
      navigate('/', { replace: true })
    } catch (error) {
      setErrore(messaggioErroreBeta(frasi, error))
      inVolo.current = false
      setAttesa(false)
    }
  }

  return (
    <PhoneShell showFab={false}>
      <div style={{ height: 'calc(100dvh - var(--safe-top))', display: 'flex', flexDirection: 'column', background: sfondoPiano(marchio.vetrina), color: '#fff', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 20 }}>
          <div style={{ position: 'relative', padding: '10px 16px 12px' }}>
            <Link to="/" aria-label={frasi.homeIndietro} style={{ ...indietro, position: 'absolute', top: 10, left: 16 }}>
              <ArrowLeft size={18} strokeWidth={2} aria-hidden />
            </Link>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 66, height: 66, borderRadius: 33, padding: 3, background: 'rgba(255,255,255,.25)', boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
                <img alt="" src={marchio.icona} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.35)', fontSize: 12, fontWeight: 800 }}>
                <FlaskConical size={12} strokeWidth={2.4} aria-hidden />{frasi.betaSuInvito}
              </span>
              <h1 style={{ margin: 0, lineHeight: 0 }}>
                <img alt={piano === 'salone' ? frasi.abbSalone : frasi.abbPlus} src={marchio.scritta} style={{ height: 24, width: 'auto', display: 'block' }} />
              </h1>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.35, maxWidth: 300 }}>
                {riempi(frasi.betaTiInvita, { piano: nome })} <strong>{riempi(frasi.betaTiInvitaGratis, { n: giorni })}</strong>
              </p>
            </div>
          </div>
          {beta.invito.messaggio ? (
            <blockquote style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,.95)', color: '#2B1863', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
              «{beta.invito.messaggio}»
            </blockquote>
          ) : null}
          <ul style={{ listStyle: 'none', margin: '0 16px 12px', padding: '2px 12px', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 18 }}>
            {FUNZIONI[marchio.vetrina].map(({ chiave, icona: Icona }, index) => (
              <li key={chiave} style={{ ...riga, borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,.15)' }}>
                <span aria-hidden style={cerchio}><Icona size={13} strokeWidth={2.2} color={COLORE_PIANO[marchio.vetrina]} /></span>
                <span>{chiave === 'abbFPosti' ? frasi.abbFPosti.replace('{{n}}', String(PRO_SEAT_LIMIT)) : frasi[chiave]}</span>
              </li>
            ))}
          </ul>
          <ul aria-label={frasi.betaSuInvito} style={{ listStyle: 'none', margin: '0 16px', padding: '2px 12px', background: 'rgba(0,0,0,.14)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 18 }}>
            {garanzie.map(({ icona: Icona, testo }, index) => (
              <li key={testo} style={{ ...riga, borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,.12)' }}>
                <span aria-hidden style={cerchio}><Icona size={13} strokeWidth={2.2} color={COLORE_PIANO[marchio.vetrina]} /></span>
                <span>{testo}</span>
              </li>
            ))}
          </ul>
        </div>
        <footer style={{ flex: 'none', padding: '12px 18px calc(14px + env(safe-area-inset-bottom, 0px))', background: scuro, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.35, fontWeight: 600, minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={capito} onChange={(event) => setCapito(event.target.checked)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
            <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, flex: 'none', marginTop: 1, display: 'grid', placeItems: 'center', border: '2px solid #fff', background: capito ? '#fff' : 'transparent', color: scuro }}>
              {capito ? <Check size={14} strokeWidth={3} /> : null}
            </span>
            <span>{frasi.betaHoCapito}</span>
          </label>
          {errore ? <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FFE3E0' }}>{errore}</p> : null}
          <button
            type="button"
            onClick={() => { void partecipa() }}
            disabled={!capito || attesa}
            style={{ minHeight: 50, border: 0, borderRadius: 999, background: '#fff', color: scuro, font: 'inherit', fontWeight: 800, fontSize: 17, boxShadow: '0 8px 20px rgba(0,0,0,.25)', opacity: capito && !attesa ? 1 : 0.6 }}
          >
            {frasi.betaPartecipo}
          </button>
          <button type="button" onClick={() => setRifiuto(true)} disabled={attesa} style={{ alignSelf: 'center', minHeight: 44, padding: '0 12px', border: 0, background: 'transparent', color: '#fff', font: 'inherit', fontWeight: 700, fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {frasi.betaNoGrazie}
          </button>
        </footer>
      </div>
      <DialogoRifiuto open={rifiuto} onClose={() => setRifiuto(false)} />
    </PhoneShell>
  )
}

function DialogoRifiuto({ open, onClose }: { open: boolean; onClose: () => void }) {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const toast = useToast()
  const [motivo, setMotivo] = useState<MotivoRifiutoBeta | null>(null)
  const [altro, setAltro] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState('')
  const inVolo = useRef(false)

  async function rifiuta() {
    if (!motivo || inVolo.current) return
    inVolo.current = true
    setAttesa(true)
    setErrore('')
    try {
      const { rispondiInvitoBeta } = await import('../data/firebase/betaClient')
      const testo = altro.trim()
      await rispondiInvitoBeta(motivo === MOTIVO_ALTRO && testo ? { accetta: false, motivo, altro: testo } : { accetta: false, motivo })
      traccia({ nome: 'beta_rifiutata' })
      toast.show(frasi.betaGrazieRisposta, 'ok')
      navigate('/', { replace: true })
    } catch (error) {
      setErrore(messaggioErroreBeta(frasi, error))
      inVolo.current = false
      setAttesa(false)
    }
  }

  return (
    <Dialog open={open} title={frasi.betaNoTitolo} onClose={onClose} portal>
      <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.4 }}>{frasi.betaNoPerche}</p>
      <div role="radiogroup" aria-label={frasi.betaMotivo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MOTIVI_RIFIUTO_BETA.map((id) => {
          const scelto = motivo === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={scelto}
              onClick={() => setMotivo(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1.5px solid ${scelto ? 'var(--pri)' : 'var(--line)'}`, background: scelto ? 'var(--pri-s)' : 'var(--card)', color: 'var(--tx)', font: 'inherit', fontWeight: 650, textAlign: 'left' }}
            >
              <span aria-hidden style={{ width: 18, height: 18, borderRadius: 9, flex: 'none', border: `2px solid ${scelto ? 'var(--pri)' : 'var(--line2)'}`, display: 'grid', placeItems: 'center' }}>
                {scelto ? <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--pri)' }} /> : null}
              </span>
              {frasi[MOTIVI[id]]}
            </button>
          )
        })}
      </div>
      {motivo === MOTIVO_ALTRO ? (
        <textarea
          aria-label={frasi.betaMotivoAltroCampo}
          placeholder={frasi.betaMotivoAltroCampo}
          value={altro}
          maxLength={ALTRO_RIFIUTO_MAX}
          onChange={(event) => setAltro(event.target.value)}
          style={{ font: 'inherit', minHeight: 80, padding: 12, borderRadius: 12, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', resize: 'none' }}
        />
      ) : null}
      {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.rowSub }}>{errore}</p> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>{frasi.homeIndietro}</Button>
        <Button variant="bad" onClick={() => { void rifiuta() }} disabled={!motivo || attesa} style={{ flex: 1 }}>{frasi.betaRifiuta}</Button>
      </div>
    </Dialog>
  )
}

function InvitoNonValido() {
  const frasi = useFrasi()
  const navigate = useNavigate()
  return (
    <ShellFrame>
      <Header title={frasi.betaSuInvito} backTo="/" />
      <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
        <span style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--plus-s)', color: 'var(--plus-ink)', display: 'grid', placeItems: 'center' }}>
          <FlaskConical size={32} strokeWidth={1.8} aria-hidden />
        </span>
        <h1 style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{frasi.betaNonValido}</h1>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.rowSub, lineHeight: 1.45, maxWidth: 280 }}>{frasi.betaNonValidoTesto}</p>
        <Button onClick={() => navigate('/')}>{frasi.betaTornaHome}</Button>
      </div>
    </ShellFrame>
  )
}
