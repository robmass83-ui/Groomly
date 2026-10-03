import { useState, type CSSProperties, type FormEvent } from 'react'
import { TYPE } from '../theme/theme'
import { buildSearchKey, normalizeSearch } from '../lib/dogList'
import { formatEuro } from '../lib/format'
import {
  START_TIMES,
  appointmentEnd,
  formatDuration,
  overlapLabel,
  prepareAppointmentWrite,
  sumDuration,
  sumPrice,
  type AppointmentField,
} from '../lib/appointments'
import type { AppointmentFormValues } from '../lib/schemas'
import type { Appointment, AppointmentWrite, Dog, Service } from '../types/models'
import { Button } from '../components/ui/Button'

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

function matchesQuery(dog: Dog, query: string): boolean {
  const normalized = normalizeSearch(query)
  if (!normalized) return false
  return buildSearchKey(dog.name, dog.breed, dog.contact.name).includes(normalized)
}

export function AppointmentForm({
  dogs,
  services,
  appointments,
  ignoreId,
  initial,
  onSubmit,
}: {
  dogs: Dog[]
  services: Service[]
  appointments: Appointment[]
  ignoreId?: string
  initial: AppointmentFormValues
  onSubmit: (write: AppointmentWrite) => void
}) {
  const [dogId, setDogId] = useState(initial.dogId)
  const [query, setQuery] = useState(() => dogs.find((dog) => dog.id === initial.dogId)?.name ?? '')
  const [serviceIds, setServiceIds] = useState(initial.serviceIds)
  const [day, setDay] = useState(initial.day)
  const [time, setTime] = useState(initial.time)
  const [fieldError, setFieldError] = useState<{ field: AppointmentField; message: string } | null>(null)

  const existing = ignoreId ? appointments.find((item) => item.id === ignoreId) ?? null : null
  const values: AppointmentFormValues = { dogId, serviceIds, day, time }
  const prepared = prepareAppointmentWrite(values, dogs, services, existing)
  const activeServices = services.filter((service) => service.active).sort((a, b) => a.order - b.order)
  const activeDogs = dogs.filter((dog) => dog.status === 'attivo')
  const matches = activeDogs.filter((dog) => matchesQuery(dog, query))
  const overlap = prepared.ok
    ? overlapLabel(
      appointments,
      (id) => dogs.find((dog) => dog.id === id)?.name ?? 'Cane assente',
      prepared.write.start,
      appointmentEnd(prepared.write.start, prepared.write.services),
      ignoreId,
    )
    : null

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = prepareAppointmentWrite(values, dogs, services, existing)
    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }
    setFieldError(null)
    onSubmit(result.write)
  }

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setFieldError(null)
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
        {activeDogs.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun cane</p> : null}
        {matches.map((dog) => (
          <button
            key={dog.id}
            type="button"
            onClick={() => {
              setDogId(dog.id)
              setQuery(dog.name)
              setFieldError(null)
            }}
            style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 9, background: dog.id === dogId ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', fontWeight: 600, padding: '6px 10px' }}
          >
            {dog.name}
          </button>
        ))}
        {fieldError?.field === 'dogId' ? <p style={errorStyle}>{fieldError.message}</p> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: TYPE.base }}>Servizi</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {activeServices.map((service) => {
            const pressed = serviceIds.includes(service.id)
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={pressed}
                onClick={() => toggleService(service.id)}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  background: pressed ? 'var(--surf)' : 'transparent',
                  color: 'var(--tx)',
                  fontWeight: 600,
                  fontSize: TYPE.base,
                  padding: '3px 8px',
                }}
              >
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
        {fieldError?.field === 'time' ? <p style={errorStyle}>{fieldError.message}</p> : null}
        {overlap ? <p style={{ margin: 0, fontSize: TYPE.base }}>{overlap}</p> : null}
      </div>
      {prepared.ok ? (
        <p style={{ margin: 0, fontSize: TYPE.base }}>
          {`${formatDuration(sumDuration(prepared.write.services))} · ${formatEuro(sumPrice(prepared.write.services))}`}
        </p>
      ) : null}
      <Button type="submit">Salva</Button>
    </form>
  )
}
