import { Archive, ArrowUpDown, ChevronRight, PawPrint, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { FlagIcon } from '../components/domain/FlagIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { dogPortrait } from '../lib/dogPhoto'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { nextAppointment } from '../lib/appointments'
import { countDogs, dogSubtitle, dogThirdLine, sortDogs, visibleDogs, type DogChip, type DogSort, type DogTab } from '../lib/dogList'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

const TABS: { id: DogTab; label: string }[] = [
  { id: 'attivi', label: 'Attivi' },
  { id: 'mensili', label: 'Mensili' },
  { id: 'occasionali', label: 'Occasionali' },
  { id: 'archivio', label: 'Archivio' },
]

const CHIPS: { id: DogChip; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'mordaci', label: 'Mordaci' },
  { id: 'anziani', label: 'Anziani' },
  { id: 'in_agenda', label: 'In agenda' },
  { id: 'gatti', label: 'Gatti' },
  { id: 'altri', label: 'Altri' },
]

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

export function DogsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { settings } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DogTab>(searchParams.get('tab') === 'archivio' ? 'archivio' : 'attivi')
  const [chip, setChip] = useState<DogChip>('tutti')
  const [sortMode, setSortMode] = useState<DogSort>('alfabetico')
  const [sortOpen, setSortOpen] = useState(false)
  const [now] = useState(() => new Date())
  const counts = countDogs(api.dogs)
  const hasOthers = api.dogs.some((dog) => dog.species === 'altro')
  const shownChips = CHIPS.filter((item) => item.id !== 'altri' || hasOthers)
  const activeChip: DogChip = chip === 'altri' && !hasOthers ? 'tutti' : chip
  const visible = sortDogs(
    visibleDogs(api.dogs, tab, activeChip, query, appointments, now),
    sortMode,
    (dog) => nextAppointment(appointments, dog.id, now)?.start ?? null,
  )

  useEffect(() => {
    const state = location.state as { focusSearch?: boolean } | null
    if (state?.focusSearch) searchRef.current?.focus()
  }, [location.state])

  function chooseSort(mode: DogSort) {
    setSortMode(mode)
    setSortOpen(false)
  }

  return (
    <ShellFrame>
      <Header
        title="Animali"
        subtitle={`${counts.attivi} attivi · ${counts.archivio} in archivio`}
        action={(
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconButton label="Ordina" onClick={() => setSortOpen(true)}>
              <ArrowUpDown size={16} strokeWidth={2} aria-hidden />
            </IconButton>
            <Button onClick={() => navigate('/animali/nuovo')} style={{ height: SIZES.headerIconBtn, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
              <Plus size={14} strokeWidth={2} aria-hidden />
              Aggiungi
            </Button>
          </span>
        )}
      />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <div data-testid="dogs-controls" style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap, paddingBottom: 6 }}>
        <input
          ref={searchRef}
          aria-label="Cerca"
          placeholder="Nome, proprietario o razza"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ height: SIZES.search.h, borderRadius: SIZES.search.radius, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--tx)', padding: '0 10px', font: 'inherit' }}
        />
        <div role="tablist" aria-label="Stato" style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--line)' }}>
          {TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => setTab(item.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 0, borderBottom: selected ? '2px solid var(--pri)' : '2px solid transparent', background: 'transparent', color: selected ? 'var(--tx)' : 'var(--tx3)', fontWeight: selected ? 700 : 600, fontSize: TYPE.rowSub, padding: '4px 0' }}>
                {item.id === 'archivio' ? <Archive size={12} strokeWidth={2} aria-hidden /> : null}
                {item.label} {counts[item.id]}
              </button>
            )
          })}
        </div>
        <div role="group" aria-label="Filtri" style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
          {shownChips.map((item) => {
            const selected = activeChip === item.id
            return (
              <button key={item.id} type="button" aria-pressed={selected} onClick={() => setChip(item.id)} style={{ border: 0, background: 'transparent', padding: 0 }}>
                <Chip tone={selected ? 'sel' : 'out'}>{item.label}</Chip>
              </button>
            )
          })}
        </div>
        </div>
        {visible.length === 0 ? (
          <button
            type="button"
            onClick={() => navigate('/animali/nuovo')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 44, border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '24px 0' }}
          >
            <PawPrint size={20} strokeWidth={2} aria-hidden />
            {api.dogs.length === 0 ? 'Aggiungi il primo cane' : 'Aggiungi un cane'}
          </button>
        ) : (
          <Card>
            {visible.map((dog, index) => (
              <DogRow
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
      <Sheet open={sortOpen} title="Ordina" onClose={() => setSortOpen(false)}>
        <button type="button" onClick={() => chooseSort('alfabetico')} style={sheetAction}>Alfabetico</button>
        <button type="button" onClick={() => chooseSort('prossimo')} style={sheetAction}>Per prossimo appuntamento</button>
      </Sheet>
    </ShellFrame>
  )
}

function DogRow({ dog, now, line, onOpen, onRestore, style }: {
  dog: Dog
  now: Date
  line: { text: string; tone: 'warn' | 'tx3' }
  onOpen: () => void
  onRestore: () => void
  style?: CSSProperties
}) {
  const archived = dog.status === 'non_in_cura' || dog.status === 'deceduto'
  return (
    <Row onClick={onOpen} style={{ minHeight: 56, ...style }}>
      <button type="button" aria-label={`Apri ${dog.name}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}>
        <DogAvatar alt="" src={dogPortrait(dog)} size="md" px={40} species={dog.species} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: archived ? 'var(--tx3)' : 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{dog.name}</span>
            {dog.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} /> : null}
            {dog.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} /> : null}
          </span>
          <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dogSubtitle(dog, now)}</span>
        </span>
        <span
          style={line.tone === 'warn' && line.text.startsWith('Da fissare')
            ? { flex: 'none', maxWidth: '40%', background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 999, padding: '2px 8px', fontSize: TYPE.meta, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
            : { flex: 'none', maxWidth: '40%', color: line.tone === 'warn' ? 'var(--warn)' : 'var(--tx3)', fontSize: TYPE.meta, fontWeight: line.tone === 'warn' ? 600 : 400, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {line.text}
        </span>
        <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} />
        <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
      </button>
      {archived ? (
        <Button
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation()
            onRestore()
          }}
          style={{ height: SIZES.button.h, flexShrink: 0 }}
        >
          Ripristina
        </Button>
      ) : null}
    </Row>
  )
}
