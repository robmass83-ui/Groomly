import { format } from 'date-fns'
import { ArrowDown, ArrowUp, Camera, MoreVertical, Pencil, Phone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { avatarForSpecies, TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { rememberDog } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { sumPrice } from '../lib/appointments'
import { dogFormSeed, dogScreenSeed, shouldReseedDog } from '../lib/dogFormSeed'
import { AGE_LABEL, ARCHIVE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL } from '../lib/dogList'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { completeYear, seniorOf, type DogScreen } from '../lib/dogScreen'
import { ageText, averageDuration, formatCompactDuration, splitCritical } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { guardCaptureClick } from '../lib/photoCapture'
import { dogServiceQuoteSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason, CustomField, Dog, DogContact, DogDraft, DogServicePrice, DogSize, DogWrite, GalleryPhoto, Service, Species } from '../types/models'
import { Collapsible, DogFields, HiddenLabel, weightOf } from './DogFields'
import { NextAppointment } from './NextAppointment'

const PORTRAIT = 64

const sheetAction = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left' as const,
  padding: '6px 0',
}

const textAction = { ...sheetAction, width: 'auto', color: 'var(--pri)' }

const smallInput = {
  width: '100%',
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 8px',
  font: 'inherit',
  boxSizing: 'border-box' as const,
}

const callLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: SIZES.button.hLg,
  borderRadius: SIZES.button.radiusLg,
  padding: '0 12px',
  background: 'var(--pri)',
  color: '#fff',
  fontWeight: 600,
  fontSize: TYPE.base,
  textDecoration: 'none',
} as const

const iconAction = {
  width: SIZES.headerIconBtn,
  height: SIZES.headerIconBtn,
  borderRadius: SIZES.headerIconRadius,
  background: 'var(--surf)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  textDecoration: 'none',
  border: 'none',
  padding: 0,
} as const

const thumbStyle = { width: 50, height: 50, borderRadius: 8, objectFit: 'cover' as const, display: 'block' }

type QuoteEdits = Record<string, { price: string; duration: string }>

function statusLine(status: Dog['status']): string | null {
  if (status === 'attivo') return null
  return ARCHIVE_LABEL[status]
}

function primaryContact(dog: Dog): DogContact | undefined {
  return dog.contacts.find((contact) => contact.isPrimary) ?? dog.contacts[0]
}

function primaryPhone(dog: Dog): string {
  return (primaryContact(dog)?.phone ?? dog.contact.phone).trim()
}

function primaryName(dog: Dog): string {
  return (primaryContact(dog)?.name ?? dog.contact.name).trim()
}

function identityLine(dog: Dog, now: Date): string {
  const age = ageText(dog.birthYear, AGE_LABEL[dog.ageCategory], now)
  return [dog.breed.trim(), age].filter((part) => part !== '').join(' · ')
}

function futureScheduled(items: Appointment[], dogId: string, now: Date): Appointment[] {
  return items.filter((item) => item.dogId === dogId && item.status === 'programmato' && item.start.getTime() >= now.getTime())
}

function futureCountText(count: number): string {
  return count === 1 ? '1 appuntamento futuro' : `${count} appuntamenti futuri`
}

function mergeContacts(contacts: DogContact[], owner: { name: string; phone: string }): DogContact[] {
  const found = contacts.findIndex((contact) => contact.isPrimary)
  if (found === -1) {
    return [{ id: 'primary', name: owner.name, role: 'Proprietaria', phone: owner.phone, isPrimary: true }, ...contacts]
  }
  return contacts.map((contact, index) => (
    index === found ? { ...contact, name: owner.name, phone: owner.phone } : { ...contact }
  ))
}

function listPrice(service: Service, size: DogSize): { price: string; duration: string } {
  return { price: String(service.price[size]).replace('.', ','), duration: String(service.durationMin[size]) }
}

function shownQuote(service: Service, dog: Dog | undefined, edits: QuoteEdits): { price: string; duration: string } {
  const edited = edits[service.id]
  if (edited) return edited
  const override = dog?.servicePrices.find((item) => item.serviceId === service.id)
  if (override) return { price: String(override.price).replace('.', ','), duration: String(override.durationMin) }
  return { price: '', duration: '' }
}

function collectPrices(services: Service[], size: DogSize, dog: Dog | undefined, edits: QuoteEdits): { ok: true; prices: DogServicePrice[] } | { ok: false; message: string } {
  const kept = new Map<string, DogServicePrice>()
  for (const item of dog?.servicePrices ?? []) kept.set(item.serviceId, { ...item })
  for (const [serviceId, edit] of Object.entries(edits)) {
    const service = services.find((item) => item.id === serviceId)
    if (!service) continue
    const price = edit.price.trim()
    const duration = edit.duration.trim()
    if (price === '' && duration === '') {
      kept.delete(serviceId)
      continue
    }
    const list = listPrice(service, size)
    const parsed = dogServiceQuoteSchema.safeParse({ price: price === '' ? list.price : price, durationMin: duration === '' ? list.duration : duration })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Prezzo ≥ 0, al massimo due decimali' }
    }
    if (parsed.data.price === service.price[size] && parsed.data.durationMin === service.durationMin[size]) kept.delete(serviceId)
    else kept.set(serviceId, { serviceId, price: parsed.data.price, durationMin: parsed.data.durationMin })
  }
  return { ok: true, prices: [...kept.values()] }
}

