# Giorno a fasce, export e scheda — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nella vista Giorno la chip segue il contenuto e le ore si comprimono; l'export usa la ragione sociale nel nome file, può omettere il pagamento ed esce un Excel formattato; i contatti e lo storico chiuso della scheda diventano card, e lo storico si apre sulla timeline.

**Architecture:** `daySegments` in `src/lib/calendarLayout.ts` è l'unica geometria della vista Giorno. L'export aggiunge `pagamento` opzionale (assente = acceso) e `toXlsx` con ExcelJS. Lo scroll del pannello si blocca in `Sheet`. Contatti e storico sono solo presentazione in `DogPage`.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, jsPDF, ExcelJS, Capacitor.

## Global Constraints

- Vista Giorno soltanto. Settimana (`WeekRows`) e Mese non cambiano scala.
- Riga ora vuota: 36 px. Segno orario nel gruppo: almeno 16 px. Colonna ore: 48 px.
- 9:00–12:00 mostra 9:00, 10:00, 11:00. 10:30 per tre ore mostra 10:30, 11:30, 12:30. L'ora di fine non è un segno del gruppo.
- Un'ora che tocca un appuntamento non ha una riga vuota. Le 10:30 non lasciano una riga «10:00».
- Chip alta `contentMinHeightPx`, non la durata. Niente ellissi sul nome, niente «+1».
- Due appuntamenti che si incrociano restano affiancati (`placeAppointments`), bordo arancione se le colonne sono più di una. La chip si aggancia al segno più tardo che non supera il suo inizio.
- Prefisso file: ragione sociale ripulita, altrimenti `Groomly`. Titolo PDF «Riepilogo incassi». Piè di pagina «Generato con Groomly». Condivisione «Incassi Groomly».
- `pagamento` assente o true = acceso. Solo `false` spegne colonna Pagamento e riga POS / Contanti. I mancati non hanno quella colonna.
- Excel è `.xlsx`. Il valore salvato `formato: 'csv'` resta e significa Excel.
- Fascia titolo e intestazioni `#1F2937`, testo chiaro, grassetto. Filtro sulla tabella dettaglio, totale escluso. Data e importi numerici.
- Con uno Sheet aperto la pagina sotto non scorre. Il corpo del pannello scorre, massimo 90% dell'altezza.
- Storico chiuso mostra solo l'ultima riga (data, servizi, dettaglio o «Non venuto»), senza foto, senza matita, senza freccia di prezzo. Aprendolo la timeline c'è tutta e quella riga compare una volta. Zero trattamenti: «Nessun trattamento», non è un bottone.
- Non alzare la versione dell'app in questi task. Non committare file fuori dai path del task.

---

### Task 1: Geometria del giorno

**Files:**
- Modify: `src/lib/calendarLayout.ts`
- Test: `src/lib/calendarLayout.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `EMPTY_HOUR_PX = 36`, `MARK_MIN_PX = 16`
  - `DayLayoutItem = { id: string; startMin: number; durationMin: number; contentPx: number; column: number; columnCount: number }`
  - `DaySegment` = `{ kind: 'empty'; hour: number; top: number; height: number }` oppure `{ kind: 'group'; startMin: number; endMin: number; top: number; height: number; marks: { minute: number; top: number }[]; items: { id: string; top: number; height: number; column: number; columnCount: number }[] }`
  - `daySegments(items: DayLayoutItem[], startHour: number, endHour: number): { segments: DaySegment[]; height: number }`
  - `yAtMinute(segments: DaySegment[], minute: number): number`

- [ ] **Step 1: Write the failing test**

Aggiungi in `src/lib/calendarLayout.test.ts`:

```typescript
import { daySegments, yAtMinute, type DayLayoutItem } from './calendarLayout'

function item(partial: Partial<DayLayoutItem> & Pick<DayLayoutItem, 'id' | 'startMin'>): DayLayoutItem {
  return { durationMin: 60, contentPx: 48, column: 0, columnCount: 1, ...partial }
}

