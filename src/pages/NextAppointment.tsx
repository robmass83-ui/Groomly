import { addWeeks, format, isSameDay } from 'date-fns'
import { useState } from 'react'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { chipOpenDay, chipSource, formatBookedWhen, formatDuration, isStartTime, localDayKey, nextAppointment, shiftWeeks, sumDuration } from '../lib/appointments'
import { IT_DATE } from '../lib/format'
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

const sheetButton = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left',
  padding: '6px 0',
} as const

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function nextLabel(start: Date, now: Date): string {
  const time = clock(start)
  if (isSameDay(start, now)) return `Prossimo: oggi ${time}`
  return `Prossimo: ${formatBookedWhen(start)}`
}

function futureScheduled(items: Appointment[], dogId: string, now: Date): Appointment[] {
  return items
    .filter((item) => item.dogId === dogId && item.status === 'programmato' && item.start.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
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
  const openSheet = useOpenSheet()
  const toast = useToast()
  const [pending, setPending] = useState<{ run: () => void } | null>(null)
  const now = new Date()
  const upcoming = nextAppointment(appointments, dog.id, now)
  const scheduled = futureScheduled(appointments, dog.id, now)

  function guarded(run: () => void) {
    if (scheduled.length === 0) {
      run()
      return
    }
    setPending({ run })
  }

  function confirmPending() {
    const chosen = pending
    setPending(null)
    chosen?.run()
  }

  function book(weeks: 2 | 4 | 6) {
    const source = chipSource(appointments, dog.id, new Date())
    if (!source) {
      openSheet(`/appuntamenti/nuovo?cane=${dog.id}&data=${chipOpenDay(new Date(), weeks)}`)
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
    openSheet(`/appuntamenti/nuovo?${params.toString()}`)
  }

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
        <>
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
          {dog.status === 'attivo' ? (
            <button type="button" onClick={() => openSheet(`/appuntamenti/nuovo?cane=${dog.id}`)} style={{ ...chipStyle, alignSelf: 'flex-start', color: 'var(--pri)' }}>Fissa appuntamento</button>
          ) : null}
        </>
      )}
      {dog.status === 'attivo' ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WEEK_CHIPS.map((weeks) => (
            <button key={weeks} type="button" onClick={() => guarded(() => book(weeks))} style={chipStyle}>
              +{weeks} sett
            </button>
          ))}
          <button type="button" onClick={() => guarded(successivo)} style={chipStyle}>Fissa il prossimo</button>
          <button type="button" onClick={() => openSheet(`/appuntamenti/nuovo?cane=${dog.id}`)} style={chipStyle}>Data…</button>
        </div>
      ) : null}
      <Sheet open={pending !== null} title="Appuntamento già fissato" onClose={() => setPending(null)}>
        <p style={{ margin: 0 }}>{`${dog.name} ha già un appuntamento il ${scheduled[0] ? format(scheduled[0].start, 'd MMM', IT_DATE) : ''}. Crearne un altro?`}</p>
        <button type="button" style={sheetButton} onClick={confirmPending}>Crea</button>
        <button type="button" style={sheetButton} onClick={() => setPending(null)}>Annulla</button>
      </Sheet>
    </div>
  )
}
