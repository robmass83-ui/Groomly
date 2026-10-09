import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { ensureServiceSeed } from '../data/local/services'
import { getSettings } from '../data/local/settings'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { appointmentEnd, formatBookedWhen, formatDuration, isStartTime, localDayKey, parseDayParam, shiftWeeks, sumDuration, sumPrice } from '../lib/appointments'
import { activeServiceIds } from '../lib/monthly'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { shortOwner } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { quotedPrice } from '../lib/quote'
import type { AppointmentFormValues } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentPhoto, AppointmentService, AppointmentWrite, Dog, Service } from '../types/models'
import { AppointmentForm } from './AppointmentForm'
import { dogToWrite } from './DogPage'

const backStyle = {
  width: SIZES.headerIconBtn,
  height: SIZES.headerIconBtn,
  borderRadius: SIZES.headerIconRadius,
  background: 'var(--surf)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  border: 0,
  padding: 0,
  textDecoration: 'none',
} as const

const fieldStyle: CSSProperties = {
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 10px',
  font: 'inherit',
}

function acceptedDay(value: string | null, now: Date): string | null {
  if (value === null) return null
  return localDayKey(parseDayParam(value, now)) === value ? value : null
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function acceptedTime(value: string | null): string {
  return value !== null && isStartTime(value) ? value : ''
}

function backTarget(from: string | null, cane: string | null, day: string | null, dogs: Dog[]): string {
  if (from === 'mensili') return '/mensili'
  if (cane && dogs.some((dog) => dog.id === cane)) return `/animali/${cane}`
  if (day) return `/calendario?data=${day}`
  return '/'
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    list.push(trimmed)
  }
  return list
}

function persistDetails(uid: string, id: string, patch: Record<string, unknown>): boolean {
  try {
    const map = readJson<Record<string, Record<string, unknown>>>(storageKeys.appointments(uid))
    if (!map?.[id]) return false
    map[id] = { ...map[id], ...patch }
    writeJson(storageKeys.appointments(uid), map)
    return true
  } catch {
    return false
  }
}

function coreWrite(appointment: Appointment, patch: Partial<AppointmentWrite> = {}): AppointmentWrite {
  const write: AppointmentWrite = {
    dogId: patch.dogId ?? appointment.dogId,
    start: patch.start ?? appointment.start,
    services: patch.services ?? appointment.services.map((line) => ({ ...line })),
  }
  if (patch.total !== undefined) write.total = patch.total
  else if (appointment.total !== undefined) write.total = appointment.total
  if (patch.seriesId) write.seriesId = patch.seriesId
  else if (appointment.seriesId) write.seriesId = appointment.seriesId
  return write
}

function whenLine(appointment: Appointment, dog: Dog | undefined): string {
  const end = appointmentEnd(appointment.start, appointment.services)
  const raw = format(appointment.start, 'EEE d MMM', IT_DATE)
  const day = raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
  const owner = dog ? shortOwner(dog.contact.name) : ''
  return [day, `${clock(appointment.start)}–${clock(end)}`, owner].filter((part) => part !== '').join(' · ')
}

function BackLink({ to }: { to: string }) {
  return (
    <Link to={to} aria-label="Indietro" style={backStyle}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
    </Link>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Indietro" style={backStyle}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden />
    </button>
  )
}

function AppointmentSheet({ title, day, closeTo, back, children }: { title: string; day: string; closeTo: string; back: ReactNode; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <PhoneShell>
      <Link to={`/calendario?data=${day}`} style={{ flex: 1, padding: `8px ${SIZES.pagePadX}px`, color: 'inherit', textDecoration: 'none' }}>Calendario</Link>
      <Sheet open title={title} onClose={() => navigate(closeTo)}>
        <div style={{ maxHeight: '70vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {back}
          {children}
        </div>
      </Sheet>
    </PhoneShell>
  )
}

function DurationField({ initial, onCommit }: { initial: string; onCommit: (value: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <input
      aria-label="Durata reale"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      style={fieldStyle}
    />
  )
}

function TokenField({ label, values, suggestions, onChange }: { label: string; values: string[]; suggestions: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('')
  function add(raw: string) {
    const parts = uniqueNames([...values, ...raw.split(',')])
    if (parts.length === values.length && parts.every((item, index) => item === values[index])) return
    onChange(parts)
    setDraft('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontWeight: 600, fontSize: TYPE.base }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))} style={{ border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surf)', color: 'var(--tx)', font: 'inherit', fontWeight: 600, padding: '3px 8px' }}>{value}</button>
        ))}
      </div>
      <input
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ',') return
          event.preventDefault()
          add(draft)
        }}
        style={fieldStyle}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {suggestions.filter((item) => !values.includes(item)).map((item) => (
          <button key={item} type="button" onClick={() => onChange(uniqueNames([...values, item]))} style={{ border: '1px solid var(--line)', borderRadius: 999, background: 'transparent', color: 'var(--tx3)', font: 'inherit', padding: '3px 8px' }}>{item}</button>
        ))}
      </div>
    </div>
  )
}

