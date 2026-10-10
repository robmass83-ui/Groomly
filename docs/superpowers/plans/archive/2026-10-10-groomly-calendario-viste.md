# Calendario: giorno, settimana, mese — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le frecce del calendario seguono la vista, il giorno si cambia con uno swipe, la settimana mostra i giorni in riga con le carte che si espandono, e il mese segna gli appuntamenti con un tondo verde.

**Architecture:** Tre funzioni pure in `calendarView.ts` (`shiftCalendar`, `daySwipe`, `weekCardLayout`, `monthCellFace`). `WeekRows` disegna solo la vista settimana. `CalendarPage` collega frecce, swipe e celle. Nessun dato nuovo. A fine lavoro si pubblica la 1.1.7.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, date-fns, Vite, Capacitor Android debug APK, `gh` release, Firebase Hosting.

## Global Constraints

- Elimina resta nel menu `···`. Non aggiungere un bottone Elimina accanto a Modifica o Disdici. Non toccare `AppointmentPage` né `deleteAppointment`.
- D1. Frecce: giorno ±1, settimana ±7, mese ±1. Titolo = mese della data selezionata.
- D2. Swipe del giorno solo sulla griglia vuota, vista Giorno. Soglia 48 px e |dx| > |dy|. dx negativo = giorno dopo. dx positivo = giorno prima. Il gesto che parte su un appuntamento resta lo spostamento già esistente.
- D3. In settimana niente griglia ore e niente striscia dei sette giorni. Sette righe, lunedì in alto. Carte in ordine di inizio, una riga sola.
- D4. Carta: nome intero senza andare a capo e senza ellissi, sticker del carattere, ora, tutti i servizi, nota critica (titolo di `splitCritical`) su una riga con ellissi. Testo piccolo.
- D5. Scheggia 34 px, buco 4 px, `overflow: hidden`, contenuto a larghezza intera con `scaleX(0.3)` e origine a sinistra. Swipe orizzontale oltre 48 px espande tutte le schegge a 80 ms di distanza e porta in vista la prima. Un secondo gesto durante l’animazione salta allo stato espanso. `prefers-reduced-motion: reduce` espande subito. Un tocco sotto i 48 px apre la carta; oltre i 48 px non la apre.
- D6. Giorno del mese con appuntamenti: sfondo `var(--ok-s)`, data `var(--ok)` peso 800, tondo `var(--ok)` 18 px testo bianco. Da 10 in su il tondo cresce, padding orizzontale 2 px. Giorno di un altro mese: solo il tondo, testo `var(--tx3)`, niente sfondo verde. Selezionato: fondo `var(--pri-solid)`, data bianca, tondo con alone bianco 2 px. Oggi non selezionato: anello `inset 0 0 0 2px var(--pri)`. Oggi selezionato: niente anello. Weekend vuoto: `var(--surf)`. Conteggio = `onLocalDay`, tutti gli stati. Nome accessibile: data, e se N > 0 «, N appuntamento» o «, N appuntamenti».
- D7. Nessun modello nuovo. Si aggiorna solo `data` nell’indirizzo.
- Toccare lo spazio vuoto di una riga settimana apre `/appuntamenti/nuovo?data=` senza `ora`. In settimana non si trascina per spostare.
- Pubblicazione finale, solo a test verdi: da `1.1.6` a `1.1.7`, `versionCode` `10107`. APK `groomly.apk` in radice, fuori da `hosting/` e fuori dal commit. Release GitHub `v1.1.7` con asset `groomly.apk`. Poi Firebase `firestore:rules,firestore:indexes,storage,hosting`.

---

### Task 1: `monthCellFace`

