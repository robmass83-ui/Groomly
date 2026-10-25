import { addMonths, format } from 'date-fns'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import cashDark from '../assets/icons/svg/icona-contanti-scuro.svg'
import cashLight from '../assets/icons/svg/icona-contanti-chiaro.svg'
import posDark from '../assets/icons/svg/icona-pos-scuro.svg'
import posLight from '../assets/icons/svg/icona-pos-chiaro.svg'
import { CumulativeChart } from '../components/earnings/CumulativeChart'
import { ExportSheet } from '../components/earnings/ExportSheet'
import { EarningsChart } from '../components/earnings/EarningsChart'
import { Header } from '../components/layout/Header'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FilterChip } from '../components/ui/FilterChip'
import { SectionTitle } from '../components/ui/SectionTitle'
import type { LocalAccount } from '../data/local/auth'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { usePiano } from '../hooks/usePiano'
import { it } from '../i18n/it'
import { formatSpent } from '../lib/closeVisit'
import { maskEuro, niceScale, reportOf, type LostRow, type ReportPreset } from '../lib/earnings'
import { exportBloccato, mesePrima, mostraFasciaAumento, periodoBloccato } from '../lib/reportGate'
import { haAccesso } from '../lib/piano'
import { visibleAppointments } from '../lib/salonAccess'
import type { AccountRole } from '../lib/salonPath'
import { formatEuro, IT_DATE } from '../lib/format'
import { serviceTone } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { useDocumentTheme } from '../theme/useDocumentTheme'
import { ShellFrame } from './ShellFrame'

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'mese', label: 'Questo mese' },
  { value: 'mese_scorso', label: 'Mese scorso' },
  { value: 'tre_mesi', label: '3 mesi' },
  { value: 'anno', label: 'Anno' },
  { value: 'scelto', label: 'Scegli…' },
]

const figureLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }
const figureValue: CSSProperties = { fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }
const figureNote: CSSProperties = { fontSize: 12, fontWeight: 700 }
const kpiLabel: CSSProperties = { fontSize: TYPE.meta, fontWeight: 600, color: 'var(--tx3)' }
const kpiValue: CSSProperties = { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase('it-IT') + value.slice(1) : value
}

function earningsViewer(account: LocalAccount | null): { uid: string; ownerUid: string; role: AccountRole } {
  const uid = account?.uid ?? ''
  const role: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  return { uid, ownerUid: account?.salonId || uid, role }
}

function hoursNote(minuti: number): string {
  if (minuti % 60 === 0) {
    const ore = minuti / 60
    return ore === 1 ? '1 ora lavorata' : `${ore} ore lavorate`
  }
  return `${formatSpent(minuti)} lavorati`
}

function hourValue(amount: number | null, hidden: boolean): string {
  if (hidden) return '•••'
  if (amount === null) return '—'
  return `${amount} €/h`
}

function mediaNote(delta: number | null, hidden: boolean): string | null {
  if (delta === null) return null
  if (hidden) return '•••'
  if (delta > 0) return `+ ${formatEuro(delta)}`
  if (delta < 0) return `− ${formatEuro(-delta)}`
  return formatEuro(0)
}