it('un appuntamento 9–12 tiene la chip al contenuto e i segni 9, 10, 11', () => {
  const { segments, height } = daySegments([item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 48 })], 8, 19)
  const group = segments.find((segment) => segment.kind === 'group')
  expect(group).toMatchObject({ kind: 'group', startMin: 9 * 60, endMin: 12 * 60 })
  if (group?.kind !== 'group') throw new Error('manca il gruppo')
  expect(group.marks.map((mark) => mark.minute)).toEqual([9 * 60, 10 * 60, 11 * 60])
  expect(group.items[0].height).toBe(48)
  expect(group.height).toBeGreaterThanOrEqual(48)
  expect(group.height).toBe(16 * 3)
  const empty = segments.filter((segment) => segment.kind === 'empty')
  expect(empty).toHaveLength(8)
  expect(empty.map((segment) => segment.kind === 'empty' && segment.hour)).toEqual([8, 12, 13, 14, 15, 16, 17, 18])
  expect(height).toBe(8 * 36 + 48)
})

it('le 10:30 per tre ore non lasciano la riga delle 10 e segnano 10:30, 11:30, 12:30', () => {
  const { segments } = daySegments([item({ id: 'a', startMin: 10 * 60 + 30, durationMin: 180, contentPx: 40 })], 8, 19)
  const hours = segments.filter((segment) => segment.kind === 'empty').map((segment) => segment.kind === 'empty' && segment.hour)
  expect(hours).not.toContain(10)
  expect(hours).toContain(8)
  expect(hours).toContain(13)
  const group = segments.find((segment) => segment.kind === 'group')
  if (group?.kind !== 'group') throw new Error('manca il gruppo')
  expect(group.marks.map((mark) => mark.minute)).toEqual([10 * 60 + 30, 11 * 60 + 30, 12 * 60 + 30])
})

it('due appuntamenti sovrapposti stanno nello stesso gruppo e il secondo si aggancia alle 10', () => {
  const { segments } = daySegments([
    item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 40 }),
    item({ id: 'b', startMin: 10 * 60, durationMin: 60, contentPx: 80, column: 1, columnCount: 2 }),
  ], 8, 19)
  const group = segments.find((segment) => segment.kind === 'group')
  if (group?.kind !== 'group') throw new Error('manca il gruppo')
  expect(group.marks.map((mark) => mark.minute)).toEqual([9 * 60, 10 * 60, 11 * 60])
  const second = group.items.find((entry) => entry.id === 'b')
  const ten = group.marks[1]
  expect(second?.top).toBeCloseTo(ten.top, 5)
  expect(second?.height).toBe(80)
  expect(group.height).toBeGreaterThanOrEqual(80)
})

it('yAtMinute cade nella riga vuota e nel gruppo', () => {
  const { segments } = daySegments([item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 48 })], 8, 19)
  expect(yAtMinute(segments, 8 * 60 + 30)).toBeCloseTo(18, 5)
  const group = segments.find((segment) => segment.kind === 'group')
  if (group?.kind !== 'group') throw new Error('manca il gruppo')
  expect(yAtMinute(segments, 10 * 60 + 30)).toBeGreaterThan(group.top)
  expect(yAtMinute(segments, 10 * 60 + 30)).toBeLessThan(group.top + group.height)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarLayout.test.ts`
Expected: FAIL, `daySegments` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/calendarLayout.ts` aggiungi, senza togliere `contentMinHeightPx`, `pxPerMinuteForDay`, `blockGeometry`:

