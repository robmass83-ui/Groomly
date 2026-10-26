import { Capacitor } from '@capacitor/core'
import { format } from 'date-fns'
import { enGB, es } from 'date-fns/locale'
import { Calendar, Camera, ChevronDown, ChevronRight, Flower2, HeartOff, MoreVertical, Pencil, Phone, Trash2, X, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { avatarForSpecies, TEMPERAMENT_ICONS } from '../assets/icons/icons'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { AnimalsReturn } from '../components/layout/AnimalsReturn'
import { PhoneShell } from '../components/layout/PhoneShell'
import './schedaEnter.css'
import { Dialog } from '../components/layout/Dialog'
import { CloseVisitDialog } from '../components/appointment/CloseVisitDialog'
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
import { usePiano } from '../hooks/usePiano'
import { TesseraFedelta } from '../components/piano/TesseraFedelta'
import { PulsanteMessaggi } from '../components/piano/PulsanteMessaggi'
import { StrumentiCane } from '../components/piano/StrumentiCane'
import { NOTA_PREMIO, ricalcolaFedelta } from '../lib/fedelta'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { STATO_COMPLETATO, STATO_DISDETTO, sumDuration, sumPrice } from '../lib/appointments'
import type { ClosePatch } from '../lib/closeVisit'
import { priceChange } from '../lib/uiStyle'
import { dogFormSeed, dogScreenSeed, shouldReseedDog } from '../lib/dogFormSeed'
import { RUOLI_BASE, etichettaRuolo, ruoloDelProprietario } from '../lib/ruoloProprietario'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import { finishDogRemoval } from '../lib/dogRemoval'
import { dogPortrait, prepareDogPhoto } from '../lib/dogPhoto'
import { completeYear, seniorOf, type DogScreen } from '../lib/dogScreen'
import { ageText, averageDuration, formatCompactDuration, splitCritical } from '../lib/display'
import { formatEuro, IT_DATE } from '../lib/format'
import { whatsAppAppLink, whatsAppLink } from '../lib/phone'
import { guardCaptureClick } from '../lib/photoCapture'
import { PhotoTooLargeError } from '../lib/photoCodec'
import { MAX_DOG_PHOTOS, dogPhotoCount } from '../lib/photoLimit'
import { dogServiceQuoteSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason, CustomField, Dog, DogContact, DogDraft, DogServicePrice, DogSize, DogWrite, GalleryPhoto, Service, Species } from '../types/models'
import { DogFields, HiddenLabel, weightOf } from './DogFields'
import { NextAppointment } from './NextAppointment'

const PORTRAIT = 64
const READ_PORTRAIT = 92

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

const removeControl = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 44,
  minHeight: 44,
  flex: 'none',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  padding: 0,
} as const

const smallInput = {
  width: '100%',
  height: 44,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '0 8px',
  font: 'inherit',
  boxSizing: 'border-box' as const,
}

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

const thumbStyle = { width: 50, height: 50, borderRadius: 8, objectFit: 'cover' as const, display: 'block' }

type QuoteEdits = Record<string, { price: string; duration: string }>

