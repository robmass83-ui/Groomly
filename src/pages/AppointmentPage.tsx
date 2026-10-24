import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Ban, CalendarPlus, Check, Ellipsis, Minus, Pencil, Plus, UserX, X } from 'lucide-react'
import { Link, useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { ExtraNoteList } from '../components/domain/ExtraNoteList'
import { FlagIcon } from '../components/domain/FlagIcon'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { CloseVisitDialog } from '../components/appointment/CloseVisitDialog'
import { Dialog } from '../components/layout/Dialog'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconTile } from '../components/ui/IconTile'
import { KeyValueGrid } from '../components/ui/KeyValueGrid'
import { StatusPill } from '../components/ui/StatusPill'
import { firebaseEnabled } from '../data/firebase/enabled'
import { photosPatch } from '../data/local/appointments'
import { useServices } from '../hooks/useServices'
import { useAppointments } from '../hooks/useAppointments'
import { useClosures } from '../hooks/useClosures'
import { useSettings } from '../hooks/useSettings'
import { useDogs } from '../hooks/useDogs'
import { useFileSrc } from '../hooks/useFileSrc'
import { useSession } from '../hooks/useSession'
import { isSharedEmail, SHARED_SALON_ID, type AccountRole } from '../lib/salonPath'
import type { SalonAccess } from '../lib/salonRoster'
import { appointmentEnd, canComplete, formatBookedWhen, isOverdue, isStartTime, localDayKey, sameClockWeeksLater, sumDuration, sumPrice } from '../lib/appointments'
import { closureOn, type Closure } from '../lib/closures'
import { rhythmChoice } from '../lib/cycle'
import { bumpDataRefresh } from '../lib/dataRefresh'
import { activeServiceIds } from '../lib/monthly'
import { acceptedDay, appointmentBackTarget } from '../lib/sheetRoute'
import { dogPortrait, prepareDogPhoto } from '../lib/dogPhoto'
import { guardCaptureClick } from '../lib/photoCapture'
import { PHOTO_TOO_LARGE, PhotoTooLargeError } from '../lib/photoCodec'
import { shortOwner } from '../lib/display'
import { appointmentKind } from '../lib/personal'
import { formatSpent, type ClosePatch } from '../lib/closeVisit'
import { formatEuro, formatHomeDate, IT_DATE } from '../lib/format'
import { quotedPrice } from '../lib/quote'
import type { AppointmentFormValues } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentPhoto, AppointmentService, AppointmentWrite, CancelReason, CycleAnchor, Dog, DogWrite, Service } from '../types/models'
import { AppointmentForm, type SavePlan } from './AppointmentForm'
import { dogToWrite } from './DogPage'

const fieldStyle: CSSProperties = {
  minHeight: 44,
  height: 'auto',
  boxSizing: 'border-box',
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx)',
  padding: '8px 10px',
  font: 'inherit',
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function acceptedTime(value: string | null): string {
  return value !== null && isStartTime(value) ? value : ''
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
  if (patch.cycleAnchor) write.cycleAnchor = patch.cycleAnchor
  else if (appointment.cycleAnchor) write.cycleAnchor = appointment.cycleAnchor
  if (patch.coveredDue) write.coveredDue = patch.coveredDue
  else if (appointment.coveredDue) write.coveredDue = new Date(appointment.coveredDue.getTime())
  return write
}

function dayLabel(date: Date): string {
  const raw = format(date, 'EEE d MMM', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function frequencyOf(dog: Dog | undefined): number {
  const weeks = dog?.recurrenceWeeks
  return typeof weeks === 'number' && Number.isInteger(weeks) && weeks >= 1 ? weeks : 4
}

function weeksAfter(dog: Dog | undefined, plan: SavePlan | null): number {
  if (plan && plan.nextClientType === 'mensile' && plan.setFrequency) return plan.weeks
  return frequencyOf(dog)
}

function projectDog(dog: Dog, plan: SavePlan | null): Dog {
  if (!plan) return dog
  return { ...dog, clientType: plan.nextClientType, recurrenceWeeks: weeksAfter(dog, plan) }
}

function attachAnchor(write: AppointmentWrite, anchor: CycleAnchor, coveredDue: Date, use: boolean): AppointmentWrite {
  if (!use) {
    const plain = { ...write }
    delete plain.cycleAnchor
    delete plain.coveredDue
    return plain
  }
  return { ...write, cycleAnchor: anchor, coveredDue }
}

type ClosurePending =
  | { kind: 'new'; write: AppointmentWrite; plan: SavePlan | null; freshDog: DogWrite | null }
  | { kind: 'edit'; id: string; write: AppointmentWrite }
  | { kind: 'shift'; appointment: Appointment; minutes: number }
  | { kind: 'restore'; id: string; write: AppointmentWrite }

function closedStartHits(
  closures: Closure[],
  entries: { start: Date; previousDay: string | null }[],
): { start: Date; reason: string }[] {
  const hits: { start: Date; reason: string }[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    const key = localDayKey(entry.start)
    if (seen.has(key) || entry.previousDay === key) continue
    const closure = closureOn(closures, key)
    if (!closure) continue
    seen.add(key)
    hits.push({ start: entry.start, reason: closure.reason })
  }
  return hits
}

function closedSaveMessage(hits: { start: Date; reason: string }[]): string {
  if (hits.length === 1) return `Il salone è chiuso questo giorno (${hits[0].reason}). Salvare lo stesso la visita?`
  const list = hits.flatMap((hit) => [formatHomeDate(hit.start), hit.reason]).join(', ')
  return `Alcuni giorni sono chiusi: ${list}. Salvare lo stesso?`
}

function AppointmentSheet({ title, onClose, footer, children }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  return (
    <Sheet open title={title} onClose={onClose} closeButton footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </Sheet>
  )
}

function weeksFromHere(weeks: number): string {
  const count = Number.isInteger(weeks) && weeks >= 1 ? weeks : 4
  return count === 1 ? '1 settimana a partire da questa data' : `${count} settimane a partire da questa data`
}

function RhythmChoice({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label}, ${detail.charAt(0).toLocaleLowerCase('it-IT')}${detail.slice(1)}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
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
      <span style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{label}</span>
      <span style={{ color: 'var(--tx2)', fontSize: 13, lineHeight: 1.35 }}>{detail}</span>
    </button>
  )
}

function CloseConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <Dialog open title="Chiudere senza salvare?" onClose={onStay}>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="button" onClick={onStay} style={{ flex: 1 }}>Resta</Button>
        <Button type="button" variant="secondary" onClick={onLeave} style={{ flex: 1 }}>Chiudi senza salvare</Button>
      </div>
    </Dialog>
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
          <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))} style={{ border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, minHeight: 44, height: 'auto' }}>
            <Chip>
              {value}
              <X size={10} strokeWidth={2.5} aria-hidden />
            </Chip>
          </button>
        ))}
        {suggestions.filter((item) => !values.includes(item)).map((item) => (
          <button key={item} type="button" onClick={() => onChange(uniqueNames([...values, item]))} style={{ border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, minHeight: 44, height: 'auto' }}>
            <Chip dashed>
              <Plus size={10} strokeWidth={2.5} aria-hidden />
              {item}
            </Chip>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          aria-label={label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ',') return
            event.preventDefault()
            add(draft)
          }}
          style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
        />
        <Button type="button" variant="tonal" size="sm" onClick={() => add(draft)}>Aggiungi</Button>
      </div>
    </div>
  )
}