**Files:**
- Modify: `src/lib/calendarView.ts`
- Test: `src/lib/calendarView.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `monthCellFace({ count, selected, today, inMonth, weekend }: { count: number; selected: boolean; today: boolean; inMonth: boolean; weekend: boolean }): { background: string; color: string; fontWeight: number; boxShadow?: string; badge: string | null; badgeHalo: boolean }`

- [ ] **Step 1: Write the failing test**

Aggiungi in `src/lib/calendarView.test.ts` l’import di `monthCellFace` e:

```ts
describe('monthCellFace', () => {
  it('un giorno del mese con appuntamenti è verde e ha il tondo', () => {
    expect(monthCellFace({ count: 2, selected: false, today: false, inMonth: true, weekend: true })).toEqual({
      background: 'var(--ok-s)',
      color: 'var(--ok)',
      fontWeight: 800,
      badge: '2',
      badgeHalo: false,
    })
  })

  it('zero appuntamenti non ha tondo, il weekend resta surf', () => {
    expect(monthCellFace({ count: 0, selected: false, today: false, inMonth: true, weekend: true })).toEqual({
      background: 'var(--surf)',
      color: 'var(--tx)',
      fontWeight: 600,
      badge: null,
      badgeHalo: false,
    })
  })

  it('il selezionato è blu e, se ha appuntamenti, il tondo ha l’alone', () => {
    expect(monthCellFace({ count: 1, selected: true, today: true, inMonth: true, weekend: true })).toEqual({
      background: 'var(--pri-solid)',
      color: '#fff',
      fontWeight: 800,
      badge: '1',
      badgeHalo: true,
    })
  })

  it('oggi non selezionato tiene l’anello, anche col verde', () => {
    const face = monthCellFace({ count: 2, selected: false, today: true, inMonth: true, weekend: false })
    expect(face.boxShadow).toBe('inset 0 0 0 2px var(--pri)')
    expect(face.background).toBe('var(--ok-s)')
  })

  it('un giorno fuori mese tiene il tondo e il testo grigio, senza sfondo verde', () => {
    expect(monthCellFace({ count: 3, selected: false, today: false, inMonth: false, weekend: false })).toMatchObject({
      background: 'transparent',
      color: 'var(--tx3)',
      badge: '3',
      badgeHalo: false,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarView.test.ts -t monthCellFace`
Expected: FAIL, `monthCellFace` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/calendarView.ts`:

```ts
export function monthCellFace(input: {
  count: number
  selected: boolean
  today: boolean
  inMonth: boolean
  weekend: boolean
}): { background: string; color: string; fontWeight: number; boxShadow?: string; badge: string | null; badgeHalo: boolean } {
  const has = input.count > 0
  const face: { background: string; color: string; fontWeight: number; boxShadow?: string; badge: string | null; badgeHalo: boolean } = {
    background: 'transparent',
    color: input.inMonth ? 'var(--tx)' : 'var(--tx3)',
    fontWeight: 600,
    badge: has ? String(input.count) : null,
    badgeHalo: input.selected && has,
  }
  if (input.weekend && !input.selected && !(has && input.inMonth)) face.background = 'var(--surf)'
  if (has && input.inMonth && !input.selected) {
    face.background = 'var(--ok-s)'
    face.color = 'var(--ok)'
    face.fontWeight = 800
  }
  if (input.selected) {
    face.background = 'var(--pri-solid)'
    face.color = '#fff'
    if (has) face.fontWeight = 800
  } else if (input.today) {
    face.boxShadow = 'inset 0 0 0 2px var(--pri)'
  }
  return face
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarView.test.ts -t monthCellFace`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarView.ts src/lib/calendarView.test.ts
git commit -m "feat: calcola la faccia verde della cella del mese"
```

### Task 2: `shiftCalendar` e `daySwipe`

**Files:**
- Modify: `src/lib/calendarView.ts`
- Test: `src/lib/calendarView.test.ts`

**Interfaces:**
- Consumes: `CalendarVista`
- Produces: `shiftCalendar(vista: CalendarVista, day: Date, delta: number): Date` e `daySwipe(dx: number, dy: number): -1 | 0 | 1`

- [ ] **Step 1: Write the failing test**

```ts
describe('shiftCalendar', () => {
  const day = new Date(2026, 9, 11)

  it('in giorno sposta di un giorno, in settimana di sette, in mese di un mese', () => {
    expect(shiftCalendar('giorno', day, 1).getDate()).toBe(12)
    expect(shiftCalendar('settimana', day, 1).getDate()).toBe(18)
    expect(shiftCalendar('settimana', day, -1).getDate()).toBe(4)
    const next = shiftCalendar('mese', day, 1)
    expect(next.getMonth()).toBe(10)
    expect(next.getDate()).toBe(11)
  })
})

describe('daySwipe', () => {
  it('a sinistra va avanti, a destra torna indietro, il verticale e la soglia no', () => {
    expect(daySwipe(-48, 10)).toBe(1)
    expect(daySwipe(48, 10)).toBe(-1)
    expect(daySwipe(-47, 0)).toBe(0)
    expect(daySwipe(-80, 80)).toBe(0)
    expect(daySwipe(10, 80)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarView.test.ts -t "shiftCalendar|daySwipe"`
Expected: FAIL, functions missing.

- [ ] **Step 3: Write minimal implementation**

```ts
export function shiftCalendar(vista: CalendarVista, day: Date, delta: number): Date {
  if (vista === 'settimana') return addDays(day, delta * 7)
  if (vista === 'mese') return addMonths(day, delta)
  return addDays(day, delta)
}

export function daySwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}
```

`addDays` e `addMonths` sono già importati da `date-fns` in `calendarView.ts`. Se `addMonths` manca, aggiungilo all’import.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarView.test.ts -t "shiftCalendar|daySwipe"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarView.ts src/lib/calendarView.test.ts
git commit -m "feat: frecce e swipe del calendario seguono la vista"
```

### Task 3: `weekCardLayout`

**Files:**
- Modify: `src/lib/calendarView.ts`
- Test: `src/lib/calendarView.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `weekCardLayout(fullWidths: number[], rowWidth: number): boolean[]` — `true` = carta intera, `false` = scheggia. Scheggia 34, buco 4.

- [ ] **Step 1: Write the failing test**

```ts
describe('weekCardLayout', () => {
  it('tiene intere le prime carte che entrano con le altre a 34 px', () => {
    expect(weekCardLayout([100, 100, 100], 242)).toEqual([true, true, false])
  })

  it('se entrano tutte, nessuna è schiacciata', () => {
    expect(weekCardLayout([80, 80], 200)).toEqual([true, true])
  })

  it('se la prima è più larga della riga, resta intera e le altre sono schegge', () => {
    expect(weekCardLayout([400, 100, 100], 200)).toEqual([true, false, false])
  })

  it('zero carte restituisce un array vuoto', () => {
    expect(weekCardLayout([], 200)).toEqual([])
  })
})
```

`[100, 100, 100]` in 242 è due carte intere più una scheggia: 100+4+100+4+34 = 242.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarView.test.ts -t weekCardLayout`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
const WEEK_SLIVER = 34
const WEEK_GAP = 4

export function weekCardLayout(fullWidths: number[], rowWidth: number): boolean[] {
  const count = fullWidths.length
  if (count === 0) return []
  if (fullWidths[0] > rowWidth) return fullWidths.map((_, index) => index === 0)
  const cost = (fullCount: number) => {
    let width = 0
    for (let index = 0; index < count; index += 1) {
      width += index < fullCount ? fullWidths[index] : WEEK_SLIVER
      if (index > 0) width += WEEK_GAP
    }
    return width
  }
  let fullCount = 0
  for (let candidate = count; candidate >= 0; candidate -= 1) {
    if (cost(candidate) <= rowWidth) {
      fullCount = candidate
      break
    }
  }
  if (fullCount === 0) return fullWidths.map((_, index) => index === 0)
  return fullWidths.map((_, index) => index < fullCount)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarView.test.ts -t weekCardLayout`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendarView.ts src/lib/calendarView.test.ts
git commit -m "feat: decide quali carte della settimana restano intere"
```

### Task 4: `WeekRows`

**Files:**
- Create: `src/components/calendar/WeekRows.tsx`
- Create: `src/components/calendar/WeekRows.test.tsx`

**Interfaces:**
- Consumes: `weekCardLayout`, `weekDays` non serve qui (i giorni arrivano già), `localDayKey`, `onLocalDay`, `splitCritical`, `ServiceChip`, `TemperamentIcon`, `format` ora `HH:mm`
- Produces:

```ts
export function WeekRows(props: {
  days: Date[]
  selected: Date
  appointments: Appointment[]
  dogs: Dog[]
  services: Service[]
  rowWidth?: number
  onSelectDay: (day: Date) => void
  onOpen: (id: string) => void
  onCreate: (day: Date) => void
}): JSX.Element
```

- [ ] **Step 1: Write the failing test**

`src/components/calendar/WeekRows.test.tsx`. Costruisci due appuntamenti dello stesso giorno con `start` diverso, cani con `temperament` e `criticalNote`, servizi. Passa `rowWidth={242}` e tre larghezze che il layout schiaccia: per forzare la scheggia, metti tre appuntamenti e `rowWidth={242}` solo se le carte misurate sono ~100. In jsdom la larghezza del nome non è 100. Non misurare il testo: il test passa `rowWidth` e il componente, in test, usa larghezza fissa 100 per carta quando `rowWidth` è passato? No: la spec vuole la larghezza minima = la riga del nome. In happy-dom `scrollWidth` è spesso 0, quindi tutte le carte entrano e nessuna è scheggia.

Per il test della scheggia, esporta da `WeekRows.tsx` anche niente: il layout è già provato nel task 3. Il test del componente verifica il contenuto e il gesto, passando `rowWidth={80}` e mockando `HTMLElement.prototype.scrollWidth`? Più semplice: se `rowWidth` è passato, ogni carta intera vale `Math.max(rowWidth, 1)` no.

Aggiungi un prop solo per i test? La spec non lo vieta se il comportamento resta. Usa questo: quando `rowWidth` è definito, la larghezza di ogni carta intera è 100. Quando non è definito, si misura `scrollWidth` del nome. Il test con `rowWidth={242}` e 3 appuntamenti si aspetta due carte senza `data-squashed` e una con `data-squashed="true"`. 100+4+100+4+34 = 242, quindi k=2. Sì.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Appointment, Dog, Service } from '../../types/models'
import { WeekRows } from './WeekRows'

const services: Service[] = []

function dog(id: string, name: string, temperament: Dog['temperament'], criticalNote = ''): Dog {
  return { id, name, temperament, criticalNote, status: 'attivo' } as Dog
}

function visit(id: string, dogId: string, hour: number, note = ''): Appointment {
  const dogNote = note
  return {
    id,
    dogId,
    start: new Date(2026, 9, 11, hour, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 1 }],
    status: 'programmato',
    createdAt: new Date(),
    updatedAt: new Date(),
    criticalNote: dogNote,
  } as Appointment
}
```

La nota critica sta sul cane, non sull’appuntamento. Nel componente leggi `dog.criticalNote` e passa il titolo di `splitCritical`. Nel test metti `criticalNote: 'Ti ammazza di baci. Resta'` sul cane e aspetta il testo `Ti ammazza di baci`.

Giorni: lunedì 5 – domenica 11 ottobre 2026. Gli appuntamenti sono domenica 11. `selected` = domenica 11.

Asserzioni:

- 7 bottoni il cui nome inizia per `Seleziona`
- `Apri Kratos` contiene il testo `Kratos`, un `img` con nome `Mordace`, il testo `10:00`, il testo `Bagno`
- la nota visibile è `Ti ammazza di baci` e non il resto dopo il punto
- con 3 appuntamenti e `rowWidth={242}`, l’ultimo bottone ha `data-squashed="true"`
- `pointerDown`/`pointerUp` con dx −60 su quell’ultimo bottone toglie `data-squashed` e non chiama `onOpen`
- un click senza movimento chiama `onOpen` con l’id
- click sullo spazio vuoto (bottone `Nuovo Domenica 11 ottobre`) chiama `onCreate`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/calendar/WeekRows.test.tsx`
Expected: FAIL, module missing.

- [ ] **Step 3: Write minimal implementation**

Crea `WeekRows.tsx`. Per ogni giorno filtra `onLocalDay`, ordina per start. Carta:

- `data-squashed={full ? 'false' : 'true'}`
- stile scheggia: `flex: 0 0 34px`, `width: 34`, `overflow: hidden`. Interno `width` della carta intera, `transform: scaleX(0.3)`, `transformOrigin: left center`
- stile intero: `flex: 0 0 auto`
- nome `whiteSpace: nowrap`, fontSize 10, fontWeight 800
- ora `HH:mm` con `format` da date-fns
- `TemperamentIcon` se c’è il cane
- `ServiceChip` per ogni servizio, icona dal catalogo `services`
- nota `splitCritical(dog.criticalNote).title` se non vuota, color `var(--bad)`, `whiteSpace: nowrap`, `textOverflow: ellipsis`, `overflow: hidden`
- stati: `disdetto` e `non_venuto` → `textDecoration: line-through` e colore `var(--tx3)`; `completato` → icona `Check` 12 px `var(--ok)` con `aria-label="Completato"`; cane non attivo → `Archive` con `aria-label="Cane archiviato"`

Gesto sulla riga (`onPointerDown` / `onPointerUp` sul contenitore): se |dx| ≥ 48 e |dx| > |dy|, `setExpanded(true)` e non propagare il click. Se `matchMedia('(prefers-reduced-motion: reduce)').matches`, niente timeout. Altrimenti togli `data-squashed` aggiungendo la classe espansa con delay `index * 80` solo per le schegge: stato `expanded` fa ignorare il layout e rende tutte intere. Un secondo gesto mentre `expanding` è true imposta subito `expanded`.

`rowWidth` passato: larghezza piena di ogni carta = 100, usata solo per `weekCardLayout`. `rowWidth` assente: misura il contenitore con `ResizeObserver` e la larghezza piena con `scrollWidth` del nome (minimo 72).

Giorno selezionato: `localDayKey` uguale, fondo `var(--pri-solid)`, testo bianco.

Bottone vuoto della riga: `aria-label={`Nuovo ${formatHomeDate(day)}`}`, chiama `onCreate(day)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/calendar/WeekRows.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/WeekRows.tsx src/components/calendar/WeekRows.test.tsx
git commit -m "feat: righe della settimana con carte che si espandono"
```

### Task 5: Collegare la pagina e aggiornare le prove vecchie

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `shiftCalendar`, `daySwipe`, `monthCellFace`, `WeekRows`
- Produces: la pagina del calendario secondo la specifica

- [ ] **Step 1: Write the failing tests**

In `src/pages/appointments.test.tsx` aggiungi, nel describe del calendario:

```tsx
it('le frecce del giorno spostano di un giorno', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11" />)
  await user.click(await screen.findByRole('button', { name: 'Giorno successivo' }))
  expect(await screen.findByRole('button', { name: 'Seleziona Lunedì 12 ottobre', pressed: true })).toBeInTheDocument()
})

it('le frecce della settimana spostano di sette giorni', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=settimana" />)
  await user.click(await screen.findByRole('button', { name: 'Settimana successiva' }))
  expect(await screen.findByRole('button', { name: 'Seleziona Domenica 18 ottobre', pressed: true })).toBeInTheDocument()
})

it('lo swipe a sinistra sulla griglia vuota passa al giorno dopo', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11" />)
  const grid = await screen.findByRole('grid', { name: 'Orari' })
  fireEvent.pointerDown(grid, { pointerId: 1, clientX: 200, clientY: 100 })
  fireEvent.pointerUp(grid, { pointerId: 1, clientX: 100, clientY: 110 })
  expect(await screen.findByRole('button', { name: 'Seleziona Lunedì 12 ottobre', pressed: true })).toBeInTheDocument()
})
```

E una prova mese:

```tsx
it('il mese mostra il tondo verde col conteggio e non sulla cella vuota', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 9, 10, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  })
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=mese" />)
  const busy = await screen.findByRole('button', { name: 'Sabato 10 ottobre, 1 appuntamento' })
  expect(busy.querySelector('[data-badge]')?.textContent).toBe('1')
  expect(busy.querySelector('[data-badge]')).toHaveStyle({ background: 'var(--ok)' })
  expect(screen.getByRole('button', { name: 'Venerdì 9 ottobre' }).querySelector('[data-badge]')).toBeNull()
})

it('Elimina non sta accanto a Modifica', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  const created = createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 9, 11, 10, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  })
  render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
  expect(await screen.findByRole('button', { name: 'Modifica' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Elimina' })).not.toBeInTheDocument()
})
```

Aggiorna le prove esistenti che contraddicono la specifica:

- `in settimana il blocco ha nome e icona, senza il servizio`: togli `expect(screen.getByText('08:00'))`. Il servizio `Bagno` resta. Aggiungi `expect(screen.queryByRole('grid', { name: 'Orari' })).not.toBeInTheDocument()`.
- `in settimana il trascinamento può cambiare giorno`: eliminala. In settimana non si trascina. Sostituiscila con: il click su `Apri Rex` in settimana non cambia la data salvata.
- `in settimana un appuntamento senza sovrapposizioni mostra le prime lettere`: aspetta il testo `Ercole`, non `/Erco/`.
- `in settimana un blocco diviso mostra le iniziali`: aspetta `Bella Rosa` e `Rex`, non `BR` e `R`.
- `in settimana un blocco diviso con un omonimo mostra il mark`: aspetta due bottoni `Apri Luna`, non il mark troncato. Il nome resta `Luna` per entrambi.
- `in settimana il mark di un omonimo sta su una seconda riga`: togli l’attesa del mark. Aspetta i due nomi `Luna` visibili.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx -t "frecce del giorno|frecce della settimana|swipe a sinistra|tondo verde"`
Expected: FAIL, etichette ancora «Mese precedente» e niente badge.

- [ ] **Step 3: Write minimal implementation**

In `CalendarPage`:

- Importa `daySwipe`, `monthCellFace`, `shiftCalendar` e `WeekRows`.
- `shiftMonth` diventa `shift(delta)` che chiama `goTo(shiftCalendar(vista, day, delta))`.
- Etichette delle `IconButton`: `Giorno|Settimana|Mese` + `precedente|successivo` in base a `vista`.
- La striscia `weekDays` si disegna solo se `vista === 'giorno'`.
- Se `vista === 'settimana'`, al posto del blocco griglia ore rendi `WeekRows` con `onOpen` → `openSheet(/appuntamenti/${id})`, `onCreate` → `openSheet(/appuntamenti/nuovo?data=${localDayKey(day)})`, `onSelectDay` → `goTo`.
- Sulla griglia `Orari`, `onPointerDown` memorizza x/y solo se `event.target` non è dentro un bottone appuntamento. `onPointerUp` chiama `daySwipe` e, se non zero, `goTo(addDays(day, delta))`.
- Nella cella del mese, sostituisci lo style inline con `monthCellFace`. Il bottone ha `aria-label` = `formatHomeDate(date)` e, se count > 0, `` `${formatHomeDate(date)}, ${count} appuntament${count === 1 ? 'o' : 'i'}` ``. Il tondo è `<span data-badge style={{ width: count > 9 ? undefined : 18, minWidth: 18, height: 18, padding: count > 9 ? '0 2px' : 0, borderRadius: 99, background: 'var(--ok)', color: '#fff', boxShadow: face.badgeHalo ? '0 0 0 2px #fff' : undefined }}>{face.badge}</span>` solo se `face.badge`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx src/lib/calendarView.test.ts src/components/calendar/WeekRows.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m "feat: collega giorno, settimana e mese nel calendario"
```

### Task 6: Pubblicare la 1.1.7

**Files:**
- Modify: `src/lib/appVersion.ts` (`APP_VERSION` → `'1.1.7'`)
- Modify: `package.json` (`version` → `1.1.7`)
- Modify: `android/app/build.gradle` (`versionName "1.1.7"`, `versionCode 10107`)
- Modify: `hosting/release.json` (`version` `1.1.7`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.7/groomly.apk`)

**Interfaces:**
- Consumes: l’app già verde ai test del task 5
- Produces: tag `v1.1.7`, asset `groomly.apk`, hosting aggiornato

- [ ] **Step 1: Alza la versione nei quattro file**

Valori esatti sopra. Non toccare altro.

- [ ] **Step 2: Verifica**

Run: `npm test`
Expected: PASS, exit 0

- [ ] **Step 3: APK**

Run, in ordine:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew assembleDebug
cd ..
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk groomly.apk
```

Expected: esiste `groomly.apk` nella radice. Non sta in `hosting/`. Non va aggiunto a git.

- [ ] **Step 4: Commit e push**

```powershell
git add src/lib/appVersion.ts package.json package-lock.json android/app/build.gradle hosting/release.json
git commit -m "feat: rilascia 1.1.7 con le viste del calendario"
git push origin HEAD
```

Non usare `--no-verify`. Non fare force push. Se il push non è autenticato, fermati e dillo.

- [ ] **Step 5: Release GitHub**

```powershell
gh release create v1.1.7 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.7" --notes "Il calendario sposta giorno, settimana e mese con le frecce giuste, la settimana mostra i giorni in riga e il mese segna gli appuntamenti con un tondo verde."
```

Expected: la release ha un asset chiamato `groomly.apk`. Se `gh` non è autenticato, fermati e dillo.

- [ ] **Step 6: Firebase**

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,storage,hosting --project groomly-3128b
```

Expected: hosting pubblicato. Se Storage non è attivo, pubblica comunque Firestore e Hosting e segnalalo. Se Firebase non è autenticato, fermati e dillo.
