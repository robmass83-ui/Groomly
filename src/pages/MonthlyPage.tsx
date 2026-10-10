import { addMonths, format } from 'date-fns'
import { Check, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useServices } from '../hooks/useServices'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dueSoon, monthlyStatus, type MonthlyGroup, type MonthlyRow } from '../lib/cycle'
import { IT_DATE } from '../lib/format'
import { bookHref } from '../lib/monthly'
import { sheetState } from '../lib/sheetRoute'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
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

// In ritardo e in scadenza sono i gruppi di dueSoon: nel mese corrente restano
// anche se la scadenza cade nel mese dopo. I fissati seguono la data prenotata.
// I nuovi non hanno scadenza e restano nel mese corrente.
function inMonth(row: MonthlyRow, month: Date, isCurrent: boolean): boolean {
  if (isCurrent && (row.group === 'in_ritardo' || row.group === 'in_scadenza')) return true
  const when = row.group === 'fissato' ? row.booked?.start : row.due
  if (!when) return isCurrent
  const opening = monthStart(month).getTime()
  const closing = addMonths(monthStart(month), 1).getTime()
  if (isCurrent) return when.getTime() < closing
  return when.getTime() >= opening && when.getTime() < closing
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
      <span aria-hidden style={{ ...frame, background: 'var(--ok)', color: '#fff' }}>
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

const GROUPS: { id: Exclude<MonthlyGroup, 'fissato'>; title: string; tone: 'bad' | 'warn' | 'neutral' }[] = [
  { id: 'in_ritardo', title: 'In ritardo', tone: 'bad' },
  { id: 'in_scadenza', title: 'In scadenza questa settimana', tone: 'warn' },
  { id: 'nuovo', title: 'Nuovi', tone: 'neutral' },
]

const TITLE_COLOR = { bad: 'var(--bad)', warn: 'var(--warn)', neutral: 'var(--tx3)', ok: 'var(--ok)' } as const

function GroupHead({ tone, children, aside }: { tone: keyof typeof TITLE_COLOR; children: string; aside?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SectionTitle color={TITLE_COLOR[tone]}>{children}</SectionTitle>
      </div>
      {aside}
    </div>
  )
}

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
  const [bookedOpen, setBookedOpen] = useState(false)
  const month = segment === 'corrente' ? current : following
  const showBooked = bookedOpen || filter === 'fissati'
  const rows = dogs
    .map((dog) => monthlyStatus(dog, appointments, now, daysBefore))
    .filter((row): row is MonthlyRow => row !== null)
    .filter((row) => inMonth(row, month, segment === 'corrente'))
  const byGroup = {
    in_ritardo: rows.filter((row) => row.group === 'in_ritardo').sort(byDueThenName),
    in_scadenza: rows.filter((row) => row.group === 'in_scadenza').sort(byDueThenName),
    nuovo: rows.filter((row) => row.group === 'nuovo').sort(byName),
    fissato: rows.filter((row) => row.group === 'fissato').sort(byBooked),
  }
  const toBook = dueSoon(dogs, appointments, now, daysBefore).length
  const booked = byGroup.fissato.length
  const total = booked + toBook
  const filled = total === 0 ? 0 : (booked / total) * 100
  const empty = rows.length === 0

  return (
    <ShellFrame>
      <Header
        title="Clienti mensili"
        subtitle={monthTitle(now)}
        backTo="/"
        action={(
          <Segmented
            label="Mese"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'corrente', label: format(current, 'MMM', IT_DATE) },
              { value: 'dopo', label: format(following, 'MMM', IT_DATE) },
            ]}
          />
        )}
      />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
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
            style={{ height: 6, borderRadius: 3, background: 'var(--surf2)', overflow: 'hidden' }}
          >
            <div style={{ width: `${filled}%`, height: '100%', borderRadius: 3, background: 'var(--ok)' }} />
          </div>
        </Card>
        <div role="group" aria-label="Filtro" style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} style={{ border: 0, background: 'transparent', padding: 0 }}>
              <Chip tone={filter === item.id ? 'sel' : 'out'}>{item.label}</Chip>
            </button>
          ))}
        </div>
        {empty || (filter === 'fissati' && booked === 0) || (filter === 'da_fissare' && toBook === 0) ? (
          <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun mensile</p>
        ) : null}
        {GROUPS.map((group) => {
          const list = filter === 'fissati' || (filter === 'da_fissare' && group.id === 'nuovo') ? [] : byGroup[group.id]
          if (list.length === 0) return null
          return (
            <section key={group.id} aria-label={group.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <GroupHead tone={group.tone}>{group.title}</GroupHead>
              <Card>
                {list.map((row, index) => (
                  <div key={row.dog.id} style={rowStyle(index === 0)}>
                    <StatusMark tone={group.tone} />
                    <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" species={row.dog.species} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dog.name}</div>
                      <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dueCopy(row)}</div>
                    </div>
                    {row.booked ? (
                      <Chip tone="ok">{shortDate(row.booked.start)}</Chip>
                    ) : (
                      <Button variant="ghost" onClick={() => openSheet(bookHref(row.dog.id, appointments, services, now))} style={{ flex: 'none' }}>Fissa</Button>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )
        })}
        {booked > 0 && filter !== 'da_fissare' ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GroupHead
              tone="ok"
              aside={(
                <button
                  type="button"
                  aria-expanded={showBooked}
                  aria-label={showBooked ? 'Nascondi fissati' : 'Mostra fissati'}
                  onClick={() => setBookedOpen((open) => !open)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 0, background: 'transparent', color: 'var(--ok)', font: 'inherit', fontWeight: 700, padding: 0, minHeight: 32 }}
                >
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{booked}</span>
                  {showBooked ? <ChevronUp size={16} strokeWidth={2} aria-hidden /> : <ChevronDown size={16} strokeWidth={2} aria-hidden />}
                </button>
              )}
            >
              Fissati
            </GroupHead>
            {showBooked ? (
              <Card>
                {byGroup.fissato.map((row, index) => row.booked ? (
                  <Link key={row.dog.id} to={`/appuntamenti/${row.booked.id}`} state={sheetState(location)} style={rowStyle(index === 0)}>
                    <StatusMark tone={row.late ? 'warn' : 'ok'} />
                    <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" species={row.dog.species} />
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dog.name}</span>
                    {row.late ? (
                      <Chip tone="warn">{`Fissato in ritardo · ${shortDate(row.booked.start)}`}</Chip>
                    ) : (
                      <Chip tone="ok">{shortDate(row.booked.start)}</Chip>
                    )}
                  </Link>
                ) : null)}
              </Card>
            ) : null}
          </section>
        ) : null}
      </div>
    </ShellFrame>
  )
}
