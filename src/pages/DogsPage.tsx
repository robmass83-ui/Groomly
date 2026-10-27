import { Archive, ArrowUpDown, ChevronRight, PawPrint } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { FlagIcon } from '../components/domain/FlagIcon'
import { TemperamentSticker } from '../components/domain/TemperamentSticker'
import { Header } from '../components/layout/Header'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { ChipRow } from '../components/ui/ChipRow'
import { FilterChip } from '../components/ui/FilterChip'
import { IconButton } from '../components/ui/IconButton'
import { StatusPill } from '../components/ui/StatusPill'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { dogPortrait } from '../lib/dogPhoto'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { nextAppointment } from '../lib/appointments'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { countDogs, dogSubtitle, dogThirdLine, isOtherSpecies, sortDogs, visibleDogs, type DogChip, type DogSort, type DogTab } from '../lib/dogList'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

const TABS: DogTab[] = ['attivi', 'mensili', 'occasionali', 'nuovi', 'archivio']
const CHIPS: DogChip[] = ['tutti', 'mordaci', 'anziani', 'in_agenda', 'gatti', 'altri']

const LIST_SCROLL_KEY = 'groomly.dogs-list-scroll'

const sheetAction = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 44,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 600,
  textAlign: 'left' as const,
  padding: '6px 0',
}

export function DogsPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { settings } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DogTab>(searchParams.get('tab') === 'archivio' ? 'archivio' : 'attivi')
  const [chip, setChip] = useState<DogChip>('tutti')
  const [sortMode, setSortMode] = useState<DogSort>('alfabetico')
  const [sortOpen, setSortOpen] = useState(false)
  const [now] = useState(() => new Date())
  const counts = countDogs(api.dogs)
  const hasOthers = api.dogs.some(isOtherSpecies)
  const shownChips = CHIPS.filter((item) => item !== 'altri' || hasOthers)
  const tabLabel: Record<DogTab, string> = {
    attivi: frasi.caniAttivi,
    mensili: frasi.caniMensili,
    occasionali: frasi.caniOccasionali,
    nuovi: frasi.caniNuovi,
    archivio: frasi.caniArchivio,
  }
  const chipLabel: Record<DogChip, string> = {
    tutti: frasi.caniTutti,
    mordaci: frasi.caniMordaci,
    anziani: frasi.caniAnziani,
    in_agenda: frasi.caniInAgenda,
    gatti: frasi.caniGatti,
    altri: frasi.caniAltri,
  }
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

  useLayoutEffect(() => {
    const node = listRef.current
    if (!node) return
    const saved = Number(sessionStorage.getItem(LIST_SCROLL_KEY))
    if (Number.isFinite(saved) && saved > 0) node.scrollTop = saved
    return () => {
      sessionStorage.setItem(LIST_SCROLL_KEY, String(node.scrollTop))
    }
  }, [])

  function chooseSort(mode: DogSort) {
    setSortMode(mode)
    setSortOpen(false)
  }

  return (
    <ShellFrame fill>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <Header
          title={frasi.caniTitolo}
          subtitle={frasi.caniSottotitolo.replace('{{attivi}}', String(counts.attivi)).replace('{{archivio}}', String(counts.archivio))}
          action={(
            <IconButton label={frasi.caniOrdina} onClick={() => setSortOpen(true)}>
              <ArrowUpDown size={16} strokeWidth={2} aria-hidden />
            </IconButton>
          )}
        />
        <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div data-testid="dogs-controls" style={{ flexShrink: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap, paddingBottom: 6 }}>
            <input
          ref={searchRef}
          aria-label={frasi.caniCerca}
          placeholder={frasi.caniSegnaposto}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
              style={{ height: SIZES.search.h, minHeight: SIZES.search.h, borderRadius: SIZES.search.radius, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--tx)', padding: '0 10px', font: 'inherit' }}
            />
            <div role="tablist" aria-label={frasi.caniStato} style={{ display: 'flex', gap: 10, overflowX: 'auto', minWidth: 0, width: '100%', borderBottom: '1px solid var(--line)' }}>
              {TABS.map((item) => {
                const selected = tab === item
                return (
                  <button key={item} type="button" role="tab" aria-selected={selected} onClick={() => setTab(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none', minHeight: 44, whiteSpace: 'nowrap', border: 0, borderBottom: selected ? '2px solid var(--pri)' : '2px solid transparent', background: 'transparent', color: selected ? 'var(--tx)' : 'var(--tx3)', fontWeight: selected ? 700 : 600, fontSize: TYPE.rowSub, padding: '4px 0' }}>
                    {item === 'archivio' ? <Archive size={12} strokeWidth={2} aria-hidden /> : null}
                    {item === 'nuovi' ? (
                      <>
                        {tabLabel[item]}
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pri)', color: 'var(--on-pri)', borderRadius: '999px', minWidth: 18, height: 18, fontSize: 11, lineHeight: 1, padding: '0 4px' }}>{counts.nuovi}</span>
                      </>
                    ) : (
                      <>{tabLabel[item]} {counts[item]}</>
                    )}
                  </button>
                )
              })}
            </div>
            <div role="group" aria-label={frasi.caniFiltri}>
              <ChipRow>
                {shownChips.map((item) => (
                  <FilterChip key={item} pressed={activeChip === item} onClick={() => setChip(item)}>
                    {chipLabel[item]}
                  </FilterChip>
                ))}
              </ChipRow>
            </div>
          </div>
          <div ref={listRef} data-testid="dogs-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', overscrollBehavior: 'contain', paddingTop: SIZES.sectionGap }}>
            {visible.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/animali/nuovo')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 44, border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '24px 0' }}
              >
                <PawPrint size={20} strokeWidth={2} aria-hidden />
                {api.dogs.length === 0 ? frasi.caniPrimo : frasi.caniAggiungi}
              </button>
            ) : (
            <Card style={{ overflow: 'visible' }}>
              {visible.map((dog, index) => (
                <DogRow
                  key={dog.id}
                  dog={dog}
                  line={dogThirdLine(dog, appointments, now, settings.monthlyReminder.daysBefore, lingua)}
                  subtitle={dogSubtitle(dog, now, lingua)}
                  onOpen={() => navigate(`/animali/${dog.id}`)}
                  onRestore={() => api.restore(dog.id)}
                  style={index === 0 ? { borderTop: 'none' } : undefined}
                />
              ))}
            </Card>
          )}
          </div>
        </div>
      </div>
      <Sheet open={sortOpen} title={frasi.caniOrdina} onClose={() => setSortOpen(false)}>
        <button type="button" aria-pressed={sortMode === 'alfabetico'} onClick={() => chooseSort('alfabetico')} style={sheetAction}>{frasi.caniAlfabetico}</button>
        <button type="button" aria-pressed={sortMode === 'prossimo'} onClick={() => chooseSort('prossimo')} style={sheetAction}>{frasi.caniProssimo}</button>
      </Sheet>
    </ShellFrame>
  )
}

