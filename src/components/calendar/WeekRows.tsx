import { format } from 'date-fns'
import { Archive, Check } from 'lucide-react'
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { dataBreve, giornoCorto } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import type { Lingua } from '../../i18n/lingua'
import { localDayKey, onLocalDay, STATO_COMPLETATO, STATO_DISDETTO } from '../../lib/appointments'
import { oraRoma } from '../../lib/disponibilita'
import { riepilogoGiorno, testoRiepilogo } from '../../lib/settimana'
import { CLOSED_CELL_BACKGROUND, cellPaint } from '../../lib/calendarView'
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
  const origin = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const selectedDay = localDayKey(day) === localDayKey(selected)
  const closed = closureOn(closures, localDayKey(day)) !== null

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    swiped.current = false
    origin.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!origin.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    origin.current = null
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return
    swiped.current = true
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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          minWidth: 0,
          overflowX: 'hidden',
          touchAction: 'pan-y',
        }}
      >
        {items.map((appointment) => {
          const personal = appointmentKind(appointment) === 'personale'
          const dog = personal ? undefined : dogs.find((item) => item.id === appointment.dogId)
          const ospite = appointment.ospiteNome?.trim() ?? ''
          const name = personal ? (appointment.title?.trim() || frasi.homePersonale) : (dog?.name ?? (ospite || frasi.rigaCaneAssente))
          const title = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
          const extra = hasExtraNotes(appointment.extraNotes)
          const cancelled = appointment.status === STATO_DISDETTO || appointment.status === 'non_venuto'
          const firstService = appointment.services[0]
          return (
            <button
              key={appointment.id}
              type="button"
              aria-label={t(lingua, 'apriNome', { nome: name })}
              onClick={() => {
                if (swallowed()) return
                onOpen(appointment.id)
              }}
              style={{
                flex: '0 0 auto',
                width: 'auto',
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderLeftWidth: 1,
                borderStyle: 'solid',
                borderTopColor: 'var(--line)',
                borderRightColor: 'var(--line)',
                borderBottomColor: 'var(--line)',
                borderLeftColor: 'var(--line)',
                borderRadius: 8,
                padding: '4px 8px',
                background: appointment.provvisorio ? 'var(--warn-s)' : personal ? 'var(--personal-s)' : 'var(--card)',
                boxShadow: personal ? 'inset 3px 0 0 var(--personal)' : undefined,
                font: 'inherit',
                textAlign: 'left',
                textDecoration: !personal && cancelled ? 'line-through' : undefined,
                color: personal ? 'var(--personal-ink)' : cancelled ? 'var(--tx3)' : 'var(--tx)',
              }}
            >
              <span style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 4, minWidth: 0 }}>
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
                  {firstService ? (
                    <ServiceIcon
                      iconKey={services.find((service) => service.id === firstService.serviceId)?.iconKey}
                      size={SIZES.chip.serviceIconInChip}
                    />
                  ) : null}
                  {appointment.services.length > 1 ? <span>+1</span> : null}
                </span>
              )}
              {title || extra ? (
                <span style={{ display: 'block', width: '100%', fontSize: 12 }}>
                  <NoteAltro note={title} altro={extra} />
                </span>
              ) : null}
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
          style={{ flex: '1 0 24px', minHeight: 28, border: 0, background: 'transparent', padding: 0 }}
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
