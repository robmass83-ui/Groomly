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
import { formatDuration, localDayKey, parseDayParam, sumDuration, sumPrice } from '../lib/appointments'
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

function backTarget(cane: string | null, day: string | null, dogs: Dog[]): string {
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
  const { appointments, saveNew, lastCreatedId } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const cane = searchParams.get('cane')
  const day = acceptedDay(searchParams.get('data'), now)

  function save(write: AppointmentWrite) {
    if (!saveNew(write)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    navigate(`/appuntamenti/${lastCreatedId.current}`, { replace: true })
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
    return (
      <PhoneShell>
        <Header title="Appuntamento" backTo="/" />
        <AppointmentRead appointment={appointment} dog={dogs.find((dog) => dog.id === appointment.dogId)} />
      </PhoneShell>
    )
  }

  const initial: AppointmentFormValues = {
    dogId: dogs.find((dog) => dog.id === cane && dog.status === 'attivo')?.id ?? '',
    serviceIds: [],
    day: day ?? localDayKey(now),
    time: cane === null ? '09:00' : '',
  }

  return (
    <PhoneShell>
      <Header title="Nuovo appuntamento" backTo={backTarget(cane, day, dogs)} />
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

function AppointmentRead({ appointment, dog }: { appointment: Appointment; dog: Dog | undefined }) {
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
      <Button type="button">Modifica</Button>
    </div>
  )
}
