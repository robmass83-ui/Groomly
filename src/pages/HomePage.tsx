import { Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { Header } from '../components/layout/Header'
import { SearchBar } from '../components/ui/SearchBar'
import { SectionTitle } from '../components/ui/SectionTitle'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { formatHomeDate } from '../lib/format'
import { onLocalDay } from '../lib/appointments'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function HomePage() {
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const today = onLocalDay(appointments, new Date())

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
        <SearchBar onClick={() => navigate('/animali', { state: { focusSearch: true } })} />
        <SectionTitle>Oggi</SectionTitle>
        {today.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
        ) : (
          today.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              dog={dogs.find((item) => item.id === appointment.dogId)}
            />
          ))
        )}
      </div>
    </ShellFrame>
  )
}
