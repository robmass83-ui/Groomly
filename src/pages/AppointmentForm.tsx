import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { addDays, addWeeks, format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { DogAvatar } from '../components/domain/DogAvatar'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { IconTile } from '../components/ui/IconTile'
import { Segmented } from '../components/ui/Segmented'
import {
  START_TIMES,
  appointmentEnd,
  combineDayTime,
  isStartTime,
  localDayKey,
  onLocalDay,
  parseDayParam,
  prepareAppointmentWrite,
  rangesOverlap,
  repeatChoice,
  sumDuration,
  sumPrice,
  type AppointmentField,
} from '../lib/appointments'
import { breedSurname, matchesDog, normalizeSearch } from '../lib/dogList'
import { dogPortrait } from '../lib/dogPhoto'
import { formatCompactDuration } from '../lib/display'
import { IT_DATE } from '../lib/format'
import { quotedPrice, rankDogs } from '../lib/quote'
import type { AppointmentFormValues } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentService, AppointmentWrite, Dog, DogSize, DogWrite, Service, Species } from '../types/models'

const NEW_DOG_ID = '__nuovo-cane__'
const SLOT_MIN = 15

const errorStyle: CSSProperties = { margin: 0, color: 'var(--bad)', fontSize: TYPE.meta }
const blockTitle: CSSProperties = { margin: 0, fontWeight: 700, fontSize: TYPE.base }

function controlStyle(invalid: boolean): CSSProperties {
  return {
    minHeight: 44,
    height: 'auto',
    boxSizing: 'border-box',
    borderRadius: 9,
    border: `1px solid ${invalid ? 'var(--bad)' : 'var(--line)'}`,
    background: 'var(--card)',
    color: 'var(--tx)',
    padding: '8px 10px',
    font: 'inherit',
    minWidth: 0,
  }
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function euro(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 1e-9
  return `€${whole ? String(Math.round(amount)) : amount.toFixed(2).replace('.', ',')}`
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

interface NewDogInput {
  name: string
  species: Species
  size: DogSize
  owner: string
  phone: string
}

function virtualDog(input: NewDogInput): Dog {
  const now = new Date()
  return {
    id: NEW_DOG_ID,
    name: input.name.trim(),
    species: input.species,
    breed: '',
    ageCategory: 'adulto',
    size: input.size,
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: input.owner.trim(), phone: input.phone.trim() },
    contacts: [],
    tags: [],
    servicePrices: [],
    hiddenServiceIds: [],
    customFields: [],
    gallery: [],
    status: 'attivo',
    searchKey: '',
    createdAt: now,
    updatedAt: now,
  }
}

export type SavePlan = ReturnType<typeof repeatChoice> & { setFrequency: boolean }

function newDogWrite(input: NewDogInput, plan: SavePlan): DogWrite {
  const write: DogWrite = {
    name: input.name.trim(),
    species: input.species,
    breed: '',
    ageCategory: 'adulto',
    size: input.size,
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: input.owner.trim(), phone: input.phone.trim() },
  }
  if (plan.nextClientType === 'mensile') {
    write.clientType = 'mensile'
    write.recurrenceWeeks = plan.weeks
  }
  return write
}

function existingNameLine(dog: Dog): string {
  const surname = dog.contact.name.trim().split(/\s+/).filter((part) => part !== '').at(-1) ?? ''
  const parts = [dog.breed.trim(), surname].filter((part) => part !== '')
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

function DogCard({ dog, onClear }: { dog: Dog; onClear: () => void }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DogAvatar alt="" src={dogPortrait(dog)} size="md" species={dog.species} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: TYPE.dogName, ...USER_TEXT }}>{dog.name}</span>
            <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.title} />
          </div>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>
            {[dog.breed.trim(), dog.contact.name.trim()].filter((part) => part !== '').join(' · ')}
          </div>
        </div>
        <button
          type="button"
          aria-label="Cambia cane"
          onClick={onClear}
          style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {dog.criticalNote ? (
        <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderLeft: '3px solid var(--bad)', borderRadius: 8, padding: 6, fontSize: TYPE.base, ...USER_TEXT }}>{dog.criticalNote}</p>
      ) : null}
    </div>
  )
}

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'cane', label: 'Cane' },
  { value: 'gatto', label: 'Gatto' },
  { value: 'altro', label: 'Altro' },
]

const SIZE_OPTIONS: { value: DogSize; label: string }[] = [
  { value: 'piccola', label: 'Piccola' },
  { value: 'media', label: 'Media' },
  { value: 'grande', label: 'Grande' },
]