function roleChoices(dogs: Dog[]): string[] {
  const base = ['Proprietaria', 'Co-proprietario', 'Figlia']
  const seen = new Set<string>(base)
  const extra: string[] = []
  for (const item of dogs) {
    for (const contact of item.contacts) {
      const role = contact.role.trim()
      if (!role || seen.has(role)) continue
      seen.add(role)
      extra.push(role)
    }
  }
  return [...base, ...extra]
}

function tagChoices(dogs: Dog[], suggestions: string[]): string[] {
  const seen = new Set<string>()
  const list: string[] = []
  for (const tag of [...suggestions, ...dogs.flatMap((item) => item.tags)]) {
    const value = tag.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    list.push(value)
  }
  return list
}

function copyContact(contact: DogContact): DogContact {
  return { id: contact.id, name: contact.name, role: contact.role, phone: contact.phone, isPrimary: contact.isPrimary }
}

interface SheetExtras {
  contacts: DogContact[]
  tags: string[]
  customFields: CustomField[]
  gallery: GalleryPhoto[]
}

function writeFromScreen(screen: DogScreen, draft: DogDraft, dog: Dog | undefined, photo: string | undefined, prices: DogServicePrice[], hidden: string[], extra: SheetExtras): DogWrite {
  const write: DogWrite = {
    ...draft,
    photo: photo ?? dog?.photo,
    servicePrices: prices,
    hiddenServiceIds: [...hidden],
    tags: [...extra.tags],
    customFields: extra.customFields.map((field) => ({ ...field })),
    gallery: extra.gallery.map((item) => ({ ...item })),
    contacts: mergeContacts(extra.contacts, draft.contact),
    isSenior: seniorOf(draft.ageCategory),
  }
  const year = completeYear(screen.birthYear.trim(), new Date())
  if (year !== null) write.birthYear = year
  const weight = weightOf(screen.weight)
  if (weight !== null && !Number.isNaN(weight)) write.weightKg = weight
  const weeks = Number.isInteger(screen.recurrenceWeeks) && screen.recurrenceWeeks >= 1 ? screen.recurrenceWeeks : dog?.recurrenceWeeks
  if (weeks !== undefined && (draft.clientType === 'mensile' || dog?.recurrenceWeeks !== undefined)) write.recurrenceWeeks = weeks
  return write
}

function readArrival(state: unknown): { name?: string; returnTo?: string } {
  if (!state || typeof state !== 'object') return {}
  const value = state as { name?: unknown; returnTo?: unknown }
  return {
    name: typeof value.name === 'string' ? value.name : undefined,
    returnTo: typeof value.returnTo === 'string' ? value.returnTo : undefined,
  }
}

export function dogToWrite(dog: Dog, servicePrices: DogServicePrice[]): DogWrite {
  const write: DogWrite = {
    name: dog.name,
    species: dog.species,
    breed: dog.breed,
    ageCategory: dog.ageCategory,
    size: dog.size,
    temperament: dog.temperament,
    clientType: dog.clientType,
    contact: { name: dog.contact.name, phone: dog.contact.phone },
    tags: [...dog.tags],
    servicePrices: servicePrices.map((item) => ({ ...item })),
    hiddenServiceIds: [...dog.hiddenServiceIds],
    customFields: dog.customFields.map((field) => ({ ...field })),
    gallery: dog.gallery.map((item) => ({ ...item })),
    contacts: dog.contacts.map(copyContact),
  }
  if (dog.sex) write.sex = dog.sex
  if (dog.photo) write.photo = dog.photo
  if (dog.notes) write.notes = dog.notes
  if (dog.criticalNote) write.criticalNote = dog.criticalNote
  if (dog.birthYear !== undefined) write.birthYear = dog.birthYear
  if (dog.isSenior !== undefined) write.isSenior = dog.isSenior
  if (dog.weightKg !== undefined) write.weightKg = dog.weightKg
  if (dog.recurrenceWeeks !== undefined) write.recurrenceWeeks = dog.recurrenceWeeks
  return write
}

function CriticalNote({ note }: { note: string }) {
  const parts = splitCritical(note)
  return (
    <div style={{ background: 'var(--bad-s)', color: 'var(--bad)', borderRadius: 12, padding: 10 }}>
      <div style={{ fontWeight: 700 }}>{parts.title}</div>
      {parts.rest ? <div>{parts.rest}</div> : null}
    </div>
  )
}

function FlagChips({ dog }: { dog: Dog }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <Chip tone={TEMPERAMENT_ICONS[dog.temperament].tone}>
        <TemperamentIcon kind={dog.temperament} size={SIZES.chip.iconInChip} />
        {TEMPERAMENT_ICONS[dog.temperament].label}
      </Chip>
      {seniorOf(dog.ageCategory) ? (
        <Chip tone="sen">
          <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} />
          Anziano
        </Chip>
      ) : null}
      {dog.clientType === 'mensile' ? (
        <Chip tone="tea">
          <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} />
          Mensile
        </Chip>
      ) : null}
    </div>
  )
}

