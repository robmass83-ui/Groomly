import { addDays, addMonths, format, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Segmented } from '../components/ui/Segmented'
import { ensureServiceSeed } from '../data/local/services'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { localDayKey, onLocalDay, parseDayParam, sumDuration } from '../lib/appointments'
import { blockTone, daySummary, parseVista, snapQuarter, weekDays, type CalendarVista } from '../lib/calendarView'
import { formatCompactDuration, splitCritical } from '../lib/display'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentWrite, Dog, Service } from '../types/models'
import { ShellFrame } from './ShellFrame'

const TONE_INK = { warn: 'var(--warn)', sen: 'var(--sen)', tea: 'var(--tea)', pri: 'var(--pri)' } as const
const TONE_FILL = { warn: 'var(--warn-s)', sen: 'var(--sen-s)', tea: 'var(--tea-s)', pri: 'var(--pri-s)' } as const
const GRID_HEIGHT = (SIZES.calendar.endHour - SIZES.calendar.startHour) * SIZES.calendar.hourHeight

function monthTitle(date: Date): string {
  const raw = format(date, 'MMMM yyyy', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function weekdayShort(date: Date): string {
  const raw = format(date, 'EEE', IT_DATE).replace(/\./g, '')
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function summaryText(summary: { dogs: number; minutes: number; mordaci: number }): string {
  const base = `${summary.dogs} cani · ${formatCompactDuration(summary.minutes)} stimate`
  if (summary.mordaci > 0) return `${base} · ${summary.mordaci} mordace`
  return base
}

function monthCells(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first, { weekStartsOn: IT_DATE.weekStartsOn })
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const end = addDays(startOfWeek(last, { weekStartsOn: IT_DATE.weekStartsOn }), 6)
  const cells: Date[] = []
  let cursor = start
  while (localDayKey(cursor) <= localDayKey(end) && cells.length < 42) {
    cells.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return cells
}

function scopedAppointments(vista: CalendarVista, day: Date, all: Appointment[]): Appointment[] {
  if (vista === 'giorno') return onLocalDay(all, day)
  if (vista === 'settimana') {
    const keys = new Set(weekDays(day).map((item) => localDayKey(item)))
    return all.filter((item) => keys.has(localDayKey(item.start)))
  }
  return all.filter((item) => item.start.getFullYear() === day.getFullYear() && item.start.getMonth() === day.getMonth())
}

function toWrite(appointment: Appointment, start: Date): AppointmentWrite {
  const write: AppointmentWrite = {
    dogId: appointment.dogId,
    start,
    services: appointment.services.map((line) => ({ ...line })),
  }
  if (appointment.total !== undefined) write.total = appointment.total
  if (appointment.seriesId) write.seriesId = appointment.seriesId
  return write
}

function nowTop(day: Date, now: Date): number | null {
  if (localDayKey(day) !== localDayKey(now)) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  const start = SIZES.calendar.startHour * 60
  const end = SIZES.calendar.endHour * 60
  if (minutes < start || minutes > end) return null
  return ((minutes - start) / 60) * SIZES.calendar.hourHeight
}

function columnFromPoint(x: number, origin: HTMLElement): HTMLElement {
  const columns = document.querySelectorAll<HTMLElement>('[data-day-column]')
  for (const column of columns) {
    const rect = column.getBoundingClientRect()
    if (rect.width > 0 && x >= rect.left && x < rect.right) return column
  }
  return origin.closest<HTMLElement>('[data-day-column]') ?? origin
}

function Dots({ count, selected }: { count: number; selected: boolean }) {
  const shown = Math.min(3, count)
  return (
    <span style={{ display: 'flex', gap: 2, justifyContent: 'center', height: 4 }}>
      {Array.from({ length: shown }, (_, index) => (
        <span key={index} style={{ width: 4, height: 4, borderRadius: 999, background: selected ? '#fff' : 'var(--pri)' }} />
      ))}
    </span>
  )
}

function AppointmentBlock({
  appointment,
  dog,
  services,
  compact,
  onMove,
}: {
  appointment: Appointment
  dog: Dog | undefined
  services: Service[]
  compact: boolean
  onMove: (event: PointerEvent<HTMLButtonElement>, appointment: Appointment) => void
}) {
  const navigate = useNavigate()
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const moved = useRef(false)
  const name = dog?.name ?? 'Cane assente'
  const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
  const tone = blockTone(
    dog?.clientType ?? 'occasionale',
    appointment.services.map((line) => services.find((service) => service.id === line.serviceId)?.iconKey),
  )
  const startMinutes = appointment.start.getHours() * 60 + appointment.start.getMinutes()
  const top = ((startMinutes - SIZES.calendar.startHour * 60) / 60) * SIZES.calendar.hourHeight
  const height = Math.max((sumDuration(appointment.services) / 60) * SIZES.calendar.hourHeight, 18)

  return (
    <button
      type="button"
      aria-label={`Apri ${name}`}
      onPointerDown={(event) => {
        event.stopPropagation()
        moved.current = false
        const node = event.currentTarget
        if (typeof node.setPointerCapture === 'function') {
          try { node.setPointerCapture(event.pointerId) } catch { /* happy-dom */ }
        }
        drag.current = { x: event.clientX, y: event.clientY, moved: false }
      }}
      onPointerMove={(event) => {
        const state = drag.current
        if (!state) return
        if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 6) state.moved = true
      }}
      onPointerUp={(event) => {
        const state = drag.current
        drag.current = null
        if (!state?.moved) return
        moved.current = true
        onMove(event, appointment)
      }}
      onClick={(event) => {
        if (moved.current) {
          moved.current = false
          event.preventDefault()
          event.stopPropagation()
          return
        }
        navigate(`/appuntamenti/${appointment.id}`)
      }}
      style={{
        position: 'absolute',
        zIndex: 2,
        top,
        height,
        left: 2,
        right: 2,
        overflow: 'hidden',
        border: 0,
        borderLeft: `3px solid ${TONE_INK[tone]}`,
        borderRadius: 6,
        background: TONE_FILL[tone],
        color: 'var(--tx)',
        textAlign: 'left',
        font: 'inherit',
        fontSize: TYPE.meta,
        padding: '1px 3px',
        touchAction: 'none',
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
          <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          {dog ? <TemperamentIcon kind={dog.temperament} size={compact ? 14 : SIZES.temperamentIcon.calendar} /> : null}
          {!compact && dog?.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={14} /> : null}
          {!compact && dog?.clientType === 'mensile' ? <FlagIcon kind="mensile" size={14} /> : null}
        </span>
        {compact ? null : (
          <span style={{ display: 'flex', gap: 3, overflow: 'hidden' }}>
            {appointment.services.map((line) => (
              <span key={line.serviceId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
                <ServiceIcon iconKey={services.find((service) => service.id === line.serviceId)?.iconKey} size={13} />
                {line.name}
              </span>
            ))}
          </span>
        )}
        {compact ? null : <span>{clock(appointment.start)}</span>}
        {!compact && note ? <span style={{ color: 'var(--bad)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</span> : null}
      </span>
    </button>
  )
}

function DayColumn({
  day,
  appointments,
  dogs,
  services,
  compact,
  onMove,
}: {
  day: Date
  appointments: Appointment[]
  dogs: Dog[]
  services: Service[]
  compact: boolean
  onMove: (event: PointerEvent<HTMLButtonElement>, appointment: Appointment) => void
}) {
  const navigate = useNavigate()
  const key = localDayKey(day)
  const line = nowTop(day, new Date())
  const rows = appointments
    .filter((item) => localDayKey(item.start) === key)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))

  return (
    <div
      data-day-column={key}
      style={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 0,
        height: GRID_HEIGHT,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${SIZES.calendar.hourHeight}px)`,
      }}
    >
      {Array.from({ length: SIZES.calendar.endHour - SIZES.calendar.startHour }, (_, index) => {
        const hour = SIZES.calendar.startHour + index
        return (
          <button
            key={hour}
            type="button"
            aria-label={`Nuovo ${formatHomeDate(day)} alle ${hourLabel(hour)}`}
            onClick={() => navigate(`/appuntamenti/nuovo?data=${key}&ora=${hourLabel(hour)}`)}
            style={{
              position: 'absolute',
              zIndex: 0,
              top: index * SIZES.calendar.hourHeight,
              left: 0,
              right: 0,
              height: SIZES.calendar.hourHeight,
              border: 0,
              padding: 0,
              background: 'transparent',
            }}
          />
        )
      })}
      {line == null ? null : (
        <div aria-hidden style={{ position: 'absolute', zIndex: 3, top: line, left: 0, right: 0, height: 2, background: 'var(--bad)', pointerEvents: 'none' }} />
      )}
      {rows.map((appointment) => (
        <AppointmentBlock
          key={appointment.id}
          appointment={appointment}
          dog={dogs.find((item) => item.id === appointment.dogId)}
          services={services}
          compact={compact}
          onMove={onMove}
        />
      ))}
    </div>
  )
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments, saveExisting } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const day = parseDayParam(searchParams.get('data'), new Date())
  const vista = parseVista(searchParams.get('vista'))
  const [sheetKey, setSheetKey] = useState<string | null>(null)
  const suppressClick = useRef(false)
  useEffect(() => {
    function onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return
      suppressClick.current = false
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])
  const summary = daySummary(dogs, scopedAppointments(vista, day, appointments))
  const sheetDay = sheetKey ? parseDayParam(sheetKey, day) : null
  const sheetRows = sheetDay
    ? onLocalDay(appointments, sheetDay).sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    : []

  function goTo(next: Date) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.set('data', localDayKey(next))
      return params
    })
  }

  function chooseVista(next: CalendarVista) {
    if (next !== 'mese') setSheetKey(null)
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next === 'giorno') params.delete('vista')
      else params.set('vista', next)
      return params
    })
  }

  function shiftMonth(delta: number) {
    setSheetKey(null)
    goTo(addMonths(day, delta))
  }

  function onMove(event: PointerEvent<HTMLButtonElement>, appointment: Appointment) {
    suppressClick.current = true
    queueMicrotask(() => { suppressClick.current = false })
    const column = columnFromPoint(event.clientX, event.currentTarget)
    const rect = column.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const minutes = (offsetY / SIZES.calendar.hourHeight) * 60
    const key = column.getAttribute('data-day-column') ?? localDayKey(appointment.start)
    const base = parseDayParam(key, day)
    const startMs = new Date(base.getFullYear(), base.getMonth(), base.getDate(), SIZES.calendar.startHour, 0, 0, 0).getTime()
    const next = snapQuarter(new Date(startMs + minutes * 60_000))
    const previous = new Date(appointment.start.getTime())
    if (!saveExisting(appointment.id, toWrite(appointment, next))) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show(`Spostato alle ${clock(next)}`, 'plain', {
      label: 'Annulla',
      onClick: () => {
        if (!saveExisting(appointment.id, toWrite(appointment, previous))) {
          toast.show('Salvataggio non riuscito', 'plain')
        }
      },
    })
  }

  const columns = vista === 'settimana' ? weekDays(day) : [day]

  return (
    <ShellFrame>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
          <IconButton label="Mese precedente" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden />
          </IconButton>
          <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking }}>
            {monthTitle(day)}
          </h1>
          <IconButton label="Mese successivo" onClick={() => shiftMonth(1)}>
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: `8px ${SIZES.pagePadX}px` }}>
          <Segmented
            label="Vista"
            value={vista}
            onChange={chooseVista}
            options={[
              { value: 'giorno', label: 'Giorno' },
              { value: 'settimana', label: 'Settimana' },
              { value: 'mese', label: 'Mese' },
            ]}
          />
          <Button variant="ghost" onClick={() => { setSheetKey(null); goTo(new Date()) }}>Oggi</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, padding: `0 ${SIZES.pagePadX}px` }}>
          {weekDays(day).map((date) => {
            const selected = localDayKey(date) === localDayKey(day)
            return (
              <button
                key={localDayKey(date)}
                type="button"
                aria-pressed={selected}
                aria-label={`Seleziona ${formatHomeDate(date)}`}
                onClick={() => { setSheetKey(null); goTo(date) }}
                style={{
                  border: 0,
                  borderRadius: 8,
                  background: selected ? 'var(--pri)' : 'transparent',
                  color: selected ? '#fff' : 'var(--tx)',
                  padding: '4px 0',
                  font: 'inherit',
                }}
              >
                <span style={{ display: 'block', fontSize: TYPE.meta, color: selected ? '#fff' : 'var(--tx3)' }}>{weekdayShort(date)}</span>
                <span style={{ display: 'block', fontWeight: 700 }}>{date.getDate()}</span>
                <Dots count={onLocalDay(appointments, date).length} selected={selected} />
              </button>
            )
          })}
        </div>
        <p style={{ margin: '8px 0', padding: `0 ${SIZES.pagePadX}px`, fontSize: TYPE.base }}>{summaryText(summary)}</p>
        {vista === 'mese' ? (
          <div role="grid" aria-label="Mese" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, padding: `0 ${SIZES.pagePadX}px 12px`, overflowY: 'auto' }}>
            {weekDays(day).map((date) => (
              <span key={date.getDay()} style={{ textAlign: 'center', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{weekdayShort(date)}</span>
            ))}
            {monthCells(day).map((date) => {
              const key = localDayKey(date)
              const selected = key === localDayKey(day)
              const inMonth = date.getMonth() === day.getMonth()
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  aria-label={formatHomeDate(date)}
                  onClick={() => { setSheetKey(key); goTo(date) }}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    background: selected ? 'var(--pri)' : 'transparent',
                    color: selected ? '#fff' : inMonth ? 'var(--tx)' : 'var(--tx3)',
                    padding: '4px 0',
                    font: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'block' }}>{date.getDate()}</span>
                  <Dots count={onLocalDay(appointments, date).length} selected={selected} />
                </button>
              )
            })}
          </div>
        ) : (
          <div role="grid" aria-label="Orari" style={{ display: 'flex', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: `0 ${SIZES.pagePadX}px 12px` }}>
            <div style={{ position: 'relative', width: SIZES.calendar.gutter, height: GRID_HEIGHT + 14, flex: 'none' }}>
              {Array.from({ length: SIZES.calendar.endHour - SIZES.calendar.startHour + 1 }, (_, index) => (
                <span key={index} style={{ position: 'absolute', top: index * SIZES.calendar.hourHeight - 6, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
                  {hourLabel(SIZES.calendar.startHour + index)}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
              {columns.map((columnDay) => (
                <DayColumn
                  key={localDayKey(columnDay)}
                  day={columnDay}
                  appointments={appointments}
                  dogs={dogs}
                  services={services}
                  compact={vista === 'settimana'}
                  onMove={onMove}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <Sheet
        open={vista === 'mese' && sheetDay !== null}
        title={sheetDay ? formatHomeDate(sheetDay) : ''}
        onClose={() => setSheetKey(null)}
      >
        {sheetRows.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            dog={dogs.find((item) => item.id === appointment.dogId)}
            services={services}
          />
        ))}
        <Button type="button" onClick={() => sheetKey && navigate(`/appuntamenti/nuovo?data=${sheetKey}`)}>+ Aggiungi</Button>
      </Sheet>
    </ShellFrame>
  )
}