function statusLine(status: Dog['status'], lingua: Lingua = 'it'): string | null {
  if (status === 'attivo') return null
  return t(lingua, status === 'deceduto' ? 'caniDeceduto' : 'caniNonInCura')
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

function futureScheduled(items: Appointment[], dogId: string, now: Date): Appointment[] {
  return items.filter((item) => item.dogId === dogId && item.status === 'programmato' && item.start.getTime() >= now.getTime())
}

function futureCountText(count: number, lingua: Lingua = 'it'): string {
  return count === 1 ? t(lingua, 'schedaFuturoUno') : t(lingua, 'schedaFuturi', { n: count })
}

function deceasedFutureCopy(count: number, lingua: Lingua = 'it'): string {
  return count === 1 ? t(lingua, 'schedaDisdettoUno') : t(lingua, 'schedaDisdetti', { n: count })
}

function mergeContacts(contacts: DogContact[], owner: { name: string; phone: string }): DogContact[] {
  const found = contacts.findIndex((contact) => contact.isPrimary)
  if (found === -1) {
    return [{ id: 'primary', name: owner.name, role: ruoloDelProprietario(owner.name), phone: owner.phone, isPrimary: true }, ...contacts]
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
  const frasi = useFrasi()
  const rows = profilePrices(dog, services)
  if (rows.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>{frasi.schedaPrezziPers}</SectionTitle>
      <Card style={{ borderRadius: 22, boxShadow: 'var(--sh-1)' }}>
        <ul aria-label={frasi.schedaPrezziPers} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row, index) => (
            <li
              key={row.serviceId}
              aria-label={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderTop: index === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <IconTile tone={row.iconKey ?? 'prim'} size="sm">
                <ServiceIcon iconKey={row.iconKey} size={SIZES.chip.serviceIconInChip} />
              </IconTile>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 13, ...USER_TEXT }}>{row.name}</span>
                <span style={{ display: 'block', color: 'var(--tx3)', fontSize: 12 }}>{row.duration}</span>
              </span>
              <b style={{ flex: 'none', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{row.price}</b>
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

function collectPrices(services: Service[], dog: Dog | undefined, edits: QuoteEdits, lingua: Lingua = 'it'): { ok: true; prices: DogServicePrice[] } | { ok: false; message: string } {
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
        return { ok: false, message: t(lingua, 'schedaPrezzoInvalido') }
      }
      next.price = parsed.data
    }
    if (duration !== '') {
      const parsed = dogServiceQuoteSchema.shape.durationMin.safeParse(duration)
      if (!parsed.success) {
        return { ok: false, message: t(lingua, 'schedaMinutiInvalidi') }
      }
      next.durationMin = parsed.data
    }
    kept.set(serviceId, next)
  }
  return { ok: true, prices: [...kept.values()] }
}

function roleChoices(dogs: Dog[]): string[] {
  const base = [...RUOLI_BASE]
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

function copyExtraNotes(notes: Dog['extraNotes']): DogWrite['extraNotes'] {
  if (!notes) return undefined
  return notes.map((item) => ({ ...item, createdAt: new Date(item.createdAt) }))
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
  const extraNotes = copyExtraNotes(dog?.extraNotes)
  if (extraNotes) write.extraNotes = extraNotes
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
    contact: { name: dog.contact.name, phone: dog.contact.phone, ...(dog.contact.email ? { email: dog.contact.email } : {}) },
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
  if (dog.noteVocali?.length) write.noteVocali = dog.noteVocali.map((item) => ({ ...item }))
  if (dog.criticalNote) write.criticalNote = dog.criticalNote
  const extraNotes = copyExtraNotes(dog.extraNotes)
  if (extraNotes) write.extraNotes = extraNotes
  if (dog.birthYear !== undefined) write.birthYear = dog.birthYear
  if (dog.isSenior !== undefined) write.isSenior = dog.isSenior
  if (dog.weightKg !== undefined) write.weightKg = dog.weightKg
  if (dog.recurrenceWeeks !== undefined) write.recurrenceWeeks = dog.recurrenceWeeks
  return write
}

function CriticalNote({ note }: { note: string }) {
  const parts = splitCritical(note)
  return (
    <div style={{ background: 'var(--bad-s)', color: 'var(--bad)', borderRadius: 22, padding: '12px 14px' }}>
      <div style={{ fontWeight: 700, ...USER_TEXT }}>{parts.title}</div>
      {parts.rest ? <div style={USER_TEXT}>{parts.rest}</div> : null}
    </div>
  )
}

const FLAG_TONE = {
  ok: { background: 'var(--ok-s)', color: 'var(--ok)' },
  warn: { background: 'var(--warn-s)', color: 'var(--warn)' },
  bad: { background: 'var(--bad-s)', color: 'var(--bad)' },
  sen: { background: 'var(--sen-s)', color: 'var(--sen)' },
  tea: { background: 'var(--tea-s)', color: 'var(--tea)' },
} as const

function FlagMark({ tone, icon, children }: { tone: keyof typeof FLAG_TONE; icon: ReactNode; children: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', ...FLAG_TONE[tone] }}>
      {icon}
      {children}
    </span>
  )
}

function FlagChips({ dog }: { dog: Dog }) {
  const frasi = useFrasi()
  const tone = TEMPERAMENT_ICONS[dog.temperament].tone
  const flagTone = tone in FLAG_TONE ? tone : 'warn'
  const carattere = { bravo: frasi.schedaBravo, agitato: frasi.schedaAgitato, mordace: frasi.schedaMordace }[dog.temperament]
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <FlagMark tone={flagTone} icon={<TemperamentIcon kind={dog.temperament} size={10} />}>
        {carattere}
      </FlagMark>
      {seniorOf(dog.ageCategory) ? (
        <FlagMark tone="sen" icon={<FlagIcon kind="anziano" size={10} />}>{frasi.schedaAnziano}</FlagMark>
      ) : null}
      {dog.clientType === 'mensile' ? (
        <FlagMark tone="tea" icon={<FlagIcon kind="mensile" size={10} />}>{frasi.schedaMensile}</FlagMark>
      ) : null}
    </div>
  )
}

function Portrait({ src, species, size = PORTRAIT, radius = 18, variant = 'full' }: { src?: string; species?: Species; size?: number; radius?: number; variant?: 'thumb' | 'full' }) {
  const shown = useFileSrc(src, variant)
  return <img alt="" src={shown || avatarForSpecies(species)} width={size} height={size} style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', background: 'var(--surf)', display: 'block' }} />
}

function FormAvatar({ src, onFile }: { src?: string; onFile: (file: File | undefined) => void }) {
  const frasi = useFrasi()
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button type="button" aria-label={frasi.schedaFotoCane} onClick={() => pickRef.current?.click()} style={{ position: 'relative', border: 0, padding: 0, background: 'transparent', width: PORTRAIT, height: PORTRAIT }}>
        <Portrait src={src} variant="thumb" />
        <span aria-hidden style={{ position: 'absolute', right: -4, bottom: -4, width: 24, height: 24, borderRadius: 999, background: 'var(--pri)', color: 'var(--on-pri)', display: 'grid', placeItems: 'center' }}>
          <Camera size={13} strokeWidth={2} />
        </span>
      </button>
      <input
        ref={pickRef}
        aria-label={frasi.schedaFoto}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
        onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = '' }}
      />
    </div>
  )
}

function factColumn(label: string, razza: string, cliente: string, durata: string): string | undefined {
  if (label === razza) return '1 / -1'
  if (label === cliente || label === durata) return 'span 2'
  return undefined
}

function ProfileFacts({ items }: { items: { label: string; value: string }[] }) {
  const frasi = useFrasi()
  return (
    <div
      role="group"
      aria-label={frasi.schedaDati}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 4,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            padding: '2px 5px',
            borderRadius: 8,
            background: 'var(--surf)',
            gridColumn: factColumn(item.label, frasi.schedaRazza, frasi.schedaCliente, frasi.schedaDurataMedia),
          }}
        >
          <small style={{ fontSize: 9, lineHeight: 1.15, color: 'var(--tx3)', fontWeight: 600 }}>{item.label}</small>
          <b style={{ fontSize: 11, lineHeight: 1.2, fontWeight: 650, ...USER_TEXT }}>{item.value}</b>
        </div>
      ))}
    </div>
  )
}

function clientFact(dog: Dog, lingua: Lingua = 'it'): string {
  const etichetta = t(lingua, dog.clientType === 'mensile' ? 'schedaMensile' : 'schedaOccasionale')
  if (dog.clientType === 'mensile' && dog.recurrenceWeeks) return t(lingua, 'schedaOgni', { etichetta, n: dog.recurrenceWeeks })
  return etichetta
}

