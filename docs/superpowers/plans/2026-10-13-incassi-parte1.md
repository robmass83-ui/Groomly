# Incassi, Parte 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Home compare il riquadro «Incassi oggi» e una pagina nuova `/incassi` mostra incassato, previsto e persi per giorno, settimana o mese, con un grafico a barre interattivo. Tutto è calcolato dagli appuntamenti che ci sono già.

**Architecture:** Tutta la logica sta in `src/lib/earnings.ts`, pura e testata. `summarize(...)` restituisce un `EarningsSummary` che la pagina e il grafico disegnano senza ricalcolare. Il grafico è fatto con div e CSS. L'unico dato nuovo è `settings.ui.hideAmounts`, nel documento comune del salone.

**Tech Stack:** React 18 + TypeScript, react-router-dom 6, date-fns 4 (locale `it`), lucide-react, Vitest 3 + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-13-incassi-parte1-design.md`
**Fonte di misure e testi:** `docs/incassi/incassi-spec.md` (§0–§13)
**Prototipo:** `docs/incassi/incassi-prototipo.html` (schermate 1A e 1B)

## Global Constraints

- Lingua dell'interfaccia: italiano. Stile del codice come i file intorno: stili inline con `TYPE`, `SIZES` e token CSS, niente commenti superflui.
- Importi con `formatEuro` di `src/lib/format.ts`, che scrive `€ 110` (il simbolo prima). Il prototipo scrive «110 €», ma vale l'app. Con importi nascosti: `•••`.
- Settimana da lunedì (`IT_DATE`).
- Nessun colore scritto a mano nei componenti degli incassi: solo `var(--…)`.
- Nessuna dipendenza nuova.
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto, `npm run build` (fa anche `tsc --noEmit`). Shell PowerShell, cartella `d:\Groomly`.
- `git add` sempre con percorsi espliciti. Non committare `.superpowers/`, `.cursor/rules/rapporto-consumi.mdc`, `android/app/build`, `.env.local`, `groomly.apk`. Non committare `src/app/App.tsx`, `src/app/LoadingSplash.tsx`, `src/app/loadingSplash.css` e `src/assets/brand/groomly-logo-animato*.svg`: sono un altro lavoro in corso.
- I task intermedi fanno solo commit. La pubblicazione (regola `publish-update`) si fa solo nel Task 8.

## Chiusure (la spec si poteva leggere in due modi)

- **Previsto e da chiudere.** Un `programmato` è «da chiudere» solo se è di un giorno **prima di oggi**, con la stessa regola di `isOverdue` usata dalla sezione «Da chiudere» in Home. Un `programmato` di oggi già iniziato resta «previsto», perché la giornata non è chiusa. Con i dati del §11 della fonte i numeri non cambiano.
- **Barre del giorno.** Ci sono solo le ore con almeno un appuntamento incassato o previsto. Persi, esclusi e da chiudere non hanno barra, ma compaiono nell'elenco sotto.
- **Periodo vuoto.** Se nessuna barra ha incassato o previsto, `summarize` restituisce `buckets: []` anche per settimana e mese. Così il grafico mostra lo stato vuoto e non sei barre a zero.
- **Mese che inizia di domenica.** Un pezzo di settimana lungo un giorno ha la label `1` (non `1–1`) e il titolo `1 novembre`.
- **Settimana a cavallo di due mesi.** Il titolo è `28 set – 4 ott`: è l'abbreviazione di date-fns, mentre la fonte scrive «sett».
- **Titolo del giorno.** Oggi è `Oggi · mar 13 ottobre`; gli altri giorni `Mer 14 ottobre`.
- **Elenco del giorno.** Lo stato «da chiudere» si mostra in `--warn`.
- **Confronto.** Le etichette sono quelle della fonte anche per i periodi passati: `vs mar scorso` (domenica: `vs dom scorsa`), `vs sett. scorsa`, `vs settembre`.
- **Riquadro Oggi in Home.** Non si tocca. A 360 px «5 · 3h30» va a capo da solo sullo spazio, quindi il valore sta sopra e la durata sotto, senza rimpicciolire il carattere. Lo si verifica a occhio nel Task 8.
- **Etichette dei pezzi del mese.** Settimana `sett. 1…5`; titolo del fumetto `1 – 4 ottobre`.
- **Accessibilità con importi nascosti.** L'`aria-label` di una barra dice `Martedì 13: importi nascosti`, così uno screen reader non legge le cifre.
- **Animazione.** Le barre crescono con una classe CSS in `src/components/earnings/earningsChart.css`. La pagina dà al grafico una `key` legata al periodo, così l'animazione riparte a ogni cambio.

## File

| File | Responsabilità |
|---|---|
| `src/lib/earnings.ts` (nuovo) | Tipi e calcoli: importo, classificazione, periodi, scala, barre, confronto, riepilogo, elenchi, formati mascherati |
| `src/lib/earnings.test.ts` (nuovo) | Test della logica, con i dati del §11 |
| `src/data/local/settings.ts` | `ui.hideAmounts` in tipo, default e merge |
| `src/lib/firebaseMap.ts` | `ui` in `settingsFromDoc` |
| `src/theme/tokens.css` | Colori di barre, previsto, griglia e fumetto |
| `src/components/earnings/EarningsChart.tsx` (nuovo) | Grafico a barre |
| `src/components/earnings/earningsChart.css` (nuovo) | Animazione di crescita e movimento ridotto |
| `src/components/earnings/EarningsChart.test.tsx` (nuovo) | Test del grafico |
| `src/pages/EarningsPage.tsx` (nuovo) | Pagina `/incassi` |
| `src/pages/EarningsPage.test.tsx` (nuovo) | Test della pagina |
| `src/app/router.tsx` | Rotta `/incassi` |
| `src/components/earnings/EarningsTile.tsx` (nuovo) | Riquadro della Home |
| `src/pages/HomePage.tsx` | Riga a 4 riquadri |
| `src/pages/HomePage.test.tsx` | Test del riquadro |

---

### Task 1: `earnings.ts` — importo, classificazione, periodi, scala e formati

**Files:**
- Create: `src/lib/earnings.ts`
- Create: `src/lib/earnings.test.ts`

**Interfaces:**
- Consumes: `sumPrice`, `startOfLocalDay` da `src/lib/appointments.ts`; `formatEuro`, `IT_DATE` da `src/lib/format.ts`; `Appointment` da `src/types/models.ts`.
- Produces:
  - `type EarningsPeriod = 'giorno' | 'settimana' | 'mese'`
  - `type EarningsClass = 'incassato' | 'previsto' | 'perso' | 'da_chiudere' | 'escluso'`
  - `type PeriodPhase = 'passato' | 'in_corso' | 'futuro'`
  - `appointmentAmount(a: Appointment): number`
  - `classify(a: Appointment, now: Date): EarningsClass`
  - `periodRange(periodo: EarningsPeriod, ref: Date): { from: Date; to: Date }` (`to` escluso)
  - `periodPhase(range: { from: Date; to: Date }, now: Date): PeriodPhase`
  - `shiftRef(periodo: EarningsPeriod, ref: Date, steps: number): Date`
  - `canGoNext(periodo: EarningsPeriod, ref: Date, now: Date): boolean`
  - `parsePeriod(value: string | null): EarningsPeriod`
  - `niceScale(value: number): { step: number; max: number }`
  - `maskEuro(amount: number, hidden: boolean): string`
  - `plainAmount(amount: number): string`

- [ ] **Step 1: Scrivi i test che falliscono**

`src/lib/earnings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus, CancelReason } from '../types/models'
import { appointmentAmount, canGoNext, classify, maskEuro, niceScale, parsePeriod, periodPhase, periodRange, plainAmount, shiftRef } from './earnings'

const NOW = new Date(2026, 9, 13, 15, 5)