const workThumbStyle: CSSProperties = { objectFit: 'cover', borderRadius: 8 }

function WorkThumb({ photo, alt }: { photo: string; alt: string }) {
  const shown = useFileSrc(photo, 'thumb')
  return shown ? <img alt={alt} src={shown} width={64} height={64} style={workThumbStyle} /> : <span {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })} style={{ ...workThumbStyle, width: 64, height: 64, display: 'inline-block', background: 'var(--surf)' }} />
}

function PhotoWork({ photos, onAdd }: { photos: AppointmentPhoto[]; onAdd: (file: File | undefined, kind: 'prima' | 'dopo' | 'auto') => void }) {
  const toast = useToast()
  const denyPhoto = () => toast.show('Permesso foto negato', 'plain')
  const primaRef = useRef<HTMLInputElement>(null)
  const dopoRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const prima = photos.find((item) => item.kind === 'prima')
  const dopo = photos.find((item) => item.kind === 'dopo')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontWeight: 600, fontSize: TYPE.base }}>Foto lavoro</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {prima ? <WorkThumb alt="Prima" photo={prima.photo} /> : null}
        {dopo ? <WorkThumb alt="Dopo" photo={dopo.photo} /> : null}
        {photos.filter((item) => item.kind === 'altro').map((item) => (
          <WorkThumb key={item.id} alt="" photo={item.photo} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button type="button" variant="secondary" onClick={() => primaRef.current?.click()}>Prima</Button>
        <Button type="button" variant="secondary" onClick={() => dopoRef.current?.click()}>Dopo</Button>
        <Button type="button" variant="secondary" onClick={() => addRef.current?.click()}>Aggiungi</Button>
      </div>
      <input ref={primaRef} aria-label="Foto prima" type="file" accept="image/*" style={{ display: 'none' }} onClick={(event) => guardCaptureClick(event, denyPhoto)} onChange={(event) => { onAdd(event.target.files?.[0], 'prima'); event.target.value = '' }} />
      <input ref={dopoRef} aria-label="Foto dopo" type="file" accept="image/*" style={{ display: 'none' }} onClick={(event) => guardCaptureClick(event, denyPhoto)} onChange={(event) => { onAdd(event.target.files?.[0], 'dopo'); event.target.value = '' }} />
      <input ref={addRef} aria-label="Aggiungi foto" type="file" accept="image/*" style={{ display: 'none' }} onClick={(event) => guardCaptureClick(event, denyPhoto)} onChange={(event) => { onAdd(event.target.files?.[0], 'auto'); event.target.value = '' }} />
    </div>
  )
}

const REASON_TEXT: Record<CancelReason, string> = {
  cliente: 'dal cliente',
  salone: 'dal salone',
  deceduto: 'perché il cane è deceduto',
}

function statusLabel(appointment: Appointment, overdue: boolean): string | null {
  if (appointment.status === 'completato') return 'Completato'
  if (appointment.status === 'non_venuto') return 'Non venuto'
  if (appointment.status === 'disdetto') return appointment.cancelReason ? `Disdetto ${REASON_TEXT[appointment.cancelReason]}` : 'Disdetto'
  return overdue ? 'Da chiudere' : null
}

const fullButton: CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const sheetChoice: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 44,
  height: 'auto',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left',
  padding: '8px 0',
}

