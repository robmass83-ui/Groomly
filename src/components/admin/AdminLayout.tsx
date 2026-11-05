import { ChartColumn, CreditCard, FlaskConical, LayoutDashboard, LifeBuoy, Megaphone, MoreHorizontal, Plus, ScrollText, Search, Settings, Store, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { logoTestataPer } from '../layout/BrandBar'
import { Button } from '../ui/Button'
import { useDesktop } from '../../hooks/useDesktop'
import { useEsci } from '../../hooks/useEsci'
import { useFrasi } from '../../i18n/LinguaContext'
import {
  PERCORSO_ADMIN,
  PERCORSO_ALTRO,
  PERCORSO_ASSISTENZA,
  PERCORSO_BETA,
  PERCORSO_COMUNICAZIONI,
  PERCORSO_METRICHE, PERCORSO_PIANI,
  PERCORSO_REGISTRO,
  PERCORSO_SALONI,
  PERCORSO_SISTEMA,
} from '../../lib/percorsoAdmin'
import { useDocumentTheme } from '../../theme/useDocumentTheme'
import { useAdminDati } from './AdminDati'
import { AzioniRapide } from './AzioniRapide'
import { Bollino, CON_ICONA, STILE_ADMIN } from './comuni'
import { RicercaAdmin } from './RicercaAdmin'

const TITOLO = 'Groomly Admin'
const ALTEZZA_BARRA = 60
const ALTEZZA_LOGO = 30
const LATO_TASTO_PIU = 56

type Voce = { to: string; nome: string; icona: LucideIcon; nuovi?: number; fine?: boolean }

const voceLaterale = ({ isActive }: { isActive: boolean }): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 40,
  padding: '0 10px',
  borderRadius: 8,
  fontWeight: 600,
  textDecoration: 'none',
  background: isActive ? 'var(--pri-s)' : 'transparent',
  color: isActive ? 'var(--pri-ink)' : 'var(--tx2)',
})

const voceBasso = (attiva: boolean): CSSProperties => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  fontSize: 11,
  fontWeight: 600,
  textDecoration: 'none',
  color: attiva ? 'var(--pri)' : 'var(--tx2)',
})

export function useVociAdmin(): { principali: Voce[]; altre: Voce[] } {
  const frasi = useFrasi()
  const { nuoviBeta, nuoveRichieste } = useAdminDati()
  return {
    principali: [
      { to: PERCORSO_ADMIN, nome: frasi.consOggi, icona: LayoutDashboard, fine: true },
      { to: PERCORSO_SALONI, nome: frasi.amTabSaloni, icona: Store },
      { to: PERCORSO_ASSISTENZA, nome: frasi.consAssistenza, icona: LifeBuoy, nuovi: nuoveRichieste },
    ],
    altre: [
      { to: PERCORSO_BETA, nome: frasi.amTabBeta, icona: FlaskConical, nuovi: nuoviBeta },
      { to: PERCORSO_COMUNICAZIONI, nome: frasi.consComunicazioni, icona: Megaphone },
      { to: PERCORSO_PIANI, nome: frasi.amTabPiani, icona: CreditCard },
      { to: PERCORSO_METRICHE, nome: frasi.metriche, icona: ChartColumn },
      { to: PERCORSO_REGISTRO, nome: frasi.consRegistro, icona: ScrollText },
      { to: PERCORSO_SISTEMA, nome: frasi.consSistema, icona: Settings },
    ],
  }
}

function MenuLaterale() {
  const frasi = useFrasi()
  const { principali, altre } = useVociAdmin()
  return (
    <nav aria-label={frasi.consMenu} style={{ width: 200, flex: 'none', position: 'sticky', top: 56, alignSelf: 'flex-start', height: 'calc(100dvh - 56px)', boxSizing: 'border-box', padding: 8, display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--card)', borderRight: '1px solid var(--line)' }}>
      {[...principali, ...altre].map(({ to, nome, icona: Icona, nuovi, fine }) => (
        <NavLink key={to} to={to} end={fine} style={voceLaterale}>
          <Icona size={17} strokeWidth={2} aria-hidden />
          <span style={{ flex: 1 }}>{nome}</span>
          <Bollino n={nuovi ?? 0} etichetta={frasi.amNuovi.replace('{{n}}', String(nuovi ?? 0))} />
        </NavLink>
      ))}
    </nav>
  )
}

function VoceBasso({ to, nome, icona: Icona, nuovi, fine }: Voce) {
  const frasi = useFrasi()
  return (
    <NavLink to={to} end={fine} style={({ isActive }) => voceBasso(isActive)}>
      <Icona size={19} strokeWidth={2} aria-hidden />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nome}
        <Bollino n={nuovi ?? 0} etichetta={frasi.amNuovi.replace('{{n}}', String(nuovi ?? 0))} />
      </span>
    </NavLink>
  )
}

