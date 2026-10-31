import { useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, Bell, CalendarPlus, Cloud, Download, Heart, Layers, List, MessageCircle, PawPrint, Star, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import iconaPlus from '../../assets/brand/groomly-plus-icon-tonda.svg'
import scrittaPlus from '../../assets/brand/groomly-plus-scritta-scura.svg'
import iconaSalone from '../../assets/brand/groomly-salon-icon-tonda.svg'
import scrittaSalone from '../../assets/brand/groomly-salon-scritta-scura.svg'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'
import type { Chiave } from '../../i18n/t'
import { COLORE_PIANO, COLORE_PIANO_SCURO, PREZZI } from '../../lib/abbonamento'
import { compra } from '../../lib/billing'
import { PRO_SEAT_LIMIT } from '../../lib/salonAccess'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

type PianoPagato = 'plus' | 'salone'

const FUNZIONI: Record<PianoPagato, { chiave: Chiave; icona: LucideIcon }[]> = {
  plus: [
    { chiave: 'abbFPromemoria', icona: Bell },
    { chiave: 'abbFMessaggi', icona: MessageCircle },
    { chiave: 'abbFPronto', icona: PawPrint },
    { chiave: 'abbFFedelta', icona: Heart },
    { chiave: 'abbFPrenotazioni', icona: CalendarPlus },
    { chiave: 'abbFAttesa', icona: List },
    { chiave: 'abbFRecensioni', icona: Star },
    { chiave: 'abbFExport', icona: Download },
    { chiave: 'abbFBackup', icona: Cloud },
  ],
  salone: [
    { chiave: 'abbFTuttoPlus', icona: Layers },
    { chiave: 'abbFTeam', icona: Users },
    { chiave: 'abbFPosti', icona: UserPlus },
  ],
}

const TESTI: Record<PianoPagato, { nome: Chiave; claim: Chiave; come: Chiave; icona: string; scritta: string }> = {
  plus: { nome: 'abbPlus', claim: 'abbPlusClaim', come: 'abbPlusCome', icona: iconaPlus, scritta: scrittaPlus },
  salone: { nome: 'abbSalone', claim: 'abbSaloneClaim', come: 'abbSaloneCome', icona: iconaSalone, scritta: scrittaSalone },
}

export function sfondoPiano(piano: PianoPagato): string {
  return `linear-gradient(165deg, ${COLORE_PIANO[piano]} 0%, ${COLORE_PIANO_SCURO[piano]} 100%)`
}

const indietro: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 20,
  background: '#fff',
  color: '#1B2533',
  display: 'grid',
  placeItems: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,.18)',
}

// Testata a sfumatura: icona tonda e scritta del piano, poi quello che passa il chiamante («Attivo»).
// Compatta nella vetrina: circa il 30% più bassa, con il pulsante indietro sovrapposto, per lasciare spazio alle funzioni.
export function TestataPiano({ piano, sfondo = true, compatta = false, children }: { piano: PianoPagato; sfondo?: boolean; compatta?: boolean; children?: ReactNode }) {
  const frasi = useFrasi()
  const testi = TESTI[piano]
  const icona = compatta ? 66 : 96
  return (
    <div style={{ position: 'relative', background: sfondo ? sfondoPiano(piano) : 'transparent', color: '#fff', padding: compatta ? '10px 16px 12px' : '12px 16px 20px' }}>
      <Link to="/impostazioni/abbonamento" aria-label={frasi.homeIndietro} style={compatta ? { ...indietro, position: 'absolute', top: 10, left: 16 } : indietro}>
        <ArrowLeft size={18} strokeWidth={2} aria-hidden />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compatta ? 8 : 12, marginTop: compatta ? 0 : 4 }}>
        <span style={{ width: icona, height: icona, borderRadius: icona / 2, padding: compatta ? 3 : 4, background: 'rgba(255,255,255,.25)', boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
          <img alt="" src={testi.icona} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
        </span>
        <h1 style={{ margin: 0, lineHeight: 0 }}>
          <img alt={frasi[testi.nome]} src={testi.scritta} style={{ height: compatta ? 24 : 32, width: 'auto', display: 'block' }} />
        </h1>
        <p style={{ margin: 0, textAlign: 'center', fontSize: compatta ? 14 : 15, lineHeight: 1.35, opacity: 0.92, maxWidth: 300 }}>{frasi[testi.claim]}</p>
        {children}
      </div>
    </div>
  )
}

