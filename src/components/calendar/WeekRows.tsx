import { format } from 'date-fns'
import { Archive, Check } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dataBreve, giornoCorto } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import type { Lingua } from '../../i18n/lingua'
import { localDayKey, onLocalDay, STATO_COMPLETATO, STATO_DISDETTO } from '../../lib/appointments'
import { oraRoma } from '../../lib/disponibilita'
import { riepilogoGiorno, testoRiepilogo } from '../../lib/settimana'
import { CLOSED_CELL_BACKGROUND, cellPaint, weekCardLayout } from '../../lib/calendarView'
import { closureOn, type Closure } from '../../lib/closures'
import { splitCritical } from '../../lib/display'
import { hasExtraNotes } from '../../lib/dogNotes'
import { formatHomeDate, IT_DATE } from '../../lib/format'
import { appointmentKind } from '../../lib/personal'
import { SIZES } from '../../theme/sizes'
import type { Appointment, Dog, Service } from '../../types/models'
import { NoteAltro } from '../domain/NoteAltro'
import { PersonalGlyph } from '../domain/PersonalAppointment'
import { ServiceIcon } from '../domain/ServiceIcon'
import { TemperamentIcon } from '../domain/TemperamentIcon'

type OpenPhase = 'closed' | 'expanding' | 'open'

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function sameWidths(left: number[] | null, right: number[]): boolean {
  return left !== null && left.length === right.length && left.every((value, index) => value === right[index])
}

