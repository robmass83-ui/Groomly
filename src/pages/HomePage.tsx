import { format } from 'date-fns'
import { Check, Clock, FileText, Repeat } from 'lucide-react'
import brandIcon from '../assets/brand/groomly-icon.svg'
import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { MonthlyBanner } from '../components/domain/MonthlyBanner'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { SearchBar } from '../components/ui/SearchBar'
import { SectionHeader } from '../components/ui/SectionTitle'
import { StatusPill } from '../components/ui/StatusPill'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { bookFollowUpHref, bookHref, unbookedCopy } from '../lib/monthly'
import { appointmentEnd, formatBookedWhen, isOverdue, localDayKey, onLocalDay, sumDuration } from '../lib/appointments'
import { dueSoon, fissatoVisible, monthlyStatus, unbookedMonthly } from '../lib/cycle'
import { formatCompactDuration } from '../lib/display'
import { dogMark } from '../lib/dogList'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { nextVisitPill } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason } from '../types/models'
import { ShellFrame } from './ShellFrame'

function currentOrNext(items: Appointment[], now: Date): string | null {
  const open = items.filter((item) => item.status === 'programmato')
  const running = open.find((item) => item.start.getTime() <= now.getTime() && now.getTime() < appointmentEnd(item.start, item.services).getTime())
  if (running) return running.id
  return open.find((item) => item.start.getTime() > now.getTime())?.id ?? null
}

function todayOrder(items: Appointment[]): Appointment[] {
  return items
    .filter((item) => item.status === 'programmato' || item.status === 'completato')
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
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
  const openSheet = useOpenSheet()
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
  const unbooked = unbookedMonthly(dogs, appointments, now)
  const bookedMonthly = dogs.filter((dog) => {
    const row = monthlyStatus(dog, appointments, now, daysBefore)
    return row?.group === 'fissato' && row.booked !== null && fissatoVisible(row.booked.start, now, now)
  }).length
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
      </header>
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar
          placeholder="Cerca cane, proprietario, razza…"
          onClick={() => navigate('/animali', { state: { focusSearch: true } })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionHeader>Oggi</SectionHeader>
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
              const next = appointment.id === highlighted
              const done = appointment.status === 'completato'
              const style: CSSProperties = {
                ...(index === 0 ? { borderTop: 'none' } : {}),
                ...(done ? { opacity: 0.72 } : {}),
              }
              return (
                <Row key={appointment.id} style={style} data-current={next ? 'true' : undefined}>
                  <AppointmentRow
                    appointment={appointment}
                    dog={dog}
                    services={services}
                    mark={dog ? dogMark(dog, dogs.filter((item) => item.status === 'attivo')) : null}
                    onOpen={dog ? () => navigate(`/animali/${dog.id}`) : undefined}
                    active={next}
                    aside={
                      next ? (
                        <StatusPill tone="prim">{nextVisitPill(appointment.start, now)}</StatusPill>
                      ) : done ? (
                        <StatusPill tone="ok">Completato</StatusPill>
                      ) : undefined
                    }
                  />
                </Row>
              )
            })}
          </Card>
        )}
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        {unbooked.length > 0 ? (
          <section aria-label="Mensili da fissare" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionHeader count={unbooked.length} link={<Link to="/mensili" style={sectionLink}>Apri ›</Link>}>
              Mensili da fissare
            </SectionHeader>
            <Card>
              {unbooked.map((row, index) => (
                <div
                  key={row.dog.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
                    borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)`,
                    minWidth: 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{row.dog.name}</div>
                    <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{unbookedCopy(row)}</div>
                  </div>
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={() => openSheet(row.kind === 'prossimo' ? bookFollowUpHref(row.dog.id, row.due, row.upcoming) : bookHref(row.dog.id, appointments, services, now, row.dog))}
                    style={{ flex: 'none' }}
                  >
                    {`Fissa ${row.dog.name}`}
                  </Button>
                </div>
              ))}
            </Card>
          </section>
        ) : null}
        {closing.length > 0 ? (
          <section aria-label="Da chiudere" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionHeader>{`Da chiudere (${closing.length})`}</SectionHeader>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 6 }}>
                      <Button size="sm" variant="ok" aria-label={`Completato ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'completato')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 0 }}>
                        <Check size={13} aria-hidden />
                        Completato
                      </Button>
                      <Button size="sm" variant="secondary" aria-label={`Non venuto ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'non_venuto')} style={{ minWidth: 0 }}>Non venuto</Button>
                      <Button size="sm" variant="bad" aria-label={`Disdetto ${dog?.name ?? 'cane'}`} onClick={() => setAskingCancel(appointment)} style={{ minWidth: 0 }}>Disdetto</Button>
                    </div>
                  </div>
                )
              })}
            </Card>
          </section>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={todayPath} style={tile}>
            <IconTile tone="prim" size="sm"><Clock size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{`${today.length} · ${formatCompactDuration(minutes)}`}</span>
            <span style={tileLabel}>Oggi</span>
          </Link>
          <Link to="/mensili" style={tile}>
            <IconTile tone="ok" size="sm"><Repeat size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{`${bookedMonthly}/${monthlyTotal}`}</span>
            <span style={tileLabel}>{`Mensili ${month}`}</span>
          </Link>
          <Link to="/listino" style={tile}>
            <IconTile tone="warn" size="sm"><FileText size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>Listino</span>
            <span style={tileLabel}>{uid && settings.priceList ? 'PDF · apri' : 'Apri'}</span>
          </Link>
        </div>
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
