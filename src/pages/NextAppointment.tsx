import { addWeeks, isSameDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/layout/Toast'
import { chipOpenDay, chipSource, formatBookedWhen, formatDuration, isStartTime, localDayKey, nextAppointment, shiftWeeks, sumDuration } from '../lib/appointments'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentWrite, Dog } from '../types/models'

const WEEK_CHIPS = [2, 4, 6] as const

const chipStyle = {
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--tx)',
  borderRadius: SIZES.chip.radius,
  padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
  fontSize: SIZES.chip.font,
  fontWeight: 600,
} as const

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
  saveNew,
  remove,
  lastCreatedId,
}: {
  dog: Dog
  appointments: Appointment[]
  saveNew: (input: AppointmentWrite) => boolean
  remove: (id: string) => boolean
  lastCreatedId: { current: string | null }
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const now = new Date()
  const upcoming = nextAppointment(appointments, dog.id, now)

  function book(weeks: 2 | 4 | 6) {
    const source = chipSource(appointments, dog.id, new Date())
    if (!source) {
      navigate(`/appuntamenti/nuovo?cane=${dog.id}&data=${chipOpenDay(new Date(), weeks)}`)
      return
    }
    const start = shiftWeeks(source.start, weeks)
    const saved = saveNew({
      dogId: source.dogId,
      start,
      services: source.services.map((line) => ({ ...line })),
    })
    if (!saved) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show(`Fissato per ${formatBookedWhen(start)}`, 'plain', {
      label: 'Annulla',
      onClick: () => {
        const created = lastCreatedId.current
        if (!created || !remove(created)) toast.show('Salvataggio non riuscito', 'plain')
      },
    })
  }

  function successivo() {
    const source = chipSource(appointments, dog.id, new Date())
    const start = source ? shiftWeeks(source.start, 4) : addWeeks(new Date(), 4)
    const params = new URLSearchParams()
    params.set('cane', dog.id)
    params.set('data', localDayKey(start))
    const ora = clock(start)
    if (isStartTime(ora)) params.set('ora', ora)
    const ids = source?.services.map((line) => line.serviceId).filter((id) => id !== '') ?? []
    if (ids.length > 0) params.set('servizi', ids.join(','))
    navigate(`/appuntamenti/nuovo?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {upcoming ? (
        <button
          type="button"
          onClick={() => navigate(`/appuntamenti/${upcoming.id}`)}
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
      {dog.status === 'attivo' ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WEEK_CHIPS.map((weeks) => (
            <button key={weeks} type="button" onClick={() => book(weeks)} style={chipStyle}>
              +{weeks} sett
            </button>
          ))}
          <button type="button" onClick={successivo} style={chipStyle}>Successivo +</button>
          <button type="button" onClick={() => navigate(`/appuntamenti/nuovo?cane=${dog.id}`)} style={chipStyle}>Data…</button>
        </div>
      ) : null}
    </div>
  )
}
