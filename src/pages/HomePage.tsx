import { format } from 'date-fns'
import { Check, Clock, Euro, FileText, Repeat } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CloseVisitDialog } from '../components/appointment/CloseVisitDialog'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { PersonalEntry } from '../components/domain/PersonalAppointment'
import { MonthlyBanner } from '../components/domain/MonthlyBanner'
import { EarningsTile } from '../components/earnings/EarningsTile'
import { BrandBar } from '../components/layout/BrandBar'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { IconTile } from '../components/ui/IconTile'
import { SearchBar } from '../components/ui/SearchBar'
import { SectionHeader } from '../components/ui/SectionTitle'
import { StatusPill } from '../components/ui/StatusPill'
import { firebaseEnabled } from '../data/firebase/enabled'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useAppointments } from '../hooks/useAppointments'
import { useClosures } from '../hooks/useClosures'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { bannerBackup } from '../lib/statoDrive'
import { useSettings } from '../hooks/useSettings'
import { appointmentEnd, canComplete, formatBookedWhen, isOverdue, localDayKey, nextCloseDue, onLocalDay, sumDuration, sumPrice } from '../lib/appointments'
import { CLOSED_CELL_BACKGROUND, cellPaint } from '../lib/calendarView'
import { closureOn } from '../lib/closures'
import { appointmentKind } from '../lib/personal'
import { monthlyStatus, visibleInMonth, type MonthlyRow } from '../lib/cycle'
import { formatCompactDuration } from '../lib/display'
import { fiscalNoticeVisible } from '../lib/profile'
import type { ClosePatch } from '../lib/closeVisit'
import { earnedOn } from '../lib/earnings'
import { dogMark } from '../lib/dogList'
import { formatHomeDate, IT_DATE } from '../lib/format'
import { mostraIncassoZero, testoAgendaVuota } from '../lib/finestraAgenda'
import { nextVisitPill } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
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

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function personalWhen(appointment: Appointment): string {
  const start = clock(appointment.start)
  if (!appointment.plannedEnd) return start
  return `${start}\u2013${clock(appointment.plannedEnd)}`
}

function byStartThenId(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
}