function Portrait({ src, species }: { src?: string; species?: Species }) {
  return <img alt="" src={src || avatarForSpecies(species)} width={PORTRAIT} height={PORTRAIT} style={{ borderRadius: 16, objectFit: 'cover', background: 'var(--surf)', display: 'block' }} />
}

function FormAvatar({ src, onFile }: { src?: string; onFile: (file: File | undefined) => void }) {
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button type="button" aria-label="Foto del cane" onClick={() => pickRef.current?.click()} style={{ position: 'relative', border: 0, padding: 0, background: 'transparent', width: PORTRAIT, height: PORTRAIT }}>
        <Portrait src={src} />
        <span aria-hidden style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 999, background: 'var(--pri)', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <Camera size={13} strokeWidth={2} />
        </span>
      </button>
      <input
        ref={pickRef}
        aria-label="Foto"
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
        onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = '' }}
      />
    </div>
  )
}

function ReadPortrait({ src, species, onFile, onEnlarge }: { src?: string; species?: Species; onFile: (file: File | undefined) => void; onEnlarge?: () => void }) {
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <>
      <button type="button" aria-label="Foto del cane" onClick={src && onEnlarge ? onEnlarge : () => pickRef.current?.click()} style={{ border: 0, padding: 0, background: 'transparent', width: PORTRAIT, height: PORTRAIT, flex: 'none' }}>
        <Portrait src={src} species={species} />
      </button>
      {src ? null : (
        <input
          ref={pickRef}
          aria-hidden="true"
          tabIndex={-1}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      )}
    </>
  )
}

function PriceEditor({ services, dog, size, hidden, edits, onEdit, onToggleHidden }: {
  services: Service[]
  dog: Dog | undefined
  size: DogSize
  hidden: string[]
  edits: QuoteEdits
  onEdit: (serviceId: string, next: { price: string; duration: string }) => void
  onToggleHidden: (serviceId: string) => void
}) {
  const active = services
    .filter((service) => service.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '1fr 76px 76px', gap: 6, color: 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 600 }}>
        <span />
        <span>Prezzo €</span>
        <span>Durata min</span>
      </div>
      {active.map((service) => {
        const shown = shownQuote(service, dog, edits)
        const list = listPrice(service, size)
        const priceId = `prezzo-${service.id}`
        const durationId = `durata-${service.id}`
        return (
          <div key={service.id} role="group" aria-label={service.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 76px', gap: 6, alignItems: 'center', minHeight: SIZES.row.minH }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
                <span style={{ fontWeight: 600, fontSize: TYPE.base }}>{service.name}</span>
              </span>
              <span>
                <HiddenLabel htmlFor={priceId}>{`Prezzo ${service.name}`}</HiddenLabel>
                <input id={priceId} inputMode="decimal" autoComplete="off" placeholder={list.price} value={shown.price} onChange={(event) => onEdit(service.id, { price: event.target.value, duration: shown.duration })} style={smallInput} />
              </span>
              <span>
                <HiddenLabel htmlFor={durationId}>{`Durata ${service.name}`}</HiddenLabel>
                <input id={durationId} inputMode="numeric" autoComplete="off" placeholder={list.duration} value={shown.duration} onChange={(event) => onEdit(service.id, { price: shown.price, duration: event.target.value })} style={smallInput} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: TYPE.meta }}>
              <Toggle checked={hidden.includes(service.id)} onChange={() => onToggleHidden(service.id)} label="nascondi questo servizio per questo cane" />
              <span>nascondi questo servizio per questo cane</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContactRow({ contact, call, onRemove }: { contact: DogContact; call: boolean; onRemove?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: SIZES.row.minH }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600 }}>{contact.name}</span>
        <span style={{ display: 'block' }}>{contact.phone}</span>
      </span>
      {contact.role ? <Chip>{contact.role}</Chip> : null}
      {contact.isPrimary ? <Chip tone="pri">Principale</Chip> : null}
      {call && contact.phone ? (
        <a href={`tel:${contact.phone}`} aria-label={`Chiama ${contact.name || contact.phone}`} style={iconAction}>
          <Phone size={16} strokeWidth={2} aria-hidden />
        </a>
      ) : null}
      {onRemove ? <button type="button" aria-label={`Togli ${contact.name}`} onClick={onRemove} style={{ ...sheetAction, width: 'auto' }}>Togli</button> : null}
    </div>
  )
}