function NewDogCard({ value, onChange, onClear }: { value: NewDogInput; onChange: (next: NewDogInput) => void; onClear: () => void }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: TYPE.base }}>Nuovo cane</span>
        <button
          type="button"
          aria-label="Togli nuovo cane"
          onClick={onClear}
          style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <input aria-label="Nome" placeholder="Nome" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} style={controlStyle(false)} />
      <Segmented label="Specie" value={value.species} onChange={(species) => onChange({ ...value, species })} options={SPECIES_OPTIONS} fill />
      <Segmented label="Taglia" value={value.size} onChange={(size) => onChange({ ...value, size })} options={SIZE_OPTIONS} fill />
      <input aria-label="Proprietario" placeholder="Proprietario" value={value.owner} onChange={(event) => onChange({ ...value, owner: event.target.value })} style={controlStyle(false)} />
      <input aria-label="Telefono" placeholder="Telefono" inputMode="tel" value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} style={controlStyle(false)} />
    </div>
  )
}

function DogRow({ dog, query, selected, onPick }: { dog: Dog; query: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dog.name}
      onClick={onPick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', border: '1px solid var(--line)', borderRadius: 9, background: selected ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', padding: '6px 8px', minWidth: 0, minHeight: 44, height: 'auto' }}
    >
      <DogAvatar alt="" src={dogPortrait(dog)} size="sm" species={dog.species} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={USER_TEXT}>{markedName(dog.name, query)}</span>
          <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.title} />
        </span>
        <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{breedSurname(dog)}</span>
      </span>
    </button>
  )
}

function serviceKey(ids: string[]): string {
  return [...ids].sort().join('|')
}

