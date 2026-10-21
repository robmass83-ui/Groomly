import { ChevronRight } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { FlagIcon } from '../components/domain/FlagIcon'
import { TemperamentSticker } from '../components/domain/TemperamentSticker'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { StatusPill } from '../components/ui/StatusPill'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { dogPortrait } from '../lib/dogPhoto'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dogSubtitle, dogThirdLine, sortDogs, visibleDogs } from '../lib/dogList'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

function archiveSubtitle(count: number): string {
  if (count === 0) return 'Nessuno in archivio'
  if (count === 1) return '1 in archivio'
  return `${count} in archivio`
}

export function ArchivePage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [now] = useState(() => new Date())
  const archived = api.dogs.filter((dog) => dog.status === 'non_in_cura' || dog.status === 'deceduto')
  const visible = sortDogs(
    visibleDogs(api.dogs, 'archivio', 'tutti', '', appointments, now),
    'alfabetico',
    () => null,
  )

  return (
    <ShellFrame showFab={false}>
      <Header title="Archivio" subtitle={archiveSubtitle(archived.length)} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {visible.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--tx3)', ...USER_TEXT }}>Nessun animale in archivio</p>
        ) : (
          <Card style={{ overflow: 'visible' }}>
            {visible.map((dog, index) => (
              <ArchiveRow
                key={dog.id}
                dog={dog}
                now={now}
                line={dogThirdLine(dog, appointments, now, settings.monthlyReminder.daysBefore)}
                onOpen={() => navigate(`/animali/${dog.id}`)}
                onRestore={() => api.restore(dog.id)}
                style={index === 0 ? { borderTop: 'none' } : undefined}
              />
            ))}
          </Card>
        )}
      </div>
    </ShellFrame>
  )
}

function ArchiveRow({ dog, now, line, onOpen, onRestore, style }: {
  dog: Dog
  now: Date
  line: { text: string; tone: 'warn' | 'tx3' }
  onOpen: () => void
  onRestore: () => void
  style?: CSSProperties
}) {
  return (
    <Row onClick={onOpen} style={{ minHeight: 56, ...style }}>
      <button type="button" aria-label={`Apri ${dog.name}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}>
        <DogAvatar alt="" src={dogPortrait(dog)} size="md" px={40} species={dog.species} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--tx3)', ...USER_TEXT }}>{dog.name}</span>
            {dog.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} /> : null}
            {dog.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} /> : null}
          </span>
          <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub, ...USER_TEXT }}>{dogSubtitle(dog, now)}</span>
          <StatusPill tone={line.tone === 'warn' ? 'warn' : 'neutral'}>{line.text}</StatusPill>
        </span>
        <TemperamentSticker kind={dog.temperament} size={SIZES.temperamentIcon.row} />
        <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
      </button>
      <Button
        variant="secondary"
        onClick={(event) => {
          event.stopPropagation()
          onRestore()
        }}
        style={{ height: SIZES.button.h, flexShrink: 0 }}
      >
        Ripristina
      </Button>
    </Row>
  )
}