function DogRow({ dog, line, subtitle, onOpen, onRestore, style }: {
  dog: Dog
  line: { text: string; tone: 'warn' | 'tx3' }
  subtitle: string
  onOpen: () => void
  onRestore: () => void
  style?: CSSProperties
}) {
  const frasi = useFrasi()
  const archived = dog.status === 'non_in_cura' || dog.status === 'deceduto'
  return (
    <Row onClick={onOpen} style={{ minHeight: 56, ...style }}>
      <button type="button" aria-label={frasi.apriNome.replace('{{nome}}', dog.name)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0 }}>
        <DogAvatar alt="" src={dogPortrait(dog)} size="md" px={40} species={dog.species} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: archived ? 'var(--tx3)' : 'var(--tx)', ...USER_TEXT }}>{dog.name}</span>
            {dog.clientType === 'mensile' ? <FlagIcon kind="mensile" size={SIZES.chip.iconInChip} /> : null}
            {dog.ageCategory === 'anziano' ? <FlagIcon kind="anziano" size={SIZES.chip.iconInChip} /> : null}
          </span>
          <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.rowSub, ...USER_TEXT }}>{subtitle}</span>
          <StatusPill tone={line.tone === 'warn' ? 'warn' : 'neutral'}>{line.text}</StatusPill>
        </span>
        <TemperamentSticker kind={dog.temperament} size={SIZES.temperamentIcon.row} />
        <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
      </button>
      {archived ? (
        <Button
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation()
            onRestore()
          }}
          style={{ height: SIZES.button.h, flexShrink: 0 }}
        >
          {frasi.caniRipristina}
        </Button>
      ) : null}
    </Row>
  )
}