let seq = 0
function visit(start: Date, price: number, status: AppointmentStatus = 'programmato', extra: Partial<Appointment> = {}): Appointment {
  seq += 1
  return {
    id: `a${seq}`,
    dogId: 'd1',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status,
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

function cancelled(start: Date, price: number, cancelReason?: CancelReason): Appointment {
  return visit(start, price, 'disdetto', cancelReason ? { cancelReason } : {})
}

describe('earnings base', () => {
  it('il total manuale vince sulla somma dei servizi', () => {
    expect(appointmentAmount(visit(NOW, 30))).toBe(30)
    expect(appointmentAmount(visit(NOW, 30, 'completato', { total: 45 }))).toBe(45)
    expect(appointmentAmount(visit(NOW, 30, 'completato', { total: 0 }))).toBe(0)
  })

  it('classifica secondo stato, motivo e giorno', () => {
    expect(classify(visit(new Date(2026, 9, 13, 9), 55, 'completato'), NOW)).toBe('incassato')
    expect(classify(visit(new Date(2026, 9, 13, 15, 30), 30), NOW)).toBe('previsto')
    expect(classify(visit(new Date(2026, 9, 13, 10), 30), NOW)).toBe('previsto')
    expect(classify(visit(new Date(2026, 9, 12, 10), 30), NOW)).toBe('da_chiudere')
    expect(classify(visit(new Date(2026, 9, 12, 10), 30, 'non_venuto'), NOW)).toBe('perso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'cliente'), NOW)).toBe('perso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'salone'), NOW)).toBe('escluso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'deceduto'), NOW)).toBe('escluso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35), NOW)).toBe('escluso')
  })

  it('periodRange: giorno, settimana da lunedì, mese; to escluso', () => {
    expect(periodRange('giorno', NOW)).toEqual({ from: new Date(2026, 9, 13), to: new Date(2026, 9, 14) })
    expect(periodRange('settimana', NOW)).toEqual({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 19) })
    expect(periodRange('mese', NOW)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })
    expect(periodRange('settimana', new Date(2026, 8, 30))).toEqual({ from: new Date(2026, 8, 28), to: new Date(2026, 9, 5) })
  })

  it('periodPhase distingue passato, in corso e futuro', () => {
    expect(periodPhase(periodRange('settimana', NOW), NOW)).toBe('in_corso')
    expect(periodPhase(periodRange('settimana', new Date(2026, 9, 5)), NOW)).toBe('passato')
    expect(periodPhase(periodRange('giorno', new Date(2026, 9, 14)), NOW)).toBe('futuro')
  })

  it('shiftRef sposta di un giorno, una settimana, un mese', () => {
    expect(shiftRef('giorno', NOW, 1)).toEqual(new Date(2026, 9, 14))
    expect(shiftRef('settimana', NOW, -1)).toEqual(new Date(2026, 9, 6))
    expect(shiftRef('mese', NOW, 1)).toEqual(new Date(2026, 10, 13))
  })

  it('canGoNext si ferma oltre 4 settimane da oggi', () => {
    expect(canGoNext('settimana', new Date(2026, 10, 2), NOW)).toBe(true)
    expect(canGoNext('settimana', new Date(2026, 10, 9), NOW)).toBe(false)
    expect(canGoNext('mese', NOW, NOW)).toBe(true)
    expect(canGoNext('mese', new Date(2026, 10, 1), NOW)).toBe(false)
    expect(canGoNext('giorno', new Date(2026, 10, 9), NOW)).toBe(true)
    expect(canGoNext('giorno', new Date(2026, 10, 10), NOW)).toBe(false)
  })

  it('parsePeriod accetta i tre periodi e altrimenti dà settimana', () => {
    expect(parsePeriod('giorno')).toBe('giorno')
    expect(parsePeriod('mese')).toBe('mese')
    expect(parsePeriod('settimana')).toBe('settimana')
    expect(parsePeriod(null)).toBe('settimana')
    expect(parsePeriod('anno')).toBe('settimana')
  })

  it('niceScale sceglie un passo con al massimo 4 righe', () => {
    expect(niceScale(175)).toEqual({ step: 50, max: 200 })
    expect(niceScale(60)).toEqual({ step: 25, max: 75 })
    expect(niceScale(845)).toEqual({ step: 250, max: 1000 })
    expect(niceScale(100)).toEqual({ step: 25, max: 100 })
    expect(niceScale(0)).toEqual({ step: 25, max: 100 })
    expect(niceScale(30000)).toEqual({ step: 10000, max: 30000 })
  })

  it('maskEuro nasconde e plainAmount scrive il numero senza simbolo', () => {
    expect(maskEuro(110, false)).toBe('€ 110')
    expect(maskEuro(110, true)).toBe('•••')
    expect(plainAmount(145)).toBe('145')
    expect(plainAmount(37.5)).toBe('38')
  })
})
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: FAIL, `Failed to resolve import "./earnings"`.

- [ ] **Step 3: Scrivi il codice minimo**

`src/lib/earnings.ts`:

```ts
import { addDays, addMonths, addWeeks, startOfMonth, startOfWeek } from 'date-fns'
import type { Appointment } from '../types/models'
import { startOfLocalDay, sumPrice } from './appointments'
import { formatEuro, IT_DATE } from './format'

export type EarningsPeriod = 'giorno' | 'settimana' | 'mese'
export type EarningsClass = 'incassato' | 'previsto' | 'perso' | 'da_chiudere' | 'escluso'
export type PeriodPhase = 'passato' | 'in_corso' | 'futuro'

const STEPS = [25, 50, 100, 200, 250, 500, 1000, 2000]

export function appointmentAmount(a: Appointment): number {
  return a.total ?? sumPrice(a.services)
}

export function classify(a: Appointment, now: Date): EarningsClass {
  if (a.status === 'completato') return 'incassato'
  if (a.status === 'non_venuto') return 'perso'
  if (a.status === 'disdetto') return a.cancelReason === 'cliente' ? 'perso' : 'escluso'
  return startOfLocalDay(a.start).getTime() < startOfLocalDay(now).getTime() ? 'da_chiudere' : 'previsto'
}

export function periodRange(periodo: EarningsPeriod, ref: Date): { from: Date; to: Date } {
  if (periodo === 'giorno') {
    const from = startOfLocalDay(ref)
    return { from, to: addDays(from, 1) }
  }
  if (periodo === 'settimana') {
    const from = startOfWeek(ref, IT_DATE)
    return { from, to: addDays(from, 7) }
  }
  const from = startOfMonth(ref)
  return { from, to: addMonths(from, 1) }
}

export function periodPhase(range: { from: Date; to: Date }, now: Date): PeriodPhase {
  if (now.getTime() >= range.to.getTime()) return 'passato'
  if (now.getTime() < range.from.getTime()) return 'futuro'
  return 'in_corso'
}

export function shiftRef(periodo: EarningsPeriod, ref: Date, steps: number): Date {
  const day = startOfLocalDay(ref)
  if (periodo === 'giorno') return addDays(day, steps)
  if (periodo === 'settimana') return addWeeks(day, steps)
  return addMonths(day, steps)
}

export function canGoNext(periodo: EarningsPeriod, ref: Date, now: Date): boolean {
  const next = periodRange(periodo, shiftRef(periodo, ref, 1)).from
  return next.getTime() <= addWeeks(startOfLocalDay(now), 4).getTime()
}

export function parsePeriod(value: string | null): EarningsPeriod {
  return value === 'giorno' || value === 'mese' ? value : 'settimana'
}

export function niceScale(value: number): { step: number; max: number } {
  if (value <= 0) return { step: 25, max: 100 }
  let step = STEPS.find((item) => Math.ceil(value / item) <= 4)
  if (step === undefined) {
    step = 5000
    while (Math.ceil(value / step) > 4) step *= 2
  }
  return { step, max: Math.ceil(value / step) * step }
}

export function maskEuro(amount: number, hidden: boolean): string {
  return hidden ? '•••' : formatEuro(amount)
}

export function plainAmount(amount: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(amount)
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: PASS, 9 test.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts
git commit -m "feat: base dei calcoli incassi (importo, stati, periodi, scala)"
```

---

### Task 2: `earnings.ts` — barre, titolo del periodo e confronto

**Files:**
- Modify: `src/lib/earnings.ts`
- Modify: `src/lib/earnings.test.ts`

**Interfaces:**
- Consumes: tutto il Task 1; `localDayKey` da `src/lib/appointments.ts`; `Dog` da `src/types/models.ts`.
- Produces:
  - `interface EarningsBucket { key: string; label: string; sublabel: string; title: string; incassato: number; previsto: number; isToday: boolean }`
  - `buckets(appointments: Appointment[], dogs: Dog[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsBucket[]`
  - `hourKey(day: Date, hour: number): string` (es. `'2026-10-13T09'`)
  - `periodTitle(periodo: EarningsPeriod, ref: Date, now: Date): string`
  - `compare(appointments: Appointment[], periodo: EarningsPeriod, ref: Date, now: Date): { delta: number | null; etichetta: string }`

- [ ] **Step 1: Aggiungi ai test i dati del §11 e i test che falliscono**

In cima a `src/lib/earnings.test.ts`, aggiungi `Dog` all'import dei tipi e importa le nuove funzioni:

```ts
import type { Appointment, AppointmentStatus, CancelReason, Dog } from '../types/models'
import { appointmentAmount, buckets, canGoNext, classify, compare, maskEuro, niceScale, parsePeriod, periodPhase, periodRange, periodTitle, plainAmount, shiftRef } from './earnings'
```

Sotto la funzione `cancelled`, aggiungi il seed condiviso (serve anche al Task 3):

```ts
function named(id: string, name: string): Dog {
  return { id, name } as Dog
}

const DOGS: Dog[] = ['Zeus', 'Micio', 'Iris', 'Luna', 'Otto', 'Fido', 'Rex', 'Bea', 'Ciro', 'Ada'].map((name) => named(name.toLowerCase(), name))

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 9, day, hour, minute)
}

function line(serviceId: string, name: string, price: number) {
  return { serviceId, name, durationMin: 30, price }
}

function seed(): Appointment[] {
  const of = (dogId: string, start: Date, price: number, status: AppointmentStatus = 'programmato', name = 'Bagno', serviceId = 'bagno') =>
    visit(start, price, status, { dogId, services: [line(serviceId, name, price)] })
  return [
    of('rex', at(12, 9), 40, 'completato'),
    of('bea', at(12, 10), 35, 'completato'),
    of('ciro', at(12, 11), 45, 'completato'),
    of('ada', at(12, 14), 25, 'completato'),
    of('zeus', at(13, 9), 55, 'completato', 'Bagno + taglio', 'bagno_taglio'),
    of('micio', at(13, 11, 30), 25, 'completato'),
    of('iris', at(13, 12, 15), 30, 'completato'),
    of('luna', at(13, 15, 30), 30),
    of('otto', at(13, 17), 35, 'programmato', 'Taglio', 'taglio'),
    of('rex', at(14, 9), 30),
    of('bea', at(14, 10), 30),
    of('ciro', at(14, 11), 30),
    of('ada', at(14, 14), 35),
    of('zeus', at(14, 16), 35),
    of('micio', at(15, 9), 30),
    of('iris', at(15, 10), 30),
    of('luna', at(15, 14), 30),
    { ...cancelled(at(15, 11), 35, 'cliente'), dogId: 'fido' },
    of('otto', at(16, 9), 30),
    of('rex', at(16, 10), 30),
    of('bea', at(16, 11), 30),
    of('ciro', at(16, 14), 30),
  ]
}
```

In fondo al file, aggiungi:

