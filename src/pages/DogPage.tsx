import { Capacitor } from '@capacitor/core'
import { format } from 'date-fns'
import { Calendar, Camera, Flower2, HeartOff, MoreVertical, Pencil, Phone, Trash2, X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { avatarForSpecies, TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Dialog } from '../components/layout/Dialog'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ChipRow } from '../components/ui/ChipRow'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { rememberDog } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useDogs } from '../hooks/useDogs'
import { useFileSrc } from '../hooks/useFileSrc'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { sumPrice } from '../lib/appointments'
import { priceChange } from '../lib/uiStyle'
import { dogFormSeed, dogScreenSeed, shouldReseedDog } from '../lib/dogFormSeed'
import { AGE_LABEL, ARCHIVE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL } from '../lib/dogList'
import { dogPortrait, prepareDogPhoto } from '../lib/dogPhoto'
import { completeYear, seniorOf, type DogScreen } from '../lib/dogScreen'
import { ageText, averageDuration, formatCompactDuration, splitCritical } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { whatsAppAppLink, whatsAppLink } from '../lib/phone'
import { guardCaptureClick } from '../lib/photoCapture'
import { PHOTO_TOO_LARGE, PhotoTooLargeError } from '../lib/photoCodec'
import { MAX_DOG_PHOTOS, TOO_MANY_PHOTOS, dogPhotoCount } from '../lib/photoLimit'
import { dogServiceQuoteSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason, CustomField, Dog, DogContact, DogDraft, DogServicePrice, DogSize, DogWrite, GalleryPhoto, Service, Species } from '../types/models'
import { DogFields, HiddenLabel, weightOf } from './DogFields'
import { NextAppointment } from './NextAppointment'

const PORTRAIT = 64
const READ_PORTRAIT = 112

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

function SchedaChoice({ label, detail, ink, wash, icon, onClick }: { label: string; detail: string; ink: string; wash: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        margin: 0,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        boxShadow: 'var(--sh-1)',
        color: 'var(--tx)',
        font: 'inherit',
        textAlign: 'left',
        padding: '12px',
        borderRadius: 14,
      }}
    >
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: 13, flex: 'none', display: 'grid', placeItems: 'center', color: ink, background: wash }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>{label}</span>
        <span style={{ color: 'var(--tx2)', fontSize: 12, lineHeight: 1.35 }}>{detail}</span>
      </span>
    </button>
  )
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

const contactAction = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  textDecoration: 'none',
  flex: 'none',
} as const

function WhatsAppMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.25-1.93 1.33-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.63-.61-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.29.57-.36.76-.36h.55c.17 0 .4-.07.63.48.24.57.81 1.97.88 2.11.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.41.5-.14.14-.28.29-.12.56.16.27.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.63-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
    </svg>
  )
}