export function AppointmentForm({
  dogs,
  services,
  appointments,
  ignoreId,
  initial,
  recentDogIds = [],
  onDay,
  onDirtyChange,
  onFooter,
  onSubmit,
}: {
  dogs: Dog[]
  services: Service[]
  appointments: Appointment[]
  ignoreId?: string
  initial: AppointmentFormValues
  recentDogIds?: string[]
  onDay?: (day: string) => void
  onDirtyChange?: (dirty: boolean) => void
  onFooter?: (node: ReactNode) => void
  onSubmit: (write: AppointmentWrite, plan: SavePlan | null, newDog: DogWrite | null) => void
}) {
  const [dogId, setDogId] = useState(initial.dogId)
  const [query, setQuery] = useState('')
  const [newDog, setNewDog] = useState<NewDogInput | null>(null)
  const [dupe, setDupe] = useState<Dog | null>(null)
  const [serviceIds, setServiceIds] = useState(() => (
    initial.serviceIds.length > 0 || ignoreId ? initial.serviceIds : latestServiceIds(initial.dogId, appointments, services)
  ))
  const [day, setDay] = useState(initial.day)
  const [time, setTime] = useState(initial.time)
  const [repeat, setRepeat] = useState(false)
  const [weeksInput, setWeeksInput] = useState(() => {
    const weeks = dogs.find((dog) => dog.id === initial.dogId)?.recurrenceWeeks
    return String(typeof weeks === 'number' && weeks >= 1 ? weeks : 4)
  })
  const [makeMonthly, setMakeMonthly] = useState(false)
  const [fieldError, setFieldError] = useState<{ field: AppointmentField; message: string } | null>(null)
  const [pending, setPending] = useState<{ message: string; send: () => void } | null>(null)
  const baseline = useRef({ dogId, services: serviceKey(serviceIds), day, time, repeat, weeksInput })
  const presetSettled = useRef(initial.dogId !== '')

  const virtual = newDog ? virtualDog(newDog) : null
  const allDogs = virtual ? [...dogs, virtual] : dogs
  const activeDogs = dogs.filter((dog) => dog.status === 'attivo')
  const selected = virtual ?? dogs.find((dog) => dog.id === dogId)
  const effectiveDogId = virtual ? NEW_DOG_ID : dogId
  const values: AppointmentFormValues = { dogId: effectiveDogId, serviceIds, day, time }
  const existing = ignoreId ? appointments.find((item) => item.id === ignoreId) ?? null : null
  const prepared = prepareAppointmentWrite(values, allDogs, services, existing)
  const quoted = prepared.ok ? withCardQuote(prepared.write, allDogs, services) : null
  const activeServices = services.filter((service) => service.active).sort((a, b) => a.order - b.order)

  const lines: AppointmentService[] = serviceIds.flatMap((id) => {
    const service = activeServices.find((item) => item.id === id)
    if (!service) return []
    const quote = selected ? quotedPrice(selected, service) : { price: service.price.piccola, durationMin: service.durationMin.piccola }
    return [{ serviceId: service.id, name: service.name, price: quote.price, durationMin: quote.durationMin }]
  })
  const totalMinutes = sumDuration(lines)
  const totalPrice = sumPrice(lines)
  const dayValid = /^\d{4}-\d{2}-\d{2}$/.test(day)
  const startsAt = dayValid && isStartTime(time) ? combineDayTime(day, time) : null
  const endsAt = startsAt && lines.length > 0 ? appointmentEnd(startsAt, lines) : null
  const timeRange = startsAt && endsAt ? `${time} → ${clock(endsAt)}` : ''
  const summary = lines.length > 0
    ? [timeRange, formatCompactDuration(totalMinutes), euro(totalPrice)].filter((part) => part !== '').join(' · ')
    : ''

  const sameDay = dayValid ? onLocalDay(appointments.filter((item) => item.id !== ignoreId), parseDayParam(day, new Date())) : []
  const slotMinutes = Math.max(totalMinutes, SLOT_MIN)
  const busy = new Set(START_TIMES.filter((slot) => {
    const start = combineDayTime(day, slot)
    const end = appointmentEnd(start, [{ durationMin: slotMinutes }])
    return sameDay.some((item) => rangesOverlap(start, end, item.start, appointmentEnd(item.start, item.services)))
  }))
  const clashes = quoted
    ? sameDay
      .filter((item) => rangesOverlap(quoted.start, appointmentEnd(quoted.start, quoted.services), item.start, appointmentEnd(item.start, item.services)))
      .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    : []
  const overlap = clashes.length > 0
    ? `Si sovrappone a ${clashes.map((item) => `${dogs.find((dog) => dog.id === item.dogId)?.name ?? 'Cane assente'} ${clock(item.start)}–${clock(appointmentEnd(item.start, item.services))}`).join(', ')}`
    : null

  const parsedWeeks = Number(weeksInput)
  const weeks = Number.isInteger(parsedWeeks) && parsedWeeks >= 1 ? parsedWeeks : 4
  const nextBase = isStartTime(time) ? combineDayTime(day, time) : parseDayParam(day, new Date())
  const nextStart = addWeeks(nextBase, weeks)
  const nextWhen = `${format(nextStart, 'EEE d MMM', IT_DATE)}${isStartTime(time) ? `, ${clock(nextStart)}` : ''}`
  const offerMonthly = Boolean(selected) && selected?.clientType === 'occasionale' && !ignoreId

  const dogReady = virtual ? virtual.name !== '' : dogId !== ''
  const canSave = dogReady && serviceIds.length > 0 && dayValid && isStartTime(time)

  const needle = query.trim()
  const hits = needle
    ? (() => {
      const ranked = rankDogs(dogs, needle)
      const known = new Set(ranked.map((dog) => dog.id))
      const extra = activeDogs
        .filter((dog) => !known.has(dog.id) && matchesDog(dog, needle))
        .sort((a, b) => normalizeSearch(a.name).localeCompare(normalizeSearch(b.name)) || a.id.localeCompare(b.id))
      return [...ranked, ...extra].slice(0, 6)
    })()
    : recentDogIds
      .flatMap((id) => activeDogs.filter((dog) => dog.id === id))
      .slice(0, 5)

  const dirty = (
    dogId !== baseline.current.dogId
    || (!dogId && needle !== '')
    || newDog !== null
    || serviceKey(serviceIds) !== baseline.current.services
    || day !== baseline.current.day
    || time !== baseline.current.time
    || repeat !== baseline.current.repeat
    || makeMonthly
    || weeksInput !== baseline.current.weeksInput
  )
  const onDirty = useRef(onDirtyChange)
  onDirty.current = onDirtyChange
  useEffect(() => {
    onDirty.current?.(dirty)
  }, [dirty])
  useEffect(() => () => onDirty.current?.(false), [])
  useEffect(() => {
    if (presetSettled.current || !initial.dogId) return
    if (needle !== '' || newDog || dupe) {
      presetSettled.current = true
      return
    }
    const dog = dogs.find((item) => item.id === initial.dogId && item.status === 'attivo')
    if (!dog) return
    presetSettled.current = true
    const fillServices = serviceIds.length === 0 && !ignoreId
    const nextServices = fillServices ? latestServiceIds(dog.id, appointments, services) : serviceIds
    const storedWeeks = dog.recurrenceWeeks
    const nextWeeks = String(typeof storedWeeks === 'number' && storedWeeks >= 1 ? storedWeeks : 4)
    const nextRepeat = false
    baseline.current = {
      ...baseline.current,
      dogId: dog.id,
      services: fillServices ? serviceKey(nextServices) : baseline.current.services,
      repeat: nextRepeat,
      weeksInput: nextWeeks,
    }
    setDogId(dog.id)
    setServiceIds(nextServices)
    setRepeat(nextRepeat)
    setMakeMonthly(false)
    setWeeksInput(nextWeeks)
  }, [appointments, dogs, dupe, ignoreId, initial.dogId, needle, newDog, serviceIds, services])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSave) return
    const result = prepareAppointmentWrite(values, allDogs, services, existing)
    if (!result.ok) {
      setFieldError({ field: result.field, message: result.message })
      return
    }
    setFieldError(null)
    const write = withCardQuote(result.write, allDogs, services)
    const choice = repeatChoice({ repeat, makeMonthly, weeks, dogClientType: selected?.clientType ?? 'occasionale' })
    const plan: SavePlan | null = ignoreId
      ? null
      : { ...choice, setFrequency: choice.nextClientType === 'mensile' && (repeat || makeMonthly) }
    const send = () => {
      if (newDog && plan) onSubmit({ ...write, dogId: '' }, plan, newDogWrite(newDog, plan))
      else onSubmit(write, plan, null)
    }
    if (overlap) {
      setPending({ message: overlap, send })
      return
    }
    send()
  }

  function confirmOverlap() {
    const current = pending
    setPending(null)
    current?.send()
  }

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setFieldError(null)
  }

  function repeatStateFor(dog: Dog | null) {
    setRepeat(false)
    setMakeMonthly(false)
    const storedWeeks = dog?.recurrenceWeeks
    setWeeksInput(String(typeof storedWeeks === 'number' && storedWeeks >= 1 ? storedWeeks : 4))
  }

  function chooseDog(dog: Dog) {
    setDogId(dog.id)
    setQuery('')
    setNewDog(null)
    setDupe(null)
    repeatStateFor(dog)
    setFieldError(null)
    if (!ignoreId) {
      setServiceIds((current) => (current.length > 0 ? current : latestServiceIds(dog.id, appointments, services)))
    }
  }

  function clearDog() {
    setDogId('')
    setQuery('')
    setNewDog(null)
    setDupe(null)
    repeatStateFor(null)
    setFieldError(null)
  }

  function dismissNewDog() {
    setNewDog(null)
    setDupe(null)
    repeatStateFor(null)
    setFieldError(null)
  }

  function openNewDog() {
    const name = query.trim()
    const same = activeDogs.find((dog) => normalizeSearch(dog.name) === normalizeSearch(name))
    if (name !== '' && same) {
      setDupe(same)
      return
    }
    startNewDog(name)
  }

  function startNewDog(name: string) {
    setDupe(null)
    setDogId('')
    setNewDog({ name, species: 'cane', size: 'piccola', owner: '', phone: '' })
    repeatStateFor(null)
    setFieldError(null)
  }

  function pickDay(next: string) {
    setDay(next)
    onDay?.(next)
    setFieldError(null)
  }

  const today = new Date()
  const shortcuts: { label: string; key: string }[] = [
    { label: 'Oggi', key: localDayKey(today) },
    { label: 'Domani', key: localDayKey(addDays(today, 1)) },
    { label: '+7 gg', key: localDayKey(addDays(today, 7)) },
    { label: '+30 gg', key: localDayKey(addDays(today, 30)) },
  ]

  const searching = !selected && !dupe
  const noDogAtAll = activeDogs.length === 0
  const principali = activeServices.filter((service) => service.kind === 'principale')
  const extra = activeServices.filter((service) => service.kind === 'extra')
  const saveBar = (
    <>
      <div data-testid="appointment-summary" style={{ fontSize: TYPE.dogName, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {summary || 'Scegli i servizi'}
      </div>
      <Button type="submit" form={onFooter ? 'appointment-form' : undefined} disabled={!canSave} variant="primary" size="lg" style={{ width: '100%', opacity: canSave ? 1 : 0.4 }}>
        Salva
      </Button>
    </>
  )
  useLayoutEffect(() => {
    onFooter?.(saveBar)
  }, [canSave, onFooter, summary])

  return (
    <form id="appointment-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={blockTitle}>Cane</h3>
        {virtual && newDog ? (
          <NewDogCard value={newDog} onChange={setNewDog} onClear={dismissNewDog} />
        ) : selected ? (
          <DogCard dog={selected} onClear={clearDog} />
        ) : dupe ? (
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ margin: 0, fontSize: TYPE.base, ...USER_TEXT }}>{`Esiste già ${dupe.name}${existingNameLine(dupe)}. Crearne un altro?`}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => startNewDog(query.trim())} style={{ ...controlStyle(false), flex: 1, fontWeight: 600 }}>Crea un altro</button>
              <button type="button" onClick={() => chooseDog(dupe)} style={{ ...controlStyle(false), flex: 1, fontWeight: 600, ...USER_TEXT }}>{`Usa ${dupe.name}`}</button>
            </div>
          </div>
        ) : null}
        {searching ? (
          <>
            <input
              id="appointment-dog"
              aria-label="Cerca cane"
              placeholder="Nome, razza, proprietario o telefono"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setFieldError(null)
              }}
              style={controlStyle(fieldError?.field === 'dogId')}
            />
            {noDogAtAll ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun cane</p> : null}
            {hits.map((dog) => (
              <DogRow key={dog.id} dog={dog} query={needle} selected={dog.id === dogId} onPick={() => chooseDog(dog)} />
            ))}
            {!ignoreId ? (
              <button
                type="button"
                onClick={openNewDog}
                style={{ textAlign: 'left', border: '1px dashed var(--line)', borderRadius: 9, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 600, padding: '8px 10px', minHeight: 44, height: 'auto', ...USER_TEXT }}
              >
                {needle ? `+ Nuovo cane "${needle}"` : '+ Nuovo cane'}
              </button>
            ) : null}
            {fieldError?.field === 'dogId' ? <p style={errorStyle}>{fieldError.message}</p> : null}
          </>
        ) : null}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={blockTitle}>Servizi</h3>
        {([['Servizi principali', principali], ['Extra', extra]] as const).map(([label, group]) => (
          group.length === 0 ? null : (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 600, fontSize: TYPE.meta, color: 'var(--tx3)' }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {group.map((service) => {
                  const pressed = serviceIds.includes(service.id)
                  const quote = selected ? quotedPrice(selected, service) : { price: service.price.piccola, durationMin: service.durationMin.piccola }
                  const caption = `${service.name} · ${formatCompactDuration(quote.durationMin)} · ${euro(quote.price)}`
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-label={caption}
                      aria-pressed={pressed}
                      onClick={() => toggleService(service.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 0,
                        minHeight: 44,
                        height: 'auto',
                        border: pressed ? '1px solid var(--pri)' : '1px solid var(--line)',
                        borderRadius: 10,
                        background: 'var(--card)',
                        color: 'var(--tx)',
                        fontWeight: 600,
                        fontSize: TYPE.rowSub,
                        padding: '6px 8px',
                        textAlign: 'left',
                        boxShadow: pressed ? '0 0 0 3px var(--focus)' : 'var(--sh-1)',
                        position: 'relative',
                      }}
                    >
                      {pressed ? <Check size={13} strokeWidth={3} aria-hidden style={{ position: 'absolute', top: 4, right: 4 }} /> : null}
                      <IconTile tone={service.iconKey ?? 'prim'} size="sm">
                        <ServiceIcon iconKey={service.iconKey} size={SIZES.chip.serviceIconInChip} />
                      </IconTile>
                      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={USER_TEXT}>{service.name}</span>
                        <span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{`${formatCompactDuration(quote.durationMin)} · ${euro(quote.price)}`}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        ))}
        {summary ? (
          <p data-testid="services-total" style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, fontVariantNumeric: 'tabular-nums' }}>{summary}</p>
        ) : null}
        {fieldError?.field === 'serviceIds' ? <p style={errorStyle}>{fieldError.message}</p> : null}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={blockTitle}>Quando</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="appointment-day"
            aria-label="Giorno"
            type="date"
            value={day}
            onChange={(event) => pickDay(event.target.value)}
            style={{ ...controlStyle(fieldError?.field === 'day'), flex: 1 }}
          />
          <span style={{ fontSize: TYPE.base, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{timeRange || (time ? time : 'Scegli l’ora')}</span>
        </div>
        {fieldError?.field === 'day' ? <p style={errorStyle}>{fieldError.message}</p> : null}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {shortcuts.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={day === item.key}
              onClick={() => pickDay(item.key)}
              style={{ border: '1px solid var(--line)', borderRadius: 999, background: day === item.key ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', fontSize: TYPE.rowSub, fontWeight: 600, padding: '8px 12px', minHeight: 44, height: 'auto' }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Ora" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {START_TIMES.map((slot) => {
            const chosen = time === slot
            const taken = busy.has(slot)
            const slotStart = dayValid ? combineDayTime(day, slot) : null
            const inRange = Boolean(startsAt && endsAt && slotStart && slotStart > startsAt && slotStart < endsAt)
            return (
              <button
                key={slot}
                type="button"
                aria-pressed={chosen}
                data-busy={taken ? 'true' : undefined}
                disabled={taken && !chosen}
                onClick={() => {
                  setTime(slot)
                  setFieldError(null)
                }}
                style={{
                  border: chosen ? '1px solid var(--pri-solid)' : inRange ? '1px solid var(--pri-s)' : '1px solid var(--line2)',
                  borderRadius: 8,
                  background: chosen
                    ? 'var(--pri-solid)'
                    : taken
                      ? 'repeating-linear-gradient(135deg, var(--line2) 0 2px, transparent 2px 4px)'
                      : inRange
                        ? 'var(--pri-s)'
                        : 'var(--card)',
                  color: chosen ? 'var(--on-pri)' : taken ? 'var(--tx3)' : 'var(--tx)',
                  textDecoration: taken && !chosen ? 'line-through' : 'none',
                  font: 'inherit',
                  fontSize: TYPE.rowSub,
                  fontVariantNumeric: 'tabular-nums',
                  padding: '8px 0',
                  minHeight: 44,
                  height: 'auto',
                  boxShadow: taken || chosen || inRange ? 'none' : 'var(--sh-1)',
                }}
              >
                {slot}
              </button>
            )
          })}
        </div>
        {fieldError?.field === 'time' ? <p style={errorStyle}>{fieldError.message}</p> : null}
        {overlap ? (
          <div role="alert" style={{ background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 10, padding: '8px 10px', fontSize: TYPE.base, fontWeight: 600, ...USER_TEXT }}>{overlap}</div>
        ) : null}
        {!ignoreId ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              aria-pressed={repeat}
              onClick={() => setRepeat((current) => !current)}
              style={{ textAlign: 'left', border: '1px solid var(--line)', borderRadius: 9, background: repeat ? 'var(--surf)' : 'transparent', color: 'var(--tx)', font: 'inherit', fontWeight: 600, padding: '8px 10px', minHeight: 44, height: 'auto' }}
            >
              Fissa anche il prossimo
            </button>
            {repeat || (offerMonthly && makeMonthly) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ margin: 0, fontSize: TYPE.base }}>{repeat ? `tra ${weeks} settimane` : `ogni ${weeks} settimane`}</p>
                <input
                  aria-label="Settimane"
                  inputMode="numeric"
                  value={weeksInput}
                  onChange={(event) => setWeeksInput(event.target.value)}
                  style={controlStyle(false)}
                />
                {repeat ? <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base }}>{`Prossimo: ${nextWhen}`}</p> : null}
              </div>
            ) : null}
            {offerMonthly ? (
              <button
                type="button"
                aria-pressed={makeMonthly}
                onClick={() => setMakeMonthly((current) => !current)}
                style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 600, padding: '8px 0', minHeight: 44, height: 'auto', textDecoration: makeMonthly ? 'none' : 'underline' }}
              >
                Rendilo cliente mensile
              </button>
            ) : null}
            {offerMonthly && makeMonthly ? (
              <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>Diventa cliente mensile al salvataggio.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {onFooter ? null : (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--card)', display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0 2px', borderTop: '1px solid var(--line)' }}>
          {saveBar}
        </div>
      )}
      <Sheet open={pending !== null} title="Orario già occupato" onClose={() => setPending(null)} closeLabel="Torna al form">
        <p style={{ margin: 0, fontSize: TYPE.base }}>{pending?.message}</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button type="button" onClick={() => setPending(null)} style={{ flex: 1 }}>Cambia ora</Button>
          <Button type="button" variant="secondary" onClick={confirmOverlap} style={{ flex: 1 }}>Salva comunque</Button>
        </div>
      </Sheet>
    </form>
  )
}