function PhotoWork({ photos, onAdd }: { photos: AppointmentPhoto[]; onAdd: (file: File | undefined, kind: 'prima' | 'dopo' | 'auto') => void }) {
  const primaRef = useRef<HTMLInputElement>(null)
  const dopoRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const prima = photos.find((item) => item.kind === 'prima')
  const dopo = photos.find((item) => item.kind === 'dopo')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600, fontSize: TYPE.base }}>Foto lavoro</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {prima ? <img alt="Prima" src={prima.photo} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} /> : null}
        {dopo ? <img alt="Dopo" src={dopo.photo} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} /> : null}
        {photos.filter((item) => item.kind === 'altro').map((item) => (
          <img key={item.id} alt="" src={item.photo} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="button" variant="ghost" onClick={() => primaRef.current?.click()}>Prima</Button>
        <Button type="button" variant="ghost" onClick={() => dopoRef.current?.click()}>Dopo</Button>
        <Button type="button" variant="ghost" onClick={() => addRef.current?.click()}>Aggiungi</Button>
      </div>
      <input ref={primaRef} aria-label="Foto prima" type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => { onAdd(event.target.files?.[0], 'prima'); event.target.value = '' }} />
      <input ref={dopoRef} aria-label="Foto dopo" type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => { onAdd(event.target.files?.[0], 'dopo'); event.target.value = '' }} />
      <input ref={addRef} aria-label="Aggiungi foto" type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => { onAdd(event.target.files?.[0], 'auto'); event.target.value = '' }} />
    </div>
  )
}