```typescript
export const EMPTY_HOUR_PX = 36
export const MARK_MIN_PX = 16

export interface DayLayoutItem {
  id: string
  startMin: number
  durationMin: number
  contentPx: number
  column: number
  columnCount: number
}

export interface DayMark { minute: number; top: number }

export interface DayEmpty {
  kind: 'empty'
  hour: number
  top: number
  height: number
}

export interface DayGroup {
  kind: 'group'
  startMin: number
  endMin: number
  top: number
  height: number
  marks: DayMark[]
  items: { id: string; top: number; height: number; column: number; columnCount: number }[]
}

export type DaySegment = DayEmpty | DayGroup

function rangesOverlap(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && otherStart < end
}

function clustersOf(items: DayLayoutItem[]): { startMin: number; endMin: number; items: DayLayoutItem[] }[] {
  const sorted = [...items].sort((left, right) => left.startMin - right.startMin || left.id.localeCompare(right.id))
  const clusters: { startMin: number; endMin: number; items: DayLayoutItem[] }[] = []
  for (const item of sorted) {
    const start = item.startMin
    const end = start + Math.max(item.durationMin, 1)
    const last = clusters[clusters.length - 1]
    if (!last || start >= last.endMin) clusters.push({ startMin: start, endMin: end, items: [item] })
    else {
      last.endMin = Math.max(last.endMin, end)
      last.items.push(item)
    }
  }
  return clusters
}

export function daySegments(items: DayLayoutItem[], startHour: number, endHour: number): { segments: DaySegment[]; height: number } {
  const clusters = clustersOf(items)
  const segments: DaySegment[] = []
  let top = 0
  let clusterIndex = 0
  for (let hour = startHour; hour < endHour; hour += 1) {
    const cluster = clusters[clusterIndex]
    const hourStart = hour * 60
    const hourEnd = hourStart + 60
    if (cluster && rangesOverlap(hourStart, hourEnd, cluster.startMin, cluster.endMin)) {
      const marks: number[] = []
      for (let minute = cluster.startMin; minute < cluster.endMin; minute += 60) marks.push(minute)
      if (marks.length === 0) marks.push(cluster.startMin)
      const count = marks.length
      const placed = cluster.items.map((item) => {
        let markIndex = 0
        for (let index = 0; index < marks.length; index += 1) {
          if (marks[index] <= item.startMin) markIndex = index
        }
        return { item, markIndex }
      })
      let height = count * MARK_MIN_PX
      for (const entry of placed) {
        const room = 1 - entry.markIndex / count
        if (room > 0) height = Math.max(height, entry.item.contentPx / room)
      }
      segments.push({
        kind: 'group',
        startMin: cluster.startMin,
        endMin: cluster.endMin,
        top,
        height,
        marks: marks.map((minute, index) => ({ minute, top: top + (index / count) * height })),
        items: placed.map(({ item, markIndex }) => ({
          id: item.id,
          top: top + (markIndex / count) * height,
          height: item.contentPx,
          column: item.column,
          columnCount: item.columnCount,
        })),
      })
      top += height
      clusterIndex += 1
      while (hour + 1 < endHour && rangesOverlap((hour + 1) * 60, (hour + 2) * 60, cluster.startMin, cluster.endMin)) hour += 1
    } else {
      segments.push({ kind: 'empty', hour, top, height: EMPTY_HOUR_PX })
      top += EMPTY_HOUR_PX
    }
  }
  return { segments, height: top }
}

export function yAtMinute(segments: DaySegment[], minute: number): number {
  for (const segment of segments) {
    if (segment.kind === 'empty') {
      const start = segment.hour * 60
      if (minute >= start && minute < start + 60) return segment.top + ((minute - start) / 60) * segment.height
    } else if (minute >= segment.startMin && minute < segment.endMin) {
      const span = Math.max(segment.endMin - segment.startMin, 1)
      return segment.top + ((minute - segment.startMin) / span) * segment.height
    }
  }
  if (segments.length === 0) return 0
  const last = segments[segments.length - 1]
  return last.top + last.height
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarLayout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

Solo `src/lib/calendarLayout.ts` e `src/lib/calendarLayout.test.ts`.

```bash
git commit -m "feat: geometria a fasce per la vista giorno"
```

### Task 2: La vista Giorno usa le fasce

**Files:**
- Modify: `src/theme/sizes.ts` (gutter da 34 a 48)
- Modify: `src/pages/CalendarPage.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `daySegments`, `yAtMinute`, `EMPTY_HOUR_PX`, `contentMinHeightPx` da `src/lib/calendarLayout.ts`; `placeAppointments` da `src/lib/calendarView.ts`
- Produces: la griglia `Orari` della vista Giorno disegnata a fasce

- [ ] **Step 1: Write the failing test**

