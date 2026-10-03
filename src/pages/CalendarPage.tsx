import { addDays } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { localDayKey, onLocalDay, parseDayParam } from '../lib/appointments'
import { formatHomeDate } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const day = parseDayParam(searchParams.get('data'), new Date())
  const rows = onLocalDay(appointments, day)

  function goTo(next: Date) {
    setSearchParams({ data: localDayKey(next) })
  }

  return (
    <ShellFrame>
      <Header title="Calendario" subtitle={formatHomeDate(day)} />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Button type="button" variant="ghost" onClick={() => goTo(addDays(day, -1))}>Giorno prima</Button>
        <Button type="button" variant="ghost" onClick={() => goTo(addDays(day, 1))}>Giorno dopo</Button>
        <Button type="button" variant="ghost" onClick={() => goTo(new Date())}>Oggi</Button>
      </div>
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
        ) : (
          rows.map((appointment) => (
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
