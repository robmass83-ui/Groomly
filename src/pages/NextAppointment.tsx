import { isSameDay } from 'date-fns'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { formatBookedWhen, formatDuration, nextAppointment, sumDuration } from '../lib/appointments'
import { TYPE } from '../theme/theme'
import type { Appointment, Dog } from '../types/models'

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function nextLabel(start: Date, now: Date): string {
  const time = clock(start)
  if (isSameDay(start, now)) return `Prossimo: oggi ${time}`
  return `Prossimo: ${formatBookedWhen(start)}`
}

export function NextAppointment({
  dog,
  appointments,
}: {
  dog: Dog
  appointments: Appointment[]
}) {
  const openSheet = useOpenSheet()
  const now = new Date()
  const upcoming = nextAppointment(appointments, dog.id, now)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {upcoming ? (
        <button
          type="button"
          onClick={() => openSheet(`/appuntamenti/${upcoming.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            textAlign: 'left',
            border: 0,
            borderBottom: '1px solid var(--line)',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            padding: '4px 0',
          }}
        >
          <span style={{ fontSize: TYPE.base }}>{nextLabel(upcoming.start, now)}</span>
          <span style={{ fontSize: TYPE.base }}>{upcoming.services.map((line) => line.name).join(', ')}</span>
          <span style={{ fontSize: TYPE.base, color: 'var(--tx3)' }}>{formatDuration(sumDuration(upcoming.services))}</span>
        </button>
      ) : (
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
      )}
    </div>
  )
}