function AppointmentRead({
  appointment,
  dog,
  services,
  now,
  confirming,
  futureBooked,
  toolChoices,
  productChoices,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onBookNext,
  onShift,
  onDisdici,
  onNoShow,
  onSaveClose,
  onSaveServices,
  onTokens,
  onStyle,
  onPhoto,
  onAddNote,
  onRemoveNote,
}: {
  appointment: Appointment
  dog: Dog | undefined
  services: Service[]
  now: Date
  confirming: boolean
  futureBooked: Appointment | null
  toolChoices: string[]
  productChoices: string[]
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onBookNext: () => void
  onShift: (minutes: number) => void
  onDisdici: (reason: 'cliente' | 'salone') => void
  onNoShow: () => void
  onSaveClose: (patch: ClosePatch, complete: boolean) => boolean
  onSaveServices: (lines: AppointmentService[]) => void
  onTokens: (key: 'tools' | 'products', values: string[]) => void
  onStyle: (values: string[]) => void
  onPhoto: (file: File | undefined, kind: 'prima' | 'dopo' | 'auto') => void
  onAddNote: (text: string) => void
  onRemoveNote: (id: string) => void
}) {
  const [serviceEdit, setServiceEdit] = useState(false)
  const [closing, setClosing] = useState<'complete' | 'correct' | null>(null)
  const [menu, setMenu] = useState(false)
  const [asking, setAsking] = useState<'disdici' | 'prossimo' | null>(null)
  const done = appointment.status === 'completato'
  const scheduled = appointment.status === 'programmato'
  const [notesOpen, setNotesOpen] = useState(done)
  useEffect(() => {
    if (done) setNotesOpen(true)
  }, [done])
  const phone = dog?.contact.phone ?? ''
  const total = appointment.total ?? sumPrice(appointment.services)
  const styles = (appointment.cutStyle ?? '').split(',').map((item) => item.trim()).filter((item) => item !== '')
  const active = services.filter((service) => service.active).sort((a, b) => a.order - b.order)
  const status = statusLabel(appointment, isOverdue(appointment, now))
  const completable = canComplete(appointment.start, now)

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

  function bookNext() {
    if (futureBooked) {
      setAsking('prossimo')
      return
    }
    onBookNext()
  }

  const end = appointmentEnd(appointment.start, appointment.services)
  const minutes = sumDuration(appointment.services)
  const quoted = sumPrice(appointment.services)
  const spent = appointment.actualDurationMin ?? minutes

  function commitClose(patch: ClosePatch, complete: boolean) {
    if (onSaveClose(patch, complete)) setClosing(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
          {dog ? (
            <Link
              to={`/animali/${dog.id}`}
              aria-label="Apri scheda"
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
            >
              <DogAvatar alt="" src={dogPortrait(dog)} size="md" species={dog.species} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: TYPE.dogName, fontWeight: 700, ...USER_TEXT }}>{dog.name}</span>
                  <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.title} />
                  {dog.isSenior || dog.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} /> : null}
                  {dog.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} /> : null}
                </div>
                <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>
                  {[dog.breed.trim(), shortOwner(dog.contact.name)].filter((part) => part !== '').join(' · ')}
                </div>
              </div>
              <span style={{ color: 'var(--pri)', fontWeight: 600, fontSize: TYPE.meta, whiteSpace: 'nowrap' }}>Apri scheda</span>
            </Link>
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DogAvatar alt="" src={undefined} size="md" />
              <span style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>Cane assente</span>
            </div>
          )}
          <button
            type="button"
            aria-label="Altre azioni"
            onClick={() => setMenu(true)}
            style={{ width: SIZES.headerIconBtn, height: SIZES.headerIconBtn, borderRadius: SIZES.headerIconRadius, border: 0, background: 'var(--surf)', color: 'var(--tx2)', display: 'grid', placeItems: 'center', padding: 0 }}
          >
            <Ellipsis size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </Card>
      <KeyValueGrid
        items={[
          { label: 'Data', value: dayLabel(appointment.start) },
          { label: 'Orario', value: `${clock(appointment.start)}–${clock(end)}` },
          { label: 'Durata', value: `${minutes} min` },
          { label: 'Telefono', value: phone.trim() || '—' },
        ]}
      />
      {status && !done ? <StatusPill tone={appointment.status === 'non_venuto' || appointment.status === 'disdetto' ? 'bad' : 'warn'}>{status}</StatusPill> : null}
      {dog?.criticalNote ? (
        <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderLeft: '3px solid var(--bad)', borderRadius: 8, padding: 8, ...USER_TEXT }}>
          {dog.criticalNote}
        </p>
      ) : null}
      {appointmentKind(appointment) !== 'personale' ? (
        <ExtraNoteList notes={appointment.extraNotes ?? []} onAdd={onAddNote} onRemove={onRemoveNote} />
      ) : null}
      <Card style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" aria-label="Servizi" onClick={() => setServiceEdit((current) => !current)} style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0, width: '100%' }}>
          {appointment.services.map((service) => {
            const catalog = services.find((item) => item.id === service.serviceId)
            return (
              <span key={service.serviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: TYPE.base }}>
                <IconTile tone={catalog?.iconKey ?? 'prim'} size="sm">
                  <ServiceIcon iconKey={catalog?.iconKey} size={SIZES.chip.serviceIconInChip} />
                </IconTile>
                <span style={{ flex: 1, minWidth: 0, ...USER_TEXT }}>{service.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatEuro(service.price)}</span>
              </span>
            )
          })}
        </button>
        {serviceEdit ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {active.map((service) => {
              const pressed = appointment.services.some((line) => line.serviceId === service.id)
              return (
                <button key={service.id} type="button" aria-pressed={pressed} onClick={() => toggleService(service)} style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: '100%', minHeight: 44, height: 'auto', border: '1px solid var(--line)', borderRadius: 999, background: pressed ? 'var(--surf)' : 'transparent', color: 'var(--tx)', fontWeight: 600, padding: '8px 12px', ...USER_TEXT }}>
                  <span aria-hidden="true" style={{ flex: 'none', display: 'inline-flex' }}><ServiceIcon iconKey={service.iconKey} size={SIZES.chip.serviceIconInChip} /></span>
                  {service.name}
                </button>
              )
            })}
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: '1px dashed var(--line)', paddingTop: 6, fontWeight: 700, fontSize: TYPE.dogName }}>
          <span>Totale</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEuro(total)}</span>
        </div>
      </Card>
      {done ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: TYPE.base }}>
            <span style={{ fontWeight: 600 }}>Tempo impiegato</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatSpent(spent)}</span>
          </div>
          {appointment.adjustmentNote ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{appointment.adjustmentNote}</p> : null}
          <Button type="button" variant="secondary" size="sm" onClick={() => setClosing('correct')} style={{ alignSelf: 'flex-start' }}>Correggi</Button>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <button
            type="button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((current) => !current)}
            style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 700, padding: 0, minHeight: 44, height: 'auto' }}
          >
            <span>Note del lavoro</span>
            <span aria-hidden="true">{notesOpen ? '−' : '+'}</span>
          </button>
          {done ? <StatusPill tone="ok">Completato</StatusPill> : null}
        </div>
        {notesOpen ? (
          <>
            <TokenField label="Strumenti" values={appointment.tools ?? []} suggestions={toolChoices} onChange={(values) => onTokens('tools', values)} />
            <TokenField label="Prodotti" values={appointment.products ?? []} suggestions={productChoices} onChange={(values) => onTokens('products', values)} />
            <TokenField label="Stile" values={styles} suggestions={[]} onChange={onStyle} />
            <PhotoWork photos={appointment.photos ?? []} onAdd={onPhoto} />
          </>
        ) : null}
      </div>
      {done ? (
        <Button type="button" variant="primary" size="lg" onClick={bookNext} style={fullButton}>
          <CalendarPlus size={16} strokeWidth={2} aria-hidden />
          Fissa il prossimo
        </Button>
      ) : null}
      {scheduled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <Button type="button" variant="tonal" onClick={() => onShift(-15)} style={fullButton}>
            <Minus size={16} strokeWidth={2} aria-hidden />
            Anticipa −15
          </Button>
          <Button type="button" variant="tonal" onClick={() => onShift(15)} style={fullButton}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Posticipa +15
          </Button>
          <Button type="button" variant="tonal" onClick={onEdit} style={fullButton}>
            <Pencil size={16} strokeWidth={2} aria-hidden />
            Modifica
          </Button>
          <Button type="button" variant="secondary" onClick={onNoShow} style={fullButton}>
            <UserX size={16} strokeWidth={2} aria-hidden />
            Non venuto
          </Button>
          <Button type="button" variant="bad" onClick={() => setAsking('disdici')} style={fullButton}>
            <Ban size={16} strokeWidth={2} aria-hidden />
            Disdici
          </Button>
          <Button type="button" variant="primary" size="lg" onClick={() => { if (completable) setClosing('complete') }} disabled={!completable} style={{ ...fullButton, opacity: completable ? 1 : 0.4 }}>
            <Check size={16} strokeWidth={2} aria-hidden />
            Completato
          </Button>
        </div>
      ) : null}
      {closing ? (
        <CloseVisitDialog
          key={`${closing}-${appointment.id}-${appointment.updatedAt.getTime()}`}
          open
          mode={closing}
          quotedPrice={quoted}
          quotedMinutes={minutes}
          initialPrice={appointment.total ?? quoted}
          initialMinutes={spent}
          initialNote={appointment.adjustmentNote ?? ''}
          initialPayment={appointment.paymentMethod ?? null}
          onClose={() => setClosing(null)}
          onNone={(patch) => commitClose(patch, closing === 'complete')}
          onSave={(patch) => commitClose(patch, closing === 'complete')}
        />
      ) : null}
      <Sheet open={menu} title="Altre azioni" onClose={() => setMenu(false)} closeLabel="Indietro">
        <button type="button" style={{ ...sheetChoice, color: 'var(--bad)' }} onClick={() => { setMenu(false); onAskDelete() }}>Elimina</button>
      </Sheet>
      <Sheet open={confirming} title="Eliminare questo appuntamento?" onClose={onCancelDelete} closeLabel="Indietro">
        <p style={{ margin: 0, fontSize: TYPE.base }}>Sparisce anche dallo storico.</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button type="button" onClick={onCancelDelete} style={{ flex: 1 }}>Tieni</Button>
          <Button type="button" variant="bad" onClick={onConfirmDelete} style={{ flex: 1, color: 'var(--bad)' }}>Elimina</Button>
        </div>
      </Sheet>
      <Sheet open={asking === 'disdici'} title="Chi disdice?" onClose={() => setAsking(null)} closeLabel="Indietro">
        <div style={{ display: 'flex', gap: 6 }}>
          <Button type="button" onClick={() => { setAsking(null); onDisdici('cliente') }} style={{ flex: 1 }}>Cliente</Button>
          <Button type="button" onClick={() => { setAsking(null); onDisdici('salone') }} style={{ flex: 1 }}>Salone</Button>
        </div>
      </Sheet>
      <Sheet open={asking === 'prossimo'} title="Appuntamento già fissato" onClose={() => setAsking(null)} closeLabel="Indietro">
        <p style={{ margin: 0, fontSize: TYPE.base, ...USER_TEXT }}>{`${dog?.name ?? 'Il cane'} ha già un appuntamento il ${futureBooked ? format(futureBooked.start, 'd MMM', IT_DATE) : ''}. Crearne un altro?`}</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button type="button" onClick={() => { setAsking(null); onBookNext() }} style={{ flex: 1 }}>Crea</Button>
          <Button type="button" variant="secondary" onClick={() => setAsking(null)} style={{ flex: 1 }}>Non creare</Button>
        </div>
      </Sheet>
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
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const ownerUid = account?.salonId ? account.salonId : uid
  const sessionRole: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  const salonId = !account ? '' : (account.salonId || (isSharedEmail(account.email) ? SHARED_SALON_ID : account.uid))
  const [access, setAccess] = useState<SalonAccess>({ enabled: false, members: [], openInviteExpiries: [] })
  const dogsApi = useDogs(uid)
  const { dogs } = dogsApi
  const saveDog = dogsApi.saveExisting
  const { appointments, saveNew, saveExisting, saveClose, setStatus, remove, stageDetails, lastCreatedId } = useAppointments(uid)
  const { closures } = useClosures(uid)
  const { settings: storedSettings } = useSettings()
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const now = new Date()
  const cane = searchParams.get('cane')
  const day = acceptedDay(searchParams.get('data'), now)
  const fromNext = searchParams.get('da') === 'prossimo'
  const serie = searchParams.get('serie')
  const closeTo = appointmentBackTarget(location.search, (dogId) => dogs.some((dog) => dog.id === dogId), now)
  useEffect(() => {
    if (!firebaseEnabled()) return
    if (salonId === '' || salonId === SHARED_SALON_ID) return
    let cancelled = false
    let stopAccess = () => {}
    void import('../data/firebase/client').then(async (mod) => {
      try {
        const stop = await mod.watchSalonAccess(salonId, (next) => {
          if (!cancelled) setAccess(next)
        })
        if (cancelled) stop()
        else stopAccess = stop
      } catch {
        if (!cancelled) setAccess({ enabled: false, members: [], openInviteExpiries: [] })
      }
    }).catch(() => {
      if (!cancelled) setAccess({ enabled: false, members: [], openInviteExpiries: [] })
    })
    return () => {
      cancelled = true
      stopAccess()
    }
  }, [salonId])

  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [closureAsk, setClosureAsk] = useState<{ message: string; pending: ClosurePending } | null>(null)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [formFooter, setFormFooter] = useState<ReactNode>(null)
  const [rhythm, setRhythm] = useState<{
    write: AppointmentWrite
    plan: SavePlan | null
    freshDog: DogWrite | null
    editingId: string | null
    choice: NonNullable<ReturnType<typeof rhythmChoice>>
  } | null>(null)
  const confirmingRef = useRef(false)
  const dirtyRef = useRef(false)
  const leaving = useRef(false)
  const kept = useRef<{ dayKey: string; anchor: CycleAnchor; coveredDue: number } | null>(null)
  const settings = uid ? storedSettings : null
  const recentDogIds = settings ? settings.recentDogIds : []

  const blocker = useBlocker(() => !leaving.current && (dirtyRef.current || confirmingRef.current))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    blocker.reset()
    requestClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker])

  function showConfirm(open: boolean) {
    confirmingRef.current = open
    setConfirmingClose(open)
  }

  function closeSheet() {
    leaving.current = true
    if (location.key === 'default') navigate(closeTo, { replace: true })
    else navigate(-1)
  }

  function requestClose() {
    if (confirmingRef.current) {
      showConfirm(false)
      return
    }
    if (dirtyRef.current) {
      showConfirm(true)
      return
    }
    closeSheet()
  }

  function setDirty(dirty: boolean) {
    dirtyRef.current = dirty
  }

  const confirmBox = confirmingClose ? <CloseConfirm onStay={() => showConfirm(false)} onLeave={closeSheet} /> : null
  const toolChoices = uniqueNames(['Tosatrice', 'Shampoo', 'Profumo', ...appointments.flatMap((item) => item.tools ?? [])])
  const productChoices = uniqueNames(appointments.flatMap((item) => item.products ?? []))

  function save(write: AppointmentWrite, plan: SavePlan | null, freshDog: DogWrite | null, bypass = false) {
    if (!write.seriesId && serie && write.dogId === cane) write = { ...write, seriesId: serie }
    const dog = freshDog ? undefined : dogs.find((item) => item.id === write.dogId)
    if (dog) {
      const choice = rhythmChoice(projectDog(dog, plan), appointments, new Date(), write.start, weeksAfter(dog, plan))
      const dayKey = localDayKey(write.start)
      if (choice && !(kept.current && kept.current.dayKey === dayKey && kept.current.coveredDue === choice.coveredDue.getTime())) {
        setRhythm({ write, plan, freshDog, editingId: null, choice })
        return
      }
      if (choice && kept.current) {
        write = attachAnchor(write, kept.current.anchor, choice.coveredDue, true)
      }
    }
    const choice: SavePlan = plan ?? { count: 1, nextClientType: 'occasionale', weeks: 4, setFrequency: false }
    const starts = choice.count === 2 ? [write.start, sameClockWeeksLater(write.start, choice.weeks)] : [write.start]
    if (!bypass) {
      const hits = closedStartHits(closures, starts.map((start) => ({ start, previousDay: null })))
      if (hits.length > 0) {
        setClosureAsk({ message: closedSaveMessage(hits), pending: { kind: 'new', write, plan, freshDog } })
        return
      }
    }
    let createdDogId: string | null = null
    let dogId = write.dogId
    if (freshDog) {
      if (!dogsApi.saveNew(freshDog) || !dogsApi.lastCreatedId.current) {
        toast.show('Salvataggio non riuscito', 'plain')
        return
      }
      createdDogId = dogsApi.lastCreatedId.current
      dogId = createdDogId
    }
    const seriesId = choice.count === 2 ? crypto.randomUUID() : undefined
    const createdIds: string[] = []
    function undoCreated() {
      for (const created of createdIds) remove(created)
      if (createdDogId) dogsApi.remove(createdDogId)
    }
    for (const [index, start] of starts.entries()) {
      const item: AppointmentWrite = index === 0 ? { ...write, dogId, start } : attachAnchor({ ...write, dogId, start }, 'visita', write.start, false)
      if (seriesId) item.seriesId = seriesId
      if (index > 0) delete item.extraNotes
      const saved = saveNew(item) ? lastCreatedId.current : null
      if (!saved) {
        undoCreated()
        toast.show('Salvataggio non riuscito', 'plain')
        return
      }
      createdIds.push(saved)
    }
    let restoreDog: { id: string; write: DogWrite } | null = null
    if (dog) {
      const typeChanges = choice.nextClientType !== dog.clientType
      const weeksChange = choice.nextClientType === 'mensile' && choice.setFrequency && dog.recurrenceWeeks !== choice.weeks
      if (typeChanges || weeksChange) {
        const before = dogToWrite(dog, dog.servicePrices)
        if (!saveDog(dog.id, { ...before, clientType: choice.nextClientType, recurrenceWeeks: choice.weeks })) {
          undoCreated()
          toast.show('Salvataggio non riuscito', 'plain')
          return
        }
        restoreDog = { id: dog.id, write: before }
      }
    }
    const start = write.start
    toast.show(
      `Appuntamento salvato per ${formatBookedWhen(start)}`,
      'ok',
      {
        label: 'Annulla',
        onClick: () => {
          let ok = true
          for (const created of createdIds) ok = remove(created) && ok
          if (ok && createdDogId) ok = dogsApi.remove(createdDogId)
          if (ok && restoreDog) ok = saveDog(restoreDog.id, restoreDog.write)
          if (!ok) toast.show('Salvataggio non riuscito', 'plain')
          bumpDataRefresh()
        },
      },
      { label: 'Vedi', onClick: () => navigate(`/calendario?data=${localDayKey(start)}`) },
    )
    kept.current = null
    closeSheet()
  }

  function saveEdit(appointmentId: string, write: AppointmentWrite, bypass = false) {
    const current = appointments.find((item) => item.id === appointmentId)
    const dog = current ? dogs.find((item) => item.id === current.dogId) : undefined
    let nextWrite = current?.seriesId && !write.seriesId ? { ...write, seriesId: current.seriesId } : write
    if (current && dog) {
      const choice = rhythmChoice(dog, appointments, new Date(), nextWrite.start, frequencyOf(dog), current.id)
      const dayChanged = localDayKey(nextWrite.start) !== localDayKey(current.start)
      const dayKey = localDayKey(nextWrite.start)
      if (dayChanged && choice && !(kept.current && kept.current.dayKey === dayKey && kept.current.coveredDue === choice.coveredDue.getTime())) {
        setRhythm({ write: nextWrite, plan: null, freshDog: null, editingId: appointmentId, choice })
        return
      }
      if (!dayChanged && current.cycleAnchor && current.coveredDue) {
        nextWrite = attachAnchor(nextWrite, current.cycleAnchor, current.coveredDue, true)
      } else if (choice && kept.current) {
        nextWrite = attachAnchor(nextWrite, kept.current.anchor, choice.coveredDue, true)
      } else {
        nextWrite = attachAnchor(nextWrite, 'visita', nextWrite.start, false)
      }
    }
    if (!bypass) {
      const hits = closedStartHits(closures, [{ start: nextWrite.start, previousDay: current ? localDayKey(current.start) : null }])
      if (hits.length > 0) {
        setClosureAsk({ message: closedSaveMessage(hits), pending: { kind: 'edit', id: appointmentId, write: nextWrite } })
        return
      }
    }
    if (!saveExisting(appointmentId, nextWrite)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    kept.current = null
    toast.show('Salvato', 'ok')
    setEditing(false)
  }

  function commitRhythm(anchor: CycleAnchor) {
    const pending = rhythm
    if (!pending) return
    kept.current = {
      dayKey: localDayKey(pending.write.start),
      anchor,
      coveredDue: pending.choice.coveredDue.getTime(),
    }
    const write = attachAnchor(pending.write, anchor, pending.choice.coveredDue, true)
    setRhythm(null)
    if (pending.editingId) saveEdit(pending.editingId, write)
    else save(write, pending.plan, pending.freshDog)
  }

  function confirmDelete(appointment: Appointment) {
    if (!remove(appointment.id)) {
      toast.show('Salvataggio non riuscito', 'plain')
      setConfirmingDelete(false)
      return
    }
    leaving.current = true
    navigate(`/calendario?data=${localDayKey(appointment.start)}`, { replace: true })
  }

  function saveCloseOf(appointment: Appointment, patch: ClosePatch, complete: boolean): boolean {
    if (complete && !canComplete(appointment.start, new Date())) return false
    if (!saveClose(appointment.id, patch, complete)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return false
    }
    return true
  }

  function shiftStart(appointment: Appointment, minutes: number, bypass = false) {
    const previous = new Date(appointment.start.getTime())
    const next = new Date(previous.getTime() + minutes * 60_000)
    if (!bypass) {
      const hits = closedStartHits(closures, [{ start: next, previousDay: localDayKey(appointment.start) }])
      if (hits.length > 0) {
        setClosureAsk({ message: closedSaveMessage(hits), pending: { kind: 'shift', appointment, minutes } })
        return
      }
    }
    if (!saveExisting(appointment.id, coreWrite(appointment, { start: next }))) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show(`Spostato alle ${clock(next)}`, 'plain', {
      label: 'Annulla',
      onClick: () => {
        const restored = coreWrite(appointment, { start: previous })
        const hits = closedStartHits(closures, [{ start: previous, previousDay: localDayKey(next) }])
        if (hits.length > 0) {
          setClosureAsk({ message: closedSaveMessage(hits), pending: { kind: 'restore', id: appointment.id, write: restored } })
          return
        }
        if (!saveExisting(appointment.id, restored)) {
          toast.show('Salvataggio non riuscito', 'plain')
        }
      },
    })
  }

  function bookNext(appointment: Appointment) {
    const ids = appointment.services.map((line) => line.serviceId).join(',')
    const params = new URLSearchParams({ da: 'prossimo', cane: appointment.dogId, servizi: ids })
    if (appointment.seriesId) params.set('serie', appointment.seriesId)
    navigate('/appuntamenti/nuovo?' + params.toString())
  }

  function restoreScheduled(appointmentId: string) {
    if (!setStatus(appointmentId, 'programmato')) toast.show('Salvataggio non riuscito', 'plain')
  }

  function disdici(appointment: Appointment, reason: Exclude<CancelReason, 'deceduto'>) {
    if (!setStatus(appointment.id, 'disdetto', reason)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Appuntamento disdetto', 'plain', { label: 'Annulla', onClick: () => restoreScheduled(appointment.id) }, undefined, 5000)
  }

  function noShow(appointment: Appointment) {
    if (!setStatus(appointment.id, 'non_venuto')) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Non venuto', 'plain', { label: 'Annulla', onClick: () => restoreScheduled(appointment.id) }, undefined, 5000)
  }

  function applyTokens(appointment: Appointment, key: 'tools' | 'products', values: string[]) {
    if (!stageDetails(appointment.id, { [key]: values }) || !saveExisting(appointment.id, coreWrite(appointment))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function applyStyle(appointment: Appointment, values: string[]) {
    const cutStyle = values.join(', ')
    if (!stageDetails(appointment.id, { cutStyle }) || !saveExisting(appointment.id, coreWrite(appointment))) {
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
      const replaced = nextKind === 'altro' ? [] : current.filter((item) => item.kind === nextKind).map((item) => item.id)
      const next = nextKind === 'altro'
        ? [...current, { id: crypto.randomUUID(), photo, kind: 'altro' as const }]
        : [...current.filter((item) => item.kind !== nextKind), { id: crypto.randomUUID(), photo, kind: nextKind }]
      if (!stageDetails(appointment.id, photosPatch(appointment, next, replaced)) || !saveExisting(appointment.id, coreWrite(appointment))) {
        toast.show('Salvataggio non riuscito', 'plain')
      }
    } catch (error) {
      toast.show(error instanceof PhotoTooLargeError ? PHOTO_TOO_LARGE : 'Foto non utilizzabile', 'plain')
    }
  }

  function saveServices(appointment: Appointment, lines: AppointmentService[]) {
    if (!saveExisting(appointment.id, coreWrite(appointment, { services: lines }))) {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function saveVisitNotes(appointment: Appointment, extraNotes: NonNullable<AppointmentWrite['extraNotes']>) {
    const write = coreWrite(appointment)
    write.extraNotes = extraNotes
    if (!saveExisting(appointment.id, write)) toast.show('Salvataggio non riuscito', 'plain')
  }

  function addVisitNote(appointment: Appointment, text: string) {
    const previous = (appointment.extraNotes ?? []).map((note) => ({
      id: note.id,
      text: note.text,
      createdAt: new Date(note.createdAt),
    }))
    saveVisitNotes(appointment, [...previous, { id: crypto.randomUUID(), text, createdAt: new Date() }])
  }

  function removeVisitNote(appointment: Appointment, noteId: string) {
    const next = (appointment.extraNotes ?? [])
      .filter((note) => note.id !== noteId)
      .map((note) => ({ id: note.id, text: note.text, createdAt: new Date(note.createdAt) }))
    saveVisitNotes(appointment, next)
  }

  function confirmClosure() {
    const pending = closureAsk?.pending
    setClosureAsk(null)
    if (!pending) return
    if (pending.kind === 'new') save(pending.write, pending.plan, pending.freshDog, true)
    else if (pending.kind === 'edit') saveEdit(pending.id, pending.write, true)
    else if (pending.kind === 'restore') {
      if (!saveExisting(pending.id, pending.write)) toast.show('Salvataggio non riuscito', 'plain')
    } else shiftStart(pending.appointment, pending.minutes, true)
  }

  function withRhythm(sheet: ReactNode) {
    return (
      <>
        {sheet}
        {confirmBox}
        <Dialog open={rhythm !== null} title="Cane Mensile" onClose={() => setRhythm(null)}>
          {rhythm ? (
            <>
              <p style={{ margin: 0, fontSize: TYPE.base, lineHeight: 1.4 }}>Far ripartire la frequenza mensile da questa data?</p>
              <RhythmChoice
                label="Sì"
                detail={weeksFromHere(weeksAfter(dogs.find((item) => item.id === rhythm.write.dogId), rhythm.plan))}
                onClick={() => commitRhythm('visita')}
              />
              <RhythmChoice
                label="No"
                detail="Tiene la frequenza impostata con la data precedente"
                onClick={() => commitRhythm('ritmo')}
              />
            </>
          ) : null}
        </Dialog>
        <Dialog open={closureAsk !== null} title="Salone chiuso" onClose={() => setClosureAsk(null)}>
          <p style={{ margin: 0, fontSize: TYPE.base, lineHeight: 1.4 }}>{closureAsk?.message}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button type="button" variant="secondary" onClick={() => setClosureAsk(null)} style={{ flex: 1 }}>Indietro</Button>
            <Button type="button" onClick={confirmClosure} style={{ flex: 1 }}>Salva lo stesso</Button>
          </div>
        </Dialog>
      </>
    )
  }

  if (id) {
    const appointment = appointments.find((item) => item.id === id)
    if (!appointment) {
      return withRhythm(
        <AppointmentSheet title="Appuntamento" onClose={requestClose}>
          <p style={{ margin: 0, color: 'var(--tx3)' }}>Appuntamento assente</p>
        </AppointmentSheet>,
      )
    }
    if (editing) {
      const initial: AppointmentFormValues = {
        dogId: appointment.dogId,
        serviceIds: appointment.services.map((service) => service.serviceId),
        day: localDayKey(appointment.start),
        time: clock(appointment.start),
      }
      return withRhythm(
        <AppointmentSheet title="Appuntamento" onClose={requestClose} footer={formFooter}>
          <AppointmentForm
            dogs={dogs}
            services={services}
            appointments={appointments}
            ignoreId={appointment.id}
            initial={initial}
            initialNotes={appointment.extraNotes}
            recentDogIds={recentDogIds}
            onDirtyChange={setDirty}
            onFooter={setFormFooter}
            onSubmit={(write) => saveEdit(appointment.id, write)}
            assignee={{ access, ownerUid, sessionUid: uid, role: sessionRole }}
          />
        </AppointmentSheet>,
      )
    }
    const futureBooked = appointments
      .filter((item) => item.id !== appointment.id && item.dogId === appointment.dogId && item.status === 'programmato' && item.start.getTime() >= now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))[0] ?? null
    return withRhythm(
      <AppointmentSheet title="Appuntamento" onClose={requestClose}>
        <AppointmentRead
          appointment={appointment}
          dog={dogs.find((dog) => dog.id === appointment.dogId)}
          services={services}
          now={now}
          confirming={confirmingDelete}
          futureBooked={futureBooked}
          toolChoices={toolChoices}
          productChoices={productChoices}
          onEdit={() => { setConfirmingDelete(false); setFormFooter(null); setEditing(true) }}
          onAskDelete={() => setConfirmingDelete(true)}
          onCancelDelete={() => setConfirmingDelete(false)}
          onConfirmDelete={() => confirmDelete(appointment)}
          onBookNext={() => bookNext(appointment)}
          onShift={(minutes) => shiftStart(appointment, minutes)}
          onDisdici={(reason) => disdici(appointment, reason)}
          onNoShow={() => noShow(appointment)}
          onSaveClose={(patch, complete) => saveCloseOf(appointment, patch, complete)}
          onSaveServices={(lines) => saveServices(appointment, lines)}
          onTokens={(key, values) => applyTokens(appointment, key, values)}
          onStyle={(values) => applyStyle(appointment, values)}
          onPhoto={(file, kind) => { void addPhoto(appointment, file, kind) }}
          onAddNote={(text) => addVisitNote(appointment, text)}
          onRemoveNote={(noteId) => removeVisitNote(appointment, noteId)}
        />
      </AppointmentSheet>,
    )
  }

  const fromMonthly = searchParams.get('da') === 'mensili'
  const quotedTime = acceptedTime(searchParams.get('ora'))
  const initial: AppointmentFormValues = {
    dogId: dogs.find((dog) => dog.id === cane && dog.status === 'attivo')?.id ?? '',
    serviceIds: activeServiceIds((searchParams.get('servizi') ?? '').split(','), services),
    day: fromNext ? '' : (day ?? localDayKey(now)),
    time: fromNext ? '' : (quotedTime || (fromMonthly || cane !== null ? '' : '09:00')),
  }

  return withRhythm(
    <AppointmentSheet title="Nuovo appuntamento" onClose={requestClose} footer={formFooter}>
      <AppointmentForm
        dogs={dogs}
        services={services}
        appointments={appointments}
        initial={initial}
        recentDogIds={recentDogIds}
        onDirtyChange={setDirty}
        onFooter={setFormFooter}
        onSubmit={save}
        assignee={{ access, ownerUid, sessionUid: uid, role: sessionRole }}
      />
    </AppointmentSheet>,
  )
}