function missedNote(rows: LostRow[]): string {
  const cancelled = rows.filter((row) => row.reason === 'disdetto dal cliente').length
  const absent = rows.filter((row) => row.reason === 'non venuto').length
  const parts = [
    cancelled > 0 ? plural(cancelled, 'disdetto', 'disdetti') : '',
    absent > 0 ? plural(absent, 'non venuto', 'non venuti') : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

function shortMonth(year: number, month: number): string {
  return capitalize(format(new Date(year, month, 1), 'MMM', IT_DATE).replace(/\.$/, ''))
}

export function EarningsReportPage() {
  const theme = useDocumentTheme()
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const { services } = useServices(uid)
  const { settings, save } = useSettings()
  const piano = usePiano()
  const hidden = settings.ui.hideAmounts
  const now = new Date()
  const [preset, setPreset] = useState<ReportPreset>('mese')
  const [chosen, setChosen] = useState<Date | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear())
  const [missedOpen, setMissedOpen] = useState(false)
  const [barKey, setBarKey] = useState<string | null>(null)
  const visible = visibleAppointments(appointments, earningsViewer(account))
  const report = reportOf(visible, dogs, services, preset, now, chosen ?? undefined)
  const bars = preset === 'tre_mesi' || preset === 'anno'
  const delta = report.confronto.delta
  const deltaText = !hidden && delta !== null && delta !== 0 ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}% ${report.confronto.etichetta}` : null
  const mediaDeltaText = mediaNote(report.mediaDelta, hidden)
  const selectedKey = report.mesi.some((item) => item.key === barKey) ? barKey : (report.mesi.find((item) => item.isToday)?.key ?? report.mesi[0]?.key ?? null)
  const scala = niceScale(Math.max(0, ...report.mesi.map((item) => item.incassato + item.previsto)))
  const monthAmounts = pickerOpen
    ? Array.from({ length: 12 }, (_, month) => reportOf(visible, dogs, services, 'scelto', now, new Date(pickerYear, month, 1)).incassato)
    : []
  const serviceMax = report.servizi[0]?.amount ?? 0

  function pickPreset(next: ReportPreset) {
    if (periodoBloccato(piano.mostraPiani, piano.stato, next)) {
      piano.apriPaywall('reportPassati')
      return
    }
    if (next === 'scelto') {
      setPickerYear((chosen ?? now).getFullYear())
      setPickerOpen(true)
      return
    }
    setPreset(next)
    setChosen(null)
  }

  function chooseMonth(month: number) {
    const mese = new Date(pickerYear, month, 1)
    if (mesePrima(piano.mostraPiani, piano.stato, mese, now)) {
      piano.apriPaywall('reportPassati')
      return
    }
    setPreset('scelto')
    setChosen(mese)
    setPickerOpen(false)
  }

  function apriExport() {
    if (exportBloccato(piano.mostraPiani, piano.stato)) {
      piano.apriPaywall('export')
      return
    }
    setExportOpen(true)
  }

  const creatoIl = account?.createdAt ? new Date(account.createdAt) : now
  const fascia = mostraFasciaAumento(piano.mostraPiani, {}, creatoIl, now)

  function futureMonth(month: number): boolean {
    return new Date(pickerYear, month, 1).getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  }

  return (
    <ShellFrame>
      <Header
        title="Incassi e report"
        subtitle={report.titolo}
        backTo="/impostazioni"
        action={(
          <Button size="sm" aria-expanded={exportOpen} onClick={apriExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Download size={14} aria-hidden />
            Esporta
          </Button>
        )}
      />
      <div style={{ padding: `4px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {fascia ? (
          <button type="button" onClick={() => { if (!haAccesso(piano.stato, 'aumentoListino')) piano.apriPaywall('aumentoListino') }} style={{ textAlign: 'left', minHeight: 44 }}>
            {it.aggiornaListino}
          </button>
        ) : null}
        <div role="group" aria-label="Periodo" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {PRESETS.map((item) => (
            <FilterChip key={item.value} pressed={preset === item.value} onClick={() => pickPreset(item.value)}>
              {item.label}
            </FilterChip>
          ))}
        </div>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '8px 10px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <div style={figureLabel}>Incassato</div>
              <div style={figureValue}>{maskEuro(report.incassato, hidden)}</div>
              {deltaText ? <div style={{ ...figureNote, color: delta !== null && delta < 0 ? 'var(--bad)' : 'var(--ok)' }}>{deltaText}</div> : null}
            </div>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
              <div style={figureLabel}>Appuntamenti</div>
              <div style={figureValue}>{report.completati}</div>
              {report.inAgenda > 0 ? <div style={{ ...figureNote, color: 'var(--tx2)' }}>{`+ ${report.inAgenda} in agenda`}</div> : null}
            </div>
            <div style={{ padding: '8px 10px', borderRight: '1px solid var(--line)' }}>
              <div style={figureLabel}>Media a cane</div>
              <div style={figureValue}>{report.mediaACane === null ? '—' : maskEuro(report.mediaACane, hidden)}</div>
              {mediaDeltaText ? (
                <div style={{ ...figureNote, color: hidden ? 'var(--tx3)' : report.mediaDelta !== null && report.mediaDelta < 0 ? 'var(--bad)' : 'var(--ok)' }}>
                  {mediaDeltaText}
                </div>
              ) : null}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={figureLabel}>Guadagno all'ora</div>
              <div style={figureValue}>{hourValue(report.euroAllOra, hidden)}</div>
              <div style={{ ...figureNote, color: 'var(--tx2)' }}>{hoursNote(report.minuti)}</div>
            </div>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? posDark : posLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>POS</div>
              <div style={kpiValue}>{maskEuro(report.pagamenti.pos.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(report.pagamenti.pos.count, 'animale', 'animali')}</div>
            </div>
          </Card>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? cashDark : cashLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>Contanti</div>
              <div style={kpiValue}>{maskEuro(report.pagamenti.contanti.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(report.pagamenti.contanti.count, 'animale', 'animali')}</div>
            </div>
          </Card>
        </div>
        {report.pagamenti.nonIndicato.count > 0 || report.pagamenti.offerti > 0 ? (
          <p style={{ margin: 0, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
            {[
              report.pagamenti.nonIndicato.count > 0 ? `Non indicato ${maskEuro(report.pagamenti.nonIndicato.importo, hidden)}` : '',
              report.pagamenti.offerti > 0 ? `Offerti (N/A) ${report.pagamenti.offerti}` : '',
            ].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <Card style={{ padding: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{bars ? 'Andamento' : 'Andamento del mese'}</span>
            {bars ? null : (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--tx3)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i aria-hidden style={{ width: 14, borderTop: '2.5px solid var(--pri)' }} />
                  {capitalize(format(report.from, 'MMM', IT_DATE).replace(/\.$/, ''))}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i aria-hidden style={{ width: 14, borderTop: '2px dashed var(--tx3)' }} />
                  {capitalize(format(addMonths(report.from, -1), 'MMM', IT_DATE).replace(/\.$/, ''))}
                </span>
              </span>
            )}
          </div>
          {bars ? (
            report.mesi.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun incasso in questo periodo</p>
            ) : (
              <EarningsChart buckets={report.mesi} scala={scala} mediaBarre={null} selectedKey={selectedKey} onSelect={setBarKey} hidden={hidden} />
            )
          ) : (
            <CumulativeChart points={report.punti} month={report.from} hidden={hidden} />
          )}
        </Card>
        {report.servizi.length > 0 ? (
          <>
            <SectionTitle>Per servizio</SectionTitle>
            <Card style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {report.servizi.map((share) => (
                <div key={share.key}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, ...USER_TEXT }}>{`${share.name} · ${plural(share.count, 'volta', 'volte')}`}</span>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{maskEuro(share.amount, hidden)}</b>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--surf)', overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: serviceMax > 0 ? `${(share.amount / serviceMax) * 100}%` : 0, height: '100%', borderRadius: 4, background: serviceTone(share.iconKey).ink }} />
                  </div>
                </div>
              ))}
            </Card>
          </>
        ) : null}
        {report.top.length > 0 || report.mancati.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: report.top.length > 0 && report.mancati.length > 0 ? '1.25fr 1fr' : '1fr', gap: 8 }}>
            {report.top.length > 0 ? (
              <Card style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Clienti top</div>
                {report.top.map((dog, index) => (
                  <Link key={dog.dogId} to={`/animali/${dog.dogId}`} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ flex: 1, minWidth: 0, ...USER_TEXT }}>{`${index + 1}. ${dog.name}`}</span>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{maskEuro(dog.amount, hidden)}</b>
                  </Link>
                ))}
              </Card>
            ) : null}
            {report.mancati.length > 0 ? (
              <button
                type="button"
                onClick={() => setMissedOpen(true)}
                style={{ border: 0, borderRadius: 12, background: 'var(--bad-s)', color: 'inherit', font: 'inherit', textAlign: 'left', padding: '8px 10px', cursor: 'pointer' }}
              >
                <div style={figureLabel}>Mancati</div>
                <div style={{ ...figureValue, color: 'var(--bad)' }}>{maskEuro(report.persi, hidden)}</div>
                <div style={{ ...figureNote, color: 'var(--bad)' }}>{missedNote(report.mancati)}</div>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Sheet open={pickerOpen} title="Scegli il mese" onClose={() => setPickerOpen(false)} closeButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button type="button" aria-label="Anno precedente" onClick={() => setPickerYear((year) => year - 1)} style={yearButton}>
            <ChevronLeft size={16} aria-hidden />
          </button>
          <b>{pickerYear}</b>
          <button type="button" aria-label="Anno successivo" disabled={pickerYear >= now.getFullYear()} onClick={() => setPickerYear((year) => Math.min(now.getFullYear(), year + 1))} style={{ ...yearButton, opacity: pickerYear >= now.getFullYear() ? 0.4 : 1 }}>
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {monthAmounts.map((amount, month) => {
            const future = futureMonth(month)
            const selected = preset === 'scelto' && chosen !== null && chosen.getFullYear() === pickerYear && chosen.getMonth() === month
            return (
              <button
                key={month}
                type="button"
                disabled={future}
                onClick={() => chooseMonth(month)}
                style={{
                  minHeight: 44,
                  borderRadius: 10,
                  border: selected ? '1px solid var(--pri)' : '1px solid var(--line)',
                  background: selected ? 'var(--pri-s)' : 'var(--card)',
                  color: future ? 'var(--tx3)' : 'inherit',
                  font: 'inherit',
                  opacity: future ? 0.4 : 1,
                  padding: '6px 4px',
                }}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>{shortMonth(pickerYear, month)}</span>
                {future ? null : <small style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{maskEuro(amount, hidden)}</small>}
              </button>
            )
          })}
        </div>
      </Sheet>
      <Sheet open={missedOpen} title="Mancati" onClose={() => setMissedOpen(false)} closeButton>
        <Card>
          {report.mancati.map((row, index) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, ...USER_TEXT }}>{row.dogName}</div>
                <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{`${row.when} · ${row.reason}`}</div>
              </div>
              <b style={{ color: 'var(--bad)' }}>{maskEuro(row.amount, hidden)}</b>
            </div>
          ))}
        </Card>
        <p style={{ margin: '8px 2px 0', fontSize: TYPE.meta, color: 'var(--tx3)' }}>Contano i non venuti e i disdetti dal cliente. I disdetti dal salone no.</p>
      </Sheet>
      {exportOpen ? (
        <ExportSheet
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          appointments={visible}
          dogs={dogs}
          services={services}
          settings={settings}
          onRemember={(exportPrefs) => {
            save({ ...settings, exportPrefs })
          }}
        />
      ) : null}
    </ShellFrame>
  )
}

const yearButton: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
}
