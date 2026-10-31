import { useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, Bell, Cake, CalendarPlus, ChartColumn, Cloud, FileText, Heart, Layers, List, PawPrint, Star, UserPlus, Users, type LucideIcon } from 'lucide-react'
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
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'

type PianoPagato = 'plus' | 'salone'

const FUNZIONI: Record<PianoPagato, { chiave: Chiave; icona: LucideIcon }[]> = {
  plus: [
    { chiave: 'abbFPromemoria', icona: Bell },
    { chiave: 'abbFPronto', icona: PawPrint },
    { chiave: 'abbFAuguri', icona: Cake },
    { chiave: 'abbFFedelta', icona: Heart },
    { chiave: 'abbFPrenotazioni', icona: CalendarPlus },
    { chiave: 'abbFAttesa', icona: List },
    { chiave: 'abbFRecensioni', icona: Star },
    { chiave: 'abbFStatistiche', icona: ChartColumn },
    { chiave: 'abbFReport', icona: FileText },
    { chiave: 'abbFCopie', icona: Cloud },
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

// Testata a sfumatura: icona tonda e scritta del piano, poi quello che passa il chiamante (prezzo o «Attivo»).
export function TestataPiano({ piano, sfondo = true, children }: { piano: PianoPagato; sfondo?: boolean; children?: ReactNode }) {
  const frasi = useFrasi()
  const testi = TESTI[piano]
  return (
    <div style={{ background: sfondo ? sfondoPiano(piano) : 'transparent', color: '#fff', padding: '12px 16px 20px' }}>
      <Link to="/impostazioni/abbonamento" aria-label={frasi.homeIndietro} style={indietro}>
        <ArrowLeft size={18} strokeWidth={2} aria-hidden />
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <span style={{ width: 96, height: 96, borderRadius: 48, padding: 4, background: 'rgba(255,255,255,.25)', boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}>
          <img alt="" src={testi.icona} style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
        </span>
        <h1 style={{ margin: 0, lineHeight: 0 }}>
          <img alt={frasi[testi.nome]} src={testi.scritta} style={{ height: 32, width: 'auto', display: 'block' }} />
        </h1>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.4, opacity: 0.92, maxWidth: 300 }}>{frasi[testi.claim]}</p>
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

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: sfondoPiano(piano), color: '#fff' }}>
      <div style={{ flex: 1 }}>
        <TestataPiano piano={piano} sfondo={false}>
          <p style={{ margin: 0 }}>
            <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{PREZZI[piano]}</span>
            <span style={{ opacity: 0.85 }}> {frasi.abbMese}</span>
          </p>
        </TestataPiano>
        <ul style={{ listStyle: 'none', margin: '0 16px 16px', padding: '6px 14px', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 22 }}>
          {FUNZIONI[piano].map(({ chiave, icona: Icona }, index) => (
            <li key={chiave} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', fontWeight: 600, fontSize: 15, borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,.15)' }}>
              <span aria-hidden style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,.95)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icona size={16} strokeWidth={2.2} color={COLORE_PIANO[piano]} />
              </span>
              <span>{frasi[chiave]}</span>
            </li>
          ))}
        </ul>
        <section style={{ margin: '0 20px 20px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>{frasi.abbComeFunziona}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, opacity: 0.85 }}>{frasi[testi.come]}</p>
        </section>
      </div>
      <div style={{ position: 'sticky', bottom: 0, padding: '14px 18px calc(18px + env(safe-area-inset-bottom, 0px))', background: `linear-gradient(to bottom, transparent, ${COLORE_PIANO_SCURO[piano]} 22%)` }}>
        {collaboratore ? (
          <p style={{ margin: 0, textAlign: 'center', fontWeight: 700 }}>{frasi.pianoLoAccendeTitolare}</p>
        ) : (
          <>
            {provaDisponibile ? (
              <button
                type="button"
                onClick={() => { void stato.prova() }}
                style={{ display: 'block', width: '100%', minHeight: 52, marginBottom: 10, border: 0, borderRadius: 999, background: '#fff', color: COLORE_PIANO_SCURO[piano], font: 'inherit', fontWeight: 800, fontSize: 17, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }}
              >
                {frasi.provaGratis}
              </button>
            ) : null}
            <button
              type="button"
              onClick={abbonati}
              style={provaDisponibile
                ? { display: 'block', width: '100%', minHeight: 48, border: '2px solid #fff', borderRadius: 999, background: 'transparent', color: '#fff', font: 'inherit', fontWeight: 800, fontSize: 16 }
                : { display: 'block', width: '100%', minHeight: 52, border: 0, borderRadius: 999, background: '#fff', color: COLORE_PIANO_SCURO[piano], font: 'inherit', fontWeight: 800, fontSize: 17, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }}
            >
              {frasi.abbAbbonati}
            </button>
            <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 12, opacity: 0.8 }}>{frasi.abbDisdici}</p>
          </>
        )}
      </div>
      <Dialog open={inArrivo} title={frasi.abbInArrivoTitolo} onClose={() => setInArrivo(false)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.abbInArrivoTesto}</p>
        <Button onClick={() => setInArrivo(false)}>{frasi.notCapito}</Button>
      </Dialog>
    </div>
  )
}
