import { addDays, format, startOfWeek } from 'date-fns'
import { Archive, Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { WeekRows } from '../components/calendar/WeekRows'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { TemperamentSticker } from '../components/domain/TemperamentSticker'
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
  daySwipe,
  gridBounds,
  monthCellFace,
  offHourCounts,
  openingScroll,
  parseVista,
  placeAppointments,
  shiftCalendar,
  weekDays,
  weekNumber,
  type CalendarVista,
} from '../lib/calendarView'
import { blockGeometry, contentMinHeightPx, pxPerMinuteForDay } from '../lib/calendarLayout'
import { dogMark, normalizeSearch } from '../lib/dogList'
import { formatCompactDuration, splitCritical } from '../lib/display'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { eventLayout } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { FlagKey } from '../assets/icons/icons'
import type { Appointment, Dog, Service } from '../types/models'
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

function nowTop(day: Date, now: Date, bounds: Bounds, pxPerMinute: number): number | null {
  if (localDayKey(day) !== localDayKey(now)) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < bounds.startHour * 60 || minutes > bounds.endHour * 60) return null
  return (minutes - bounds.startHour * 60) * pxPerMinute
}

function dayScaleItems(rows: Appointment[], dogs: Dog[], activeDogs: Dog[], mode: Mode): { durationMin: number; contentMinPx: number }[] {
  return rows.map((appointment) => {
    const dog = dogs.find((item) => item.id === appointment.dogId)
    const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
    const mark = dog ? dogMark(dog, activeDogs) : null
    const durationMin = sumDuration(appointment.services)
    const contentMinPx = contentMinHeightPx({
      serviceCount: appointment.services.length,
      hasNote: Boolean(note),
      hasMark: Boolean(mark) && mode === 'giorno',
      compact: false,
    })
    return { durationMin, contentMinPx }
  })
}

