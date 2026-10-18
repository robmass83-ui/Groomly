# Incassi, Parte 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Impostazioni compare «Incassi e report»; la pagina mostra gli stessi numeri della pagina Incassi più €/h, servizi, clienti e mancati; da lì si esporta un PDF o un CSV per il commercialista, con POS, Contanti, N/A e Non indicato.

**Architecture:** I conti nuovi stanno in `src/lib/earnings.ts` e riusano `classify`, `appointmentAmount` e `compare`. Il CSV è puro in `src/lib/earningsExport.ts`. Il PDF sta in `src/lib/earningsPdf.ts`. Il foglio e la pagina disegnano solo quei risultati. Salva e Invia passano da `src/lib/shareFile.ts`, estratto dal listino senza cambiarne i testi.

**Tech Stack:** React 19 + TypeScript, react-router-dom 6, date-fns 4 (locale `it`), lucide-react, Vitest 3 + happy-dom + Testing Library, `jspdf` già presente, `jspdf-autotable` da aggiungere, `@capacitor/filesystem` e `@capacitor/share` già presenti.

**Spec:** `docs/superpowers/specs/archive/2026-10-17-incassi-parte2-design.md`
**Fonte precedente, superata dove differisce:** `docs/incassi/incassi-spec.md` §14–§22

## Global Constraints

- Lingua dell'interfaccia: italiano. Stile del codice come i file intorno: stili inline con `TYPE`, `SIZES` e token CSS. Niente commenti superflui. Nessun colore scritto a mano: solo `var(--…)`.
- In interfaccia gli importi passano da `formatEuro` (`€ 1.840`) e, se `settings.ui.hideAmounts` è true, da `maskEuro` (`•••`). I conteggi restano visibili. Nei file le cifre ci sono sempre, con due decimali.
- Etichette pagamento, alla lettera: `POS`, `Contanti`, `N/A`, `Non indicato`.
- Testi degli avvisi, alla lettera: `Massimo 24 mesi`, `Nessun incasso in questo periodo`, `Manca la P. IVA`, `Preparo il PDF…`, `Preparo il CSV…`, `Salvato in Documenti/Groomly`, `Scegli dove salvarlo`, `Esportazione non riuscita`, `Non inclusi nel totale`, `documento riepilogativo, non è una fattura`.
- Il telefono del cliente non entra in PDF né in CSV. La nota `adjustmentNote` nemmeno.
- POS + Contanti + Non indicato = incassato. N/A è un completato a importo 0: entra nel conteggio e nelle ore, non nei mancati.
- Disdetto dal salone e deceduto restano `escluso`. Non venuto e disdetto dal cliente sono mancati e stanno fuori dal totale.
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto, `npm run build`. Shell: PowerShell, cartella `d:\Groomly`. Non usare `&&`.
- `git add` con percorsi espliciti. Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`, né i file non tracciati estranei.
- I task fanno solo commit. Non alzare `APP_VERSION`. La pubblicazione la fa il coordinatore a piano finito, con la regola `publish-update`.
- Ramo di lavoro: quello corrente (`feat/listino-razze`).

## Chiusure (la fonte si poteva leggere in due modi)

- **Delta di un mese.** Percentuale e finestre sono quelle di `compare(..., 'mese', primoDelMese, now)`: il mese scelto per intero contro il mese prima, tagliato allo stesso giorno se il mese scelto è in corso. La differenza della media a cane usa le stesse due finestre. Non è una seconda formula.
- **3 mesi e anno.** Il periodo prima ha la stessa durata, subito prima. Se il periodo è in corso, il confronto precedente si ferma allo stesso millisecondo trascorso. Etichette: `vs i 3 mesi prima`, `vs anno scorso`.
- **€/h.** `Math.round(incassato / (minuti / 60))`. Minuti 0 → valore `—`. Minuti = `actualDurationMin` se è un numero ≥ 0, altrimenti `sumDuration(services)`.
- **Ore in nota.** Minuti divisibili per 60: `1 ora lavorata` o `59 ore lavorate`. Altrimenti `formatSpent` di `src/lib/closeVisit.ts` più ` lavorati` (`1 h 30 lavorati`).
- **Chip.** Restano `FilterChip` con `aria-pressed`, dentro un gruppo con `aria-label="Periodo"`. Non si trasforma `FilterChip` in radio.
- **Grafico a barre.** Si riusa `EarningsChart` com'è. Se nessuna barra ha incassato o previsto, la pagina non monta il grafico e scrive `Nessun incasso in questo periodo`.
- **Fumetto della linea.** `12 ottobre · € 1.320 (set. € 1.180)`. Il mese precedente è `format(..., 'MMM')` senza il punto finale. Con importi nascosti: `12 ottobre · importi nascosti`.
- **Totale servizi.** La riga Totale della tabella servizi è la somma delle quote già arrotondate al centesimo. Il totale del periodo è la somma degli appuntamenti. Possono differire di un centesimo: non si ricalibra.
- **Riga totale CSV.** `Totale` sta nella colonna Durata, l'importo nella colonna Importo: `;;;;;Totale;145,00;;`. Con i mancati si aggiunge un campo vuoto in fondo.
- **Settimane dell'export.** Solo quando il periodo è un mese. Le altre esportazioni raggruppano per mese, anche se l'intervallo è corto.
- **Campo salvato.** Si chiama `exportPrefs`, non `export`.
- **Listino.** Spostare il codice in `shareFile.ts` non cambia title `Listino prezzi`, directory `CACHE` / `DOCUMENTS`, né i toast del listino.

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/lib/earnings.ts` | Intervallo del report, riepilogo, serie, barre, sparkline, badge |
| `src/lib/earningsExport.ts` | Dati di export, CSV, nome file |
| `src/lib/earningsPdf.ts` | Blob PDF |
| `src/lib/shareFile.ts` | Cache, Documenti, condivisione |
| `src/data/local/settings.ts`, `src/lib/firebaseMap.ts` | `reportBadgeSince`, `exportPrefs` |
| `src/components/earnings/CumulativeChart.tsx` | Linea cumulativa |
| `src/components/earnings/ExportSheet.tsx` | Foglio del commercialista |
| `src/pages/EarningsReportPage.tsx` | Pagina `/incassi/report` |
| `src/pages/SettingsPage.tsx`, `src/pages/EarningsPage.tsx`, `src/app/router.tsx` | Voce, link, rotta |
| `src/pages/PriceSheetExportPage.tsx` | Usa `shareFile` senza cambiare comportamento |

---

### Task 1: Conti del report

**Files:**
- Modify: `src/lib/earnings.ts`
- Modify: `src/lib/earnings.test.ts`

**Interfaces:**
- Consumes: `classify`, `appointmentAmount`, `compare`, `periodPhase`, `niceScale`, `dogName`, `sumDuration` da `src/lib/appointments.ts`, `ServiceIconKey`.
- Produces:
  - `export type ReportPreset = 'mese' | 'mese_scorso' | 'tre_mesi' | 'anno' | 'scelto'`
  - `reportBounds(preset: ReportPreset, now: Date, chosen?: Date): { from: Date; to: Date }`
  - `reportTitle(preset: ReportPreset, bounds: { from: Date; to: Date }, now: Date): string`
  - `reportBadgeVisible(since: string | undefined, now: Date): boolean`
  - `export interface ServiceShare { key: string; name: string; iconKey?: ServiceIconKey; count: number; amount: number }`
  - `serviceBreakdown(items: Appointment[], services: Service[]): ServiceShare[]`
  - `export interface DayPoint { day: number; current: number | null; previous: number | null }`
  - `cumulativeMonth(appointments: Appointment[], month: Date, now: Date): DayPoint[]`
  - `monthBars(appointments: Appointment[], from: Date, to: Date, now: Date): EarningsBucket[]`
  - `export interface RangeReport { from: Date; to: Date; phase: PeriodPhase; titolo: string; incassato: number; previsto: number; persi: number; completati: number; inAgenda: number; mediaACane: number | null; euroAllOra: number | null; minuti: number; giorni: number; pagamenti: EarningsSummary['pagamenti']; confronto: { delta: number | null; etichetta: string }; mediaDelta: number | null; servizi: ServiceShare[]; top: { dogId: string; name: string; amount: number }[]; mancati: LostRow[]; daChiudere: { count: number; importo: number }; mesi: EarningsBucket[]; punti: DayPoint[] }`
  - `reportOf(appointments: Appointment[], dogs: Dog[], services: Service[], preset: ReportPreset, now: Date, chosen?: Date): RangeReport`

