import { addDays, addMonths, format, startOfWeek } from 'date-fns'
import { Archive, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { TemperamentSticker } from '../components/domain/TemperamentSticker'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { ChipRow } from '../components/ui/ChipRow'
import { IconButton } from '../components/ui/IconButton'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { ServiceChip } from '../components/ui/ServiceChip'
import { useServices } from '../hooks/useServices'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { isOverdue, localDayKey, onLocalDay, parseDayParam, sumDuration } from '../lib/appointments'
import {
  daySummary,
  gridBounds,
  offHourCounts,
  openingScroll,
  parseVista,
  placeAppointments,
  snapQuarter,
  weekDays,
  type CalendarVista,
} from '../lib/calendarView'
import { dogMark, normalizeSearch } from '../lib/dogList'
import { formatCompactDuration, splitCritical } from '../lib/display'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { eventLayout } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { FlagKey } from '../assets/icons/icons'
import type { Appointment, AppointmentWrite, Dog, Service } from '../types/models'
import { ShellFrame } from './ShellFrame'

const HOUR = SIZES.calendar.hourHeight
const MIN_BLOCK = 18
const LABEL_PAD = 10
const WEEK_MARK_MIN_HEIGHT = 32

type Bounds = { startHour: number; endHour: number }
type Mode = 'giorno' | 'settimana'

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

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((part) => part !== '')
    .slice(0, 3)
    .map((part) => part.charAt(0).toLocaleUpperCase('it-IT'))
    .join('')
}

function hasHomonym(dog: Dog, peers: Dog[]): boolean {
  const key = normalizeSearch(dog.name)
  return peers.some((peer) => peer.id !== dog.id && normalizeSearch(peer.name) === key)
}