function ClosureBand({ reason, onOpen }: { reason: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Apri chiusura ${reason}`}
      onClick={onOpen}
      style={{
        border: 0,
        borderRadius: 8,
        ...cellPaint(CLOSED_CELL_BACKGROUND),
        color: 'var(--bad)',
        font: 'inherit',
        fontWeight: 700,
        minHeight: 44,
        height: 'auto',
        textAlign: 'left',
        padding: '8px 12px',
      }}
    >
      {`Salone chiuso · ${reason}`}
    </button>
  )
}

const tile: CSSProperties = {
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
  ...USER_TEXT,
}

const tileLabel: CSSProperties = {
  fontSize: TYPE.meta,
  fontWeight: 600,
  color: 'var(--tx3)',
  ...USER_TEXT,
}

function Notice({ label, title, detail, action, onAction }: { label: string; title: string; detail: string; action: string; onAction: () => void }) {
  return (
    <section
      aria-label={label}
      style={{ background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: TYPE.base }}>{title}</p>
        <p style={{ margin: 0, fontSize: TYPE.base, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{detail}</p>
      </div>
      <Button variant="ghost" onClick={onAction} style={{ color: 'var(--warn)' }}>{action}</Button>
    </section>
  )
}

const sectionLink: CSSProperties = {
  fontSize: TYPE.meta,
  fontWeight: 700,
  color: 'var(--pri)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const closeActions: CSSProperties = {
  display: 'flex',
  gap: 8,
}

const closeAction: CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  width: 'auto',
  minHeight: 44,
  height: 'auto',
  padding: '6px 4px',
  fontSize: 12,
  lineHeight: 1.15,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  alignContent: 'center',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  whiteSpace: 'normal',
  overflowWrap: 'normal',
}

export function HomePage() {
  const navigate = useNavigate()
  const openSheet = useOpenSheet()
  const session = useSession()
  const { settings, ready } = useSettings()
  const showEmailNotice = firebaseEnabled() && session.legacy && !session.emailVerified
  const showFiscalNotice = ready && fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode)
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs, settled } = useDogs(uid)
  const { appointments, synced, saveClose, setStatus } = useAppointments(uid)
  const { closures } = useClosures(uid)
  const { services: seeded } = useServices(uid)
  const toast = useToast()
  const [askingCancel, setAskingCancel] = useState<Appointment | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const services = uid ? seeded : []
  const dueAt = nextCloseDue(appointments, now)
  useEffect(() => {
    if (dueAt === null) return
    const delay = Math.min(Math.max(0, dueAt - Date.now()), 2_147_483_647)
    const id = setTimeout(() => setNow(new Date()), delay)
    return () => clearTimeout(id)
  }, [dueAt])
  const dayItems = onLocalDay(appointments, now)
  const visits = todayOrder(dayItems.filter((item) => appointmentKind(item) === 'pelosetto'))
  const listed = [...visits, ...dayItems.filter((item) => appointmentKind(item) === 'personale')].sort(byStartThenId)
  const highlighted = currentOrNext(visits, now)
  const closing = appointments
    .filter((item) => appointmentKind(item) === 'pelosetto' && isOverdue(item, now))
    .sort(byStartThenId)
  const minutes = visits.reduce((total, item) => total + sumDuration(item.services), 0)
  const todayPath = `/calendario?data=${localDayKey(now)}`
  const todayClosure = closureOn(closures, localDayKey(now))
  const daysBefore = settings.monthlyReminder.daysBefore
  const thisMonth = dogs
    .map((dog) => monthlyStatus(dog, appointments, now, daysBefore))
    .filter((row): row is MonthlyRow => row !== null)
    .filter((row) => visibleInMonth(row, now, now))
  const bookedMonthly = thisMonth.filter((row) => row.group === 'fissato').length
  const monthlyTotal = bookedMonthly + thisMonth.filter((row) => row.group === 'in_ritardo' || row.group === 'in_scadenza' || row.group === 'da_fissare').length
  const month = format(now, 'MMM', IT_DATE).replace(/\.$/, '')
  const earnedToday = earnedOn(appointments, now, now)
  const inAttesa = firebaseEnabled() && (!synced || !settled)
  const nascondiZero = mostraIncassoZero(inAttesa, earnedToday)

  function restoreScheduled(id: string) {
    if (!setStatus(id, 'programmato')) toast.show('Salvataggio non riuscito', 'plain')
  }

  const closingVisit = closingId ? appointments.find((item) => item.id === closingId) ?? null : null
  const closingMinutes = closingVisit ? sumDuration(closingVisit.services) : 0
  const closingPrice = closingVisit ? sumPrice(closingVisit.services) : 0

  function finishClose(appointment: Appointment, patch: ClosePatch) {
    if (!canComplete(appointment.start, new Date())) return
    if (!saveClose(appointment.id, patch, true)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    setClosingId(null)
  }

  function closeVisit(appointment: Appointment, status: 'completato' | 'non_venuto' | 'disdetto', reason?: Exclude<CancelReason, 'deceduto'>) {
    if (status === 'completato') {
      if (!canComplete(appointment.start, new Date())) return
      setClosingId(appointment.id)
      return
    }
    if (!setStatus(appointment.id, status, reason)) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    const message = status === 'non_venuto' ? 'Non venuto' : 'Appuntamento disdetto'
    toast.show(message, 'plain', { label: 'Annulla', onClick: () => restoreScheduled(appointment.id) }, undefined, 5000)
  }

  return (
    <ShellFrame>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
        <BrandBar size="large" as="h1" />
        <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>
          {formatHomeDate(now)}
        </small>
        {bannerBackup({
          ultimo: localStorage.getItem(`groomly.users.${uid}.driveUltimoInvio`),
          errore: localStorage.getItem(`groomly.users.${uid}.driveUltimoErrore`) !== null,
          frequenza: settings.backup.frequenza,
          now,
        }) ? (
          <Link to="/impostazioni" style={{ color: 'var(--bad)', fontSize: TYPE.meta, fontWeight: 600 }}>
            Il backup automatico non funziona. Aprilo in Impostazioni.
          </Link>
        ) : null}
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
        {todayClosure ? <ClosureBand reason={todayClosure.reason} onOpen={() => openSheet(`/chiusure/${todayClosure.id}`)} /> : null}
        {listed.length === 0 ? (
          <Card>
            <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>{testoAgendaVuota(inAttesa)}</p>
            <div style={{ padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
              <Button type="button" onClick={() => openSheet('/appuntamenti/nuovo')} style={{ width: '100%', height: 'auto' }}>
                Nuovo appuntamento
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            {listed.map((appointment, index) => {
              if (appointmentKind(appointment) === 'personale') {
                const title = appointment.title?.trim() || 'Personale'
                return (
                  <Row key={appointment.id} style={{ background: 'var(--personal-s)', padding: 0, ...(index === 0 ? { borderTop: 'none' } : {}) }}>
                    <PersonalEntry title={title} when={personalWhen(appointment)} onOpen={() => openSheet('/appuntamenti/personale/' + appointment.id)} />
                  </Row>
                )
              }
              const dog = dogs.find((item) => item.id === appointment.dogId)
              const next = appointment.id === highlighted
              const done = appointment.status === 'completato'
              const style: CSSProperties = {
                ...(index === 0 ? { borderTop: 'none' } : {}),
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
        {showEmailNotice ? (
          <Notice
            label="Conferma la tua email"
            title="Conferma la tua email"
            detail="Apri il link che ti abbiamo inviato"
            action="Invia"
            onAction={() => { void session.resendVerification().catch(() => toast.show('Invio non riuscito', 'plain')) }}
          />
        ) : null}
        {showFiscalNotice ? (
          <Notice
            label="Completa l'attività"
            title="Aggiungi partita IVA o codice fiscale"
            detail="Per completare l'attività"
            action="Aggiungi"
            onAction={() => navigate('/impostazioni', { state: { openBusiness: true } })}
          />
        ) : null}
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        {closing.length > 0 ? (
          <section id="da-chiudere" aria-label="Da chiudere" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                    <div style={closeActions}>
                      <Button size="sm" variant="ok" aria-label={`Completato ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'completato')} style={closeAction}>
                        <Check size={14} aria-hidden />
                        Completato
                      </Button>
                      <Button size="sm" variant="secondary" aria-label={`Non venuto ${dog?.name ?? 'cane'}`} onClick={() => closeVisit(appointment, 'non_venuto')} style={closeAction}>Non venuto</Button>
                      <Button size="sm" variant="bad" aria-label={`Disdetto ${dog?.name ?? 'cane'}`} onClick={() => setAskingCancel(appointment)} style={closeAction}>Disdetto</Button>
                    </div>
                  </div>
                )
              })}
            </Card>
          </section>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          <Link to={todayPath} style={tile}>
            <IconTile tone="prim" size="sm"><Clock size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{`${visits.length} · ${formatCompactDuration(minutes)}`}</span>
            <span style={tileLabel}>Oggi</span>
          </Link>
          {nascondiZero ? (
            <span style={tile} aria-label="Incassi di oggi in caricamento">
              <IconTile tone="ok" size="sm"><Euro size={13} strokeWidth={2} aria-hidden /></IconTile>
              <span style={tileValue}>…</span>
              <span style={tileLabel}>Incassi oggi</span>
            </span>
          ) : (
            <EarningsTile amount={earnedToday} hidden={settings.ui.hideAmounts} style={tile} valueStyle={tileValue} labelStyle={tileLabel} />
          )}
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
      {closingVisit ? (
        <CloseVisitDialog
          key={`${closingVisit.id}-${closingVisit.updatedAt.getTime()}`}
          open
          mode="complete"
          quotedPrice={closingPrice}
          quotedMinutes={closingMinutes}
          initialPrice={closingVisit.total ?? closingPrice}
          initialMinutes={closingVisit.actualDurationMin ?? closingMinutes}
          initialNote={closingVisit.adjustmentNote ?? ''}
          initialPayment={closingVisit.paymentMethod ?? null}
          onClose={() => setClosingId(null)}
          onNone={(patch) => finishClose(closingVisit, patch)}
          onSave={(patch) => finishClose(closingVisit, patch)}
        />
      ) : null}
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
