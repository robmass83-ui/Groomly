import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useOpenSheet } from '../../hooks/useOpenSheet'
import { sumDuration } from '../../lib/appointments'
import { dogPortrait } from '../../lib/dogPhoto'
import { formatCompactDuration } from '../../lib/display'
import { hasExtraNotes } from '../../lib/dogNotes'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog, Service } from '../../types/models'
import { ChipRow } from '../ui/ChipRow'
import { ServiceChip } from '../ui/ServiceChip'
import { TimeBox } from '../ui/TimeBox'
import { DogAvatar } from './DogAvatar'
import { NoteAltro } from './NoteAltro'
import { FlagIcon } from './FlagIcon'
import { TemperamentIcon } from './TemperamentIcon'

export function AppointmentRow({
  appointment,
  dog,
  services,
  onOpen,
  mark,
  aside,
  active = false,
}: {
  appointment: Appointment
  dog: Dog | undefined
  services: Service[]
  onOpen?: () => void
  mark?: string | null
  aside?: ReactNode
  active?: boolean
}) {
  const openSheet = useOpenSheet()
  const label = dog?.name ?? 'Cane assente'
  const spoken = dog && mark ? `${label}, ${mark.split(' · ').join(', ')}` : label
  const time = `${String(appointment.start.getHours()).padStart(2, '0')}:${String(appointment.start.getMinutes()).padStart(2, '0')}`
  const duration = formatCompactDuration(sumDuration(appointment.services))

  function open() {
    if (onOpen) {
      onOpen()
      return
    }
    openSheet(`/appuntamenti/${appointment.id}`)
  }

  return (
    <button
      type="button"
      aria-label={`Apri ${spoken}`}
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
      <TimeBox time={time} duration={duration} active={active} />
      <DogAvatar alt="" src={dogPortrait(dog)} size="sm" species={dog?.species} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{label}</span>
          {dog?.criticalNote ? <TriangleAlert size={14} strokeWidth={2} color="var(--bad)" aria-label="Avviso critico" /> : null}
          {hasExtraNotes(appointment.extraNotes) ? <NoteAltro note="" altro /> : null}
        </span>
        {dog && mark ? (
          <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{mark}</span>
        ) : null}
        <ChipRow>
          {appointment.services.map((line, index) => (
            <ServiceChip key={`${line.serviceId}-${index}`} iconKey={services.find((service) => service.id === line.serviceId)?.iconKey}>
              {line.name}
            </ServiceChip>
          ))}
          {aside}
        </ChipRow>
      </span>
      {dog ? <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} /> : null}
      {dog?.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.temperamentIcon.row} /> : null}
      {dog?.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.temperamentIcon.row} /> : null}
    </button>
  )
}