- [ ] **Step 1: Write the failing test**

In `src/lib/earnings.test.ts`, aggiungi gli import e questo blocco. `visit`, `named`, `DOGS` esistono già nel file.

```ts
import { cumulativeMonth, monthBars, reportBadgeVisible, reportBounds, reportOf, reportTitle, serviceBreakdown } from './earnings'

const SERVICES: Service[] = [
  { id: 'bagno', name: 'Bagno', iconKey: 'bagno' } as Service,
  { id: 'taglio', name: 'Taglio', iconKey: 'taglio' } as Service,
]

describe('report', () => {
  it('il mese coincide con summarize, N/A non è un mancato e il senza-metodo è Non indicato', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const items = [
      visit(new Date(2026, 9, 10, 9), 40, 'completato', { dogId: 'zeus', paymentMethod: 'pos', actualDurationMin: 60 }),
      visit(new Date(2026, 9, 11, 9), 25, 'completato', { dogId: 'luna', paymentMethod: 'contanti', actualDurationMin: 30 }),
      visit(new Date(2026, 9, 12, 9), 0, 'completato', { dogId: 'otto', total: 0, paymentMethod: 'na', actualDurationMin: 30 }),
      visit(new Date(2026, 9, 12, 11), 80, 'completato', { dogId: 'zeus', services: [{ serviceId: 'taglio', name: 'Taglio', durationMin: 30, price: 80 }] }),
      visit(new Date(2026, 9, 13, 16), 10, 'programmato', { paymentMethod: 'pos' }),
      visit(new Date(2026, 9, 9, 9), 35, 'disdetto', { cancelReason: 'cliente', dogId: 'fido' }),
      visit(new Date(2026, 9, 8, 9), 99, 'disdetto', { cancelReason: 'salone' }),
    ]
    const page = summarize(items, DOGS, SERVICES, 'mese', now, now)
    const report = reportOf(items, DOGS, SERVICES, 'mese', now)
    expect(report.incassato).toBe(page.totali.incassato)
    expect(report.incassato).toBe(145)
    expect(report.pagamenti).toEqual(page.pagamenti)
    expect(report.pagamenti.offerti).toBe(1)
    expect(report.pagamenti.nonIndicato).toEqual({ importo: 80, count: 1 })
    expect(report.completati).toBe(4)
    expect(report.inAgenda).toBe(1)
    expect(report.persi).toBe(35)
    expect(report.minuti).toBe(150)
    expect(report.euroAllOra).toBe(58)
    expect(report.giorni).toBe(3)
    expect(report.top[0]).toMatchObject({ dogId: 'zeus', amount: 120 })
    expect(report.mancati).toHaveLength(1)
    expect(report.daChiudere.count).toBe(0)
    expect(report.servizi.map((item) => item.name)).toEqual(['Taglio', 'Bagno'])
  })

  it('i limiti e il titolo seguono il chip', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    expect(reportBounds('mese', now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })
    expect(reportBounds('mese_scorso', now).from).toEqual(new Date(2026, 8, 1))
    expect(reportBounds('tre_mesi', now)).toEqual({ from: new Date(2026, 7, 1), to: new Date(2026, 10, 1) })
    expect(reportBounds('anno', now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })
    expect(reportBounds('scelto', now, new Date(2026, 5, 18)).from).toEqual(new Date(2026, 5, 1))
    expect(reportTitle('mese', reportBounds('mese', now), now)).toBe('Ottobre 2026 · fino a oggi')
    expect(reportTitle('mese_scorso', reportBounds('mese_scorso', now), now)).toBe('Settembre 2026')
    expect(reportTitle('anno', reportBounds('anno', now), now)).toBe('Anno 2026 · fino a oggi')
    expect(reportTitle('tre_mesi', reportBounds('tre_mesi', now), now)).toBe('ago – ott 2026')
  })

  it('la linea cumulativa si ferma a oggi e il mese prima non inventa il 31', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const items = [
      visit(new Date(2026, 9, 10, 9), 40, 'completato'),
      visit(new Date(2026, 9, 12, 9), 10, 'completato'),
      visit(new Date(2026, 8, 10, 9), 5, 'completato'),
    ]
    const points = cumulativeMonth(items, now, now)
    expect(points).toHaveLength(31)
    expect(points[9]).toMatchObject({ day: 10, current: 40, previous: 5 })
    expect(points[11]).toMatchObject({ day: 12, current: 50 })
    expect(points[13].current).toBeNull()
    const march = cumulativeMonth(items, new Date(2026, 2, 1), new Date(2026, 2, 20))
    expect(march[30].previous).toBeNull()
  })

  it('le barre del trimestre tengono i mesi a zero', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const bars = monthBars([visit(new Date(2026, 9, 10, 9), 40, 'completato')], new Date(2026, 7, 1), new Date(2026, 10, 1), now)
    expect(bars.map((item) => item.label)).toEqual(['Ago', 'Set', 'Ott'])
    expect(bars[2].incassato).toBe(40)
    expect(bars[2].isToday).toBe(true)
    expect(monthBars([], new Date(2026, 7, 1), new Date(2026, 10, 1), now)).toEqual([])
  })

  it('il badge dura 14 giorni, giorno di partenza compreso', () => {
    const now = new Date(2026, 9, 17, 9)
    expect(reportBadgeVisible('2026-10-17', now)).toBe(true)
    expect(reportBadgeVisible('2026-10-04', now)).toBe(true)
    expect(reportBadgeVisible('2026-10-03', now)).toBe(false)
    expect(reportBadgeVisible('2026-10-18', now)).toBe(false)
    expect(reportBadgeVisible('no', now)).toBe(false)
    expect(reportBadgeVisible(undefined, now)).toBe(false)
  })

  it('serviceBreakdown raggruppa gli extra e non cambia le righe del mese', () => {
    const done = [visit(new Date(2026, 9, 10, 9), 30, 'completato', { services: [
      { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
      { serviceId: 'nodo', name: 'Nodo', durationMin: 10, price: 10 },
    ] })]
    const shares = serviceBreakdown(done, [...SERVICES, { id: 'nodo', name: 'Nodo', kind: 'extra' } as Service])
    expect(shares.find((item) => item.key === 'extra')).toMatchObject({ name: 'Extra', amount: 10 })
    expect(shares.find((item) => item.key === 'bagno')?.amount).toBe(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: FAIL perché `reportOf` non esiste.

- [ ] **Step 3: Write minimal implementation**

In cima a `src/lib/earnings.ts`, aggiungi `sumDuration` all'import da `./appointments`.

Sostituisci il corpo di `serviceRows` con una chiamata a `serviceBreakdown` (stessi numeri di prima):

```ts
export interface ServiceShare {
  key: string
  name: string
  iconKey?: ServiceIconKey
  count: number
  amount: number
}

export function serviceBreakdown(items: Appointment[], services: Service[]): ServiceShare[] {
  const groups = new Map<string, ServiceShare>()
  for (const item of items) {
    const amount = appointmentAmount(item)
    const listed = sumPrice(item.services)
    for (const line of item.services) {
      const share = listed > 0 ? (amount * line.price) / listed : amount / item.services.length
      const catalog = services.find((entry) => entry.id === line.serviceId)
      const extra = catalog?.kind === 'extra'
      const key = extra ? 'extra' : line.serviceId
      const group = groups.get(key) ?? { key, name: extra ? 'Extra' : line.name, iconKey: extra ? undefined : catalog?.iconKey, count: 0, amount: 0 }
      group.count += 1
      group.amount += share
      groups.set(key, group)
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, amount: round2(group.amount) }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'it'))
}