In `src/pages/appointments.test.tsx`, vicino al test della card corta, aggiungi:

```typescript
it('nel giorno un appuntamento di tre ore non allunga la chip e mostra 9, 10 e 11', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 9, 5, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 180, price: 35 }],
  })
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
  const block = await screen.findByRole('button', { name: 'Apri Rex' })
  expect(parseFloat(block.style.height)).toBeLessThan(120)
  expect(screen.getByText('9:00')).toBeInTheDocument()
  expect(screen.getByText('10:00')).toBeInTheDocument()
  expect(screen.getByText('11:00')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 8:00' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 9:00' })).not.toBeInTheDocument()
})
```

Usa gli helper già importati in quel file (`createAccount`, `createDog`, `dog`, `createAppointment`, `App`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx -t "tre ore"`
Expected: FAIL. La chip è alta quanto tre ore, oppure manca un'etichetta.

- [ ] **Step 3: Write minimal implementation**

In `src/theme/sizes.ts` porta `calendar.gutter` a `48`.

In `CalendarPage.tsx`, solo il ramo vista Giorno (il ramo che rende `role="grid"` `aria-label="Orari"`):

- Calcola `placeAppointments` come oggi.
- Per ogni appuntamento del giorno costruisci un `DayLayoutItem`: `startMin` da ore e minuti, `durationMin` da `sumDuration`, `contentPx` da `contentMinHeightPx` con gli stessi input di `dayScaleItems`, `column` e `columnCount` dal placement.
- `const laid = daySegments(items, bounds.startHour, bounds.endHour)`.
- L'altezza della colonna è `laid.height`. Non usare `pxPerMinute` né `blockGeometry` in questo ramo.
- A sinistra, per ogni segmento `empty`, un'etichetta `hourLabel(hour)` a `top + height / 2`. Per ogni `mark` di un `group`, l'etichetta `HH:MM` a `mark.top`. In fondo, l'etichetta di `bounds.endHour` a `laid.height`.
- Le ore vuote sono bottoni assoluti alti 36, stessa aria-label di oggi, che aprono `/appuntamenti/nuovo?data=${key}&ora=${hourLabel(hour)}`.
- Ogni chip usa `top` e `height` dell'item del gruppo, non la durata. Il resto di `AppointmentBlock` (nome, servizi, nota, bordo, sovrapposizione) resta.
- La linea rossa sta a `yAtMinute(laid.segments, nowHours * 60 + nowMinutes)` se il giorno è oggi e il minuto cade nella griglia.
- Lo scroll iniziale dell'oggi usa `yAtMinute` al posto di `openingScroll` uniforme: `scrollTop = clamp(yAtMinute(now) - viewport / 3)`.
- I hint prima delle 8 e dopo le 19 confrontano lo scroll con `yAtMinute(segments, 8 * 60)` e `yAtMinute(segments, 19 * 60)`.
- Settimana e Mese non si toccano. `pxPerMinuteForDay` resta nel file per i test già verdi.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.ts src/pages/appointments.test.tsx src/lib/calendarLayout.test.ts src/lib/calendarView.test.ts src/components/calendar/WeekRows.test.tsx`
Expected: PASS. Se il path del test pagina è solo `.tsx`, lancia quello.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: la vista giorno comprime le ore accanto alla chip"
```

### Task 3: Nome file e interruttore pagamento

**Files:**
- Modify: `src/lib/earningsExport.ts`
- Modify: `src/lib/earningsPdf.ts`
- Modify: `src/data/local/settings.ts`
- Modify: `src/components/earnings/ExportSheet.tsx`
- Test: `src/lib/earningsExport.test.ts`, `src/lib/earningsPdf.test.ts`, `src/data/local/settings.test.ts`, `src/components/earnings/ExportSheet.test.tsx`

**Interfaces:**
- Consumes: `ExportInclude`, `toCsv`, `toPdf`, `exportFileName`, `readExportPrefs`
- Produces:
  - `filePrefix(name: string | undefined): string`
  - `exportFileName(kind, from, to, formato, businessName?: string)` con prefisso `filePrefix`
  - `ExportInclude.pagamento?: boolean`. Assente o true = colonna e riga presenti. `false` = assenti.
  - `wantsPayment(include: ExportInclude): boolean` è `include.pagamento !== false`

- [ ] **Step 1: Write the failing test**

In `earningsExport.test.ts`:

```typescript
import { filePrefix } from './earningsExport'

it('il nome file usa la ragione sociale e omette il pagamento se è spento', () => {
  expect(filePrefix('I Pelosetti')).toBe('I_Pelosetti')
  expect(filePrefix('  A/B: C  ')).toBe('AB_C')
  expect(filePrefix('   ')).toBe('Groomly')
  expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf', 'I Pelosetti')).toBe('I_Pelosetti_Incassi_2026-09.pdf')
  expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf')).toBe('Groomly_Incassi_2026-09.pdf')
  const data = buildExportData([], [], [], business, { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) }, include, 'mese', new Date(2026, 9, 17))
  const hidden = toCsv(data, { ...include, pagamento: false })
  expect(hidden).not.toContain('Pagamento')
  expect(toCsv(data, include)).toContain('Pagamento')
})
```

Adatta `buildExportData` al sample già presente nel file se la firma o i dati di prova sono quelli del test «il CSV separa POS». Il CSV senza pagamento non contiene la colonna; gli importi restano.

In `settings.test.ts`, una preferenza senza `pagamento` letta da `readExportPrefs` ha `include.pagamento === true`. Una con `pagamento: false` resta false.

In `earningsPdf.test.ts`, con `pagamento: false` il testo del PDF non contiene `POS` né l'intestazione `Pagamento`. Con il default li contiene, come oggi.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earningsExport.test.ts src/data/local/settings.test.ts src/lib/earningsPdf.test.ts`
Expected: FAIL su `filePrefix` o su `pagamento`.

