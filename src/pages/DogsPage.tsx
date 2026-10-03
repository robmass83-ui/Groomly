import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { Chip } from '../components/ui/Chip'
import { useSession } from '../hooks/useSession'
import { useDogs } from '../hooks/useDogs'
import { ARCHIVE_LABEL, countDogs, dogMeta, visibleDogs, type DogChip, type DogTab } from '../lib/dogList'
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
  { id: 'gatti', label: 'Gatti' },
]

export function DogsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DogTab>('attivi')
  const [chip, setChip] = useState<DogChip>('tutti')
  const counts = countDogs(dogs)
  const visible = visibleDogs(dogs, tab, chip, query)

  useEffect(() => {
    const state = location.state as { focusSearch?: boolean } | null
    if (state?.focusSearch) searchRef.current?.focus()
  }, [location.state])

  return (
    <ShellFrame>
      <Header
        title="Animali"
        subtitle={`${counts.attivi} attivi · ${counts.archivio} in archivio`}
        action={<Link to="/animali/nuovo" style={{ color: 'var(--pri)', fontWeight: 600, textDecoration: 'none' }}>Aggiungi</Link>}
      />
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <input
          ref={searchRef}
          aria-label="Cerca"
          placeholder="Cerca nome, proprietario, razza"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ height: SIZES.search.h, borderRadius: SIZES.search.radius, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--tx)', padding: '0 10px', font: 'inherit' }}
        />
        <div role="tablist" aria-label="Stato" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => setTab(item.id)} style={{ border: 0, background: 'transparent', color: selected ? 'var(--tx)' : 'var(--tx3)', fontWeight: selected ? 700 : 600, fontSize: TYPE.rowSub, padding: 0 }}>
                {item.label} {counts[item.id]}
              </button>
            )
          })}
        </div>
        <div role="group" aria-label="Filtri" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHIPS.map((item) => (
            <button key={item.id} type="button" aria-pressed={chip === item.id} onClick={() => setChip(item.id)} style={{ border: '1px solid var(--line)', borderRadius: 999, background: chip === item.id ? 'var(--surf)' : 'transparent', color: 'var(--tx2)', fontWeight: 600, fontSize: TYPE.meta, padding: '3px 8px' }}>
              {item.label}
            </button>
          ))}
        </div>
        {visible.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun cane</p> : visible.map((dog) => <DogRow key={dog.id} dog={dog} onOpen={() => navigate(`/animali/${dog.id}`)} />)}
      </div>
    </ShellFrame>
  )
}

function DogRow({ dog, onOpen }: { dog: Dog; onOpen: () => void }) {
  const archived = dog.status === 'non_in_cura' || dog.status === 'deceduto'
  return (
    <button type="button" aria-label={`Apri ${dog.name}`} onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', color: 'inherit', font: 'inherit', minHeight: SIZES.row.minH, padding: `${SIZES.row.padY}px 0` }}>
      <DogAvatar alt="" src={dog.photo} size="md" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: archived ? 'var(--tx3)' : 'var(--tx)' }}>{dog.name}</span>
          {dog.clientType === 'mensile' ? <Chip>Mensile</Chip> : null}
          {dog.ageCategory === 'anziano' ? <Chip>Anziano</Chip> : null}
        </span>
        <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub }}>{dogMeta(dog)}</span>
        {dog.status === 'non_in_cura' || dog.status === 'deceduto' ? <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{ARCHIVE_LABEL[dog.status]}</span> : null}
      </span>
      <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.row} />
    </button>
  )
}
