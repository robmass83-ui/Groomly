import { TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDuration, sumDuration, visibleServiceNames } from '../../lib/appointments'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog } from '../../types/models'
import { Chip } from '../ui/Chip'
import { DogAvatar } from './DogAvatar'
import { TemperamentIcon } from './TemperamentIcon'

export function AppointmentRow({ appointment, dog }: { appointment: Appointment; dog: Dog | undefined }) {
  const navigate = useNavigate()
  const label = dog?.name ?? 'Cane assente'
  const time = `${String(appointment.start.getHours()).padStart(2, '0')}:${String(appointment.start.getMinutes()).padStart(2, '0')}`
  const duration = formatDuration(sumDuration(appointment.services))
  const { shown, extra } = visibleServiceNames(appointment.services.map((service) => service.name))

  return (
    <button
      type="button"
      aria-label={`Apri ${label}`}
      onClick={() => navigate(`/appuntamenti/${appointment.id}`)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        border: 0,
        borderBottom: '1px solid var(--line)',
        background: 'transparent',
        color: 'inherit',
        font: 'inherit',
        minHeight: SIZES.row.minH,
        padding: `${SIZES.row.padY}px 0`,
      }}
    >
      <span style={{ width: 34, flex: 'none', fontSize: TYPE.rowSub, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {time}
        <span style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)' }}>{duration}</span>
      </span>
      <DogAvatar alt="" src={dog?.photo} size="md" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{label}</span>
          {dog?.criticalNote ? <TriangleAlert size={14} strokeWidth={2} color="var(--bad)" aria-label="Avviso critico" /> : null}
        </span>
        <span style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', overflow: 'hidden', marginTop: 2 }}>
          {shown.map((name) => <Chip key={name}>{name}</Chip>)}
          {extra > 0 ? <Chip>+{extra}</Chip> : null}
        </span>
      </span>
      {dog ? <TemperamentIcon kind={dog.temperament} size={16} /> : null}
    </button>
  )
}
