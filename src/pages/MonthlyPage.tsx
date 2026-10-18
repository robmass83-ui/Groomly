import { addMonths, format } from 'date-fns'
import { Check, Clock } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ChipRow } from '../components/ui/ChipRow'
import { FilterChip } from '../components/ui/FilterChip'
import { SectionHeader } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useServices } from '../hooks/useServices'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { monthlyStatus, visibleInMonth, type MonthlyGroup, type MonthlyRow } from '../lib/cycle'
import { IT_DATE } from '../lib/format'
import { dogPortrait } from '../lib/dogPhoto'
import { bookHref } from '../lib/monthly'
import { sheetState } from '../lib/sheetRoute'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Appointment, Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

type MonthSegment = 'corrente' | 'dopo'
type BoardFilter = 'tutti' | 'da_fissare' | 'fissati'

const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'da_fissare', label: 'Da fissare' },
  { id: 'fissati', label: 'Fissati' },
]

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthTitle(date: Date): string {
  const raw = format(date, 'MMMM yyyy', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function shortDate(date: Date): string {
  return format(date, 'd MMM', IT_DATE)
}

function dueCopy(row: MonthlyRow): string {
  if (!row.lastCompleted || !row.due) return 'Nessun trattamento'
  return `ultimo ${shortDate(row.lastCompleted.start)} · scade ${shortDate(row.due)}`
}

function byDueThenName(a: MonthlyRow, b: MonthlyRow): number {
  return (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0)
    || a.dog.name.localeCompare(b.dog.name, 'it')
    || a.dog.id.localeCompare(b.dog.id)
}

function byName(a: MonthlyRow, b: MonthlyRow): number {
  return a.dog.name.localeCompare(b.dog.name, 'it') || a.dog.id.localeCompare(b.dog.id)
}

function byBooked(a: MonthlyRow, b: MonthlyRow): number {
  return (a.booked?.start.getTime() ?? 0) - (b.booked?.start.getTime() ?? 0)
    || (a.booked?.id ?? '').localeCompare(b.booked?.id ?? '')
}

function rowStyle(first: boolean): CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
    minHeight: SIZES.row.minH,
    borderTop: first ? 'none' : `${SIZES.card.border}px solid var(--line)`,
    color: 'inherit',
    textDecoration: 'none',
    minWidth: 0,
  }
}

function DateChip({ tone, children }: { tone: 'ok' | 'warn'; children: string }) {
  return (
    <span style={{ display: 'flex', flex: '1 1 7rem', minWidth: 0, maxWidth: '100%', justifyContent: 'flex-end' }}>
      <Chip tone={tone}>{children}</Chip>
    </span>
  )
}