// Scala verticale (px per minuto) condivisa da tutte le colonne visibili: con più giorni è il massimo, così le ore restano allineate.
function visiblePxPerMinute(rows: Appointment[], dogs: Dog[], activeDogs: Dog[], mode: Mode): number {
  const byDay = new Map<string, Appointment[]>()
  for (const item of rows) {
    const key = localDayKey(item.start)
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  let ppm = HOUR / 60
  for (const dayRows of byDay.values()) {
    ppm = Math.max(ppm, pxPerMinuteForDay(dayScaleItems(dayRows, dogs, activeDogs, mode), HOUR))
  }
  return ppm
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

function insideAppointmentButton(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('button')?.getAttribute('aria-label')?.startsWith('Apri ') ?? false
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
}) {
  const openSheet = useOpenSheet()
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
  const layout = mode === 'giorno' ? 'full' : eventLayout(sumDuration(appointment.services))
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
    overflow: mode === 'giorno' ? 'visible' : 'hidden',
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
    touchAction: 'pan-y',
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
        {note ? <TriangleAlert size={12} strokeWidth={2} color="var(--bad)" aria-label={note} /> : null}
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
      onClick={() => openSheet(`/appuntamenti/${appointment.id}`)}
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
  pxPerMinute,
  now,
  showNow,
}: {
  day: Date
  appointments: Appointment[]
  dogs: Dog[]
  activeDogs: Dog[]
  services: Service[]
  mode: Mode
  bounds: Bounds
  pxPerMinute: number
  now: Date
  showNow: boolean
}) {
  const openSheet = useOpenSheet()
  const key = localDayKey(day)
  const ppm = pxPerMinute
  const hourPx = ppm * 60
  const columnHeight = (bounds.endHour - bounds.startHour) * hourPx
  const line = showNow ? nowTop(day, now, bounds, ppm) : null
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
        height: columnHeight,
        borderLeft: mode === 'settimana' ? '1px solid var(--line)' : undefined,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${hourPx}px)`,
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
            top: (hour - bounds.startHour) * hourPx,
            left: 0,
            right: 0,
            height: hourPx,
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
        const { top, height } = blockGeometry(startMinutes, sumDuration(appointment.services), bounds.startHour, ppm, MIN_BLOCK)
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
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const day = parseDayParam(searchParams.get('data'), new Date())
  const vista = parseVista(searchParams.get('vista'))
  const now = new Date()
  const suppressClick = useRef(false)
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null)
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
  const pxPerMinute = visiblePxPerMinute(vista === 'mese' ? [] : scoped, dogs, activeDogs, mode)
  const hourPx = pxPerMinute * 60
  const gridHeight = (bounds.endHour - bounds.startHour) * hourPx
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
      if (memo.startHour !== bounds.startHour) node.scrollTop += (memo.startHour - bounds.startHour) * hourPx
    } else {
      const today = new Date()
      const todayKey = localDayKey(today)
      const isToday = vista === 'settimana' ? weekDays(day).some((item) => localDayKey(item) === todayKey) : localDayKey(day) === todayKey
      const base = openingScroll({
        isToday,
        now: today,
        startHour: bounds.startHour,
        endHour: bounds.endHour,
        hourHeight: hourPx,
        viewportHeight: node.clientHeight,
      })
      node.scrollTop = base > 0 ? base + LABEL_PAD : 0
    }
    scrollMemo.current = { key, startHour: bounds.startHour }
    measure()
  }, [vista, anchorKey, bounds.startHour, bounds.endHour, hourPx])

  const beforeHeight = LABEL_PAD + (SIZES.calendar.startHour - bounds.startHour) * hourPx
  const afterTop = LABEL_PAD + (SIZES.calendar.endHour - bounds.startHour) * hourPx
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

  function shift(delta: number) {
    goTo(shiftCalendar(vista, day, delta))
  }

  function rememberSwipe(event: PointerEvent<HTMLDivElement>, skipAppointment: boolean) {
    if (skipAppointment && insideAppointmentButton(event.target)) {
      swipeOrigin.current = null
      return
    }
    swipeOrigin.current = { x: event.clientX, y: event.clientY }
  }

  function releaseSwipe(event: PointerEvent<HTMLDivElement>) {
    const origin = swipeOrigin.current
    swipeOrigin.current = null
    if (!origin) return
    const delta = daySwipe(event.clientX - origin.x, event.clientY - origin.y)
    if (delta === 0) return
    suppressClick.current = true
    if (suppressTimer.current != null) window.clearTimeout(suppressTimer.current)
    suppressTimer.current = window.setTimeout(() => {
      suppressClick.current = false
      suppressTimer.current = null
    }, 0)
    shift(delta)
  }

  function cancelSwipe() {
    swipeOrigin.current = null
  }

  const columns = [day]
  const vistaWord = vista === 'settimana' ? 'Settimana' : vista === 'mese' ? 'Mese' : 'Giorno'
  const nextWord = vista === 'settimana' ? 'successiva' : 'successivo'
  const labels = Array.from({ length: bounds.endHour - bounds.startHour + 1 }, (_, index) => bounds.startHour + index)
  const dayRows = onLocalDay(appointments, day).sort(byStart)

  return (
    <ShellFrame>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
          <IconButton label={`${vistaWord} precedente`} onClick={() => shift(-1)}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden />
          </IconButton>
          <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking }}>
            {monthTitle(day)}
            {vista === 'settimana' ? (
              <span style={{ display: 'block', marginTop: 2, fontSize: TYPE.base, fontWeight: 700, letterSpacing: 0, color: 'var(--tx2)' }}>
                {`Settimana ${weekNumber(day)}`}
              </span>
            ) : null}
          </h1>
          <IconButton label={`${vistaWord} ${nextWord}`} onClick={() => shift(1)}>
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
          <Button variant="secondary" onClick={() => goTo(new Date())}>Oggi</Button>
        </div>
        {vista === 'giorno' ? (
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
        ) : null}
        <p style={{ margin: '8px 0', padding: `0 ${SIZES.pagePadX}px`, fontSize: TYPE.base }}>{summaryText(summary)}</p>
        {vista === 'mese' ? (
          <div
            onPointerDown={(event) => rememberSwipe(event, false)}
            onPointerUp={releaseSwipe}
            onPointerCancel={cancelSwipe}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: `0 ${SIZES.pagePadX}px 12px` }}
          >
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
                const face = monthCellFace({ count, selected, today, inMonth, weekend })
                const label = count > 0 ? `${formatHomeDate(date)}, ${count} appuntament${count === 1 ? 'o' : 'i'}` : formatHomeDate(date)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={label}
                    onClick={() => goTo(date)}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      background: face.background,
                      color: face.color,
                      boxShadow: face.boxShadow,
                      padding: '4px 0',
                      font: 'inherit',
                      fontWeight: face.fontWeight,
                    }}
                  >
                    <span style={{ display: 'block' }}>{date.getDate()}</span>
                    {face.badge ? (
                      <span
                        data-badge=""
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: count > 9 ? undefined : 18,
                          minWidth: 18,
                          height: 18,
                          padding: count > 9 ? '0 2px' : 0,
                          borderRadius: 99,
                          background: 'var(--ok)',
                          color: '#fff',
                          boxShadow: face.badgeHalo ? '0 0 0 2px #fff' : undefined,
                        }}
                      >
                        {face.badge}
                      </span>
                    ) : null}
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
        ) : vista === 'settimana' ? (
          <div
            role="region"
            aria-label="Settimana"
            onPointerDown={(event) => rememberSwipe(event, false)}
            onPointerUp={releaseSwipe}
            onPointerCancel={cancelSwipe}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: `0 ${SIZES.pagePadX}px 12px` }}
          >
            <WeekRows
              days={weekDays(day)}
              selected={day}
              appointments={appointments}
              dogs={dogs}
              services={services}
              onSelectDay={goTo}
              onOpen={(id) => openSheet(`/appuntamenti/${id}`)}
              onCreate={(date) => openSheet(`/appuntamenti/nuovo?data=${localDayKey(date)}`)}
            />
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}>
            <div
              ref={scroller}
              role="grid"
              aria-label="Orari"
              onPointerDown={(event) => rememberSwipe(event, true)}
              onPointerUp={releaseSwipe}
              onPointerCancel={cancelSwipe}
              onScroll={measure}
              style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y', padding: `${LABEL_PAD}px ${SIZES.pagePadX}px 12px` }}
            >
              <div style={{ position: 'relative', width: SIZES.calendar.gutter, height: gridHeight, flex: 'none' }}>
                {labels.map((hour) => (
                  <span key={hour} style={{ position: 'absolute', top: (hour - bounds.startHour) * hourPx - 6, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
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
                    pxPerMinute={pxPerMinute}
                    now={now}
                    showNow={vista === 'giorno'}
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
