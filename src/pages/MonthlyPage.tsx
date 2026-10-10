import { addMonths, format } from 'date-fns'
import { Check, Clock } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
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
import { monthBoard, type CycleRow } from '../lib/cycle'
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

function monthTitle(date: Date): string {
  const raw = format(date, 'MMMM yyyy', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}

function dueCopy(row: CycleRow): string {
  if (!row.lastCompleted) return 'Scade oggi'
  const last = format(row.lastCompleted.start, 'd MMM', IT_DATE)
  const due = format(row.due, 'd MMM', IT_DATE)
  return `Ultimo ${last} · scade ${due}`
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

function StatusMark({ booked }: { booked: boolean }) {
  const frame: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
  }
  if (booked) {
    return (
      <span aria-hidden style={{ ...frame, background: 'var(--ok)', color: '#fff' }}>
        <Check size={12} strokeWidth={3} aria-hidden />
      </span>
    )
  }
  return (
    <span aria-hidden style={{ ...frame, border: '1.5px dashed var(--warn)', color: 'var(--warn)' }}>
      <Clock size={12} strokeWidth={2.5} aria-hidden />
    </span>
  )
}

export function MonthlyPage() {
  const openSheet = useOpenSheet()
  const location = useLocation()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services: seeded } = useServices(uid)
  const services = uid ? seeded : []
  const now = new Date()
  const current = monthStart(now)
  const following = addMonths(current, 1)
  const [segment, setSegment] = useState<MonthSegment>('corrente')
  const [filter, setFilter] = useState<BoardFilter>('tutti')
  const month = segment === 'corrente' ? current : following
  const board = monthBoard(dogs, appointments, month, now)
  const total = board.fissati.length + board.daFissare.length
  const daFissare = filter === 'fissati' ? [] : board.daFissare
  const fissati = filter === 'da_fissare' ? [] : board.fissati
  const empty = daFissare.length === 0 && fissati.length === 0
  const filled = total === 0 ? 0 : (board.fissati.length / total) * 100

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
            <span style={{ fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{`${board.fissati.length}/${total}`}</span>
            <span style={{ color: 'var(--tx2)', fontSize: TYPE.base }}>fissati</span>
            <span style={{ marginLeft: 'auto' }}>
              <Chip tone="warn">{`${board.daFissare.length} da fissare`}</Chip>
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Mensili fissati"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={board.fissati.length}
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
        {empty ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun mensile</p> : null}
        {daFissare.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Da fissare</SectionTitle>
            <Card>
              {daFissare.map((row, index) => (
                <div key={row.dog.id} style={rowStyle(index === 0)}>
                  <StatusMark booked={false} />
                  <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dog.name}</div>
                    <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{dueCopy(row)}</div>
                  </div>
                  <Button variant="ghost" onClick={() => openSheet(bookHref(row.dog.id, appointments, services, now))} style={{ flex: 'none' }}>Fissa</Button>
                </div>
              ))}
            </Card>
          </section>
        ) : null}
        {fissati.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Fissati</SectionTitle>
            <Card>
              {fissati.map((row, index) => row.booked ? (
                <Link key={row.dog.id} to={`/appuntamenti/${row.booked.id}`} state={sheetState(location)} style={rowStyle(index === 0)}>
                  <StatusMark booked />
                  <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.dog.name}</span>
                  <Chip tone="ok">{format(row.booked.start, 'd MMM', IT_DATE)}</Chip>
                </Link>
              ) : null)}
            </Card>
          </section>
        ) : null}
      </div>
    </ShellFrame>
  )
}