- [ ] **Step 3: Write minimal implementation**

`filePrefix`: trim, spazi a `_`, togli `\ / : * ? " < > |` e i caratteri di controllo, fondi i `_`, togli i `_` agli estremi, se vuoto `Groomly`.

`exportFileName` aggiunge un ultimo argomento opzionale `businessName = ''` e usa `filePrefix(businessName)` al posto di `Groomly`.

`wantsPayment`: `include.pagamento !== false`.

`toCsv`: se `wantsPayment` è false, togli `Pagamento` dall'intestazione e la cella pagamento da ogni riga e dal totale. Le altre colonne restano allineate.

`toPdf`: se `wantsPayment` è false, non disegnare `paymentLine` e non avanzare quegli 8 pt. Nel dettaglio, togli la colonna Pagamento e la cella vuota accanto a subtotale e totale. I mancati restano con le colonne di oggi.

`readExportPrefs`: `pagamento: include.pagamento !== false`. `DEFAULT_EXPORT.include.pagamento = true`.

`ExportSheet`: dopo Dettaglio, `IncludeRow` label `Tipo di pagamento`, hint `Colonna nel dettaglio e riga POS / contanti nel PDF`. Il suggerimento del dettaglio diventa `Data, ora, cane, proprietario, servizi, importo`. `exportFileName(..., settings.business.name)`. `flip` accetta la chiave `pagamento`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earningsExport.test.ts src/lib/earningsPdf.test.ts src/lib/earningsPdf.pages.test.ts src/data/local/settings.test.ts src/components/earnings/ExportSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: nome del salone nel file e pagamento opzionale"
```

### Task 4: Excel formattato

**Files:**
- Create: `src/lib/earningsXlsx.ts`
- Modify: `src/components/earnings/ExportSheet.tsx`
- Test: `src/lib/earningsXlsx.test.ts`
- Dependency: `exceljs`

**Interfaces:**
- Consumes: `ExportData`, `ExportInclude`, `wantsPayment` da `src/lib/earningsExport.ts`
- Produces: `toXlsx(data: ExportData, include: ExportInclude): Promise<Blob>`

- [ ] **Step 1: Write the failing test**

`src/lib/earningsXlsx.test.ts` costruisce un `ExportData` minimo (copia il sample di `earningsPdf.test.ts`) e:

```typescript
it('formatta titolo, intestazioni, filtro e numeri', async () => {
  const blob = await toXlsx(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: true })
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(await blob.arrayBuffer())
  const sheet = book.worksheets[0]
  expect(sheet.getCell('A1').value).toBe('Riepilogo incassi')
  expect(sheet.getCell('A1').font?.bold).toBe(true)
  expect(sheet.getCell('A1').fill && 'fgColor' in sheet.getCell('A1').fill && sheet.getCell('A1').fill.fgColor?.argb).toBe('FF1F2937')
  const header = sheet.getRow(sheet.rowCount) // trova la riga il cui primo valore è Data
  // assert più sotto, cercando la riga
})
```

Cerca la riga la cui cella A è `Data`. Quella riga è grassetto, fill `FF1F2937`, font bianco. La riga sotto ha una data vera (`instanceof Date`) e l'importo è un numero. `sheet.autoFilter` copre dalla riga `Data` fino all'ultima riga dati, non la riga `Totale`. Con `pagamento: false` nessuna cella della riga intestazione vale `Pagamento`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/earningsXlsx.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`npm install exceljs`

`toXlsx` con ExcelJS, un foglio:

1. Riga 1: `Riepilogo incassi`, bold, font bianco, fill `FF1F2937`, merge sulla larghezza della tabella più larga (dettaglio se acceso, altrimenti 3).
2. Periodo in A2.
3. Se `include.attivita` e `data.business`: Attività, P. IVA, indirizzo, telefono.
4. Se `include.dettaglio`: intestazioni Data, Ora, Cane, Proprietario, Servizi, Durata (min), Importo (€), e Pagamento solo se `wantsPayment`, poi Stato, e Importo mancato (€) se `include.mancati`. Fill e font come il titolo. Righe da `data.rows` poi `data.missed`. Data: `Date` con numFmt `dd/mm/yyyy` parsando `gg/mm/aaaa`. Ora testo. Durata e importi numeri, importi numFmt `#,##0.00`. Servizi wrap, width 36. Larghezze: Data 12, Ora 8, Cane 18, Proprietario 22, Servizi 36, Durata 14, Importo 14, Pagamento 16, Stato 22, Importo mancato 20.
5. `autoFilter` dalla riga intestazione all'ultima riga dati. La riga Totale sta sotto, fuori dal filtro: etichetta `Totale`, importo `data.incassato`.
6. `views = [{ state: 'frozen', ySplit: headerRowNumber }]`.
7. Se `include.riepilogo`, una riga vuota poi Servizio/Volte/Importo e il gruppo (Settimana o Mese), con totale dove `toCsv` lo scrive. Senza filtro.

