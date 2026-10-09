import { format } from 'date-fns'
import { MoreVertical, Pencil, Phone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { DogAvatar } from '../components/domain/DogAvatar'
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
import { SectionTitle } from '../components/ui/SectionTitle'
import { listDogs } from '../data/local/dogs'
import { getSettings, rememberDog, setFieldLabel, setTagSuggestions, type FieldLabels } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { sumPrice } from '../lib/appointments'
import { AGE_LABEL, ARCHIVE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL } from '../lib/dogList'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { ageText, averageDuration, formatCompactDuration, splitCritical } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { quotedPrice } from '../lib/quote'
import { dogServiceQuoteSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { AgeCategory, Appointment, CustomField, Dog, DogContact, DogDraft, DogServicePrice, DogSize, DogWrite, GalleryPhoto, Service, Temperament } from '../types/models'
import { DogFields } from './DogFields'
import { NextAppointment } from './NextAppointment'

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

const quoteInput = {
  width: 72,
  height: 34,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 8px',
  font: 'inherit',
}

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
  const sex = dog.sex ? SEX_LABEL[dog.sex] : ''
  const age = ageText(dog.birthYear, AGE_LABEL[dog.ageCategory], now)
  return [dog.breed.trim(), sex, age].filter((part) => part !== '').join(' · ')
}

function futureScheduled(items: Appointment[], dogId: string, now: Date): Appointment[] {
  return items.filter((item) => item.dogId === dogId && item.status === 'programmato' && item.start.getTime() >= now.getTime())
}

function mergeContacts(contacts: DogContact[], owner: { name: string; phone: string }): DogContact[] {
  if (contacts.length === 0) {
    return [{ id: 'primary', name: owner.name, role: 'Proprietaria', phone: owner.phone, isPrimary: true }]
  }
  const found = contacts.findIndex((contact) => contact.isPrimary)
  const chosen = found === -1 ? 0 : found
  return contacts.map((contact, index) => (
    index === chosen ? { ...contact, name: owner.name, phone: owner.phone } : { ...contact }
  ))
}

function quoteText(service: Service, size: DogSize, dog: Dog | undefined, edits: QuoteEdits): { price: string; duration: string } {
  const edited = edits[service.id]
  if (edited) return edited
  if (dog) {
    const quote = quotedPrice({ ...dog, size }, service)
    return { price: String(quote.price), duration: String(quote.durationMin) }
  }
  return { price: String(service.price[size]), duration: String(service.durationMin[size]) }
}

function collectQuotes(services: Service[], size: DogSize, dog: Dog | undefined, edits: QuoteEdits): { ok: true; prices: DogServicePrice[] } | { ok: false; message: string } {
  const prices: DogServicePrice[] = []
  for (const service of services) {
    if (!service.active) continue
    const shown = quoteText(service, size, dog, edits)
    const parsed = dogServiceQuoteSchema.safeParse({ price: shown.price, durationMin: shown.duration })
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Prezzo ≥ 0, al massimo due decimali' }
    }
    if (parsed.data.price !== service.price[size] || parsed.data.durationMin !== service.durationMin[size]) {
      prices.push({ serviceId: service.id, price: parsed.data.price, durationMin: parsed.data.durationMin })
    }
  }
  return { ok: true, prices }
}

const ROLE_SUGGESTIONS = ['Proprietaria', 'Co-proprietario', 'Figlia']

const FALLBACK_LABELS: FieldLabels = {
  species: 'Specie',
  breed: 'Razza',
  sex: 'Sesso',
  age: 'Età',
  weight: 'Peso',
  size: 'Taglia',
  clientType: 'Cliente',
  avgDuration: 'Durata media',
}

type SheetExtras = {
  contacts: DogContact[]
  tags: string[]
  customFields: CustomField[]
  gallery: GalleryPhoto[]
  birthYearInput: string
  yearTouched: boolean
  categoryOverride: AgeCategory | null
  isSenior: boolean
  seniorTouched: boolean
  weightInput: string
}

function ageCategoryFor(birthYear: number, now: Date, thresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }): AgeCategory {
  const years = now.getFullYear() - birthYear
  if (years < thresholds.giovaneFrom) return 'cucciolo'
  if (years < thresholds.adultoFrom) return 'giovane'
  if (years < thresholds.anzianoFrom) return 'adulto'
  return 'anziano'
}

function formatKg(kg: number): string {
  return `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(kg)} kg`
}

function weightText(kg: number | undefined): string {
  if (kg == null) return ''
  return String(kg).replace('.', ',')
}

