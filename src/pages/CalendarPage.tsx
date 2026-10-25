import { addDays, format, startOfWeek } from 'date-fns'
import { Archive, Check, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { WeekRows } from '../components/calendar/WeekRows'
import { BrandBar } from '../components/layout/BrandBar'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { NoteAltro } from '../components/domain/NoteAltro'
import { PersonalEntry, PersonalInline } from '../components/domain/PersonalAppointment'
import { TemperamentSticker } from '../components/domain/TemperamentSticker'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { ChipRow } from '../components/ui/ChipRow'
import { IconButton } from '../components/ui/IconButton'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { useServices } from '../hooks/useServices'
import { useAppointments } from '../hooks/useAppointments'
import { useClosures } from '../hooks/useClosures'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { isOverdue, localDayKey, onLocalDay, parseDayParam, STATO_COMPLETATO, STATO_DISDETTO, sumDuration } from '../lib/appointments'
import { allargaAgenda } from '../lib/finestraAgenda'
import { closureOn } from '../lib/closures'
import { appointmentKind, personalPlaceMinutes } from '../lib/personal'
import {
  CLOSED_CELL_BACKGROUND,
  cellPaint,
  daySummary,
  daySwipe,
  gridBounds,
  monthCellFace,
  offHourCounts,
  parseVista,
  placeAppointments,
  shiftCalendar,
  weekDays,
  weekNumber,
  type CalendarVista,
} from '../lib/calendarView'
import { contentMinHeightPx, daySegments, EMPTY_HOUR_PX, yAtMinute, type DayLayoutItem, type DaySegment } from '../lib/calendarLayout'
import { dogMark, normalizeSearch } from '../lib/dogList'
import { hasExtraNotes } from '../lib/dogNotes'
import { formatCompactDuration, splitCritical } from '../lib/display'
import { dataBreve, giornoCorto, meseAnno } from '../i18n/format'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import type { Lingua } from '../i18n/lingua'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { eventLayout, serviceTone } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { FlagKey } from '../assets/icons/icons'
import type { Appointment, Dog, Service, ServiceIconKey } from '../types/models'
import { ShellFrame } from './ShellFrame'

const LABEL_PAD = 10
const WEEK_MARK_MIN_HEIGHT = 32
const PERSONAL_TITLE_PX = 40

function placeMinutes(appointment: Appointment): number {
  if (appointmentKind(appointment) === 'personale') return personalPlaceMinutes(appointment.start, appointment.plannedEnd ?? null)
  return sumDuration(appointment.services)
}

function personalWhen(appointment: Appointment): string {
  const start = clock(appointment.start)
  if (!appointment.plannedEnd) return start
  return `${start}\u2013${clock(appointment.plannedEnd)}`
}

function dataDelGiorno(date: Date, lingua: Lingua): string {
  return lingua === 'it' ? formatHomeDate(date) : dataBreve(lingua, date)
}

function monthCellLabel(date: Date, reason: string | null, salonCount: number, personalCount: number, lingua: Lingua = 'it'): string {
  const parts = [dataDelGiorno(date, lingua)]
  if (reason) parts.push(t(lingua, 'agendaSaloneChiusoElenco', { motivo: reason }))
  if (salonCount > 0) parts.push(t(lingua, salonCount === 1 ? 'agendaAppuntamentoUno' : 'agendaAppuntamenti', { n: salonCount }))
  if (personalCount > 0) parts.push(t(lingua, personalCount === 1 ? 'agendaPersonaleUno' : 'agendaPersonali', { n: personalCount }))
  return parts.join(', ')
}

type Bounds = { startHour: number; endHour: number }
type Mode = 'giorno' | 'settimana'

function weekdayShort(date: Date, lingua: Lingua = 'it'): string {
  if (lingua !== 'it') return giornoCorto(lingua, date.getDay())
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

function summaryText(summary: { dogs: number; minutes: number; mordaci: number }, lingua: Lingua = 'it'): string {
  const cani = t(lingua, summary.dogs === 1 ? 'settimanaCaneUno' : 'settimanaCaneAltri', { n: summary.dogs })
  const base = t(lingua, 'agendaStimate', { cani, durata: formatCompactDuration(summary.minutes) })
  if (summary.mordaci > 0) return t(lingua, 'agendaMordace', { base, n: summary.mordaci })
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

function markLabel(minute: number): string {
  const hour = Math.floor(minute / 60)
  const mins = ((minute % 60) + 60) % 60
  return `${hour}:${String(mins).padStart(2, '0')}`
}

function nowInGrid(day: Date, now: Date, bounds: Bounds, segments: DaySegment[]): number | null {
  if (localDayKey(day) !== localDayKey(now)) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < bounds.startHour * 60 || minutes > bounds.endHour * 60) return null
  return yAtMinute(segments, minutes)
}

function dayScaleItems(rows: Appointment[], dogs: Dog[], activeDogs: Dog[], mode: Mode): { durationMin: number; contentMinPx: number }[] {
  return rows.map((appointment) => {
    if (appointmentKind(appointment) === 'personale') {
      const durationMin = placeMinutes(appointment)
      return { durationMin, contentMinPx: Math.max(PERSONAL_TITLE_PX, (durationMin / 60) * EMPTY_HOUR_PX) }
    }
    const dog = dogs.find((item) => item.id === appointment.dogId)
    const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
    const mark = dog ? dogMark(dog, activeDogs) : null
    const durationMin = sumDuration(appointment.services)
    const contentMinPx = contentMinHeightPx({
      serviceCount: appointment.services.length,
      hasNote: Boolean(note) || hasExtraNotes(appointment.extraNotes),
      hasMark: Boolean(mark) && mode === 'giorno',
      compact: false,
    })
    return { durationMin, contentMinPx }
  })
}

function layoutDay(rows: Appointment[], dogs: Dog[], activeDogs: Dog[], bounds: Bounds): { segments: DaySegment[]; height: number } {
  const placed = placeAppointments(rows.map((item) => ({ id: item.id, start: item.start, durationMin: placeMinutes(item) })))
  const scale = dayScaleItems(rows, dogs, activeDogs, 'giorno')
  const items: DayLayoutItem[] = rows.map((appointment, index) => {
    const place = placed.find((item) => item.id === appointment.id)
    return {
      id: appointment.id,
      startMin: appointment.start.getHours() * 60 + appointment.start.getMinutes(),
      durationMin: placeMinutes(appointment),
      contentPx: scale[index]?.contentMinPx ?? 0,
      column: place?.column ?? 0,
      columnCount: place?.columnCount ?? 1,
    }
  })
  return daySegments(items, bounds.startHour, bounds.endHour)
}

function dayScrollTop(input: {
  isToday: boolean
  now: Date
  startHour: number
  endHour: number
  segments: DaySegment[]
  height: number
  viewport: number
}): number {
  const max = Math.max(0, input.height - input.viewport)
  const clamp = (value: number) => Math.min(max, Math.max(0, value))
  if (!input.isToday) return clamp(yAtMinute(input.segments, SIZES.calendar.startHour * 60))
  const minutes = input.now.getHours() * 60 + input.now.getMinutes()
  if (minutes < input.startHour * 60) return 0
  if (minutes > input.endHour * 60) return max
  return clamp(yAtMinute(input.segments, minutes) - input.viewport / 3)
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
  return target.closest('[data-apri]') !== null
}

function KindDots({ salon, personal }: { salon: boolean; personal: boolean }) {
  return (
    <span style={{ display: 'flex', gap: 2, justifyContent: 'center', height: 4 }}>
      {salon ? <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--ok)' }} /> : null}
      {personal ? <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--personal)' }} /> : null}
    </span>
  )
}

function CountBadge({ value, tone, halo }: { value: string; tone: 'salon' | 'personal'; halo: boolean }) {
  const wide = Number(value) > 9
  return (
    <span
      {...(tone === 'salon' ? { 'data-badge': '' } : { 'data-personal-badge': '' })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: wide ? undefined : 18,
        minWidth: 18,
        height: 18,
        padding: wide ? '0 2px' : 0,
        borderRadius: 99,
        background: tone === 'salon' ? 'var(--ok)' : 'var(--personal)',
        color: 'var(--on-pri)',
        boxShadow: halo ? '0 0 0 2px var(--card)' : undefined,
      }}
    >
      {value}
    </span>
  )
}

function CalendarServiceChip({ iconKey, name, wide = false }: { iconKey?: ServiceIconKey; name: string; wide?: boolean }) {
  const tone = serviceTone(iconKey)
  return (
    <span
      style={{
        display: wide ? 'flex' : 'inline-flex',
        alignItems: 'flex-start',
        gap: 4,
        width: wide ? '100%' : undefined,
        maxWidth: '100%',
        minHeight: SIZES.serviceChip.h,
        height: 'auto',
        padding: '4px 8px',
        borderRadius: SIZES.serviceChip.radius,
        fontSize: TYPE.chip,
        fontWeight: 600,
        color: tone.ink,
        background: tone.bg,
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, currentColor 20%, transparent)',
        boxSizing: 'border-box',
        ...USER_TEXT,
      }}
    >
      <span style={{ display: 'inline-flex', flex: 'none', marginTop: 1 }}>
        <ServiceIcon iconKey={iconKey} size={SIZES.chip.serviceIconInChip} />
      </span>
      {name}
    </span>
  )
}

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
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const openSheet = useOpenSheet()
  const name = dog?.name ?? frasi.rigaCaneAssente
  const spoken = dog && mark ? `${name}, ${mark.split(' · ').join(', ')}` : name
  const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
  const hasExtra = hasExtraNotes(appointment.extraNotes)
  const archived = dog !== undefined && dog.status !== 'attivo'
  const cancelled = appointment.status === STATO_DISDETTO || appointment.status === 'non_venuto'
  const completed = appointment.status === STATO_COMPLETATO
  const overdue = isOverdue(appointment, now)
  const gray = archived || cancelled
  const state = cancelled ? appointment.status : completed ? STATO_COMPLETATO : overdue ? 'da-chiudere' : 'programmato'
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

  if (appointmentKind(appointment) === 'personale') {
    const title = appointment.title?.trim() || frasi.homePersonale
    return (
      <button
        type="button"
        data-apri=""
        aria-label={t(lingua, 'apriNome', { nome: title })}
        onClick={() => openSheet(`/appuntamenti/personale/${appointment.id}`)}
        style={{
          position: 'absolute',
          zIndex: 2,
          top,
          height,
          left,
          right,
          overflow: 'visible',
          border: 0,
          borderLeft: '4px solid var(--personal)',
          borderRadius: 6,
          background: 'var(--personal-s)',
          color: 'var(--personal-ink)',
          boxShadow: 'inset 0 0 0 1px var(--personal-line)',
          textAlign: 'left',
          font: 'inherit',
          padding: 8,
          touchAction: 'pan-y',
        }}
      >
        <PersonalInline title={title} when={personalWhen(appointment)} />
      </button>
    )
  }

  const style: CSSProperties = {
    position: 'absolute',
    zIndex: 2,
    top,
    height,
    left,
    right,
    overflow: 'visible',
    border: 0,
    borderLeft: `4px solid ${stripe}`,
    borderRadius: 6,
    background: gray ? 'var(--surf2)' : 'var(--card)',
    color: gray ? 'var(--tx3)' : 'var(--tx)',
    textDecoration: cancelled ? 'line-through' : 'none',
    textAlign: 'left',
    font: 'inherit',
    fontSize: mode === 'giorno' ? TYPE.base : TYPE.meta,
    padding: mode === 'giorno' ? 8 : layout === 'compact' ? '0 6px' : week ? '2px 6px' : '3px 6px',
    touchAction: 'pan-y',
  }
  if (overdue) style.boxShadow = 'inset 0 0 0 1.5px var(--warn)'
  if (shared) {
    style.outline = '2px solid var(--warn)'
    style.outlineOffset = -2
  }

  const statusIcons = (
    <>
      {completed ? <Check size={12} strokeWidth={3} color="var(--ok)" aria-label={frasi.homeCompletato} style={{ flex: 'none' }} /> : null}
      {archived ? <Archive size={12} strokeWidth={2} aria-label={frasi.agendaCaneArchiviato} style={{ flex: 'none' }} /> : null}
    </>
  )

  const chips = (wide: boolean) => appointment.services.map((line, index) => (
    <CalendarServiceChip key={`${line.serviceId}-${index}`} iconKey={services.find((service) => service.id === line.serviceId)?.iconKey} name={line.name} wide={wide} />
  ))

  const sticker = dog ? <TemperamentSticker kind={dog.temperament} size={SIZES.temperamentIcon.calendar} flags={flags} /> : null
  const time = <span style={{ flex: 'none', color: 'var(--tx3)' }}>{clock(appointment.start)}</span>

  let content
  if (split) {
    const text = homonym ? (mark ?? name) : initials(name)
    content = (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flexWrap: 'wrap' }}>
        <span style={{ ...USER_TEXT, fontWeight: 700 }}>{text}</span>
        {statusIcons}
      </span>
    )
  } else if (layout === 'compact') {
    content = (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, width: '100%', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, ...USER_TEXT }}>{name}</span>
        {sticker}
        {note ? <TriangleAlert size={12} strokeWidth={2} color="var(--bad)" aria-label={note} /> : null}
        {hasExtra ? <NoteAltro note="" altro /> : null}
        {chips(false)[0]}
        {appointment.services.length > 1 ? <span>+1</span> : null}
        {time}
      </span>
    )
  } else if (mode === 'giorno') {
    content = (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
          <span style={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700, fontSize: TYPE.rowTitle, lineHeight: 1.3, ...USER_TEXT }}>{name}</span>
          {sticker}
          {statusIcons}
          <span style={{ flex: 'none', fontWeight: 700, color: 'var(--tx2)', fontVariantNumeric: 'tabular-nums' }}>{clock(appointment.start)}</span>
        </span>
        {showMark ? <span style={{ color: 'var(--tx2)', fontSize: TYPE.meta, ...USER_TEXT }}>{mark}</span> : null}
        {appointment.services.length > 0 ? <ChipRow>{chips(true)}</ChipRow> : null}
        {note || hasExtra ? (
          <span style={{ display: 'block', fontSize: TYPE.meta, minWidth: 0, maxWidth: '100%' }}>
            <NoteAltro note={note} altro={hasExtra} muted={gray} />
          </span>
        ) : null}
      </span>
    )
  } else {
    content = (
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, ...USER_TEXT }}>{name}</span>
          {sticker}
          {statusIcons}
          {time}
        </span>
        {showMark ? <span style={USER_TEXT}>{mark}</span> : null}
        <ChipRow>{chips(false)}</ChipRow>
        {note || hasExtra ? <NoteAltro note={note} altro={hasExtra} muted={gray} /> : null}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-apri=""
      aria-label={t(lingua, 'apriNome', { nome: spoken })}
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
  segments,
  height,
  now,
  showNow,
  closed,
}: {
  day: Date
  appointments: Appointment[]
  dogs: Dog[]
  activeDogs: Dog[]
  services: Service[]
  mode: Mode
  bounds: Bounds
  segments: DaySegment[]
  height: number
  now: Date
  showNow: boolean
  closed: boolean
}) {
  const { lingua } = useLingua()
  const openSheet = useOpenSheet()
  const key = localDayKey(day)
  const dataGiorno = dataDelGiorno(day, lingua)
  const line = showNow ? nowInGrid(day, now, bounds, segments) : null
  const rows = appointments.filter((item) => localDayKey(item.start) === key).sort(byStart)
  const geometry = new Map<string, { top: number; height: number; column: number; columnCount: number }>()
  for (const segment of segments) {
    if (segment.kind !== 'group') continue
    for (const item of segment.items) geometry.set(item.id, item)
  }

  return (
    <div
      data-day-column={key}
      style={{
        position: 'relative',
        flex: '1 1 0',
        minWidth: 0,
        height,
        borderLeft: mode === 'settimana' ? '1px solid var(--line)' : undefined,
        ...(closed ? cellPaint(CLOSED_CELL_BACKGROUND) : {}),
      }}
    >
      {segments.map((segment) => segment.kind === 'empty' ? (
        <button
          key={segment.hour}
          type="button"
          aria-label={t(lingua, 'agendaNuovoAlle', { data: dataGiorno, ora: markLabel(segment.hour * 60) })}
          onClick={() => openSheet(`/appuntamenti/nuovo?data=${key}&ora=${hourLabel(segment.hour)}`)}
          style={{
            position: 'absolute',
            zIndex: 0,
            top: segment.top,
            left: 0,
            right: 0,
            height: EMPTY_HOUR_PX,
            border: 0,
            padding: 0,
            background: 'transparent',
            touchAction: 'pan-y',
          }}
        />
      ) : null)}
      {rows.map((appointment) => {
        const dog = dogs.find((item) => item.id === appointment.dogId)
        const geo = geometry.get(appointment.id)
        if (!geo) return null
        return (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            dog={dog}
            mark={dog ? dogMark(dog, activeDogs) : null}
            homonym={dog ? hasHomonym(dog, activeDogs) : false}
            services={services}
            mode={mode}
            top={geo.top}
            height={geo.height}
            column={geo.column}
            columnCount={geo.columnCount}
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
              color: 'var(--on-pri)',
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
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [searchParams, setSearchParams] = useSearchParams()
  const openSheet = useOpenSheet()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { closures } = useClosures(uid)
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const day = parseDayParam(searchParams.get('data'), new Date())
  const vista = parseVista(searchParams.get('vista'))
  useEffect(() => { allargaAgenda(day) }, [day])
  const now = new Date()
  const suppressClick = useRef(false)
  const swipeOrigin = useRef<{ x: number; y: number } | null>(null)
  const suppressTimer = useRef<number | null>(null)
  const scroller = useRef<HTMLDivElement | null>(null)
  const scrollMemo = useRef<{ key: string; openY: number } | null>(null)
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
  const summary = daySummary(dogs, scoped.filter((item) => appointmentKind(item) === 'pelosetto'))
  const dayClosure = closureOn(closures, localDayKey(day))
  const mode: Mode = vista === 'settimana' ? 'settimana' : 'giorno'
  const spans = (vista === 'mese' ? [] : scoped).map((item) => ({
    start: item.start,
    end: new Date(item.start.getTime() + placeMinutes(item) * 60_000),
  }))
  const bounds = gridBounds(spans)
  const counts = offHourCounts(spans, SIZES.calendar.startHour, SIZES.calendar.endHour)
  const dayRows = onLocalDay(appointments, day).sort(byStart)
  const laid = vista === 'giorno' ? layoutDay(dayRows, dogs, activeDogs, bounds) : null
  const openY = laid ? yAtMinute(laid.segments, SIZES.calendar.startHour * 60) : 0
  const closeY = laid ? yAtMinute(laid.segments, SIZES.calendar.endHour * 60) : 0
  const anchorKey = localDayKey(vista === 'settimana' ? weekDays(day)[0] : day)

  function measure() {
    const node = scroller.current
    if (!node) return
    setView((current) => (current.top === node.scrollTop && current.height === node.clientHeight ? current : { top: node.scrollTop, height: node.clientHeight }))
  }

  useLayoutEffect(() => {
    const node = scroller.current
    if (!node || !laid || vista !== 'giorno') {
      scrollMemo.current = null
      return
    }
    const key = `${vista}|${anchorKey}`
    const memo = scrollMemo.current
    if (memo && memo.key === key) {
      if (memo.openY !== openY) node.scrollTop += openY - memo.openY
    } else {
      const today = new Date()
      const isToday = localDayKey(day) === localDayKey(today)
      const base = dayScrollTop({
        isToday,
        now: today,
        startHour: bounds.startHour,
        endHour: bounds.endHour,
        segments: laid.segments,
        height: laid.height,
        viewport: node.clientHeight,
      })
      node.scrollTop = base > 0 ? base + LABEL_PAD : 0
    }
    scrollMemo.current = { key, openY }
    measure()
  }, [vista, anchorKey, bounds.startHour, bounds.endHour, laid?.height, openY])

  const showBefore = counts.before > 0 && view.top >= LABEL_PAD + openY - 1
  const showAfter = counts.after > 0 && view.top + view.height <= LABEL_PAD + closeY + 1

  function goTo(next: Date) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.set('data', localDayKey(next))
      return params
    })
  }

  function openDay(next: Date) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      params.set('data', localDayKey(next))
      params.delete('vista')
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
  const vistaIndietro = vista === 'settimana' ? frasi.agendaPrecSettimana : vista === 'mese' ? frasi.agendaPrecMese : frasi.agendaPrecGiorno
  const vistaAvanti = vista === 'settimana' ? frasi.agendaSuccSettimana : vista === 'mese' ? frasi.agendaSuccMese : frasi.agendaSuccGiorno

  return (
    <ShellFrame fill>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
          <BrandBar />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.brandBar.gap}px ${SIZES.pagePadX}px 0` }}>
          <IconButton label={vistaIndietro} onClick={() => shift(-1)}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden />
          </IconButton>
          <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking }}>
            {meseAnno(lingua, day)}
            {vista === 'settimana' ? (
              <span style={{ display: 'block', marginTop: 2, fontSize: TYPE.base, fontWeight: 700, letterSpacing: 0, color: 'var(--tx2)' }}>
                {t(lingua, 'agendaSettimanaN', { n: weekNumber(day) })}
              </span>
            ) : null}
          </h1>
          <IconButton label={vistaAvanti} onClick={() => shift(1)}>
            <ChevronRight size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: `8px ${SIZES.pagePadX}px` }}>
          <Segmented
            label={frasi.agendaVista}
            value={vista}
            onChange={chooseVista}
            options={[
              { value: 'giorno', label: frasi.agendaGiorno },
              { value: 'settimana', label: frasi.agendaSettimana },
              { value: 'mese', label: frasi.agendaMese },
            ]}
          />
          <Button variant="secondary" onClick={() => goTo(new Date())}>{frasi.homeOggi}</Button>
        </div>
        {vista === 'giorno' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, padding: `0 ${SIZES.pagePadX}px` }}>
            {weekDays(day).map((date) => {
              const selected = localDayKey(date) === localDayKey(day)
              const rows = onLocalDay(appointments, date)
              const closed = closureOn(closures, localDayKey(date)) !== null
              return (
                <button
                  key={localDayKey(date)}
                  type="button"
                  aria-pressed={selected}
                  aria-label={t(lingua, 'agendaSeleziona', { data: dataDelGiorno(date, lingua) })}
                  onClick={() => goTo(date)}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    ...cellPaint(selected ? 'var(--pri-solid)' : closed ? CLOSED_CELL_BACKGROUND : 'transparent'),
                    color: selected ? 'var(--on-pri)' : 'var(--tx)',
                    padding: '4px 0',
                    minHeight: 44,
                    height: 'auto',
                    font: 'inherit',
                  }}
                >
                  <span style={{ display: 'block', fontSize: TYPE.meta, color: selected ? 'var(--on-pri)' : 'var(--tx3)' }}>{weekdayShort(date, lingua)}</span>
                  <span style={{ display: 'block', fontWeight: 700 }}>{date.getDate()}</span>
                  <KindDots
                    salon={rows.some((item) => appointmentKind(item) === 'pelosetto')}
                    personal={rows.some((item) => appointmentKind(item) === 'personale')}
                  />
                </button>
              )
            })}
          </div>
        ) : null}
        <p style={{ margin: '8px 0', padding: `0 ${SIZES.pagePadX}px`, fontSize: TYPE.base }}>{summaryText(summary, lingua)}</p>
        {dayClosure && vista !== 'mese' ? (
          <button
            type="button"
            data-apri=""
            aria-label={t(lingua, 'homeApriChiusura', { motivo: dayClosure.reason })}
            onClick={() => openSheet(`/chiusure/${dayClosure.id}`)}
            style={{
              margin: `0 ${SIZES.pagePadX}px 8px`,
              border: 0,
              borderRadius: 8,
              ...cellPaint(CLOSED_CELL_BACKGROUND),
              color: 'var(--bad)',
              font: 'inherit',
              fontWeight: 700,
              minHeight: 44,
              height: 'auto',
              textAlign: 'left',
              padding: '8px 12px',
            }}
          >
            {t(lingua, 'homeSaloneChiuso', { motivo: dayClosure.reason })}
          </button>
        ) : null}
        {vista === 'mese' ? (
          <div
            onPointerDown={(event) => rememberSwipe(event, false)}
            onPointerUp={releaseSwipe}
            onPointerCancel={cancelSwipe}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: `0 ${SIZES.pagePadX}px 12px` }}
          >
            <div role="grid" aria-label={frasi.agendaMese} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2 }}>
              {weekDays(day).map((date) => (
                <span key={date.getDay()} style={{ textAlign: 'center', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{weekdayShort(date, lingua)}</span>
              ))}
              {monthCells(day).map((date) => {
                const key = localDayKey(date)
                const selected = key === localDayKey(day)
                const inMonth = date.getMonth() === day.getMonth()
                const today = key === localDayKey(now)
                const weekend = date.getDay() === 0 || date.getDay() === 6
                const rows = onLocalDay(appointments, date)
                const salonCount = rows.filter((item) => appointmentKind(item) === 'pelosetto').length
                const personalCount = rows.filter((item) => appointmentKind(item) === 'personale').length
                const closure = closureOn(closures, key)
                const face = monthCellFace({ salonCount, personalCount, closed: closure !== null, selected, today, inMonth, weekend })
                const label = monthCellLabel(date, closure?.reason ?? null, salonCount, personalCount, lingua)
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
                      ...cellPaint(face.background),
                      color: face.color,
                      boxShadow: face.boxShadow,
                      padding: '4px 0',
                      minHeight: 44,
                      height: 'auto',
                      font: 'inherit',
                      fontWeight: face.fontWeight,
                    }}
                  >
                    <span style={{ display: 'block' }}>{date.getDate()}</span>
                    {face.closedLabel ? (
                      <span style={{ display: 'block', color: selected ? 'var(--on-pri)' : 'var(--bad)', fontSize: TYPE.meta, fontWeight: 700, lineHeight: 1.1 }}>{frasi.chiuso}</span>
                    ) : null}
                    {face.salonBadge || face.personalBadge ? (
                      <span style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {face.salonBadge ? <CountBadge value={face.salonBadge} tone="salon" halo={face.badgeHalo} /> : null}
                        {face.personalBadge ? <CountBadge value={face.personalBadge} tone="personal" halo={face.badgeHalo} /> : null}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <section aria-label={t(lingua, 'agendaAppuntamentiGiorno', { data: dataDelGiorno(day, lingua) })} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <SectionTitle>{dataDelGiorno(day, lingua)}</SectionTitle>
              {dayClosure ? (
                <button
                  type="button"
                  data-apri=""
                  aria-label={t(lingua, 'homeApriChiusura', { motivo: dayClosure.reason })}
                  onClick={() => openSheet(`/chiusure/${dayClosure.id}`)}
                  style={{
                    border: 0,
                    borderRadius: 8,
                    ...cellPaint(CLOSED_CELL_BACKGROUND),
                    color: 'var(--bad)',
                    font: 'inherit',
                    fontWeight: 700,
                    minHeight: 44,
                    height: 'auto',
                    textAlign: 'left',
                    padding: '8px 12px',
                  }}
                >
                  {t(lingua, 'homeSaloneChiuso', { motivo: dayClosure.reason })}
                </button>
              ) : null}
              {dayRows.length === 0 ? (
                <Card>
                  <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>{frasi.homeNessunAppuntamento}</p>
                </Card>
              ) : (
                <Card>
                  {dayRows.map((appointment, index) => {
                    if (appointmentKind(appointment) === 'personale') {
                      const title = appointment.title?.trim() || frasi.homePersonale
                      return (
                        <Row key={appointment.id} style={{ background: 'var(--personal-s)', padding: 0, ...(index === 0 ? { borderTop: 'none' } : {}) }}>
                          <PersonalEntry title={title} when={personalWhen(appointment)} onOpen={() => openSheet('/appuntamenti/personale/' + appointment.id)} />
                        </Row>
                      )
                    }
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
            </section>
          </div>
        ) : vista === 'settimana' ? (
          <div
            role="region"
            aria-label={frasi.agendaSettimana}
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
              closures={closures}
              onSelectDay={goTo}
              onOpenDay={openDay}
              onOpen={(id) => {
                const item = appointments.find((appointment) => appointment.id === id)
                openSheet(item && appointmentKind(item) === 'personale' ? `/appuntamenti/personale/${id}` : `/appuntamenti/${id}`)
              }}
              onCreate={(date) => openSheet(`/appuntamenti/nuovo?data=${localDayKey(date)}`)}
            />
          </div>
        ) : laid ? (
          <div style={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0 }}>
            <div
              ref={scroller}
              role="grid"
              aria-label={frasi.agendaOrari}
              onPointerDown={(event) => rememberSwipe(event, true)}
              onPointerUp={releaseSwipe}
              onPointerCancel={cancelSwipe}
              onScroll={measure}
              style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y', padding: `${LABEL_PAD}px ${SIZES.pagePadX}px 12px` }}
            >
              <div style={{ position: 'relative', width: SIZES.calendar.gutter, height: laid.height, flex: 'none' }}>
                {laid.segments.map((segment) => segment.kind === 'empty' ? (
                  <span
                    key={`empty-${segment.hour}`}
                    style={{ position: 'absolute', top: segment.top + segment.height / 2, transform: 'translateY(-50%)', fontSize: TYPE.meta, color: 'var(--tx3)', lineHeight: 1 }}
                  >
                    {markLabel(segment.hour * 60)}
                  </span>
                ) : segment.marks.map((mark) => (
                  <span
                    key={`mark-${mark.minute}`}
                    style={{ position: 'absolute', top: mark.top, fontSize: TYPE.meta, color: 'var(--tx3)', lineHeight: 1 }}
                  >
                    {markLabel(mark.minute)}
                  </span>
                )))}
                <span style={{ position: 'absolute', top: laid.height, fontSize: TYPE.meta, color: 'var(--tx3)', lineHeight: 1 }}>
                  {markLabel(bounds.endHour * 60)}
                </span>
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
                    segments={laid.segments}
                    height={laid.height}
                    now={now}
                    showNow
                    closed={dayClosure !== null}
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
                {t(lingua, 'agendaPrima', { n: counts.before, ora: SIZES.calendar.startHour })}
              </button>
            ) : null}
            {showAfter ? (
              <button
                type="button"
                data-hint="dopo"
                onClick={() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight }}
                style={{ ...hintStyle, bottom: 4 }}
              >
                {t(lingua, 'agendaDopo', { n: counts.after, ora: SIZES.calendar.endHour })}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ShellFrame>
  )
}