`ExportSheet.makeFile`: se `formato === 'csv'`, `await toXlsx` e nome con estensione `xlsx` (`exportFileName(..., 'xlsx', settings.business.name)`). Il testo di attesa diventa `Preparo l'Excel…`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/earningsXlsx.test.ts src/components/earnings/ExportSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Includi `package.json` e `package-lock.json`.

```bash
git commit -m "feat: l'Excel degli incassi è già formattato"
```

### Task 5: Il pannello non fa scorrere la pagina

**Files:**
- Modify: `src/components/layout/Sheet.tsx`
- Test: `src/components/layout/dialog.test.tsx`

**Interfaces:**
- Consumes: niente
- Produces: con `Sheet` aperto, `document.body.style.overflow === 'hidden'` e il corpo del dialogo ha `overflow: auto` e `overscroll-behavior: contain`

- [ ] **Step 1: Write the failing test**

Nel test dello Sheet in `dialog.test.tsx`, con contenuto più alto dello schermo:

```typescript
it('con il pannello aperto la pagina sotto non scorre', () => {
  render(<Sheet open title="Esporta per il commercialista" onClose={() => undefined}><div style={{ height: 2000 }}>lungo</div></Sheet>)
  expect(document.body.style.overflow).toBe('hidden')
  const body = screen.getByText('lungo').parentElement
  expect(body?.getAttribute('style')).toContain('overflow: auto')
  expect(body?.getAttribute('style')).toContain('overscroll-behavior: contain')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/dialog.test.tsx`