```ts
describe('earnings barre e confronto', () => {
  it('giorno: una barra per ora con appuntamenti, in ordine', () => {
    const list = buckets(seed(), DOGS, 'giorno', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['9', '11', '12', '15', '17'])
    expect(list[0]).toMatchObject({ key: '2026-10-13T09', title: 'Ore 9 · Zeus', incassato: 55, previsto: 0, isToday: false })
    expect(list[3]).toMatchObject({ incassato: 0, previsto: 30 })
  })

  it('giorno: più cani nella stessa ora', () => {
    const items = [visit(at(13, 9), 20, 'completato', { dogId: 'zeus' }), visit(at(13, 9, 30), 20, 'completato', { dogId: 'luna' })]
    expect(buckets(items, DOGS, 'giorno', NOW, NOW)[0].title).toBe('Ore 9 · 2 appuntamenti')
  })

  it('settimana: Lun–Sab sempre, oggi evidenziato, previsto impilato', () => {
    const list = buckets(seed(), DOGS, 'settimana', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'])
    expect(list.map((b) => b.sublabel)).toEqual(['12', '13', '14', '15', '16', '17'])
    expect(list[1]).toMatchObject({ key: '2026-10-13', title: 'Martedì 13 · oggi', incassato: 110, previsto: 65, isToday: true })
    expect(list[2]).toMatchObject({ title: 'Mercoledì 14', incassato: 0, previsto: 160 })
    expect(list[3]).toMatchObject({ previsto: 90 })
  })

  it('settimana: la domenica compare solo se ha appuntamenti', () => {
    const list = buckets([...seed(), visit(at(18, 10), 20)], DOGS, 'settimana', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'])
  })

  it('mese: settimane tagliate ai confini del mese', () => {
    const list = buckets(seed(), DOGS, 'mese', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['1–4', '5–11', '12–18', '19–25', '26–31'])
    expect(list.map((b) => b.sublabel)).toEqual(['sett. 1', 'sett. 2', 'sett. 3', 'sett. 4', 'sett. 5'])
    expect(list[2]).toMatchObject({ key: '2026-10-12_2026-10-18', title: '12 – 18 ottobre', incassato: 255, previsto: 435, isToday: true })
  })

  it('mese che inizia di domenica: il primo pezzo è un giorno solo', () => {
    const list = buckets([], DOGS, 'mese', new Date(2026, 10, 10), NOW)
    expect(list.map((b) => b.label)).toEqual(['1', '2–8', '9–15', '16–22', '23–29', '30'])
    expect(list[0].title).toBe('1 novembre')
  })

  it('periodTitle per giorno, settimana, settimana a cavallo e mese', () => {
    expect(periodTitle('giorno', NOW, NOW)).toBe('Oggi · mar 13 ottobre')
    expect(periodTitle('giorno', at(14, 0), NOW)).toBe('Mer 14 ottobre')
    expect(periodTitle('settimana', NOW, NOW)).toBe('12 – 18 ottobre')
    expect(periodTitle('settimana', new Date(2026, 8, 30), NOW)).toBe('28 set – 4 ott')
    expect(periodTitle('mese', NOW, NOW)).toBe('Ottobre 2026')
  })

  it('compare: a parità di avanzamento nel periodo in corso', () => {
    const items = [
      visit(at(5, 10), 100, 'completato'),
      visit(at(6, 9), 40, 'completato'),
      visit(at(6, 16), 100, 'completato'),
      visit(at(12, 10), 60, 'completato'),
      visit(at(13, 9), 60, 'completato'),
    ]
    expect(compare(items, 'giorno', NOW, NOW)).toEqual({ delta: 50, etichetta: 'vs mar scorso' })
    expect(compare(items, 'settimana', NOW, NOW)).toEqual({ delta: -14, etichetta: 'vs sett. scorsa' })
  })

  it('compare: periodo passato contro il precedente intero; precedente a zero = null', () => {
    const items = [
      visit(new Date(2026, 8, 29, 10), 70, 'completato'),
      visit(at(5, 10), 100, 'completato'),
      visit(at(6, 9), 40, 'completato'),
      visit(at(6, 16), 100, 'completato'),
    ]
    expect(compare(items, 'settimana', at(5, 0), NOW)).toEqual({ delta: 243, etichetta: 'vs sett. scorsa' })
    expect(compare(items, 'settimana', new Date(2026, 8, 29), NOW).delta).toBeNull()
    expect(compare(items, 'mese', NOW, NOW).etichetta).toBe('vs settembre')
    expect(compare(items, 'giorno', at(14, 0), NOW).delta).toBeNull()
  })

  it('compare: la domenica è «scorsa»', () => {
    expect(compare([], 'giorno', at(18, 0), NOW).etichetta).toBe('vs dom scorsa')
  })
})
```

Conti del confronto in corso:
- Giorno: martedì 13 vale 60. Martedì 6 fino alle 15:05 vale 40 (quello delle 16 non conta). (60−40)/40 = +50 %.
- Settimana: questa vale 60+60 = 120. Quella prima, fino a martedì 6 alle 15:05, vale 100+40 = 140. (120−140)/140 = −14 %.

Conti del confronto passato:
- La settimana del 5 vale 240, quella prima 70. (240−70)/70 = 243 %.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: FAIL, `buckets is not a function` (o export mancante).

- [ ] **Step 3: Scrivi il codice**

In `src/lib/earnings.ts`:
- l'import di date-fns diventa `import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'`;
- l'import dei tipi diventa `import type { Appointment, Dog } from '../types/models'`;
- l'import da `./appointments` diventa `import { localDayKey, startOfLocalDay, sumPrice } from './appointments'`.

Poi aggiungi in fondo:

```ts
export interface EarningsBucket {
  key: string
  label: string
  sublabel: string
  title: string
  incassato: number
  previsto: number
  isToday: boolean
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1)
}

function shortMonth(date: Date): string {
  return format(date, 'MMM', IT_DATE).replace(/\.$/, '')
}

function inRange(a: Appointment, from: Date, to: Date): boolean {
  const time = a.start.getTime()
  return time >= from.getTime() && time < to.getTime()
}

function total(items: Appointment[]): number {
  return round2(items.reduce((sum, item) => sum + appointmentAmount(item), 0))
}

function sums(items: Appointment[], now: Date): { incassato: number; previsto: number } {
  return {
    incassato: total(items.filter((item) => classify(item, now) === 'incassato')),
    previsto: total(items.filter((item) => classify(item, now) === 'previsto')),
  }
}

export function dogName(dogs: Dog[], dogId: string): string {
  return dogs.find((dog) => dog.id === dogId)?.name ?? 'Cane'
}

export function hourKey(day: Date, hour: number): string {
  return `${localDayKey(day)}T${String(hour).padStart(2, '0')}`
}

