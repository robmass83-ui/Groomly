import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { addWeeks, format } from 'date-fns'
import { Link } from 'react-router-dom'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Button } from '../components/ui/Button'
import {
  START_TIMES,
  appointmentEnd,
  combineDayTime,
  isStartTime,
  overlapLabel,
  parseDayParam,
  prepareAppointmentWrite,
  sumDuration,
  sumPrice,
  type AppointmentField,
} from '../lib/appointments'
import { normalizeSearch } from '../lib/dogList'
import { formatCompactDuration } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { quotedPrice, rankDogs } from '../lib/quote'
import type { AppointmentFormValues } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentWrite, Dog, Service } from '../types/models'

const errorStyle: CSSProperties = { margin: 0, color: 'var(--bad)', fontSize: TYPE.meta }

function controlStyle(invalid: boolean): CSSProperties {
  return {
    height: 34,
    borderRadius: 9,
    border: `1px solid ${invalid ? 'var(--bad)' : 'var(--line)'}`,
    background: 'var(--card)',
    color: 'var(--tx)',
    padding: '0 10px',
    font: 'inherit',
  }
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function latestServiceIds(dogId: string, appointments: Appointment[], services: Service[]): string[] {
  if (!dogId) return []
  const latest = appointments
    .filter((item) => item.dogId === dogId)
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))[0]
  if (!latest) return []
  const active = new Set(services.filter((service) => service.active).map((service) => service.id))
  return latest.services.map((line) => line.serviceId).filter((id) => active.has(id))
}

function markedName(name: string, query: string): ReactNode {
  const needle = normalizeSearch(query)
  const haystack = normalizeSearch(name)
  const index = needle ? haystack.indexOf(needle) : -1
  if (index < 0) return name
  const end = index + needle.length
  return (
    <>
      {name.slice(0, index)}<mark style={{ background: 'none', color: 'var(--pri)', padding: 0 }}>{name.slice(index, end)}</mark>{name.slice(end)}
    </>
  )
}

function withCardQuote(write: AppointmentWrite, dogs: Dog[], services: Service[]): AppointmentWrite {
  const dog = dogs.find((item) => item.id === write.dogId)
  if (!dog) return write
  return {
    ...write,
    services: write.services.map((line) => {
      const service = services.find((item) => item.id === line.serviceId)
      if (!service) return line
      const quote = quotedPrice(dog, service)
      return { ...line, price: quote.price, durationMin: quote.durationMin }
    }),
  }
}

