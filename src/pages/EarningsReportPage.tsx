import { addMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
import { SectionTitle } from '../components/ui/SectionTitle'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { usePiano } from '../hooks/usePiano'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { meseCorto } from '../i18n/format'
import { t } from '../i18n/t'
import type { Lingua } from '../i18n/lingua'
import { formatSpent } from '../lib/closeVisit'
import { maskEuro, niceScale, reportOf, MOTIVO_ASSENTE, MOTIVO_CLIENTE, type LostRow, type ReportPreset } from '../lib/earnings'
import { exportBloccato, mesePrima, mostraFasciaAumento, periodoBloccato } from '../lib/reportGate'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { haAccesso } from '../lib/piano'
import { spettatoreIncassi, visibleAppointments } from '../lib/salonAccess'
import { formatEuro } from '../lib/format'
import { serviceTone } from '../lib/uiStyle'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { useDocumentTheme } from '../theme/useDocumentTheme'
import { ShellFrame } from './ShellFrame'

const figureLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }
const figureValue: CSSProperties = { fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }
const figureNote: CSSProperties = { fontSize: 12, fontWeight: 700 }
const kpiLabel: CSSProperties = { fontSize: TYPE.meta, fontWeight: 600, color: 'var(--tx3)' }
const kpiValue: CSSProperties = { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function hoursNote(minuti: number, frasi: ReturnType<typeof useFrasi>, lingua: Lingua): string {
  if (minuti % 60 === 0) {
    const ore = minuti / 60
    return ore === 1 ? frasi.incOraUna : t(lingua, 'incOreLavorate', { n: ore })
  }
  return t(lingua, 'incMinutiLavorati', { tempo: formatSpent(minuti) })
}

function hourValue(amount: number | null, hidden: boolean, lingua: Lingua): string {
  if (hidden) return '•••'
  if (amount === null) return '—'
  return t(lingua, 'incEuroOra', { n: amount })
}

function mediaNote(delta: number | null, hidden: boolean): string | null {
  if (delta === null) return null
  if (hidden) return '•••'
  if (delta > 0) return `+ ${formatEuro(delta)}`
  if (delta < 0) return `− ${formatEuro(-delta)}`
  return formatEuro(0)
}

function missedNote(rows: LostRow[], frasi: ReturnType<typeof useFrasi>): string {
  const cancelled = rows.filter((row) => row.reason === MOTIVO_CLIENTE).length
  const absent = rows.filter((row) => row.reason === MOTIVO_ASSENTE).length
  const parts = [
    cancelled > 0 ? plural(cancelled, frasi.incDisdettoUno, frasi.incDisdetti) : '',
    absent > 0 ? plural(absent, frasi.incStatoAssente, frasi.incNonVenuti) : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

const periodTrack: CSSProperties = {
  display: 'flex',
  gap: 2,
  padding: 3,
  borderRadius: 999,
  background: 'var(--surf2)',
  border: '1px solid var(--line)',
  overflowX: 'auto',
  scrollbarWidth: 'none',
}

const periodButton: CSSProperties = {
  flex: '1 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  minHeight: 40,
  padding: '0 14px',
  border: 0,
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: TYPE.rowSub,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  transition: 'background-color .15s, color .15s',
}

function etichettaMese(lingua: Lingua, data: Date): string {
  const breve = meseCorto(lingua, data)
  const locale = lingua === 'it' ? 'it-IT' : lingua === 'es' ? 'es' : 'en-GB'
  return breve ? breve.charAt(0).toLocaleUpperCase(locale) + breve.slice(1) : breve
}

export function EarningsReportPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
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
  const periodRef = useRef<HTMLDivElement>(null)
  const visible = visibleAppointments(appointments, spettatoreIncassi(account))
  const report = reportOf(visible, dogs, services, preset, now, chosen ?? undefined, lingua)
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

  useEffect(() => {
    periodRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [preset, chosen])

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
  const fascia = mostraFasciaAumento(piano.mostraPiani, {}, creatoIl, now, piano.stato)

  function futureMonth(month: number): boolean {
    return new Date(pickerYear, month, 1).getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  }

  return (
    <ShellFrame>
      <Header
        title={frasi.incReportTitolo}
        subtitle={report.titolo}
        backTo="/impostazioni"
        action={(
          <Button size="sm" aria-expanded={exportOpen} onClick={apriExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Download size={14} aria-hidden />
            {frasi.incEsporta}
          </Button>
        )}
      />
      <div style={{ padding: `4px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {fascia ? (
          <button type="button" onClick={() => { if (!haAccesso(piano.stato, 'aumentoListino')) piano.apriPaywall('aumentoListino') }} style={{ textAlign: 'left', minHeight: 44 }}>
            {frasi.aggiornaListino}
          </button>
        ) : null}
        {funzioneVisibile(piano.stato, piano.funzioni, 'statistiche') ? <Link to="/incassi/statistiche">{frasi.statistiche}</Link> : null}
        <div ref={periodRef} role="group" aria-label={frasi.incPeriodo} style={periodTrack}>
          {([
            { value: 'mese' as const, label: frasi.incQuestoMese },
            { value: 'mese_scorso' as const, label: frasi.incMeseScorso },
            { value: 'anno' as const, label: frasi.incAnno },
            { value: 'scelto' as const, label: preset === 'scelto' && chosen ? `${etichettaMese(lingua, chosen)} ${chosen.getFullYear()}` : frasi.incScegli },
          ]).map((item) => {
            const selected = preset === item.value
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={selected}
                onClick={() => pickPreset(item.value)}
                style={{
                  ...periodButton,
                  background: selected ? 'var(--pri-solid)' : 'transparent',
                  color: selected ? 'var(--on-pri)' : 'var(--tx2)',
                  boxShadow: selected ? 'var(--sh-btn)' : undefined,
                }}
              >
                {item.value === 'scelto' ? <CalendarDays size={15} aria-hidden style={{ flex: 'none' }} /> : null}
                {item.label}
              </button>
            )
          })}
        </div>
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '8px 10px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <div style={figureLabel}>{frasi.incIncassato}</div>
              <div style={figureValue}>{maskEuro(report.incassato, hidden)}</div>
              {deltaText ? <div style={{ ...figureNote, color: delta !== null && delta < 0 ? 'var(--bad)' : 'var(--ok)' }}>{deltaText}</div> : null}
            </div>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
              <div style={figureLabel}>{frasi.incAppuntamenti}</div>
              <div style={figureValue}>{report.completati}</div>
              {report.inAgenda > 0 ? <div style={{ ...figureNote, color: 'var(--tx2)' }}>{t(lingua, 'incInAgenda', { n: report.inAgenda })}</div> : null}
            </div>
            <div style={{ padding: '8px 10px', borderRight: '1px solid var(--line)' }}>
              <div style={figureLabel}>{frasi.incMediaCane}</div>
              <div style={figureValue}>{report.mediaACane === null ? '—' : maskEuro(report.mediaACane, hidden)}</div>
              {mediaDeltaText ? (
                <div style={{ ...figureNote, color: hidden ? 'var(--tx3)' : report.mediaDelta !== null && report.mediaDelta < 0 ? 'var(--bad)' : 'var(--ok)' }}>
                  {mediaDeltaText}
                </div>
              ) : null}
            </div>
            <div style={{ padding: '8px 10px' }}>
              <div style={figureLabel}>{frasi.incGuadagnoOra}</div>
              <div style={figureValue}>{hourValue(report.euroAllOra, hidden, lingua)}</div>
              <div style={{ ...figureNote, color: 'var(--tx2)' }}>{hoursNote(report.minuti, frasi, lingua)}</div>
            </div>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? posDark : posLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>POS</div>
              <div style={kpiValue}>{maskEuro(report.pagamenti.pos.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(report.pagamenti.pos.count, frasi.incAnimale, frasi.incAnimali)}</div>
            </div>
          </Card>
          <Card style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img alt="" src={theme === 'dark' ? cashDark : cashLight} width={36} height={36} />
            <div>
              <div style={kpiLabel}>{frasi.chiudiContanti}</div>
              <div style={kpiValue}>{maskEuro(report.pagamenti.contanti.importo, hidden)}</div>
              <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{plural(report.pagamenti.contanti.count, frasi.incAnimale, frasi.incAnimali)}</div>
            </div>
          </Card>
        </div>
        {report.pagamenti.nonIndicato.count > 0 || report.pagamenti.offerti > 0 ? (
          <p style={{ margin: 0, fontSize: TYPE.meta, color: 'var(--tx3)' }}>
            {[
              report.pagamenti.nonIndicato.count > 0 ? t(lingua, 'incNonIndicato', { importo: maskEuro(report.pagamenti.nonIndicato.importo, hidden) }) : '',
              report.pagamenti.offerti > 0 ? t(lingua, 'incOfferti', { n: report.pagamenti.offerti }) : '',
            ].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        <Card style={{ padding: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{bars ? frasi.incAndamento : frasi.incAndamentoMese}</span>
            {bars ? null : (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--tx3)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i aria-hidden style={{ width: 14, borderTop: '2.5px solid var(--pri)' }} />
                  {etichettaMese(lingua, report.from)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i aria-hidden style={{ width: 14, borderTop: '2px dashed var(--tx3)' }} />
                  {etichettaMese(lingua, addMonths(report.from, -1))}
                </span>
              </span>
            )}
          </div>
          {bars ? (
            report.mesi.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>{frasi.incNessunIncassoPeriodo}</p>
            ) : (
              <EarningsChart buckets={report.mesi} scala={scala} mediaBarre={null} selectedKey={selectedKey} onSelect={setBarKey} hidden={hidden} />
            )
          ) : (
            <CumulativeChart points={report.punti} month={report.from} hidden={hidden} />
          )}
        </Card>
        {report.servizi.length > 0 ? (
          <>
            <SectionTitle>{frasi.incPerServizio}</SectionTitle>
            <Card style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {report.servizi.map((share) => (
                <div key={share.key}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, ...USER_TEXT }}>{`${share.name} · ${plural(share.count, frasi.incVolta, frasi.incVolte)}`}</span>
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
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{frasi.incClientiTop}</div>
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
                <div style={figureLabel}>{frasi.incMancati}</div>
                <div style={{ ...figureValue, color: 'var(--bad)' }}>{maskEuro(report.persi, hidden)}</div>
                <div style={{ ...figureNote, color: 'var(--bad)' }}>{missedNote(report.mancati, frasi)}</div>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Sheet open={pickerOpen} title={frasi.incScegliMese} onClose={() => setPickerOpen(false)} closeButton>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button type="button" aria-label={frasi.incAnnoPrec} onClick={() => setPickerYear((year) => year - 1)} style={yearButton}>
            <ChevronLeft size={16} aria-hidden />
          </button>
          <b>{pickerYear}</b>
          <button type="button" aria-label={frasi.incAnnoSucc} disabled={pickerYear >= now.getFullYear()} onClick={() => setPickerYear((year) => Math.min(now.getFullYear(), year + 1))} style={{ ...yearButton, opacity: pickerYear >= now.getFullYear() ? 0.4 : 1 }}>
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
                <span style={{ display: 'block', fontWeight: 700 }}>{etichettaMese(lingua, new Date(pickerYear, month, 1))}</span>
                {future ? null : <small style={{ display: 'block', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{maskEuro(amount, hidden)}</small>}
              </button>
            )
          })}
        </div>
      </Sheet>
      <Sheet open={missedOpen} title={frasi.incMancati} onClose={() => setMissedOpen(false)} closeButton>
        <Card>
          {report.mancati.map((row, index) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, borderTop: index === 0 ? 'none' : `${SIZES.card.border}px solid var(--line)` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, ...USER_TEXT }}>{row.dogName}</div>
                <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{`${row.when} · ${row.reason === MOTIVO_ASSENTE ? frasi.incStatoAssente : frasi.incMotivoCliente}`}</div>
              </div>
              <b style={{ color: 'var(--bad)' }}>{maskEuro(row.amount, hidden)}</b>
            </div>
          ))}
        </Card>
        <p style={{ margin: '8px 2px 0', fontSize: TYPE.meta, color: 'var(--tx3)' }}>{frasi.incNotaPersi}</p>
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
