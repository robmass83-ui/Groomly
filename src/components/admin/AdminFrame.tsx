import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useEsci } from '../../hooks/useEsci'
import { useFrasi } from '../../i18n/LinguaContext'
import { PERCORSO_ADMIN, PERCORSO_AVVISI_ADMIN } from '../../lib/percorsoAdmin'
import { PhoneShell } from '../layout/PhoneShell'

const TITOLO = 'Groomly Admin'

const barra: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minHeight: 48,
  padding: '0 12px',
  borderBottom: '1px solid var(--line)',
  background: 'var(--card)',
}

const azione: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'var(--pri)',
  font: 'inherit',
  fontWeight: 700,
  minHeight: 44,
  padding: '0 6px',
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
}

/** La cornice dell'admin: nessun hook del salone, perché l'admin un salone non ce l'ha. */
export function AdminFrame({ children }: { children: ReactNode }) {
  const frasi = useFrasi()
  const { esci, foglio, occupato } = useEsci()
  const { pathname } = useLocation()
  const suAvvisi = pathname === PERCORSO_AVVISI_ADMIN
  return (
    <PhoneShell>
      <div style={barra}>
        <strong style={{ flex: 1 }}>{TITOLO}</strong>
        <Link to={suAvvisi ? PERCORSO_ADMIN : PERCORSO_AVVISI_ADMIN} style={azione}>{suAvvisi ? frasi.adminManager : frasi.hubAvvisi}</Link>
        <button type="button" disabled={occupato} onClick={esci} style={azione}>{frasi.impEsci}</button>
      </div>
      {children}
      {foglio}
    </PhoneShell>
  )
}
