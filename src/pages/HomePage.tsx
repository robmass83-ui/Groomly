import { Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SearchBar } from '../components/ui/SearchBar'
import { formatHomeDate } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function HomePage() {
  const navigate = useNavigate()
  return (
    <ShellFrame>
      <Header
        title="Groomly"
        subtitle={formatHomeDate(new Date())}
        action={(
          <Link to="/impostazioni" aria-label="Impostazioni" style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center' }}>
            <Settings size={16} strokeWidth={2} aria-hidden />
          </Link>
        )}
      />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar onClick={() => navigate('/animali')} />
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>In arrivo</p>
      </div>
    </ShellFrame>
  )
}