function ContactSheet({ open, dogs, onClose, onAdd }: { open: boolean; dogs: Dog[]; onClose: () => void; onAdd: (contact: DogContact) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setRole('')
  }, [open])
  function commit() {
    if (!name.trim() || !phone.trim()) return
    onAdd({ id: crypto.randomUUID(), name: name.trim(), role, phone: phone.trim(), isPrimary: false })
    onClose()
  }
  return (
    <Sheet open={open} title="Contatto" onClose={onClose}>
      <Input label="Nome contatto" autoCapitalize="words" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="Telefono contatto" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <div role="group" aria-label="Ruolo" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {roleChoices(dogs).map((choice) => (
          <button key={choice} type="button" aria-pressed={role === choice} onClick={() => setRole(role === choice ? '' : choice)} style={{ ...sheetAction, width: 'auto', color: role === choice ? 'var(--pri)' : 'inherit' }}>{choice}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi contatto</button>
    </Sheet>
  )
}

function TagSheet({ open, dogs, suggestions, tags, onClose, onAdd }: { open: boolean; dogs: Dog[]; suggestions: string[]; tags: string[]; onClose: () => void; onAdd: (tag: string) => void }) {
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (open) setDraft('')
  }, [open])
  function commit(value: string) {
    const tag = value.trim()
    onClose()
    if (!tag || tags.includes(tag)) return
    onAdd(tag)
  }
  return (
    <Sheet open={open} title="Tag" onClose={onClose}>
      <Input label="Tag" autoCapitalize="words" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {tagChoices(dogs, suggestions).map((tag) => (
          <button key={tag} type="button" onClick={() => commit(tag)} style={{ ...sheetAction, width: 'auto' }}>{tag}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={() => commit(draft)}>Aggiungi tag</button>
    </Sheet>
  )
}

function FieldSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (field: CustomField) => void }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  useEffect(() => {
    if (!open) return
    setLabel('')
    setValue('')
  }, [open])
  function commit() {
    if (!label.trim()) return
    onAdd({ id: crypto.randomUUID(), label: label.trim(), value: value.trim() })
    onClose()
  }
  return (
    <Sheet open={open} title="Campo" onClose={onClose}>
      <Input label="Etichetta campo" autoCapitalize="sentences" autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input label="Valore campo" autoCapitalize="sentences" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi campo</button>
    </Sheet>
  )
}

function Gallery({ gallery, editing, onGallery, onError }: { gallery: GalleryPhoto[]; editing: boolean; onGallery: (gallery: GalleryPhoto[]) => void; onError: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [limit, setLimit] = useState(4)
  const [zoom, setZoom] = useState<string | null>(null)
  const photos = gallery.slice(0, limit)
  const hiddenPhotos = gallery.length - photos.length

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const photo = await prepareDogPhoto(file)
      onGallery([...gallery, { id: crypto.randomUUID(), photo, takenAt: new Date() }])
    } catch {
      onError()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>Galleria</SectionTitle>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {photos.map((item, index) => (
          <span key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button type="button" aria-label={`Ingrandisci foto ${index + 1}`} onClick={() => setZoom(item.photo)} style={{ border: 0, padding: 0, background: 'transparent' }}>
              <img alt="" src={item.photo} width={50} height={50} style={thumbStyle} />
            </button>
            {editing ? <button type="button" aria-label={`Togli foto ${index + 1}`} onClick={() => onGallery(gallery.filter((photo) => photo.id !== item.id))} style={{ ...sheetAction, width: 'auto' }}>Togli</button> : null}
          </span>
        ))}
        {hiddenPhotos > 0 ? (
          <button type="button" onClick={() => setLimit(gallery.length)} style={{ width: 50, height: 50, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surf)' }}>{`+${hiddenPhotos}`}</button>
        ) : null}
        <button type="button" onClick={() => fileRef.current?.click()} style={textAction}>Aggiungi</button>
        <input
          ref={fileRef}
          aria-label="Aggiungi alla galleria"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
          onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = '' }}
        />
      </div>
      <Sheet open={zoom !== null} title="Foto" onClose={() => setZoom(null)}>
        {zoom ? <img alt="" src={zoom} style={{ width: '100%', borderRadius: 12 }} /> : null}
      </Sheet>
    </div>
  )
}

function readPrice(value: string): { ok: true; price: number } | { ok: false; message: string } {
  const parsed = dogServiceQuoteSchema.safeParse({ price: value, durationMin: '1' })
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Prezzo ≥ 0, al massimo due decimali' }
  return { ok: true, price: parsed.data.price }
}

function visitPrice(item: Appointment): number {
  return item.total != null ? item.total : sumPrice(item.services)
}

