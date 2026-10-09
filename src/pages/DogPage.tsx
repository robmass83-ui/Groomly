import { MoreVertical, Phone } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { SectionTitle } from '../components/ui/SectionTitle'
import { listDogs } from '../data/local/dogs'
import { getSettings, rememberDog } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { AGE_LABEL, ARCHIVE_LABEL, SEX_LABEL } from '../lib/dogList'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { ageText, formatCompactDuration, splitCritical } from '../lib/display'
import { formatEuro } from '../lib/format'
import { quotedPrice } from '../lib/quote'
import { dogServiceQuoteSchema } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, Dog, DogContact, DogDraft, DogServicePrice, DogSize, DogWrite, Service } from '../types/models'
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

function writeFromScreen(draft: DogDraft, dog: Dog | undefined, photo: string | undefined, prices: DogServicePrice[], hidden: string[]): DogWrite {
  const write: DogWrite = {
    ...draft,
    photo: photo ?? dog?.photo,
    servicePrices: prices,
    hiddenServiceIds: [...hidden],
  }
  if (!dog) return write
  write.tags = [...dog.tags]
  write.customFields = dog.customFields.map((field) => ({ ...field }))
  write.gallery = dog.gallery.map((item) => ({ ...item }))
  write.contacts = mergeContacts(dog.contacts, draft.contact)
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

export function DogPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
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
  const fileRef = useRef<HTMLInputElement>(null)
  const rememberSize = useCallback((next: DogSize) => {
    setSize(next)
  }, [])

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  useEffect(() => {
    setSize(dog?.size ?? 'piccola')
    setHidden(dog ? [...dog.hiddenServiceIds] : [])
    setEdits({})
    setQuoteError(null)
  }, [id, dog])

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
    const write = writeFromScreen(draft, dog, photo, parsed.prices, hidden)
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    if (!dog && api.lastCreatedId.current) {
      navigate(`/animali/${api.lastCreatedId.current}`, { replace: true })
      return
    }
    setEditing(false)
    setPhoto(undefined)
    setPhotoError(null)
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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => { setPhotoError(null); setEditing(true) }}>Modifica</Button>
              <Button style={{ flex: 1 }} disabled>Salva</Button>
            </div>
            {dog.status !== 'attivo' ? <Button variant="ghost" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button> : null}
          </>
        ) : (
          <>
            <PhotoBlock src={shownPhoto} onFile={(file) => void onPhoto(file)} onEnlarge={shownPhoto ? () => { setPhotoZoom(false); setPhotoSheet(true) } : undefined} />
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <DogFields
              initial={dog}
              onSubmit={save}
              onSize={rememberSize}
              extras={(
                <>
                  {prices}
                  {quoteError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{quoteError}</p> : null}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" style={{ flex: 1 }} onClick={() => setEditing(true)}>Modifica</Button>
                    <Button type="submit" style={{ flex: 1 }}>Salva</Button>
                  </div>
                </>
              )}
            />
          </>
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
