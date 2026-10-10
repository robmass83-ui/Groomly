import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SIZES } from '../../theme/sizes'

export function BackBar({ to }: { to: string }) {
  return (
    <nav data-testid="back-bar" style={{ height: SIZES.bottomNav.h, display: 'flex', alignItems: 'center', padding: `0 ${SIZES.pagePadX}px`, borderTop: '1px solid var(--line)', background: 'var(--card)' }}>
      <Link to={to} replace style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, color: 'var(--tx)', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
        <ArrowLeft size={22} strokeWidth={2} aria-hidden />
        Indietro
      </Link>
    </nav>
  )
}