export function Vetrina({ piano }: { piano: PianoPagato }) {
  const frasi = useFrasi()
  const stato = usePiano()
  const session = useSession()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const collaboratore = ruolo === 'collaboratore'
  // La prova di 30 giorni è di Plus, si usa una volta e la avvia solo il titolare.
  const provaDisponibile = piano === 'plus' && !stato.provaUsata && (ruolo === undefined || ruolo === 'titolare')
  const [inArrivo, setInArrivo] = useState(false)
  const testi = TESTI[piano]

  function abbonati() {
    // Finché il Play Store non è collegato, compra risponde «spento» e mostriamo «In arrivo».
    if (compra(stato.abbonamentiAttivi).stato === 'spento') setInArrivo(true)
  }

  const scuro = COLORE_PIANO_SCURO[piano]
  const principale: CSSProperties = { display: 'block', width: '100%', minHeight: 50, border: 0, borderRadius: 999, background: '#fff', color: scuro, font: 'inherit', fontWeight: 800, fontSize: 17, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }

  // Pagina alta quanto lo schermo: le funzioni scorrono, il footer con prezzo e pulsanti resta fermo.
  return (
    <div style={{ height: 'calc(100dvh - var(--safe-top))', display: 'flex', flexDirection: 'column', background: sfondoPiano(piano), color: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div data-testid="vetrina-scorre" style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingBottom: 24 }}>
          <TestataPiano piano={piano} sfondo={false} compatta />
          <ul style={{ listStyle: 'none', margin: '0 16px 14px', padding: '2px 12px', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 18 }}>
            {FUNZIONI[piano].map(({ chiave, icona: Icona }, index) => (
              <li key={chiave} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontWeight: 600, fontSize: 14, lineHeight: 1.25, borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,.15)' }}>
                <span aria-hidden style={{ width: 24, height: 24, borderRadius: 12, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <Icona size={13} strokeWidth={2.2} color={COLORE_PIANO[piano]} />
                </span>
                <span>{chiave === 'abbFPosti' ? frasi.abbFPosti.replace('{{n}}', String(PRO_SEAT_LIMIT)) : frasi[chiave]}</span>
              </li>
            ))}
          </ul>
          <section style={{ margin: '0 20px', textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>{frasi.abbComeFunziona}</h2>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.45, opacity: 0.85 }}>{frasi[testi.come]}</p>
          </section>
        </div>
        {/* La sfumatura dice che la lista continua sotto il footer. */}
        <div data-testid="vetrina-sfumatura" aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, pointerEvents: 'none', background: `linear-gradient(to bottom, transparent, ${scuro})` }} />
      </div>
      <footer style={{ flex: 'none', padding: '10px 18px calc(14px + env(safe-area-inset-bottom, 0px))', background: scuro, textAlign: 'center' }}>
        <p style={{ margin: '0 0 2px' }}>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{PREZZI[piano]}</span>
          <span style={{ fontSize: 15, opacity: 0.9 }}> {frasi.abbMese}</span>
        </p>
        {collaboratore ? (
          <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{frasi.pianoLoAccendeTitolare}</p>
        ) : (
          <>
            {provaDisponibile ? (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#EDE4FF' }}>{frasi.abbProvaPoi.replace('{{prezzo}}', PREZZI.plus)}</p>
            ) : (
              <div style={{ height: 6 }} />
            )}
            {provaDisponibile ? (
              <>
                <button type="button" onClick={() => { void stato.prova() }} style={principale}>{frasi.provaGratis}</button>
                <button
                  type="button"
                  onClick={abbonati}
                  style={{ display: 'inline-block', minHeight: 36, padding: '0 12px', border: 0, background: 'transparent', color: '#fff', font: 'inherit', fontWeight: 700, fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {frasi.abbAbbonati}
                </button>
              </>
            ) : (
              <button type="button" onClick={abbonati} style={principale}>{frasi.abbAbbonati}</button>
            )}
            <p style={{ margin: provaDisponibile ? 0 : '8px 0 0', fontSize: 12, opacity: 0.85 }}>{frasi.abbDisdici}</p>
          </>
        )}
      </footer>
      <Dialog open={inArrivo} title={frasi.abbInArrivoTitolo} onClose={() => setInArrivo(false)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.abbInArrivoTesto}</p>
        <Button onClick={() => setInArrivo(false)}>{frasi.notCapito}</Button>
      </Dialog>
    </div>
  )
}