export function buckets(appointments: Appointment[], dogs: Dog[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsBucket[] {
  const { from, to } = periodRange(periodo, ref)
  const counted = appointments
    .filter((item) => inRange(item, from, to))
    .filter((item) => {
      const kind = classify(item, now)
      return kind === 'incassato' || kind === 'previsto'
    })
  if (periodo === 'giorno') {
    const hours = [...new Set(counted.map((item) => item.start.getHours()))].sort((a, b) => a - b)
    return hours.map((hour) => {
      const items = counted.filter((item) => item.start.getHours() === hour)
      const who = items.length === 1 ? dogName(dogs, items[0].dogId) : `${items.length} appuntamenti`
      return { key: hourKey(from, hour), label: String(hour), sublabel: '', title: `Ore ${hour} · ${who}`, ...sums(items, now), isToday: false }
    })
  }
  if (periodo === 'settimana') {
    const days = Array.from({ length: 7 }, (_, index) => addDays(from, index))
    return days
      .filter((day, index) => index < 6 || counted.some((item) => localDayKey(item.start) === localDayKey(day)))
      .map((day) => {
        const items = counted.filter((item) => localDayKey(item.start) === localDayKey(day))
        const today = localDayKey(day) === localDayKey(now)
        return {
          key: localDayKey(day),
          label: capitalize(format(day, 'EEE', IT_DATE)),
          sublabel: String(day.getDate()),
          title: `${capitalize(format(day, 'EEEE d', IT_DATE))}${today ? ' · oggi' : ''}`,
          ...sums(items, now),
          isToday: today,
        }
      })
  }
  const weeks: EarningsBucket[] = []
  let start = from
  let index = 1
  while (start.getTime() < to.getTime()) {
    const monday = startOfWeek(addDays(start, 7), IT_DATE)
    const end = monday.getTime() < to.getTime() ? monday : to
    const last = addDays(end, -1)
    const single = start.getDate() === last.getDate()
    const items = counted.filter((item) => inRange(item, start, end))
    weeks.push({
      key: `${localDayKey(start)}_${localDayKey(last)}`,
      label: single ? String(start.getDate()) : `${start.getDate()}–${last.getDate()}`,
      sublabel: `sett. ${index}`,
      title: single ? `${start.getDate()} ${format(last, 'MMMM', IT_DATE)}` : `${start.getDate()} – ${last.getDate()} ${format(last, 'MMMM', IT_DATE)}`,
      ...sums(items, now),
      isToday: now.getTime() >= start.getTime() && now.getTime() < end.getTime(),
    })
    start = end
    index += 1
  }
  return weeks
}

export function periodTitle(periodo: EarningsPeriod, ref: Date, now: Date): string {
  const { from, to } = periodRange(periodo, ref)
  if (periodo === 'giorno') {
    const text = format(from, 'EEE d MMMM', IT_DATE)
    return localDayKey(from) === localDayKey(now) ? `Oggi · ${text}` : capitalize(text)
  }
  if (periodo === 'settimana') {
    const last = addDays(to, -1)
    if (from.getMonth() === last.getMonth()) return `${from.getDate()} – ${last.getDate()} ${format(last, 'MMMM', IT_DATE)}`
    return `${from.getDate()} ${shortMonth(from)} – ${last.getDate()} ${shortMonth(last)}`
  }
  return capitalize(format(from, 'MMMM yyyy', IT_DATE))
}

function previousRef(periodo: EarningsPeriod, from: Date): Date {
  return periodo === 'mese' ? addMonths(from, -1) : addWeeks(from, -1)
}

function compareLabel(periodo: EarningsPeriod, previousFrom: Date): string {
  if (periodo === 'giorno') return `vs ${format(previousFrom, 'EEE', IT_DATE)} ${previousFrom.getDay() === 0 ? 'scorsa' : 'scorso'}`
  if (periodo === 'settimana') return 'vs sett. scorsa'
  return `vs ${format(previousFrom, 'MMMM', IT_DATE)}`
}

export function compare(appointments: Appointment[], periodo: EarningsPeriod, ref: Date, now: Date): { delta: number | null; etichetta: string } {
  const current = periodRange(periodo, ref)
  const previous = periodRange(periodo, previousRef(periodo, current.from))
  const etichetta = compareLabel(periodo, previous.from)
  const phase = periodPhase(current, now)
  if (phase === 'futuro') return { delta: null, etichetta }
  let cutoff = previous.to
  if (phase === 'in_corso') {
    const shifted = previousRef(periodo, now)
    const clamped = periodo === 'mese' && shifted.getDate() !== now.getDate()
    if (!clamped && shifted.getTime() < previous.to.getTime()) cutoff = shifted
  }
  const earned = (from: Date, to: Date) => total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
  const before = earned(previous.from, cutoff)
  if (before === 0) return { delta: null, etichetta }
  return { delta: Math.round(((earned(current.from, current.to) - before) / before) * 100), etichetta }
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: PASS, tutti i test del file.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts
git commit -m "feat: barre, titolo e confronto degli incassi"
```

---

### Task 3: `earnings.ts` — riepilogo, elenchi, persi, selezione e incasso di oggi

**Files:**
- Modify: `src/lib/earnings.ts`
- Modify: `src/lib/earnings.test.ts`

**Interfaces:**
- Consumes: Task 1 e 2; `Service`, `ServiceIconKey` da `src/types/models.ts`.
- Produces:
  - `type RowState = 'completato' | 'previsto' | 'non venuto' | 'disdetto' | 'da chiudere'`
  - `type EarningsRow`:
    - `{ kind: 'appuntamento'; key: string; bucketKey: string; appointmentId: string; time: string; dogName: string; services: string; state: RowState; amount: number }`
    - `{ kind: 'giorno'; key: string; bucketKey: string; day: string; title: string; detail: string; amount: number; muted: boolean }`
    - `{ kind: 'servizio'; key: string; name: string; iconKey?: ServiceIconKey; count: number; amount: number }`
  - `interface LostRow { key: string; appointmentId: string; dogName: string; when: string; reason: 'non venuto' | 'disdetto dal cliente'; amount: number }`
  - `interface Money { incassato: number; previsto: number; persi: number }`
  - `interface EarningsSummary`:
    - `periodo`, `from`, `to`, `phase: PeriodPhase`, `titolo`, `totali: Money`
    - `completati`, `totaliAppuntamenti`, `mediaACane: number | null`
    - `daChiudere: { count: number; importo: number }`
    - `confronto: { delta: number | null; etichetta: string }`
    - `buckets: EarningsBucket[]`, `mediaBarre: number | null`, `scala: { step: number; max: number }`
    - `elenco: { titolo: string; righe: EarningsRow[] }`
    - `persi: LostRow[]`
    - `selezione: string | null`
  - `summarize(appointments: Appointment[], dogs: Dog[], services: Service[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsSummary`
  - `earnedOn(appointments: Appointment[], day: Date, now: Date): number`

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiorna gli import di `src/lib/earnings.test.ts`:

```ts
import type { Appointment, AppointmentStatus, CancelReason, Dog, Service } from '../types/models'
import { appointmentAmount, buckets, canGoNext, classify, compare, earnedOn, maskEuro, niceScale, parsePeriod, periodPhase, periodRange, periodTitle, plainAmount, shiftRef, summarize } from './earnings'
```

In fondo al file aggiungi:

```ts
function service(id: string, name: string, kind: 'principale' | 'extra', iconKey?: Service['iconKey']): Service {
  return { id, name, kind, iconKey, durationMin: { piccola: 30, media: 30, grande: 30 }, price: { piccola: 0, media: 0, grande: 0 }, order: 0, active: true, createdAt: NOW, updatedAt: NOW }
}

const SERVICES: Service[] = [
  service('bagno', 'Bagno', 'principale', 'bagno'),
  service('bagno_taglio', 'Bagno + taglio', 'principale', 'bagno_taglio'),
  service('taglio', 'Taglio', 'principale', 'taglio'),
  service('unghie', 'Unghie', 'extra'),
]

describe('earnings riepilogo', () => {
  it('giorno 13: i numeri del §11', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.titolo).toBe('Oggi · mar 13 ottobre')
    expect(s.phase).toBe('in_corso')
    expect(s.totali).toEqual({ incassato: 110, previsto: 65, persi: 0 })
    expect([s.completati, s.totaliAppuntamenti, s.mediaACane, s.mediaBarre]).toEqual([3, 5, 37, 37])
    expect(s.scala).toEqual({ step: 25, max: 75 })
    expect(s.selezione).toBe('2026-10-13T12')
    expect(s.elenco.titolo).toBe('Appuntamenti di oggi')
    expect(s.elenco.righe).toHaveLength(5)
    expect(s.elenco.righe[0]).toMatchObject({ kind: 'appuntamento', time: '09:00', dogName: 'Zeus', services: 'Bagno + taglio', state: 'completato', amount: 55, bucketKey: '2026-10-13T09' })
    expect(s.elenco.righe[4]).toMatchObject({ dogName: 'Otto', state: 'previsto', amount: 35 })
  })

  it('settimana 12–18: i numeri del §11', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'settimana', NOW, NOW)
    expect(s.titolo).toBe('12 – 18 ottobre')
    expect(s.totali).toEqual({ incassato: 255, previsto: 435, persi: 35 })
    expect([s.completati, s.totaliAppuntamenti, s.mediaACane, s.mediaBarre]).toEqual([7, 21, 36, 128])
    expect(s.scala).toEqual({ step: 50, max: 200 })
    expect(s.selezione).toBe('2026-10-13')
    expect(s.elenco.titolo).toBe('Per giorno')
    expect(s.elenco.righe.map((r) => (r.kind === 'giorno' ? [r.title, r.detail, r.amount, r.muted] : null))).toEqual([
      ['Lunedì 12', '4 completati', 145, false],
      ['Martedì 13', '3 completati · 2 previsti', 110, false],
      ['Mercoledì 14', '5 previsti', 160, true],
      ['Giovedì 15', '3 previsti', 90, true],
      ['Venerdì 16', '4 previsti', 120, true],
    ])
    expect(s.persi).toEqual([expect.objectContaining({ dogName: 'Fido', when: 'gio 15 ott', reason: 'disdetto dal cliente', amount: 35 })])
  })

  it('mese: per servizio con ripartizione proporzionale ed Extra', () => {
    const extra = [
      visit(at(2, 10), 50, 'completato', { dogId: 'rex' }),
      visit(at(6, 10), 30, 'completato', { dogId: 'bea', total: 50, services: [line('bagno', 'Bagno', 30), line('unghie', 'Unghie', 10)] }),
      visit(at(20, 10), 40),
    ]
    const s = summarize([...seed(), ...extra], DOGS, SERVICES, 'mese', NOW, NOW)
    expect(s.titolo).toBe('Ottobre 2026')
    expect(s.totali).toEqual({ incassato: 355, previsto: 475, persi: 35 })
    expect(s.buckets.map((b) => b.incassato)).toEqual([50, 50, 255, 0, 0])
    expect(s.selezione).toBe('2026-10-12_2026-10-18')
    expect(s.elenco.titolo).toBe('Per servizio')
    expect(s.elenco.righe).toEqual([
      { kind: 'servizio', key: 'bagno', name: 'Bagno', iconKey: 'bagno', count: 8, amount: 287.5 },
      { kind: 'servizio', key: 'bagno_taglio', name: 'Bagno + taglio', iconKey: 'bagno_taglio', count: 1, amount: 55 },
      { kind: 'servizio', key: 'extra', name: 'Extra', iconKey: undefined, count: 1, amount: 12.5 },
    ])
  })

  it('un programmato di ieri va in daChiudere e non in previsto', () => {
    const s = summarize([visit(at(12, 10), 30)], DOGS, SERVICES, 'settimana', NOW, NOW)
    expect(s.daChiudere).toEqual({ count: 1, importo: 30 })
    expect(s.totali.previsto).toBe(0)
  })

  it('il disdetto dal salone non entra nei persi né nell’elenco', () => {
    const s = summarize([cancelled(at(13, 10), 35, 'salone')], DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.totali.persi).toBe(0)
    expect(s.elenco.righe).toEqual([])
  })

  it('periodo vuoto: niente barre, media e selezione', () => {
    const s = summarize([], DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.buckets).toEqual([])
    expect([s.mediaACane, s.mediaBarre, s.selezione]).toEqual([null, null, null])
    expect(s.scala).toEqual({ step: 25, max: 100 })
    expect(summarize([], DOGS, SERVICES, 'settimana', NOW, NOW).buckets).toEqual([])
    expect(summarize([cancelled(at(13, 10), 35, 'cliente')], DOGS, SERVICES, 'mese', NOW, NOW).buckets).toEqual([])
  })

  it('periodo passato: seleziona la barra con più incasso', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'giorno', at(12, 0), NOW)
    expect(s.phase).toBe('passato')
    expect(s.selezione).toBe('2026-10-12T11')
  })

  it('earnedOn somma solo i completati di quel giorno', () => {
    expect(earnedOn(seed(), NOW, NOW)).toBe(110)
    expect(earnedOn(seed(), at(14, 0), NOW)).toBe(0)
  })
})
```

Conti del mese:
- Incassato: 255 + 50 + 50 = 355.
- Previsto: 435 + 40 = 475.
- Bagno: 145 (lunedì) + 25 + 30 + 50 + 37,5 = 287,5. Quell'appuntamento ha un totale manuale di 50 su servizi da 30 + 10, quindi il Bagno vale 50 × 30/40 = 37,5. Le volte sono 4 + 1 + 1 + 1 + 1 = 8.
- Extra: 12,5.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: FAIL, `summarize is not a function`.

- [ ] **Step 3: Scrivi il codice**

In `src/lib/earnings.ts` l'import dei tipi diventa:

```ts
import type { Appointment, Dog, Service, ServiceIconKey } from '../types/models'
```

Aggiungi in fondo:

```ts
export interface Money {
  incassato: number
  previsto: number
  persi: number
}

export type RowState = 'completato' | 'previsto' | 'non venuto' | 'disdetto' | 'da chiudere'

export type EarningsRow =
  | { kind: 'appuntamento'; key: string; bucketKey: string; appointmentId: string; time: string; dogName: string; services: string; state: RowState; amount: number }
  | { kind: 'giorno'; key: string; bucketKey: string; day: string; title: string; detail: string; amount: number; muted: boolean }
  | { kind: 'servizio'; key: string; name: string; iconKey?: ServiceIconKey; count: number; amount: number }

