import { ChartColumn, CreditCard, FlaskConical, LayoutDashboard, LifeBuoy, Megaphone, MoreHorizontal, ScrollText, Settings, Store, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
import { useAdminDati } from './AdminDati'
import { Bollino, STILE_ADMIN } from './comuni'

const TITOLO = 'Groomly Admin'
const ALTEZZA_BARRA = 60

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
      { to: PERCORSO_ADMIN, nome: frasi.amTabPanoramica, icona: LayoutDashboard, fine: true },
      { to: PERCORSO_SALONI, nome: frasi.amTabSaloni, icona: Store },
      { to: PERCORSO_ASSISTENZA, nome: frasi.consAssistenza, icona: LifeBuoy, nuovi: nuoveRichieste },
      { to: PERCORSO_BETA, nome: frasi.amTabBeta, icona: FlaskConical, nuovi: nuoviBeta },
    ],
    altre: [
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
    <nav aria-label={frasi.consMenu} style={{ width: 200, flex: 'none', position: 'sticky', top: 48, alignSelf: 'flex-start', height: 'calc(100dvh - 48px)', boxSizing: 'border-box', padding: 8, display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--card)', borderRight: '1px solid var(--line)' }}>
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

function BarraBasso() {
  const frasi = useFrasi()
  const { pathname } = useLocation()
  const { principali, altre } = useVociAdmin()
  const suAltro = pathname === PERCORSO_ALTRO || altre.some((voce) => pathname.startsWith(voce.to))
  return (
    <nav aria-label={frasi.consMenu} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, display: 'flex', minHeight: ALTEZZA_BARRA, paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'var(--card)', borderTop: '1px solid var(--line)' }}>
      {principali.map(({ to, nome, icona: Icona, nuovi, fine }) => (
        <NavLink key={to} to={to} end={fine} style={({ isActive }) => voceBasso(isActive)}>
          <Icona size={19} strokeWidth={2} aria-hidden />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nome}
            <Bollino n={nuovi ?? 0} etichetta={frasi.amNuovi.replace('{{n}}', String(nuovi ?? 0))} />
          </span>
        </NavLink>
      ))}
      <NavLink to={PERCORSO_ALTRO} style={voceBasso(suAltro)}>
        <MoreHorizontal size={19} strokeWidth={2} aria-hidden />
        <span>{frasi.consAltro}</span>
      </NavLink>
    </nav>
  )
}

/** La cornice della Console: nessun hook del salone, perché l'admin un salone non ce l'ha. */
export function AdminLayout() {
  const frasi = useFrasi()
  const desktop = useDesktop()
  const { esci, foglio, occupato } = useEsci()
  return (
    <div data-testid="admin-layout" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--tx)', paddingTop: 'var(--safe-top)' }}>
      <style>{STILE_ADMIN}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 21, display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '0 14px', background: 'var(--admin-bar)', color: '#fff' }}>
        <strong style={{ flex: 1 }}>{TITOLO}</strong>
        <button type="button" disabled={occupato} onClick={esci} style={{ border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600, minHeight: 44, padding: '0 6px' }}>{frasi.impEsci}</button>
      </div>
      <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        {desktop ? <MenuLaterale /> : null}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: desktop ? 24 : ALTEZZA_BARRA + 16 }}>
          <div style={{ maxWidth: desktop ? 1180 : 640, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
      {desktop ? null : <BarraBasso />}
      {foglio}
    </div>
  )
}