function serviceRows(items: Appointment[], services: Service[]): EarningsRow[] {
  return serviceBreakdown(items, services).map((group) => ({
    kind: 'servizio',
    key: group.key,
    name: group.name,
    iconKey: group.iconKey,
    count: group.count,
    amount: group.amount,
  }))
}
```

Poi, in fondo al file, aggiungi:

```ts
export type ReportPreset = 'mese' | 'mese_scorso' | 'tre_mesi' | 'anno' | 'scelto'

export function reportBounds(preset: ReportPreset, now: Date, chosen?: Date): { from: Date; to: Date } {
  const today = startOfLocalDay(now)
  if (preset === 'mese_scorso') {
    const from = startOfMonth(addMonths(today, -1))
    return { from, to: addMonths(from, 1) }
  }
  if (preset === 'tre_mesi') {
    const from = startOfMonth(addMonths(today, -2))
    return { from, to: addMonths(startOfMonth(today), 1) }
  }
  if (preset === 'anno') return { from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear() + 1, 0, 1) }
  const anchor = preset === 'scelto' && chosen ? chosen : today
  const from = startOfMonth(anchor)
  return { from, to: addMonths(from, 1) }
}

export function reportTitle(preset: ReportPreset, bounds: { from: Date; to: Date }, now: Date): string {
  const open = periodPhase(bounds, now) === 'in_corso'
  if (preset === 'anno') return open ? `Anno ${bounds.from.getFullYear()} · fino a oggi` : `Anno ${bounds.from.getFullYear()}`
  if (preset === 'tre_mesi') {
    const last = addDays(bounds.to, -1)
    return `${shortMonth(bounds.from)} – ${shortMonth(last)} ${last.getFullYear()}`
  }
  const name = capitalize(format(bounds.from, 'MMMM yyyy', IT_DATE))
  return open ? `${name} · fino a oggi` : name
}

export function reportBadgeVisible(since: string | undefined, now: Date): boolean {
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) return false
  const [year, month, day] = since.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return false
  const today = startOfLocalDay(now).getTime()
  return today >= start.getTime() && today < addDays(start, 14).getTime()
}

function earnedBetween(appointments: Appointment[], from: Date, to: Date, now: Date): number {
  return total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
}

export function spanDelta(appointments: Appointment[], from: Date, to: Date, now: Date): number | null {
  const length = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - length)
  const phase = periodPhase({ from, to }, now)
  if (phase === 'futuro') return null
  let cutoff = new Date(previousFrom.getTime() + length)
  if (phase === 'in_corso') {
    const shifted = new Date(previousFrom.getTime() + Math.max(0, now.getTime() - from.getTime()))
    if (shifted.getTime() < cutoff.getTime()) cutoff = shifted
  }
  const before = earnedBetween(appointments, previousFrom, cutoff, now)
  if (before === 0) return null
  return Math.round(((earnedBetween(appointments, from, to, now) - before) / before) * 100)
}

function doneBetween(appointments: Appointment[], from: Date, to: Date, now: Date): Appointment[] {
  return appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to))
}

function minutesOf(item: Appointment): number {
  if (typeof item.actualDurationMin === 'number' && item.actualDurationMin >= 0) return item.actualDurationMin
  return sumDuration(item.services)
}

function previousWindow(from: Date, to: Date, now: Date): { previousFrom: Date; previousTo: Date } {
  const length = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - length)
  const phase = periodPhase({ from, to }, now)
  let previousTo = new Date(previousFrom.getTime() + length)
  if (phase === 'in_corso') {
    const shifted = new Date(previousFrom.getTime() + Math.max(0, now.getTime() - from.getTime()))
    if (shifted.getTime() < previousTo.getTime()) previousTo = shifted
  }
  return { previousFrom, previousTo }
}

function monthWindow(from: Date, now: Date): { currentTo: Date; previousFrom: Date; previousTo: Date } {
  const current = periodRange('mese', from)
  const previous = periodRange('mese', addMonths(current.from, -1))
  const phase = periodPhase(current, now)
  let previousTo = previous.to
  if (phase === 'in_corso') {
    const shifted = addMonths(now, -1)
    if (shifted.getDate() === now.getDate() && shifted.getTime() < previous.to.getTime()) previousTo = shifted
  }
  return { currentTo: current.to, previousFrom: previous.from, previousTo }
}

function mediaBetween(appointments: Appointment[], from: Date, to: Date, now: Date): number | null {
  const done = doneBetween(appointments, from, to, now)
  if (done.length === 0) return null
  return Math.round(total(done) / done.length)
}

export interface DayPoint {
  day: number
  current: number | null
  previous: number | null
}

export function cumulativeMonth(appointments: Appointment[], month: Date, now: Date): DayPoint[] {
  const from = startOfMonth(month)
  const days = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate()
  const prevFrom = addMonths(from, -1)
  const prevDays = new Date(prevFrom.getFullYear(), prevFrom.getMonth() + 1, 0).getDate()
  const today = startOfLocalDay(now).getTime()
  const points: DayPoint[] = []
  for (let day = 1; day <= days; day += 1) {
    const currentDay = new Date(from.getFullYear(), from.getMonth(), day)
    const current = currentDay.getTime() > today ? null : earnedBetween(appointments, from, addDays(currentDay, 1), now)
    const previous = day > prevDays ? null : earnedBetween(appointments, prevFrom, new Date(prevFrom.getFullYear(), prevFrom.getMonth(), day + 1), now)
    points.push({ day, current, previous })
  }
  return points
}

export function monthBars(appointments: Appointment[], from: Date, to: Date, now: Date): EarningsBucket[] {
  const bars: EarningsBucket[] = []
  let cursor = startOfMonth(from)
  while (cursor.getTime() < to.getTime()) {
    const next = addMonths(cursor, 1)
    const inside = appointments.filter((item) => inRange(item, cursor, next))
    const value = sums(inside, now)
    bars.push({
      key: format(cursor, 'yyyy-MM'),
      label: capitalize(shortMonth(cursor)),
      sublabel: '',
      title: capitalize(format(cursor, 'MMMM yyyy', IT_DATE)),
      incassato: value.incassato,
      previsto: value.previsto,
      isToday: startOfMonth(now).getTime() === cursor.getTime(),
    })
    cursor = next
  }
  if (!bars.some((bar) => bar.incassato + bar.previsto > 0)) return []
  return bars
}

export interface RangeReport {
  from: Date
  to: Date
  phase: PeriodPhase
  titolo: string
  incassato: number
  previsto: number
  persi: number
  completati: number
  inAgenda: number
  mediaACane: number | null
  euroAllOra: number | null
  minuti: number
  giorni: number
  pagamenti: EarningsSummary['pagamenti']
  confronto: { delta: number | null; etichetta: string }
  mediaDelta: number | null
  servizi: ServiceShare[]
  top: { dogId: string; name: string; amount: number }[]
  mancati: LostRow[]
  daChiudere: { count: number; importo: number }
  mesi: EarningsBucket[]
  punti: DayPoint[]
}

