import { Capacitor } from '@capacitor/core'
import { addDays, addMonths, format, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { DEFAULT_EXPORT, type ExportPrefs, type SettingsMain } from '../../data/local/settings'
import { Sheet } from '../layout/Sheet'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { AttesaZampe } from '../ui/Zampette'
import { Input } from '../ui/Input'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'
import {
  buildExportData,
  exportFileName,
  exportRange,
  wantsPayment,
  type ExportInclude,
  type ExportKind,
} from '../../lib/earningsExport'
import { toPdf } from '../../lib/earningsPdf'
import { maskEuro } from '../../lib/earnings'
import { IT_DATE } from '../../lib/format'
import { downloadAnchor, isShareCancel, shareFiles, writeDocuments } from '../../lib/shareFile'
import type { Appointment, Dog, Service } from '../../types/models'

function capitalize(text: string): string {
  return text ? text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1) : text
}

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function shortMonth(date: Date): string {
  return capitalize(format(date, 'MMM', IT_DATE).replace(/\.$/, ''))
}

function startingInclude(include: ExportInclude): ExportInclude {
  const next = { ...include }
  if (!next.riepilogo && !next.dettaglio) next.riepilogo = true
  return next
}

function yearList(appointments: Appointment[], now: Date): number[] {
  const current = now.getFullYear()
  let first = current
  for (const item of appointments) {
    const year = item.start.getFullYear()
    if (year < first) first = year
  }
  const years: number[] = []
  for (let year = first; year <= current; year += 1) years.push(year)
  return years
}

function unclosedMessage(frasi: { expNonChiuso: string; expNonChiusi: string }, count: number, when: string): string {
  if (count === 1) return frasi.expNonChiuso.replace('{{when}}', when)
  return frasi.expNonChiusi.replace('{{count}}', String(count)).replace('{{when}}', when)
}

function periodWord(kind: ExportKind, from: Date, periodLabel: string): string {
  if (kind === 'mese') return format(from, 'MMMM', IT_DATE).toLocaleLowerCase('it-IT')
  if (kind === 'anno') return String(from.getFullYear())
  return periodLabel
}

const caption: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }
const navButton: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 9,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--tx2)',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
}
const previewLabel: CSSProperties = { fontSize: 12, fontWeight: 700, lineHeight: 1.25 }
const previewValue: CSSProperties = { fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }
const note: CSSProperties = { margin: 0, borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 600 }