export interface LostRow {
  key: string
  appointmentId: string
  dogName: string
  when: string
  reason: 'non venuto' | 'disdetto dal cliente'
  amount: number
}

export interface EarningsSummary {
  periodo: EarningsPeriod
  from: Date
  to: Date
  phase: PeriodPhase
  titolo: string
  totali: Money
  completati: number
  totaliAppuntamenti: number
  mediaACane: number | null
  daChiudere: { count: number; importo: number }
  confronto: { delta: number | null; etichetta: string }
  buckets: EarningsBucket[]
  mediaBarre: number | null
  scala: { step: number; max: number }
  elenco: { titolo: string; righe: EarningsRow[] }
  persi: LostRow[]
  selezione: string | null
}

function byStart(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
}

function rowState(a: Appointment, now: Date): RowState {
  const kind = classify(a, now)
  if (kind === 'incassato') return 'completato'
  if (kind === 'previsto') return 'previsto'
  if (kind === 'da_chiudere') return 'da chiudere'
  return a.status === 'non_venuto' ? 'non venuto' : 'disdetto'
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function appointmentRows(items: Appointment[], dogs: Dog[], now: Date): EarningsRow[] {
  return items
    .filter((item) => classify(item, now) !== 'escluso')
    .sort(byStart)
    .map((item) => ({
      kind: 'appuntamento',
      key: item.id,
      bucketKey: hourKey(item.start, item.start.getHours()),
      appointmentId: item.id,
      time: format(item.start, 'HH:mm'),
      dogName: dogName(dogs, item.dogId),
      services: item.services.map((line) => line.name).join(', '),
      state: rowState(item, now),
      amount: appointmentAmount(item),
    }))
}

function dayRows(items: Appointment[], from: Date, now: Date): EarningsRow[] {
  return Array.from({ length: 7 }, (_, index) => addDays(from, index)).flatMap((day): EarningsRow[] => {
    const key = localDayKey(day)
    const own = items.filter((item) => localDayKey(item.start) === key)
    const done = own.filter((item) => classify(item, now) === 'incassato')
    const coming = own.filter((item) => classify(item, now) === 'previsto')
    if (done.length === 0 && coming.length === 0) return []
    const detail = [
      done.length > 0 ? plural(done.length, 'completato', 'completati') : '',
      coming.length > 0 ? plural(coming.length, 'previsto', 'previsti') : '',
    ].filter(Boolean).join(' · ')
    const earned = total(done)
    return [{
      kind: 'giorno',
      key,
      bucketKey: key,
      day: key,
      title: capitalize(format(day, 'EEEE d', IT_DATE)),
      detail,
      amount: earned > 0 ? earned : total(coming),
      muted: earned === 0,
    }]
  })
}

function serviceRows(items: Appointment[], services: Service[]): EarningsRow[] {
  const groups = new Map<string, { name: string; iconKey?: ServiceIconKey; count: number; amount: number }>()
  for (const item of items) {
    const amount = appointmentAmount(item)
    const listed = sumPrice(item.services)
    for (const line of item.services) {
      const share = listed > 0 ? (amount * line.price) / listed : amount / item.services.length
      const catalog = services.find((entry) => entry.id === line.serviceId)
      const extra = catalog?.kind === 'extra'
      const key = extra ? 'extra' : line.serviceId
      const group = groups.get(key) ?? { name: extra ? 'Extra' : line.name, iconKey: extra ? undefined : catalog?.iconKey, count: 0, amount: 0 }
      group.count += 1
      group.amount += share
      groups.set(key, group)
    }
  }
  return [...groups.entries()]
    .map(([key, group]): EarningsRow => ({ kind: 'servizio', key, name: group.name, iconKey: group.iconKey, count: group.count, amount: round2(group.amount) }))
    .sort((a, b) => b.amount - a.amount || (a.kind === 'servizio' && b.kind === 'servizio' ? a.name.localeCompare(b.name, 'it') : 0))
}

function lostRows(items: Appointment[], dogs: Dog[]): LostRow[] {
  return [...items].sort(byStart).map((item) => ({
    key: item.id,
    appointmentId: item.id,
    dogName: dogName(dogs, item.dogId),
    when: `${format(item.start, 'EEE d', IT_DATE)} ${shortMonth(item.start)}`,
    reason: item.status === 'non_venuto' ? 'non venuto' : 'disdetto dal cliente',
    amount: appointmentAmount(item),
  }))
}

function defaultSelection(periodo: EarningsPeriod, phase: PeriodPhase, list: EarningsBucket[]): string | null {
  if (list.length === 0) return null
  if (phase === 'in_corso') {
    if (periodo === 'giorno') return [...list].reverse().find((item) => item.incassato > 0)?.key ?? list[0].key
    return list.find((item) => item.isToday)?.key ?? list[0].key
  }
  if (phase === 'passato') return list.reduce((best, item) => (item.incassato > best.incassato ? item : best), list[0]).key
  return list[0].key
}

function listTitle(periodo: EarningsPeriod, from: Date, now: Date): string {
  if (periodo === 'settimana') return 'Per giorno'
  if (periodo === 'mese') return 'Per servizio'
  return localDayKey(from) === localDayKey(now) ? 'Appuntamenti di oggi' : `Appuntamenti di ${format(from, 'EEE d', IT_DATE)}`
}

export function summarize(appointments: Appointment[], dogs: Dog[], services: Service[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsSummary {
  const range = periodRange(periodo, ref)
  const phase = periodPhase(range, now)
  const inside = appointments.filter((item) => inRange(item, range.from, range.to))
  const of = (kind: EarningsClass) => inside.filter((item) => classify(item, now) === kind)
  const done = of('incassato')
  const coming = of('previsto')
  const lost = of('perso')
  const open = of('da_chiudere')
  const drawn = buckets(appointments, dogs, periodo, ref, now)
  const list = drawn.some((item) => item.incassato + item.previsto > 0) ? drawn : []
  const earning = list.filter((item) => item.incassato > 0)
  const righe = periodo === 'giorno' ? appointmentRows(inside, dogs, now) : periodo === 'settimana' ? dayRows(inside, range.from, now) : serviceRows(done, services)
  return {
    periodo,
    from: range.from,
    to: range.to,
    phase,
    titolo: periodTitle(periodo, ref, now),
    totali: { incassato: total(done), previsto: total(coming), persi: total(lost) },
    completati: done.length,
    totaliAppuntamenti: done.length + coming.length,
    mediaACane: done.length > 0 ? Math.round(total(done) / done.length) : null,
    daChiudere: { count: open.length, importo: total(open) },
    confronto: compare(appointments, periodo, ref, now),
    buckets: list,
    mediaBarre: earning.length > 0 ? Math.round(earning.reduce((sum, item) => sum + item.incassato, 0) / earning.length) : null,
    scala: niceScale(Math.max(0, ...list.map((item) => item.incassato + item.previsto))),
    elenco: { titolo: listTitle(periodo, range.from, now), righe },
    persi: lostRows(lost, dogs),
    selezione: defaultSelection(periodo, phase, list),
  }
}

export function earnedOn(appointments: Appointment[], day: Date, now: Date): number {
  const { from, to } = periodRange('giorno', day)
  return total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/lib/earnings.test.ts`
Expected: PASS, tutti i test del file.

- [ ] **Step 5: Controlla i tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/earnings.ts src/lib/earnings.test.ts
git commit -m "feat: riepilogo incassi per giorno, settimana e mese"
```

---

### Task 4: Impostazione `ui.hideAmounts`

**Files:**
- Modify: `src/data/local/settings.ts:27-90`
- Modify: `src/lib/firebaseMap.ts:362-389`
- Test: `src/data/local/settings.test.ts`, `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Produces: `SettingsMain.ui: { hideAmounts: boolean }`, sempre presente dopo `blankSettings`, `getSettings` e `settingsFromDoc`.

- [ ] **Step 1: Scrivi i test che falliscono**

In `src/data/local/settings.test.ts`, nel test `'legge un json vecchio con i default e non lo riscrive'`, dopo `expect(settings.recentDogIds).toEqual([])` aggiungi:

```ts
    expect(settings.ui).toEqual({ hideAmounts: false })
```

In fondo al `describe('settings', …)` aggiungi:

```ts
  it('ui.hideAmounts si legge solo se è true', () => {
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'auto', updatedAt: '2026-10-01T00:00:00.000Z', ui: { hideAmounts: true } }))
    expect(getSettings('uid-1').ui.hideAmounts).toBe(true)
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'auto', updatedAt: '2026-10-01T00:00:00.000Z', ui: { hideAmounts: 'sì' } }))
    expect(getSettings('uid-1').ui.hideAmounts).toBe(false)
  })
```

In `src/lib/firebaseMap.test.ts`, dentro `describe('firebaseMap', …)` aggiungi:

```ts
  it('ui.hideAmounts va e torna da Firestore; un documento vecchio lo legge false', () => {
    const settings = { ...blankSettings('auto', '2026-10-13T00:00:00.000Z'), ui: { hideAmounts: true } }
    expect(settingsFromDoc(settingsToDoc(settings)).ui).toEqual({ hideAmounts: true })
    expect(settingsFromDoc({ theme: 'auto', updatedAt: '2026-10-13T00:00:00.000Z' }).ui).toEqual({ hideAmounts: false })
    expect(settingsFromDoc({ ui: { hideAmounts: 1 } }).ui).toEqual({ hideAmounts: false })
  })
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/data/local/settings.test.ts src/lib/firebaseMap.test.ts`
Expected: FAIL. `settings.ui` è `undefined`, e TypeScript segnala che `ui` non esiste in `SettingsMain`.

- [ ] **Step 3: Scrivi il codice**

In `src/data/local/settings.ts`, dentro `interface SettingsMain`, dopo `ageThresholds` aggiungi:

```ts
  ui: { hideAmounts: boolean }
```

In `blankSettings`, dopo `ageThresholds: { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 },` aggiungi:

```ts
    ui: { hideAmounts: false },
