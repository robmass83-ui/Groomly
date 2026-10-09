import { format } from 'date-fns'
import { Bell, PawPrint, Settings } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { DogAvatar } from '../components/domain/DogAvatar'
import { MonthlyBanner } from '../components/domain/MonthlyBanner'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Card, Row } from '../components/ui/Card'
import { SearchBar } from '../components/ui/SearchBar'
import { SectionTitle } from '../components/ui/SectionTitle'
import { getSettings } from '../data/local/settings'
import { ensureServiceSeed } from '../data/local/services'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { localDayKey, onLocalDay, sumDuration } from '../lib/appointments'
import { dueSoon, monthBoard } from '../lib/cycle'
import { formatCompactDuration } from '../lib/display'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

const iconLink: CSSProperties = {
  width: SIZES.headerIconBtn,
  height: SIZES.headerIconBtn,
  borderRadius: SIZES.headerIconRadius,
  background: 'var(--surf)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  position: 'relative',
  textDecoration: 'none',
  flex: 'none',
}

const tile: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: 'var(--card)',
  border: `${SIZES.card.border}px solid var(--line)`,
  borderRadius: SIZES.card.radius,
  padding: '8px 8px 7px',
  textDecoration: 'none',
  color: 'inherit',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const tileValue: CSSProperties = {
  fontWeight: 700,
  fontSize: TYPE.dogName,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
}

const tileLabel: CSSProperties = {
  fontSize: TYPE.meta,
  fontWeight: 600,
  color: 'var(--tx3)',
}

const sectionLink: CSSProperties = {
  fontSize: TYPE.meta,
  fontWeight: 700,
  color: 'var(--pri)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

export function HomePage() {
  const navigate = useNavigate()
  const session = useSession()
  const { settings } = useSettings()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const today = onLocalDay(appointments, now)
  const minutes = today.reduce((total, item) => total + sumDuration(item.services), 0)
  const todayPath = `/calendario?data=${localDayKey(now)}`
  const board = monthBoard(dogs, appointments, now, now)
  const monthlyTotal = board.fissati.length + board.daFissare.length
  const month = format(now, 'MMM', IT_DATE).replace(/\.$/, '')
  const soon = dueSoon(dogs, appointments, now, settings.monthlyReminder.daysBefore)
  const recentIds = uid ? getSettings(uid).recentDogIds : []
  const recent = recentIds
    .map((dogId) => dogs.find((item) => item.id === dogId))
    .filter((item): item is Dog => item != null && item.status === 'attivo')
    .slice(0, 8)
  const activeCount = dogs.filter((item) => item.status === 'attivo').length

  return (
    <ShellFrame>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--pri), var(--tea))',
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
          }}
        >
          <PawPrint size={15} strokeWidth={2} color="#fff" aria-hidden />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: TYPE.pageTitle, fontWeight: 700, letterSpacing: TYPE.pageTitleTracking, lineHeight: 1.15 }}>
            Groomly
          </h1>
          <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>
            {formatHomeDate(now)}
          </small>
        </div>
        <Link to="/mensili" aria-label="Avvisi" style={iconLink}>
          <Bell size={16} strokeWidth={2} aria-hidden />
          {soon.length > 0 ? (
            <span
              data-testid="bell-dot"
              aria-hidden
              style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 999, background: 'var(--bad)' }}
            />
          ) : null}
        </Link>
        <Link to="/impostazioni" aria-label="Impostazioni" style={iconLink}>
          <Settings size={16} strokeWidth={2} aria-hidden />
        </Link>
      </header>
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar
          placeholder="Cerca cane, proprietario, razza…"
          onClick={() => navigate('/animali', { state: { focusSearch: true } })}
        />
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={todayPath} style={tile}>
            <span style={tileValue}>{`${today.length} · ${formatCompactDuration(minutes)}`}</span>
            <span style={tileLabel}>Oggi</span>
          </Link>
          <Link to="/mensili" style={tile}>
            <span style={tileValue}>{`${board.fissati.length}/${monthlyTotal}`}</span>
            <span style={tileLabel}>{`Mensili ${month}`}</span>
          </Link>
          <Link to="/listino" style={tile}>
            <span style={tileValue}>Listino</span>
            <span style={tileLabel}>{uid && getSettings(uid).priceList ? 'PDF · apri' : 'Apri'}</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle>Oggi</SectionTitle>
          </div>
          <Link to={todayPath} style={sectionLink}>Calendario ›</Link>
        </div>
        {today.length === 0 ? (
          <Card>
            <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
          </Card>
        ) : (
          <Card>
            {today.map((appointment, index) => {
              const dog = dogs.find((item) => item.id === appointment.dogId)
              return (
                <Row key={appointment.id} style={index === 0 ? { borderTop: 'none' } : undefined}>
                  <AppointmentRow
                    appointment={appointment}
                    dog={dog}
                    services={services}
                    onOpen={dog ? () => navigate(`/animali/${dog.id}`) : undefined}
                  />
                </Row>
              )
            })}
          </Card>
        )}
        {recent.length === 0 ? null : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SectionTitle>Visti di recente</SectionTitle>
              </div>
              <Link to="/animali" style={sectionLink}>{`Tutti ${activeCount} ›`}</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {recent.map((dog) => (
                <Link
                  key={dog.id}
                  to={`/animali/${dog.id}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                >
                  <span style={{ position: 'relative', width: SIZES.avatar.grid, height: SIZES.avatar.grid }}>
                    <DogAvatar alt="" src={dog.photo} size="grid" />
                    <span style={{ position: 'absolute', right: -6, bottom: -4 }}>
                      <TemperamentIcon kind={dog.temperament} size={SIZES.temperamentIcon.grid} />
                    </span>
                  </span>
                  <span style={{ maxWidth: '100%', fontSize: TYPE.meta, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dog.name}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </ShellFrame>
  )
}