function openNativeWhatsApp(url: string): boolean {
  try {
    window.location.assign(url)
    return true
  } catch {
    return false
  }
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

function deceasedFutureCopy(count: number): string {
  return count === 1
    ? '1 appuntamento futuro verrà disdetto.'
    : `${count} appuntamenti futuri verranno disdetti.`
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

function profilePrices(dog: Dog, services: Service[]): { serviceId: string; name: string; iconKey: Service['iconKey']; price: string; duration: string }[] {
  const byId = new Map(services.map((service) => [service.id, service]))
  const saved = new Map(dog.servicePrices.map((item) => [item.serviceId, item]))
  return dog.hiddenServiceIds
    .map((serviceId, index) => ({ serviceId, index }))
    .sort((a, b) => {
      const left = byId.get(a.serviceId)?.order ?? Number.POSITIVE_INFINITY
      const right = byId.get(b.serviceId)?.order ?? Number.POSITIVE_INFINITY
      return left - right || a.index - b.index
    })
    .map(({ serviceId }) => {
      const service = byId.get(serviceId)
      const item = saved.get(serviceId)
      return {
        serviceId,
        name: service?.name ?? serviceId,
        iconKey: service?.iconKey,
        price: item?.price === undefined ? '—' : formatEuro(item.price),
        duration: item?.durationMin === undefined ? '—' : `${item.durationMin} min`,
      }
    })
}

function CustomPrices({ dog, services }: { dog: Dog; services: Service[] }) {
  const rows = profilePrices(dog, services)
  if (rows.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>Prezzi personalizzati</SectionTitle>
      <Card>
        <ul aria-label="Prezzi personalizzati" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row, index) => (
            <li
              key={row.serviceId}
              aria-label={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                minHeight: SIZES.row.minH,
                padding: '6px 10px',
                borderTop: index === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <IconTile tone={row.iconKey ?? 'prim'} size="sm">
                  <ServiceIcon iconKey={row.iconKey} size={SIZES.chip.serviceIconInChip} />
                </IconTile>
                <span style={{ fontWeight: 700, fontSize: TYPE.rowTitle, minWidth: 0, overflowWrap: 'anywhere' }}>{row.name}</span>
              </span>
              <span style={{ flex: 'none', textAlign: 'right' }}>
                <span style={{ display: 'block', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.price}</span>
                <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.duration}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function listPrice(service: Service, size: DogSize): { price: string; duration: string } {
  return { price: String(service.price[size]).replace('.', ','), duration: String(service.durationMin[size]) }
}

function shownQuote(service: Service, dog: Dog | undefined, edits: QuoteEdits): { price: string; duration: string } {
  const edited = edits[service.id]
  if (edited) return edited
  const override = dog?.servicePrices.find((item) => item.serviceId === service.id)
  if (override) {
    return {
      price: override.price === undefined ? '' : String(override.price).replace('.', ','),
      duration: override.durationMin === undefined ? '' : String(override.durationMin),
    }
  }
  return { price: '', duration: '' }
}

function collectPrices(services: Service[], dog: Dog | undefined, edits: QuoteEdits): { ok: true; prices: DogServicePrice[] } | { ok: false; message: string } {
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
    const next: DogServicePrice = { serviceId }
    if (price !== '') {
      const parsed = dogServiceQuoteSchema.shape.price.safeParse(price)
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? 'Prezzo ≥ 0, al massimo due decimali' }
      }
      next.price = parsed.data
    }
    if (duration !== '') {
      const parsed = dogServiceQuoteSchema.shape.durationMin.safeParse(duration)
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? 'Minuti interi, minimo 1' }
      }
      next.durationMin = parsed.data
    }
    kept.set(serviceId, next)
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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', flex: 'none' }}>
      <Chip tone={TEMPERAMENT_ICONS[dog.temperament].tone} roomy>
        <TemperamentIcon kind={dog.temperament} size={16} />
        {TEMPERAMENT_ICONS[dog.temperament].label}
      </Chip>
      {seniorOf(dog.ageCategory) ? (
        <Chip tone="sen" roomy>
          <FlagIcon kind="anziano" size={16} />
          Anziano
        </Chip>
      ) : null}
      {dog.clientType === 'mensile' ? (
        <Chip tone="tea" roomy>
          <FlagIcon kind="mensile" size={16} />
          Mensile
        </Chip>
      ) : null}
    </div>
  )
}

function Portrait({ src, species, size = PORTRAIT, variant = 'full' }: { src?: string; species?: Species; size?: number; variant?: 'thumb' | 'full' }) {
  const shown = useFileSrc(src, variant)
  return <img alt="" src={shown || avatarForSpecies(species)} width={size} height={size} style={{ width: size, height: size, borderRadius: 18, objectFit: 'cover', background: 'var(--surf)', display: 'block' }} />
}

function FormAvatar({ src, onFile }: { src?: string; onFile: (file: File | undefined) => void }) {
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button type="button" aria-label="Foto del cane" onClick={() => pickRef.current?.click()} style={{ position: 'relative', border: 0, padding: 0, background: 'transparent', width: PORTRAIT, height: PORTRAIT }}>
        <Portrait src={src} variant="thumb" />
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

function ProfileFacts({ items }: { items: { label: string; value: string; flex: string }[] }) {
  return (
    <div
      role="group"
      aria-label="Dati"
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        background: 'var(--card)',
        border: `${SIZES.card.border}px solid var(--line)`,
        borderRadius: SIZES.card.radius,
        boxShadow: 'var(--sh-2)',
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{
            flex: item.flex,
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1,
            padding: '5px 3px',
            overflow: 'hidden',
            borderLeft: index === 0 ? 'none' : '1px solid var(--line)',
          }}
        >
          <small style={{ fontSize: 7, lineHeight: 1.1, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--tx3)', fontWeight: 600 }}>{item.label}</small>
          <b title={item.value} style={{ fontSize: 9, fontWeight: 700, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</b>
        </div>
      ))}
    </div>
  )
}