```

In `mergeSettings`, dopo la riga `ageThresholds: …` aggiungi:

```ts
    ui: { hideAmounts: existing.ui?.hideAmounts === true },
```

In `src/lib/firebaseMap.ts`, dentro il `return` di `settingsFromDoc`, dopo la riga `ageThresholds: …` aggiungi:

```ts
    ui: { hideAmounts: existing.ui?.hideAmounts === true },
```

(`settingsToDoc` copia già tutto con `JSON.parse(JSON.stringify(...))`: non va toccato.)

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/data/local/settings.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Controlla i tipi e la suite**

Run: `npx tsc --noEmit` poi `npm test`
Expected: nessun errore di tipo; suite verde. Se un test confronta l'intero oggetto impostazioni con `toEqual`, aggiungi lì `ui: { hideAmounts: false }`.

- [ ] **Step 6: Commit**

```powershell
git add src/data/local/settings.ts src/lib/firebaseMap.ts src/data/local/settings.test.ts src/lib/firebaseMap.test.ts
git commit -m "feat: impostazione del salone per nascondere gli importi"
```

---

### Task 5: Colori e grafico `EarningsChart`

**Files:**
- Modify: `src/theme/tokens.css`
- Create: `src/components/earnings/earningsChart.css`
- Create: `src/components/earnings/EarningsChart.tsx`
- Create: `src/components/earnings/EarningsChart.test.tsx`

**Interfaces:**
- Consumes: `EarningsBucket`, `maskEuro`, `plainAmount` da `src/lib/earnings.ts`.
- Produces: `EarningsChart({ buckets, scala, mediaBarre, selectedKey, onSelect, hidden }: { buckets: EarningsBucket[]; scala: { step: number; max: number }; mediaBarre: number | null; selectedKey: string | null; onSelect: (key: string) => void; hidden: boolean })`.
  - Ogni barra è un `button` con `aria-label` `"{title}: {incassato} euro incassati[, {previsto} previsti]"`, oppure `"{title}: importi nascosti"`.
  - Il fumetto è un `role="status"`.
  - La linea della media ha `data-testid="earnings-average"`.

- [ ] **Step 1: Aggiungi i colori**

In `src/theme/tokens.css`, dentro `:root`, prima della `}` di chiusura aggiungi:

```css
  --bar-a: #6F8BCB;
  --bar-b: var(--pri-solid);
  --bar-sa: #4F6FC0;
  --bar-sb: var(--pri-ink);
  --prev-a: #EEF2FA;
  --prev-b: #E0E8F6;
  --prev-line: #8EA5D6;
  --grid: #E6EAF0;
  --tip-bg: #141B2B;
  --tip-tx: #FFFFFF;
  --tip-sub: #C9D6EE;
  --tip-sh: 0 8px 18px -8px rgba(20,27,43,.6);
```

Dentro `[data-theme="dark"]`, prima della `}` di chiusura aggiungi:

```css
  --bar-a: var(--pri-solid);
  --bar-b: #3A5BA0;
  --bar-sa: var(--pri);
  --bar-sb: var(--pri-solid);
  --prev-a: rgba(138,164,232,.06);
  --prev-b: rgba(138,164,232,.14);
  --prev-line: rgba(138,164,232,.5);
  --grid: var(--line);
  --tip-bg: #E9EDF4;
  --tip-tx: #141B2B;
  --tip-sub: #525D71;
  --tip-sh: 0 8px 18px -8px rgba(0,0,0,.7);
```

- [ ] **Step 2: Scrivi i test che falliscono**

`src/components/earnings/EarningsChart.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { EarningsBucket } from '../../lib/earnings'
import { EarningsChart } from './EarningsChart'

const WEEK: EarningsBucket[] = [
  { key: '2026-10-12', label: 'Lun', sublabel: '12', title: 'Lunedì 12', incassato: 145, previsto: 0, isToday: false },
  { key: '2026-10-13', label: 'Mar', sublabel: '13', title: 'Martedì 13 · oggi', incassato: 110, previsto: 65, isToday: true },
  { key: '2026-10-14', label: 'Mer', sublabel: '14', title: 'Mercoledì 14', incassato: 0, previsto: 160, isToday: false },
]

function Harness({ hidden = false }: { hidden?: boolean }) {
  const [selected, setSelected] = useState<string | null>('2026-10-13')
  return <EarningsChart buckets={WEEK} scala={{ step: 50, max: 200 }} mediaBarre={128} selectedKey={selected} onSelect={setSelected} hidden={hidden} />
}