function summaryText(summary: { dogs: number; minutes: number; mordaci: number }): string {
  const dogs = summary.dogs === 1 ? '1 cane' : `${summary.dogs} cani`
  const base = `${dogs} · ${formatCompactDuration(summary.minutes)} stimate`
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

function byStart(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
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

function nowTop(day: Date, now: Date, bounds: Bounds): number | null {
  if (localDayKey(day) !== localDayKey(now)) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < bounds.startHour * 60 || minutes > bounds.endHour * 60) return null
  return ((minutes - bounds.startHour * 60) / 60) * HOUR
}

function stripeColor(completed: boolean, monthly: boolean, gray: boolean): string {
  if (gray) return 'var(--tx3)'
  if (completed) return 'var(--ok)'
  if (monthly) return 'var(--s-mens)'
  return 'var(--pri)'
}

function stickerFlags(dog: Dog | undefined): FlagKey[] | undefined {
  if (!dog) return undefined
  const flags: FlagKey[] = []
  if (dog.ageCategory === 'anziano') flags.push('anziano')
  if (dog.clientType === 'mensile') flags.push('mensile')
  return flags.length > 0 ? flags : undefined
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

const ellipsis: CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

function AppointmentBlock({
  appointment,
  dog,
  mark,
  homonym,
  services,
  mode,
  top,
  height,
  column,
  columnCount,
  now,
  onMove,
}: {
  appointment: Appointment
  dog: Dog | undefined
  mark: string | null
  homonym: boolean
  services: Service[]
  mode: Mode
  top: number
  height: number
  column: number
  columnCount: number
  now: Date
  onMove: (event: PointerEvent<HTMLButtonElement>, appointment: Appointment) => void
}) {
  const openSheet = useOpenSheet()
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const moved = useRef(false)
  const name = dog?.name ?? 'Cane assente'
  const spoken = dog && mark ? `${name}, ${mark.split(' · ').join(', ')}` : name
  const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
  const archived = dog !== undefined && dog.status !== 'attivo'
  const cancelled = appointment.status === 'disdetto' || appointment.status === 'non_venuto'
  const completed = appointment.status === 'completato'
  const overdue = isOverdue(appointment, now)
  const gray = archived || cancelled
  const state = cancelled ? appointment.status : completed ? 'completato' : overdue ? 'da-chiudere' : 'programmato'
  const shared = columnCount > 1
  const week = mode === 'settimana'
  const split = week && shared
  const layout = eventLayout(sumDuration(appointment.services))
  const stripe = stripeColor(completed, dog?.clientType === 'mensile', gray)
  const flags = stickerFlags(dog)
  const showMark = Boolean(mark) && (mode === 'giorno' || height >= WEEK_MARK_MIN_HEIGHT)
  const gap = 2
  const left = `calc(${(column / columnCount) * 100}% + ${column === 0 ? gap : gap / 2}px)`
  const right = `calc(${((columnCount - 1 - column) / columnCount) * 100}% + ${column === columnCount - 1 ? gap : gap / 2}px)`

  const style: CSSProperties = {
    position: 'absolute',
    zIndex: 2,
    top,
    height,
    left,
    right,
    overflow: 'hidden',
    border: 0,
    borderLeft: `4px solid ${stripe}`,
    borderRadius: 6,
    background: gray ? 'var(--surf2)' : 'var(--card)',
    color: gray ? 'var(--tx3)' : 'var(--tx)',
    textDecoration: cancelled ? 'line-through' : 'none',
    textAlign: 'left',
    font: 'inherit',
    fontSize: TYPE.meta,
    padding: layout === 'compact' ? '0 6px' : week ? '2px 6px' : '3px 6px',
    touchAction: 'none',
  }
  if (overdue) style.boxShadow = 'inset 0 0 0 1.5px var(--warn)'
  if (shared) {
    style.outline = '2px solid var(--warn)'
    style.outlineOffset = -2
  }

  const statusIcons = (
    <>
      {completed ? <Check size={12} strokeWidth={3} color="var(--ok)" aria-label="Completato" style={{ flex: 'none' }} /> : null}
      {archived ? <Archive size={12} strokeWidth={2} aria-label="Cane archiviato" style={{ flex: 'none' }} /> : null}
    </>
  )

  const chips = appointment.services.map((line, index) => (
    <ServiceChip key={`${line.serviceId}-${index}`} iconKey={services.find((service) => service.id === line.serviceId)?.iconKey}>
      {line.name}
    </ServiceChip>
  ))

  const sticker = dog ? <TemperamentSticker kind={dog.temperament} size={SIZES.temperamentIcon.calendar} flags={flags} /> : null
  const time = <span style={{ flex: 'none', color: 'var(--tx3)' }}>{clock(appointment.start)}</span>

  let content
  if (split) {
    const text = homonym ? (mark ?? name) : initials(name)
    content = (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        <span style={{ ...ellipsis, fontWeight: 700 }}>{text}</span>
        {statusIcons}
      </span>
    )
  } else if (layout === 'compact') {
    content = (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, width: '100%' }}>
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</span>
        {sticker}
        {chips[0]}
        {appointment.services.length > 1 ? <span>+1</span> : null}
        {time}
      </span>
    )
  } else {
    content = (
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{name}</span>
          {sticker}
          {statusIcons}
          {time}
        </span>
        {showMark ? <span>{mark}</span> : null}
        <ChipRow>{chips}</ChipRow>
        {note ? <span style={{ color: gray ? 'var(--tx3)' : 'var(--bad)' }}>{note}</span> : null}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={`Apri ${spoken}`}
      data-column={column}
      data-column-count={columnCount}
      data-state={state}
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
        openSheet(`/appuntamenti/${appointment.id}`)
      }}
      style={style}
    >
      {content}
    </button>
  )
}

