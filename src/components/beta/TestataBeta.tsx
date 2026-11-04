import { ChevronRight, Gift, MessageCircle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import iconaPlus from '../../assets/brand/groomly-plus-icon-tonda.svg'
import scrittaPlus from '../../assets/brand/groomly-plus-scritta-scura.svg'
import iconaSalone from '../../assets/brand/groomly-salon-icon-tonda.svg'
import scrittaSalone from '../../assets/brand/groomly-salon-scritta-scura.svg'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { CONFIG_PIANI_DEFAULT } from '../../lib/configPiani'
import { TYPE } from '../../theme/theme'
import { BarraGiorni } from '../abbonamento/BarraGiorni'
import { EtichettaBeta } from '../abbonamento/EtichettaBeta'
import { useBeta } from './BetaProvider'
import { SFUMATURA_BETA } from './CardInvitoBeta'
import { dataBeta, riempi, testoOfferta } from './testi'

const MARCHIO = {
  pro: { icona: iconaPlus, scritta: scrittaPlus, nome: 'abbPlus' },
  salone: { icona: iconaSalone, scritta: scrittaSalone, nome: 'abbSalone' },
} as const

const rigaCard: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '8px 12px', color: 'var(--tx)', textDecoration: 'none' }

// Pagina Abbonamento durante la beta (spec 9.3): testata a sfumatura con la pillola dei giorni,
// le date e la barra; sotto, il feedback e l'offerta fondatori (solo early adopter con il testo in config).
export function TestataBeta() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const beta = useBeta()
  const configPiani = usePiano().configPiani ?? CONFIG_PIANI_DEFAULT
  const session = useSession()
  const collaboratore = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  if (beta.fase !== 'in-corso' || !beta.piano) return null
  const piano = beta.piano
  const marchio = MARCHIO[piano]
  const giorni = beta.giorniRimasti ?? 0
  const fine = beta.fine ? dataBeta(lingua, beta.fine) : ''
  const testo = beta.inizio
    ? riempi(frasi.betaDalAl, { inizio: dataBeta(lingua, beta.inizio), fine })
    : riempi(frasi.betaFinoAl, { fine })
  const offerta = beta.earlyAdopter ? testoOfferta(configPiani.offertaEarlyAdopter, lingua) : ''
  const salone = piano === 'salone'

  return (
    <>
      <section aria-label={frasi[marchio.nome]} data-testata-beta={piano} style={{ background: SFUMATURA_BETA[piano], color: '#fff', borderRadius: 18, padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: 'var(--sh-2)' }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, padding: 3, background: 'rgba(255,255,255,.25)' }}>
          <img alt="" src={marchio.icona} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
        </span>
        <img alt={frasi[marchio.nome]} src={marchio.scritta} style={{ height: 22, width: 'auto', display: 'block' }} />
        <EtichettaBeta piano={piano} piena testo={giorni === 1 ? frasi.betaPillolaGiorno : riempi(frasi.betaPillolaGiorni, { n: giorni })} />
        <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, lineHeight: 1.4, opacity: 0.95 }}>{testo}</p>
        <BarraGiorni rimasti={giorni} totali={beta.giorniTotali} />
      </section>
      {collaboratore ? null : (
        <div style={{ background: 'var(--card)', borderRadius: 14, boxShadow: 'var(--sh-1)', overflow: 'hidden' }}>
          <Link to="/impostazioni/beta/feedback" className="tocco" style={rigaCard}>
            <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', background: salone ? 'var(--sal-s)' : 'var(--plus-s)', color: salone ? 'var(--sal-ink)' : 'var(--plus-ink)' }}>
              <MessageCircle size={17} strokeWidth={2} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{frasi.betaFeedbackRiga}</span>
              <span style={{ fontSize: TYPE.meta, color: 'var(--tx2)' }}>{frasi.betaFeedbackAiuto}</span>
            </span>
            <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
          </Link>
          {offerta ? (
            <div style={{ ...rigaCard, borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
              <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--ok-s)', color: 'var(--ok)' }}>
                <Gift size={17} strokeWidth={2} />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{frasi.betaOffertaFondatori}</span>
                <span style={{ fontSize: TYPE.meta, color: 'var(--tx2)', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{offerta}</span>
              </span>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}
