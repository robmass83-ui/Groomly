# Agenda altezza dinamica + mensili fissati — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** I mensili con appuntamento futuro contano come fissati anche senza storico completato (Home + Avvisi); in agenda giorno/settimana le card non tagliano il contenuto perché altezza e griglia oraria crescono con il contenuto.

**Architecture:** (1) Una riga in `monthlyStatus` classifica «nuovo + booked» come `fissato` — Home/`MonthlyPage` si aggiornano da sole. (2) Helper puri in `calendarLayout.ts` stimano l’altezza minima del contenuto e alzano i `px` per minuto del giorno; `CalendarPage` usa quel scale per top/height/griglia e mostra sempre il layout completo in vista giorno.

**Tech Stack:** React + TypeScript, Vitest + happy-dom + Testing Library, date-fns (già in repo).

**Spec:** `docs/superpowers/specs/2026-10-13-agenda-altezza-mensili-fissati-design.md`

## Global Constraints

- M1–M4 e A1–A3 della spec: prenotato senza storico = fissato; Nuovi solo senza appuntamento; altezza = max(durata, contenuto); griglia espansa; niente testo tagliato.
- Non aggiungere campi a `Dog` / `Appointment`. Non cambiare `daysBefore` né copy del banner.
- Vista mese e liste `WeekRows` non-timeline: fuori scope.
- Lingua UI e messaggi commit: italiano dove già usato; commit in inglese stile repo recente se i commit recenti sono in inglese — guarda `git log -5 --oneline` e allineati.
- Comandi da `d:\Groomly` (PowerShell). Test mirati con `npx vitest run …` prima di `npm test`.
- Non committare `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`. `git add` con percorsi espliciti.
- A fine aggiornamento consegnato: regola workspace `publish-update` (versione, test, APK, push, release, Firebase).

---

## File Structure

| File | Responsabilità |
|---|---|
| Modify `src/lib/cycle.ts` | `monthlyStatus`: senza completato + booked → `fissato` |
| Modify `src/lib/cycle.test.ts` | Assert nuovo comportamento |
| Modify `src/pages/monthly.test.tsx` | Dina con solo programmato va in Fissati; contatori `2/4` |
| Modify `src/pages/HomePage.test.tsx` | Solo se assert su `X/Y` si rompono (stesso dato di monthly) |
| Create `src/lib/calendarLayout.ts` | Stima altezza contenuto + `pxPerMinute` + geometria blocco |
| Create `src/lib/calendarLayout.test.ts` | Unit test helper |
| Modify `src/pages/CalendarPage.tsx` | Usa helper; layout full in giorno; overflow sistemato |
| Modify `src/pages/appointments.test.tsx` | Altezze/contenuto non più clippati; assert aggiornati |
| Spec già scritta | `docs/superpowers/specs/2026-10-13-agenda-altezza-mensili-fissati-design.md` |

Home/`MonthlyPage` non richiedono cambi di codice se usano già `monthlyStatus` + `group === 'fissato'` (verificare dopo Task 1; tocca solo i test).

---

### Task 1: Mensili — `monthlyStatus` tratta booked senza storico come fissato

