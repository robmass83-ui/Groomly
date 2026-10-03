import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/layout/Toast'
import { useAppointments } from '../hooks/useAppointments'
import { chipOpenDay, chipSource, formatBookedWhen, formatDuration, nextAppointment, shiftWeeks, sumDuration } from '../lib/appointments'
import { formatHomeDate } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'

const WEEK_CHIPS = [2, 4, 6] as const

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function NextAppointment({ dog, uid }: { dog: Dog; uid: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { appointments, saveNew, remove, lastCreatedId } = useAppointments(uid)
  const upcoming = nextAppointment(appointments, dog.id, new Date())

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Prossimo appuntamento</div>
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
          <span style={{ fontSize: TYPE.base }}>{formatHomeDate(upcoming.start)}</span>
          <span style={{ fontSize: TYPE.base }}>{clock(upcoming.start)}</span>
          <span style={{ fontSize: TYPE.base }}>{upcoming.services.map((line) => line.name).join(', ')}</span>
          <span style={{ fontSize: TYPE.base, color: 'var(--tx3)' }}>{formatDuration(sumDuration(upcoming.services))}</span>
        </button>
      ) : (
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
      )}
      {dog.status === 'attivo' ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WEEK_CHIPS.map((weeks) => (
            <button
              key={weeks}
              type="button"
              onClick={() => book(weeks)}
              style={{
                border: '1px solid var(--line)',
                background: 'transparent',
                color: 'var(--tx)',
                borderRadius: SIZES.chip.radius,
                padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
                fontSize: SIZES.chip.font,
                fontWeight: 600,
              }}
            >
              +{weeks} sett
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