function History({ dogId, appointments, onSavePrice, onCopyPrice }: {
  dogId: string
  appointments: Appointment[]
  onSavePrice: (appointment: Appointment, price: number) => 'single' | 'many' | false
  onCopyPrice: (serviceId: string, price: number) => void
}) {
  const [limit, setLimit] = useState(3)
  const [target, setTarget] = useState<Appointment | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'single' | 'many'>('edit')
  const [applied, setApplied] = useState<number | null>(null)
  const completed = appointments
    .filter((item) => item.dogId === dogId && item.status === 'completato')
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))
  const shown = completed.slice(0, limit)
  const singleId = target?.services.length === 1 ? target.services[0]?.serviceId : undefined

  function open(item: Appointment) {
    setTarget(item)
    setValue(String(visitPrice(item)))
    setError(null)
    setMode('edit')
    setApplied(null)
  }

  function apply() {
    if (!target) return
    const parsed = readPrice(value)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    const result = onSavePrice(target, parsed.price)
    if (!result) return
    setApplied(parsed.price)
    setMode(result)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>Storico</SectionTitle>
      {completed.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>Nessun trattamento</p> : shown.map((item, index) => {
        const price = visitPrice(item)
        const before = completed[index + 1]
        const when = format(item.start, 'd MMM', IT_DATE)
        const change = before ? Math.sign(price - visitPrice(before)) : 0
        return (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 52, color: 'var(--tx3)', fontSize: TYPE.meta }}>{when}</span>
              <span style={{ flex: 1 }}>{item.services.map((line) => line.name).join(', ')}</span>
              {change !== 0 ? (
                change > 0
                  ? <ArrowUp size={12} role="img" aria-label="Prezzo più alto del precedente" />
                  : <ArrowDown size={12} role="img" aria-label="Prezzo più basso del precedente" />
              ) : null}
              <span>{formatEuro(price)}</span>
              <button type="button" aria-label={`Correggi prezzo ${when}`} onClick={() => open(item)} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0 }}>
                <Pencil size={14} aria-hidden />
              </button>
            </div>
            {item.tools?.length ? <div>{`Strumenti ${item.tools.join(', ')}`}</div> : null}
            {item.products?.length ? <div>{`Prodotti ${item.products.join(', ')}`}</div> : null}
            {item.cutStyle ? <div>{`Stile ${item.cutStyle}`}</div> : null}
            {item.actualDurationMin != null ? <div>{`Durata reale ${formatCompactDuration(item.actualDurationMin)}`}</div> : null}
            {item.photos?.some((photo) => photo.kind === 'prima' || photo.kind === 'dopo') ? (
              <div style={{ display: 'flex', gap: 4 }}>
                {item.photos.filter((photo) => photo.kind === 'prima' || photo.kind === 'dopo').map((photo) => (
                  <img key={photo.id} alt={photo.kind === 'prima' ? 'Prima' : 'Dopo'} src={photo.photo} width={50} height={50} style={thumbStyle} />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
      {completed.length > 3 && limit < completed.length ? (
        <button type="button" onClick={() => setLimit(completed.length)} style={{ ...sheetAction, color: 'var(--pri)' }}>{`Tutti ${completed.length}`}</button>
      ) : null}
      <Sheet open={target !== null} title="Prezzo" onClose={() => setTarget(null)}>
        {mode === 'edit' ? (
          <>
            <Input label="Prezzo appuntamento" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
            {error ? <p style={{ margin: 0, color: 'var(--bad)' }}>{error}</p> : null}
            <button type="button" style={sheetAction} onClick={apply}>Applica</button>
          </>
        ) : (
          <>
            <button type="button" style={sheetAction} onClick={() => setTarget(null)}>Solo questo appuntamento</button>
            {mode === 'single' && singleId && applied != null ? (
              <button type="button" style={sheetAction} onClick={() => { onCopyPrice(singleId, applied); setTarget(null) }}>Aggiorna anche il prezzo in scheda</button>
            ) : null}
          </>
        )}
      </Sheet>
    </div>
  )
}

export function DogPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const arrival = readArrival(useLocation().state)
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const visits = useAppointments(uid)
  const { services } = useServices(uid)
  const { settings, save: saveSettings, ready: settingsReady } = useSettings()
  const dog = id ? api.dogs.find((item) => item.id === id) : undefined
  const [editing, setEditing] = useState(isNew)
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<'non_in_cura' | 'deceduto' | null>(null)
  const [photoSheet, setPhotoSheet] = useState(false)
  const [photoZoom, setPhotoZoom] = useState(false)
  const [screen, setScreen] = useState<DogScreen>(() => dogScreenSeed(dog, arrival.name))
  const [hidden, setHidden] = useState<string[]>(() => (dog ? [...dog.hiddenServiceIds] : []))
  const [edits, setEdits] = useState<QuoteEdits>({})
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<DogContact[]>(() => dog?.contacts.map(copyContact) ?? [])
  const [tags, setTags] = useState<string[]>(() => (dog ? [...dog.tags] : []))
  const [fields, setFields] = useState<CustomField[]>(() => dog?.customFields.map((field) => ({ ...field })) ?? [])
  const [gallery, setGallery] = useState<GalleryPhoto[]>(() => dog?.gallery.map((item) => ({ ...item })) ?? [])
  const [contactOpen, setContactOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [fieldOpen, setFieldOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dogRef = useRef(dog)
  dogRef.current = dog
  const seededId = useRef<string | null>(dog && id === dog.id ? id : null)
  const arrivalName = arrival.name

  function applySeed(source: Dog | undefined) {
    const seed = dogFormSeed(source)
    setScreen(dogScreenSeed(source, source ? undefined : arrivalName))
    setHidden(seed.hiddenServiceIds)
    setEdits({})
    setQuoteError(null)
    setContacts(seed.contacts)
    setTags(seed.tags)
    setFields(seed.customFields)
    setGallery(seed.gallery)
  }

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  useEffect(() => {
    const source = dogRef.current
    applySeed(source)
    seededId.current = source && id && source.id === id ? id : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, uid])

  useEffect(() => {
    if (!shouldReseedDog(seededId.current, id, dog?.id)) return
    applySeed(dog)
    seededId.current = id ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dog])

  useEffect(() => {
    if (!id || !uid || !settingsReady) return
    const found = api.dogs.find((item) => item.id === id)
    if (!found || found.status !== 'attivo') return
    if (settings.recentDogIds[0] === id) return
    saveSettings(rememberDog(settings, id))
  }, [id, uid, settingsReady, api.dogs, settings, saveSettings])

  function storeSettings(next: typeof settings) {
    if (!uid || !settingsReady || !saveSettings(next)) {
      if (uid) toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function storeTag(tag: string) {
    if (settings.tagSuggestions.includes(tag)) return
    storeSettings({
      ...settings,
      tagSuggestions: [...settings.tagSuggestions, tag],
      updatedAt: new Date().toISOString(),
    })
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      setPhoto(await prepareDogPhoto(file))
      setPhotoError(null)
      setEditing(true)
    } catch {
      setPhotoError('Foto non utilizzabile')
    }
  }

  function save(draft: DogDraft) {
    let prices = dog?.servicePrices ?? []
    if (Object.keys(edits).length > 0) {
      const parsed = collectPrices(services, draft.size, dog, edits)
      if (!parsed.ok) {
        setQuoteError(parsed.message)
        return
      }
      prices = parsed.prices
    }
    setQuoteError(null)
    const write = writeFromScreen(screen, draft, dog, photo, prices, hidden, { contacts, tags, customFields: fields, gallery })
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    setEdits({})
    if (!dog && api.lastCreatedId.current) {
      const createdId = api.lastCreatedId.current
      if (arrival.returnTo) {
        toast.show(`${draft.name} salvato`, 'ok')
        const separator = arrival.returnTo.includes('?') ? '&' : '?'
        navigate(`${arrival.returnTo}${separator}cane=${createdId}`, { replace: true })
        return
      }
      toast.show(`${draft.name} salvato`, 'ok', {
        label: 'Annulla',
        onClick: () => {
          if (!api.remove(createdId)) {
            toast.show('Salvataggio non riuscito', 'plain')
            return
          }
          navigate('/animali', { replace: true })
        },
      })
      navigate(`/animali/${createdId}`, { replace: true })
      return
    }
    toast.show('Salvato', 'ok')
    setEditing(false)
    setPhoto(undefined)
    setPhotoError(null)
  }

  function saveHistoryPrice(appointment: Appointment, price: number): 'single' | 'many' | false {
    const single = appointment.services.length === 1
    const nextServices = appointment.services.map((line, index) => (
      single && index === 0 ? { ...line, price } : { ...line }
    ))
    const ok = visits.saveExisting(appointment.id, {
      dogId: appointment.dogId,
      start: appointment.start,
      services: nextServices,
      total: single ? null : price,
    })
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return false
    }
    return single ? 'single' : 'many'
  }

  function copyHistoryPrice(serviceId: string, price: number) {
    if (!dog) return
    const service = services.find((item) => item.id === serviceId)
    const current = dog.servicePrices.find((item) => item.serviceId === serviceId)
    const durationMin = current?.durationMin ?? service?.durationMin[dog.size] ?? 1
    const nextPrices = [
      ...dog.servicePrices.filter((item) => item.serviceId !== serviceId),
      { serviceId, price, durationMin },
    ]
    if (!api.saveExisting(dog.id, dogToWrite(dog, nextPrices))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function changeStatus(action: () => boolean) {
    if (!action()) toast.show('Salvataggio non riuscito', 'plain')
  }

  function askArchive(status: 'non_in_cura' | 'deceduto') {
    if (!dog) return
    setMenuOpen(false)
    if (futureScheduled(visits.appointments, dog.id, new Date()).length === 0) {
      changeStatus(() => api.archive(dog.id, status))
      return
    }
    setPendingArchive(status)
  }

  function archiveOnly() {
    if (!dog || !pendingArchive) return
    const status = pendingArchive
    setPendingArchive(null)
    changeStatus(() => api.archive(dog.id, status))
  }

  function archiveAndCancel() {
    if (!dog || !pendingArchive) return
    const status = pendingArchive
    const dogId = dog.id
    const reason: CancelReason = status === 'deceduto' ? 'deceduto' : 'cliente'
    const future = futureScheduled(visits.appointments, dogId, new Date())
    if (!api.archive(dogId, status)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    for (const item of future) {
      if (!visits.setStatus(item.id, 'disdetto', reason)) {
        toast.show('Salvataggio non riuscito', 'plain')
        return
      }
    }
    setPendingArchive(null)
  }

  function confirmRemove() {
    if (!dog) return
    setConfirmDelete(false)
    if (!api.remove(dog.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    navigate('/animali')
  }

  if (id && !dog) {
    return (
      <PhoneShell>
        <Header title="Scheda" backTo="/animali" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
    )
  }

  const futureCount = dog ? futureScheduled(visits.appointments, dog.id, new Date()).length : 0
  const line = dog ? statusLine(dog.status) : null
  const shownPhoto = photo ?? dog?.photo
  const phone = dog ? primaryPhone(dog) : ''
  const owner = dog ? primaryName(dog) : ''
  const labels = settings.fieldLabels
  const extraContacts = contacts.filter((contact) => !contact.isPrimary)
  const notesText = dog?.notes?.trim() ?? ''

  function editQuote(serviceId: string, next: { price: string; duration: string }) {
    setEdits((current) => ({ ...current, [serviceId]: next }))
  }

  function toggleHidden(serviceId: string) {
    setHidden((current) => (current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId]))
  }

  const formDetails = (
    <>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {tags.map((tag) => (
          <button key={tag} type="button" aria-label={`Togli ${tag}`} onClick={() => setTags(tags.filter((item) => item !== tag))} style={{ border: 0, background: 'transparent', padding: 0 }}>
            <Chip>{tag}</Chip>
          </button>
        ))}
        <button type="button" onClick={() => setTagOpen(true)} style={textAction}>+ Tag</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <HiddenLabel htmlFor={`campo-etichetta-${field.id}`}>{`Etichetta campo ${index + 1}`}</HiddenLabel>
            <input id={`campo-etichetta-${field.id}`} autoComplete="off" autoCapitalize="sentences" value={field.label} onChange={(event) => setFields(fields.map((item) => (item.id === field.id ? { ...item, label: event.target.value } : item)))} style={smallInput} />
            <HiddenLabel htmlFor={`campo-valore-${field.id}`}>{`Valore campo ${index + 1}`}</HiddenLabel>
            <input id={`campo-valore-${field.id}`} autoComplete="off" autoCapitalize="sentences" value={field.value} onChange={(event) => setFields(fields.map((item) => (item.id === field.id ? { ...item, value: event.target.value } : item)))} style={smallInput} />
            <button type="button" aria-label={`Togli campo ${index + 1}`} onClick={() => setFields(fields.filter((item) => item.id !== field.id))} style={{ ...sheetAction, width: 'auto' }}>Togli</button>
          </div>
        ))}
        <button type="button" onClick={() => setFieldOpen(true)} style={textAction}>Campi</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {extraContacts.map((contact) => (
          <ContactRow key={contact.id} contact={contact} call={false} onRemove={() => setContacts(contacts.filter((item) => item.id !== contact.id))} />
        ))}
        <button type="button" onClick={() => setContactOpen(true)} style={textAction}>+ Contatto</button>
      </div>
      {dog ? (
        <Gallery gallery={gallery} editing onGallery={(next) => { setGallery(next); setPhotoError(null) }} onError={() => setPhotoError('Foto non utilizzabile')} />
      ) : null}
    </>
  )

  const headerAction = dog ? (
    <div style={{ display: 'flex', gap: 6 }}>
      {editing ? null : (
        <IconButton label="Modifica" onClick={() => { setPhotoError(null); setEditing(true) }}>
          <Pencil size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
      <IconButton label="Menu" onClick={() => setMenuOpen(true)}>
        <MoreVertical size={16} strokeWidth={2} aria-hidden />
      </IconButton>
    </div>
  ) : undefined

  return (
    <PhoneShell>
      <Header title={dog ? 'Scheda' : 'Nuovo cane'} backTo="/animali" action={headerAction} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ReadPortrait src={dog.photo} species={dog.species} onFile={(file) => void onPhoto(file)} onEnlarge={dog.photo ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>{dog.name}</div>
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.rowSub }}>{identityLine(dog, new Date())}</div>
                {owner ? <div style={{ fontSize: TYPE.base }}>{owner}</div> : null}
                {phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: TYPE.base }}>
                    <span>{phone}</span>
                    <a href={`tel:${phone}`} style={callLink}>
                      <Phone size={14} strokeWidth={2} aria-hidden />
                      Chiama
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            <FlagChips dog={dog} />
            {dog.criticalNote ? <CriticalNote note={dog.criticalNote} /> : null}
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <NextAppointment
              dog={dog}
              appointments={visits.appointments}
              saveNew={visits.saveNew}
              remove={visits.remove}
              lastCreatedId={visits.lastCreatedId}
            />
            <History dogId={dog.id} appointments={visits.appointments} onSavePrice={saveHistoryPrice} onCopyPrice={copyHistoryPrice} />
            {notesText ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionTitle>Note</SectionTitle>
                <Card style={{ padding: 10 }}>
                  <div>{notesText}</div>
                </Card>
              </div>
            ) : null}
            {dog.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dog.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
              </div>
            ) : null}
            {dog.customFields.map((field) => <div key={field.id}>{`${field.label}: ${field.value}`}</div>)}
            <Collapsible title="Dettagli" open={detailsOpen} onToggle={() => setDetailsOpen((open) => !open)}>
              {[
                [labels.species, SPECIES_LABEL[dog.species]],
                [labels.sex, dog.sex ? SEX_LABEL[dog.sex] : '—'],
                [labels.weight, dog.weightKg != null ? `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(dog.weightKg)} kg` : '—'],
                [labels.size, SIZE_LABEL[dog.size]],
                [labels.clientType, dog.clientType === 'mensile' && dog.recurrenceWeeks ? `${CLIENT_LABEL[dog.clientType]} · ogni ${dog.recurrenceWeeks} settimane` : CLIENT_LABEL[dog.clientType]],
                [labels.avgDuration, averageDuration(visits.appointments, dog.id)],
              ].map(([label, text]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: TYPE.base }}>
                  <span style={{ color: 'var(--tx3)' }}>{label}</span>
                  <span>{text}</span>
                </div>
              ))}
            </Collapsible>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SectionTitle>Contatti</SectionTitle>
              {dog.contacts.map((contact) => <ContactRow key={contact.id} contact={contact} call />)}
            </div>
            <Gallery gallery={gallery} editing={false} onGallery={(next) => { setGallery(next); setPhotoError(null); setEditing(true) }} onError={() => setPhotoError('Foto non utilizzabile')} />
            {dog.status !== 'attivo' ? <Button variant="ghost" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button> : null}
          </>
        ) : (
          <DogFields
            value={screen}
            onChange={setScreen}
            thresholds={settings.ageThresholds}
            requireOwner={!dog || dog.contact.name.trim() !== ''}
            onSubmit={save}
            top={(
              <>
                <FormAvatar src={shownPhoto} onFile={(file) => void onPhoto(file)} />
                {photoError ? <p style={{ margin: 0, color: 'var(--bad)', textAlign: 'center' }}>{photoError}</p> : null}
                {line ? <p style={{ margin: 0, color: 'var(--tx3)', textAlign: 'center' }}>{line}</p> : null}
              </>
            )}
            details={formDetails}
            prices={<PriceEditor services={services} dog={dog} size={screen.size} hidden={hidden} edits={edits} onEdit={editQuote} onToggleHidden={toggleHidden} />}
            pricesError={quoteError}
          />
        )}
      </div>
      <Sheet open={menuOpen} title="Scheda" onClose={() => setMenuOpen(false)}>
        {dog?.status === 'attivo' ? (
          <>
            <button type="button" style={sheetAction} onClick={() => askArchive('non_in_cura')}>Non più in cura</button>
            <button type="button" style={sheetAction} onClick={() => askArchive('deceduto')}>Deceduto</button>
          </>
        ) : null}
        {dog ? <button type="button" style={sheetAction} onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}>Elimina definitivamente</button> : null}
      </Sheet>
      <Sheet open={pendingArchive !== null} title="Archivia" onClose={() => setPendingArchive(null)}>
        {pendingArchive === 'deceduto' ? (
          <>
            <p style={{ margin: 0, fontSize: TYPE.base }}>{`${futureCountText(futureCount)} verranno disdetti.`}</p>
            <button type="button" style={sheetAction} onClick={archiveAndCancel}>Conferma</button>
            <button type="button" style={sheetAction} onClick={() => setPendingArchive(null)}>Annulla</button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: TYPE.base }}>{`${futureCountText(futureCount)}.`}</p>
            <button type="button" style={sheetAction} onClick={archiveAndCancel}>Archivia e disdici i futuri</button>
            <button type="button" style={sheetAction} onClick={archiveOnly}>Archivia soltanto</button>
          </>
        )}
      </Sheet>
      <Sheet open={confirmDelete} title="Elimina definitivamente" onClose={() => setConfirmDelete(false)}>
        <button type="button" style={sheetAction} onClick={confirmRemove}>Elimina definitivamente</button>
        <button type="button" style={sheetAction} onClick={() => setConfirmDelete(false)}>Annulla</button>
      </Sheet>
      <ContactSheet open={contactOpen} dogs={api.dogs} onClose={() => setContactOpen(false)} onAdd={(contact) => setContacts((current) => [...current, contact])} />
      <TagSheet
        open={tagOpen}
        dogs={api.dogs}
        suggestions={settings.tagSuggestions}
        tags={tags}
        onClose={() => setTagOpen(false)}
        onAdd={(tag) => {
          setTags((current) => [...current, tag])
          storeTag(tag)
        }}
      />
      <FieldSheet open={fieldOpen} onClose={() => setFieldOpen(false)} onAdd={(field) => setFields((current) => [...current, field])} />
      <Sheet
        open={photoSheet}
        title="Foto"
        onClose={() => {
          setPhotoSheet(false)
          setPhotoZoom(false)
        }}
      >
        {photoZoom && shownPhoto ? <img alt="" src={shownPhoto} style={{ width: '100%', borderRadius: 12 }} /> : null}
        <button type="button" style={sheetAction} onClick={() => fileRef.current?.click()}>Cambia</button>
        <button type="button" style={sheetAction} onClick={() => setPhotoZoom(true)}>Ingrandisci</button>
        <input
          ref={fileRef}
          aria-label="Cambia foto"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show('Permesso foto negato', 'plain'))}
          onChange={(event) => {
            void onPhoto(event.target.files?.[0])
            setPhotoSheet(false)
            setPhotoZoom(false)
          }}
        />
      </Sheet>
    </PhoneShell>
  )
}
