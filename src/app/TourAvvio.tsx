import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mascotte } from '../components/tour/Mascotte'
import { usePassiSalone } from '../hooks/usePassiSalone'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import type { PassoSalone } from '../lib/completaSalone'
import { isOperator } from '../lib/salonPath'
import { deveVedereTour, leggiTourSalone } from '../lib/tourBenvenuto'

const PAGINA_TOUR = '/benvenuto'

// Valgono per l'apertura dell'app: si azzerano solo a riavvio completo.
let avvisoChiuso = false
let reindirizzato = false

/** Solo per i test. */
export function __resetTourAvvio(): void {
  avvisoChiuso = false
  reindirizzato = false
}

export function TourAvvio() {
  const { tour: config } = usePiano()
  const { settings, ready } = useSettings()
  const { gate } = useSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const account = gate.kind === 'in' ? gate.account : null
  const uid = account?.uid ?? null
  const [creazione, setCreazione] = useState<{ uid: string; valore: string | null } | null>(null)
  const [chiuso, setChiuso] = useState(avvisoChiuso)

  useEffect(() => {
    // a interruttore spento non serve chiedere a Firebase
    if (!config.acceso || !uid) return
    let vivo = true
    void import('../data/firebase/client')
      .then((mod) => mod.creazioneAccount())
      .catch(() => null)
      .then((valore) => { if (vivo) setCreazione({ uid, valore }) })
    return () => { vivo = false }
  }, [config.acceso, uid])

  // Niente decisioni finché impostazioni e data di creazione non sono arrivate.
  const letta = creazione !== null && creazione.uid === uid
  const esito = !config.acceso || !account
    ? 'niente'
    : !ready || !letta
      ? null
      : deveVedereTour({
          config,
          creazioneAccount: creazione.valore,
          // account vecchi senza ruolo: sono titolari
          titolare: account.role === undefined || account.role === 'titolare',
          operatore: isOperator(account.email),
          tour: leggiTourSalone(settings.tourBenvenuto),
        })
  const suTour = pathname === PAGINA_TOUR

  useEffect(() => {
    if (esito !== 'tour' || reindirizzato) return
    reindirizzato = true
    if (!suTour) navigate(PAGINA_TOUR, { replace: true })
  }, [esito, suTour, navigate])

  if (esito !== 'avviso' || suTour || chiuso) return null
  return (
    <AvvisoTour
      saltati={leggiTourSalone(settings.tourBenvenuto)?.saltati ?? []}
      onContinua={() => navigate(PAGINA_TOUR)}
      onChiudi={() => {
        avvisoChiuso = true
        setChiuso(true)
      }}
    />
  )
}

function AvvisoTour({ saltati, onContinua, onChiudi }: {
  saltati: readonly PassoSalone[]
  onContinua: () => void
  onChiudi: () => void
}) {
  const frasi = useFrasi()
  const { passi, pronto } = usePassiSalone()
  // avanzamento: passi del tour già fatti o saltati, sul totale
  const delTour = passi.filter((p) => p.id !== 'email')
  const fatti = pronto ? delTour.filter((p) => p.fatto || saltati.includes(p.id)).length : 0
  const quota = delTour.length > 0 ? fatti / delTour.length : 0

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top, 0px) + 10px)',
        left: 10,
        right: 10,
        // sotto i fogli (30): un foglio aperto lo copre
        zIndex: 25,
        maxWidth: 520,
        margin: '0 auto',
        pointerEvents: 'none',
      }}
    >
      <div className="tour-toast" style={{ position: 'relative', pointerEvents: 'auto' }}>
        <div style={{ width: 40, height: 40, flex: 'none' }}><Mascotte size={40} /></div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.35, color: 'var(--tx2)' }}>
          <b style={{ display: 'block', fontSize: 13.5, color: 'var(--tx)' }}>{frasi.tourAvviso}</b>
          {frasi.tourAvvisoDomanda}
        </div>
        <button
          type="button"
          onClick={onContinua}
          style={{ minHeight: 36, borderRadius: 10, border: 0, background: 'var(--pri-solid)', color: '#fff', font: 'inherit', fontSize: 13, fontWeight: 700, padding: '0 12px', boxShadow: 'var(--sh-btn)', cursor: 'pointer', flex: 'none' }}
        >
          {frasi.tourContinua}
        </button>
        <button
          type="button"
          aria-label={frasi.tourChiudiAvviso}
          onClick={onChiudi}
          style={{ width: 36, height: 36, border: 0, background: 'none', color: 'var(--tx3)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none', padding: 0 }}
        >
          <X size={18} strokeWidth={2.2} aria-hidden />
        </button>
        <span aria-hidden style={{ position: 'absolute', left: 12, right: 12, bottom: 0, height: 3, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: '100%', background: 'var(--pri-solid)', transformOrigin: 'left', transform: `scaleX(${quota})` }} />
        </span>
      </div>
    </div>
  )
}