function roleChoices(dogs: Dog[]): string[] {
  const seen = new Set<string>(ROLE_SUGGESTIONS)
  const extra: string[] = []
  for (const item of dogs) {
    for (const contact of item.contacts) {
      const role = contact.role.trim()
      if (!role || seen.has(role)) continue
      seen.add(role)
      extra.push(role)
    }
  }
  return [...ROLE_SUGGESTIONS, ...extra]
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

function writeFromScreen(draft: DogDraft, dog: Dog | undefined, photo: string | undefined, prices: DogServicePrice[], hidden: string[], extra: SheetExtras): DogWrite {
  const write: DogWrite = {
    ...draft,
    photo: photo ?? dog?.photo,
    servicePrices: prices,
    hiddenServiceIds: [...hidden],
    tags: [...extra.tags],
    customFields: extra.customFields.map((field) => ({ ...field })),
    gallery: extra.gallery.map((item) => ({ ...item })),
    contacts: mergeContacts(extra.contacts, draft.contact),
  }
  if (/^\d{4}$/.test(extra.birthYearInput)) {
    write.birthYear = Number(extra.birthYearInput)
    if (extra.yearTouched && extra.categoryOverride) write.ageCategory = extra.categoryOverride
  } else if (dog?.birthYear !== undefined && extra.birthYearInput.trim() !== '') {
    write.birthYear = dog.birthYear
  }
  if (extra.yearTouched || extra.seniorTouched) write.isSenior = extra.isSenior
  else if (dog?.isSenior !== undefined) write.isSenior = dog.isSenior
  const weightRaw = extra.weightInput.trim()
  if (weightRaw !== '') {
    const weight = Number(weightRaw.replace(',', '.'))
    if (Number.isFinite(weight) && weight >= 0) write.weightKg = weight
    else if (dog?.weightKg !== undefined) write.weightKg = dog.weightKg
  }
  if (dog?.recurrenceWeeks !== undefined) write.recurrenceWeeks = dog.recurrenceWeeks
  return write
}

function namedArrival(name: string | undefined): Dog | undefined {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return undefined
  return { name: trimmed, contact: { name: '', phone: '' } } as Dog
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

function CallButton({ phone }: { phone: string }) {
  const icon = <Phone size={16} strokeWidth={2} aria-hidden />
  if (!phone) return <button type="button" aria-label="Chiama" style={iconAction}>{icon}</button>
  return <a href={`tel:${phone}`} aria-label="Chiama" style={iconAction}>{icon}</a>
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
      {dog.ageCategory === 'anziano' || dog.isSenior ? (
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

function ServicePrices({
  services,
  dog,
  size,
  hidden,
  edits,
  editing,
  onEdit,
  onHide,
  onShow,
}: {
  services: Service[]
  dog: Dog | undefined
  size: DogSize
  hidden: string[]
  edits: QuoteEdits
  editing: boolean
  onEdit: (serviceId: string, next: { price: string; duration: string }) => void
  onHide: (serviceId: string) => void
  onShow: (serviceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const visible = services
    .filter((service) => service.active && !hidden.includes(service.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const concealed = services
    .filter((service) => service.active && hidden.includes(service.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>Servizi e prezzi</SectionTitle>
      {visible.map((service) => {
        const shown = quoteText(service, size, dog, edits)
        const duration = Number(shown.duration)
        const price = Number(shown.price.replace(',', '.'))
        return (
          <div key={service.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: SIZES.row.minH }}>
            <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: TYPE.base }}>{service.name}</span>
              {editing ? null : <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{formatCompactDuration(Number.isFinite(duration) ? duration : 0)}</span>}
            </span>
            {editing ? (
              <>
                <input
                  aria-label={`Durata ${service.name}`}
                  value={shown.duration}
                  onChange={(event) => onEdit(service.id, { price: shown.price, duration: event.target.value })}
                  style={quoteInput}
                />
                <input
                  aria-label={`Prezzo ${service.name}`}
                  value={shown.price}
                  onChange={(event) => onEdit(service.id, { price: event.target.value, duration: shown.duration })}
                  style={quoteInput}
                />
                <button type="button" aria-label={`Nascondi ${service.name}`} onClick={() => onHide(service.id)} style={{ ...sheetAction, width: 'auto' }}>Nascondi</button>
              </>
            ) : (
              <Chip>{formatEuro(Number.isFinite(price) ? price : 0)}</Chip>
            )}
          </div>
        )
      })}
      {editing ? <button type="button" onClick={() => setOpen(true)} style={{ ...sheetAction, color: 'var(--pri)' }}>+ Servizio</button> : null}
      <Sheet open={open} title="Servizio" onClose={() => setOpen(false)}>
        {concealed.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>Nessun servizio nascosto</p> : concealed.map((service) => (
          <button
            key={service.id}
            type="button"
            style={sheetAction}
            onClick={() => {
              onShow(service.id)
              setOpen(false)
            }}
          >
            {service.name}
          </button>
        ))}
      </Sheet>
    </div>
  )
}

const thumbStyle = { width: 50, height: 50, borderRadius: 8, objectFit: 'cover' as const, display: 'block' }

function blockSubmit(event: { key: string; preventDefault: () => void }) {
  if (event.key === 'Enter') event.preventDefault()
}

function readPrice(value: string): { ok: true; price: number } | { ok: false; message: string } {
  const parsed = dogServiceQuoteSchema.safeParse({ price: value, durationMin: '1' })
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Prezzo ≥ 0, al massimo due decimali' }
  return { ok: true, price: parsed.data.price }
}

function LabelPencil({ label, onRename }: { label: string; onRename: () => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--tx3)', fontSize: TYPE.meta }}>
      {label}
      <button type="button" aria-label={`Rinomina ${label}`} onClick={onRename} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0, display: 'grid' }}>
        <Pencil size={12} aria-hidden />
      </button>
    </span>
  )
}

function DogLower({
  dogId,
  uid,
  editing,
  labels,
  onLabels,
  dogs,
  temperament,
  onTemperament,
  tags,
  onTags,
  fields,
  onFields,
  contacts,
  onContacts,
  showNotes,
  notes,
  appointments,
  onSavePrice,
  onCopyPrice,
  gallery,
  onGallery,
  onGalleryError,
  birthYearInput,
  onBirthYear,
  weightInput,
  onWeight,
  isSenior,
  onSenior,
  ageLine,
  speciesText,
  breedText,
  sexText,
  sizeText,
  clientText,
  durationText,
}: {
  dogId?: string
  uid: string
  editing: boolean
  labels: FieldLabels
  onLabels: (labels: FieldLabels) => void
  dogs: Dog[]
  temperament: Temperament
  onTemperament: (value: Temperament) => void
  tags: string[]
  onTags: (tags: string[]) => void
  fields: CustomField[]
  onFields: (fields: CustomField[]) => void
  contacts: DogContact[]
  onContacts: (contacts: DogContact[]) => void
  showNotes: boolean
  notes: string
  appointments: Appointment[]
  onSavePrice: (appointment: Appointment, price: number) => 'single' | 'many' | false
  onCopyPrice: (serviceId: string, price: number) => void
  gallery: GalleryPhoto[]
  onGallery: (gallery: GalleryPhoto[]) => void
  onGalleryError: () => void
  birthYearInput: string
  onBirthYear: (value: string) => void
  weightInput: string
  onWeight: (value: string) => void
  isSenior: boolean
  onSenior: (value: boolean) => void
  ageLine: string
  speciesText: string
  breedText: string
  sexText: string
  sizeText: string
  clientText: string
  durationText: string
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const [rename, setRename] = useState<{ key: keyof FieldLabels; value: string } | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('Proprietaria')
  const [tagOpen, setTagOpen] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [fieldOpen, setFieldOpen] = useState(false)
  const [fieldLabel, setFieldLabelDraft] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [historyLimit, setHistoryLimit] = useState(3)
  const [galleryLimit, setGalleryLimit] = useState(4)
  const [zoom, setZoom] = useState<string | null>(null)
  const [priceTarget, setPriceTarget] = useState<Appointment | null>(null)
  const [priceValue, setPriceValue] = useState('')
  const [priceError, setPriceError] = useState<string | null>(null)
  const [priceMode, setPriceMode] = useState<'edit' | 'single' | 'many'>('edit')
  const [appliedPrice, setAppliedPrice] = useState<number | null>(null)
  const completed = appointments
    .filter((item) => item.dogId === dogId && item.status === 'completato')
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))
  const history = completed.slice(0, historyLimit)
  const photos = gallery.slice(0, galleryLimit)
  const hiddenPhotos = gallery.length - photos.length
  const weightNumber = Number(weightInput.trim().replace(',', '.'))
  const weightLine = weightInput.trim() && Number.isFinite(weightNumber) ? formatKg(weightNumber) : '—'
  const cells: { key: keyof FieldLabels; text: ReactNode }[] = [
    { key: 'species', text: speciesText },
    { key: 'breed', text: breedText },
    { key: 'sex', text: sexText },
    {
      key: 'age',
      text: editing ? (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input aria-label="Anno di nascita" value={birthYearInput} onChange={(event) => onBirthYear(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: 88 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={isSenior} onChange={(event) => onSenior(event.target.checked)} />
            Anziano
          </label>
          <span>{ageLine}</span>
        </span>
      ) : ageLine,
    },
    {
      key: 'weight',
      text: editing ? (
        <input aria-label="Peso" value={weightInput} onChange={(event) => onWeight(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: 88 }} />
      ) : weightLine,
    },
    { key: 'size', text: sizeText },
    { key: 'clientType', text: clientText },
    { key: 'avgDuration', text: durationText },
  ]

  function commitRename() {
    const label = rename?.value.trim() ?? ''
    if (!rename || !label || !uid) return
    onLabels(setFieldLabel(uid, rename.key, label).fieldLabels)
    setRename(null)
  }

  function commitContact() {
    const name = contactName.trim()
    const phone = contactPhone.trim()
    if (!name || !phone) return
    onContacts([...contacts, { id: crypto.randomUUID(), name, role: contactRole, phone, isPrimary: false }])
    setContactOpen(false)
  }

  function commitTag(value: string) {
    const tag = value.trim()
    setTagOpen(false)
    setTagDraft('')
    if (!tag || tags.includes(tag)) return
    onTags([...tags, tag])
    if (!uid) return
    const current = getSettings(uid).tagSuggestions
    if (!current.includes(tag)) setTagSuggestions(uid, [...current, tag])
  }

  function commitField() {
    const label = fieldLabel.trim()
    if (!label) return
    onFields([...fields, { id: crypto.randomUUID(), label, value: fieldValue.trim() }])
    setFieldOpen(false)
  }

  async function onGalleryFile(file: File | undefined) {
    if (!file) return
    try {
      const photo = await prepareDogPhoto(file)
      onGallery([...gallery, { id: crypto.randomUUID(), photo, takenAt: new Date() }])
    } catch {
      onGalleryError()
    }
  }

  function openPrice(item: Appointment) {
    const shown = item.total != null ? item.total : sumPrice(item.services)
    setPriceTarget(item)
    setPriceValue(String(shown))
    setPriceError(null)
    setPriceMode('edit')
    setAppliedPrice(null)
  }

  function applyPrice() {
    if (!priceTarget) return
    const parsed = readPrice(priceValue)
    if (!parsed.ok) {
      setPriceError(parsed.message)
      return
    }
    const mode = onSavePrice(priceTarget, parsed.price)
    if (!mode) return
    setAppliedPrice(parsed.price)
    setPriceMode(mode)
    setPriceError(null)
  }

  const singleId = priceTarget?.services.length === 1 ? priceTarget.services[0]?.serviceId : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.keys(TEMPERAMENT_ICONS) as Temperament[]).map((kind) => {
          const selected = temperament === kind
          const icon = <TemperamentIcon kind={kind} size={SIZES.temperamentIcon.row} />
          if (!editing) {
            return (
              <span key={kind} style={{ borderRadius: 10, border: selected ? '2px solid var(--pri)' : '2px solid transparent', padding: 2 }}>{icon}</span>
            )
          }
          return (
            <button key={kind} type="button" aria-label={TEMPERAMENT_ICONS[kind].label} aria-pressed={selected} onClick={() => onTemperament(kind)} style={{ borderRadius: 10, border: selected ? '2px solid var(--pri)' : '2px solid transparent', background: 'transparent', padding: 2 }}>
              {icon}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {tags.map((tag) => (
          editing ? (
            <button key={tag} type="button" aria-label={`Togli ${tag}`} onClick={() => onTags(tags.filter((item) => item !== tag))} style={{ border: 0, background: 'transparent', padding: 0 }}>
              <Chip>{tag}</Chip>
            </button>
          ) : <Chip key={tag}>{tag}</Chip>
        ))}
        {editing ? <button type="button" onClick={() => { setTagDraft(''); setTagOpen(true) }} style={{ ...sheetAction, width: 'auto', color: 'var(--pri)' }}>+ Tag</button> : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cells.map((cell) => (
          <div key={cell.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LabelPencil label={labels[cell.key]} onRename={() => setRename({ key: cell.key, value: labels[cell.key] })} />
            <div style={{ fontSize: TYPE.base }}>{cell.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fields.map((field) => (
          editing ? (
            <div key={field.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input aria-label={`Etichetta ${field.label}`} value={field.label} onKeyDown={blockSubmit} onChange={(event) => onFields(fields.map((item) => item.id === field.id ? { ...item, label: event.target.value } : item))} style={{ ...quoteInput, width: 'auto', flex: 1 }} />
              <input aria-label={`Valore ${field.label}`} value={field.value} onKeyDown={blockSubmit} onChange={(event) => onFields(fields.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} style={{ ...quoteInput, width: 'auto', flex: 1 }} />
              <button type="button" aria-label={`Togli ${field.label}`} onClick={() => onFields(fields.filter((item) => item.id !== field.id))} style={{ ...sheetAction, width: 'auto' }}>Togli</button>
            </div>
          ) : (
            <div key={field.id}>{`${field.label}: ${field.value}`}</div>
          )
        ))}
        {editing ? <button type="button" onClick={() => { setFieldLabelDraft(''); setFieldValue(''); setFieldOpen(true) }} style={{ ...sheetAction, color: 'var(--pri)' }}>Campi</button> : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {contacts.map((contact) => (
          <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: SIZES.row.minH }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>{contact.name}</span>
              <span style={{ display: 'block' }}>{contact.phone}</span>
            </span>
            <Chip>{contact.role}</Chip>
            {contact.isPrimary ? <Chip tone="pri">Principale</Chip> : null}
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} aria-label={`Chiama ${contact.name || contact.phone}`} style={iconAction}>
                <Phone size={16} strokeWidth={2} aria-hidden />
              </a>
            ) : null}
            {editing && !contact.isPrimary ? (
              <button type="button" aria-label={`Togli ${contact.name}`} onClick={() => onContacts(contacts.filter((item) => item.id !== contact.id))} style={{ ...sheetAction, width: 'auto' }}>Togli</button>
            ) : null}
          </div>
        ))}
        {editing ? <button type="button" onClick={() => { setContactName(''); setContactPhone(''); setContactRole('Proprietaria'); setContactOpen(true) }} style={{ ...sheetAction, color: 'var(--pri)' }}>+ Contatto</button> : null}
      </div>
      {showNotes ? (
        <Card style={{ padding: 10 }}>
          <div>{notes.trim() ? notes : 'Nessuna nota'}</div>
        </Card>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SectionTitle>Storico</SectionTitle>
        {completed.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>Nessun trattamento</p> : history.map((item) => {
          const price = item.total != null ? item.total : sumPrice(item.services)
          const when = format(item.start, 'd MMM', IT_DATE)
          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 52, color: 'var(--tx3)', fontSize: TYPE.meta }}>{when}</span>
                <span style={{ flex: 1 }}>{item.services.map((line) => line.name).join(', ')}</span>
                <span>{formatEuro(price)}</span>
                {editing ? (
                  <button type="button" aria-label={`Correggi prezzo ${when}`} onClick={() => openPrice(item)} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0 }}>
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : null}
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
        {completed.length > 3 && historyLimit < completed.length ? (
          <button type="button" onClick={() => setHistoryLimit(completed.length)} style={{ ...sheetAction, color: 'var(--pri)' }}>{`Tutti ${completed.length}`}</button>
        ) : null}
      </div>
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
            <button type="button" onClick={() => setGalleryLimit(gallery.length)} style={{ width: 50, height: 50, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surf)' }}>{`+${hiddenPhotos}`}</button>
          ) : null}
          <button type="button" onClick={() => galleryRef.current?.click()} style={{ ...sheetAction, width: 'auto', color: 'var(--pri)' }}>Aggiungi</button>
          <input ref={galleryRef} aria-label="Aggiungi alla galleria" type="file" accept="image/*" style={{ display: 'none' }} onChange={(event) => { void onGalleryFile(event.target.files?.[0]); event.target.value = '' }} />
        </div>
      </div>
      <Sheet open={rename !== null} title="Etichetta" onClose={() => setRename(null)}>
        <input aria-label="Nuova etichetta" value={rename?.value ?? ''} onChange={(event) => setRename((current) => current ? { ...current, value: event.target.value } : current)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <button type="button" style={sheetAction} onClick={commitRename}>Rinomina</button>
      </Sheet>
      <Sheet open={contactOpen} title="Contatto" onClose={() => setContactOpen(false)}>
        <input aria-label="Nome contatto" value={contactName} onChange={(event) => setContactName(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <input aria-label="Telefono contatto" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {roleChoices(dogs).map((role) => (
            <button key={role} type="button" aria-pressed={contactRole === role} onClick={() => setContactRole(role)} style={sheetAction}>{role}</button>
          ))}
        </div>
        <button type="button" style={sheetAction} onClick={commitContact}>Aggiungi contatto</button>
      </Sheet>
      <Sheet open={tagOpen} title="Tag" onClose={() => setTagOpen(false)}>
        <input aria-label="Tag" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tagChoices(dogs, uid ? getSettings(uid).tagSuggestions : []).map((tag) => (
            <button key={tag} type="button" onClick={() => commitTag(tag)} style={sheetAction}>{tag}</button>
          ))}
        </div>
        <button type="button" style={sheetAction} onClick={() => commitTag(tagDraft)}>Aggiungi tag</button>
      </Sheet>
      <Sheet open={fieldOpen} title="Campo" onClose={() => setFieldOpen(false)}>
        <input aria-label="Etichetta campo" value={fieldLabel} onChange={(event) => setFieldLabelDraft(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <input aria-label="Valore campo" value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
        <button type="button" style={sheetAction} onClick={commitField}>Aggiungi campo</button>
      </Sheet>
      <Sheet open={zoom !== null} title="Foto" onClose={() => setZoom(null)}>
        {zoom ? <img alt="" src={zoom} style={{ width: '100%', borderRadius: 12 }} /> : null}
      </Sheet>
      <Sheet open={priceTarget !== null} title="Prezzo" onClose={() => setPriceTarget(null)}>
        {priceMode === 'edit' ? (
          <>
            <input aria-label="Prezzo appuntamento" value={priceValue} onChange={(event) => setPriceValue(event.target.value)} onKeyDown={blockSubmit} style={{ ...quoteInput, width: '100%' }} />
            {priceError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{priceError}</p> : null}
            <button type="button" style={sheetAction} onClick={applyPrice}>Applica</button>
          </>
        ) : (
          <>
            <button type="button" style={sheetAction} onClick={() => setPriceTarget(null)}>Solo questo appuntamento</button>
            {priceMode === 'single' && singleId && appliedPrice != null ? (
              <button type="button" style={sheetAction} onClick={() => { onCopyPrice(singleId, appliedPrice); setPriceTarget(null) }}>Aggiorna anche il prezzo in scheda</button>
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
  const dog = id ? api.dogs.find((item) => item.id === id) : undefined
  const [editing, setEditing] = useState(isNew)
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<'non_in_cura' | 'deceduto' | null>(null)
  const [photoSheet, setPhotoSheet] = useState(false)
  const [photoZoom, setPhotoZoom] = useState(false)
  const [size, setSize] = useState<DogSize>(dog?.size ?? 'piccola')
  const [hidden, setHidden] = useState<string[]>(() => (dog ? [...dog.hiddenServiceIds] : []))
  const [edits, setEdits] = useState<QuoteEdits>({})
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [labels, setLabels] = useState<FieldLabels>(() => (uid ? getSettings(uid).fieldLabels : FALLBACK_LABELS))
  const [contacts, setContacts] = useState<DogContact[]>(() => dog?.contacts.map(copyContact) ?? [])
  const [tags, setTags] = useState<string[]>(() => (dog ? [...dog.tags] : []))
  const [fields, setFields] = useState<CustomField[]>(() => dog?.customFields.map((field) => ({ ...field })) ?? [])
  const [gallery, setGallery] = useState<GalleryPhoto[]>(() => dog?.gallery.map((item) => ({ ...item })) ?? [])
  const [birthYearInput, setBirthYearInput] = useState(() => (dog?.birthYear != null ? String(dog.birthYear) : ''))
  const [yearTouched, setYearTouched] = useState(false)
  const [categoryOverride, setCategoryOverride] = useState<AgeCategory | null>(null)
  const [isSenior, setIsSenior] = useState(() => dog?.isSenior ?? dog?.ageCategory === 'anziano')
  const [seniorTouched, setSeniorTouched] = useState(false)
  const [weightInput, setWeightInput] = useState(() => weightText(dog?.weightKg))
  const [temperamentOverride, setTemperamentOverride] = useState<Temperament | null>(null)
  const [archiveChoice, setArchiveChoice] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dogRef = useRef(dog)
  dogRef.current = dog
  const rememberSize = useCallback((next: DogSize) => {
    setSize(next)
  }, [])
  const thresholds = uid ? getSettings(uid).ageThresholds : { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 }

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  useEffect(() => {
    const source = dogRef.current
    setSize(source?.size ?? 'piccola')
    setHidden(source ? [...source.hiddenServiceIds] : [])
    setEdits({})
    setQuoteError(null)
    setContacts(source?.contacts.map(copyContact) ?? [])
    setTags(source ? [...source.tags] : [])
    setFields(source?.customFields.map((field) => ({ ...field })) ?? [])
    setGallery(source?.gallery.map((item) => ({ ...item })) ?? [])
    setBirthYearInput(source?.birthYear != null ? String(source.birthYear) : '')
    setYearTouched(false)
    setCategoryOverride(null)
    setIsSenior(source?.isSenior ?? source?.ageCategory === 'anziano')
    setSeniorTouched(false)
    setWeightInput(weightText(source?.weightKg))
    setTemperamentOverride(null)
    setLabels(uid ? getSettings(uid).fieldLabels : FALLBACK_LABELS)
  }, [id, uid])

  useEffect(() => {
    if (!id || !uid) return
    const found = listDogs(uid).find((item) => item.id === id)
    if (!found || found.status !== 'attivo') return
    writeJson(storageKeys.settings(uid), rememberDog(getSettings(uid), id))
  }, [id, uid])

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
    const parsed = collectQuotes(services, draft.size, dog, edits)
    if (!parsed.ok) {
      setQuoteError(parsed.message)
      return
    }
    setQuoteError(null)
    const nextDraft = temperamentOverride ? { ...draft, temperament: temperamentOverride } : draft
    const write = writeFromScreen(nextDraft, dog, photo, parsed.prices, hidden, {
      contacts,
      tags,
      customFields: fields,
      gallery,
      birthYearInput,
      yearTouched,
      categoryOverride,
      isSenior,
      seniorTouched,
      weightInput,
    })
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    setContacts((write.contacts ?? []).map(copyContact))
    setTags([...(write.tags ?? [])])
    setFields((write.customFields ?? []).map((field) => ({ ...field })))
    setGallery((write.gallery ?? []).map((item) => ({ ...item })))
    setYearTouched(false)
    setCategoryOverride(null)
    setSeniorTouched(false)
    setTemperamentOverride(null)
    setEdits({})
    if (!dog && api.lastCreatedId.current) {
      const createdId = api.lastCreatedId.current
      if (arrival.returnTo) {
        const separator = arrival.returnTo.includes('?') ? '&' : '?'
        navigate(`${arrival.returnTo}${separator}cane=${createdId}`, { replace: true })
        return
      }
      navigate(`/animali/${createdId}`, { replace: true })
      return
    }
    setEditing(false)
    setPhoto(undefined)
    setPhotoError(null)
  }

  function onBirthYear(value: string) {
    setBirthYearInput(value)
    if (!/^\d{4}$/.test(value)) {
      setYearTouched(false)
      setCategoryOverride(null)
      if (yearTouched) {
        setIsSenior(dog?.isSenior ?? dog?.ageCategory === 'anziano')
        setSeniorTouched(false)
      }
      return
    }
    const year = Number(value)
    const changed = year !== dog?.birthYear
    setYearTouched(changed)
    if (!changed) {
      setCategoryOverride(null)
      setIsSenior(dog?.isSenior ?? dog?.ageCategory === 'anziano')
      setSeniorTouched(false)
      return
    }
    const category = ageCategoryFor(year, new Date(), thresholds)
    setCategoryOverride(category)
    setIsSenior(category === 'anziano')
    setSeniorTouched(true)
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
      return
    }
    setEdits((currentEdits) => ({ ...currentEdits, [serviceId]: { price: String(price), duration: String(durationMin) } }))
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
    if (!api.archive(dogId, status)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    const future = futureScheduled(visits.appointments, dogId, new Date())
    for (const item of future) {
      if (!visits.remove(item.id)) {
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

  const line = dog ? statusLine(dog.status) : null
  const shownPhoto = photo ?? dog?.photo
  const phone = dog ? primaryPhone(dog) : ''

  function editQuote(serviceId: string, next: { price: string; duration: string }) {
    setEdits((current) => ({ ...current, [serviceId]: next }))
  }

  function hideService(serviceId: string) {
    setHidden((current) => (current.includes(serviceId) ? current : [...current, serviceId]))
  }

  function showService(serviceId: string) {
    setHidden((current) => current.filter((item) => item !== serviceId))
  }

  const prices = (
    <ServicePrices
      services={services}
      dog={dog}
      size={editing ? size : (dog?.size ?? 'piccola')}
      hidden={editing ? hidden : (dog?.hiddenServiceIds ?? [])}
      edits={editing ? edits : {}}
      editing={editing}
      onEdit={editQuote}
      onHide={hideService}
      onShow={showService}
    />
  )

  const shownCategory = categoryOverride ?? dog?.ageCategory ?? 'adulto'
  const shownYear = /^\d{4}$/.test(birthYearInput) ? Number(birthYearInput) : dog?.birthYear
  const ageLine = shownYear != null ? `${shownYear} · ${AGE_LABEL[shownCategory]}` : AGE_LABEL[shownCategory]
  const lower = (
    <DogLower
      key={id ?? 'nuovo'}
      dogId={dog?.id}
      uid={uid}
      editing={editing}
      labels={labels}
      onLabels={setLabels}
      dogs={api.dogs}
      temperament={temperamentOverride ?? dog?.temperament ?? 'bravo'}
      onTemperament={setTemperamentOverride}
      tags={tags}
      onTags={setTags}
      fields={fields}
      onFields={setFields}
      contacts={contacts}
      onContacts={setContacts}
      showNotes={Boolean(dog) && !editing}
      notes={dog?.notes ?? ''}
      appointments={visits.appointments}
      onSavePrice={saveHistoryPrice}
      onCopyPrice={copyHistoryPrice}
      gallery={gallery}
      onGallery={(next) => { setGallery(next); setPhotoError(null); setEditing(true) }}
      onGalleryError={() => setPhotoError('Foto non utilizzabile')}
      birthYearInput={birthYearInput}
      onBirthYear={onBirthYear}
      weightInput={weightInput}
      onWeight={setWeightInput}
      isSenior={isSenior}
      onSenior={(value) => { setIsSenior(value); setSeniorTouched(true) }}
      ageLine={ageLine}
      speciesText={dog ? SPECIES_LABEL[dog.species] : 'Cane'}
      breedText={dog?.breed.trim() ? dog.breed : '—'}
      sexText={dog?.sex ? SEX_LABEL[dog.sex] : '—'}
      sizeText={SIZE_LABEL[editing ? size : (dog?.size ?? size)]}
      clientText={dog ? CLIENT_LABEL[dog.clientType] : 'Occasionale'}
      durationText={dog ? averageDuration(visits.appointments, dog.id) : '—'}
    />
  )

  return (
    <PhoneShell>
      <Header
        title={dog ? 'Scheda' : 'Nuovo cane'}
        backTo="/animali"
        action={(
          <div style={{ display: 'flex', gap: 6 }}>
            <CallButton phone={phone} />
            {dog ? (
              <IconButton label="Menu" onClick={() => setMenuOpen(true)}>
                <MoreVertical size={16} strokeWidth={2} aria-hidden />
              </IconButton>
            ) : null}
          </div>
        )}
      />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <PhotoBlock read src={dog.photo} onFile={(file) => void onPhoto(file)} onEnlarge={dog.photo ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            <div style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>{dog.name}</div>
            <div style={{ color: 'var(--tx3)', fontSize: TYPE.rowSub }}>{identityLine(dog, new Date())}</div>
            {primaryName(dog) ? <div style={{ fontSize: TYPE.base }}>{primaryName(dog)}</div> : null}
            {phone ? <a href={`tel:${phone}`} style={{ fontSize: TYPE.base }}>{phone}</a> : null}
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
            {prices}
            {lower}
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setPhotoError(null); setEditing(true) }}>Modifica</Button>
              <Button style={{ flex: 1 }} disabled>Salva</Button>
            </div>
          </>
        ) : (
          <>
            <PhotoBlock src={shownPhoto} onFile={(file) => void onPhoto(file)} onEnlarge={shownPhoto ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <DogFields
              initial={dog ?? namedArrival(arrival.name)}
              onSubmit={save}
              onSize={rememberSize}
              extras={(
                <>
                  {prices}
                  {quoteError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{quoteError}</p> : null}
                  {lower}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" style={{ flex: 1 }} onClick={() => setEditing(true)}>Modifica</Button>
                    <Button type="submit" style={{ flex: 1 }}>Salva</Button>
                  </div>
                </>
              )}
            />
          </>
        )}
        {dog?.status === 'attivo' ? (
          <button type="button" style={sheetAction} onClick={() => setArchiveChoice(true)}>Segna come non più in cura / deceduto → archivio</button>
        ) : dog ? (
          <Button variant="ghost" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button>
        ) : null}
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
      <Sheet open={archiveChoice} title="Archivio" onClose={() => setArchiveChoice(false)}>
        <button type="button" style={sheetAction} onClick={() => { setArchiveChoice(false); askArchive('non_in_cura') }}>Non più in cura</button>
        <button type="button" style={sheetAction} onClick={() => { setArchiveChoice(false); askArchive('deceduto') }}>Deceduto</button>
      </Sheet>
      <Sheet open={pendingArchive !== null} title="Archivia" onClose={() => setPendingArchive(null)}>
        <button type="button" style={sheetAction} onClick={archiveAndCancel}>Archivia e cancella i futuri</button>
        <button type="button" style={sheetAction} onClick={archiveOnly}>Archivia soltanto</button>
      </Sheet>
      <Sheet open={confirmDelete} title="Elimina definitivamente" onClose={() => setConfirmDelete(false)}>
        <button type="button" style={sheetAction} onClick={confirmRemove}>Elimina definitivamente</button>
        <button type="button" style={sheetAction} onClick={() => setConfirmDelete(false)}>Annulla</button>
      </Sheet>
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

const portraitButton = { border: 0, padding: 0, background: 'transparent', width: SIZES.avatar.xl }

function PhotoBlock({ src, onFile, onEnlarge, read = false }: { src?: string; onFile: (file: File | undefined) => void; onEnlarge?: () => void; read?: boolean }) {
  const pickRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {src && onEnlarge ? (
        <button type="button" aria-label="Foto del cane" onClick={onEnlarge} style={portraitButton}>
          <DogAvatar alt="" src={src} size="xl" />
        </button>
      ) : read ? (
        <button type="button" aria-label="Foto del cane" onClick={() => pickRef.current?.click()} style={portraitButton}>
          <DogAvatar alt="" src={src} size="xl" />
        </button>
      ) : (
        <DogAvatar alt="" src={src} size="xl" />
      )}
      {read ? (
        src ? null : (
          <input
            ref={pickRef}
            aria-hidden="true"
            tabIndex={-1}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        )
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
          Foto
          <input aria-label="Foto" type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
      )}
    </div>
  )
}
