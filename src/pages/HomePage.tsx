import { Check, Clock, Euro, FileText, Repeat } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
import { usePiano } from '../hooks/usePiano'
import { propostaVisibile } from '../lib/piano'
import { CodaInPartenza } from '../components/piano/CodaInPartenza'
import { segnaPrimoDato } from '../lib/primoDato'
import { AvvisoProposta } from '../components/piano/AvvisoProposta'
import { RigaRichieste } from '../components/piano/RigaRichieste'
import { RiquadroRichiesta } from '../components/piano/RiquadroRichiesta'
import type { RichiestaNuova } from '../data/firebase/client'
import { codaDaImpostazioni, fermaRiga, visibiliInHome, type RigaCoda } from '../lib/codaEmail'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { righeCodaSalone } from '../lib/codaHome'
import { romeDay } from '../lib/romeTime'
import { slugDaNome } from '../lib/slug'
import { servizioEmailAcceso, type ChiaveServizioEmail } from '../lib/serviziEmail'
import { bannerBackup } from '../lib/statoDrive'
import { useSettings } from '../hooks/useSettings'
import { appointmentEnd, canComplete, formatBookedWhen, isOverdue, localDayKey, nextCloseDue, onLocalDay, STATO_COMPLETATO, STATO_DISDETTO, sumDuration, sumPrice, type StatoChiusura } from '../lib/appointments'
import { CLOSED_CELL_BACKGROUND, cellPaint } from '../lib/calendarView'
import { closureOn } from '../lib/closures'
import { appointmentKind } from '../lib/personal'
import { monthlyStatus, visibleInMonth, type MonthlyRow } from '../lib/cycle'
import { formatCompactDuration } from '../lib/display'
import { fiscalNoticeVisible } from '../lib/profile'
import type { ClosePatch } from '../lib/closeVisit'
import { earnedOn } from '../lib/earnings'
import { dogMark } from '../lib/dogList'
import { dataBreve, meseCorto } from '../i18n/format'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { agendaInAttesa, mostraIncassoZero } from '../lib/finestraAgenda'
import { nextVisitPill } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { Appointment, CancelReason } from '../types/models'
import { ShellFrame } from './ShellFrame'

