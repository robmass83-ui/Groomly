import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useSettings } from '../../hooks/useSettings'
import { dueSoon } from '../../lib/cycle'
import { bannerCopy } from '../../lib/monthly'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog } from '../../types/models'

export function MonthlyBanner({ dogs, appointments }: { dogs: Dog[]; appointments: Appointment[] }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const daysBefore = settings.monthlyReminder.daysBefore
  const copy = bannerCopy(dueSoon(dogs, appointments, new Date(), daysBefore))
  if (!copy) return null
  return (
    <section
      aria-label="Mensili da programmare"
      style={{ background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: TYPE.base }}>{copy.title}</p>
        <p style={{ margin: 0, fontSize: TYPE.base, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{`scadono entro ${daysBefore} gg`}</p>
      </div>
      <Button variant="ghost" onClick={() => navigate('/mensili')} style={{ color: 'var(--warn)' }}>Vedi</Button>
    </section>
  )
}
