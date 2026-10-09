import { CalendarDays, FileText, Home, PawPrint, Plus } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/animali', label: 'Animali', icon: PawPrint },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/listino', label: 'Listino', icon: FileText },
] as const

export function BottomNav({ onFab }: { onFab?: () => void }) {
  const left = items.slice(0, 2)
  const right = items.slice(2)
  const linkStyle = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, fontSize: TYPE.navLabel, fontWeight: 600, color: 'var(--tx3)', textDecoration: 'none' }
  return (
    <nav style={{ height: SIZES.bottomNav.h, display: 'grid', gridTemplateColumns: '1fr 1fr 58px 1fr 1fr', alignItems: 'center', borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
      {left.map((item) => <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--pri)' : 'var(--tx3)' })}><item.icon size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />{item.label}</NavLink>)}
      <button type="button" aria-label="Apri azioni" onClick={onFab} style={{ width: SIZES.bottomNav.fab, height: SIZES.bottomNav.fab, borderRadius: SIZES.bottomNav.fabRadius, border: 0, background: 'var(--pri)', color: '#fff', justifySelf: 'center', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow)' }}>
        <Plus size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />
      </button>
      {right.map((item) => <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...linkStyle, color: isActive ? 'var(--pri)' : 'var(--tx3)' })}><item.icon size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />{item.label}</NavLink>)}
    </nav>
  )
}