function shortWeekday(day: Date, lingua: Lingua): string {
  if (lingua !== 'it') return giornoCorto(lingua, day.getDay())
  const raw = format(day, 'EEE', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function oraEntro(scadeIl: string | undefined): string {
  if (!scadeIl) return ''
  const data = new Date(scadeIl)
  if (Number.isNaN(data.getTime())) return ''
  return oraRoma(data)
}

function cardTime(appointment: Appointment): string {
  const start = format(appointment.start, 'HH:mm')
  if (appointmentKind(appointment) !== 'personale' || !appointment.plannedEnd) return start
  return `${start}\u2013${format(appointment.plannedEnd, 'HH:mm')}`
}

function WeekDayRow({
  day,
  selected,
  appointments,
  dogs,
  services,
  rowWidth,
  closures,
  onSelectDay,
  onOpen,
  onOpenDay,
  onCreate,
}: {
  day: Date
  selected: Date
  appointments: Appointment[]
  dogs: Dog[]
  services: Service[]
  closures: Closure[]
  rowWidth?: number
  onSelectDay: (day: Date) => void
  onOpen: (id: string) => void
  onOpenDay: (day: Date) => void
  onCreate: (day: Date) => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const dataGiorno = lingua === 'it' ? formatHomeDate(day) : dataBreve(lingua, day)
  const riepilogo = riepilogoGiorno(appointments, day)
  const testo = testoRiepilogo(lingua, riepilogo)
  const items = onLocalDay(appointments, day)
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime() || left.id.localeCompare(right.id))
  const itemKey = items.map((item) => `${item.id}:${item.start.getTime()}`).join('|')
  const stripRef = useRef<HTMLDivElement>(null)
  const nameRefs = useRef<Array<HTMLElement | null>>([])
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const origin = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const phaseWas = useRef<OpenPhase>('closed')
  const [phase, setPhase] = useState<OpenPhase>('closed')
  const [measuredRow, setMeasuredRow] = useState<number | null>(null)
  const [measuredNames, setMeasuredNames] = useState<number[] | null>(null)
  const selectedDay = localDayKey(day) === localDayKey(selected)
  const closed = closureOn(closures, localDayKey(day)) !== null

  useLayoutEffect(() => {
    if (rowWidth != null) return
    const next = items.map((_, index) => Math.max(72, nameRefs.current[index]?.scrollWidth ?? 0))
    setMeasuredNames((current) => (sameWidths(current, next) ? current : next))
  }, [rowWidth, itemKey, items])

  useEffect(() => {
    if (rowWidth != null) return
    const node = stripRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      setMeasuredRow(entries[0]?.contentRect.width ?? 0)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [rowWidth, itemKey])

  const fullWidths = rowWidth != null ? items.map(() => 100) : (measuredNames ?? items.map(() => 72))
  const layoutWidth = rowWidth != null ? rowWidth : measuredRow
  const natural = layoutWidth == null ? items.map(() => true) : weekCardLayout(fullWidths, layoutWidth)
  const expanded = phase !== 'closed'
  const shown = expanded ? items.map(() => true) : natural
  const lastSliverIndex = natural.reduce((found, isNatural, index) => (isNatural ? found : index), -1)
  const firstSliverIndex = natural.findIndex((isNatural) => !isNatural)
  const motion =
    phase === 'open' || prefersReducedMotion()
      ? { transitionProperty: 'none', transitionDuration: '0s' }
      : { transitionProperty: 'width, transform', transitionDuration: '220ms', transitionTimingFunction: 'ease' }

  useEffect(() => {
    if (phase !== 'expanding') return
    const index = lastSliverIndex < 0 ? 0 : lastSliverIndex
    const timer = window.setTimeout(() => setPhase('open'), index * 80 + 220)
    return () => window.clearTimeout(timer)
  }, [phase, lastSliverIndex])

  useEffect(() => {
    const leftClosed = phaseWas.current === 'closed' && phase !== 'closed'
    phaseWas.current = phase
    if (!leftClosed || firstSliverIndex < 0) return
    const node = cardRefs.current[firstSliverIndex]
    if (!node || typeof node.scrollIntoView !== 'function') return
    node.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [phase, firstSliverIndex])

  function hidesSlivers(): boolean {
    return phase !== 'closed' || natural.some((isNatural) => !isNatural)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (hidesSlivers()) event.stopPropagation()
    swiped.current = false
    origin.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!origin.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    origin.current = null
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) || !hidesSlivers()) return
    event.stopPropagation()
    swiped.current = true
    if (prefersReducedMotion()) {
      setPhase('open')
      return
    }
    setPhase((current) => (current === 'closed' ? 'expanding' : 'open'))
  }

  function onPointerCancel() {
    origin.current = null
  }

  function swallowed(): boolean {
    if (!swiped.current) return false
    swiped.current = false
    return true
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '52px minmax(0, 1fr)',
        alignItems: 'start',
        columnGap: 8,
        borderTop: '1px solid var(--line)',
        padding: '6px 0',
      }}
    >
      <button
        type="button"
        aria-label={t(lingua, 'agendaSeleziona', { data: dataGiorno })}
        aria-pressed={selectedDay}
        onClick={() => onSelectDay(day)}
        style={{
          width: '100%',
          border: 0,
          borderRadius: 8,
          textAlign: 'center',
          font: 'inherit',
          minHeight: 44,
          height: 'auto',
          ...cellPaint(selectedDay ? 'var(--pri-solid)' : closed ? CLOSED_CELL_BACKGROUND : 'transparent'),
          color: selectedDay ? 'var(--on-pri)' : 'var(--tx)',
        }}
      >
        <span style={{ display: 'block', fontSize: 12 }}>{shortWeekday(day, lingua)}</span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{format(day, 'd')}</span>
        {closed ? (
          <span style={{ display: 'block', color: selectedDay ? 'var(--on-pri)' : 'var(--bad)', fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>{frasi.chiuso}</span>
        ) : null}
      </button>
      {riepilogo.pieno ? (
        <button
          type="button"
          aria-label={testo}
          onClick={() => onOpenDay(day)}
          style={{
            width: '100%',
            minHeight: 44,
            border: 0,
            borderRadius: 8,
            background: 'var(--card)',
            color: 'var(--tx)',
            font: 'inherit',
            fontWeight: 700,
            textAlign: 'left',
            padding: '8px 10px',
          }}
        >
          {testo}
        </button>
      ) : (
      <div style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--tx2)', padding: '0 0 4px' }}>{testo}</span>
      <div
        ref={stripRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 4,
          minWidth: 0,
          overflowX: 'auto',
          touchAction: phase === 'closed' ? 'pan-y' : 'pan-x pan-y',
        }}
      >
        {items.map((appointment, index) => {
          const personal = appointmentKind(appointment) === 'personale'
          const dog = personal ? undefined : dogs.find((item) => item.id === appointment.dogId)
          const ospite = appointment.ospiteNome?.trim() ?? ''
          const name = personal ? (appointment.title?.trim() || frasi.homePersonale) : (dog?.name ?? (ospite || frasi.rigaCaneAssente))
          const title = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
          const extra = hasExtraNotes(appointment.extraNotes)
          const cancelled = appointment.status === STATO_DISDETTO || appointment.status === 'non_venuto'
          const squashed = !shown[index]
          const opening = expanded && !natural[index]
          const transitionDelay = !opening ? undefined : phase === 'expanding' ? `${index * 80}ms` : '0ms'
          return (
            <button
              key={appointment.id}
              ref={(node) => {
                cardRefs.current[index] = node
              }}
              type="button"
              aria-label={t(lingua, 'apriNome', { nome: name })}
              data-squashed={squashed ? 'true' : 'false'}
              onClick={() => {
                if (swallowed()) return
                onOpen(appointment.id)
              }}
              style={{
                flex: squashed ? '0 0 34px' : '0 0 auto',
                width: squashed ? 34 : opening ? fullWidths[index] : undefined,
                overflow: squashed ? 'hidden' : undefined,
                ...motion,
                transitionDelay,
                border: 0,
                borderRadius: 8,
                padding: squashed ? undefined : '4px 6px',
                background: appointment.provvisorio ? 'var(--warn-s)' : personal ? 'var(--personal-s)' : 'var(--card)',
                boxShadow: personal ? 'inset 3px 0 0 var(--personal)' : undefined,
                font: 'inherit',
                textAlign: 'left',
                textDecoration: !personal && cancelled ? 'line-through' : undefined,
                color: personal ? 'var(--personal-ink)' : cancelled ? 'var(--tx3)' : 'var(--tx)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: fullWidths[index],
                  transform: squashed ? 'scaleX(0.3)' : opening ? 'scaleX(1)' : undefined,
                  transformOrigin: 'left center',
                  ...motion,
                  transitionDelay,
                }}
              >
                <span
                  ref={(node) => {
                    nameRefs.current[index] = node
                  }}
                  style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 4, minWidth: 0 }}
                >
                  {personal ? <PersonalGlyph size={16} /> : null}
                  <span style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 800 }}>
                    {name}
                  </span>
                  {!personal && dog ? <TemperamentIcon kind={dog.temperament} size={12} /> : null}
                  {!personal && appointment.status === STATO_COMPLETATO ? (
                    <Check size={12} strokeWidth={3} color="var(--ok)" aria-label={frasi.homeCompletato} />
                  ) : null}
                  {!personal && dog && dog.status !== 'attivo' ? (
                    <Archive size={12} strokeWidth={2} aria-label={frasi.agendaCaneArchiviato} />
                  ) : null}
                  <span style={{ fontSize: 12 }}>{cardTime(appointment)}</span>
                </span>
                {personal ? null : appointment.provvisorio ? (
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--tx3)' }}>
                    {t(lingua, 'agendaDaConfermare', { ora: oraEntro(appointment.scadeIl) })}
                  </span>
                ) : (
                  <span style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 4 }}>
                    {appointment.services.map((line, serviceIndex) => (
                      <ServiceIcon
                        key={`${line.serviceId}-${serviceIndex}`}
                        iconKey={services.find((service) => service.id === line.serviceId)?.iconKey}
                        size={SIZES.chip.serviceIconInChip}
                      />
                    ))}
                  </span>
                )}
                {title || extra ? (
                  <span style={{ display: 'block', width: '100%', fontSize: 12 }}>
                    <NoteAltro note={title} altro={extra} />
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          aria-label={t(lingua, 'agendaNuovoGiorno', { data: dataGiorno })}
          onClick={() => {
            if (swallowed()) return
            onCreate(day)
          }}
          style={{ flex: '1 1 auto', minWidth: 0, border: 0, background: 'transparent', padding: 0 }}
        />
      </div>
      </div>
      )}
    </div>
  )
}

export function WeekRows(props: {
  days: Date[]
  selected: Date
  appointments: Appointment[]
  dogs: Dog[]
  services: Service[]
  closures?: Closure[]
  rowWidth?: number
  onSelectDay: (day: Date) => void
  onOpen: (id: string) => void
  onOpenDay: (day: Date) => void
  onCreate: (day: Date) => void
}): JSX.Element {
  const closures = props.closures ?? []
  return (
    <div>
      {props.days.map((day) => (
        <WeekDayRow
          key={localDayKey(day)}
          day={day}
          selected={props.selected}
          appointments={props.appointments}
          dogs={props.dogs}
          services={props.services}
          closures={closures}
          rowWidth={props.rowWidth}
          onSelectDay={props.onSelectDay}
          onOpen={props.onOpen}
          onOpenDay={props.onOpenDay}
          onCreate={props.onCreate}
        />
      ))}
    </div>
  )
}
