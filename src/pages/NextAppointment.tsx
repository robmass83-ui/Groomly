import { isSameDay } from 'date-fns'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { formatBookedWhen, formatDuration, nextAppointment, sumDuration } from '../lib/appointments'
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
            borderRadius: 16,
            background: 'var(--pri-s)',
            color: 'inherit',
            font: 'inherit',
            fontSize: 13,
            padding: '8px 12px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pri-ink)' }}>{nextLabel(upcoming.start, now)}</span>
          <span>{upcoming.services.map((line) => line.name).join(', ')}</span>
          <span style={{ color: 'var(--tx3)' }}>{formatDuration(sumDuration(upcoming.services))}</span>
        </button>
      ) : (
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: 14 }}>Nessun appuntamento</p>
      )}
    </div>
  )
}