function StatusMark({ tone }: { tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const frame: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
  }
  if (tone === 'ok') {
    return (
      <span aria-hidden style={{ ...frame, background: 'var(--ok)', color: 'var(--on-pri)' }}>
        <Check size={12} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  const color = tone === 'bad' ? 'var(--bad)' : tone === 'warn' ? 'var(--warn)' : 'var(--tx3)'
  return (
    <span aria-hidden style={{ ...frame, border: `1.5px dashed ${color}`, color }}>
      <Clock size={12} strokeWidth={2.5} aria-hidden />
    </span>
  )
}

function openInMonth(dogs: Dog[], appointments: Appointment[], now: Date, daysBefore: number, month: Date): number {
  return dogs
    .map((dog) => monthlyStatus(dog, appointments, now, daysBefore))
    .filter((row): row is MonthlyRow => row !== null && visibleInMonth(row, month, now))
    .filter((row) => row.group === 'in_ritardo' || row.group === 'in_scadenza' || row.group === 'da_fissare')
    .length
}

const GROUPS: { id: Exclude<MonthlyGroup, 'fissato'>; title: string; tone: 'bad' | 'warn' | 'neutral' }[] = [
  { id: 'in_ritardo', title: 'In ritardo', tone: 'bad' },
  { id: 'in_scadenza', title: 'In scadenza questa settimana', tone: 'warn' },
  { id: 'da_fissare', title: 'Da fissare', tone: 'warn' },
  { id: 'nuovo', title: 'Nuovi', tone: 'neutral' },
]

export function MonthlyPage() {
  const openSheet = useOpenSheet()
  const location = useLocation()
  const session = useSession()
  const { settings } = useSettings()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const now = new Date()
  const daysBefore = settings.monthlyReminder.daysBefore
  const current = monthStart(now)
  const following = addMonths(current, 1)
  const [segment, setSegment] = useState<MonthSegment>('corrente')
  const [filter, setFilter] = useState<BoardFilter>('tutti')
  const month = segment === 'corrente' ? current : following
  const rows = dogs
    .map((dog) => monthlyStatus(dog, appointments, now, daysBefore))
    .filter((row): row is MonthlyRow => row !== null)
    .filter((row) => visibleInMonth(row, month, now))
  const byGroup = {
    in_ritardo: rows.filter((row) => row.group === 'in_ritardo').sort(byDueThenName),
    in_scadenza: rows.filter((row) => row.group === 'in_scadenza').sort(byDueThenName),
    da_fissare: rows.filter((row) => row.group === 'da_fissare').sort(byDueThenName),
    nuovo: rows.filter((row) => row.group === 'nuovo').sort(byName),
    fissato: rows.filter((row) => row.group === 'fissato').sort(byBooked),
  }
  const toBook = byGroup.in_ritardo.length + byGroup.in_scadenza.length + byGroup.da_fissare.length
  const currentOpen = openInMonth(dogs, appointments, now, daysBefore, current)
  const followingOpen = openInMonth(dogs, appointments, now, daysBefore, following)
  const booked = byGroup.fissato.length
  const total = booked + toBook
  const filled = total === 0 ? 0 : (booked / total) * 100
  const empty = filter === 'fissati'
    ? booked === 0
    : filter === 'da_fissare'
      ? toBook === 0
      : rows.length === 0

  return (
    <ShellFrame>
      <Header title="Mensili" subtitle={monthTitle(now)} />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Segmented
          fill
          label="Mese"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'corrente', label: format(current, 'MMM', IT_DATE), badge: currentOpen || undefined },
            { value: 'dopo', label: format(following, 'MMM', IT_DATE), badge: followingOpen || undefined },
          ]}
        />
        <Card style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{`${booked}/${total}`}</span>
            <span style={{ color: 'var(--tx2)', fontSize: TYPE.base }}>fissati</span>
            <span style={{ marginLeft: 'auto' }}>
              <Chip tone="warn">{`${toBook} da fissare`}</Chip>
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Mensili fissati"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={booked}
            style={{ height: 6, borderRadius: 3, background: 'var(--warn-s)', overflow: 'hidden' }}
          >
            <div style={{ width: `${filled}%`, height: '100%', borderRadius: 3, background: 'var(--ok)' }} />
          </div>
        </Card>
        <div role="group" aria-label="Filtro">
          <ChipRow>
            {FILTERS.map((item) => (
              <FilterChip key={item.id} pressed={filter === item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </FilterChip>
            ))}
          </ChipRow>
        </div>
        {empty ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun mensile</p>
        ) : null}
        {GROUPS.map((group) => {
          const list = filter === 'fissati' || (filter === 'da_fissare' && group.id === 'nuovo') ? [] : byGroup[group.id]
          if (list.length === 0) return null
          return (
            <section key={group.id} aria-label={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionHeader tone={group.tone === 'neutral' ? 'default' : group.tone} count={list.length}>{group.title}</SectionHeader>
              <Card>
                {list.map((row, index) => (
                  <div key={row.dog.id} style={rowStyle(index === 0)}>
                    <StatusMark tone={group.tone} />
                    <DogAvatar alt={row.dog.name} src={dogPortrait(row.dog)} size="sm" species={row.dog.species} />
                    <Link to={`/animali/${row.dog.id}`} style={{ flex: '1 1 auto', minWidth: 0, minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'inherit', textDecoration: 'none' }}>
                      <span style={{ fontWeight: 700, ...USER_TEXT }}>{row.dog.name}</span>
                      <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{dueCopy(row)}</span>
                    </Link>
                    {row.booked ? (
                      <DateChip tone="ok">{shortDate(row.booked.start)}</DateChip>
                    ) : (
                      <Button variant="tonal" size="sm" onClick={() => openSheet(bookHref(row.dog.id, appointments, services, now, row.dog))} style={{ flex: 'none', minHeight: 44, height: 'auto' }}>Fissa</Button>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )
        })}
        {filter !== 'da_fissare' && byGroup.fissato.length > 0 ? (
          <section aria-label="Fissati" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHeader tone="ok" count={byGroup.fissato.length}>Fissati</SectionHeader>
            <Card>
              {byGroup.fissato.map((row, index) => row.booked ? (
                <Link key={row.dog.id} to={`/appuntamenti/${row.booked.id}`} state={sheetState(location)} style={rowStyle(index === 0)}>
                  <StatusMark tone={row.late ? 'warn' : 'ok'} />
                  <DogAvatar alt={row.dog.name} src={dogPortrait(row.dog)} size="sm" species={row.dog.species} />
                  <span style={{ flex: '1 1 auto', minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', fontWeight: 700, ...USER_TEXT }}>{row.dog.name}</span>
                  {row.late ? (
                    <DateChip tone="warn">{`Fissato in ritardo · ${shortDate(row.booked.start)}`}</DateChip>
                  ) : (
                    <DateChip tone="ok">{shortDate(row.booked.start)}</DateChip>
                  )}
                </Link>
              ) : null)}
            </Card>
          </section>
        ) : null}
      </div>
    </ShellFrame>
  )
}
