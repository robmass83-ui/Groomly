import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useOpenSheet } from '../hooks/useOpenSheet'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { localDayKey, parseDayParam } from '../lib/appointments'
import { canGoNext, maskEuro, parsePeriod, shiftRef, summarize, type EarningsPeriod, type EarningsRow, type RowState } from '../lib/earnings'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const PERIODS: { value: EarningsPeriod; label: string }[] = [
  { value: 'giorno', label: 'Giorno' },
  { value: 'settimana', label: 'Settimana' },
  { value: 'mese', label: 'Mese' },
]

const SWIPE_PX = 48

const navButton: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
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
  minHeight: 40,
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
  'non venuto': { color: 'var(--bad)', textDecoration: 'line-through' },
  disdetto: { color: 'var(--bad)', textDecoration: 'line-through' },
  'da chiudere': { color: 'var(--warn)' },
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function EarningsPage() {
  const [params, setParams] = useSearchParams()
  const openSheet = useOpenSheet()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services } = useServices(uid)
  const { settings, save } = useSettings()
  const toast = useToast()
  const now = new Date()
  const periodo = parsePeriod(params.get('periodo'))
  const ref = parseDayParam(params.get('data'), now)
  const summary = summarize(appointments, dogs, services, periodo, ref, now)
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
    if (!save({ ...settings, ui: { ...settings.ui, hideAmounts: !stored } })) toast.show('Salvataggio non riuscito', 'plain')
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

  const delta = summary.confronto.delta
  const pill = delta === null ? null : (
    <span
      style={{
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 11,
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
    ? <>+ <b>{maskEuro(previsto, hidden)}</b> ancora previsti</>
    : isCurrent ? 'Nessun altro appuntamento' : null
  const appointmentsValue = summary.phase === 'passato' ? String(summary.completati) : `${summary.completati} di ${summary.totaliAppuntamenti}`
  const lost = summary.totali.persi

  function renderRow(row: EarningsRow, index: number) {
    const border: CSSProperties = index === 0 ? {} : { borderTop: `${SIZES.card.border}px solid var(--line)` }
    const lit: CSSProperties = row.kind !== 'servizio' && flash === row.bucketKey ? { background: 'var(--pri-s)' } : {}
    if (row.kind === 'appuntamento') {
      const done = row.state === 'completato'
      return (
        <button key={row.key} type="button" onClick={() => openSheet(`/appuntamenti/${row.appointmentId}`)} style={{ ...rowButton, ...border, ...lit }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{`${row.time} · ${row.dogName}`}</div>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>
              {row.services} · <span style={STATE_STYLE[row.state]}>{row.state}</span>
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
          <div style={{ fontWeight: 700 }}>{row.name}</div>
          <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(row.count, 'volta', 'volte')}</div>
        </div>
        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{maskEuro(row.amount, hidden)}</span>
      </div>
    )
  }

  return (
    <ShellFrame>
      <Header
        title="Incassi"
        subtitle="Solo appuntamenti completati"
        backTo="/"
        action={(
          <IconButton label={stored ? 'Mostra importi' : 'Nascondi importi'} aria-pressed={stored} onClick={toggleHidden}>
            {stored ? <EyeOff size={16} strokeWidth={2} aria-hidden /> : <Eye size={16} strokeWidth={2} aria-hidden />}
          </IconButton>
        )}
      />
      <div style={{ padding: `4px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Segmented label="Periodo" fill value={periodo} options={PERIODS} onChange={(next) => go(next, ref)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" aria-label="Periodo precedente" onClick={() => step(-1)} style={navButton}>
            <ChevronLeft size={14} strokeWidth={2.4} aria-hidden />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontWeight: 700, fontSize: TYPE.base }}>
            <span>{summary.titolo}</span>
            {isCurrent ? null : (
              <button type="button" onClick={() => go(periodo, now)} style={{ border: 0, background: 'none', padding: '0 0 0 6px', color: 'var(--pri)', fontSize: TYPE.meta, fontWeight: 700 }}>
                Oggi
              </button>
            )}
          </div>
          <button type="button" aria-label="Periodo successivo" disabled={!nextAllowed} onClick={() => step(1)} style={{ ...navButton, opacity: nextAllowed ? 1 : 0.4 }}>
            <ChevronRight size={14} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        <Card style={{ padding: '12px 12px 10px' }} onPointerDown={swipeDown} onPointerUp={swipeUp}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: TYPE.meta, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Incassato</div>
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
              {forecastLine ? <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{forecastLine}</div> : null}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: TYPE.meta, color: 'var(--tx2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(180deg, var(--bar-a), var(--bar-b))' }} />Incassato
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i aria-hidden style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px dashed var(--prev-line)', background: 'var(--prev-b)' }} />Previsto
            </span>
            {summary.mediaBarre !== null ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <i aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--tx3)' }} />Media <b style={{ color: 'var(--tx)' }}>{maskEuro(summary.mediaBarre, hidden)}</b>
              </span>
            ) : null}
            {summary.buckets.length > 0 ? <span style={{ flex: 1, textAlign: 'right', color: 'var(--tx3)' }}>Tocca una barra</span> : null}
          </div>
        </Card>
        {appointments.length === 0 ? (
          <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>Gli incassi compaiono quando segni un appuntamento come Completato</p>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <Card style={kpi}>
            <span style={kpiLabel}>Appuntamenti</span>
            <span style={kpiValue}>{appointmentsValue}</span>
          </Card>
          <Card style={kpi}>
            <span style={kpiLabel}>Media a cane</span>
            <span style={kpiValue}>{summary.mediaACane === null ? '—' : maskEuro(summary.mediaACane, hidden)}</span>
          </Card>
          <Card style={{ padding: 0 }}>
            <button
              type="button"
              aria-label={`Persi ${lost > 0 ? maskEuro(lost, hidden) : '0'}`}
              disabled={lost === 0}
              onClick={() => setLostOpen(true)}
              style={{ ...kpi, width: '100%', height: '100%', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: lost > 0 ? 'pointer' : 'default' }}
            >
              <span style={kpiLabel}>{lost > 0 ? 'Persi ›' : 'Persi'}</span>
              <span style={{ ...kpiValue, color: lost > 0 ? 'var(--bad)' : 'var(--tx3)' }}>{maskEuro(lost, hidden)}</span>
            </button>
          </Card>
        </div>
        {summary.daChiudere.count > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warn-s)', color: 'var(--warn)', borderRadius: 10, padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              {`${plural(summary.daChiudere.count, 'appuntamento', 'appuntamenti')} da chiudere · ${maskEuro(summary.daChiudere.importo, hidden)} non ancora contati`}
            </span>
            <Link to="/" style={{ color: 'var(--warn)', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Chiudi ›</Link>
          </div>
        ) : null}
        <SectionHeader>{summary.elenco.titolo}</SectionHeader>
        <Card>
          {summary.elenco.righe.length > 0
            ? summary.elenco.righe.map(renderRow)
            : <p style={{ margin: 0, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>}
        </Card>
      </div>
      <Sheet open={lostOpen} title="Persi" onClose={() => setLostOpen(false)} closeButton>
        <Card>
          {summary.persi.map((row, index) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{row.dogName}</div>
                <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{`${row.when} · ${row.reason}`}</div>
              </div>
              <b style={{ color: 'var(--bad)' }}>{maskEuro(row.amount, hidden)}</b>
            </div>
          ))}
        </Card>
        <p style={{ margin: '8px 2px 0', fontSize: TYPE.meta, color: 'var(--tx3)' }}>Contano i non venuti e i disdetti dal cliente. I disdetti dal salone no.</p>
      </Sheet>
    </ShellFrame>
  )
}
