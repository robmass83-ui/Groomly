import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { bannerCopy, monthlyLists } from '../../lib/monthly'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog } from '../../types/models'

export function MonthlyBanner({ dogs, appointments }: { dogs: Dog[]; appointments: Appointment[] }) {
  const navigate = useNavigate()
  const copy = bannerCopy(monthlyLists(dogs, appointments, new Date()).toBook)
  if (!copy) return null
  return (
    <section
      aria-label="Mensili da programmare"
      style={{ background: 'var(--tea-s)', color: 'var(--tea)', borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: TYPE.base }}>{copy.title}</p>
        <p style={{ margin: 0, fontSize: TYPE.base, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{copy.names}</p>
      </div>
      <Button variant="ghost" onClick={() => navigate('/mensili')} style={{ color: 'var(--tea)' }}>Vedi</Button>
    </section>
  )
}