function DayColumn({
  day,
  appointments,
  dogs,
  activeDogs,
  services,
  mode,
  bounds,
  now,
  showNow,
  onMove,
}: {
  day: Date
  appointments: Appointment[]
  dogs: Dog[]
  activeDogs: Dog[]
  services: Service[]
  mode: Mode
  bounds: Bounds
  now: Date
  showNow: boolean
  onMove: (event: PointerEvent<HTMLButtonElement>, appointment: Appointment) => void
}) {
  const openSheet = useOpenSheet()
  const key = localDayKey(day)
  const line = showNow ? nowTop(day, now, bounds) : null
  const rows = appointments.filter((item) => localDayKey(item.start) === key).sort(byStart)
  const placed = placeAppointments(rows.map((item) => ({ id: item.id, start: item.start, durationMin: sumDuration(item.services) })))
  const slots = Array.from({ length: SIZES.calendar.endHour - SIZES.calendar.startHour }, (_, index) => SIZES.calendar.startHour + index)

  return (
    <div
      data-day-column={key}
      style={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 0,
        height: (bounds.endHour - bounds.startHour) * HOUR,
        borderLeft: mode === 'settimana' ? '1px solid var(--line)' : undefined,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${HOUR}px)`,
      }}
    >
      {slots.map((hour) => (
        <button
          key={hour}
          type="button"
          aria-label={`Nuovo ${formatHomeDate(day)} alle ${hourLabel(hour)}`}
          onClick={() => openSheet(`/appuntamenti/nuovo?data=${key}&ora=${hourLabel(hour)}`)}
          style={{
            position: 'absolute',
            zIndex: 0,
            top: (hour - bounds.startHour) * HOUR,
            left: 0,
            right: 0,
            height: HOUR,
            border: 0,
            padding: 0,
            background: 'transparent',
          }}
        />
      ))}
      {rows.map((appointment) => {
        const dog = dogs.find((item) => item.id === appointment.dogId)
        const place = placed.find((item) => item.id === appointment.id)
        const startMinutes = appointment.start.getHours() * 60 + appointment.start.getMinutes()
        const top = ((startMinutes - bounds.startHour * 60) / 60) * HOUR
        const height = Math.max((sumDuration(appointment.services) / 60) * HOUR, MIN_BLOCK)
        return (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            dog={dog}
            mark={dog ? dogMark(dog, activeDogs) : null}
            homonym={dog ? hasHomonym(dog, activeDogs) : false}
            services={services}
            mode={mode}
            top={top}
            height={height}
            column={place?.column ?? 0}
            columnCount={place?.columnCount ?? 1}
            now={now}
            onMove={onMove}
          />
        )
      })}
      {line == null ? null : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            zIndex: 4,
            top: line,
            left: 0,
            right: 0,
            borderTop: '2px solid var(--bad)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 0,
              top: -11,
              fontSize: TYPE.meta,
              fontWeight: 700,
              color: '#fff',
              background: 'var(--bad)',
              padding: '1px 6px',
              borderRadius: 6,
            }}
          >
            {clock(now)}
          </span>
        </div>
      )}
    </div>
  )
}

const hintStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5,
  border: '1px solid var(--line)',
  borderRadius: 999,
  background: 'var(--card)',
  color: 'var(--tx2)',
  font: 'inherit',
  fontSize: TYPE.meta,
  fontWeight: 600,
  padding: '2px 10px',
  boxShadow: 'var(--shadow)',
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const openSheet = useOpenSheet()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments, saveExisting } = useAppointments(uid)
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const day = parseDayParam(searchParams.get('data'), new Date())
  const vista = parseVista(searchParams.get('vista'))
  const now = new Date()
  const suppressClick = useRef(false)
  const suppressTimer = useRef<number | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const scrollMemo = useRef<{ key: string; startHour: number } | null>(null)
  const [view, setView] = useState({ top: 0, height: 0 })
  useEffect(() => {
    function onClickCapture(event: MouseEvent) {
      if (!suppressClick.current) return
      suppressClick.current = false
      if (suppressTimer.current != null) {
        window.clearTimeout(suppressTimer.current)
        suppressTimer.current = null
      }
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener('click', onClickCapture, true)
    return () => {
      document.removeEventListener('click', onClickCapture, true)
      if (suppressTimer.current != null) window.clearTimeout(suppressTimer.current)
    }
  }, [])

  const activeDogs = dogs.filter((dog) => dog.status === 'attivo')
  const scoped = scopedAppointments(vista, day, appointments)
  const summary = daySummary(dogs, scoped)
  const mode: Mode = vista === 'settimana' ? 'settimana' : 'giorno'
  const spans = (vista === 'mese' ? [] : scoped).map((item) => ({
    start: item.start,
    end: new Date(item.start.getTime() + sumDuration(item.services) * 60_000),
  }))
  const bounds = gridBounds(spans)
  const counts = offHourCounts(spans, SIZES.calendar.startHour, SIZES.calendar.endHour)
  const gridHeight = (bounds.endHour - bounds.startHour) * HOUR
  const anchorKey = localDayKey(vista === 'settimana' ? weekDays(day)[0] : day)

  function measure() {
    const node = scroller.current
    if (!node) return
    setView((current) => (current.top === node.scrollTop && current.height === node.clientHeight ? current : { top: node.scrollTop, height: node.clientHeight }))
  }

  useLayoutEffect(() => {
    const node = scroller.current
    if (!node) {
      scrollMemo.current = null
      return
    }
    const key = `${vista}|${anchorKey}`
    const memo = scrollMemo.current
    if (memo && memo.key === key) {
      if (memo.startHour !== bounds.startHour) node.scrollTop += (memo.startHour - bounds.startHour) * HOUR
    } else {
      const today = new Date()
      const todayKey = localDayKey(today)
      const isToday = vista === 'settimana' ? weekDays(day).some((item) => localDayKey(item) === todayKey) : localDayKey(day) === todayKey
      const base = openingScroll({
        isToday,
        now: today,
        startHour: bounds.startHour,
        endHour: bounds.endHour,
        hourHeight: HOUR,
        viewportHeight: node.clientHeight,
      })
      node.scrollTop = base > 0 ? base + LABEL_PAD : 0
    }
    scrollMemo.current = { key, startHour: bounds.startHour }
    measure()
  }, [vista, anchorKey, bounds.startHour, bounds.endHour])

  const beforeHeight = LABEL_PAD + (SIZES.calendar.startHour - bounds.startHour) * HOUR
  const afterTop = LABEL_PAD + (SIZES.calendar.endHour - bounds.startHour) * HOUR
  const showBefore = counts.before > 0 && view.top >= beforeHeight - 1
  const showAfter = counts.after > 0 && view.top + view.height <= afterTop + 1

  function goTo(next: Date) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.set('data', localDayKey(next))
      return params
    })
  }

  function chooseVista(next: CalendarVista) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (next === 'giorno') params.delete('vista')
      else params.set('vista', next)
      return params
    })
  }

  function shiftMonth(delta: number) {
    goTo(addMonths(day, delta))
  }

  function onMove(event: PointerEvent<HTMLButtonElement>, appointment: Appointment) {
    suppressClick.current = true
    if (suppressTimer.current != null) window.clearTimeout(suppressTimer.current)
    suppressTimer.current = window.setTimeout(() => {
      suppressClick.current = false
      suppressTimer.current = null
    }, 0)
    const column = columnFromPoint(event.clientX, event.currentTarget)
    const rect = column.getBoundingClientRect()
    const minutesFromTop = Math.round(((event.clientY - rect.top) / HOUR) * 60)
    const key = column.getAttribute('data-day-column') ?? localDayKey(appointment.start)
    const base = parseDayParam(key, day)
    const next = snapQuarter(new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, bounds.startHour * 60 + minutesFromTop, 0, 0))
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
  const labels = Array.from({ length: bounds.endHour - bounds.startHour + 1 }, (_, index) => bounds.startHour + index)
  const dayRows = onLocalDay(appointments, day).sort(byStart)

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
          <Button variant="ghost" onClick={() => goTo(new Date())}>Oggi</Button>
        </div>
        {vista === 'mese' ? null : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, padding: `0 ${SIZES.pagePadX}px` }}>
            {weekDays(day).map((date) => {
              const selected = localDayKey(date) === localDayKey(day)
              return (
                <button
                  key={localDayKey(date)}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Seleziona ${formatHomeDate(date)}`}
                  onClick={() => goTo(date)}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    background: selected ? 'var(--pri-solid)' : 'transparent',
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
        )}
        <p style={{ margin: '8px 0', padding: `0 ${SIZES.pagePadX}px`, fontSize: TYPE.base }}>{summaryText(summary)}</p>
        {vista === 'mese' ? (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: `0 ${SIZES.pagePadX}px 12px` }}>
            <div role="grid" aria-label="Mese" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
              {weekDays(day).map((date) => (
                <span key={date.getDay()} style={{ textAlign: 'center', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{weekdayShort(date)}</span>
              ))}
              {monthCells(day).map((date) => {
                const key = localDayKey(date)
                const selected = key === localDayKey(day)
                const inMonth = date.getMonth() === day.getMonth()
                const today = key === localDayKey(now)
                const weekend = date.getDay() === 0 || date.getDay() === 6
                const count = onLocalDay(appointments, date).length
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={formatHomeDate(date)}
                    onClick={() => goTo(date)}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      background: selected ? 'var(--pri-solid)' : weekend ? 'var(--surf)' : 'transparent',
                      color: selected ? '#fff' : inMonth ? 'var(--tx)' : 'var(--tx3)',
                      boxShadow: !selected && today ? 'inset 0 0 0 2px var(--pri)' : undefined,
                      padding: '4px 0',
                      font: 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ display: 'block' }}>{date.getDate()}</span>
                    <span
                      data-count={count}
                      style={{ display: 'block', height: 14, fontSize: TYPE.meta, fontWeight: 700, color: selected ? '#fff' : 'var(--pri)' }}
                    >
                      {count > 0 ? count : ''}
                    </span>
                  </button>
                )
              })}
            </div>
            <section aria-label={`Appuntamenti ${formatHomeDate(day)}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <SectionTitle>{formatHomeDate(day)}</SectionTitle>
              {dayRows.length === 0 ? (
                <Card>
                  <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
                </Card>
              ) : (
                <Card>
                  {dayRows.map((appointment, index) => {
                    const dog = dogs.find((item) => item.id === appointment.dogId)
                    return (
                      <Row key={appointment.id} style={index === 0 ? { borderTop: 'none' } : undefined}>
                        <AppointmentRow
                          appointment={appointment}
                          dog={dog}
                          services={services}
                          mark={dog ? dogMark(dog, activeDogs) : null}
                        />
                      </Row>
                    )
                  })}
                </Card>
              )}
              <Button type="button" variant="tonal" size="sm" onClick={() => openSheet(`/appuntamenti/nuovo?data=${localDayKey(day)}`)}>+ Aggiungi</Button>
            </section>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}>
            <div
              ref={scroller}
              role="grid"
              aria-label="Orari"
              onScroll={measure}
              style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', padding: `${LABEL_PAD}px ${SIZES.pagePadX}px 12px` }}
            >
              <div style={{ position: 'relative', width: SIZES.calendar.gutter, height: gridHeight, flex: 'none' }}>
                {labels.map((hour) => (
                  <span key={hour} style={{ position: 'absolute', top: (hour - bounds.startHour) * HOUR - 6, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
                    {hourLabel(hour)}
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
                    activeDogs={activeDogs}
                    services={services}
                    mode={mode}
                    bounds={bounds}
                    now={now}
                    showNow={vista === 'giorno'}
                    onMove={onMove}
                  />
                ))}
              </div>
            </div>
            {showBefore ? (
              <button
                type="button"
                data-hint="prima"
                onClick={() => { if (scroller.current) scroller.current.scrollTop = 0 }}
                style={{ ...hintStyle, top: 4 }}
              >
                {`↑ ${counts.before} prima delle ${SIZES.calendar.startHour}`}
              </button>
            ) : null}
            {showAfter ? (
              <button
                type="button"
                data-hint="dopo"
                onClick={() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight }}
                style={{ ...hintStyle, bottom: 4 }}
              >
                {`↓ ${counts.after} dopo le ${SIZES.calendar.endHour}`}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </ShellFrame>
  )
}