Expected: FAIL, overflow del body non è hidden.

- [ ] **Step 3: Write minimal implementation**

In `Sheet`, quando `open`:

- `useEffect` salva `document.body.style.overflow` e lo mette a `hidden`. Al cleanup ripristina.
- Il pannello ha `maxHeight: '90vh'`, `overflow: 'hidden'`.
- Il div del contenuto ha `overflow: 'auto'`, `minHeight: 0`, `flex: 1`, `overscrollBehavior: 'contain'`, `WebkitOverflowScrolling: 'touch'`.
- Lo sfondo (`button` o backdrop) ha `onWheel` con `preventDefault` e `onTouchMove` con `preventDefault`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/dialog.test.tsx src/components/earnings/ExportSheet.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: il pannello aperto non fa scorrere la pagina sotto"
```

### Task 6: Contatti e storico nella scheda

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `ContactRow`, `History`, `SectionTitle`, `Card`, `Chip` già nel file
- Produces: card contatto e storico apribile, stessi aria-label `Storico`, `Chiama ${nome}`, `Nessun trattamento`

- [ ] **Step 1: Write the failing test**

Aggiungi in `DogsPage.test.tsx` un test che, su un cane con due contatti di cui uno `isPrimary`:

- il principale ha `border-left` con `var(--pri)` e il testo `Principale`;
- l'altro ha `border-left` con `var(--line2)`;
- c'è il link `Chiama ${nome}`.

Aggiorna i test dello storico già presenti, non duplicarli:

- Prima del click, l'ultima visita (data e servizio) è visibile. La freccia `▲` e la matita `Correggi prezzo` no.
- `queryByText('Bagno e tosatura')` prima del click diventa una presenza se quella è l'ultima visita; il servizio più vecchio resta assente fino al click.
- La stringa `2 visite` / `3 visite` / `2 visite · 1 non venuto` prima del click diventa il conteggio sul titolo (il numero) e, se c'è più di una riga, `Altre N visite` o `Altra 1 visita`.
- Dopo il click la timeline resta: ordine delle date, `Non venuto`, niente `€ 80` sul non venuto, niente matita sul non venuto, `€` con Forbici e `55m` sul completato.
- Zero trattamenti: niente bottone `Storico`, c'è `Nessun trattamento`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "storico|contatt"`
Expected: FAIL sui nuovi assert delle card, oppure sulle stringhe vecchie finché non le aggiorni insieme al componente. Aggiorna il test e il componente nello stesso task; il primo lancio del test nuovo delle card deve fallire prima della card.

- [ ] **Step 3: Write minimal implementation**

`ContactRow` in lettura e in modifica: card con bordo sinistro 4 px, `var(--pri)` se `isPrimary`, altrimenti `var(--line2)`. Nome in grassetto. Chip telefono se c'è. Chip ruolo se c'è. Chip `Principale` se primario. A destra, se c'è il telefono e `call`, il link rotondo `tel:` con aria-label `Chiama ${nome}`. `Togli` resta in modifica. La testata con WhatsApp non si tocca.

`History`:

- Zero righe: `SectionTitle` Storico e una `Card` con `Nessun trattamento`. Non è un bottone.
- Chiuso: `SectionTitle` con `count={entries.length}`. La card è un `button` aria-label `Storico`, `aria-expanded={false}`. Dentro, l'ultima riga: data in `var(--pri)`, nomi servizi, dettaglio di `historyDetail` oppure `Non venuto` in `var(--bad)` con nome barrato. Se `entries.length > 1`, sotto `Altra 1 visita` o `Altre ${entries.length - 1} visite`. Chevron a destra. Niente foto, niente matita, niente freccia.
- Aperto: lo stesso bottone `Storico` con `aria-expanded={true}` richiude. Sotto, fuori dal bottone, la timeline attuale (tutte le righe, prima compresa una sola volta) con foto, matita, freccia e foglio prezzo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: contatti a card e storico che si apre sulla timeline"
```
