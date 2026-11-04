import { ChevronRight, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import { TYPE } from '../../theme/theme'
import { useBeta } from './BetaProvider'

// «Invia feedback beta»: sempre a portata in Impostazioni durante la beta e per 30 giorni dopo (spec 9.3).
// La callable accetta titolare e socio: il collaboratore non la vede.
export function RigaFeedbackBeta() {
  const frasi = useFrasi()
  const beta = useBeta()
  const session = useSession()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined
  if (!beta.feedbackVisibile || ruolo === 'collaboratore') return null
  const salone = beta.piano === 'salone'
  return (
    <Link
      to="/impostazioni/beta/feedback"
      className="tocco"
      style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 12px', borderRadius: 12, background: 'var(--card)', boxShadow: `0 0 0 2px ${salone ? '#C99200' : '#7B3FE4'}, var(--sh-1)`, color: 'var(--tx)', textDecoration: 'none' }}
    >
      <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', background: salone ? 'var(--sal-s)' : 'var(--plus-s)', color: salone ? 'var(--sal-ink)' : 'var(--plus-ink)' }}>
        <MessageCircle size={17} strokeWidth={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 700 }}>{frasi.betaFeedbackRiga}</span>
        <span style={{ fontSize: TYPE.meta, color: 'var(--tx2)' }}>{frasi.betaFeedbackAiuto}</span>
      </span>
      <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
    </Link>
  )
}
