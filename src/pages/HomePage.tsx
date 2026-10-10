import { format } from 'date-fns'
import { Bell, Check, Settings } from 'lucide-react'
import brandIcon from '../assets/brand/groomly-icon.svg'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { DogAvatar } from '../components/domain/DogAvatar'
import { MonthlyBanner } from '../components/domain/MonthlyBanner'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { SearchBar } from '../components/ui/SearchBar'
import { SectionTitle } from '../components/ui/SectionTitle'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dogPortrait } from '../lib/dogPhoto'
import { appointmentEnd, formatBookedWhen, isOverdue, localDayKey, onLocalDay, sumDuration } from '../lib/appointments'
import { dueSoon, monthlyStatus } from '../lib/cycle'
import { formatCompactDuration } from '../lib/display'
import { dogMark } from '../lib/dogList'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason, Dog } from '../types/models'
import { ShellFrame } from './ShellFrame'

function currentOrNext(items: Appointment[], now: Date): string | null {
  const open = items.filter((item) => item.status === 'programmato')
  const running = open.find((item) => item.start.getTime() <= now.getTime() && now.getTime() < appointmentEnd(item.start, item.services).getTime())
  if (running) return running.id
  return open.find((item) => item.start.getTime() > now.getTime())?.id ?? null
}

function todayOrder(items: Appointment[]): Appointment[] {
  const byStart = (a: Appointment, b: Appointment) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
  const open = items.filter((item) => item.status === 'programmato').sort(byStart)
  const done = items.filter((item) => item.status === 'completato').sort(byStart)
  return [...open, ...done]
}

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
  padding: '5px 8px 4px',
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
  const { appointments, setStatus } = useAppointments(uid)
  const { services: seeded } = useServices(uid)
  const toast = useToast()
  const [askingCancel, setAskingCancel] = useState<Appointment | null>(null)
  const services = uid ? seeded : []
  const now = new Date()
  const today = todayOrder(onLocalDay(appointments, now))
  const highlighted = currentOrNext(today, now)
  const closing = appointments
    .filter((item) => isOverdue(item, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
  const minutes = today.reduce((total, item) => total + sumDuration(item.services), 0)
  const todayPath = `/calendario?data=${localDayKey(now)}`
  const daysBefore = settings.monthlyReminder.daysBefore
  const soon = dueSoon(dogs, appointments, now, daysBefore)
  const bookedMonthly = dogs.filter((dog) => monthlyStatus(dog, appointments, now, daysBefore)?.group === 'fissato').length
  const monthlyTotal = bookedMonthly + soon.length
  const month = format(now, 'MMM', IT_DATE).replace(/\.$/, '')

  function restoreScheduled(id: string) {
    if (!setStatus(id, 'programmato')) toast.show('Salvataggio non riuscito', 'plain')
  }

  function closeVisit(appointment: Appointment, status: 'completato' | 'non_venuto' | 'disdetto', reason?: Exclude<CancelReason, 'deceduto'>) {
    if (!setStatus(appointment.id, status, reason)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    if (status === 'completato') return
    const message = status === 'non_venuto' ? 'Non venuto' : 'Appuntamento disdetto'
    toast.show(message, 'plain', { label: 'Annulla', onClick: () => restoreScheduled(appointment.id) }, undefined, 5000)
  }
  const recentIds = uid ? settings.recentDogIds : []
  const recent = recentIds
    .map((dogId) => dogs.find((item) => item.id === dogId))
    .filter((item): item is Dog => item != null && item.status === 'attivo')
    .slice(0, 8)
  const activeCount = dogs.filter((item) => item.status === 'attivo').length

  return (
    <ShellFrame>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `2px ${SIZES.pagePadX}px 0` }}>
        <img alt="" src={brandIcon} width={26} height={26} style={{ flex: 'none', display: 'block' }} />
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
              const style: CSSProperties = {
                ...(index === 0 ? { borderTop: 'none' } : {}),
                ...(appointment.id === highlighted ? { borderLeft: '3px solid var(--pri)' } : {}),
              }
              return (
                <Row key={appointment.id} style={style} data-current={appointment.id === highlighted ? 'true' : undefined}>
                  <AppointmentRow
                    appointment={appointment}
                    dog={dog}
                    services={services}
                    mark={dog ? dogMark(dog, dogs.filter((item) => item.status === 'attivo')) : null}
                    onOpen={dog ? () => navigate(`/animali/${dog.id}`) : undefined}
                  />
                  {appointment.status === 'completato' ? (
                    <Check size={18} strokeWidth={3} color="var(--ok)" role="img" aria-label="Completato" style={{ flex: 'none' }} />
                  ) : null}
                </Row>
              )
            })}
          </Card>
        )}
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        {closing.length > 0 ? (
          <section aria-label="Da chiudere" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionTitle>{`Da chiudere (${closing.length})`}</SectionTitle>
            <Card>
              {closing.map((appointment, index) => {
                const dog = dogs.find((item) => item.id === appointment.dogId)
                return (
                  <div
                    key={appointment.id}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}
                  >
                    <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{formatBookedWhen(appointment.start)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <AppointmentRow
                        appointment={appointment}
                        dog={dog}
                        services={services}
                        mark={dog ? dogMark(dog, dogs.filter((item) => item.status === 'attivo')) : null}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" aria-label={`Completato ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'completato')} style={{ flex: 1, minWidth: 0 }}>Completato</Button>
                      <Button variant="ghost" aria-label={`Non venuto ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'non_venuto')} style={{ flex: 1, minWidth: 0 }}>Non venuto</Button>
                      <Button variant="ghost" aria-label={`Disdetto ${dog?.name ?? 'cane'}`} onClick={() => setAskingCancel(appointment)} style={{ flex: 1, minWidth: 0 }}>Disdetto</Button>
                    </div>
                  </div>
                )
              })}
            </Card>
          </section>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={todayPath} style={tile}>
            <span style={tileValue}>{`${today.length} · ${formatCompactDuration(minutes)}`}</span>
            <span style={tileLabel}>Oggi</span>
          </Link>
          <Link to="/mensili" style={tile}>
            <span style={tileValue}>{`${bookedMonthly}/${monthlyTotal}`}</span>
            <span style={tileLabel}>{`Mensili ${month}`}</span>
          </Link>
          <Link to="/listino" style={tile}>
            <span style={tileValue}>Listino</span>
            <span style={tileLabel}>{uid && settings.priceList ? 'PDF · apri' : 'Apri'}</span>
          </Link>
        </div>
        {recent.length < 3 ? null : (
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
                    <DogAvatar alt="" src={dogPortrait(dog)} size="grid" species={dog.species} />
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
      <Sheet open={askingCancel !== null} title="Chi disdice?" onClose={() => setAskingCancel(null)} closeLabel="Indietro">
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            onClick={() => {
              const target = askingCancel
              setAskingCancel(null)
              if (target) closeVisit(target, 'disdetto', 'cliente')
            }}
            style={{ flex: 1 }}
          >
            Cliente
          </Button>
          <Button
            onClick={() => {
              const target = askingCancel
              setAskingCancel(null)
              if (target) closeVisit(target, 'disdetto', 'salone')
            }}
            style={{ flex: 1 }}
          >
            Salone
          </Button>
        </div>
      </Sheet>
    </ShellFrame>
  )
}