const SERVIZI_IN_PARTENZA: readonly ChiaveServizioEmail[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']

function caneMailAttivo(status: string): boolean {
  return status !== 'non_in_cura' && status !== 'deceduto'
}

function notaProblemaOggi(appointment: Appointment, adesso: Date): boolean {
  const oggi = romeDay(adesso)
  return (appointment.extraNotes ?? []).some((nota) => romeDay(nota.createdAt) === oggi && /problema|lamentel/i.test(nota.text))
}

function firmaCoda(righe: readonly RigaCoda[]): string {
  return JSON.stringify(righe.map((riga) => ({
    id: riga.id,
    tipo: riga.tipo,
    dogId: riga.dogId,
    appointmentId: riga.appointmentId,
    evento: riga.evento,
    parteIl: riga.parteIl,
    stato: riga.stato,
    motivo: riga.motivo,
    email: riga.email,
    nomeCane: riga.nomeCane,
    nomeCliente: riga.nomeCliente,
    inizio: riga.inizio,
  })))
}

function currentOrNext(items: Appointment[], now: Date): string | null {
  const open = items.filter((item) => item.status === 'programmato')
  const running = open.find((item) => item.start.getTime() <= now.getTime() && now.getTime() < appointmentEnd(item.start, item.services).getTime())
  if (running) return running.id
  return open.find((item) => item.start.getTime() > now.getTime())?.id ?? null
}

function todayOrder(items: Appointment[]): Appointment[] {
  return items
    .filter((item) => item.status === 'programmato' || item.status === STATO_COMPLETATO)
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
  const frasi = useFrasi()
  return (
    <button
      type="button"
      aria-label={frasi.homeApriChiusura.replace('{{motivo}}', reason)}
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
      {frasi.homeSaloneChiuso.replace('{{motivo}}', reason)}
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
  flexWrap: 'nowrap',
  gap: 6,
}

const closeAction: CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  width: 'auto',
  minHeight: 'auto',
  height: 'auto',
  padding: '4px 6px',
  fontSize: 12,
  lineHeight: 1.15,
  display: 'flex',
  alignItems: 'center',
  alignContent: 'center',
  justifyContent: 'center',
  gap: 4,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflowWrap: 'normal',
}

export function HomePage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const navigate = useNavigate()
  const openSheet = useOpenSheet()
  const session = useSession()
  const { settings, ready, save } = useSettings()
  const piano = usePiano()
  const showEmailNotice = firebaseEnabled() && session.legacy && !session.emailVerified
  const role = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const vedeAvvisoPiano = session.gate.kind === 'in' && role !== 'socio' && role !== 'collaboratore'
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const vedeRichieste = funzioneVisibile(piano.stato, piano.funzioni, 'prenotazioni')
  const { dogs, settled: dogsSettled } = useDogs(uid)
  const { appointments, synced, saveClose, setStatus, remove } = useAppointments(uid)
  useEffect(() => {
    if (!synced) return
    segnaPrimoDato(typeof performance !== 'undefined' ? performance.now() : Date.now())
  }, [synced])
  const { closures } = useClosures(uid)
  const { services: seeded } = useServices(uid)
  const toast = useToast()
  const [askingCancel, setAskingCancel] = useState<Appointment | null>(null)
  const [askingRemove, setAskingRemove] = useState<Appointment | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [invioId, setInvioId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [richieste, setRichieste] = useState<RichiestaNuova[]>([])
  const [avvisoPiano, setAvvisoPiano] = useState<{ testo: string; letto: boolean } | null>(null)
  const [segnaAvviso, setSegnaAvviso] = useState(false)
  // Il riquadro tiene la richiesta aperta anche se esce dall'elenco delle nuove: si chiude solo dal salone.
  const [richiestaScelta, setRichiestaScelta] = useState<RichiestaNuova | null>(null)
  const services = uid ? seeded : []
  useEffect(() => {
    if (!vedeRichieste || !firebaseEnabled() || !uid) {
      setRichieste([])
      return
    }
    let vivo = true
    let ferma: () => void = () => undefined
    void import('../data/firebase/client')
      .then((client) => client.listenRichiesteNuove((righe) => {
        if (vivo) setRichieste([...righe].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime() || a.id.localeCompare(b.id)))
      }))
      .then((stop) => {
        if (vivo) ferma = stop
        else stop()
      })
      .catch(() => {
        if (vivo) setRichieste([])
      })
    return () => {
      vivo = false
      ferma()
      setRichieste([])
    }
  }, [uid, vedeRichieste])
  useEffect(() => {
    if (!firebaseEnabled() || !vedeAvvisoPiano || !uid) {
      setAvvisoPiano(null)
      return
    }
    let vivo = true
    let ferma: () => void = () => undefined
    void import('../data/firebase/client')
      .then((client) => client.listenAvvisoPiano((avviso) => {
        if (vivo) setAvvisoPiano(avviso)
      }))
      .then((stop) => {
        if (vivo) ferma = stop
        else stop()
      })
      .catch(() => {
        if (vivo) setAvvisoPiano(null)
      })
    return () => {
      vivo = false
      ferma()
    }
  }, [uid, vedeAvvisoPiano])
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
  const month = meseCorto(lingua, now)
  const earnedToday = earnedOn(appointments, now, now)
  const inAttesa = agendaInAttesa(firebaseEnabled(), synced)
  // Cani e agenda arrivano a momenti diversi: prima di entrambi non si pubblicano zeri né nomi.
  const attesaSalone = firebaseEnabled() && (!synced || !dogsSettled)
  const showFiscalNotice = ready && !attesaSalone && role !== 'collaboratore' && fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode)
  const nascondiZero = mostraIncassoZero(inAttesa || attesaSalone, earnedToday)
  const mostraCoda = SERVIZI_IN_PARTENZA.some((chiave) => servizioEmailAcceso(settings.serviziEmail?.[chiave]?.modo ?? 'spento'))
  const salonePronto = !firebaseEnabled() || (synced && dogsSettled)
  const righeCoda = useMemo(() => {
    if (!uid || !salonePronto) return settings.codaEmail ?? []
    return righeCodaSalone({
      adesso: now,
      servizi: settings.serviziEmail,
      esistenti: settings.codaEmail ?? [],
      cani: dogs.map((dog) => ({
        id: dog.id,
        nome: dog.name,
        nomeCliente: dog.contact.name,
        email: dog.contact.email,
        birthMonth: dog.birthMonth,
        birthDay: dog.birthDay,
        attivo: caneMailAttivo(dog.status) && dog.emailBloccata !== true,
      })),
      visite: appointments.filter((item) => appointmentKind(item) === 'pelosetto').map((item) => ({
        id: item.id,
        dogId: item.dogId,
        start: item.start,
        status: item.status,
        minuti: sumDuration(item.services),
        chiusoIl: item.chiusoIl ? item.chiusoIl.toISOString() : null,
        noteProblema: notaProblemaOggi(item, now),
      })),
      attesa: settings.attesa ?? [],
      slug: settings.prenotazioniOnline ? slugDaNome(settings.business.salonName) : '',
      linkRecensioni: settings.linkRecensioni ?? '',
      proposte: settings.proposteRecensione ?? [],
    })
  }, [uid, salonePronto, now, settings, dogs, appointments])
  useEffect(() => {
    if (!uid || !ready || !salonePronto) return
    const attuali = codaDaImpostazioni(settings.codaEmail) ?? []
    if (firmaCoda(righeCoda) === firmaCoda(attuali)) return
    save({ ...settings, codaEmail: righeCoda })
  }, [uid, ready, salonePronto, righeCoda, settings, save])

  async function hoLettoAvviso() {
    if (segnaAvviso) return
    setSegnaAvviso(true)
    try {
      const { callSegnaAvvisoPiano } = await import('../data/firebase/client')
      await callSegnaAvvisoPiano()
      setAvvisoPiano((attuale) => (attuale ? { ...attuale, letto: true } : attuale))
    } catch {
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      setSegnaAvviso(false)
    }
  }

  function fermaCoda(id: string) {
    if (!uid) return
    const prossime = righeCoda.map((riga) => (riga.id === id ? fermaRiga(riga) : riga))
    const salvata = save({ ...settings, codaEmail: prossime })
    if (!firebaseEnabled()) {
      if (!salvata) toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    void import('../data/firebase/client').then((mod) => mod.callFermaCoda(id)).catch(() => {
      if (!salvata) toast.show(frasi.authSalvataggio, 'plain')
    })
  }

  async function inviaSubitoRiga(id: string) {
    if (!firebaseEnabled() || !uid || invioId) return
    const lista = (settings.codaEmail ?? []).some((riga) => riga.id === id) ? settings.codaEmail ?? [] : righeCoda
    if (!lista.some((riga) => riga.id === id)) return
    const stamped = { ...settings, codaEmail: lista, updatedAt: new Date().toISOString() }
    save(stamped)
    setInvioId(id)
    try {
      const { callInviaSubito, saveSettings } = await import('../data/firebase/client')
      await saveSettings(uid, stamped)
      const esito = await callInviaSubito(id)
      save({
        ...stamped,
        codaEmail: lista.map((riga) => (riga.id === id ? { ...riga, stato: esito.stato, motivo: esito.motivo } : riga)),
      })
    } catch {
      toast.show(frasi.invitoInvio, 'plain')
    } finally {
      setInvioId(null)
    }
  }

  function restoreScheduled(id: string) {
    if (!setStatus(id, 'programmato')) toast.show(frasi.authSalvataggio, 'plain')
  }

  const closingVisit = closingId ? appointments.find((item) => item.id === closingId) ?? null : null
  const closingMinutes = closingVisit ? sumDuration(closingVisit.services) : 0
  const closingPrice = closingVisit ? sumPrice(closingVisit.services) : 0

  function finishClose(appointment: Appointment, patch: ClosePatch) {
    if (!canComplete(appointment.start, new Date())) return
    if (!saveClose(appointment.id, patch, true)) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    setClosingId(null)
  }

  function closeVisit(appointment: Appointment, status: StatoChiusura, reason?: Exclude<CancelReason, 'deceduto'>) {
    if (status === STATO_COMPLETATO) {
      if (!canComplete(appointment.start, new Date())) return
      setClosingId(appointment.id)
      return
    }
    if (!setStatus(appointment.id, status, reason)) {
      toast.show(frasi.authSalvataggio, 'plain')
      return
    }
    const message = status === 'non_venuto' ? frasi.homeNonVenuto : frasi.homeAppuntamentoDisdetto
    toast.show(message, 'plain', { label: frasi.homeAnnulla, onClick: () => restoreScheduled(appointment.id) }, undefined, 5000)
  }

  return (
    <ShellFrame>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: `${SIZES.brandBar.padTop}px ${SIZES.pagePadX}px 0` }}>
        <BrandBar size="large" as="h1" />
        <small style={{ display: 'block', fontSize: TYPE.meta, fontWeight: 500, color: 'var(--tx3)', letterSpacing: 0 }}>
          {dataBreve(lingua, now)}
        </small>
        {bannerBackup({
          ultimo: localStorage.getItem(`groomly.users.${uid}.driveUltimoInvio`),
          errore: localStorage.getItem(`groomly.users.${uid}.driveUltimoErrore`) !== null,
          frequenza: settings.backup.frequenza,
          now,
        }) ? (
          <Link to="/impostazioni" style={{ color: 'var(--bad)', fontSize: TYPE.meta, fontWeight: 600 }}>
            {frasi.homeBackupRotto}
          </Link>
        ) : null}
      </header>
      <div style={{ padding: `0 ${SIZES.pagePadX}px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {mostraCoda ? (
          <CodaInPartenza
            righe={visibiliInHome(righeCoda, now)}
            onFerma={fermaCoda}
            onInvia={(id) => { void inviaSubitoRiga(id) }}
            onEmail={(dogId) => navigate(`/animali/${dogId}?campo=email`)}
            invioId={invioId}
          />
        ) : null}
        <SearchBar
          placeholder={frasi.homeCerca}
          onClick={() => navigate('/animali', { state: { focusSearch: true } })}
        />
        <AvvisoProposta
          mostra={propostaVisibile(piano.mostraPiani, piano.stato)}
          ultima={settings.ui.ultimaProposta ? new Date(settings.ui.ultimaProposta) : null}
          adesso={new Date()}
          onNonOra={() => save({ ...settings, ui: { ...settings.ui, ultimaProposta: new Date().toISOString() } })}
        />
        <RigaRichieste
          richieste={richieste}
          pronte={!attesaSalone}
          onApri={(id) => setRichiestaScelta(richieste.find((item) => item.id === id) ?? null)}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionHeader>{frasi.homeOggi}</SectionHeader>
          </div>
          <Link to={todayPath} style={sectionLink}>{frasi.homeCalendario}</Link>
        </div>
        {todayClosure ? <ClosureBand reason={todayClosure.reason} onOpen={() => openSheet(`/chiusure/${todayClosure.id}`)} /> : null}
        {attesaSalone || listed.length === 0 ? (
          <Card>
            <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>{attesaSalone || inAttesa ? frasi.homeCaricoAgenda : frasi.homeNessunAppuntamento}</p>
            <div style={{ padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
              <Button type="button" onClick={() => openSheet('/appuntamenti/nuovo')} style={{ width: '100%', height: 'auto' }}>
                {frasi.homeNuovo}
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            {listed.map((appointment, index) => {
              if (appointmentKind(appointment) === 'personale') {
                const title = appointment.title?.trim() || frasi.homePersonale
                return (
                  <Row key={appointment.id} style={{ background: 'var(--personal-s)', padding: 0, ...(index === 0 ? { borderTop: 'none' } : {}) }}>
                    <PersonalEntry title={title} when={personalWhen(appointment)} onOpen={() => openSheet('/appuntamenti/personale/' + appointment.id)} />
                  </Row>
                )
              }
              const dog = dogs.find((item) => item.id === appointment.dogId)
              const next = appointment.id === highlighted
              const done = appointment.status === STATO_COMPLETATO
              const style: CSSProperties = {
                ...(index === 0 ? { borderTop: 'none' } : {}),
                ...(appointment.provvisorio ? { background: 'var(--warn-s)' } : {}),
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
                        <StatusPill tone="prim">{nextVisitPill(appointment.start, now, lingua)}</StatusPill>
                      ) : done ? (
                        <StatusPill tone="ok">{frasi.homeCompletato}</StatusPill>
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
            label={frasi.homeConfermaEmail}
            title={frasi.homeConfermaEmail}
            detail={frasi.homeApriLink}
            action={frasi.homeInvia}
            onAction={() => { void session.resendVerification().catch(() => toast.show(frasi.invitoInvio, 'plain')) }}
          />
        ) : null}
        {showFiscalNotice ? (
          <Notice
            label={frasi.homeCompletaAttivita}
            title={frasi.homeAggiungiFiscale}
            detail={frasi.homePerCompletare}
            action={frasi.homeAggiungi}
            onAction={() => navigate('/impostazioni', { state: { openBusiness: true } })}
          />
        ) : null}
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        {vedeAvvisoPiano && avvisoPiano && avvisoPiano.letto !== true ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: TYPE.base }}>{avvisoPiano.testo}</p>
              <Button type="button" onClick={() => { void hoLettoAvviso() }} disabled={segnaAvviso}>{frasi.avvisoPianoLetto}</Button>
            </div>
          </Card>
        ) : null}
        {!attesaSalone && closing.length > 0 ? (
          <section id="da-chiudere" aria-label={frasi.homeDaChiudere} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionHeader>{frasi.homeDaChiudereConto.replace('{{n}}', String(closing.length))}</SectionHeader>
            <Card>
              {closing.map((appointment, index) => {
                const dog = dogs.find((item) => item.id === appointment.dogId)
                return (
                  <div
                    key={appointment.id}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}
                  >
                    <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{formatBookedWhen(appointment.start, lingua)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <AppointmentRow
                        appointment={appointment}
                        dog={dog}
                        services={services}
                        mark={dog ? dogMark(dog, dogs.filter((item) => item.status === 'attivo')) : null}
                      />
                    </div>
                    {dog ? (
                      <div style={closeActions}>
                        <Button size="sm" variant="ok" aria-label={frasi.homeCompletatoNome.replace('{{nome}}', dog.name)} onClick={() => closeVisit(appointment, STATO_COMPLETATO)} style={closeAction}>
                          <Check size={14} aria-hidden />
                          {frasi.homeCompletato}
                        </Button>
                        <Button size="sm" variant="secondary" aria-label={frasi.homeNonVenutoNome.replace('{{nome}}', dog.name)} onClick={() => closeVisit(appointment, 'non_venuto')} style={closeAction}>{frasi.homeNonVenuto}</Button>
                        <Button size="sm" variant="bad" aria-label={frasi.homeDisdettoNome.replace('{{nome}}', dog.name)} onClick={() => setAskingCancel(appointment)} style={closeAction}>{frasi.homeDisdetto}</Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>{frasi.homeSchedaAssente}</p>
                        <Button size="sm" variant="secondary" onClick={() => setAskingRemove(appointment)} style={closeAction}>
                          {frasi.homeRimuoviLista}
                        </Button>
                      </div>
                    )}
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
            <span style={tileLabel}>{frasi.homeOggi}</span>
          </Link>
          {nascondiZero ? (
            <span style={tile} aria-label={frasi.homeIncassiCaricamento}>
              <IconTile tone="ok" size="sm"><Euro size={13} strokeWidth={2} aria-hidden /></IconTile>
              <span style={tileValue}>…</span>
              <span style={tileLabel}>{frasi.homeIncassiOggi}</span>
            </span>
          ) : (
            <EarningsTile amount={earnedToday} hidden={settings.ui.hideAmounts} style={tile} valueStyle={tileValue} labelStyle={tileLabel} />
          )}
          <Link to="/mensili" style={tile}>
            <IconTile tone="ok" size="sm"><Repeat size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{attesaSalone ? '…' : `${bookedMonthly}/${monthlyTotal}`}</span>
            <span style={tileLabel}>{frasi.homeMensiliMese.replace('{{mese}}', month)}</span>
          </Link>
          <Link to="/listino" style={tile}>
            <IconTile tone="warn" size="sm"><FileText size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{frasi.homeListino}</span>
            <span style={tileLabel}>{uid && settings.priceList ? frasi.homePdfApri : frasi.homeApri}</span>
          </Link>
        </div>
      </div>
      {richiestaScelta ? (
        <RiquadroRichiesta
          key={richiestaScelta.id}
          aperta
          richiesta={richiestaScelta}
          cani={dogs}
          visite={appointments}
          onChiudi={() => setRichiestaScelta(null)}
          onFatto={() => setRichiestaScelta(null)}
        />
      ) : null}
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
      <Sheet open={askingRemove !== null} title={frasi.homeRimuoviTitolo} onClose={() => setAskingRemove(null)} closeLabel={frasi.homeIndietro}>
        <Button
          variant="bad"
          onClick={() => {
            const target = askingRemove
            setAskingRemove(null)
            if (target) remove(target.id)
          }}
          style={{ width: '100%' }}
        >
          {frasi.homeRimuovi}
        </Button>
      </Sheet>
      <Sheet open={askingCancel !== null} title={frasi.homeChiDisdice} onClose={() => setAskingCancel(null)} closeLabel={frasi.homeIndietro}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            onClick={() => {
              const target = askingCancel
              setAskingCancel(null)
              if (target) closeVisit(target, STATO_DISDETTO, 'cliente')
            }}
            style={{ flex: 1 }}
          >
            {frasi.homeCliente}
          </Button>
          <Button
            onClick={() => {
              const target = askingCancel
              setAskingCancel(null)
              if (target) closeVisit(target, STATO_DISDETTO, 'salone')
            }}
            style={{ flex: 1 }}
          >
            {frasi.homeSalone}
          </Button>
        </div>
      </Sheet>
    </ShellFrame>
  )
}