function clientFact(dog: Dog): string {
  if (dog.clientType === 'mensile' && dog.recurrenceWeeks) return `${CLIENT_LABEL[dog.clientType]} · ogni ${dog.recurrenceWeeks}`
  if (dog.clientType === 'mensile') return CLIENT_LABEL.mensile
  return 'Occas.'
}

function ReadPortrait({ src, species, size = PORTRAIT, onFile, onEnlarge }: { src?: string; species?: Species; size?: number; onFile: (file: File | undefined) => void; onEnlarge?: () => void }) {
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <>
      <button type="button" aria-label="Foto del cane" onClick={src && onEnlarge ? onEnlarge : () => pickRef.current?.click()} style={{ border: 0, padding: 0, background: 'transparent', width: size, height: size, flex: 'none' }}>
        <Portrait src={src} species={species} size={size} />
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
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, color: 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 600 }}>
        <span />
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
          <div key={service.id} role="group" aria-label={service.name} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, alignItems: 'center', minHeight: SIZES.row.minH }}>
            <Toggle checked={hidden.includes(service.id)} onChange={() => onToggleHidden(service.id)} label="mostra nel profilo" />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              <span style={{ fontWeight: 600, fontSize: TYPE.base, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</span>
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
    <Dialog open={open} title="Contatto" onClose={onClose}>
      <Input label="Nome contatto" autoCapitalize="words" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label="Telefono contatto" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <div role="group" aria-label="Ruolo" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {roleChoices(dogs).map((choice) => (
          <button key={choice} type="button" aria-pressed={role === choice} onClick={() => setRole(role === choice ? '' : choice)} style={{ ...sheetAction, width: 'auto', color: role === choice ? 'var(--pri)' : 'inherit' }}>{choice}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi contatto</button>
    </Dialog>
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
    <Dialog open={open} title="Tag" onClose={onClose}>
      <Input label="Tag" autoCapitalize="words" autoComplete="off" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {tagChoices(dogs, suggestions).map((tag) => (
          <button key={tag} type="button" onClick={() => commit(tag)} style={{ ...sheetAction, width: 'auto' }}>{tag}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={() => commit(draft)}>Aggiungi tag</button>
    </Dialog>
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
    <Dialog open={open} title="Campo" onClose={onClose}>
      <Input label="Etichetta campo" autoCapitalize="sentences" autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input label="Valore campo" autoCapitalize="sentences" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" style={sheetAction} onClick={commit}>Aggiungi campo</button>
    </Dialog>
  )
}

function CenteredPhoto({ src, onClose }: { src: string | null; onClose: () => void }) {
  const shown = useFileSrc(src ?? undefined, 'full')
  return (
    <Dialog open={src !== null} title="Foto" onClose={onClose} fill>
      {shown ? <img alt="Foto ingrandita" src={shown} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /> : null}
    </Dialog>
  )
}

function ProfilePreview({ src }: { src: string }) {
  const shown = useFileSrc(src, 'full')
  return shown ? (
    <img
      alt="Anteprima foto del profilo"
      src={shown}
      width={112}
      height={112}
      style={{ width: 112, height: 112, borderRadius: 18, objectFit: 'cover', alignSelf: 'center', background: 'var(--surf)', display: 'block' }}
    />
  ) : null
}

function Thumb({ photo, alt, size }: { photo: string; alt: string; size: number }) {
  const shown = useFileSrc(photo, 'thumb')
  return shown ? <img alt={alt} src={shown} width={size} height={size} style={thumbStyle} /> : <span {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })} style={{ ...thumbStyle, width: size, height: size, display: 'inline-block', background: 'var(--surf)' }} />
}

function Gallery({ gallery, profilePhoto, editing, onGallery, onError }: { gallery: GalleryPhoto[]; profilePhoto?: string; editing: boolean; onGallery: (gallery: GalleryPhoto[], removedId?: string) => void; onError: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [limit, setLimit] = useState(4)
  const [zoom, setZoom] = useState<string | null>(null)
  const photos = gallery.slice(0, limit)
  const hiddenPhotos = gallery.length - photos.length

  async function onFile(file: File | undefined) {
    if (!file) return
    if (dogPhotoCount({ photo: profilePhoto, gallery }) >= MAX_DOG_PHOTOS) {
      toast.show(TOO_MANY_PHOTOS, 'plain')
      return
    }
    try {
      const photo = await prepareDogPhoto(file)
      onGallery([...gallery, { id: crypto.randomUUID(), photo, takenAt: new Date() }])
    } catch (error) {
      if (error instanceof PhotoTooLargeError) toast.show(PHOTO_TOO_LARGE, 'plain')
      else onError()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>Galleria</SectionTitle>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {photos.map((item, index) => (
          <span key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button type="button" aria-label={`Ingrandisci foto ${index + 1}`} onClick={() => setZoom(item.photo)} style={{ border: 0, padding: 0, background: 'transparent' }}>
              <Thumb alt="" photo={item.photo} size={50} />
            </button>
            {editing ? <button type="button" aria-label={`Togli foto ${index + 1}`} onClick={() => onGallery(gallery.filter((photo) => photo.id !== item.id), item.id)} style={{ ...sheetAction, width: 'auto' }}>Togli</button> : null}
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
      <CenteredPhoto src={zoom} onClose={() => setZoom(null)} />
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

function historyDetail(item: Appointment): string {
  const parts = [formatEuro(visitPrice(item))]
  if (item.tools?.length) parts.push(item.tools.join(', '))
  if (item.actualDurationMin != null) parts.push(formatCompactDuration(item.actualDurationMin))
  if (item.products?.length) parts.push(item.products.join(', '))
  if (item.cutStyle) parts.push(item.cutStyle)
  return parts.join(' · ')
}

function History({ dogId, appointments, onSavePrice, onCopyPrice }: {
  dogId: string
  appointments: Appointment[]
  onSavePrice: (appointment: Appointment, price: number) => 'single' | 'many' | false
  onCopyPrice: (serviceId: string, price: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Appointment | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'edit' | 'single' | 'many'>('edit')
  const [applied, setApplied] = useState<number | null>(null)
  const completed = appointments
    .filter((item) => item.dogId === dogId && item.status === 'completato')
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))
  const singleId = target?.services.length === 1 ? target.services[0]?.serviceId : undefined
  const countLabel = completed.length === 1 ? '1 visita' : `${completed.length} visite`

  function openPrice(item: Appointment) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {completed.length === 0 ? (
        <div>
          <div style={{ fontWeight: 700 }}>Storico</div>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Nessun trattamento</div>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Storico"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, width: '100%', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}
        >
          <span style={{ fontWeight: 700 }}>Storico</span>
          <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{countLabel}</span>
        </button>
      )}
      {open ? completed.map((item, index) => {
        const before = completed[index + 1]
        const when = format(item.start, 'd MMM yyyy', IT_DATE)
        const change = priceChange(sumPrice(item.services), before ? sumPrice(before.services) : null)
        const changeLabel = change?.startsWith('▲') ? 'Prezzo più alto del precedente' : change?.startsWith('▼') ? 'Prezzo più basso del precedente' : null
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span aria-hidden style={{ width: 8, height: 8, marginTop: 4, borderRadius: 999, background: 'var(--pri)', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--pri)', fontWeight: 700, fontSize: TYPE.meta }}>{when}</div>
                  <div style={{ fontWeight: 700 }}>{item.services.map((line) => line.name).join(', ')}</div>
                  <div style={{ color: 'var(--tx2)' }}>{historyDetail(item)}</div>
                </div>
                {change && changeLabel ? <span role="img" aria-label={changeLabel}>{change}</span> : null}
                <button type="button" aria-label={`Correggi prezzo ${when}`} onClick={() => openPrice(item)} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0 }}>
                  <Pencil size={14} aria-hidden />
                </button>
              </div>
              {item.photos?.some((photo) => photo.kind === 'prima' || photo.kind === 'dopo') ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  {item.photos.filter((photo) => photo.kind === 'prima' || photo.kind === 'dopo').map((photo) => (
                    <Thumb key={photo.id} alt={photo.kind === 'prima' ? 'Prima' : 'Dopo'} photo={photo.photo} size={50} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )
      }) : null}
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
  const openSheet = useOpenSheet()
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
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [contactOpen, setContactOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [fieldOpen, setFieldOpen] = useState(false)
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
    setRemovedPhotoIds([])
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

  function persistMedia(next: { photo?: string; gallery?: GalleryPhoto[] }): boolean {
    if (!dog) return false
    const write = dogToWrite(dog, dog.servicePrices)
    const nextPhoto = next.photo ?? photo ?? dog.photo
    if (nextPhoto) write.photo = nextPhoto
    write.gallery = (next.gallery ?? gallery).map((item) => ({ ...item }))
    if (removedPhotoIds.length > 0) write.removedPhotoIds = [...removedPhotoIds]
    if (!api.saveExisting(dog.id, write)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return false
    }
    return true
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    const profile = photo ?? dog?.photo
    if (!profile && dogPhotoCount({ gallery }) >= MAX_DOG_PHOTOS) {
      toast.show(TOO_MANY_PHOTOS, 'plain')
      return
    }
    try {
      const prepared = await prepareDogPhoto(file)
      setPhotoError(null)
      if (dog && !editing) {
        persistMedia({ photo: prepared })
        return
      }
      setPhoto(prepared)
      setEditing(true)
    } catch (error) {
      if (error instanceof PhotoTooLargeError) toast.show(PHOTO_TOO_LARGE, 'plain')
      else setPhotoError('Foto non utilizzabile')
    }
  }

  function save(draft: DogDraft) {
    let prices = dog?.servicePrices ?? []
    if (Object.keys(edits).length > 0) {
      const parsed = collectPrices(services, dog, edits)
      if (!parsed.ok) {
        setQuoteError(parsed.message)
        return
      }
      prices = parsed.prices
    }
    setQuoteError(null)
    const write = writeFromScreen(screen, draft, dog, photo, prices, hidden, { contacts, tags, customFields: fields, gallery })
    if (dog && removedPhotoIds.length > 0) write.removedPhotoIds = [...removedPhotoIds]
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
    if (!visits.dropDog(dog.id) || !api.remove(dog.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    navigate('/animali')
  }

  if (id && !dog) {
    return (
      <PhoneShell backTo="/animali">
        <Header title="Scheda" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
    )
  }

  const futureCount = dog ? futureScheduled(visits.appointments, dog.id, new Date()).length : 0
  const line = dog ? statusLine(dog.status) : null
  const shownPhoto = photo ?? dogPortrait(dog)
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
      <ChipRow>
        {tags.map((tag) => (
          <Chip key={tag}>
            {tag}
            <button type="button" aria-label={`Togli ${tag}`} onClick={() => setTags(tags.filter((item) => item !== tag))} style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0, display: 'inline-flex' }}>
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </Chip>
        ))}
        <button type="button" onClick={() => setTagOpen(true)} style={{ border: 0, background: 'transparent', padding: 0 }}>
          <Chip dashed>+ Tag</Chip>
        </button>
      </ChipRow>
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
        <Gallery
          gallery={gallery}
          profilePhoto={photo ?? dog.photo}
          editing
          onGallery={(next, removedId) => {
            setGallery(next)
            if (removedId) setRemovedPhotoIds((ids) => (ids.includes(removedId) ? ids : [...ids, removedId]))
            setPhotoError(null)
          }}
          onError={() => setPhotoError('Foto non utilizzabile')}
        />
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
    <PhoneShell backTo="/animali">
      <Header title={dog ? 'Scheda' : 'Nuovo cane'} action={headerAction} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <ReadPortrait size={READ_PORTRAIT} src={dogPortrait(dog)} species={dog.species} onFile={(file) => void onPhoto(file)} onEnlarge={dogPortrait(dog) ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>{dog.name}</div>
                  <div style={{ color: 'var(--tx3)', fontSize: TYPE.rowSub }}>{identityLine(dog, new Date())}</div>
                  {owner ? <div style={{ fontSize: TYPE.base }}>{owner}</div> : null}
                  {phone ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, fontSize: TYPE.base }}>
                      <span>{phone}</span>
                      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8 }}>
                        <a href={`tel:${phone}`} aria-label="Chiama" style={{ ...contactAction, background: 'var(--pri)' }}>
                          <Phone size={16} strokeWidth={2} aria-hidden />
                        </a>
                        <a
                          href={Capacitor.isNativePlatform() ? whatsAppAppLink(phone) : whatsAppLink(phone)}
                          aria-label="WhatsApp"
                          style={{ ...contactAction, background: '#128C7E' }}
                          onClick={(event) => {
                            if (!Capacitor.isNativePlatform()) return
                            event.preventDefault()
                            if (!openNativeWhatsApp(whatsAppAppLink(phone))) toast.show('WhatsApp non si apre', 'plain')
                          }}
                        >
                          <WhatsAppMark />
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <FlagChips dog={dog} />
                {dog.status === 'attivo' ? (
                  <button
                    type="button"
                    onClick={() => openSheet(`/appuntamenti/nuovo?cane=${dog.id}`)}
                    style={{
                      flex: '1 1 120px',
                      minWidth: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      height: 34,
                      border: 0,
                      borderRadius: 12,
                      background: 'var(--pri-solid)',
                      color: 'var(--on-pri)',
                      fontWeight: 700,
                      fontSize: 12,
                      boxShadow: 'var(--sh-btn)',
                      padding: '0 8px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Calendar size={16} strokeWidth={2} aria-hidden />
                    Fissa appuntamento
                  </button>
                ) : null}
              </div>
            </Card>
            <ProfileFacts
              items={[
                { label: labels.species, value: SPECIES_LABEL[dog.species], flex: '0 0 36px' },
                { label: labels.breed, value: dog.breed.trim() || '—', flex: '1 1 0' },
                { label: labels.sex, value: dog.sex ? SEX_LABEL[dog.sex] : '—', flex: '0 0 auto' },
                { label: labels.weight, value: dog.weightKg != null ? `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(dog.weightKg)} kg` : '—', flex: '0 0 42px' },
                { label: labels.size, value: SIZE_LABEL[dog.size], flex: '0 0 auto' },
                { label: labels.clientType, value: clientFact(dog), flex: '0 0 auto' },
                { label: labels.avgDuration, value: averageDuration(visits.appointments, dog.id), flex: '0 0 auto' },
              ]}
            />
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            {dog.criticalNote ? <CriticalNote note={dog.criticalNote} /> : null}
            {notesText ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionTitle>Note</SectionTitle>
                <Card style={{ padding: 10 }}>
                  <div>{notesText}</div>
                </Card>
              </div>
            ) : null}
            <CustomPrices dog={dog} services={services} />
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <NextAppointment dog={dog} appointments={visits.appointments} />
            {dog.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dog.tags.map((tag) => <Chip key={tag}>{tag}</Chip>)}
              </div>
            ) : null}
            {dog.customFields.map((field) => <div key={field.id}>{`${field.label}: ${field.value}`}</div>)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SectionTitle>Contatti</SectionTitle>
              {dog.contacts.map((contact) => <ContactRow key={contact.id} contact={contact} call />)}
            </div>
            <Gallery
              gallery={gallery}
              profilePhoto={photo ?? dog.photo}
              editing={false}
              onGallery={(next) => {
                setPhotoError(null)
                if (!persistMedia({ gallery: next })) return
                setGallery(next)
              }}
              onError={() => setPhotoError('Foto non utilizzabile')}
            />
            {dog.status !== 'attivo' ? <Button variant="secondary" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button> : null}
            <History dogId={dog.id} appointments={visits.appointments} onSavePrice={saveHistoryPrice} onCopyPrice={copyHistoryPrice} />
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
      <Dialog open={menuOpen} title="Scheda" onClose={() => setMenuOpen(false)}>
        {dog?.status === 'attivo' ? (
          <>
            <SchedaChoice
              label="Non più in cura"
              detail="Esce dagli attivi e resta in archivio"
              ink="var(--warn)"
              wash="var(--warn-s)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={() => askArchive('non_in_cura')}
            />
            <SchedaChoice
              label="Deceduto"
              detail="Archivia la scheda e segna il decesso"
              ink="var(--sen)"
              wash="var(--sen-s)"
              icon={<Flower2 size={18} strokeWidth={2} />}
              onClick={() => askArchive('deceduto')}
            />
          </>
        ) : null}
        {dog ? (
          <SchedaChoice
            label="Elimina definitivamente"
            detail="Cancella la scheda in modo permanente"
            ink="var(--bad)"
            wash="var(--bad-s)"
            icon={<Trash2 size={18} strokeWidth={2} />}
            onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
          />
        ) : null}
      </Dialog>
      <Dialog open={pendingArchive !== null} title={pendingArchive === 'deceduto' ? 'Deceduto' : 'Non più in cura'} onClose={() => setPendingArchive(null)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {pendingArchive === 'deceduto' ? deceasedFutureCopy(futureCount) : `${futureCountText(futureCount)}.`}
        </p>
        {pendingArchive === 'deceduto' ? (
          <SchedaChoice
            label="Conferma"
            detail="Archivia la scheda e disdice i futuri"
            ink="var(--sen)"
            wash="var(--sen-s)"
            icon={<Flower2 size={18} strokeWidth={2} />}
            onClick={archiveAndCancel}
          />
        ) : (
          <>
            <SchedaChoice
              label="Archivia e disdici i futuri"
              detail="Gli appuntamenti futuri vengono disdetti"
              ink="var(--warn)"
              wash="var(--warn-s)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={archiveAndCancel}
            />
            <SchedaChoice
              label="Archivia soltanto"
              detail="Gli appuntamenti futuri restano in agenda"
              ink="var(--tx2)"
              wash="var(--surf)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={archiveOnly}
            />
          </>
        )}
      </Dialog>
      <Dialog open={confirmDelete} title="Elimina definitivamente" onClose={() => setConfirmDelete(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {dog ? `${dog.name} viene cancellato per sempre. Non si può recuperare.` : 'La scheda viene cancellata per sempre.'}
        </p>
        <SchedaChoice
          label="Elimina definitivamente"
          detail="Cancella la scheda in modo permanente"
          ink="var(--bad)"
          wash="var(--bad-s)"
          icon={<Trash2 size={18} strokeWidth={2} />}
          onClick={confirmRemove}
        />
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          style={{
            width: '100%',
            height: 42,
            border: '1px solid var(--line)',
            borderRadius: 14,
            background: 'var(--card)',
            color: 'var(--tx)',
            fontWeight: 700,
            fontSize: 14,
            boxShadow: 'var(--sh-1)',
          }}
        >
          Annulla
        </button>
      </Dialog>
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
      <Dialog open={photoSheet} title="Foto del profilo" onClose={() => setPhotoSheet(false)}>
        {shownPhoto ? <ProfilePreview src={shownPhoto} /> : null}
        <SchedaChoice
          label="Cambia"
          detail="Scegli un'altra foto"
          ink="var(--pri)"
          wash="var(--pri-s)"
          icon={<Camera size={18} strokeWidth={2} />}
          onClick={() => fileRef.current?.click()}
        />
        <SchedaChoice
          label="Ingrandisci"
          detail="Apri la foto a tutta pagina"
          ink="var(--tx2)"
          wash="var(--surf)"
          icon={<ZoomIn size={18} strokeWidth={2} />}
          onClick={() => {
            setPhotoSheet(false)
            setPhotoZoom(true)
          }}
        />
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
      </Dialog>
      <CenteredPhoto src={photoZoom && shownPhoto ? shownPhoto : null} onClose={() => setPhotoZoom(false)} />
    </PhoneShell>
  )
}
