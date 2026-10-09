import { TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sumDuration } from '../../lib/appointments'
import { formatCompactDuration } from '../../lib/display'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog, Service } from '../../types/models'
import { Chip } from '../ui/Chip'
import { DogAvatar } from './DogAvatar'
import { FlagIcon } from './FlagIcon'
import { ServiceIcon } from './ServiceIcon'
import { TemperamentIcon } from './TemperamentIcon'

export function AppointmentRow({
  appointment,
  dog,
  services,
  onOpen,
}: {
  appointment: Appointment
  dog: Dog | undefined
  services: Service[]
  onOpen?: () => void
}) {
  const navigate = useNavigate()
  const label = dog?.name ?? 'Cane assente'
  const time = `${String(appointment.start.getHours()).padStart(2, '0')}:${String(appointment.start.getMinutes()).padStart(2, '0')}`
  const duration = formatCompactDuration(sumDuration(appointment.services))
  const shown = appointment.services.slice(0, 2)
  const extra = appointment.services.length - shown.length

  function open() {
    if (onOpen) {
      onOpen()
      return
    }
    navigate(`/appuntamenti/${appointment.id}`)
  }

  return (
    <button
      type="button"
      aria-label={`Apri ${label}`}
      disabled={dog === undefined}
      onClick={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
        width: '100%',
        textAlign: 'left',
        border: 0,
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        padding: 0,
      }}
    >
      <span style={{ width: 34, flex: 'none', fontSize: TYPE.rowSub, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {time}
        <span style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)' }}>{duration}</span>
      </span>
      <DogAvatar alt="" src={dog?.photo} size="sm" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{label}</span>
          {dog?.criticalNote ? <TriangleAlert size={14} strokeWidth={2} color="var(--bad)" aria-label="Avviso critico" /> : null}
        </span>
        <span style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', marginTop: 2 }}>
          {shown.map((line) => (
            <Chip key={line.serviceId}>
              <ServiceIcon iconKey={services.find((service) => service.id === line.serviceId)?.iconKey} size={SIZES.chip.serviceIconInChip} />
              {line.name}
            </Chip>
          ))}
          {extra > 0 ? <Chip>+{extra}</Chip> : null}
        </span>
      </span>
      {dog ? <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} /> : null}
      {dog?.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.temperamentIcon.row} /> : null}
      {dog?.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.temperamentIcon.row} /> : null}
    </button>
  )
}
