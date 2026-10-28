import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { useOpenSheet } from '../../hooks/useOpenSheet'
import { minutiInGriglia } from '../../lib/appointments'
import { oraRoma } from '../../lib/disponibilita'
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

function oraEntro(scadeIl: string | undefined): string {
  if (!scadeIl) return ''
  const data = new Date(scadeIl)
  if (Number.isNaN(data.getTime())) return ''
  return oraRoma(data)
}

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
  const frasi = useFrasi()
  const openSheet = useOpenSheet()
  const ospite = appointment.ospiteNome?.trim() ?? ''
  const provvisorio = appointment.provvisorio === true
  const label = dog?.name ?? (ospite || frasi.rigaCaneAssente)
  const spoken = dog && mark ? `${label}, ${mark.split(' · ').join(', ')}` : label
  const time = `${String(appointment.start.getHours()).padStart(2, '0')}:${String(appointment.start.getMinutes()).padStart(2, '0')}`
  const duration = provvisorio ? '' : formatCompactDuration(minutiInGriglia(appointment))
  const conferma = provvisorio ? frasi.agendaDaConfermare.replace('{{ora}}', oraEntro(appointment.scadeIl)) : ''

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
      aria-label={frasi.apriNome.replace('{{nome}}', spoken)}
      disabled={dog === undefined && ospite.length === 0}
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
          {dog?.criticalNote ? <TriangleAlert size={14} strokeWidth={2} color="var(--bad)" aria-label={frasi.rigaAvviso} /> : null}
          {hasExtraNotes(appointment.extraNotes) ? <NoteAltro note="" altro /> : null}
        </span>
        {dog && mark ? (
          <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{mark}</span>
        ) : null}
        {provvisorio ? (
          <span style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{conferma}</span>
        ) : null}
        {!provvisorio || aside ? (
          <ChipRow>
            {provvisorio ? null : appointment.services.map((line, index) => (
              <ServiceChip key={`${line.serviceId}-${index}`} iconKey={services.find((service) => service.id === line.serviceId)?.iconKey}>
                {line.name}
              </ServiceChip>
            ))}
            {aside}
          </ChipRow>
        ) : null}
      </span>
      {dog ? <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} /> : null}
      {dog?.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.temperamentIcon.row} /> : null}
      {dog?.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.temperamentIcon.row} /> : null}
    </button>
  )
}