function AppointmentRead({
  appointment,
  dog,
  services,
  confirming,
  toolChoices,
  productChoices,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onComplete,
  onBook,
  onShift,
  onCommitDuration,
  onSaveServices,
  onCommitTotal,
  onTokens,
  onStyle,
  onPhoto,
}: {
  appointment: Appointment
  dog: Dog | undefined
  services: Service[]
  confirming: boolean
  toolChoices: string[]
  productChoices: string[]
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onComplete: () => void
  onBook: (weeks: 2 | 4 | 6) => void
  onShift: (minutes: number) => void
  onCommitDuration: (value: string) => void
  onSaveServices: (lines: AppointmentService[]) => void
  onCommitTotal: (value: string) => void
  onTokens: (key: 'tools' | 'products', values: string[]) => void
  onStyle: (values: string[]) => void
  onPhoto: (file: File | undefined, kind: 'prima' | 'dopo' | 'auto') => void
}) {
  const [serviceEdit, setServiceEdit] = useState(false)
  const [totalEdit, setTotalEdit] = useState(false)
  const [totalDraft, setTotalDraft] = useState('')
  const phone = dog?.contact.phone ?? ''
  const totalText = formatEuro(appointment.total ?? sumPrice(appointment.services))
  const styles = (appointment.cutStyle ?? '').split(',').map((item) => item.trim()).filter((item) => item !== '')
  const active = services.filter((service) => service.active).sort((a, b) => a.order - b.order)

  function toggleService(service: Service) {
    if (!dog) return
    const selected = new Set(appointment.services.map((line) => line.serviceId))
    if (selected.has(service.id)) selected.delete(service.id)
    else selected.add(service.id)
    if (selected.size === 0) return
    const lines = active
      .filter((item) => selected.has(item.id))
      .map((item) => {
        const previous = appointment.services.find((line) => line.serviceId === item.id)
        if (previous) return { ...previous }
        const quote = quotedPrice(dog, item)
        return { serviceId: item.id, name: item.name, durationMin: quote.durationMin, price: quote.price }
      })
    onSaveServices(lines)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DogAvatar alt="" src={dog?.photo} size="xl" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>{dog?.name ?? 'Cane assente'}</span>
        {dog ? <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.title} /> : null}
        {dog && (dog.isSenior || dog.ageCategory === 'anziano') ? <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} /> : null}
        {dog?.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} /> : null}
      </div>
      <div style={{ fontSize: TYPE.base }}>{whenLine(appointment, dog)}</div>
      {dog ? <Link to={`/animali/${dog.id}`}>Scheda</Link> : null}
      {dog?.criticalNote ? (
        <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderRadius: 8, padding: 8 }}>{dog.criticalNote}</p>
      ) : null}
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Ora</div>
        <div style={{ fontSize: TYPE.base }}>{clock(appointment.start)}</div>
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Durata</div>
        <div style={{ fontSize: TYPE.base }}>{formatDuration(sumDuration(appointment.services))}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button type="button" aria-label="Servizi" onClick={() => setServiceEdit((current) => !current)} style={{ textAlign: 'left', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0 }}>
          {appointment.services.map((service) => (
            <div key={service.serviceId} style={{ fontSize: TYPE.base }}>{service.name}</div>
          ))}
        </button>
        {serviceEdit ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {active.map((service) => {
              const pressed = appointment.services.some((line) => line.serviceId === service.id)
              return (
                <button key={service.id} type="button" aria-pressed={pressed} onClick={() => toggleService(service)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--line)', borderRadius: 999, background: pressed ? 'var(--surf)' : 'transparent', color: 'var(--tx)', fontWeight: 600, padding: '3px 8px' }}>
                  <span aria-hidden="true"><ServiceIcon iconKey={service.iconKey} size={SIZES.chip.serviceIconInChip} /></span>
                  {service.name}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Totale</div>
        {totalEdit ? (
          <input
            aria-label="Totale"
            value={totalDraft}
            onChange={(event) => setTotalDraft(event.target.value)}
            onBlur={() => { setTotalEdit(false); onCommitTotal(totalDraft) }}
            style={fieldStyle}
          />
        ) : (
          <button type="button" onClick={() => { setTotalDraft(String(appointment.total ?? sumPrice(appointment.services))); setTotalEdit(true) }} style={{ border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontSize: TYPE.base, padding: 0 }}>{totalText}</button>
        )}
      </div>
      {phone.trim() ? <a href={`tel:${phone}`}>{phone}</a> : null}
      <TokenField label="Strumenti" values={appointment.tools ?? []} suggestions={toolChoices} onChange={(values) => onTokens('tools', values)} />
      <TokenField label="Prodotti" values={appointment.products ?? []} suggestions={productChoices} onChange={(values) => onTokens('products', values)} />
      <TokenField label="Stile" values={styles} suggestions={[]} onChange={onStyle} />
      <PhotoWork photos={appointment.photos ?? []} onAdd={onPhoto} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Button type="button" variant="ghost" onClick={() => onShift(-15)}>Anticipa</Button>
        <Button type="button" variant="ghost" onClick={() => onShift(15)}>Posticipa</Button>
        <Button type="button" variant="ghost" onClick={onEdit}>Sposta</Button>
      </div>
      <Button type="button" onClick={onEdit}>Modifica</Button>
      {confirming ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: TYPE.base }}>Cancellare questo appuntamento?</p>
          <Button type="button" variant="ghost" onClick={onCancelDelete}>Annulla</Button>
          <Button type="button" onClick={onConfirmDelete}>Cancella</Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" onClick={onAskDelete}>Cancella</Button>
      )}
      {appointment.status === 'completato' ? (
        <>
          <p style={{ margin: 0, fontWeight: 700 }}>Completato</p>
          <label htmlFor={`durata-${appointment.id}`} style={{ fontWeight: 600, fontSize: TYPE.base }}>Durata reale</label>
          <DurationField
            key={`${appointment.updatedAt.getTime()}-${appointment.actualDurationMin ?? 'vuota'}`}
            initial={String(appointment.actualDurationMin ?? sumDuration(appointment.services))}
            onCommit={onCommitDuration}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([2, 4, 6] as const).map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => onBook(weeks)}
                style={{
                  border: '1px solid var(--line)',
                  background: 'transparent',
                  color: 'var(--tx)',
                  borderRadius: SIZES.chip.radius,
                  padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
                  fontSize: SIZES.chip.font,
                  fontWeight: 600,
                }}
              >
                +{weeks} sett
              </button>
            ))}
          </div>
        </>
      ) : (
        <Button type="button" onClick={onComplete}>Completato · fissa il prossimo</Button>
      )}
    </div>
  )
}

