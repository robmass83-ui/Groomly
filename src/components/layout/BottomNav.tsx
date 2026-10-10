import { CalendarDays, FileText, Home, PawPrint, Plus, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/animali', label: 'Animali', icon: PawPrint },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/listino', label: 'Listino', icon: FileText },
  { to: '/impostazioni', label: 'Altro', icon: Settings },
] as const

export function BottomNav({ onFab }: { onFab?: () => void }) {
  const linkStyle = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, fontSize: TYPE.navLabel, fontWeight: 600, color: 'var(--tx3)', textDecoration: 'none' }
  const stateStyle = ({ isActive }: { isActive: boolean }) => ({ ...linkStyle, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--pri)' : 'var(--tx3)' })
  return (
    <nav style={{ position: 'relative', height: SIZES.bottomNav.h, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'end', paddingBottom: 6, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
      {items.map((item) => <NavLink key={item.to} to={item.to} style={stateStyle}><item.icon size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />{item.label}</NavLink>)}
      <button type="button" aria-label="Apri azioni" onClick={onFab} style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)', width: SIZES.bottomNav.fab, height: SIZES.bottomNav.fab, borderRadius: SIZES.bottomNav.fabRadius, border: 0, background: 'var(--pri)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow)', zIndex: 1 }}>
        <Plus size={SIZES.bottomNav.icon} strokeWidth={2} aria-hidden />
      </button>
    </nav>
  )
}