describe('EarningsChart', () => {
  it('mostra il fumetto della barra selezionata e lo sposta al tocco', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByRole('status')).toHaveTextContent('Martedì 13 · oggi')
    expect(screen.getByRole('status')).toHaveTextContent('€ 110 incassati · +€ 65 previsti')
    const wed = screen.getByRole('button', { name: 'Mercoledì 14: 0 euro incassati, 160 previsti' })
    await user.click(wed)
    expect(wed).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('nessun incasso · +€ 160 previsti')
  })

  it('il fumetto della prima barra sta a sinistra, quello dell’ultima a destra', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: /^Lunedì 12/ }))
    expect(screen.getByRole('status').getAttribute('style')).toMatch(/(^|;)\s*left: 0(px)?;/)
    await user.click(screen.getByRole('button', { name: /^Mercoledì 14/ }))
    expect(screen.getByRole('status').getAttribute('style')).toMatch(/(^|;)\s*right: 0(px)?;/)
  })

  it('griglia con scala, linea della media e valori sulle barre non selezionate', () => {
    render(<Harness />)
    expect(screen.getByText('200€')).toBeInTheDocument()
    expect(screen.getByText('50€')).toBeInTheDocument()
    expect(screen.getByTestId('earnings-average').getAttribute('style')).toContain('bottom: 64%')
    expect(screen.getByText('145')).toBeInTheDocument()
    expect(screen.getByText('160')).toBeInTheDocument()
    expect(screen.queryByText('175')).not.toBeInTheDocument()
  })

  it('le frecce spostano la selezione', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByRole('group', { name: 'Grafico incassi' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /^Mercoledì 14/ })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('button', { name: /^Lunedì 12/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('con importi nascosti niente numeri, solo proporzioni', () => {
    render(<Harness hidden />)
    expect(screen.queryByText('200€')).not.toBeInTheDocument()
    expect(screen.getAllByText('•')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('••• incassati · +••• previsti')
    expect(screen.getByRole('button', { name: 'Martedì 13 · oggi: importi nascosti' })).toBeInTheDocument()
  })

  it('senza barre mostra lo stato vuoto', () => {
    render(<EarningsChart buckets={[]} scala={{ step: 25, max: 100 }} mediaBarre={null} selectedKey={null} onSelect={() => {}} hidden={false} />)
    expect(screen.getByText('Nessun appuntamento in questo periodo')).toBeInTheDocument()
    expect(screen.queryByTestId('earnings-average')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Verifica che falliscano**

Run: `npx vitest run src/components/earnings/EarningsChart.test.tsx`
Expected: FAIL, `Failed to resolve import "./EarningsChart"`.

- [ ] **Step 4: Scrivi il codice**

`src/components/earnings/earningsChart.css`:

```css
@keyframes earnings-grow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

.earnings-bar {
  transform-origin: bottom;
  animation: earnings-grow 250ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .earnings-bar { animation: none; }
}
```

`src/components/earnings/EarningsChart.tsx`:

```tsx
import type { CSSProperties, KeyboardEvent } from 'react'
import { maskEuro, plainAmount, type EarningsBucket } from '../../lib/earnings'
import { TYPE } from '../../theme/theme'
import './earningsChart.css'

const PLOT_TOP = 46
const AXIS_W = 30

function pct(value: number, max: number): string {
  return `${Math.round((value / max) * 10000) / 100}%`
}

function barLabel(bucket: EarningsBucket, hidden: boolean): string {
  if (hidden) return `${bucket.title}: importi nascosti`
  return `${bucket.title}: ${plainAmount(bucket.incassato)} euro incassati${bucket.previsto > 0 ? `, ${plainAmount(bucket.previsto)} previsti` : ''}`
}

function tipText(bucket: EarningsBucket, hidden: boolean): string {
  const earned = bucket.incassato > 0 ? `${maskEuro(bucket.incassato, hidden)} incassati` : 'nessun incasso'
  return bucket.previsto > 0 ? `${earned} · +${maskEuro(bucket.previsto, hidden)} previsti` : earned
}

function Grid({ scala, hidden }: { scala: { step: number; max: number }; hidden: boolean }) {
  const lines: number[] = []
  for (let value = 0; value <= scala.max; value += scala.step) lines.push(value)
  return (
    <>
      {lines.map((value) => (
        <div
          key={value}
          style={{ position: 'absolute', left: 0, right: 0, bottom: pct(value, scala.max), height: 0, borderTop: value === 0 ? '1px solid var(--line2)' : '1px dashed var(--grid)' }}
        >
          <span style={{ position: 'absolute', left: -AXIS_W, top: -7, width: 24, textAlign: 'right', fontSize: 9.5, color: 'var(--tx3)' }}>
            {hidden ? '' : value === 0 ? '0' : `${value}€`}
          </span>
        </div>
      ))}
    </>
  )
}

const plot: CSSProperties = { position: 'absolute', left: AXIS_W, right: 0, top: PLOT_TOP, bottom: 0 }

export function EarningsChart({ buckets, scala, mediaBarre, selectedKey, onSelect, hidden }: {
  buckets: EarningsBucket[]
  scala: { step: number; max: number }
  mediaBarre: number | null
  selectedKey: string | null
  onSelect: (key: string) => void
  hidden: boolean
}) {
  if (buckets.length === 0) {
    return (
      <div style={{ position: 'relative', height: 196, marginTop: 6 }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--tx3)', fontSize: TYPE.base }}>
            Nessun appuntamento in questo periodo
          </div>
        </div>
      </div>
    )
  }

  const selectedIndex = buckets.findIndex((bucket) => bucket.key === selectedKey)

  function move(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const from = selectedIndex < 0 ? 0 : selectedIndex
    const next = Math.max(0, Math.min(buckets.length - 1, from + (event.key === 'ArrowRight' ? 1 : -1)))
    onSelect(buckets[next].key)
  }

  return (
    <div>
      <div role="group" aria-label="Grafico incassi" tabIndex={0} onKeyDown={move} style={{ position: 'relative', height: 196, marginTop: 6, outline: 'none' }}>
        <div style={plot}>
          <Grid scala={scala} hidden={hidden} />
          {mediaBarre !== null ? (
            <div
              data-testid="earnings-average"
              style={{ position: 'absolute', left: 0, right: 0, bottom: pct(mediaBarre, scala.max), height: 0, borderTop: '1.5px dashed var(--tx3)', zIndex: 1, pointerEvents: 'none' }}
            />
          ) : null}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 6 }}>
            {buckets.map((bucket, index) => {
              const selected = bucket.key === selectedKey
              const sum = bucket.incassato + bucket.previsto
              const align: CSSProperties = index === 0 ? { left: 0 } : index === buckets.length - 1 ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }
              const fade = selectedKey !== null && !selected ? 0.5 : 1
              return (
                <button
                  key={bucket.key}
                  type="button"
                  aria-pressed={selected}
                  aria-label={barLabel(bucket, hidden)}
                  onClick={() => onSelect(bucket.key)}
                  style={{ flex: 1, minWidth: 0, height: '100%', border: 0, background: 'transparent', padding: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', color: 'inherit' }}
                >
                  {selected ? (
                    <span
                      role="status"
                      aria-live="polite"
                      style={{ position: 'absolute', zIndex: 2, bottom: `calc(${pct(sum, scala.max)} + 8px)`, ...align, whiteSpace: 'nowrap', background: 'var(--tip-bg)', color: 'var(--tip-tx)', borderRadius: 9, padding: '6px 9px', fontSize: 10, lineHeight: 1.35, textAlign: 'left', boxShadow: 'var(--tip-sh)', pointerEvents: 'none' }}
                    >
                      <b style={{ display: 'block', fontSize: 11.5 }}>{bucket.title}</b>
                      <span style={{ color: 'var(--tip-sub)' }}>{tipText(bucket, hidden)}</span>
                    </span>
                  ) : null}
                  {!selected && sum > 0 ? (
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--tx3)', marginBottom: 3 }}>{hidden ? '•' : plainAmount(sum)}</span>
                  ) : null}
                  {sum > 0 ? (
                    <span className="earnings-bar" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 28, height: pct(sum, scala.max), opacity: fade, transition: 'opacity 150ms' }}>
                      {bucket.previsto > 0 ? (
                        <span
                          data-part="previsto"
                          style={{ flexGrow: bucket.previsto, flexBasis: 0, background: 'repeating-linear-gradient(135deg, var(--prev-a) 0 4px, var(--prev-b) 4px 8px)', border: '1.5px dashed var(--prev-line)', borderBottom: bucket.incassato > 0 ? 0 : undefined, borderRadius: bucket.incassato > 0 ? '7px 7px 0 0' : '7px 7px 3px 3px' }}
                        />
                      ) : null}
                      {bucket.incassato > 0 ? (
                        <span
                          data-part="incassato"
                          style={{ flexGrow: bucket.incassato, flexBasis: 0, minHeight: 3, background: selected ? 'linear-gradient(180deg, var(--bar-sa), var(--bar-sb))' : 'linear-gradient(180deg, var(--bar-a), var(--bar-b))', borderRadius: bucket.previsto > 0 ? '0 0 3px 3px' : '7px 7px 3px 3px' }}
                        />
                      ) : null}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div aria-hidden style={{ display: 'flex', gap: 6, margin: `6px 0 0 ${AXIS_W}px` }}>
        {buckets.map((bucket) => {
          const selected = bucket.key === selectedKey
          return (
            <div
              key={bucket.key}
              style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: TYPE.meta, lineHeight: 1.2, fontWeight: bucket.isToday ? 800 : selected ? 700 : 600, color: bucket.isToday ? 'var(--pri)' : selected ? 'var(--tx)' : 'var(--tx2)' }}
            >
              {bucket.label}
              <small style={{ display: 'block', fontSize: 9.5, fontWeight: 500, color: 'var(--tx3)' }}>{bucket.sublabel || '\u00a0'}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Conto del test della media: 128/200 = 64 %, da cui `bottom: 64%`.

- [ ] **Step 5: Verifica che passino**

Run: `npx vitest run src/components/earnings/EarningsChart.test.tsx`
Expected: PASS, 6 test. Vitest gestisce da solo l'import del `.css`.

- [ ] **Step 6: Commit**

```powershell
git add src/theme/tokens.css src/components/earnings/earningsChart.css src/components/earnings/EarningsChart.tsx src/components/earnings/EarningsChart.test.tsx
git commit -m "feat: grafico a barre degli incassi"
```

---

### Task 6: Pagina `/incassi`

**Files:**
- Create: `src/pages/EarningsPage.tsx`
- Create: `src/pages/EarningsPage.test.tsx`
- Modify: `src/app/router.tsx` (import e rotta dopo `/mensili`)

**Interfaces:**
- Consumes:
  - `summarize`, `shiftRef`, `canGoNext`, `parsePeriod`, `maskEuro`, `EarningsPeriod`, `EarningsRow` da `src/lib/earnings.ts`;
  - `EarningsChart` dal Task 5;
  - `settings.ui.hideAmounts` dal Task 4;
  - `parseDayParam`, `localDayKey` da `src/lib/appointments.ts`;
  - `useOpenSheet` (apre `/appuntamenti/{id}`), `useSettings().save`, `useToast`.
- Produces: rotta `/incassi?periodo=giorno|settimana|mese&data=AAAA-MM-GG`.

- [ ] **Step 1: Scrivi i test che falliscono**

`src/pages/EarningsPage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import type { DogWrite } from '../types/models'

function dog(name: string): DogWrite {
  return { name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' } }
}

function line(price: number) {
  return [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }]
}

async function seed() {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const uid = account.uid
  const [rex, zeus, luna, otto, fido] = ['Rex', 'Zeus', 'Luna', 'Otto', 'Fido'].map((name) => createDog(uid, dog(name)))
  completeAppointment(uid, createAppointment(uid, { dogId: rex.id, start: new Date(2026, 9, 12, 10, 0), services: line(40) }).id)
  completeAppointment(uid, createAppointment(uid, { dogId: zeus.id, start: new Date(2026, 9, 13, 9, 0), services: line(55) }).id)
  createAppointment(uid, { dogId: luna.id, start: new Date(2026, 9, 13, 15, 30), services: line(30) })
  createAppointment(uid, { dogId: otto.id, start: new Date(2026, 9, 14, 10, 0), services: line(160) })
  setAppointmentStatus(uid, createAppointment(uid, { dogId: fido.id, start: new Date(2026, 9, 15, 11, 0), services: line(35) }).id, 'disdetto', 'cliente')
  return uid
}

describe('pagina Incassi', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 15, 5))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('settimana: numeri, fumetto e tocco su una barra', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    expect(await screen.findByRole('heading', { name: 'Incassi' })).toBeInTheDocument()
    expect(screen.getByText('12 – 18 ottobre')).toBeInTheDocument()
    expect(screen.getByTestId('earnings-total')).toHaveTextContent('€ 95')
    expect(screen.getByText('2 di 4')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Martedì 13 · oggi')
    await user.click(screen.getByRole('button', { name: 'Mercoledì 14: 0 euro incassati, 160 previsti' }))
    expect(screen.getByRole('status')).toHaveTextContent('nessun incasso · +€ 160 previsti')
  })

  it('tap su un giorno apre Giorno su quella data; Segmented mantiene la data', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    const monday = await screen.findAllByRole('button', { name: /^Lunedì 12/ })
    await user.click(monday.at(-1)!)
    expect(await screen.findByText('Lun 12 ottobre')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Appuntamenti di lun 12' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Settimana' }))
    await user.click(screen.getByRole('button', { name: 'Periodo successivo' }))
    await user.click(screen.getByRole('radio', { name: 'Giorno' }))
    expect(screen.getByText('Lun 19 ottobre')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    expect(screen.getByText('Oggi · mar 13 ottobre')).toBeInTheDocument()
  })

  it('› si ferma oltre 4 settimane da oggi', async () => {
    await seed()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-11-09" />)
    expect(await screen.findByRole('button', { name: 'Periodo successivo' })).toBeDisabled()
  })

  it('Persi apre il foglio con il disdetto dal cliente', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    await user.click(await screen.findByRole('button', { name: /^Persi/ }))
    const sheet = screen.getByRole('dialog', { name: 'Persi' })
    expect(within(sheet).getByText('Fido')).toBeInTheDocument()
    expect(within(sheet).getByText('gio 15 ott · disdetto dal cliente')).toBeInTheDocument()
  })

  it('l’occhio nasconde gli importi e salva la scelta del salone', async () => {
    const uid = await seed()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    await user.click(await screen.findByRole('button', { name: 'Nascondi importi' }))
    expect(screen.getByTestId('earnings-total')).toHaveTextContent('•••')
    expect(screen.getByRole('button', { name: 'Mostra importi' })).toHaveAttribute('aria-pressed', 'true')
    expect(getSettings(uid).ui.hideAmounts).toBe(true)
  })

  it('un programmato di ieri compare nell’avviso da chiudere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 12, 10, 0), services: line(30) })
    render(<App memory isDev={false} initialPath="/incassi?periodo=settimana&data=2026-10-13" />)
    expect(await screen.findByText('1 appuntamento da chiudere · € 30 non ancora contati')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chiudi ›' })).toHaveAttribute('href', '/')
  })

  it('senza appuntamenti mostra lo stato vuoto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/incassi" />)
    expect(await screen.findByText('Nessun appuntamento in questo periodo')).toBeInTheDocument()
    expect(screen.getByText('Gli incassi compaiono quando segni un appuntamento come Completato')).toBeInTheDocument()
  })
})
```

Conti della settimana 12–18 con questo seed:
- Incassato: 40 + 55 = 95.
- Appuntamenti: 2 completati, 2 previsti (Luna 30, Otto 160), quindi «2 di 4».
- Persi: 35.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/pages/EarningsPage.test.tsx`
Expected: FAIL. La rotta `/incassi` manca e il fallback riporta alla Home, quindi `heading 'Incassi'` non si trova.