**Files:**
- Modify: `src/lib/cycle.ts` (funzione `monthlyStatus`)
- Modify: `src/lib/cycle.test.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `bookedOf`, `lastCompletedOf`, tipi `MonthlyRow` / `MonthlyGroup` esistenti
- Produces: `monthlyStatus(...).group === 'fissato'` quando c’è `programmato` futuro e nessun `completato`; `booked` valorizzato; `due: null`; `late: false`

- [ ] **Step 1: Aggiorna il test che oggi aspetta `nuovo` con solo programmato**

In `src/lib/cycle.test.ts`, sostituisci il blocco del test `'senza completati è nuovo e non accende il banner'` con:

```ts
  it('senza completati: senza appuntamento è nuovo; con programmato futuro è fissato; banner spento', () => {
    expect(monthlyStatus(mensile, [], now, 7)?.group).toBe('nuovo')
    expect(monthlyStatus(mensile, [], now, 7)?.due).toBeNull()
    expect(monthlyStatus(mensile, [], now, 7)?.booked).toBeNull()

    const bookedOnly = monthlyStatus(mensile, [programmato(new Date(2026, 9, 20, 10))], now, 7)
    expect(bookedOnly?.group).toBe('fissato')
    expect(bookedOnly?.due).toBeNull()
    expect(bookedOnly?.booked?.start).toEqual(new Date(2026, 9, 20, 10))
    expect(bookedOnly?.late).toBe(false)

    expect(dueSoon([mensile], [], now, 7)).toEqual([])
    expect(dueSoon([mensile], [programmato(new Date(2026, 9, 20, 10))], now, 7)).toEqual([])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cycle.test.ts -t "senza completati"`

Expected: FAIL — `expected 'nuovo' to be 'fissato'` (o equivalente) sulla riga del programmato.

- [ ] **Step 3: Implementazione minima in `monthlyStatus`**

In `src/lib/cycle.ts`, sostituisci il ramo senza completato:

```ts
  if (!lastCompleted) {
    if (booked) {
      return { dog, due: null, lastCompleted: null, booked, late: false, group: 'fissato' }
    }
    return { dog, due: null, lastCompleted: null, booked: null, late: false, group: 'nuovo' }
  }
```

Lascia invariato tutto il resto della funzione.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cycle.test.ts`

Expected: PASS (tutto il file).

- [ ] **Step 5: Commit**

```powershell
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "$(cat <<'EOF'
fix: count booked mensili without history as fissato

EOF
)"
```

Se PowerShell non supporta l’heredoc bash, usa:

```powershell
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "fix: count booked mensili without history as fissato"
```

---

### Task 2: Mensili — allinea i test di pagina (Dina in Fissati, contatori)

**Files:**
- Modify: `src/pages/monthly.test.tsx` (test intorno a Dina / `1/3`)
- Modify: `src/pages/HomePage.test.tsx` solo se fallisce dopo il cambio
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: `monthlyStatus` aggiornato (Task 1)
- Produces: nessun cambio UI di codice se già corretto; assert allineati a M1/M4

Contesto del test esistente (fake time 10 ott 2026): Cleo fissata con storico, Ada+Bea in `dueSoon`, Dina solo programmato (prima in Nuovi), Eva senza appuntamenti (Nuovi). Dopo M1: Dina → Fissati; Eva resta Nuovi; Home/Avvisi `2/4` e `2 da fissare`.

- [ ] **Step 1: Aggiorna gli assert in `monthly.test.tsx`**

Nel test che contiene `expect(screen.getByText('1/3'))` e `fresh.getByText('Dina')` (circa righe 437–462), aggiorna così:

```ts
    expect(screen.getByText('2/4')).toBeInTheDocument()
    // ...
    expect(fresh.getByText('Eva')).toBeInTheDocument()
    expect(fresh.queryByText('Dina')).not.toBeInTheDocument()
    expect(screen.getByText('2/4')).toBeInTheDocument()
    expect(screen.getByText('2 da fissare')).toBeInTheDocument()
    expect(screen.queryByText('Fox')).not.toBeInTheDocument()
    expect(screen.getAllByText('Cleo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dina').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /^Fissati/ })).toBeInTheDocument()
```

Sulla Home nello stesso test, cambia anche il primo `1/3` in `2/4` (riga che fa `findByText` / `getByText('1/3')` prima del click Vedi).

Se altri test di `monthly.test.tsx` o `HomePage.test.tsx` assumono «programmato senza completato = Nuovi», aggiornali allo stesso modo (cerca `Nuovi` + createAppointment senza `completeAppointment`).

- [ ] **Step 2: Run page tests**

Run: `npx vitest run src/pages/monthly.test.tsx src/pages/HomePage.test.tsx`

Expected: PASS. Se qualcosa fallisce ancora su `1/3` o Dina in Nuovi, correggi solo gli assert (il codice pagina non dovrebbe cambiare).

- [ ] **Step 3: Commit**

```powershell
git add src/pages/monthly.test.tsx src/pages/HomePage.test.tsx
git commit -m "test: expect booked-without-history mensili under Fissati"
```

(Ometti `HomePage.test.tsx` dal `git add` se non modificato.)

---

### Task 3: Agenda — helper puri altezza contenuto e scala del giorno

**Files:**
- Create: `src/lib/calendarLayout.ts`
- Create: `src/lib/calendarLayout.test.ts`
- Test: `src/lib/calendarLayout.test.ts`

**Interfaces:**
- Consumes: nessuno (puro)
- Produces:
  - `contentMinHeightPx(input: { serviceCount: number; hasNote: boolean; hasMark: boolean; compact: boolean }): number`
  - `pxPerMinuteForDay(items: { durationMin: number; contentMinPx: number }[], baseHourPx: number): number`
  - `blockGeometry(startMinutes: number, durationMin: number, boundsStartHour: number, pxPerMinute: number, minBlock: number): { top: number; height: number }`

Algoritmo (A1–A2, variante uniforme — più semplice e senza overlap):

1. `contentMinHeightPx`: stima fissa del layout **full** (giorno): padding verticale 6; riga nome 16; se `hasMark` +14; se `serviceCount > 0` +22; se `hasNote` +16; gap 2 tra sezioni. Se `compact: true` (solo settimana stretta): max(18, 16 + (serviceCount > 0 ? 0 : 0)) — in pratica ~18–22; i test unitari fissano i numeri esatti sotto.
2. `pxPerMinuteForDay`: `base = baseHourPx / 60`; per ogni item `need = contentMinPx / max(durationMin, 1)`; ritorna `max(base, …need)`.
3. `blockGeometry`: `top = (startMinutes - boundsStartHour * 60) * pxPerMinute`; `height = max(durationMin * pxPerMinute, minBlock)`.

- [ ] **Step 1: Write failing unit tests**

Crea `src/lib/calendarLayout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { blockGeometry, contentMinHeightPx, pxPerMinuteForDay } from './calendarLayout'

describe('calendarLayout', () => {
  it('contentMinHeightPx cresce con servizi e nota', () => {
    const bare = contentMinHeightPx({ serviceCount: 0, hasNote: false, hasMark: false, compact: false })
    const rich = contentMinHeightPx({ serviceCount: 2, hasNote: true, hasMark: true, compact: false })
    expect(rich).toBeGreaterThan(bare)
    expect(rich).toBeGreaterThan(50)
  })

  it('pxPerMinuteForDay alza la scala se un blocco breve ha molto contenuto', () => {
    const baseHour = 50
    const plain = pxPerMinuteForDay([{ durationMin: 60, contentMinPx: 40 }], baseHour)
    expect(plain).toBeCloseTo(50 / 60, 5)
    const tight = pxPerMinuteForDay([{ durationMin: 30, contentMinPx: 60 }], baseHour)
    expect(tight).toBeGreaterThan(50 / 60)
    expect(30 * tight).toBeGreaterThanOrEqual(60)
  })

  it('blockGeometry usa pxPerMinute per top e height con pavimento minBlock', () => {
    const geo = blockGeometry(9 * 60 + 30, 45, 8, 50 / 60, 18)
    expect(geo.top).toBeCloseTo(75, 5)
    expect(geo.height).toBeCloseTo(37.5, 5)
    const tiny = blockGeometry(9 * 60, 5, 8, 50 / 60, 18)
    expect(tiny.height).toBe(18)
  })
})
```

I numeri esatti di `contentMinHeightPx` li definisci nell’implementazione; l’importante è `rich > bare` e `rich > 50`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarLayout.test.ts`

Expected: FAIL — modulo non trovato / export mancanti.

- [ ] **Step 3: Implement `src/lib/calendarLayout.ts`**

```ts
export function contentMinHeightPx(input: {
  serviceCount: number
  hasNote: boolean
  hasMark: boolean
  compact: boolean
}): number {
  if (input.compact) {
    return 18
  }
  let height = 6 + 16
  if (input.hasMark) height += 2 + 14
  if (input.serviceCount > 0) height += 2 + 22
  if (input.hasNote) height += 2 + 16
  return height
}

export function pxPerMinuteForDay(
  items: { durationMin: number; contentMinPx: number }[],
  baseHourPx: number,
): number {
  let ppm = baseHourPx / 60
  for (const item of items) {
    const duration = Math.max(item.durationMin, 1)
    ppm = Math.max(ppm, item.contentMinPx / duration)
  }
  return ppm
}

export function blockGeometry(
  startMinutes: number,
  durationMin: number,
  boundsStartHour: number,
  pxPerMinute: number,
  minBlock: number,
): { top: number; height: number } {
  const top = (startMinutes - boundsStartHour * 60) * pxPerMinute
  const height = Math.max(durationMin * pxPerMinute, minBlock)
  return { top, height }
}
```

Se i test su `rich > 50` falliscono, alza leggermente le costanti (non abbassare la soglia del test).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarLayout.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calendarLayout.ts src/lib/calendarLayout.test.ts
git commit -m "feat: add calendar day scale helpers for content-sized blocks"
```

---

### Task 4: Agenda — collega `CalendarPage` e aggiorna i test UI

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/appointments.test.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `contentMinHeightPx`, `pxPerMinuteForDay`, `blockGeometry` da `../lib/calendarLayout`; `sumDuration`, `splitCritical`, `HOUR`, `MIN_BLOCK`
- Produces: card giorno con altezza ≥ contenuto; griglia alta `(endHour-startHour)*60*pxPerMinute`; testo nota/servizi visibile; niente `overflow: 'hidden'` che taglia il contenuto utile (usa `overflow: 'visible'` sul bottone, oppure tieni `hidden` solo se `height` è già ≥ contenuto)

- [ ] **Step 1: Aggiorna / aggiungi test UI che falliscono con il comportamento attuale**

In `src/pages/appointments.test.tsx`:

1. Nel test `'nel giorno la card corta tiene il nome e un +1…'`:
   - Cambia le aspettative: la card corta (45 min) deve mostrare **entrambe** le chip (layout full), non `+1`.
   - `expect(compact.style.height)` non deve più essere `'37.5px'`: invece `expect(parseFloat(compact.style.height)).toBeGreaterThanOrEqual(60)` (o `>= contentMin` coerente con l’helper).
   - La card da 60 min resta con entrambe le chip; l’altezza sarà `>= 50`.

Esempio di assert sostitutivi per la card corta:

```ts
    expect(within(compact).getByText('Bagno')).toBeInTheDocument()
    expect(within(compact).getByText('Taglio / tosatura')).toBeInTheDocument()
    expect(within(compact).queryByText('+1')).not.toBeInTheDocument()
    expect(parseFloat(compact.style.height)).toBeGreaterThan(37.5)
```

2. Aggiungi un test nuovo (stesso `describe`):

```ts
  it('nel giorno una card breve con nota non taglia il testo della nota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna Piccola', { criticalNote: 'Sempre pieno di nodi' }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 14, 13, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno + tosatura', durationMin: 30, price: 35 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-14" />)
    const block = await screen.findByRole('button', { name: /Apri Luna Piccola/ })
    expect(within(block).getByText('Sempre pieno di nodi')).toBeInTheDocument()
    expect(parseFloat(block.style.height)).toBeGreaterThan(30 * (50 / 60))
    expect(block.style.overflow).not.toBe('hidden')
  })
```

Adatta `dog(...)` / `criticalNote` allo helper già usato nel file. Se `splitCritical` mostra solo il titolo, asserta quel titolo.

3. Il test `'un blocco molto corto è alto almeno 18 px…'`: con layout full la height sarà **> 18**. Aggiorna a:

```ts
    expect(parseFloat(block.style.height)).toBeGreaterThanOrEqual(18)
    // top ancora proporzionale all’ora con la nuova scala del giorno
    expect(parseFloat(block.style.top)).toBeGreaterThan(0)
```

Oppure calcola top atteso con `pxPerMinuteForDay` sugli item del giorno.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/appointments.test.tsx -t "nel giorno"`

Expected: FAIL su altezza fissa / `+1` / overflow / nota tagliata.

- [ ] **Step 3: Implementazione in `CalendarPage.tsx`**

1. Import:

```ts
import { blockGeometry, contentMinHeightPx, pxPerMinuteForDay } from '../lib/calendarLayout'
```

2. In `DayColumn`, prima del `map` degli appuntamenti, calcola la scala del giorno:

```ts
  const scaleItems = rows.map((appointment) => {
    const dog = dogs.find((item) => item.id === appointment.dogId)
    const note = dog?.criticalNote ? splitCritical(dog.criticalNote).title : ''
    const mark = dog ? dogMark(dog, activeDogs) : null
    const durationMin = sumDuration(appointment.services)
    const contentMinPx = contentMinHeightPx({
      serviceCount: appointment.services.length,
      hasNote: Boolean(note),
      hasMark: Boolean(mark) && mode === 'giorno',
      compact: false,
    })
    return { durationMin, contentMinPx }
  })
  const ppm = pxPerMinuteForDay(scaleItems, HOUR)
  const hourPx = ppm * 60
  const columnHeight = (bounds.endHour - bounds.startHour) * hourPx
```

3. Sulla colonna: `height: columnHeight` e `backgroundImage` con `${hourPx}px` al posto di `${HOUR}px`.

4. Slot ora vuoti: `top: (hour - bounds.startHour) * hourPx`, `height: hourPx`.

5. Per ogni appuntamento:

```ts
        const startMinutes = appointment.start.getHours() * 60 + appointment.start.getMinutes()
        const { top, height } = blockGeometry(
          startMinutes,
          sumDuration(appointment.services),
          bounds.startHour,
          ppm,
          MIN_BLOCK,
        )
```

6. In `AppointmentBlock` (vista giorno): forza layout full — es. `const layout = mode === 'giorno' || height >= 48 ? 'full' : eventLayout(sumDuration(appointment.services))` oppure semplicemente `mode === 'giorno' ? 'full' : eventLayout(...)`.

7. Stile: `overflow: mode === 'giorno' ? 'visible' : 'hidden'` oppure sempre `visible` se height ≥ contenuto.

8. Linea «ora attuale» (`nowTop`): se usa `HOUR`, aggiorna per usare `hourPx` / `ppm` (stessa scala). Controlla `nowTop` in `CalendarPage` / importati e allinea.

9. In `CalendarPage`, `gridHeight` e `openingScroll({ hourHeight: … })` devono usare la stessa scala del giorno visibile (per vista giorno: ricalcola `ppm` sugli appuntamenti di quel giorno; per settimana: max tra i giorni o per-colonna — se la settimana riusa `DayColumn`, ogni colonna ha il suo `ppm` e l’altezza della griglia esterna deve essere il **max** delle `columnHeight` delle colonne, altrimenti allinea tutte le colonne al `ppm` massimo della settimana). Scelta consigliata: **in settimana, un solo `ppm` = max sui 7 giorni**, passato a ogni `DayColumn` come prop `pxPerMinute`, così le ore restano allineate orizzontalmente.

Esempio prop:

```ts
function DayColumn({ …, pxPerMinute }: { …; pxPerMinute?: number }) {
  const ppm = pxPerMinute ?? pxPerMinuteForDay(scaleItems, HOUR)
  …
}
```

Nel parent settimana: calcola `weekPpm` dal max di tutti i giorni, passalo a ogni colonna; altezza griglia = `(end-start)*60*weekPpm`.

- [ ] **Step 4: Run appointments + layout tests**

Run: `npx vitest run src/lib/calendarLayout.test.ts src/pages/appointments.test.tsx`

Expected: PASS. Se falliscono test su `top`/`scrollTop`/`hourHeight` fissi a 50, aggiorna quegli assert alla nuova scala (non tornare a comprimere le card).

- [ ] **Step 5: Commit**

```powershell
git add src/pages/CalendarPage.tsx src/pages/appointments.test.tsx src/lib/calendarLayout.ts src/lib/calendarLayout.test.ts
git commit -m "fix: expand agenda day scale so short appointments show full content"
```

---

### Task 5: Verifica completa e pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json` (bump patch insieme)
- Artifact locale non in commit: `groomly.apk` in radice

**Interfaces:**
- Consumes: Task 1–4 completi e verdi
- Produces: release `vX.Y.Z` + Firebase hosting `release.json`

- [ ] **Step 1: Suite test**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Bump versione (patch)**

Leggi la versione corrente in `src/lib/appVersion.ts` / `package.json`. Incrementa la patch (es. `1.2.3` → `1.2.4`, `versionCode = major*10000 + minor*100 + patch`). Aggiorna insieme:

- `src/lib/appVersion.ts` → `APP_VERSION`
- `package.json` → `version`
- `android/app/build.gradle` → `versionName` + `versionCode`
- `hosting/release.json` → `version` + `url` GitHub `…/download/vX.Y.Z/groomly.apk`

- [ ] **Step 3: Build APK**

```powershell
npm run build
npx cap sync android
cd android; .\gradlew assembleDebug; cd ..
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk .\groomly.apk -Force
```

- [ ] **Step 4: Commit + push + release + Firebase**

```powershell
git add src/lib/cycle.ts src/lib/cycle.test.ts src/lib/calendarLayout.ts src/lib/calendarLayout.test.ts src/pages/CalendarPage.tsx src/pages/appointments.test.tsx src/pages/monthly.test.tsx src/pages/HomePage.test.tsx src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json docs/superpowers/specs/2026-10-13-agenda-altezza-mensili-fissati-design.md docs/superpowers/plans/2026-10-13-agenda-altezza-mensili-fissati.md
git status
git commit -m "release: agenda content height and mensili fissati counters"
git push origin HEAD
gh release create vX.Y.Z groomly.apk --repo robmass83-ui/Groomly --title "vX.Y.Z" --notes "Agenda: card brevi mostrano tutto il contenuto. Mensili: appuntamento futuro conta come fissato anche senza storico."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Non aggiungere `groomly.apk` al commit. Se `gh` o Firebase non sono autenticati, fermati e segnalalo.

- [ ] **Step 5: Smoke manuale (checklist spec §4)**

1. Calendario giorno 14 ott: card breve con nota — testo intero.
2. Home Mensili ott ≠ `0/0` con appuntamenti mensili nel mese.
3. Avvisi → Fissati elenca chi ha data; Nuovi solo senza appuntamento.

---

## Spec coverage (self-review)

| Spec | Task |
|---|---|
| M1 booked senza storico → fissato | Task 1 |
| M2 senza appuntamento → nuovo | Task 1 |
| M3 con completato invariato | Task 1 (nessun cambio al ramo) |
| M4 Home + Avvisi contatori/filtro | Task 1–2 |
| A1 max(durata, contenuto) | Task 3–4 |
| A2 griglia espansa, no overlap | Task 3–4 (`pxPerMinuteForDay`) |
| A3 layout completo / no truncate | Task 4 |
| Test cycle + pagina + agenda | Task 1, 2, 4 |
| Fuori scope mese/banner/campi | rispettato |
| Pubblicazione | Task 5 |

Nessun TBD / placeholder operativo rimasto. Tipi helper allineati tra Task 3 e 4 (`contentMinHeightPx`, `pxPerMinuteForDay`, `blockGeometry`).
