import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import cashDark from '../assets/icons/svg/icona-contanti-scuro.svg'
import cashLight from '../assets/icons/svg/icona-contanti-chiaro.svg'
import posDark from '../assets/icons/svg/icona-pos-scuro.svg'
import posLight from '../assets/icons/svg/icona-pos-chiaro.svg'
import { EarningsChart } from '../components/earnings/EarningsChart'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Header } from '../components/layout/Header'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { SectionHeader } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import type { LocalAccount } from '../data/local/auth'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { localDayKey, parseDayParam } from '../lib/appointments'
import { canGoNext, maskEuro, parsePeriod, shiftRef, summarize, RIGA_ASSENTE, RIGA_CHIUDERE, RIGA_COMPLETATO, RIGA_DISDETTO, RIGA_PREVISTO, type EarningsPeriod, type EarningsRow, type RowState } from '../lib/earnings'
import { visibleAppointments } from '../lib/salonAccess'
import type { AccountRole } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { useDocumentTheme } from '../theme/useDocumentTheme'
import { ShellFrame } from './ShellFrame'

const SWIPE_PX = 48

const navButton: CSSProperties = {
  width: SIZES.headerIconBtn,
  height: SIZES.headerIconBtn,
  borderRadius: SIZES.headerIconRadius,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  flex: 'none',
}

const kpi: CSSProperties = { padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }
const kpiLabel: CSSProperties = { fontSize: TYPE.meta, fontWeight: 600, color: 'var(--tx3)' }
const kpiValue: CSSProperties = { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }

const rowButton: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  minHeight: 44,
  padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  transition: 'background 300ms',
}