export function AppointmentForm({
  dogs,
  services,
  appointments,
  ignoreId,
  initial,
  returnTo,
  onDay,
  onSubmit,
}: {
  dogs: Dog[]
  services: Service[]
  appointments: Appointment[]
  ignoreId?: string
  initial: AppointmentFormValues
  returnTo: string
  onDay?: (day: string) => void
  onSubmit: (write: AppointmentWrite, repeat: { weeks: number } | null) => void
}) {
  const [dogId, setDogId] = useState(initial.dogId)
  const [query, setQuery] = useState(() => dogs.find((dog) => dog.id === initial.dogId)?.name ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [serviceIds, setServiceIds] = useState(() => (
    initial.serviceIds.length > 0 || ignoreId ? initial.serviceIds : latestServiceIds(initial.dogId, appointments, services)
  ))
  const [day, setDay] = useState(initial.day)
  const [time, setTime] = useState(initial.time)
  const [repeat, setRepeat] = useState(() => dogs.find((dog) => dog.id === initial.dogId)?.clientType === 'mensile')
  const [weeksInput, setWeeksInput] = useState(() => {
    const weeks = dogs.find((dog) => dog.id === initial.dogId)?.recurrenceWeeks
    return String(typeof weeks === 'number' && weeks >= 1 ? weeks : 4)
  })
  const [fieldError, setFieldError] = useState<{ field: AppointmentField; message: string } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 120)
    return () => window.clearTimeout(timer)
  }, [query])

  const existing = ignoreId ? appointments.find((item) => item.id === ignoreId) ?? null : null
  const values: AppointmentFormValues = { dogId, serviceIds, day, time }
  const prepared = prepareAppointmentWrite(values, dogs, services, existing)
  const quoted = prepared.ok ? withCardQuote(prepared.write, dogs, services) : null
  const activeServices = services.filter((service) => service.active).sort((a, b) => a.order - b.order)
  const needle = debouncedQuery.trim()
  const matches = needle ? rankDogs(dogs, needle) : []
  const selected = dogs.find((dog) => dog.id === dogId)
  const overlap = quoted
    ? overlapLabel(
      appointments,
      (id) => dogs.find((dog) => dog.id === id)?.name ?? 'Cane assente',
      quoted.start,
      appointmentEnd(quoted.start, quoted.services),
      ignoreId,
    )
    : null
  const parsedWeeks = Number(weeksInput)
  const weeks = Number.isInteger(parsedWeeks) && parsedWeeks >= 1 ? parsedWeeks : 4
  const nextBase = isStartTime(time) ? combineDayTime(day, time) : parseDayParam(day, new Date())
  const nextWhen = format(addWeeks(nextBase, weeks), 'd MMM', IT_DATE)

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = prepareAppointmentWrite(values, dogs, services, existing)
    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }
    setFieldError(null)
    const write = withCardQuote(result.write, dogs, services)
    onSubmit(write, !ignoreId && repeat && selected ? { weeks } : null)
  }

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setFieldError(null)
  }

  function chooseDog(dog: Dog) {
    setDogId(dog.id)
    setQuery(dog.name)
    setRepeat(dog.clientType === 'mensile')
    const storedWeeks = dog.recurrenceWeeks
    setWeeksInput(String(typeof storedWeeks === 'number' && storedWeeks >= 1 ? storedWeeks : 4))
    setFieldError(null)
    if (!ignoreId) {
      setServiceIds((current) => (current.length > 0 ? current : latestServiceIds(dog.id, appointments, services)))
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="appointment-dog" style={{ fontWeight: 600, fontSize: TYPE.base }}>Cane</label>
        <input
          id="appointment-dog"
          aria-label="Cane"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setDogId('')
            setFieldError(null)
          }}
          style={controlStyle(fieldError?.field === 'dogId')}
        />
        {dogs.filter((dog) => dog.status === 'attivo').length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun cane</p> : null}
        {matches.map((dog) => (
          <button
            key={dog.id}
            type="button"
            aria-label={dog.name}
            onClick={() => chooseDog(dog)}
            style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 9, background: dog.id === dogId ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', fontWeight: 600, padding: '6px 10px' }}
          >
            {markedName(dog.name, needle)}
          </button>
        ))}
        {!ignoreId && needle ? (
          <Link to="/animali/nuovo" state={{ name: needle, returnTo }}>{`+ Nuovo cane "${needle}"`}</Link>
        ) : null}
        {fieldError?.field === 'dogId' ? <p style={errorStyle}>{fieldError.message}</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: TYPE.base }}>Servizi</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {activeServices.map((service) => {
            const pressed = serviceIds.includes(service.id)
            const durationMin = selected ? quotedPrice(selected, service).durationMin : service.durationMin.piccola
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggleService(service.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  background: pressed ? 'var(--surf)' : 'transparent',
                  color: 'var(--tx)',
                  fontWeight: 600,
                  fontSize: TYPE.base,
                  padding: '3px 8px',
                }}
              >
                <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ServiceIcon iconKey={service.iconKey} size={SIZES.chip.serviceIconInChip} />
                  <span>{formatCompactDuration(durationMin)}</span>
                </span>
                {service.name}
              </button>
            )
          })}
        </div>
        {fieldError?.field === 'serviceIds' ? <p style={errorStyle}>{fieldError.message}</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="appointment-day" style={{ fontWeight: 600, fontSize: TYPE.base }}>Giorno</label>
        <input
          id="appointment-day"
          aria-label="Giorno"
          type="date"
          value={day}
          onChange={(event) => {
            setDay(event.target.value)
            onDay?.(event.target.value)
            setFieldError(null)
          }}
          style={controlStyle(fieldError?.field === 'day')}
        />
        {fieldError?.field === 'day' ? <p style={errorStyle}>{fieldError.message}</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="appointment-time" style={{ fontWeight: 600, fontSize: TYPE.base }}>Ora</label>
        <select
          id="appointment-time"
          aria-label="Ora"
          value={time}
          onChange={(event) => {
            setTime(event.target.value)
            setFieldError(null)
          }}
          style={controlStyle(fieldError?.field === 'time')}
        >
          <option value="">Scegli</option>
          {START_TIMES.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
        </select>
        {quoted ? <p style={{ margin: 0, fontSize: TYPE.base }}>{`${time} → ${clock(appointmentEnd(quoted.start, quoted.services))}`}</p> : null}
        {fieldError?.field === 'time' ? <p style={errorStyle}>{fieldError.message}</p> : null}
        {overlap ? <p style={{ margin: 0, fontSize: TYPE.base }}>{overlap}</p> : null}
      </div>
      {quoted ? (
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 8 }}>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Durata stimata</div>
          <div style={{ fontWeight: 700, fontSize: TYPE.dogName }}>{formatCompactDuration(sumDuration(quoted.services))}</div>
          <div style={{ fontSize: TYPE.base }}>{`${formatEuro(sumPrice(quoted.services))} da scheda`}</div>
        </div>
      ) : null}
      {!ignoreId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            aria-pressed={repeat}
            onClick={() => setRepeat((current) => !current)}
            style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 9, background: repeat ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', fontWeight: 600, padding: '6px 10px' }}
          >
            Ripeti · cliente mensile
          </button>
          {repeat ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ margin: 0, fontSize: TYPE.base }}>{`ogni ${weeks} settimane · prossimo ${nextWhen}`}</p>
              <input
                aria-label="Settimane"
                inputMode="numeric"
                value={weeksInput}
                onChange={(event) => setWeeksInput(event.target.value)}
                style={controlStyle(false)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <Button type="submit">Salva appuntamento</Button>
    </form>
  )
}