export function ExportSheet({
  open,
  onClose,
  appointments,
  dogs,
  services,
  settings,
  onRemember,
}: {
  open: boolean
  onClose: () => void
  appointments: Appointment[]
  dogs: Dog[]
  services: Service[]
  settings: SettingsMain
  onRemember: (prefs: ExportPrefs) => void
}) {
  const toast = useToast()
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const now = new Date()
  const initial = settings.exportPrefs ?? DEFAULT_EXPORT
  const [formato, setFormato] = useState<'pdf' | 'csv'>(initial.formato)
  const [periodo, setPeriodo] = useState<ExportKind>(initial.periodo)
  const [include, setInclude] = useState<ExportInclude>(() => startingInclude(initial.include))
  const [month, setMonth] = useState(() => startOfMonth(addMonths(new Date(), -1)))
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [from, setFrom] = useState(() => isoDay(startOfMonth(addMonths(new Date(), -1))))
  const [to, setTo] = useState(() => isoDay(addDays(addMonths(startOfMonth(addMonths(new Date(), -1)), 1), -1)))
  const [busy, setBusy] = useState(false)

  const anchor = periodo === 'anno' ? new Date(year, 0, 1) : month
  const range = exportRange(periodo, anchor, { from, to })
  const data = buildExportData(appointments, dogs, services, settings.business, range, include, periodo, now, lingua)
  const empty = data.appuntamenti === 0
  const locked = busy || empty
  const preparing = formato === 'pdf' ? 'Preparo il PDF…' : "Preparo l'Excel…"
  const monthTitle = capitalize(format(month, 'MMMM yyyy', IT_DATE))
  const nextMonth = startOfMonth(addMonths(month, 1))
  const nextBlocked = nextMonth.getTime() > startOfMonth(now).getTime()
  const years = yearList(appointments, now)
  const vatMissing = include.attivita && settings.business.vatNumber.trim() === ''
  const when = periodWord(periodo, range.from, data.periodLabel)
  const riepilogoHint = periodo === 'mese' ? 'Totale, giorno per giorno, per servizio' : 'Totale, mese per mese, per servizio'

  function remember(next: ExportPrefs) {
    onRemember(next)
  }

  function choosePeriodo(next: ExportKind) {
    setPeriodo(next)
    remember({ formato, periodo: next, include })
  }

  function chooseFormato(next: 'pdf' | 'csv') {
    setFormato(next)
    remember({ formato: next, periodo, include })
  }

  function flip(key: keyof ExportInclude, checked: boolean) {
    if (!checked && (key === 'riepilogo' || key === 'dettaglio')) {
      const other = key === 'riepilogo' ? include.dettaglio : include.riepilogo
      if (!other) return
    }
    const next = { ...include, [key]: checked }
    setInclude(next)
    remember({ formato, periodo, include: next })
  }

  function shiftMonth(delta: number) {
    const next = startOfMonth(addMonths(month, delta))
    if (next.getTime() > startOfMonth(now).getTime()) return
    setMonth(next)
  }

  function changeFrom(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    setFrom(value)
    if (to < value) setTo(value)
  }

  function changeTo(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    setTo(value < from ? from : value)
  }

  async function makeFile(): Promise<{ blob: Blob; name: string }> {
    if (formato === 'csv') {
      const { toXlsx } = await import('../../lib/earningsXlsx')
      return {
        blob: await toXlsx(data, include),
        name: exportFileName(periodo, range.from, range.to, 'xlsx', settings.business.name, lingua),
      }
    }
    return {
      blob: toPdf(data, include),
      name: exportFileName(periodo, range.from, range.to, formato, settings.business.name, lingua),
    }
  }

  async function run(kind: 'save' | 'send') {
    if (locked) return
    setBusy(true)
    try {
      const file = await makeFile()
      if (kind === 'save' && !Capacitor.isNativePlatform()) {
        downloadAnchor(file.blob, file.name)
        return
      }
      if (kind === 'save') {
        try {
          await writeDocuments([file])
          toast.show(frasi.lisSalvatoDoc, 'ok')
        } catch {
          await shareFiles([file], frasi.espIncassi)
          toast.show(frasi.lisScegliDove, 'plain')
        }
        return
      }
      await shareFiles([file], frasi.espIncassi)
    } catch (error) {
      if (!isShareCancel(error)) toast.show(frasi.lisExportKo, 'plain')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="Esporta per il commercialista"
      onClose={onClose}
      footer={(
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8 }} aria-busy={busy}>
          <AttesaZampe testo={busy ? preparing : null} />
          <Button variant="secondary" disabled={locked} aria-busy={busy} onClick={() => void run('save')} style={{ width: '100%', opacity: locked ? 0.45 : 1 }}>
            {busy ? preparing : (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={16} aria-hidden />
                Salva
              </span>
            )}
          </Button>
          <Button disabled={locked} aria-busy={busy} onClick={() => void run('send')} style={{ width: '100%', opacity: locked ? 0.45 : 1 }}>
            {busy ? preparing : (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Share2 size={16} aria-hidden />
                Invia al commercialista
              </span>
            )}
          </Button>
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tx3)' }}>Solo incassi di appuntamenti completati</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={caption}>{frasi.incPeriodo}</span>
          <Segmented
            label={frasi.incPeriodo}
            fill
            value={periodo}
            onChange={choosePeriodo}
            options={[
              { value: 'mese', label: frasi.agendaMese },
              { value: 'anno', label: frasi.incAnno },
              { value: 'intervallo', label: 'Da… a…' },
            ]}
          />
        </div>
        {periodo === 'mese' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" aria-label={frasi.agendaPrecMese} onClick={() => shiftMonth(-1)} style={navButton}>
                <ChevronLeft size={16} aria-hidden />
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{monthTitle}</div>
              <button type="button" aria-label={frasi.agendaSuccMese} disabled={nextBlocked} onClick={() => shiftMonth(1)} style={{ ...navButton, opacity: nextBlocked ? 0.4 : 1 }}>
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {Array.from({ length: 12 }, (_, index) => {
                const date = new Date(month.getFullYear(), index, 1)
                const future = date.getTime() > startOfMonth(now).getTime()
                const selected = index === month.getMonth()
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={future}
                    onClick={() => setMonth(date)}
                    style={{
                      minHeight: 44,
                      borderRadius: 10,
                      border: selected ? '1px solid var(--pri)' : '1px solid var(--line)',
                      background: selected ? 'var(--pri-s)' : 'var(--card)',
                      color: future ? 'var(--tx3)' : 'inherit',
                      font: 'inherit',
                      fontWeight: 700,
                      opacity: future ? 0.4 : 1,
                    }}
                  >
                    {shortMonth(date)}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {periodo === 'anno' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {years.map((item) => {
              const selected = item === year
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setYear(item)}
                  style={{
                    minHeight: 40,
                    borderRadius: 10,
                    border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
                    background: selected ? 'var(--pri-s)' : 'var(--card)',
                    color: 'inherit',
                    font: 'inherit',
                    fontWeight: 700,
                    boxShadow: selected ? '0 0 0 3px var(--focus)' : undefined,
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        ) : null}
        {periodo === 'intervallo' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Input label="Da" type="date" value={from} onChange={(event) => changeFrom(event.target.value)} />
            <Input label="A" type="date" value={to} onChange={(event) => changeTo(event.target.value)} />
          </div>
        ) : null}
        {range.clipped ? <p style={{ ...note, background: 'var(--warn-s)', color: 'var(--warn)' }}>Massimo 24 mesi</p> : null}
        <div style={{ background: 'var(--pri-s)', color: 'var(--pri-ink)', borderRadius: 12, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={previewLabel}>Incassato</div>
            <div style={previewValue}>{maskEuro(data.incassato, settings.ui.hideAmounts)}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={previewLabel}>Appuntamenti</div>
            <div style={previewValue}>{data.appuntamenti}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={previewLabel}>Giorni lavorati</div>
            <div style={previewValue}>{data.giorni}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={caption}>Formato</span>
          <div role="radiogroup" aria-label="Formato" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" role="radio" aria-label="PDF" aria-checked={formato === 'pdf'} onClick={() => chooseFormato('pdf')} style={formatCard(formato === 'pdf')}>
              <b>PDF</b>
              <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 500 }}>Riepilogo + dettaglio</span>
            </button>
            <button type="button" role="radio" aria-label="Excel" aria-checked={formato === 'csv'} onClick={() => chooseFormato('csv')} style={formatCard(formato === 'csv')}>
              <b>Excel</b>
              <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 500 }}>Una riga per appuntamento</span>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={caption}>Cosa includere</span>
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '0 10px' }}>
            <IncludeRow label="Riepilogo" hint={riepilogoHint} checked={include.riepilogo} onChange={(checked) => flip('riepilogo', checked)} />
            <IncludeRow label="Dettaglio appuntamenti" hint="Data, ora, cane, proprietario, servizi, importo" checked={include.dettaglio} onChange={(checked) => flip('dettaglio', checked)} divider />
            <IncludeRow label="Tipo di pagamento" hint="Colonna nel dettaglio e riga POS / contanti nel PDF" checked={wantsPayment(include)} onChange={(checked) => flip('pagamento', checked)} divider />
            <IncludeRow label={frasi.espAttivita} hint="Nome, P. IVA, indirizzo in intestazione" checked={include.attivita} onChange={(checked) => flip('attivita', checked)} divider />
            <IncludeRow label="Mancati incassi" hint="Non venuti e disdetti dal cliente" checked={include.mancati} onChange={(checked) => flip('mancati', checked)} divider />
          </div>
        </div>
        {data.daChiudere > 0 ? (
          <p style={{ ...note, background: 'var(--warn-s)', color: 'var(--warn)' }}>{unclosedMessage(frasi, data.daChiudere, when)}</p>
        ) : null}
        {vatMissing ? <p style={{ ...note, background: 'var(--surf)', color: 'var(--tx2)' }}>Manca la P. IVA</p> : null}
        {empty ? <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>Nessun incasso in questo periodo</p> : null}
      </div>
    </Sheet>
  )
}

function IncludeRow({ label, hint, checked, onChange, divider = false }: { label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void; divider?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, borderTop: divider ? '1px solid var(--line)' : undefined }}>
      <span style={{ flex: 1, minWidth: 0, padding: '6px 0' }}>
        <b style={{ display: 'block', fontWeight: 600 }}>{label}</b>
        <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{hint}</span>
      </span>
      <Toggle checked={checked} label={label} onChange={onChange} />
    </div>
  )
}

function formatCard(selected: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    textAlign: 'left',
    whiteSpace: 'normal',
    minWidth: 0,
    borderRadius: 12,
    padding: '9px 10px',
    background: 'var(--card)',
    color: 'inherit',
    font: 'inherit',
    cursor: 'pointer',
    border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
    boxShadow: selected ? '0 0 0 3px var(--focus)' : undefined,
  }
}