function ReadPortrait({ src, species, size = PORTRAIT, radius = 18, onFile, onEnlarge }: { src?: string; species?: Species; size?: number; radius?: number; onFile: (file: File | undefined) => void; onEnlarge?: () => void }) {
  const frasi = useFrasi()
  const pickRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  return (
    <>
      <button type="button" aria-label={frasi.schedaFotoCane} onClick={src && onEnlarge ? onEnlarge : () => pickRef.current?.click()} style={{ border: 0, padding: 0, background: 'transparent', width: size, height: size, flex: 'none' }}>
        <Portrait src={src} species={species} size={size} radius={radius} />
      </button>
      {src ? null : (
        <input
          ref={pickRef}
          aria-hidden="true"
          tabIndex={-1}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
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
  const frasi = useFrasi()
  const active = services
    .filter((service) => service.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, color: 'var(--tx3)', fontSize: TYPE.meta, fontWeight: 600 }}>
        <span />
        <span />
        <span>{frasi.schedaPrezzoEuro}</span>
        <span>{frasi.schedaDurataMin}</span>
      </div>
      {active.map((service) => {
        const shown = shownQuote(service, dog, edits)
        const list = listPrice(service, size)
        const priceId = `prezzo-${service.id}`
        const durationId = `durata-${service.id}`
        return (
          <div key={service.id} role="group" aria-label={service.name} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 76px 76px', gap: 6, alignItems: 'center', minHeight: SIZES.row.minH }}>
            <Toggle checked={hidden.includes(service.id)} onChange={() => onToggleHidden(service.id)} label={frasi.schedaMostraProfilo} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ display: 'inline-flex', flex: 'none' }}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              </span>
              <span style={{ fontWeight: 600, fontSize: TYPE.base, flex: 1, ...USER_TEXT }}>{service.name}</span>
            </span>
            <span>
              <HiddenLabel htmlFor={priceId}>{frasi.schedaPrezzoNome.replace('{{nome}}', service.name)}</HiddenLabel>
              <input id={priceId} inputMode="decimal" autoComplete="off" placeholder={list.price} value={shown.price} onChange={(event) => onEdit(service.id, { price: event.target.value, duration: shown.duration })} style={smallInput} />
            </span>
            <span>
              <HiddenLabel htmlFor={durationId}>{frasi.schedaDurataNome.replace('{{nome}}', service.name)}</HiddenLabel>
              <input id={durationId} inputMode="numeric" autoComplete="off" placeholder={list.duration} value={shown.duration} onChange={(event) => onEdit(service.id, { price: shown.price, duration: event.target.value })} style={smallInput} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

const roundCall = {
  minWidth: 44,
  minHeight: 44,
  width: 'auto',
  height: 'auto',
  borderRadius: 999,
  background: 'var(--pri)',
  color: 'var(--on-pri)',
  display: 'grid',
  placeItems: 'center',
  textDecoration: 'none',
  flex: 'none',
  padding: 8,
} as const

function ContactRow({ contact, call, dense, onRemove }: { contact: DogContact; call: boolean; dense?: boolean; onRemove?: () => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const ruolo = etichettaRuolo(contact.role, lingua)
  if (dense) {
    const detail = [contact.phone, ruolo, contact.isPrimary ? frasi.schedaPrincipale : ''].filter((part) => part.trim() !== '').join(' · ')
    const initial = contact.name.trim().charAt(0).toUpperCase()
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
        {initial ? <span aria-hidden style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--pri-s)', color: 'var(--pri-ink)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{initial}</span> : null}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontWeight: 600, fontSize: 12, lineHeight: 1.2, ...USER_TEXT }}>{contact.name}</span>
          {detail ? <span style={{ display: 'block', marginTop: 1, fontSize: 11, lineHeight: 1.25, color: 'var(--tx3)', ...USER_TEXT }}>{detail}</span> : null}
        </span>
        {call && contact.phone ? (
          <a href={`tel:${contact.phone}`} aria-label={frasi.schedaChiamaNome.replace('{{nome}}', contact.name || contact.phone)} style={roundCall}>
            <Phone size={16} strokeWidth={2} aria-hidden />
          </a>
        ) : null}
      </div>
    )
  }
  const stripe = contact.isPrimary ? 'var(--pri)' : 'var(--line2)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--card)', borderRadius: SIZES.card.radius, boxShadow: 'var(--sh-2)', borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 4, borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid', borderTopColor: 'var(--line)', borderRightColor: 'var(--line)', borderBottomColor: 'var(--line)', borderLeftColor: stripe }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{contact.name}</span>
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {contact.phone ? <Chip>{contact.phone}</Chip> : null}
          {ruolo ? <Chip>{ruolo}</Chip> : null}
          {contact.isPrimary ? <Chip tone="pri">{frasi.schedaPrincipale}</Chip> : null}
        </span>
      </span>
      {call && contact.phone ? (
        <a href={`tel:${contact.phone}`} aria-label={frasi.schedaChiamaNome.replace('{{nome}}', contact.name || contact.phone)} style={roundCall}>
          <Phone size={16} strokeWidth={2} aria-hidden />
        </a>
      ) : null}
      {onRemove ? <button type="button" aria-label={frasi.schedaTogliNome.replace('{{nome}}', contact.name)} onClick={onRemove} style={removeControl}>{frasi.schedaTogli}</button> : null}
    </div>
  )
}

function ContactSheet({ open, dogs, onClose, onAdd }: { open: boolean; dogs: Dog[]; onClose: () => void; onAdd: (contact: DogContact) => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
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
    <Dialog open={open} title={frasi.schedaContatto} onClose={onClose}>
      <Input label={frasi.schedaNomeContatto} autoCapitalize="words" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} />
      <Input label={frasi.schedaTelefonoContatto} type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <div role="group" aria-label={frasi.schedaRuolo} style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {roleChoices(dogs).map((choice) => (
          <button key={choice} type="button" aria-pressed={role === choice} onClick={() => setRole(role === choice ? '' : choice)} style={{ ...sheetAction, width: 'auto', color: role === choice ? 'var(--pri)' : 'inherit' }}>{etichettaRuolo(choice, lingua)}</button>
        ))}
      </div>
      <button type="button" style={sheetAction} onClick={commit}>{frasi.schedaAggiungiContatto}</button>
    </Dialog>
  )
}

function TagSheet({ open, dogs, suggestions, tags, onClose, onAdd }: { open: boolean; dogs: Dog[]; suggestions: string[]; tags: string[]; onClose: () => void; onAdd: (tag: string) => void }) {
  const frasi = useFrasi()
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
      <button type="button" style={sheetAction} onClick={() => commit(draft)}>{frasi.schedaAggiungiTag}</button>
    </Dialog>
  )
}

function FieldSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (field: CustomField) => void }) {
  const frasi = useFrasi()
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
    <Dialog open={open} title={frasi.schedaCampo} onClose={onClose}>
      <Input label={frasi.schedaEtichettaCampo} autoCapitalize="sentences" autoComplete="off" value={label} onChange={(event) => setLabel(event.target.value)} />
      <Input label={frasi.schedaValoreCampo} autoCapitalize="sentences" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" style={sheetAction} onClick={commit}>{frasi.schedaAggiungiCampo}</button>
    </Dialog>
  )
}

function CenteredPhoto({ src, onClose }: { src: string | null; onClose: () => void }) {
  const frasi = useFrasi()
  const shown = useFileSrc(src ?? undefined, 'full')
  return (
    <Dialog open={src !== null} title={frasi.schedaFoto} onClose={onClose} fill>
      {shown ? <img alt={frasi.schedaFotoIngrandita} src={shown} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /> : null}
    </Dialog>
  )
}

function ProfilePreview({ src }: { src: string }) {
  const frasi = useFrasi()
  const shown = useFileSrc(src, 'full')
  return shown ? (
    <img
      alt={frasi.schedaAnteprima}
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
  const frasi = useFrasi()
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [limit, setLimit] = useState(4)
  const [zoom, setZoom] = useState<string | null>(null)
  const photos = gallery.slice(0, limit)
  const hiddenPhotos = gallery.length - photos.length

  async function onFile(file: File | undefined) {
    if (!file) return
    if (dogPhotoCount({ photo: profilePhoto, gallery }) >= MAX_DOG_PHOTOS) {
      toast.show(frasi.schedaTroppeFoto, 'plain')
      return
    }
    try {
      const photo = await prepareDogPhoto(file)
      onGallery([...gallery, { id: crypto.randomUUID(), photo, takenAt: new Date() }])
    } catch (error) {
      if (error instanceof PhotoTooLargeError) toast.show(frasi.schedaFotoGrande, 'plain')
      else onError()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionTitle>{frasi.schedaGalleria}</SectionTitle>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {photos.map((item, index) => (
          <span key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button type="button" aria-label={frasi.schedaIngrandisciFoto.replace('{{n}}', String(index + 1))} onClick={() => setZoom(item.photo)} style={{ border: 0, padding: 0, background: 'transparent' }}>
              <Thumb alt="" photo={item.photo} size={50} />
            </button>
            {editing ? <button type="button" aria-label={frasi.schedaTogliFoto.replace('{{n}}', String(index + 1))} onClick={() => onGallery(gallery.filter((photo) => photo.id !== item.id), item.id)} style={{ ...sheetAction, width: 'auto' }}>{frasi.schedaTogli}</button> : null}
          </span>
        ))}
        {hiddenPhotos > 0 ? (
          <button type="button" onClick={() => setLimit(gallery.length)} style={{ width: 50, height: 50, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surf)' }}>{`+${hiddenPhotos}`}</button>
        ) : null}
        <button type="button" onClick={() => fileRef.current?.click()} style={textAction}>{frasi.schedaAggiungi}</button>
        <input
          ref={fileRef}
          aria-label={frasi.schedaAggiungiGalleria}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
          onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = '' }}
        />
      </div>
      <CenteredPhoto src={zoom} onClose={() => setZoom(null)} />
    </div>
  )
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

function moreVisits(total: number, lingua: Lingua = 'it'): string | null {
  const rest = total - 1
  if (rest < 1) return null
  return rest === 1 ? t(lingua, 'schedaAltraVisita') : t(lingua, 'schedaAltreVisite', { n: rest })
}

function HistoryVisit({ item, before, actions, onCorrect }: {
  item: Appointment
  before?: Appointment
  actions: boolean
  onCorrect: (id: string) => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const absent = item.status === 'non_venuto'
  const data = lingua === 'it' ? IT_DATE : { locale: lingua === 'en' ? enGB : es, weekStartsOn: 1 as const }
  const when = format(item.start, 'd MMM yyyy', data)
  const change = !actions || absent ? null : priceChange(visitPrice(item), before ? visitPrice(before) : null)
  const changeLabel = change?.startsWith('▲') ? frasi.schedaPrezzoAlto : change?.startsWith('▼') ? frasi.schedaPrezzoBasso : null
  const photos = actions ? item.photos?.filter((photo) => photo.kind === 'prima' || photo.kind === 'dopo') ?? [] : []
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span aria-hidden style={{ width: 8, height: 8, marginTop: 4, borderRadius: 999, background: absent ? 'var(--bad)' : 'var(--pri)', flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--pri)', fontWeight: 700, fontSize: TYPE.meta }}>{when}</div>
            <div style={{ fontWeight: 700, color: absent ? 'var(--bad)' : undefined, textDecoration: absent ? 'line-through' : undefined }}>{item.services.map((line) => line.name).join(', ')}</div>
            {absent ? <div style={{ color: 'var(--bad)' }}>{frasi.homeNonVenuto}</div> : <div style={{ color: 'var(--tx2)' }}>{historyDetail(item)}</div>}
            {!absent && actions && item.adjustmentNote ? <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{item.adjustmentNote}</div> : null}
          </div>
          {change && changeLabel ? <span role="img" aria-label={changeLabel}>{change}</span> : null}
          {actions && !absent ? (
            <button type="button" aria-label={frasi.schedaCorreggiPrezzo.replace('{{quando}}', when)} onClick={() => onCorrect(item.id)} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0 }}>
              <Pencil size={14} aria-hidden />
            </button>
          ) : null}
        </div>
        {photos.length > 0 ? (
          <div style={{ display: 'flex', gap: 4 }}>
            {photos.map((photo) => (
              <Thumb key={photo.id} alt={photo.kind === 'prima' ? frasi.schedaPrima : frasi.schedaDopo} photo={photo.photo} size={50} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function History({ dogId, appointments, servicePrices, onSaveClose, onCopyPrice }: {
  dogId: string
  appointments: Appointment[]
  servicePrices: DogServicePrice[]
  onSaveClose: (appointment: Appointment, patch: ClosePatch) => boolean
  onCopyPrice: (serviceId: string, price: number) => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const [open, setOpen] = useState(false)
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [asking, setAsking] = useState<{ serviceId: string; price: number } | null>(null)
  const entries = appointments
    .filter((item) => item.dogId === dogId && (item.status === STATO_COMPLETATO || item.status === 'non_venuto'))
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))
  const correcting = entries.find((item) => item.id === correctingId && item.status === STATO_COMPLETATO)
  const latest = entries[0]
  const restLabel = moreVisits(entries.length, lingua)

  function saveCorrection(appointment: Appointment, patch: ClosePatch) {
    if (!onSaveClose(appointment, patch)) return
    setCorrectingId(null)
    const only = appointment.services.length === 1 ? appointment.services[0] : undefined
    if (!only) return
    const charged = patch.total ?? sumPrice(appointment.services)
    const personal = servicePrices.find((item) => item.serviceId === only.serviceId)
    if (personal?.price === charged) return
    setAsking({ serviceId: only.serviceId, price: charged })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle count={entries.length > 0 ? entries.length : undefined}>{frasi.schedaStorico}</SectionTitle>
      {entries.length === 0 ? (
        <Card style={{ padding: 10 }}>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.schedaNessunTrattamento}</div>
        </Card>
      ) : (
        <button
          type="button"
          aria-label={frasi.schedaStorico}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', border: `${SIZES.card.border}px solid var(--line)`, borderRadius: 18, background: 'var(--card)', boxShadow: 'var(--sh-1)', color: 'inherit', font: 'inherit', textAlign: 'left', padding: '8px 10px' }}
        >
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {open || !latest ? null : <HistoryVisit item={latest} actions={false} onCorrect={setCorrectingId} />}
            {!open && restLabel ? <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{restLabel}</span> : null}
          </span>
          {open ? <ChevronDown size={16} strokeWidth={2} aria-hidden color="var(--tx3)" /> : <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />}
        </button>
      )}
      {open ? entries.map((item, index) => (
        <HistoryVisit
          key={item.id}
          item={item}
          before={entries.slice(index + 1).find((older) => older.status === STATO_COMPLETATO)}
          actions
          onCorrect={setCorrectingId}
        />
      )) : null}
      {correcting ? (
        <CloseVisitDialog
          key={`${correcting.id}-${correcting.updatedAt.getTime()}`}
          open
          mode="correct"
          quotedPrice={sumPrice(correcting.services)}
          quotedMinutes={sumDuration(correcting.services)}
          initialPrice={visitPrice(correcting)}
          initialMinutes={correcting.actualDurationMin ?? sumDuration(correcting.services)}
          initialNote={correcting.adjustmentNote ?? ''}
          initialPayment={correcting.paymentMethod ?? null}
          onClose={() => setCorrectingId(null)}
          onNone={(patch) => saveCorrection(correcting, patch)}
          onSave={(patch) => saveCorrection(correcting, patch)}
        />
      ) : null}
      <Sheet open={asking !== null} title={frasi.schedaPrezzoScheda} onClose={() => setAsking(null)}>
        <button type="button" style={sheetAction} onClick={() => setAsking(null)}>{frasi.schedaSoloQuesto}</button>
        <button type="button" style={sheetAction} onClick={() => { if (asking) onCopyPrice(asking.serviceId, asking.price); setAsking(null) }}>{frasi.schedaAggiornaPrezzo}</button>
      </Sheet>
    </div>
  )
}

function useFrameHeight(): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const apply = () => {
      const next = Math.round(viewport.height)
      if (next <= 0) return
      setHeight((current) => (current === next ? current : next))
    }
    apply()
    viewport.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('groomlyResume', apply)
    return () => {
      viewport.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('groomlyResume', apply)
    }
  }, [])
  return height
}

function keepFieldVisible(event: FocusEvent<HTMLDivElement>) {
  const target = event.target
  if (!(target instanceof HTMLElement) || !target.matches('input, textarea')) return
  window.setTimeout(() => target.scrollIntoView({ block: 'nearest' }), 300)
}

function SchedaFrame({ children }: { children: ReactNode }) {
  const frameHeight = useFrameHeight()
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 200)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <PhoneShell fill frameHeight={frameHeight}>
      <div
        className="scheda-scroll"
        data-testid="scheda-scroll"
        onFocus={keepFieldVisible}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        <div className={settled ? 'scheda-enter is-settled' : 'scheda-enter'} data-testid="scheda" onAnimationEnd={() => setSettled(true)} style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>{children}</div>
      </div>
      <AnimalsReturn />
    </PhoneShell>
  )
}

export function DogPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const arrival = readArrival(useLocation().state)
  const toast = useToast()
  const openSheet = useOpenSheet()
  const session = useSession()
  const piano = usePiano()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const role = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const canChangeDogStatus = role !== 'collaboratore'
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
    // I cani recenti stanno nelle impostazioni del salone: il collaboratore non può scriverle.
    if (role === 'collaboratore') return
    if (!id || !uid || !settingsReady) return
    const found = api.dogs.find((item) => item.id === id)
    if (!found || found.status !== 'attivo') return
    if (settings.recentDogIds[0] === id) return
    saveSettings(rememberDog(settings, id))
  }, [role, id, uid, settingsReady, api.dogs, settings, saveSettings])

  function storeSettings(next: typeof settings) {
    if (!uid || !settingsReady || !saveSettings(next)) {
      if (uid) toast.show(frasi.authSalvataggio, 'plain')
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
      toast.show(frasi.authSalvataggio, 'plain')
      return false
    }
    return true
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    if (dogPhotoCount({ gallery }) >= MAX_DOG_PHOTOS) {
      toast.show(frasi.schedaTroppeFoto, 'plain')
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
      if (error instanceof PhotoTooLargeError) {
        setPhotoError(null)
        toast.show(frasi.schedaFotoGrande, 'plain')
      } else setPhotoError(frasi.schedaFotoNonUtile)
    }
  }

  function save(draft: DogDraft) {
    let prices = dog?.servicePrices ?? []
    if (Object.keys(edits).length > 0) {
      const parsed = collectPrices(services, dog, edits, lingua)
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
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    setEdits({})
    if (!dog && api.lastCreatedId.current) {
      const createdId = api.lastCreatedId.current
      if (arrival.returnTo) {
        toast.show(frasi.schedaSalvatoNome.replace('{{nome}}', draft.name), 'ok')
        const separator = arrival.returnTo.includes('?') ? '&' : '?'
        navigate(`${arrival.returnTo}${separator}cane=${createdId}`, { replace: true })
        return
      }
      toast.show(frasi.schedaSalvatoNome.replace('{{nome}}', draft.name), 'ok', {
        label: frasi.homeAnnulla,
        onClick: () => {
          if (!api.remove(createdId)) {
            toast.show(frasi.authSalvataggio, 'plain')
            return
          }
          navigate('/animali', { replace: true })
        },
      })
      navigate(`/animali/${createdId}`, { replace: true })
      return
    }
    toast.show(frasi.schedaSalvato, 'ok')
    setEditing(false)
    setPhoto(undefined)
    setPhotoError(null)
  }

  function saveHistoryClose(appointment: Appointment, patch: ClosePatch): boolean {
    if (!visits.saveClose(appointment.id, patch, false)) {
      toast.show(frasi.authSalvataggio, 'plain')
      return false
    }
    return true
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
      toast.show(frasi.authSalvataggio, 'plain')
    }
  }

  function changeStatus(action: () => boolean) {
    if (!action()) toast.show(frasi.authSalvataggio, 'plain')
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
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    for (const item of future) {
      if (!visits.setStatus(item.id, STATO_DISDETTO, reason)) {
        toast.show(frasi.authSalvataggio, 'plain')
        return
      }
    }
    setPendingArchive(null)
  }

  function confirmRemove() {
    if (!dog) return
    setConfirmDelete(false)
    const dogId = dog.id
    const gone = finishDogRemoval({
      removeDog: () => api.remove(dogId),
      dropVisits: () => visits.dropDog(dogId),
    })
    if (!gone) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    navigate('/animali')
  }

  if (id && !dog) {
    return (
      <SchedaFrame>
        <Header title={frasi.schedaTitolo} />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>{frasi.rigaCaneAssente}</p>
      </SchedaFrame>
    )
  }

  const futureCount = dog ? futureScheduled(visits.appointments, dog.id, new Date()).length : 0
  const tessera = dog
    ? ricalcolaFedelta(visits.appointments.filter((item) => item.dogId === dog.id).map((item) => ({
      id: item.id,
      status: item.status,
      premio: item.adjustmentNote === NOTA_PREMIO,
    })))
    : { timbri: [], premiDisponibili: 0 }
  const line = dog ? statusLine(dog.status, lingua) : null
  const shownPhoto = photo ?? dogPortrait(dog)
  const phone = dog ? primaryPhone(dog) : ''
  const owner = dog ? primaryName(dog) : ''
  const labels = {
    species: frasi.schedaSpecie,
    breed: frasi.schedaRazza,
    sex: frasi.schedaSesso,
    age: frasi.schedaEta,
    weight: frasi.schedaPeso,
    size: frasi.schedaTaglia,
    clientType: frasi.schedaCliente,
    avgDuration: frasi.schedaDurataMedia,
  }
  const specie = { cane: frasi.schedaCane, gatto: frasi.schedaGatto, altro: frasi.schedaAltro }
  const sesso = { M: frasi.schedaMaschio, F: frasi.schedaFemmina }
  const taglia = { piccola: frasi.schedaPiccola, media: frasi.schedaMedia, grande: frasi.schedaGrande }
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
            <button type="button" aria-label={frasi.schedaTogliNome.replace('{{nome}}', tag)} onClick={() => setTags(tags.filter((item) => item !== tag))} style={removeControl}>
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </Chip>
        ))}
        <button type="button" onClick={() => setTagOpen(true)} style={{ border: 0, background: 'transparent', padding: 0 }}>
          <Chip dashed>{frasi.schedaPiuTag}</Chip>
        </button>
      </ChipRow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <HiddenLabel htmlFor={`campo-etichetta-${field.id}`}>{frasi.schedaEtichettaCampoN.replace('{{n}}', String(index + 1))}</HiddenLabel>
            <input id={`campo-etichetta-${field.id}`} autoComplete="off" autoCapitalize="sentences" value={field.label} onChange={(event) => setFields(fields.map((item) => (item.id === field.id ? { ...item, label: event.target.value } : item)))} style={smallInput} />
            <HiddenLabel htmlFor={`campo-valore-${field.id}`}>{frasi.schedaValoreCampoN.replace('{{n}}', String(index + 1))}</HiddenLabel>
            <input id={`campo-valore-${field.id}`} autoComplete="off" autoCapitalize="sentences" value={field.value} onChange={(event) => setFields(fields.map((item) => (item.id === field.id ? { ...item, value: event.target.value } : item)))} style={smallInput} />
            <button type="button" aria-label={frasi.schedaTogliCampo.replace('{{n}}', String(index + 1))} onClick={() => setFields(fields.filter((item) => item.id !== field.id))} style={removeControl}>{frasi.schedaTogli}</button>
          </div>
        ))}
        <button type="button" onClick={() => setFieldOpen(true)} style={textAction}>{frasi.schedaCampi}</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {extraContacts.map((contact) => (
          <ContactRow key={contact.id} contact={contact} call={false} onRemove={() => setContacts(contacts.filter((item) => item.id !== contact.id))} />
        ))}
        <button type="button" onClick={() => setContactOpen(true)} style={textAction}>{frasi.schedaPiuContatto}</button>
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
          onError={() => setPhotoError(frasi.schedaFotoNonUtile)}
        />
      ) : null}
    </>
  )

  const showStatusMenu = Boolean(dog) && canChangeDogStatus
  const headerAction = dog && (!editing || showStatusMenu) ? (
    <div style={{ display: 'flex', gap: 6 }}>
      {editing ? null : (
        <IconButton label={frasi.schedaModifica} onClick={() => { setPhotoError(null); setEditing(true) }}>
          <Pencil size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
      {showStatusMenu ? (
        <IconButton label={frasi.schedaMenu} onClick={() => setMenuOpen(true)}>
          <MoreVertical size={16} strokeWidth={2} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  ) : undefined

  return (
    <SchedaFrame>
      <Header title={dog ? frasi.schedaTitolo : frasi.schedaNuovo} action={headerAction} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <Card style={{ border: 'none', borderRadius: 28, boxShadow: 'var(--sh-2)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ReadPortrait size={READ_PORTRAIT} radius={28} src={dogPortrait(dog)} species={dog.species} onFile={(file) => void onPhoto(file)} onEnlarge={dogPortrait(dog) ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, ...USER_TEXT }}>{dog.name}</div>
                  {dog.breed.trim() ? <div style={{ marginTop: 2, color: 'var(--tx2)', fontSize: 12, lineHeight: 1.3, ...USER_TEXT }}>{dog.breed.trim()}</div> : null}
                  {ageText(dog.birthYear, t(lingua, dog.ageCategory === 'cucciolo' ? 'etaCucciolo' : dog.ageCategory === 'giovane' ? 'etaGiovane' : dog.ageCategory === 'anziano' ? 'etaAnziano' : 'etaAdulto'), new Date(), lingua) ? <div style={{ marginTop: 2, color: 'var(--tx3)', fontSize: 12, ...USER_TEXT }}>{ageText(dog.birthYear, t(lingua, dog.ageCategory === 'cucciolo' ? 'etaCucciolo' : dog.ageCategory === 'giovane' ? 'etaGiovane' : dog.ageCategory === 'anziano' ? 'etaAnziano' : 'etaAdulto'), new Date(), lingua)}</div> : null}
                  {owner ? <div style={{ marginTop: 2, color: 'var(--tx3)', fontSize: 12, ...USER_TEXT }}>{owner}</div> : null}
                  {phone ? <div style={{ marginTop: 2, color: 'var(--tx3)', fontSize: 12 }}>{phone}</div> : null}
                </div>
              </div>
              <FlagChips dog={dog} />
              <TesseraFedelta
                mostra={funzioneVisibile(piano.stato, piano.funzioni, 'fedelta')}
                accesso={funzioneVisibile(piano.stato, piano.funzioni, 'fedelta')}
                accesa={settings.fedeltaAccesa === true}
                timbri={tessera.timbri.length}
                premio={tessera.premiDisponibili > 0}
                onPaywall={() => piano.apriPaywall('fedelta')}
                onUsa={() => { if (dog) saveSettings({ ...settings, premiInAttesa: { ...settings.premiInAttesa, [dog.id]: true } }) }}
              />
              {phone ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <a href={`tel:${phone}`} aria-label={frasi.schedaChiama} style={{ minHeight: 48, borderRadius: 16, background: 'var(--pri)', color: '#fff', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                    <Phone size={16} strokeWidth={2} aria-hidden />
                    {frasi.schedaChiama}
                  </a>
                  <a
                    href={Capacitor.isNativePlatform() ? whatsAppAppLink(phone) : whatsAppLink(phone)}
                    aria-label="WhatsApp"
                    style={{ minHeight: 48, borderRadius: 16, background: '#128C7E', color: '#fff', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                    onClick={(event) => {
                      if (!Capacitor.isNativePlatform()) return
                      event.preventDefault()
                      if (!openNativeWhatsApp(whatsAppAppLink(phone))) toast.show(frasi.schedaWhatsappChiuso, 'plain')
                    }}
                  >
                    <WhatsAppMark />
                    WhatsApp
                  </a>
                </div>
              ) : null}
              {dog ? (
                <PulsanteMessaggi
                  telefono={phone}
                  valori={{ nome: owner, cane: dog.name, servizio: '' }}
                />
              ) : null}
              {dog ? (
                <StrumentiCane
                  dogId={dog.id}
                  appuntamenti={visits.appointments}
                  note={dog.noteVocali}
                  onNota={(note) => {
                    const write = dogToWrite(dog, dog.servicePrices)
                    write.noteVocali = note
                    if (!api.saveExisting(dog.id, write)) toast.show(frasi.authSalvataggio, 'plain')
                  }}
                />
              ) : null}
              {dog.status === 'attivo' ? (
                <button
                  type="button"
                  onClick={() => openSheet(`/appuntamenti/nuovo?cane=${dog.id}`)}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 48,
                    border: 0,
                    borderRadius: 16,
                    background: 'var(--pri-s)',
                    color: 'var(--pri-ink)',
                    fontWeight: 700,
                    fontSize: 14,
                    boxShadow: 'none',
                    padding: '0 12px',
                  }}
                >
                  <Calendar size={16} strokeWidth={2} aria-hidden />
                  {frasi.schedaFissa}
                </button>
              ) : null}
              <ProfileFacts
                items={[
                  { label: labels.species, value: specie[dog.species] },
                  { label: labels.sex, value: dog.sex ? sesso[dog.sex] : '—' },
                  { label: labels.weight, value: dog.weightKg != null ? `${new Intl.NumberFormat(lingua === 'en' ? 'en-GB' : lingua === 'es' ? 'es-ES' : 'it-IT', { maximumFractionDigits: 2 }).format(dog.weightKg)} kg` : '—' },
                  { label: labels.size, value: taglia[dog.size] },
                  { label: labels.breed, value: dog.breed.trim() || '—' },
                  { label: labels.clientType, value: clientFact(dog, lingua) },
                  { label: labels.avgDuration, value: averageDuration(visits.appointments, dog.id) },
                ]}
              />
            </Card>
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            {dog.criticalNote ? <CriticalNote note={dog.criticalNote} /> : null}
            {notesText ? (
              <Card style={{ borderRadius: 22, boxShadow: 'var(--sh-1)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SectionTitle>{frasi.schedaNote}</SectionTitle>
                <div style={USER_TEXT}>{notesText}</div>
              </Card>
            ) : null}
            <CustomPrices dog={dog} services={services} />
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <NextAppointment dog={dog} appointments={visits.appointments} />
            {dog.tags.length > 0 ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {dog.tags.map((tag) => (
                  <span key={tag} style={{ background: 'var(--card)', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 600, boxShadow: 'var(--sh-1)', ...USER_TEXT }}>{tag}</span>
                ))}
              </div>
            ) : null}
            {dog.customFields.length > 0 ? (
              <Card style={{ borderRadius: 22, boxShadow: 'var(--sh-1)', padding: '4px 14px' }}>
                {dog.customFields.map((field) => (
                  <div key={field.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0' }}>
                    <span style={{ color: 'var(--tx3)', fontSize: 12 }}>{field.label}</span>
                    <b style={{ fontSize: 13, textAlign: 'right', ...USER_TEXT }}>{field.value}</b>
                  </div>
                ))}
              </Card>
            ) : null}
            <Card style={{ borderRadius: 22, boxShadow: 'var(--sh-1)', padding: '12px 14px' }}>
              <SectionTitle>{frasi.schedaContatti}</SectionTitle>
              {dog.contacts.map((contact, index) => (
                <div key={contact.id} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                  <ContactRow contact={contact} call dense />
                </div>
              ))}
            </Card>
            <Card style={{ borderRadius: 22, boxShadow: 'var(--sh-1)', padding: '12px 14px' }}>
            <Gallery
              gallery={gallery}
              profilePhoto={photo ?? dog.photo}
              editing={false}
              onGallery={(next) => {
                setPhotoError(null)
                if (!persistMedia({ gallery: next })) return
                setGallery(next)
              }}
              onError={() => setPhotoError(frasi.schedaFotoNonUtile)}
            />
            </Card>
            {dog.status !== 'attivo' && canChangeDogStatus ? <Button variant="secondary" onClick={() => changeStatus(() => api.restore(dog.id))}>{frasi.caniRipristina}</Button> : null}
            <History dogId={dog.id} appointments={visits.appointments} servicePrices={dog.servicePrices} onSaveClose={saveHistoryClose} onCopyPrice={copyHistoryPrice} />
          </>
        ) : (
          <DogFields
            value={screen}
            onChange={setScreen}
            thresholds={settings.ageThresholds}
            requireOwner={!dog || dog.contact.name.trim() !== ''}
            mostraEmail={funzioneVisibile(piano.stato, piano.funzioni, 'schedaCliente')}
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
      <Dialog open={menuOpen} title={frasi.schedaTitolo} onClose={() => setMenuOpen(false)}>
        {canChangeDogStatus && dog?.status === 'attivo' ? (
          <>
            <SchedaChoice
              label={frasi.caniNonInCura}
              detail={frasi.schedaEsceAttivi}
              ink="var(--warn)"
              wash="var(--warn-s)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={() => askArchive('non_in_cura')}
            />
            <SchedaChoice
              label={frasi.caniDeceduto}
              detail={frasi.schedaArchiviaDecesso}
              ink="var(--sen)"
              wash="var(--sen-s)"
              icon={<Flower2 size={18} strokeWidth={2} />}
              onClick={() => askArchive('deceduto')}
            />
          </>
        ) : null}
        {canChangeDogStatus && dog ? (
          <SchedaChoice
            label={frasi.schedaElimina}
            detail={frasi.schedaCancellaPerm}
            ink="var(--bad)"
            wash="var(--bad-s)"
            icon={<Trash2 size={18} strokeWidth={2} />}
            onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
          />
        ) : null}
      </Dialog>
      <Dialog open={pendingArchive !== null} title={pendingArchive === 'deceduto' ? frasi.caniDeceduto : frasi.caniNonInCura} onClose={() => setPendingArchive(null)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {pendingArchive === 'deceduto' ? deceasedFutureCopy(futureCount, lingua) : `${futureCountText(futureCount, lingua)}.`}
        </p>
        {pendingArchive === 'deceduto' ? (
          <SchedaChoice
            label={frasi.schedaConferma}
            detail={frasi.schedaConfermaDettaglio}
            ink="var(--sen)"
            wash="var(--sen-s)"
            icon={<Flower2 size={18} strokeWidth={2} />}
            onClick={archiveAndCancel}
          />
        ) : (
          <>
            <SchedaChoice
              label={frasi.schedaArchiviaDisdici}
              detail={frasi.schedaFuturiDisdetti}
              ink="var(--warn)"
              wash="var(--warn-s)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={archiveAndCancel}
            />
            <SchedaChoice
              label={frasi.schedaArchiviaSolo}
              detail={frasi.schedaFuturiRestano}
              ink="var(--tx2)"
              wash="var(--surf)"
              icon={<HeartOff size={18} strokeWidth={2} />}
              onClick={archiveOnly}
            />
          </>
        )}
      </Dialog>
      <Dialog open={confirmDelete} title={frasi.schedaElimina} onClose={() => setConfirmDelete(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>
          {dog ? frasi.schedaCancellaNome.replace('{{nome}}', dog.name) : frasi.schedaCancellaScheda}
        </p>
        <SchedaChoice
          label={frasi.schedaElimina}
          detail={frasi.schedaCancellaPerm}
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
          {frasi.homeAnnulla}
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
      <Dialog open={photoSheet} title={frasi.schedaFotoProfilo} onClose={() => setPhotoSheet(false)}>
        {shownPhoto ? <ProfilePreview src={shownPhoto} /> : null}
        <SchedaChoice
          label={frasi.schedaCambia}
          detail={frasi.schedaAltraFoto}
          ink="var(--pri)"
          wash="var(--pri-s)"
          icon={<Camera size={18} strokeWidth={2} />}
          onClick={() => fileRef.current?.click()}
        />
        <SchedaChoice
          label={frasi.schedaIngrandisci}
          detail={frasi.schedaApriFoto}
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
          aria-label={frasi.schedaCambiaFoto}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onClick={(event) => guardCaptureClick(event, () => toast.show(frasi.schedaPermessoFoto, 'plain'))}
          onChange={(event) => {
            void onPhoto(event.target.files?.[0])
            setPhotoSheet(false)
            setPhotoZoom(false)
          }}
        />
      </Dialog>
      <CenteredPhoto src={photoZoom && shownPhoto ? shownPhoto : null} onClose={() => setPhotoZoom(false)} />
    </SchedaFrame>
  )
}