function BarraBasso({ onAzioni }: { onAzioni: () => void }) {
  const frasi = useFrasi()
  const { pathname } = useLocation()
  const { principali, altre } = useVociAdmin()
  const suAltro = pathname === PERCORSO_ALTRO || altre.some((voce) => pathname.startsWith(voce.to))
  const nuoviAltro = altre.reduce((somma, voce) => somma + (voce.nuovi ?? 0), 0)
  return (
    <nav aria-label={frasi.consMenu} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', minHeight: ALTEZZA_BARRA, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'var(--card)', borderTop: '1px solid var(--line)' }}>
      {principali.slice(0, 2).map((voce) => <VoceBasso key={voce.to} {...voce} />)}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <button type="button" aria-label={frasi.consNuovaAzione} onClick={onAzioni} style={{ width: LATO_TASTO_PIU, height: LATO_TASTO_PIU, marginTop: -20, border: 0, borderRadius: '50%', background: 'var(--pri-solid)', color: 'var(--on-pri)', boxShadow: 'var(--sh-btn)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Plus size={24} strokeWidth={2} aria-hidden />
        </button>
      </span>
      {principali.slice(2).map((voce) => <VoceBasso key={voce.to} {...voce} />)}
      <NavLink to={PERCORSO_ALTRO} style={voceBasso(suAltro)}>
        <MoreHorizontal size={19} strokeWidth={2} aria-hidden />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {frasi.consAltro}
          <Bollino n={nuoviAltro} etichetta={frasi.amNuovi.replace('{{n}}', String(nuoviAltro))} />
        </span>
      </NavLink>
    </nav>
  )
}

/** La cornice della Console: nessun hook del salone, perché l'admin un salone non ce l'ha. */
export function AdminLayout() {
  const frasi = useFrasi()
  const desktop = useDesktop()
  const { esci, foglio, occupato } = useEsci()
  const scuro = useDocumentTheme() === 'dark'
  const [aperto, setAperto] = useState<'ricerca' | 'azioni' | null>(null)
  const chiudi = () => setAperto(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setAperto('ricerca')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div data-testid="admin-layout" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--tx)', paddingTop: 'var(--safe-top)' }}>
      <style>{STILE_ADMIN}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 21, display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, padding: '0 14px', background: 'var(--card)', color: 'var(--tx)', borderBottom: '1px solid var(--line)' }}>
        <img alt={TITOLO} src={logoTestataPer(undefined, scuro)} height={ALTEZZA_LOGO} style={{ display: 'block', height: ALTEZZA_LOGO, width: 'auto' }} />
        <span style={{ flex: 1 }} />
        {desktop ? <Button size="sm" style={CON_ICONA} onClick={() => setAperto('azioni')}><Plus size={16} aria-hidden />{frasi.consNuovaAzione}</Button> : null}
        <button type="button" aria-label={frasi.consCerca} onClick={() => setAperto('ricerca')} style={{ width: 44, height: 44, border: 0, borderRadius: '50%', background: 'var(--surf)', color: 'inherit', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Search size={18} strokeWidth={2} aria-hidden />
        </button>
        <button type="button" disabled={occupato} onClick={esci} style={{ border: 0, background: 'transparent', color: 'var(--tx2)', font: 'inherit', fontWeight: 600, minHeight: 44, padding: '0 6px' }}>{frasi.impEsci}</button>
      </div>
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        {desktop ? <MenuLaterale /> : null}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: desktop ? 24 : ALTEZZA_BARRA + 32 }}>
          <div style={{ maxWidth: desktop ? 1180 : 640, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
      {desktop ? null : <BarraBasso onAzioni={() => setAperto('azioni')} />}
      {aperto === 'ricerca' ? <RicercaAdmin onChiudi={chiudi} /> : null}
      {aperto === 'azioni' ? <AzioniRapide onChiudi={chiudi} onCerca={() => setAperto('ricerca')} /> : null}
      {foglio}
    </div>
  )
}
