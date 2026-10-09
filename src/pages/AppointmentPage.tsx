import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { ensureServiceSeed } from '../data/local/services'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { formatBookedWhen, formatDuration, isStartTime, localDayKey, parseDayParam, shiftWeeks, sumDuration, sumPrice } from '../lib/appointments'
import { activeServiceIds } from '../lib/monthly'
import { formatEuro, formatHomeDate } from '../lib/format'
import type { AppointmentFormValues } from '../lib/schemas'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, AppointmentWrite, Dog } from '../types/models'
import { AppointmentForm } from './AppointmentForm'

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

export function AppointmentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments, saveNew, saveExisting, complete, remove, lastCreatedId } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const cane = searchParams.get('cane')
  const day = acceptedDay(searchParams.get('data'), now)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function save(write: AppointmentWrite) {
    if (!saveNew(write)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    navigate(`/appuntamenti/${lastCreatedId.current}`, { replace: true })
  }

  function saveEdit(appointmentId: string, write: AppointmentWrite) {
    if (!saveExisting(appointmentId, write)) {
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

  function markDone(appointmentId: string) {
    if (!complete(appointmentId)) toast.show('Salvataggio non riuscito', 'plain')
  }

  function bookWeeks(appointment: Appointment, weeks: 2 | 4 | 6) {
    const start = shiftWeeks(appointment.start, weeks)
    const saved = saveNew({
      dogId: appointment.dogId,
      start,
      services: appointment.services.map((line) => ({ ...line })),
    })
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

  if (id) {
    const appointment = appointments.find((item) => item.id === id)
    if (!appointment) {
      return (
        <PhoneShell>
          <Header title="Appuntamento" backTo="/" />
          <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Appuntamento assente</p>
        </PhoneShell>
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
        <PhoneShell>
          <Header title="Appuntamento" onBack={() => setEditing(false)} />
          <div style={{ padding: `8px ${SIZES.pagePadX}px 16px` }}>
            <AppointmentForm
              dogs={dogs}
              services={services}
              appointments={appointments}
              ignoreId={appointment.id}
              initial={initial}
              onSubmit={(write) => saveEdit(appointment.id, write)}
            />
          </div>
        </PhoneShell>
      )
    }
    return (
      <PhoneShell>
        <Header title="Appuntamento" backTo="/" />
        <AppointmentRead
          appointment={appointment}
          dog={dogs.find((dog) => dog.id === appointment.dogId)}
          confirming={confirmingDelete}
          onEdit={() => {
            setConfirmingDelete(false)
            setEditing(true)
          }}
          onAskDelete={() => setConfirmingDelete(true)}
          onCancelDelete={() => setConfirmingDelete(false)}
          onConfirmDelete={() => confirmDelete(appointment)}
          onComplete={() => markDone(appointment.id)}
          onBook={(weeks) => bookWeeks(appointment, weeks)}
        />
      </PhoneShell>
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
    <PhoneShell>
      <Header title="Nuovo appuntamento" backTo={backTarget(searchParams.get('da'), cane, day, dogs)} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px` }}>
        <AppointmentForm
          dogs={dogs}
          services={services}
          appointments={appointments}
          initial={initial}
          onSubmit={save}
        />
      </div>
    </PhoneShell>
  )
}

function AppointmentRead({
  appointment,
  dog,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onComplete,
  onBook,
}: {
  appointment: Appointment
  dog: Dog | undefined
  confirming: boolean
  onEdit: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onComplete: () => void
  onBook: (weeks: 2 | 4 | 6) => void
}) {
  const phone = dog?.contact.phone ?? ''
  return (
    <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DogAvatar alt="" src={dog?.photo} size="xl" />
      {dog?.criticalNote ? (
        <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderRadius: 8, padding: 8 }}>{dog.criticalNote}</p>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: TYPE.dogName, fontWeight: 700 }}>{dog?.name ?? 'Cane assente'}</span>
        {dog ? <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.title} /> : null}
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Giorno</div>
        <div style={{ fontSize: TYPE.base }}>{formatHomeDate(appointment.start)}</div>
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Ora</div>
        <div style={{ fontSize: TYPE.base }}>{clock(appointment.start)}</div>
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Durata</div>
        <div style={{ fontSize: TYPE.base }}>{formatDuration(sumDuration(appointment.services))}</div>
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Prezzo</div>
        <div style={{ fontSize: TYPE.base }}>{formatEuro(sumPrice(appointment.services))}</div>
      </div>
      <div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Servizi</div>
        {appointment.services.map((service) => (
          <div key={service.serviceId} style={{ fontSize: TYPE.base }}>{service.name}</div>
        ))}
      </div>
      {phone.trim() ? (
        <div>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Telefono</div>
          <a href={`tel:${phone}`}>{phone}</a>
        </div>
      ) : null}
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
