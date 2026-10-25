import { useNavigate } from 'react-router-dom'
import { useFrasi } from '../../i18n/LinguaContext'
import { Button } from '../ui/Button'
import { useSettings } from '../../hooks/useSettings'
import { dueSoon } from '../../lib/cycle'
import { bannerCopy } from '../../lib/monthly'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog } from '../../types/models'

export function MonthlyBanner({ dogs, appointments }: { dogs: Dog[]; appointments: Appointment[] }) {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const daysBefore = settings.monthlyReminder.daysBefore
  const due = dueSoon(dogs, appointments, new Date(), daysBefore)
  const copy = bannerCopy(due)
  if (!copy) return null
  const titolo = due.length === 1 ? frasi.mensiliUno : frasi.mensiliAltri.replace('{{n}}', String(due.length))
  return (
    <section
      aria-label={frasi.mensiliRegione}
      style={{ background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: TYPE.base }}>{titolo}</p>
        <p style={{ margin: 0, fontSize: TYPE.base, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{frasi.mensiliScadono.replace('{{n}}', String(daysBefore))}</p>
      </div>
      <Button variant="ghost" onClick={() => navigate('/mensili')} style={{ color: 'var(--warn)' }}>{frasi.mensiliVedi}</Button>
    </section>
  )
}