const STATE_STYLE: Record<RowState, CSSProperties> = {
  completato: { color: 'var(--ok)' },
  previsto: { color: 'var(--tx3)' },
  [RIGA_ASSENTE]: { color: 'var(--bad)', textDecoration: 'line-through' },
  disdetto: { color: 'var(--bad)', textDecoration: 'line-through' },
  [RIGA_CHIUDERE]: { color: 'var(--warn)' },
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function earningsViewer(account: LocalAccount | null): { uid: string; ownerUid: string; role: AccountRole } {
  const uid = account?.uid ?? ''
  const role: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  return { uid, ownerUid: account?.salonId || uid, role }
}

function statoIncasso(frasi: ReturnType<typeof useFrasi>, state: RowState): string {
  if (state === RIGA_COMPLETATO) return frasi.incStatoCompletato
  if (state === RIGA_PREVISTO) return frasi.incStatoPrevisto
  if (state === RIGA_ASSENTE) return frasi.incStatoAssente
  if (state === RIGA_DISDETTO) return frasi.incStatoDisdetto
  return frasi.incStatoChiudere
}

export function EarningsPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const theme = useDocumentTheme()
  const [params, setParams] = useSearchParams()
  const openSheet = useOpenSheet()
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services } = useServices(uid)
  const { settings, save } = useSettings()
  const toast = useToast()
  const now = new Date()
  const periodo = parsePeriod(params.get('periodo'))
  const ref = parseDayParam(params.get('data'), now)
  const visible = visibleAppointments(appointments, earningsViewer(account))
  const summary = summarize(visible, dogs, services, periodo, ref, now, lingua)
  const viewId = `${periodo}:${localDayKey(summary.from)}`
  const [picked, setPicked] = useState<{ view: string; key: string } | null>(null)
  const selectedKey = picked?.view === viewId ? picked.key : summary.selezione
  const [flash, setFlash] = useState<string | null>(null)
  const [lostOpen, setLostOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const stored = settings.ui.hideAmounts
  const hidden = stored && !peek
  const isCurrent = summary.phase === 'in_corso'
  const nextAllowed = canGoNext(periodo, ref, now)

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), 1000)
    return () => clearTimeout(timer)
  }, [flash])

  useEffect(() => () => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
  }, [])

  function go(nextPeriod: EarningsPeriod, day: Date) {
    setFlash(null)
    setParams({ periodo: nextPeriod, data: localDayKey(day) })
  }

  function step(direction: 1 | -1) {
    if (direction === 1 && !nextAllowed) return
    go(periodo, shiftRef(periodo, ref, direction))
  }

  function select(key: string) {
    setPicked({ view: viewId, key })
    setFlash(key)
  }

  function toggleHidden() {
    if (!save({ ...settings, ui: { ...settings.ui, hideAmounts: !stored } })) toast.show(frasi.authSalvataggio, 'plain')
  }

  function startPeek() {
    if (!stored) return
    peekTimer.current = setTimeout(() => setPeek(true), 500)
  }

  function endPeek() {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = null
    setPeek(false)
  }

  function swipeDown(event: PointerEvent<HTMLDivElement>) {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }

  function swipeUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
  }

  function cancelSwipe() {
    swipeStart.current = null
  }

  const delta = summary.confronto.delta
  const pill = delta === null ? null : (
    <span
      style={{
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        background: delta > 0 ? 'var(--ok-s)' : delta < 0 ? 'var(--bad-s)' : 'var(--surf)',
        color: delta > 0 ? 'var(--ok)' : delta < 0 ? 'var(--bad)' : 'var(--tx2)',
      }}
    >
      {delta > 0 ? `▲ ${delta}%` : delta < 0 ? `▼ ${-delta}%` : '='} {summary.confronto.etichetta}
    </span>
  )

  const previsto = summary.totali.previsto
  const forecastLine = previsto > 0
    ? <>+ <b>{maskEuro(previsto, hidden)}</b>{` ${frasi.incAncoraPrevisti}`}</>
    : isCurrent ? frasi.incNessunAltro : null
  const appointmentsValue = summary.phase === 'passato' ? String(summary.completati) : t(lingua, 'incDi', { fatti: summary.completati, tutti: summary.totaliAppuntamenti })
  const lost = summary.totali.persi

  function renderRow(row: EarningsRow, index: number) {
    const border: CSSProperties = index === 0 ? {} : { borderTop: `${SIZES.card.border}px solid var(--line)` }
    const lit: CSSProperties = row.kind !== 'servizio' && flash === row.bucketKey ? { background: 'var(--pri-s)' } : {}
    if (row.kind === 'appuntamento') {
      const done = row.state === RIGA_COMPLETATO
      return (
        <button key={row.key} type="button" onClick={() => openSheet(`/appuntamenti/${row.appointmentId}`)} style={{ ...rowButton, ...border, ...lit }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, ...USER_TEXT }}>{`${row.time} · ${row.dogName}`}</div>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)', ...USER_TEXT }}>
              {row.services} · <span style={STATE_STYLE[row.state]}>{statoIncasso(frasi, row.state)}</span>
            </div>
          </div>
          <span style={{ fontWeight: done ? 700 : 600, color: done ? 'var(--tx)' : 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>{maskEuro(row.amount, hidden)}</span>
        </button>
      )
    }
    if (row.kind === 'giorno') {
      return (
        <button key={row.key} type="button" onClick={() => go('giorno', parseDayParam(row.day, now))} style={{ ...rowButton, ...border, ...lit }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{row.title}</div>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{row.detail}</div>
          </div>
          <span style={{ fontWeight: row.muted ? 600 : 700, color: row.muted ? 'var(--tx3)' : 'var(--tx)', fontVariantNumeric: 'tabular-nums' }}>{maskEuro(row.amount, hidden)}</span>
          <span aria-hidden style={{ color: 'var(--tx3)' }}>›</span>
        </button>
      )
    }
    return (
      <div key={row.key} style={{ ...rowButton, ...border }}>
        <IconTile tone="prim" size="sm"><ServiceIcon iconKey={row.iconKey} size={13} /></IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, ...USER_TEXT }}>{row.name}</div>
          <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(row.count, frasi.incVolta, frasi.incVolte)}</div>
        </div>
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{maskEuro(row.amount, hidden)}</span>
      </div>
    )
  }

  return (
    <ShellFrame>
      <Header
        title={frasi.incTitolo}
        subtitle={frasi.incSoloCompletati}
        backTo="/"
        action={account?.role === 'collaboratore' ? undefined : (
          <IconButton label={stored ? frasi.incMostraImporti : frasi.incNascondiImporti} aria-pressed={stored} onClick={toggleHidden}>
            {stored ? <EyeOff size={16} strokeWidth={2} aria-hidden /> : <Eye size={16} strokeWidth={2} aria-hidden />}
          </IconButton>
        )}
      />
      <div style={{ padding: `4px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Segmented label={frasi.incPeriodo} fill value={periodo} options={[
          { value: 'giorno' as const, label: frasi.agendaGiorno },
          { value: 'settimana' as const, label: frasi.agendaSettimana },
          { value: 'mese' as const, label: frasi.agendaMese },
        ]} onChange={(next) => go(next, ref)} />
        <div
          onPointerDown={swipeDown}
          onPointerUp={swipeUp}
          onPointerCancel={cancelSwipe}
          style={{ display: 'flex', alignItems: 'center', gap: 6, touchAction: 'pan-y' }}
        >
          <button type="button" aria-label={frasi.incPeriodoPrec} onClick={() => step(-1)} style={navButton}>
            <ChevronLeft size={18} strokeWidth={2.4} aria-hidden />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontWeight: 700, fontSize: TYPE.base }}>
            <span>{summary.titolo}</span>
            {isCurrent ? null : (
              <button type="button" onClick={() => go(periodo, now)} style={{ border: 0, background: 'none', padding: '0 6px', minHeight: 44, color: 'var(--pri)', fontSize: TYPE.meta, fontWeight: 700 }}>
                {frasi.homeOggi}
              </button>
            )}
          </div>
          <button type="button" aria-label={frasi.incPeriodoSucc} disabled={!nextAllowed} onClick={() => step(1)} style={{ ...navButton, opacity: nextAllowed ? 1 : 0.4 }}>
            <ChevronRight size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        <Card style={{ padding: '12px 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: TYPE.meta, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{frasi.incIncassato}</div>
              <div
                data-testid="earnings-total"
                onPointerDown={startPeek}
                onPointerUp={endPeek}
                onPointerLeave={endPeek}
                onPointerCancel={endPeek}
                style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}
              >
                {maskEuro(summary.totali.incassato, hidden)}
              </div>
              {forecastLine ? <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 2 }}>{forecastLine}</div> : null}
            </div>
            {pill}
          </div>
          <EarningsChart
            key={viewId}
            buckets={summary.buckets}
            scala={summary.scala}
            mediaBarre={summary.mediaBarre}
            selectedKey={selectedKey}
            onSelect={select}
            hidden={hidden}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, rowGap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: TYPE.meta, color: 'var(--tx2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(180deg, var(--bar-a), var(--bar-b))' }} />{frasi.incIncassato}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed var(--prev-line)', background: 'var(--prev-b)' }} />{frasi.incPrevisto}
            </span>
            {summary.mediaBarre !== null ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <i aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--tx3)' }} />{frasi.incMedia} <b style={{ color: 'var(--tx)' }}>{maskEuro(summary.mediaBarre, hidden)}</b>
              </span>
            ) : null}
            {summary.buckets.length > 0 ? <span style={{ flex: 1, textAlign: 'right', color: 'var(--tx3)' }}>{frasi.incToccaBarra}</span> : null}
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? posDark : posLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>POS</div>
              <div style={kpiValue}>{maskEuro(summary.pagamenti.pos.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(summary.pagamenti.pos.count, frasi.incAnimale, frasi.incAnimali)}</div>
            </div>
          </Card>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? cashDark : cashLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>{frasi.chiudiContanti}</div>
              <div style={kpiValue}>{maskEuro(summary.pagamenti.contanti.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(summary.pagamenti.contanti.count, frasi.incAnimale, frasi.incAnimali)}</div>
            </div>
          </Card>
        </div>
        {summary.pagamenti.nonIndicato.count > 0 || summary.pagamenti.offerti > 0 ? (
          <p style={{ margin: 0, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
            {[
              summary.pagamenti.nonIndicato.count > 0 ? t(lingua, 'incNonIndicato', { importo: maskEuro(summary.pagamenti.nonIndicato.importo, hidden) }) : '',
              summary.pagamenti.offerti > 0 ? t(lingua, 'incOfferti', { n: summary.pagamenti.offerti }) : '',
            ].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {visible.length === 0 ? (
          <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>{frasi.incCompaiono}</p>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <Card style={kpi}>
            <span style={kpiLabel}>{frasi.incAppuntamenti}</span>
            <span style={kpiValue}>{appointmentsValue}</span>
          </Card>
          <Card style={kpi}>
            <span style={kpiLabel}>{frasi.incMediaCane}</span>
            <span style={kpiValue}>{summary.mediaACane === null ? '—' : maskEuro(summary.mediaACane, hidden)}</span>
          </Card>
          <Card style={{ padding: 0 }}>
            <button
              type="button"
              aria-label={t(lingua, 'incPersiAria', { importo: lost > 0 ? maskEuro(lost, hidden) : '0' })}
              disabled={lost === 0}
              onClick={() => setLostOpen(true)}
              style={{ ...kpi, width: '100%', height: '100%', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: lost > 0 ? 'pointer' : 'default' }}
            >
              <span style={kpiLabel}>{lost > 0 ? frasi.incPersiApri : frasi.incPersi}</span>
              <span style={{ ...kpiValue, color: lost > 0 ? 'var(--bad)' : 'var(--tx3)' }}>{maskEuro(lost, hidden)}</span>
            </button>
          </Card>
        </div>
        {summary.daChiudere.count > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              {t(lingua, summary.daChiudere.count === 1 ? 'incDaChiudereUno' : 'incDaChiudereMolti', { n: summary.daChiudere.count, importo: maskEuro(summary.daChiudere.importo, hidden) })}
            </span>
            <Link to="/#da-chiudere" style={{ color: 'var(--warn)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44, flex: 'none' }}>{frasi.incChiudiLink}</Link>
          </div>
        ) : null}
        <SectionHeader>{summary.elenco.titolo}</SectionHeader>
        <Card>
          {summary.elenco.righe.length > 0
            ? summary.elenco.righe.map(renderRow)
            : <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>{frasi.homeNessunAppuntamento}</p>}
        </Card>
        <Link to="/incassi/report" style={{ display: 'flex', alignItems: 'center', minHeight: 44, width: '100%', fontSize: TYPE.meta, fontWeight: 700, color: 'var(--pri)', textDecoration: 'none' }}>
          {frasi.incReportLink}
        </Link>
      </div>
      <Sheet open={lostOpen} title={frasi.incPersi} onClose={() => setLostOpen(false)} closeButton>
        <Card>
          {summary.persi.map((row, index) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, ...USER_TEXT }}>{row.dogName}</div>
                <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{`${row.when} · ${row.reason === RIGA_ASSENTE ? frasi.incStatoAssente : frasi.incMotivoCliente}`}</div>
              </div>
              <b style={{ color: 'var(--bad)' }}>{maskEuro(row.amount, hidden)}</b>
            </div>
          ))}
        </Card>
        <p style={{ margin: '8px 2px 0', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{frasi.incNotaPersi}</p>
      </Sheet>
    </ShellFrame>
  )
}