- [ ] **Step 3: Scrivi la pagina**

`src/pages/EarningsPage.tsx`:

```tsx
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
```

Note per chi implementa:
- `Card` passa `onPointerDown`/`onPointerUp` al `div`, perché accetta `HTMLAttributes<HTMLDivElement>`.
- Il bottone «Oggi» accanto al titolo si chiama solo «Oggi». Nella pagina non c'è un altro bottone con lo stesso nome, perché in `Segmented` le opzioni sono `radio`.
- Sia la barra («Lunedì 12: 40 euro incassati») sia la riga dell'elenco hanno un nome che comincia con «Lunedì 12». Il test prende l'ultima corrispondenza, cioè la riga, che nel DOM viene dopo il grafico.

- [ ] **Step 4: Aggiungi la rotta**

In `src/app/router.tsx`, tra gli import delle pagine (in ordine alfabetico, dopo `DevKitPage`):

```ts
import { EarningsPage } from '../pages/EarningsPage'
```

In `pageRoutes`, subito dopo la riga di `/mensili`:

```tsx
    { path: '/incassi', element: <Guard><EarningsPage /></Guard> },
```

- [ ] **Step 5: Verifica che passino**

Run: `npx vitest run src/pages/EarningsPage.test.tsx`
Expected: PASS, 7 test.

- [ ] **Step 6: Controlla i tipi**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/EarningsPage.tsx src/pages/EarningsPage.test.tsx src/app/router.tsx
git commit -m "feat: pagina Incassi con giorno, settimana e mese"
```

---

### Task 7: Riquadro «Incassi oggi» in Home

**Files:**
- Create: `src/components/earnings/EarningsTile.tsx`
- Modify: `src/pages/HomePage.tsx:47-59` (stile `tile`), `:256-272` (riga dei riquadri), import
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `earnedOn`, `maskEuro`, `plainAmount` da `src/lib/earnings.ts`; `settings.ui.hideAmounts`.
- Produces: `EarningsTile({ amount, hidden, style, valueStyle, labelStyle }: { amount: number; hidden: boolean; style: CSSProperties; valueStyle: CSSProperties; labelStyle: CSSProperties })`.

- [ ] **Step 1: Scrivi i test che falliscono**

In `src/pages/HomePage.test.tsx`, cambia l'import delle impostazioni in:

```ts
import { blankSettings, getSettings, rememberDog } from '../data/local/settings'
```

e aggiungi in fondo al `describe('home', …)`:

```ts
  it('il riquadro Incassi oggi somma i completati di oggi e porta alla pagina', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const bea = createDog(account.uid, dog('Bea'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 9, 9, 0, 0, 0), services: LINE }).id)
    render(<App memory isDev={false} initialPath="/" />)
    const tile = await screen.findByRole('link', { name: 'Incassi di oggi: 20 euro. Apri incassi' })
    expect(tile).toHaveAttribute('href', '/incassi?periodo=giorno')
    expect(within(tile).getByText('€ 20')).toBeInTheDocument()
    expect(within(tile).getByText('Incassi oggi')).toBeInTheDocument()
    expect(tile.parentElement?.getAttribute('style')).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    const order = Array.from(tile.parentElement!.children).map((item) => item.textContent)
    expect(order[1]).toContain('Incassi oggi')
    expect(order[2]).toContain('Mensili')
  })

  it('con importi nascosti il riquadro mostra •••', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...blankSettings('auto', '2026-10-10T00:00:00.000Z'), ui: { hideAmounts: true } })
    render(<App memory isDev={false} initialPath="/" />)
    const tile = await screen.findByRole('link', { name: 'Incassi di oggi: nascosti. Apri incassi' })
    expect(within(tile).getByText('•••')).toBeInTheDocument()
  })
```

(`LINE` costa 20 €. Il completato di ieri non conta, il programmato di oggi non è incassato.)

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL, il link «Incassi di oggi…» non esiste.

- [ ] **Step 3: Scrivi il riquadro**

`src/components/earnings/EarningsTile.tsx`:

```tsx
import { Euro } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { maskEuro, plainAmount } from '../../lib/earnings'
import { IconTile } from '../ui/IconTile'

export function EarningsTile({ amount, hidden, style, valueStyle, labelStyle }: {
  amount: number
  hidden: boolean
  style: CSSProperties
  valueStyle: CSSProperties
  labelStyle: CSSProperties
}) {
  const label = hidden ? 'Incassi di oggi: nascosti. Apri incassi' : `Incassi di oggi: ${plainAmount(amount)} euro. Apri incassi`
  return (
    <Link to="/incassi?periodo=giorno" aria-label={label} style={style}>
      <IconTile tone="ok" size="sm"><Euro size={13} strokeWidth={2} aria-hidden /></IconTile>
      <span style={valueStyle}>{maskEuro(amount, hidden)}</span>
      <span style={labelStyle}>Incassi oggi</span>
    </Link>
  )
}
```

- [ ] **Step 4: Metti il riquadro in Home**

In `src/pages/HomePage.tsx`:

1. Import, accanto agli altri di `../components/...`:

```ts
import { EarningsTile } from '../components/earnings/EarningsTile'
```

e accanto agli altri di `../lib/...`:

```ts
import { earnedOn } from '../lib/earnings'
```

2. Nello stile `tile` togli `flex: 1,` (con la griglia non serve più). `minWidth: 0` resta.

3. Dopo `const month = …` aggiungi:

```ts
  const earnedToday = earnedOn(appointments, now, now)
```

4. Sostituisci il blocco dei riquadri (da `<div style={{ display: 'flex', gap: 8 }}>` alla sua `</div>`) con:

```tsx
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          <Link to={todayPath} style={tile}>
            <IconTile tone="prim" size="sm"><Clock size={13} strokeWidth={2} aria-hidden /></IconTile>
            <span style={tileValue}>{`${today.length} · ${formatCompactDuration(minutes)}`}</span>
            <span style={tileLabel}>Oggi</span>
          </Link>
          <EarningsTile amount={earnedToday} hidden={settings.ui.hideAmounts} style={tile} valueStyle={tileValue} labelStyle={tileLabel} />
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
```

- [ ] **Step 5: Verifica che passino**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/shellPages.test.tsx src/pages/listino.test.tsx`
Expected: PASS. `shellPages.test.tsx` cerca `link { name: /Oggi/ }`. L'`aria-label` del riquadro nuovo contiene «oggi» minuscolo e la regex fa distinzione tra maiuscole e minuscole, quindi non c'è doppione. Se un test trova due link, controlla quel nome.

- [ ] **Step 6: Commit**

```powershell
git add src/components/earnings/EarningsTile.tsx src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: riquadro Incassi oggi in Home"
```

---

### Task 8: Verifica completa e pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json`

- [ ] **Step 1: Suite e build**

Run: `npm test` poi `npm run build`
Expected: tutti i test verdi; build senza errori di tipo.

- [ ] **Step 2: Controllo a occhio**

Avvia `npm run dev` e apri l'app nel browser a 360 e a 390 px di larghezza (emulazione del dispositivo), in tema chiaro e scuro. Usa dati di prova come quelli del §11 della fonte. Confronta con `docs/incassi/incassi-prototipo.html`:
- Home: 4 riquadri. «5 · 3h30» va a capo senza rimpicciolire. «Incassi oggi» si legge.
- Pagina: barre, previsto tratteggiato sopra l'incassato, linea della media, valori sopra le barre.
- Il fumetto non esce dalla card né sulla prima né sull'ultima barra.
- Le barre che non sono selezionate si attenuano.
- Swipe a sinistra e a destra sulla card cambia periodo.
- Tenere premuto l'importo con l'occhio chiuso lo mostra.
- Segnare un appuntamento come Completato in Home aggiorna subito il riquadro.

Se qualcosa non torna, correggi, aggiungi un test se il problema è nella logica, rilancia `npm test` e fai un commit a parte.

- [ ] **Step 3: Controlla cosa entra nell'APK**

Run: `git status --short`

`src/app/App.tsx`, `src/app/LoadingSplash.tsx`, `src/app/loadingSplash.css` e `src/assets/brand/groomly-logo-animato*.svg` sono un altro lavoro non finito. Se sono ancora modificati o non tracciati, **fermati e chiedi all'utente** se metterli da parte con `git stash push --include-untracked -- <percorsi>` prima della build dell'APK. Altrimenti finirebbero nell'app pubblicata.

- [ ] **Step 4: Alza la versione a 1.1.38**

- `src/lib/appVersion.ts`: `APP_VERSION = '1.1.38'` e `APP_NOTES = ['In Home il riquadro Incassi oggi, e una pagina Incassi con giorno, settimana e mese.']`
- `package.json`: `"version": "1.1.38"`
- `android/app/build.gradle`: `versionCode 10138`, `versionName "1.1.38"`
- `hosting/release.json`:

```json
{
  "version": "1.1.38",
  "url": "https://github.com/robmass83-ui/Groomly/releases/download/v1.1.38/groomly.apk",
  "notes": [
    "In Home il riquadro Incassi oggi, e una pagina Incassi con giorno, settimana e mese."
  ]
}
```

- [ ] **Step 5: Ricostruisci e crea l'APK**

```powershell
npm test
npm run build
npx cap sync android
cd android; .\gradlew assembleDebug; cd ..
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk groomly.apk -Force
```

Expected: test verdi, build e `assembleDebug` riusciti, `groomly.apk` nella radice (fuori da `hosting/`).

- [ ] **Step 6: Commit, push e release**

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "release: riquadro e pagina Incassi"
git push origin HEAD
gh release create v1.1.38 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.38" --notes "In Home il riquadro Incassi oggi, e una pagina Incassi con giorno, settimana e mese, grafico interattivo e importi nascondibili."
```

Se `gh` non è autenticato o il push viene rifiutato, fermati e dillo. Non forzare e non saltare gli hook.

- [ ] **Step 7: Firebase**

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se Firebase non è autenticato, fermati e dillo.