export function reportOf(appointments: Appointment[], dogs: Dog[], services: Service[], preset: ReportPreset, now: Date, chosen?: Date): RangeReport {
  const bounds = reportBounds(preset, now, chosen)
  const phase = periodPhase(bounds, now)
  const inside = appointments.filter((item) => inRange(item, bounds.from, bounds.to))
  const of = (kind: EarningsClass) => inside.filter((item) => classify(item, now) === kind)
  const done = of('incassato')
  const coming = of('previsto')
  const lost = of('perso')
  const open = of('da_chiudere')
  const incassato = total(done)
  const minuti = done.reduce((sum, item) => sum + minutesOf(item), 0)
  const monthPreset = preset === 'mese' || preset === 'mese_scorso' || preset === 'scelto'
  const confronto = monthPreset
    ? compare(appointments, 'mese', bounds.from, now)
    : { delta: spanDelta(appointments, bounds.from, bounds.to, now), etichetta: preset === 'tre_mesi' ? 'vs i 3 mesi prima' : 'vs anno scorso' }
  const mediaNow = done.length > 0 ? Math.round(incassato / done.length) : null
  const compared = monthPreset ? monthWindow(bounds.from, now) : previousWindow(bounds.from, bounds.to, now)
  const mediaBefore = mediaBetween(appointments, compared.previousFrom, compared.previousTo, now)
  const totals = new Map<string, number>()
  for (const item of done) totals.set(item.dogId, round2((totals.get(item.dogId) ?? 0) + appointmentAmount(item)))
  const top = [...totals.entries()]
    .map(([dogId, amount]) => ({ dogId, name: dogName(dogs, dogId), amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'it'))
    .slice(0, 5)
  return {
    from: bounds.from,
    to: bounds.to,
    phase,
    titolo: reportTitle(preset, bounds, now),
    incassato,
    previsto: total(coming),
    persi: total(lost),
    completati: done.length,
    inAgenda: coming.length,
    mediaACane: mediaNow,
    euroAllOra: minuti > 0 ? Math.round(incassato / (minuti / 60)) : null,
    minuti,
    giorni: new Set(done.map((item) => localDayKey(item.start))).size,
    pagamenti: paymentSplit(done),
    confronto,
    mediaDelta: mediaNow === null || mediaBefore === null ? null : mediaNow - mediaBefore,
    servizi: serviceBreakdown(done, services),
    top,
    mancati: lostRows(lost, dogs),
    daChiudere: { count: open.length, importo: total(open) },
    mesi: monthBars(appointments, bounds.from, bounds.to, now),
    punti: cumulativeMonth(appointments, bounds.from, now),
  }
}
```

`shortMonth` di un mese intero in italiano può essere `ott.` o `ott`. `reportTitle` per i 3 mesi usa `shortMonth`, che toglie già il punto. Il test si aspetta `ago – ott 2026`. Se date-fns restituisce un'abbreviazione diversa, il test va aggiornato al valore reale di `format(date, 'MMM', IT_DATE)` senza punto, non si forza una stringa inventata.

`Ago` / `Set` / `Ott` di `monthBars` dipendono dallo stesso `shortMonth` con l'iniziale maiuscola. Se il locale dà `ago`, il test dei label diventa `['Ago', 'Set', 'Ott']` solo se quelle sono le abbreviazioni vere. Verifica con un `console` nel test che fallisce e allinea le stringhe attese a date-fns. Non cambiare il locale.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: PASS, compresi i test vecchi di `summarize`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts
git commit -m "feat: conti del report incassi sullo stesso riepilogo della pagina"
```

---

### Task 2: Badge e preferenze di export

**Files:**
- Modify: `src/data/local/settings.ts`
- Modify: `src/data/local/settings.test.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: niente dal Task 1.
- Produces:
  - `export interface ExportPrefs { formato: 'pdf' | 'csv'; periodo: 'mese' | 'anno' | 'intervallo'; include: { riepilogo: boolean; dettaglio: boolean; attivita: boolean; mancati: boolean } }`
  - `export const DEFAULT_EXPORT: ExportPrefs`
  - `SettingsMain.ui.reportBadgeSince?: string`
  - `SettingsMain.exportPrefs?: ExportPrefs`
  - `readExportPrefs` resta privato. Un campo assente resta `undefined`. Un campo presente ma rotto diventa `DEFAULT_EXPORT`. Se riepilogo e dettaglio sono entrambi false, riepilogo diventa true.

`DEFAULT_EXPORT`:

```ts
export const DEFAULT_EXPORT: ExportPrefs = {
  formato: 'pdf',
  periodo: 'mese',
  include: { riepilogo: true, dettaglio: true, attivita: true, mancati: false },
}
```

- [ ] **Step 1: Write the failing test**

In `src/data/local/settings.test.ts`:

```ts
it('reportBadgeSince si tiene solo se è un giorno, exportPrefs rotto torna ai default', () => {
  localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({
    theme: 'auto',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ui: { hideAmounts: true, reportBadgeSince: '2026-10-17' },
    exportPrefs: { formato: 'csv', periodo: 'anno', include: { riepilogo: false, dettaglio: false, attivita: false, mancati: true } },
  }))
  const saved = getSettings('uid-1')
  expect(saved.ui).toEqual({ hideAmounts: true, reportBadgeSince: '2026-10-17' })
  expect(saved.exportPrefs).toEqual({
    formato: 'csv',
    periodo: 'anno',
    include: { riepilogo: true, dettaglio: false, attivita: false, mancati: true },
  })
  localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({
    theme: 'auto',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ui: { hideAmounts: false, reportBadgeSince: 'ieri' },
    exportPrefs: { formato: 'bonifico' },
  }))
  const broken = getSettings('uid-1')
  expect(broken.ui).toEqual({ hideAmounts: false })
  expect(broken.exportPrefs).toEqual(DEFAULT_EXPORT)
})
```

Importa `DEFAULT_EXPORT`. Il test già presente che si aspetta `ui` uguale a `{ hideAmounts: false }` su impostazioni vuote deve restare verde: il default non aggiunge `reportBadgeSince` né `exportPrefs`.

In `src/lib/firebaseMap.test.ts`, accanto al test di `hideAmounts`:

```ts
it('reportBadgeSince e exportPrefs vanno e tornano; un documento vecchio non li inventa', () => {
  const settings = {
    ...blankSettings('auto', '2026-10-17T00:00:00.000Z'),
    ui: { hideAmounts: false, reportBadgeSince: '2026-10-17' },
    exportPrefs: DEFAULT_EXPORT,
  }
  expect(settingsFromDoc(settingsToDoc(settings)).ui.reportBadgeSince).toBe('2026-10-17')
  expect(settingsFromDoc(settingsToDoc(settings)).exportPrefs).toEqual(DEFAULT_EXPORT)
  const old = settingsFromDoc({ theme: 'auto', updatedAt: '2026-10-13T00:00:00.000Z' })
  expect(old.ui.reportBadgeSince).toBeUndefined()
  expect(old.exportPrefs).toBeUndefined()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/settings.test.ts src/lib/firebaseMap.test.ts`
Expected: FAIL perché i campi non esistono.

- [ ] **Step 3: Write minimal implementation**

Aggiungi il tipo e `DEFAULT_EXPORT` in `settings.ts`. Estendi `ui` con `reportBadgeSince?: string` e aggiungi `exportPrefs?: ExportPrefs` a `SettingsMain`. `blankSettings` non li imposta.

`readExportPrefs(value: unknown): ExportPrefs | undefined` e `readBadge(value: unknown): string | undefined` stanno nello stesso file. `mergeSettings` e `settingsFromDoc` li usano entrambi: esporta le due funzioni da `settings.ts` e chiamale da `firebaseMap.ts`, così la regola non è scritta due volte.

```ts
export function readBadge(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

export function readExportPrefs(value: unknown): ExportPrefs | undefined {
  if (value === undefined) return undefined
  if (!value || typeof value !== 'object') return { ...DEFAULT_EXPORT }
  const raw = value as Partial<ExportPrefs>
  const formato = raw.formato === 'csv' ? 'csv' : 'pdf'
  const periodo = raw.periodo === 'anno' || raw.periodo === 'intervallo' ? raw.periodo : 'mese'
  const include = raw.include
  if (!include || typeof include !== 'object') return { ...DEFAULT_EXPORT, formato, periodo }
  const dettaglio = include.dettaglio === true
  return {
    formato,
    periodo,
    include: {
      riepilogo: include.riepilogo === true || !dettaglio,
      dettaglio,
      attivita: include.attivita === true,
      mancati: include.mancati === true,
    },
  }
}
```

Un valore assente resta `undefined`: `mergeSettings` non scrive il default. Un valore presente ma senza `include` (il test `{ formato: 'bonifico' }`) diventa `DEFAULT_EXPORT`. Se riepilogo e dettaglio arrivano entrambi false, il riepilogo si riaccende.

```ts
const badge = readBadge(existing.ui?.reportBadgeSince)
const exportPrefs = readExportPrefs(existing.exportPrefs)
ui: {
  hideAmounts: existing.ui?.hideAmounts === true,
  ...(badge ? { reportBadgeSince: badge } : {}),
},
...(exportPrefs ? { exportPrefs } : {}),
```

La stessa ricostruzione di `ui` e `exportPrefs` va in `settingsFromDoc`, al posto della riga che oggi tiene solo `hideAmounts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/settings.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/settings.ts src/data/local/settings.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts
git commit -m "feat: ricorda il badge del report e le scelte di export"
```

---

### Task 3: Dati di export e CSV

**Files:**
- Create: `src/lib/earningsExport.ts`
- Create: `src/lib/earningsExport.test.ts`

**Interfaces:**
- Consumes: `classify`, `appointmentAmount`, `serviceBreakdown`, `ReportPreset` non serve qui. `Dog`, `Appointment`, `Service`, `SettingsMain`.
- Produces:
  - `export type ExportKind = 'mese' | 'anno' | 'intervallo'`
  - `export interface ExportInclude { riepilogo: boolean; dettaglio: boolean; attivita: boolean; mancati: boolean }`
  - `exportRange(kind: ExportKind, anchor: Date, custom?: { from: string; to: string }): { from: Date; to: Date; clipped: boolean }`
  - `exportFileName(kind: ExportKind, from: Date, to: Date, formato: 'pdf' | 'csv'): string`
  - `ownerName(dog: Dog | undefined): string`
  - `paymentLabel(method: Appointment['paymentMethod'] | undefined): 'POS' | 'Contanti' | 'N/A' | 'Non indicato'`
  - `export interface ExportData { title: string; periodLabel: string; business: { name: string; vatNumber: string; phone: string; address: string } | null; incassato: number; appuntamenti: number; giorni: number; media: number | null; pagamenti: EarningsSummary['pagamenti']; servizi: ServiceShare[]; gruppi: { label: string; count: number; amount: number }[]; gruppoTitolo: 'Settimana' | 'Mese'; rows: ExportRow[]; missed: ExportRow[]; daChiudere: number; generatedAt: Date }`
  - `export interface ExportRow { date: string; time: string; dog: string; owner: string; services: string; minutes: number; amount: number; payment: string; status: string; missedAmount: number }`
  - `buildExportData(appointments: Appointment[], dogs: Dog[], services: Service[], settings: SettingsMain['business'], range: { from: Date; to: Date }, include: ExportInclude, kind: ExportKind, now: Date): ExportData`
  - `toCsv(data: ExportData, include: ExportInclude): string`

`exportRange`: per `mese`, dal 1° al 1° del mese dopo di `anchor`. Per `anno`, 1 gennaio – 1 gennaio dopo. Per `intervallo`, `from` e `to` sono `aaaa-mm-gg` inclusi. La fine esclusiva è il giorno dopo `to`. Se `to` è prima di `from`, si scambiano. Se la fine esclusiva è oltre 24 mesi dopo l'inizio, si accorcia a `addMonths(from, 24)` e `clipped` è true. Altrimenti `clipped` è false.

`ownerName`: nome trim del contatto `isPrimary`, altrimenti del primo di `contacts`, altrimenti `dog.contact.name`, altrimenti `''`.

`paymentLabel`: assente → `Non indicato`.

Righe completate ordinate per `start` poi `id`. `status` = `completato`. `missedAmount` = 0. `amount` = `appointmentAmount`. `minutes` come `minutesOf` del Task 1: duplica quella regola qui in una funzione locale, non importare una funzione non esportata.

Righe mancate, solo se `include.mancati`: stato `non venuto` o `disdetto dal cliente`, `amount` 0, `payment` `''`, `missedAmount` = `appointmentAmount`. Disdetto dal salone e deceduto non ci sono.

`gruppi`: se `kind === 'mese'`, una riga per settimana ISO che tocca il mese (`startOfWeek` con `IT_DATE`), etichetta `1–7` se resta nello stesso mese, altrimenti `28 set – 4 ott` con `shortMonth` locale duplicata (tre lettere di date-fns senza punto). Se `kind` è `anno` o `intervallo`, una riga per mese `Settembre 2026`. I mesi e le settimane a zero ci sono lo stesso.

`title`: `Riepilogo incassi · Settembre 2026` per il mese, `Riepilogo incassi · 2026` per l'anno, `Riepilogo incassi · 1 lug – 30 set 2026` per l'intervallo.

`periodLabel` del CSV: `01/09/2026 - 30/09/2026`.

`toCsv`:
- inizia con `\uFEFF`
- righe unite da `\r\n`, e finisce con `\r\n`
- se `include.attivita`: `Attività;…`, `P. IVA;…`, `Periodo;…`, riga vuota. Il telefono dell'attività non va nel CSV.
- se `include.dettaglio`, l'intestazione e le righe. Senza la colonna mancati: `Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Pagamento;Stato`
- numeri `toFixed(2)` con la virgola al posto del punto, senza separatore delle migliaia
- totale, se c'è il dettaglio: `;;;;;Totale;145,00;;` oppure, con i mancati, `;;;;;Totale;145,00;;;`
- se `include.mancati` e il dettaglio è acceso, le righe mancate stanno nella stessa tabella, dopo i completati e prima del totale. Il totale non le somma.
- se `include.riepilogo`: riga vuota, `Servizio;Volte;Importo (€)`, righe, `Totale;volte;importo`, riga vuota, poi `Settimana;App.;Importo (€)` o `Mese;App.;Importo (€)`
- `csvField`: se il valore contiene `;`, `"` o un a capo, va tra virgolette e le virgolette interne si raddoppiano

- [ ] **Step 1: Write the failing test**

`src/lib/earningsExport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, Service } from '../types/models'
import { buildExportData, exportFileName, exportRange, ownerName, toCsv } from './earningsExport'

function dog(id: string, name: string, owner: string, phone = '333'): Dog {
  return { id, name, contact: { name: owner, phone }, contacts: [{ id: 'c', name: owner, role: 'Proprietaria', phone, isPrimary: true }] } as Dog
}

function visit(id: string, start: Date, price: number, extra: Partial<Appointment> = {}): Appointment {
  return {
    id,
    dogId: 'zeus',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status: 'completato',
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

const dogs = [dog('zeus', 'Zeus', 'Laura'), dog('fido', 'Fido', 'Mario', '349000')]
const services = [{ id: 'bagno', name: 'Bagno', iconKey: 'bagno' } as Service]
const business = { name: 'I Pelosetti', vatNumber: '123', phone: '06', address: 'Via Roma' }
const include = { riepilogo: true, dettaglio: true, attivita: true, mancati: true }

describe('earningsExport', () => {
  it('il proprietario non è il telefono e il range si accorcia a 24 mesi', () => {
    expect(ownerName(dogs[0])).toBe('Laura')
    expect(ownerName({ contact: { name: 'Ada', phone: '111' } } as Dog)).toBe('Ada')
    const range = exportRange('intervallo', new Date(2026, 0, 1), { from: '2024-01-01', to: '2026-06-01' })
    expect(range.clipped).toBe(true)
    expect(range.to).toEqual(new Date(2026, 0, 1))
    expect(exportRange('mese', new Date(2026, 8, 18)).from).toEqual(new Date(2026, 8, 1))
    expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf')).toBe('Groomly_Incassi_2026-09.pdf')
    expect(exportFileName('anno', new Date(2026, 0, 1), new Date(2027, 0, 1), 'csv')).toBe('Groomly_Incassi_2026.csv')
  })

  it('il CSV separa POS, contanti, N/A e non indicato e lascia fuori il telefono e la nota', () => {
    const now = new Date(2026, 9, 17, 9, 40)
    const items = [
      visit('a', new Date(2026, 8, 2, 9, 30), 40, { paymentMethod: 'pos', adjustmentNote: 'Nodi' }),
      visit('b', new Date(2026, 8, 3, 11), 25, { dogId: 'fido', paymentMethod: 'contanti' }),
      visit('c', new Date(2026, 8, 4, 12), 0, { total: 0, paymentMethod: 'na' }),
      visit('d', new Date(2026, 8, 5, 15), 80, {}),
      visit('e', new Date(2026, 8, 6, 10), 35, { dogId: 'fido', status: 'disdetto', cancelReason: 'cliente' }),
      visit('f', new Date(2026, 8, 7, 10), 99, { status: 'disdetto', cancelReason: 'salone' }),
    ]
    const range = exportRange('mese', new Date(2026, 8, 1))
    const data = buildExportData(items, dogs, services, business, range, include, 'mese', now)
    expect(data.incassato).toBe(145)
    expect(data.daChiudere).toBe(0)
    expect(data.pagamenti.pos.importo).toBe(40)
    expect(data.missed).toHaveLength(1)
    const csv = toCsv(data, include)
    expect(csv.startsWith('\uFEFFAttività;I Pelosetti\r\n')).toBe(true)
    expect(csv).toContain('P. IVA;123\r\n')
    expect(csv).toContain('Periodo;01/09/2026 - 30/09/2026')
    expect(csv).toContain('Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Pagamento;Stato;Importo mancato (€)')
    expect(csv).toContain('02/09/2026;09:30;Zeus;Laura;Bagno;30;40,00;POS;completato;0,00')
    expect(csv).toContain('04/09/2026;12:00;Zeus;Laura;Bagno;30;0,00;N/A;completato;0,00')
    expect(csv).toContain('05/09/2026;15:00;Zeus;Laura;Bagno;30;80,00;Non indicato;completato;0,00')
    expect(csv).toContain('06/09/2026;10:00;Fido;Mario;Bagno;30;0,00;;disdetto dal cliente;35,00')
    expect(csv).toContain(';;;;;Totale;145,00;;;')
    expect(csv).not.toContain('349000')
    expect(csv).not.toContain('Nodi')
    expect(csv).not.toContain('99,00')
  })
})
```

Il test dell'intervallo: `from` 1 gennaio 2024, fine inclusa 1 giugno 2026. 24 mesi dopo il 1 gennaio 2024 è il 1 gennaio 2026. `to` esclusivo diventa quella data e `clipped` è true. Se il calcolo del «giorno dopo la fine inclusa» ti porta a un altro giorno, allinea il test a `addMonths(start, 24)` esclusivo: è quella la regola, non la data che ho scritto se ho sbagliato il calendario. Conta i mesi con `addMonths` di date-fns e aggiorna solo l'atteso se il giorno non torna.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earningsExport.test.ts`
Expected: FAIL perché il modulo non esiste.

- [ ] **Step 3: Write minimal implementation**

Crea `src/lib/earningsExport.ts` con le funzioni della sezione Interfaces. Per i gruppi settimana, parti dal lunedì di `range.from` e avanza di 7 giorni finché l'inizio settimana è prima di `range.to`. Ogni settimana conta i completati con `start` nella settimana e nel range.

Il campo che contiene `;` si quota. `Bagno; taglio` diventerebbe `"Bagno; taglio"`. Aggiungi nel test una visita con due servizi solo se vuoi coprire le virgolette: `servizi "nodi"` deve uscire come `"servizi ""nodi"""`. Metti questo expect nel secondo test:

```ts
expect(toCsv({ ...data, rows: [{ ...data.rows[0], services: 'nodi "fitti"' }] }, include)).toContain('"nodi ""fitti"""')
```

È più semplice costruire la stringa nel test di `toCsv` passando un `ExportData` minimo, senza ricalcolare `buildExportData`. Fallo in un terzo `it` con un oggetto letterale, così la virgoletta non dipende dai cani.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earningsExport.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earningsExport.ts src/lib/earningsExport.test.ts
git commit -m "feat: CSV degli incassi con pagamento e senza telefono"
```

---

### Task 4: PDF

**Files:**
- Create: `src/lib/earningsPdf.ts`
- Create: `src/lib/earningsPdf.test.ts`
- Modify: `package.json` / `package-lock.json` tramite npm

**Interfaces:**
- Consumes: `ExportData` e `ExportInclude` dal Task 3.
- Produces: `toPdf(data: ExportData, include: ExportInclude): Blob`

- [ ] **Step 1: Write the failing test**

`src/lib/earningsPdf.test.ts`. Mock di `jspdf` e `jspdf-autotable`: la classe registra `text` e `line`, `getNumberOfPages` ritorna 2, `setPage` è una funzione, `output('blob')` ritorna `new Blob(['%PDF'])`. Il default di autotable accumula le opzioni in un array `tables`.

```ts
it('scrive titolo, pagamento, totale, piè di pagina e non il telefono del cliente', () => {
  const data = exportFixture()
  const blob = toPdf(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: true })
  expect(blob).toBeInstanceOf(Blob)
  const written = texts.join('\n')
  expect(written).toContain('Riepilogo incassi · Settembre 2026')
  expect(written).toContain('P. IVA 123')
  expect(written).toContain('non è una fattura')
  expect(written).toContain('Pagina 1 di 2')
  expect(written).toContain('Pagina 2 di 2')
  expect(written).not.toContain('349')
  const flat = JSON.stringify(tables)
  expect(flat).toContain('Pagamento')
  expect(flat).toContain('POS')
  expect(flat).toContain('Non inclusi nel totale')
})
```

`exportFixture` costruisce un `ExportData` con una riga Zeus/Laura/POS 40,00, una riga mancata, `pagamenti.pos` a 40, `generatedAt` = `new Date(2026, 9, 17, 9, 40)`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earningsPdf.test.ts`
Expected: FAIL perché il modulo non esiste.

- [ ] **Step 3: Write minimal implementation**

Run: `npm install jspdf-autotable`

`toPdf`:
- `new jsPDF({ unit: 'mm', format: 'a4' })`
- margine 14. Titolo 16 pt bold con `data.title`. Riga dopo: periodo e `solo appuntamenti completati`.
- se `data.business`: a destra nome, `P. IVA ${vat}`, indirizzo, telefono attività. Non c'è un campo telefono cliente su `ExportData`: non aggiungerlo.
- `doc.line` sotto l'intestazione, colore non necessario se restiamo sul nero di default di jsPDF: il file non usa i token CSS. La spec chiede una linea `#3A5BA0`: `doc.setDrawColor(58, 91, 160)` solo per quella linea.
- quattro box di testo: Totale incassato, Appuntamenti, Giorni lavorati, Media. Importi `it-IT` con 2 decimali e ` €` dopo (`1.840,00 €`).
- riga `POS 40,00 € · Contanti …`. Aggiungi Non indicato e Offerti solo se count / offerti > 0.
- `autoTable` per servizi e per gruppi se `include.riepilogo`. Per il dettaglio se `include.dettaglio`, `head` con Pagamento, `showHead: 'everyPage'`. Se `kind` non è sul data, usa `gruppoTitolo === 'Mese'` per inserire una riga subtotale quando cambia il mese della data (prime 7 cifre `mm/aaaa` no: la data è `gg/mm/aaaa`, il mese è i caratteri 3–9 `mm/aaaa`).
- tabella mancati se `include.mancati` e `data.missed.length > 0`, poi una riga di testo `Non inclusi nel totale`.
- dopo le tabelle, per ogni pagina `setPage` e in fondo `Generato con Groomly il 17/10/2026 alle 09:40 · documento riepilogativo, non è una fattura` a sinistra e `Pagina n di N` a destra. La data viene da `data.generatedAt`, non da `new Date()` interno, così il test è stabile.
- `return doc.output('blob')`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earningsPdf.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json src/lib/earningsPdf.ts src/lib/earningsPdf.test.ts
git commit -m "feat: PDF riepilogo incassi per il commercialista"
```

---

### Task 5: Condivisione unica

**Files:**
- Create: `src/lib/shareFile.ts`
- Modify: `src/pages/PriceSheetExportPage.tsx`

**Interfaces:**
- Consumes: `@capacitor/filesystem`, `@capacitor/share`.
- Produces:
  - `blobBase64(blob: Blob): Promise<string>`
  - `shareFiles(files: { blob: Blob; name: string }[], title: string): Promise<void>` scrive ogni file in `Directory.Cache` e chiama `Share.share({ files: uris, title })`
  - `writeDocuments(files: { blob: Blob; name: string }[]): Promise<void>` scrive `Groomly/${name}` in `Directory.Documents` con `recursive: true`
  - `isShareCancel(error: unknown): boolean` come oggi: messaggio `Share canceled` o nome `AbortError`
  - `downloadAnchor(blob: Blob, name: string): void` crea un `<a download>` e lo clicca

- [ ] **Step 1: Write the failing test**

Non serve un test nuovo. I test del listino sono il contratto: `src/pages/priceSheetExport.test.tsx` si aspetta `Share.share` con `title: 'Listino prezzi'`, `directory: 'CACHE'`, e il fallback Documenti.

- [ ] **Step 2: Run test to verify the current listino still passes**

Run: `npx vitest run src/pages/priceSheetExport.test.tsx`
Expected: PASS prima dello spostamento. Se è già rosso, fermati: il rosso non è di questo task.

- [ ] **Step 3: Write minimal implementation**

Sposta `blobBase64`, `shareFiles`, `writeDocuments`, `isShareCancel` e `downloadAnchor` in `src/lib/shareFile.ts`. `shareFiles` prende `title` come secondo argomento. In `PriceSheetExportPage` le chiamate diventano `shareFiles(files, 'Listino prezzi')`. Il resto della pagina, toast compresi, non cambia.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/priceSheetExport.test.tsx`
Expected: PASS, stessi title e directory di prima.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/shareFile.ts src/pages/PriceSheetExportPage.tsx
git commit -m "refactor: la condivisione dei file sta in un solo modulo"
```

---

### Task 6: Voce in Impostazioni e link in Incassi

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`
- Modify: `src/pages/EarningsPage.tsx`
- Modify: `src/pages/EarningsPage.test.tsx`
- Create: `src/components/earnings/Sparkline.tsx`

**Interfaces:**
- Consumes: `reportOf`, `reportBadgeVisible`, `maskEuro`, `formatEuro` da `src/lib/format.ts`, `localDayKey`.
- Produces: una riga link e un link in fondo alla pagina Incassi. `Sparkline({ values }: { values: number[] })` disegna un SVG 40×18.

- [ ] **Step 1: Write the failing test**

In `SettingsPage.test.tsx`, con lo stesso stile degli altri test (`createAccount`, `App memory`, orologio se già usato; se il file non congela l'ora, non aggiungere un timer finto solo per il nome del mese: cerca il link, non la cifra):

```ts
it('in Attività c’è Incassi e report e scrive il giorno del badge', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 17, 9))
  const account = await createAccount('maria@salone.it', 'segretissimo')
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  expect(await screen.findByRole('link', { name: /Incassi e report/ })).toHaveAttribute('href', '/incassi/report')
  expect(screen.getByText('NUOVO')).toBeInTheDocument()
  expect(getSettings(account.uid).ui.reportBadgeSince).toBe('2026-10-17')
  vi.useRealTimers()
})
```

Se `vi.useFakeTimers` rompe `findByRole` in questo file, limita `toFake: ['Date']` come in `EarningsPage.test.tsx`.

In `EarningsPage.test.tsx`:

```ts
it('in fondo c’è il link al report', async () => {
  await seed()
  render(<App memory isDev={false} initialPath="/incassi" />)
  expect(await screen.findByRole('link', { name: 'Report ed esportazione ›' })).toHaveAttribute('href', '/incassi/report')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/EarningsPage.test.tsx`
Expected: FAIL perché il link non c'è.

- [ ] **Step 3: Write minimal implementation**

`Sparkline`: `<svg width="40" height="18" aria-hidden>`. Se `values` è vuoto, non disegna. Altrimenti una `polyline` senza fill, `stroke="var(--ok)"`, `strokeWidth="2"`. La x è l'indice, la y rovescia il valore sul massimo. Massimo 0: linea orizzontale in basso.

In `SettingsPage`, `useEffect` al mount: se `readBadge(settings.ui.reportBadgeSince)` è undefined, `save({ ...settings, ui: { ...settings.ui, reportBadgeSince: localDayKey(new Date()) } })`. Una volta sola: dipendenze `uid` o il controllo «se manca». Non riscrivere se c'è già.

La seconda riga della card Attività è un `Link` a `/incassi/report`. Nome accessibile che contiene `Incassi e report`. Dentro: `IconTile tone="ok"` con `ChartLine`, titolo, badge `NUOVO` se `reportBadgeVisible`, sotto il mese da `reportOf(..., 'mese', new Date()).titolo` senza il suffisso ` · fino a oggi` (taglia su quel separatore) e `maskEuro(report.incassato, hidden)`. Se `report.confronto.delta !== null` e gli importi sono visibili, aggiungi `▲` o `▼`, la percentuale e `report.confronto.etichetta`. Poi `Sparkline` con `report.punti.flatMap((point) => point.current === null ? [] : [point.current])` e un chevron. Gradiente solo con il badge.

In fondo a `EarningsPage`, prima della chiusura del contenitore scrollabile, un `Link` centrato `Report ed esportazione ›`, `fontSize: TYPE.meta`, `fontWeight: 700`, `color: 'var(--pri)'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/pages/EarningsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/earnings/Sparkline.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/pages/EarningsPage.tsx src/pages/EarningsPage.test.tsx
git commit -m "feat: voce Incassi e report in Impostazioni"
```

---

### Task 7: Pagina Report

**Files:**
- Create: `src/pages/EarningsReportPage.tsx`
- Create: `src/pages/EarningsReportPage.test.tsx`
- Create: `src/components/earnings/CumulativeChart.tsx`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `reportOf`, `ReportPreset`, `maskEuro`, `formatEuro`, `formatSpent` da `src/lib/closeVisit.ts`, `EarningsChart`, `serviceTone`, `Sheet`, `FilterChip`, `Header`.
- Produces: rotta `/incassi/report`. Il bottone Esporta apre uno stato `exportOpen`; il foglio vero arriva nel Task 8. In questo task il bottone c'è e ha nome `Esporta`.

- [ ] **Step 1: Write the failing test**

`src/pages/EarningsReportPage.test.tsx`, ambiente happy-dom, orologio `2026-10-13 15:05`, stesso `seed` degli incassi più `saveClose` con i metodi:

```ts
it('questo mese mostra gli stessi soldi e i pagamenti', async () => {
  const uid = await seedPaid()
  render(<App memory isDev={false} initialPath="/incassi/report" />)
  expect(await screen.findByRole('heading', { name: 'Incassi e report' })).toBeInTheDocument()
  expect(screen.getByText('Ottobre 2026 · fino a oggi')).toBeInTheDocument()
  expect(screen.getByText('POS')).toBeInTheDocument()
  expect(screen.getByText('Contanti')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Esporta' })).toBeInTheDocument()
  expect(getSettings(uid).ui.hideAmounts).toBe(false)
})

it('mese scorso cambia titolo', async () => {
  await seedPaid()
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/incassi/report" />)
  await user.click(await screen.findByRole('button', { name: 'Mese scorso' }))
  expect(screen.getByText('Settembre 2026')).toBeInTheDocument()
})
```

`seedPaid` crea due completati di ottobre, uno `pos` 40 e uno `contanti` 25, con `saveClose(..., { paymentMethod })`, più un disdetto cliente. Usa le funzioni già usate in `EarningsPage.test.tsx`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/EarningsReportPage.test.tsx`
Expected: FAIL perché la rotta non esiste.

- [ ] **Step 3: Write minimal implementation**

In `router.tsx` aggiungi `{ path: '/incassi/report', element: <Guard><EarningsReportPage /></Guard> }` accanto a `/incassi`.

`CumulativeChart({ points, month, hidden })`: SVG largo 100% alto 118, `role="img"`. `aria-label` = `Andamento di ${mese}` e, se `hidden`, `importi nascosti`. Scala `niceScale` del massimo fra i valori non null. Polilinea corrente solo sui punti con `current !== null`. Polilinea precedente tratteggiata `4 3`. `onPointerDown` / `onPointerMove` scelgono il giorno dalla x e mostrano un fumetto con `formatEuro`. Tastiera: il contenitore è focalizzabile e le frecce spostano il giorno.

`EarningsReportPage`:
- stato `preset` iniziale `'mese'`, `chosen` iniziale `null`, `exportOpen` iniziale false
- `reportOf(appointments, dogs, services, preset, new Date(), chosen ?? undefined)`
- header con subtitle `report.titolo` e bottone Esporta che fa `setExportOpen(true)`. Il pannello del Task 8 non c'è ancora: non montare un foglio vuoto. Il bottone basta al test.
- chip nel gruppo `Periodo`
- griglia 2×2 con i quattro numeri. `inAgenda > 0` → `+ ${report.inAgenda} in agenda`
- nota ore: se `minuti % 60 === 0` allora `${ore} ora lavorata` / `ore lavorate`, altrimenti `` `${formatSpent(report.minuti)} lavorati` ``
- riquadri POS e Contanti copiati come struttura da `EarningsPage` (stesse parole, `maskEuro`, `plural`)
- se il preset è `tre_mesi` o `anno`, `EarningsChart` con `report.mesi` oppure il testo vuoto. Altrimenti `CumulativeChart` con `report.punti`
- sezioni servizi, top (`Link` a `/animali/${id}`), mancati. Mancati aprono un `Sheet` con `report.mancati`
- occhio: leggi `settings.ui.hideAmounts`. Non aggiungere un secondo occhio: la pagina Incassi resta il posto dove si cambia. Il report obbedisce al valore.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/EarningsReportPage.test.tsx src/lib/earnings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/EarningsReportPage.tsx src/pages/EarningsReportPage.test.tsx src/components/earnings/CumulativeChart.tsx src/app/router.tsx
git commit -m "feat: pagina Incassi e report"
```

---

### Task 8: Foglio Esporta

**Files:**
- Create: `src/components/earnings/ExportSheet.tsx`
- Create: `src/components/earnings/ExportSheet.test.tsx`
- Modify: `src/pages/EarningsReportPage.tsx`

**Interfaces:**
- Consumes: `exportRange`, `buildExportData`, `toCsv`, `exportFileName`, `toPdf`, `shareFiles`, `writeDocuments`, `downloadAnchor`, `isShareCancel`, `DEFAULT_EXPORT`, `ExportPrefs`.
- Produces: `ExportSheet({ open, onClose, appointments, dogs, services, settings, onRemember })`. `onRemember(prefs: ExportPrefs): void`.

- [ ] **Step 1: Write the failing test**

`ExportSheet.test.tsx`, happy-dom. Render del foglio con due completati di settembre 2026 e `now` congelato al 13 ottobre 2026. Default: il titolo del periodo contiene `Settembre 2026` (mese scorso). Anteprima con l'incassato. Il toggle Mancati è spento.

```ts
it('non spegne insieme riepilogo e dettaglio', async () => {
  const user = userEvent.setup()
  renderSheet()
  await user.click(screen.getByRole('switch', { name: 'Riepilogo' }))
  await user.click(screen.getByRole('switch', { name: 'Dettaglio appuntamenti' }))
  expect(screen.getByRole('switch', { name: 'Dettaglio appuntamenti' })).toBeChecked()
})

it('senza incassi Salva e Invia sono spenti', () => {
  renderSheet([])
  expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Invia al commercialista' })).toBeDisabled()
  expect(screen.getByText('Nessun incasso in questo periodo')).toBeInTheDocument()
})
```

Un terzo test: un `programmato` di agosto con oggi a ottobre è `da_chiudere`. Il foglio sul mese di agosto mostra `1 appuntamenti di agosto non sono chiusi: non saranno nel file`. Il singolare, se count è 1, è `1 appuntamento di agosto non è chiuso: non sarà nel file`. Usa il singolare nel test con un solo appuntamento.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/earnings/ExportSheet.test.tsx`
Expected: FAIL perché il componente non esiste.

- [ ] **Step 3: Write minimal implementation**

Stato iniziale da `settings.exportPrefs ?? DEFAULT_EXPORT`. Mese mostrato: `startOfMonth(addMonths(now, -1))`. Anno mostrato: anno di `now`. Date custom: primo e ultimo giorno del mese scorso.

Cambiare tipo, formato o toggle chiama `onRemember`. Il toggle che spegnerebbe l'ultimo fra riepilogo e dettaglio non chiama nulla.

Anteprima: `buildExportData` sull'intervallo corrente. Giorni = `data.giorni`.

Salva: `toPdf` o `toCsv` (`new Blob([csv], { type: 'text/csv;charset=utf-8' })`). Se `Capacitor.isNativePlatform()` è false, `downloadAnchor`. Se è true, `writeDocuments` e toast `Salvato in Documenti/Groomly`; al catch, `shareFiles(..., 'Incassi Groomly')` e toast `Scegli dove salvarlo`. Invia: sempre `shareFiles` con quel titolo. `isShareCancel` non mostra il toast di errore. Altrimenti `Esportazione non riuscita`.

`EarningsReportPage` monta `ExportSheet` quando il bottone è premuto e `onRemember` fa `save` delle impostazioni con il nuovo `exportPrefs`.

P. IVA vuota e `include.attivita`: testo `Manca la P. IVA`. Non aprire da solo il dialog Attività: la frase basta, Impostazioni è a un indietro.

Intervallo più lungo di 24 mesi: `exportRange(...).clipped` mostra `Massimo 24 mesi` e l'anteprima usa l'intervallo accorciato.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/earnings/ExportSheet.test.tsx src/pages/EarningsReportPage.test.tsx src/pages/priceSheetExport.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/earnings/ExportSheet.tsx src/components/earnings/ExportSheet.test.tsx src/pages/EarningsReportPage.tsx
git commit -m "feat: export PDF e CSV degli incassi per il commercialista"
```

---

### Task 9: Verifica dell'insieme

**Files:** nessuno di nuovo, salvo correzioni emerse dai test.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS. Se fallisce, sistema solo ciò che questo piano ha rotto e rifai il commit di correzione sul task interessato, con messaggio `fix: ...`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS (`tsc --noEmit` incluso).

- [ ] **Step 3: Guardare i due flussi**

Con `npm run dev`, a 360 px, tema chiaro e scuro:

- Impostazioni › Attività › Incassi e report. Badge NUOVO. Sparkline. Tornare il giorno dopo non deve cambiare `reportBadgeSince`.
- Report, Questo mese: incassato, POS e Contanti uguali alla pagina Incassi sullo stesso mese.
- Un completato N/A a 0 conta negli appuntamenti e non alza l'incassato. Un completato vecchio senza metodo sta in Non indicato.
- Esporta il mese scorso in CSV e aprile il file: colonne separate, virgola decimale, niente telefoni di clienti.
- I task non pubblicano. A piano finito, e solo se test e build sono verdi, il coordinatore applica `publish-update`.

## Copertura della spec

| Sezione | Task |
|---|---|
| §1 pagamenti, N/A, Non indicato, niente nota, niente telefono | 1, 3, 4 |
| §3 voce, badge 14 giorni, sparkline, link | 2, 6 |
| §4 pagina, chip, quattro numeri, €/h, linea, barre, servizi, top, mancati | 1, 7 |
| §5 foglio, 24 mesi, toggle, avvisi, scelte ricordate | 2, 8 |
| §6 PDF e CSV | 3, 4 |
| §7 shareFile e Firestore | 2, 5 |
| §8 fuori scope | non c'è un task |