export function AppointmentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs, saveExisting: saveDog } = useDogs(uid)
  const { appointments, saveNew, saveExisting, complete, remove, lastCreatedId } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const cane = searchParams.get('cane')
  const day = acceptedDay(searchParams.get('data'), now)
  const closeTo = backTarget(searchParams.get('da'), cane, day, dogs)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [calendarDay, setCalendarDay] = useState(() => day ?? localDayKey(now))
  const settings = uid ? getSettings(uid) : null
  const toolChoices = settings && settings.toolSuggestions.length > 0
    ? settings.toolSuggestions
    : uniqueNames(['Tosatrice', 'Shampoo', 'Profumo', ...appointments.flatMap((item) => item.tools ?? [])])
  const productChoices = settings && settings.productSuggestions.length > 0
    ? settings.productSuggestions
    : uniqueNames(appointments.flatMap((item) => item.products ?? []))

  function save(write: AppointmentWrite, repeat: { weeks: number } | null) {
    let next = write
    if (repeat) {
      const dog = dogs.find((item) => item.id === write.dogId)
      if (!dog || !saveDog(dog.id, { ...dogToWrite(dog, dog.servicePrices), clientType: 'mensile', recurrenceWeeks: repeat.weeks })) {
        toast.show('Salvataggio non riuscito', 'plain')
        return
      }
      next = { ...write, seriesId: crypto.randomUUID() }
    }
    if (!saveNew(next)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    navigate(`/appuntamenti/${lastCreatedId.current}`, { replace: true })
  }

  function saveEdit(appointmentId: string, write: AppointmentWrite) {
    const current = appointments.find((item) => item.id === appointmentId)
    const next = current?.seriesId && !write.seriesId ? { ...write, seriesId: current.seriesId } : write
    if (!saveExisting(appointmentId, next)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    setEditing(false)
  }

  function confirmDelete(appointment: Appointment) {
    if (!remove(appointment.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      setConfirmingDelete(false)
      return
    }
    navigate(`/calendario?data=${localDayKey(appointment.start)}`)
  }

  function markDone(appointment: Appointment) {
    const minutes = sumDuration(appointment.services)
    const missing = appointment.actualDurationMin == null
    if (!complete(appointment.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    if (!missing) return
    if (!persistDetails(uid, appointment.id, { actualDurationMin: minutes }) || !saveExisting(appointment.id, coreWrite(appointment))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function commitDuration(appointment: Appointment, raw: string) {
    const trimmed = raw.trim()
    if (!/^\d+$/.test(trimmed)) return
    const minutes = Number(trimmed)
    if (minutes === appointment.actualDurationMin) return
    if (!complete(appointment.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    if (!persistDetails(uid, appointment.id, { actualDurationMin: minutes }) || !saveExisting(appointment.id, coreWrite(appointment))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function shiftStart(appointment: Appointment, minutes: number) {
    const previous = new Date(appointment.start.getTime())
    const next = new Date(previous.getTime() + minutes * 60_000)
    if (!saveExisting(appointment.id, coreWrite(appointment, { start: next }))) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show(`Spostato alle ${clock(next)}`, 'plain', {
      label: 'Annulla',
      onClick: () => {
        if (!saveExisting(appointment.id, coreWrite(appointment, { start: previous }))) {
          toast.show('Salvataggio non riuscito', 'plain')
        }
      },
    })
  }

  function bookWeeks(appointment: Appointment, weeks: 2 | 4 | 6) {
    const start = shiftWeeks(appointment.start, weeks)
    const write: AppointmentWrite = {
      dogId: appointment.dogId,
      start,
      services: appointment.services.map((line) => ({ ...line })),
    }
    if (appointment.seriesId) write.seriesId = appointment.seriesId
    const saved = saveNew(write)
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

  function applyTokens(appointment: Appointment, key: 'tools' | 'products', values: string[]) {
    if (!persistDetails(uid, appointment.id, { [key]: values }) || !saveExisting(appointment.id, coreWrite(appointment))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function applyStyle(appointment: Appointment, values: string[]) {
    const cutStyle = values.join(', ')
    if (!persistDetails(uid, appointment.id, { cutStyle }) || !saveExisting(appointment.id, coreWrite(appointment))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  async function addPhoto(appointment: Appointment, file: File | undefined, kind: 'prima' | 'dopo' | 'auto') {
    if (!file) return
    try {
      const photo = await prepareDogPhoto(file)
      const current = appointment.photos ? appointment.photos.map((item) => ({ ...item })) : []
      let nextKind: AppointmentPhoto['kind'] = kind === 'auto' ? 'altro' : kind
      if (kind === 'auto') {
        if (!current.some((item) => item.kind === 'prima')) nextKind = 'prima'
        else if (!current.some((item) => item.kind === 'dopo')) nextKind = 'dopo'
      }
      const next = nextKind === 'altro'
        ? [...current, { id: crypto.randomUUID(), photo, kind: 'altro' as const }]
        : [...current.filter((item) => item.kind !== nextKind), { id: crypto.randomUUID(), photo, kind: nextKind }]
      if (!persistDetails(uid, appointment.id, { photos: next }) || !saveExisting(appointment.id, coreWrite(appointment))) {
        toast.show('Salvataggio non riuscito', 'plain')
      }
    } catch {
      toast.show('Foto non utilizzabile', 'plain')
    }
  }

  function saveServices(appointment: Appointment, lines: AppointmentService[]) {
    if (!saveExisting(appointment.id, coreWrite(appointment, { services: lines }))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function commitTotal(appointment: Appointment, raw: string) {
    const normalized = raw.trim().replace(',', '.')
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return
    const price = Number(normalized)
    const write = appointment.services.length <= 1
      ? coreWrite(appointment, {
        services: appointment.services.map((line, index) => (index === 0 ? { ...line, price } : { ...line })),
        total: null,
      })
      : coreWrite(appointment, { total: price })
    if (!saveExisting(appointment.id, write)) toast.show('Salvataggio non riuscito', 'plain')
  }

  if (id) {
    const appointment = appointments.find((item) => item.id === id)
    if (!appointment) {
      return (
        <AppointmentSheet title="Appuntamento" day={localDayKey(now)} closeTo="/" back={<BackLink to="/" />}>
          <p style={{ margin: 0, color: 'var(--tx3)' }}>Appuntamento assente</p>
        </AppointmentSheet>
      )
    }
    if (editing) {
      const initial: AppointmentFormValues = {
        dogId: appointment.dogId,
        serviceIds: appointment.services.map((service) => service.serviceId),
        day: localDayKey(appointment.start),
        time: clock(appointment.start),
      }
      return (
        <AppointmentSheet title="Appuntamento" day={localDayKey(appointment.start)} closeTo={closeTo} back={<BackButton onClick={() => setEditing(false)} />}>
          <AppointmentForm
            dogs={dogs}
            services={services}
            appointments={appointments}
            ignoreId={appointment.id}
            initial={initial}
            returnTo={`${location.pathname}${location.search}`}
            onSubmit={(write) => saveEdit(appointment.id, write)}
          />
        </AppointmentSheet>
      )
    }
    return (
      <AppointmentSheet title="Appuntamento" day={localDayKey(appointment.start)} closeTo={closeTo} back={<BackLink to={closeTo} />}>
        <AppointmentRead
          appointment={appointment}
          dog={dogs.find((dog) => dog.id === appointment.dogId)}
          services={services}
          confirming={confirmingDelete}
          toolChoices={toolChoices}
          productChoices={productChoices}
          onEdit={() => { setConfirmingDelete(false); setEditing(true) }}
          onAskDelete={() => setConfirmingDelete(true)}
          onCancelDelete={() => setConfirmingDelete(false)}
          onConfirmDelete={() => confirmDelete(appointment)}
          onComplete={() => markDone(appointment)}
          onBook={(weeks) => bookWeeks(appointment, weeks)}
          onShift={(minutes) => shiftStart(appointment, minutes)}
          onCommitDuration={(value) => commitDuration(appointment, value)}
          onSaveServices={(lines) => saveServices(appointment, lines)}
          onCommitTotal={(value) => commitTotal(appointment, value)}
          onTokens={(key, values) => applyTokens(appointment, key, values)}
          onStyle={(values) => applyStyle(appointment, values)}
          onPhoto={(file, kind) => { void addPhoto(appointment, file, kind) }}
        />
      </AppointmentSheet>
    )
  }

  const fromMonthly = searchParams.get('da') === 'mensili'
  const quotedTime = acceptedTime(searchParams.get('ora'))
  const initial: AppointmentFormValues = {
    dogId: dogs.find((dog) => dog.id === cane && dog.status === 'attivo')?.id ?? '',
    serviceIds: activeServiceIds((searchParams.get('servizi') ?? '').split(','), services),
    day: day ?? localDayKey(now),
    time: quotedTime || (fromMonthly || cane !== null ? '' : '09:00'),
  }

  return (
    <AppointmentSheet title="Nuovo appuntamento" day={calendarDay} closeTo={closeTo} back={<BackLink to={closeTo} />}>
      <AppointmentForm
        dogs={dogs}
        services={services}
        appointments={appointments}
        initial={initial}
        returnTo={`${location.pathname}${location.search}`}
        onDay={setCalendarDay}
        onSubmit={save}
      />
    </AppointmentSheet>
  )
}
