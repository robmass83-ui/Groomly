# Ritmo del mensile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un mensile anticipato o posticipato resta Fissato, e al salvataggio si chiede se le settimane ripartono da quella visita o dal ritmo già in corso.

**Architecture:** `cycleAnchor` e `coveredDue` stanno sull’appuntamento e si applicano solo al completamento, tramite `nextDueAfter`. La domanda è uno `Sheet` prima della scrittura. La lista mensile non disegna più il giro dopo finché la visita è programmata, e il fissato sta nel mese della visita.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, happy-dom, date-fns, React Router.

## Global Constraints

- Nel profilo del cane non si fissa più dalla riga di pulsanti. Si fissa da «Fissa appuntamento».
- Un programmato da oggi in poi copre il giro, anche se il giorno è prima o dopo la scadenza. In Clienti mensili è Fissato. Il giro dopo non compare finché quella visita non è completata.
- Se il giorno salvato non è la scadenza, prima di scrivere si chiede se le settimane partono da questa visita o dal ritmo già in corso. La risposta resta sull’appuntamento e si applica al completamento.
- Il ritmo è un numero di settimane esatte, quello in scheda. Quattro settimane sono 28 giorni.
- Un appuntamento vecchio, senza scelta, al completamento conta la propria data più le settimane. Non c’è una migrazione.
- Non si cambia il calendario, il listino, né il significato di Anticipa −15 e Posticipa +15. Non si toglie **Fissa il prossimo** dalla visita completata. Non si chiede il ritmo a un occasionale che resta occasionale, né a un mensile senza completati.

## File structure

- `src/types/models.ts` — `CycleAnchor`, campi opzionali su `Appointment` e `AppointmentWrite`.
- `src/data/local/appointments.ts` — lettura e scrittura ISO dei due campi. Un valore illeggibile si ignora. L’update senza i campi li toglie.
- `src/lib/firebaseMap.ts` — gli stessi campi nel documento, `coveredDue` in millisecondi.
- `src/data/firebase/localSeed.ts` — il seme locale non perde i due campi.
- `src/lib/cycle.ts` — `nextDueAfter`, `openDue`, `rhythmChoice`, `rhythmQuestion`, `fissatoVisible`. `monthlyStatus` e `cycleRow` usano `nextDueAfter`. `unbookedMonthly` non restituisce più `prossimo`. `dueSoon` non aggiunge il giro dopo.
- `src/pages/MonthlyPage.tsx` — il fissato sta nel mese della visita; sparisce la sezione Non fissato.
- `src/pages/HomePage.tsx` — il riquadro usa gli stessi fissati del mese corrente.
- `src/pages/NextAppointment.tsx` — solo la riga del prossimo appuntamento.
- `src/pages/DogPage.tsx` — la chiamata senza salvataggio.
- `src/pages/AppointmentPage.tsx` — lo `Sheet` «Ritmo del mensile», `coreWrite` che conserva la scelta, `bookNext` sulla scadenza calcolata.

---

### Task 1: Campi sull’appuntamento

**Files:**
- Modify: `src/types/models.ts` (`Appointment`, `AppointmentWrite`)
- Modify: `src/data/local/appointments.ts`
- Modify: `src/lib/firebaseMap.ts` (`appointmentToDoc`, `appointmentFromDoc`)
- Modify: `src/data/firebase/localSeed.ts` (`appointmentToLocal`)
- Test: `src/data/local/appointments.test.ts`
- Test: `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: `Appointment`, `AppointmentWrite`, `dateToMillis`, `optionalDate`.
- Produces: `export type CycleAnchor = 'visita' | 'ritmo'`. `Appointment.cycleAnchor?: CycleAnchor` e `Appointment.coveredDue?: Date`. Gli stessi campi opzionali su `AppointmentWrite`. `createAppointment` e `updateAppointment` li conservano se presenti nel write. Un update senza i campi li cancella. `appointmentToDoc` / `appointmentFromDoc` e `appointmentToLocal` fanno lo stesso giro.

- [ ] **Step 1: Write the failing test**

In `src/data/local/appointments.test.ts`, aggiungi questo test nel describe degli appuntamenti, accanto a quello di `seriesId`:

```ts
it('cycleAnchor e coveredDue fanno il giro e un update senza i campi li toglie', () => {
  const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
  const created = createAppointment('uid-1', write({
    cycleAnchor: 'ritmo',
    coveredDue: covered,
  }))
  expect(created.cycleAnchor).toBe('ritmo')
  expect(created.coveredDue).toEqual(covered)
  const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
  expect(stored.cycleAnchor).toBe('ritmo')
  expect(stored.coveredDue).toBe(covered.toISOString())
  expect(listAppointments('uid-1').find((item) => item.id === created.id)?.coveredDue).toEqual(covered)

  localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
    [created.id]: { ...stored, cycleAnchor: 'boh', coveredDue: 'nope' },
  }))
  const broken = listAppointments('uid-1').find((item) => item.id === created.id)
  expect(broken?.cycleAnchor).toBeUndefined()
  expect(broken?.coveredDue).toBeUndefined()

  const again = createAppointment('uid-1', write({ cycleAnchor: 'visita', coveredDue: covered }))
  const cleared = updateAppointment('uid-1', again.id, write())
  expect(cleared.cycleAnchor).toBeUndefined()
  expect(cleared.coveredDue).toBeUndefined()
  const raw = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[again.id]
  expect(raw.cycleAnchor).toBeUndefined()
  expect(raw.coveredDue).toBeUndefined()
})
```

`write()` è l’helper già nel file: se non accetta campi extra, allarga il parametro a `Partial<AppointmentWrite>` e spargili nell’oggetto restituito.

In `src/lib/firebaseMap.test.ts`:

```ts
it('cycleAnchor e coveredDue viaggiano in millisecondi e un valore rotto si ignora', () => {
  const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
  const doc = appointmentToDoc(appointment({ cycleAnchor: 'ritmo', coveredDue: covered }))
  expect(doc.cycleAnchor).toBe('ritmo')
  expect(doc.coveredDue).toBe(dateToMillis(covered))
  const loaded = appointmentFromDoc('a1', doc)
  expect(loaded.cycleAnchor).toBe('ritmo')
  expect(loaded.coveredDue).toEqual(covered)
  expect(appointmentFromDoc('a1', { ...doc, cycleAnchor: 'boh', coveredDue: 'nope' }).cycleAnchor).toBeUndefined()
  expect(appointmentFromDoc('a1', { ...doc, cycleAnchor: 'boh', coveredDue: 'nope' }).coveredDue).toBeUndefined()
  expect(appointmentToDoc(appointment()).cycleAnchor).toBeUndefined()
  expect(appointmentToDoc(appointment()).coveredDue).toBeUndefined()
})
```

L’helper `appointment()` del file va allargato con `cycleAnchor?: CycleAnchor` e `coveredDue?: Date` e li copia sull’oggetto.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`

Expected: FAIL perché `cycleAnchor` non è su `AppointmentWrite` o non viene riletto.

- [ ] **Step 3: Write minimal implementation**

In `src/types/models.ts`, prima di `Appointment`:

```ts
export type CycleAnchor = 'visita' | 'ritmo'
```

Su `Appointment` e su `AppointmentWrite`, dopo `seriesId`:

```ts
cycleAnchor?: CycleAnchor
coveredDue?: Date
```

In `src/data/local/appointments.ts`, importa `CycleAnchor`. Su `StoredAppointment` aggiungi `cycleAnchor?: string` e `coveredDue?: string`.

```ts
function readAnchor(value: unknown): CycleAnchor | undefined {
  return value === 'visita' || value === 'ritmo' ? value : undefined
}

function readCovered(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}
```

In `toDomain`, dopo `seriesId`:

```ts
const cycleAnchor = readAnchor(stored.cycleAnchor)
if (cycleAnchor) appointment.cycleAnchor = cycleAnchor
const coveredDue = readCovered(stored.coveredDue)
if (coveredDue) appointment.coveredDue = coveredDue
```

In `toStored`:

```ts
if (appointment.cycleAnchor) stored.cycleAnchor = appointment.cycleAnchor
if (appointment.coveredDue) stored.coveredDue = appointment.coveredDue.toISOString()
```

In `appointmentFromWrite`, dopo `seriesId`:

```ts
if (input.cycleAnchor) appointment.cycleAnchor = input.cycleAnchor
if (input.coveredDue) appointment.coveredDue = new Date(input.coveredDue.getTime())
```

`updateAppointment` continua a passare da `appointmentFromWrite`: se il write non ha i campi, l’oggetto nuovo non li ha. Non copiarli da `previous`.

In `src/lib/firebaseMap.ts`, dentro `appointmentToDoc`, accanto a `seriesId`:

```ts
cycleAnchor: appointment.cycleAnchor,
coveredDue: appointment.coveredDue ? dateToMillis(appointment.coveredDue) : undefined,
```

Dentro `appointmentFromDoc`, dopo `seriesId`:

```ts
if (data.cycleAnchor === 'visita' || data.cycleAnchor === 'ritmo') appointment.cycleAnchor = data.cycleAnchor
const coveredDue = optionalDate(data.coveredDue)
if (coveredDue) appointment.coveredDue = coveredDue
```

In `src/data/firebase/localSeed.ts`, in `appointmentToLocal`, dopo `seriesId`:

```ts
if (appointment.cycleAnchor) stored.cycleAnchor = appointment.cycleAnchor
if (appointment.coveredDue) stored.coveredDue = appointment.coveredDue.toISOString()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/firebaseMap.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/localSeed.ts
git commit -m "feat: conserva sull'appuntamento da dove riparte il ritmo"
```

---

### Task 2: Calcolo della scadenza

**Files:**
- Modify: `src/lib/cycle.ts`
- Test: `src/lib/cycle.test.ts`

**Interfaces:**
- Consumes: `Appointment.cycleAnchor`, `Appointment.coveredDue`, `recurrenceWeeksOf`, `startOfLocalDay` da `src/lib/appointments.ts`, `addWeeks` e `addDays` di date-fns, `format` e `IT_DATE`.
- Produces:
  - `nextDueAfter(appointment: Appointment, weeks: number): Date`
  - `openDue(dog: Dog, appointments: Appointment[], now: Date, weeks: number, ignoreId?: string): Date | null`
  - `rhythmChoice(dog: Dog, appointments: Appointment[], now: Date, start: Date, weeks: number, ignoreId?: string): { coveredDue: Date; visitaOn: Date; ritmoOn: Date } | null`
  - `rhythmQuestion(weeks: number, start: Date, coveredDue: Date): string`
  - `fissatoVisible(visit: Date, viewedMonth: Date, now: Date): boolean`
  - `monthlyStatus` e `cycleRow` calcolano `due` con `nextDueAfter` sull’ultimo completato. Con un programmato futuro, `late` confronta l’inizio con `coveredDue` se c’è, altrimenti con `openDue` di quella visita esclusa.

- [ ] **Step 1: Write the failing test**

In `src/lib/cycle.test.ts` importa le funzioni nuove e aggiungi:

```ts
describe('ritmo', () => {
  const luna = dog('luna', 'Luna')
  const done = visit('done', 'luna', new Date(2026, 0, 1, 9, 30, 0, 0), 'completato')

  it('senza scelta la successiva è la visita più le settimane', () => {
    expect(nextDueAfter(done, 4)).toEqual(new Date(2026, 0, 29, 9, 30, 0, 0))
  })

  it('visita e ritmo anticipati danno il 17 febbraio o il 26 febbraio', () => {
    const early = visit('early', 'luna', new Date(2026, 0, 20, 9, 30, 0, 0))
    early.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    early.cycleAnchor = 'visita'
    expect(nextDueAfter(early, 4)).toEqual(new Date(2026, 1, 17, 9, 30, 0, 0))
    early.cycleAnchor = 'ritmo'
    expect(nextDueAfter(early, 4)).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
  })

  it('un ritmo del 10 febbraio resta al 26 febbraio', () => {
    const late = visit('late', 'luna', new Date(2026, 1, 10, 9, 30, 0, 0))
    late.cycleAnchor = 'ritmo'
    late.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    expect(nextDueAfter(late, 4)).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
  })

  it('un ritmo del 15 marzo salta al 26 marzo', () => {
    const far = visit('far', 'luna', new Date(2026, 2, 15, 9, 30, 0, 0))
    far.cycleAnchor = 'ritmo'
    far.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    expect(nextDueAfter(far, 4)).toEqual(new Date(2026, 2, 26, 9, 30, 0, 0))
  })

  it('la scadenza aperta parte dall’ultimo completato e poi dal programmato futuro', () => {
    const now = new Date(2026, 0, 10, 12, 0, 0, 0)
    expect(openDue(luna, [done], now, 4)).toEqual(new Date(2026, 0, 29, 9, 30, 0, 0))
    const early = visit('early', 'luna', new Date(2026, 0, 20, 9, 30, 0, 0))
    early.cycleAnchor = 'ritmo'
    early.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    expect(openDue(luna, [done, early], now, 4)).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
    expect(openDue(luna, [done, early], now, 4, 'early')).toEqual(new Date(2026, 0, 29, 9, 30, 0, 0))
    expect(openDue(dog('otto', 'Otto', { clientType: 'occasionale' }), [done], now, 4)).toBeNull()
    expect(openDue(luna, [], now, 4)).toBeNull()
  })

  it('la domanda manca nel giorno giusto, per un occasionale e se le due date coincidono', () => {
    const now = new Date(2026, 0, 10, 12, 0, 0, 0)
    expect(rhythmChoice(luna, [done], now, new Date(2026, 0, 29, 18, 0, 0, 0), 4)).toBeNull()
    const asked = rhythmChoice(luna, [done], now, new Date(2026, 0, 20, 9, 30, 0, 0), 4)
    expect(asked?.coveredDue).toEqual(new Date(2026, 0, 29, 9, 30, 0, 0))
    expect(asked?.visitaOn).toEqual(new Date(2026, 1, 17, 9, 30, 0, 0))
    expect(asked?.ritmoOn).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
    expect(rhythmQuestion(4, new Date(2026, 0, 20, 9, 30), new Date(2026, 0, 29, 9, 30)))
      .toBe('Il 20 gen non è la scadenza del 29 gen. Da dove ripartono le 4 settimane?')
    expect(rhythmQuestion(1, new Date(2026, 0, 20, 9, 30), new Date(2026, 0, 29, 9, 30)))
      .toBe('Il 20 gen non è la scadenza del 29 gen. Da dove riparte la settimana?')
    const march = new Date(2026, 2, 15, 9, 30, 0, 0)
    const far = rhythmChoice(luna, [done], now, march, 4)
    expect(far?.ritmoOn).toEqual(new Date(2026, 2, 26, 9, 30, 0, 0))
    expect(far?.visitaOn).toEqual(new Date(2026, 3, 12, 9, 30, 0, 0))
    expect(rhythmChoice(luna, [done], now, new Date(2026, 2, 26, 9, 30, 0, 0), 4)).toBeNull()
  })

  it('il fissato si vede nel mese della visita, o nel mese corrente se è oltre il successivo', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0, 0)
    expect(fissatoVisible(new Date(2026, 0, 20, 9), new Date(2026, 0, 1), now)).toBe(true)
    expect(fissatoVisible(new Date(2026, 0, 20, 9), new Date(2026, 1, 1), now)).toBe(false)
    expect(fissatoVisible(new Date(2026, 1, 10, 9), new Date(2026, 0, 1), now)).toBe(false)
    expect(fissatoVisible(new Date(2026, 1, 10, 9), new Date(2026, 1, 1), now)).toBe(true)
    expect(fissatoVisible(new Date(2026, 2, 20, 9), new Date(2026, 0, 1), now)).toBe(true)
    expect(fissatoVisible(new Date(2026, 2, 20, 9), new Date(2026, 1, 1), now)).toBe(false)
  })

  it('un completato col ritmo sposta la scadenza di monthlyStatus', () => {
    const completed = visit('done', 'luna', new Date(2026, 0, 20, 9, 30, 0, 0), 'completato')
    completed.cycleAnchor = 'ritmo'
    completed.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    const row = monthlyStatus(luna, [completed], new Date(2026, 1, 1, 12), 7)
    expect(row?.due).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
    expect(row?.group).toBe('in_ritardo')
  })

  it('il ritardo usa la scadenza coperta', () => {
    const completed = visit('done', 'luna', new Date(2026, 0, 1, 9, 30, 0, 0), 'completato')
    const booked = visit('next', 'luna', new Date(2026, 1, 20, 9, 30, 0, 0))
    booked.cycleAnchor = 'ritmo'
    booked.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    const row = monthlyStatus(luna, [completed, booked], new Date(2026, 0, 10, 12), 7)
    expect(row?.group).toBe('fissato')
    expect(row?.late).toBe(true)
    const sooner = visit('soon', 'luna', new Date(2026, 1, 10, 9, 30, 0, 0))
    sooner.cycleAnchor = 'ritmo'
    sooner.coveredDue = new Date(2026, 0, 29, 9, 30, 0, 0)
    expect(monthlyStatus(luna, [completed, sooner], new Date(2026, 0, 10, 12), 7)?.late).toBe(false)
  })
})
```

Il 26 marzo 2026 è un giovedì: `addWeeks` dal 29 gennaio fa 26 febbraio e poi 26 marzo. Il 15 marzo più 4 settimane è il 12 aprile. Il 26 marzo come data nuova, confrontato col completato del 1° gennaio, ha le due risposte entrambe il 23 aprile: `rhythmChoice` restituisce `null`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cycle.test.ts`

Expected: FAIL con `nextDueAfter is not defined` o import assente.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/cycle.ts` aggiungi `format` all’import di date-fns e `IT_DATE` da `./format`.

```ts
function safeWeeks(weeks: number): number {
  return Number.isInteger(weeks) && weeks >= 1 ? weeks : 4
}

function stepPast(from: Date, weeks: number, visit: Date): Date {
  let cursor = addWeeks(from, weeks)
  const day = startOfLocalDay(visit).getTime()
  while (startOfLocalDay(cursor).getTime() <= day) cursor = addWeeks(cursor, weeks)
  return cursor
}

export function nextDueAfter(appointment: Appointment, weeks: number): Date {
  const safe = safeWeeks(weeks)
  if (appointment.cycleAnchor === 'ritmo' && appointment.coveredDue) {
    return stepPast(appointment.coveredDue, safe, appointment.start)
  }
  return addWeeks(appointment.start, safe)
}

export function openDue(
  dog: Dog,
  appointments: Appointment[],
  now: Date,
  weeks: number,
  ignoreId?: string,
): Date | null {
  if (dog.status !== 'attivo' || dog.clientType !== 'mensile') return null
  const last = lastCompletedOf(dog.id, appointments)
  if (!last) return null
  const safe = safeWeeks(weeks)
  let slot = nextDueAfter(last, safe)
  const ahead = futureProgrammed(dog.id, appointments, now).filter((item) => item.id !== ignoreId)
  for (const item of ahead) slot = nextDueAfter(item, safe)
  return slot
}

export function rhythmChoice(
  dog: Dog,
  appointments: Appointment[],
  now: Date,
  start: Date,
  weeks: number,
  ignoreId?: string,
): { coveredDue: Date; visitaOn: Date; ritmoOn: Date } | null {
  const coveredDue = openDue(dog, appointments, now, weeks, ignoreId)
  if (!coveredDue) return null
  if (startOfLocalDay(start).getTime() === startOfLocalDay(coveredDue).getTime()) return null
  const safe = safeWeeks(weeks)
  const visitaOn = addWeeks(start, safe)
  const ritmoOn = stepPast(coveredDue, safe, start)
  if (startOfLocalDay(visitaOn).getTime() === startOfLocalDay(ritmoOn).getTime()) return null
  return { coveredDue, visitaOn, ritmoOn }
}

export function rhythmQuestion(weeks: number, start: Date, coveredDue: Date): string {
  const when = (date: Date) => format(date, 'd MMM', IT_DATE)
  const tail = safeWeeks(weeks) === 1
    ? 'Da dove riparte la settimana?'
    : `Da dove ripartono le ${safeWeeks(weeks)} settimane?`
  return `Il ${when(start)} non è la scadenza del ${when(coveredDue)}. ${tail}`
}

export function fissatoVisible(visit: Date, viewedMonth: Date, now: Date): boolean {
  const viewed = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth(), 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  const next = new Date(current.getFullYear(), current.getMonth() + 1, 1)
  const visitMonth = new Date(visit.getFullYear(), visit.getMonth(), 1)
  if (visitMonth.getTime() === viewed.getTime()) return true
  return viewed.getTime() === current.getTime() && visitMonth.getTime() > next.getTime()
}
```

In `monthlyStatus`, sostituisci `const due = addWeeks(lastCompleted.start, recurrenceWeeksOf(dog))` con:

```ts
const weeks = recurrenceWeeksOf(dog)
const due = nextDueAfter(lastCompleted, weeks)
```

Nel ramo `if (booked)`:

```ts
const anchor = booked.coveredDue ?? openDue(dog, appointments, now, weeks, booked.id) ?? due
return {
  dog,
  due: anchor,
  lastCompleted,
  booked,
  late: booked.start.getTime() > addDays(anchor, 14).getTime(),
  group: 'fissato',
}
```

In `cycleRow`, `due` diventa `lastCompleted ? nextDueAfter(lastCompleted, recurrenceWeeksOf(dog)) : startOfLocalDay(now)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cycle.test.ts`

Expected: PASS, compresi i test già presenti che non hanno `cycleAnchor`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m "feat: calcola la scadenza dal ritmo scelto sull'appuntamento"
```

---

### Task 3: Lista mensile e Home

**Files:**
- Modify: `src/lib/cycle.ts` (`unbookedMonthly`, `dueSoon`)
- Modify: `src/pages/MonthlyPage.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/lib/cycle.test.ts`
- Test: `src/pages/monthly.test.tsx`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `fissatoVisible`, `monthlyStatus`, `dueSoon`, `unbookedMonthly`.
- Produces: `unbookedMonthly` restituisce solo cani senza programmato da oggi in poi (`kind: 'manca'`). `dueSoon` non aggiunge il giro dopo. In Clienti mensili un fissato compare secondo `fissatoVisible`. La sezione «Non fissato» non c’è. Home conta i fissati visibili nel mese corrente più `dueSoon`.

- [ ] **Step 1: Write the failing test**

In `src/lib/cycle.test.ts`, sostituisci il test `un appuntamento domani lascia il successivo non fissato e due visite lo tolgono dalla lista` con:

```ts
it('un programmato futuro non è da fissare, nemmeno se è l’unico', () => {
  const rex = withWeeks(dog('rex', 'Rex'), 4)
  const tomorrow = visit('tomorrow', rex.id, new Date(2026, 9, 11, 10))
  expect(unbookedMonthly([rex], [tomorrow], now)).toEqual([])
  const later = visit('later', rex.id, new Date(2026, 10, 8, 10))
  expect(unbookedMonthly([rex], [tomorrow, later], now)).toEqual([])
  expect(dueSoon([rex], [tomorrow], now, 7)).toEqual([])
})
```

In `src/pages/HomePage.test.tsx`, nel test `un mensile con la visita di domani resta in lista come non fissato`, sostituisci le attese con:

```ts
expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
expect(screen.queryByRole('region', { name: 'Mensili da fissare' })).not.toBeInTheDocument()
expect(screen.queryByText('Ada')).not.toBeInTheDocument()
```

In `src/pages/monthly.test.tsx`, nel test `con Tutti un fissato è visibile senza click`:

```ts
expect(screen.queryByRole('heading', { name: /^Non fissato/ })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
```

al posto delle attese su Non fissato e sui tre `Fissa`. Nel click su «Da fissare»:

```ts
expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
expect(screen.queryByRole('heading', { name: /^Fissati/ })).not.toBeInTheDocument()
```

Nel test `Fissa con lo storico propone il 31 ottobre`, togli le attese su «Non fissato» e sul bottone `Fissa` dopo il salvataggio. Resta «Fissato in ritardo · 31 ott».

Nel test `il 5 settembre completato è in scadenza, e il 10 ottobre lo sposta nei fissati`, dopo il secondo render:

```ts
expect(screen.getByText('1/1')).toBeInTheDocument()
expect(screen.getByText('0 da fissare')).toBeInTheDocument()
expect(screen.queryByRole('heading', { name: /^Non fissato/ })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
await user.click(screen.getByRole('radio', { name: 'nov' }))
expect(screen.queryByText('Luna')).not.toBeInTheDocument()
expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
```

Sostituisci il test `un fissato con scadenza a ottobre e visita a novembre resta nei Fissati di ottobre` con queste attese, tenendo gli stessi dati (oggi 10 ottobre, completato 12 settembre, visita 15 novembre):

```ts
expect(await screen.findByText('Nessun mensile')).toBeInTheDocument()
expect(screen.queryByText('Luna')).not.toBeInTheDocument()
await user.click(screen.getByRole('radio', { name: 'nov' }))
expect(screen.getByRole('heading', { name: /^Fissati/ })).toBeInTheDocument()
expect(screen.getByText('Fissato in ritardo · 15 nov')).toBeInTheDocument()
expect(screen.queryByRole('heading', { name: /^Non fissato/ })).not.toBeInTheDocument()
```

Sostituisci le attese di `un fissato con scadenza a settembre non entra in ottobre` (oggi 10 ottobre, completato 15 agosto, visita 20 ottobre) con:

```ts
expect(await screen.findByRole('heading', { name: /^Fissati/ })).toBeInTheDocument()
expect(screen.getByText('Fissato in ritardo · 20 ott')).toBeInTheDocument()
expect(screen.queryByRole('heading', { name: /^Non fissato/ })).not.toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cycle.test.ts src/pages/monthly.test.tsx src/pages/HomePage.test.tsx`

Expected: FAIL perché `unbookedMonthly` restituisce ancora `prossimo` e la pagina disegna «Non fissato».

- [ ] **Step 3: Write minimal implementation**

In `unbookedMonthly`, togli il ramo `ahead.length === 1`. Se `ahead.length >= 1`, `continue`. Resta solo il push `kind: 'manca'` quando non c’è un programmato futuro.

In `dueSoon`, togli `followUps` e il filtro su `unbookedMonthly`. Restituisci solo `open` ordinato come oggi.

In `MonthlyPage.tsx`, `inMonth` riceve `now: Date`. Se `row.group === 'fissato'` e `row.booked`, ritorna `fissatoVisible(row.booked.start, month, now)`. Il resto della funzione resta. La chiamata passa `now`.

Togli `followUps`, `followUpsHere`, `visibleFollow` e il loro contributo a `toBook`. `toBook` è `soonRows.length`. `empty` per `da_fissare` non somma `visibleFollow`. Il filtro `da_fissare` non ha più una sezione follow-up.

Cancella il blocco JSX `visibleFollow.length > 0` (la section `aria-label="Non fissato"`). Se `unbookedCopy` e `bookFollowUpHref` restano senza usi in questo file, toglili dall’import.

In `HomePage.tsx`:

```ts
const soon = dueSoon(dogs, appointments, now, daysBefore)
const bookedMonthly = dogs.filter((dog) => {
  const row = monthlyStatus(dog, appointments, now, daysBefore)
  return row?.group === 'fissato' && row.booked !== null && fissatoVisible(row.booked.start, now, now)
}).length
const monthlyTotal = bookedMonthly + soon.length
```

`unbookedMonthly` ora non include più chi ha già un programmato: la sezione «Mensili da fissare» li perde da sola.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cycle.test.ts src/pages/monthly.test.tsx src/pages/HomePage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cycle.ts src/lib/cycle.test.ts src/pages/MonthlyPage.tsx src/pages/HomePage.tsx src/pages/monthly.test.tsx src/pages/HomePage.test.tsx
git commit -m "feat: un programmato futuro è fissato e il giro dopo aspetta il completamento"
```

---

### Task 4: Profilo senza pulsanti

**Files:**
- Modify: `src/pages/NextAppointment.tsx`
- Modify: `src/pages/DogPage.tsx` (la chiamata a `NextAppointment`)
- Test: `src/pages/appointments.test.tsx`
- Test: `src/pages/DogsPage.test.tsx`
- Test: `src/pages/completato.test.tsx`
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: `nextAppointment`, `formatBookedWhen`, `formatDuration`, `sumDuration` da `src/lib/appointments.ts`.
- Produces: `NextAppointment({ dog, appointments }: { dog: Dog; appointments: Appointment[] })`. Nessun pulsante «+2 sett», «+4 sett», «+6 sett», «Fissa il prossimo», «Data…». Nessun foglio «Appuntamento già fissato». Resta la riga del prossimo appuntamento, o «Nessun appuntamento».

- [ ] **Step 1: Write the failing test**

In `src/pages/appointments.test.tsx`, sostituisci `il chip copia il prossimo e Annulla toglie solo il nuovo` e `senza appuntamenti il chip apre il modulo e un archiviato non ha i chip` con:

```tsx
it('il profilo non ha i pulsanti per fissare e mostra il prossimo appuntamento', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 9, 29, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  })
  render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
  expect(await screen.findByRole('button', { name: 'Fissa appuntamento' })).toBeInTheDocument()
  expect(screen.getByText(/Prossimo:/)).toBeInTheDocument()
  for (const name of ['+2 sett', '+4 sett', '+6 sett', 'Fissa il prossimo', 'Data…']) {
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  }
  expect(screen.queryByRole('heading', { name: 'Appuntamento già fissato' })).not.toBeInTheDocument()
})

it('senza appuntamenti il profilo dice Nessun appuntamento', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
  expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '+4 sett' })).not.toBeInTheDocument()
})
```

Il test `un cane archiviato non ha i chip` può restare: «+2 sett» continua a non esserci.

In `src/pages/DogsPage.test.tsx`, cancella il test `con un programmato futuro +2 sett e Fissa il prossimo chiedono conferma e non scrivono prima`.

In `src/pages/completato.test.tsx`, cancella `il chip della scheda non marca completato l’appuntamento di partenza` e `senza aperti la scheda dice Nessun appuntamento e il chip parte dal completato` se clicca «+2 sett». Non toccare i test di **Fissa il prossimo** sulla visita completata.

In `src/pages/monthly.test.tsx`, sostituisci `il chip della scheda non torna ai mensili` con:

```tsx
it('il profilo non ha il chip e Fissa appuntamento apre il foglio', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
  expect(screen.queryByRole('button', { name: '+2 sett' })).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Fissa appuntamento' }))
  expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Chiudi' }))
  expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/monthly.test.tsx src/pages/completato.test.tsx src/pages/DogsPage.test.tsx`

Expected: FAIL perché i pulsanti ci sono ancora, oppure perché un test cancellato non è l’unico rosso: il test nuovo non trova l’assenza dei pulsanti.

- [ ] **Step 3: Write minimal implementation**

Sostituisci il corpo di `src/pages/NextAppointment.tsx` con un componente che riceve solo `dog` e `appointments`. Tieni `nextLabel`, `clock` e la riga del prossimo appuntamento. Togli `WEEK_CHIPS`, `book`, `successivo`, `guarded`, `pending`, `Sheet`, `saveNew`, `remove`, `lastCreatedId`.

```tsx
export function NextAppointment({
  dog,
  appointments,
}: {
  dog: Dog
  appointments: Appointment[]
}) {
  const openSheet = useOpenSheet()
  const now = new Date()
  const upcoming = nextAppointment(appointments, dog.id, now)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {upcoming ? (
        <button
          type="button"
          onClick={() => openSheet(`/appuntamenti/${upcoming.id}`)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            width: '100%',
            textAlign: 'left',
            border: 0,
            borderBottom: '1px solid var(--line)',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            padding: '4px 0',
          }}
        >
          <span style={{ fontSize: TYPE.base }}>{nextLabel(upcoming.start, now)}</span>
          <span style={{ fontSize: TYPE.base }}>{upcoming.services.map((line) => line.name).join(', ')}</span>
          <span style={{ fontSize: TYPE.base, color: 'var(--tx3)' }}>{formatDuration(sumDuration(upcoming.services))}</span>
        </button>
      ) : (
        <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun appuntamento</p>
      )}
    </div>
  )
}
```

In `DogPage.tsx`:

```tsx
<NextAppointment dog={dog} appointments={visits.appointments} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/monthly.test.tsx src/pages/completato.test.tsx src/pages/DogsPage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/NextAppointment.tsx src/pages/DogPage.tsx src/pages/appointments.test.tsx src/pages/DogsPage.test.tsx src/pages/completato.test.tsx src/pages/monthly.test.tsx
git commit -m "feat: nel profilo si fissa solo da Fissa appuntamento"
```

---

### Task 5: Domanda al salvataggio

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (`save`, `saveEdit`, lo `Sheet`)
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `rhythmChoice`, `rhythmQuestion`, `CycleAnchor`, `AppointmentWrite.cycleAnchor`, `AppointmentWrite.coveredDue`, `SavePlan`, `localDayKey`, `frequencyOf` già in `AppointmentPage.tsx`.
- Produces: prima di scrivere, se `rhythmChoice` non è `null`, uno `Sheet` titolo «Ritmo del mensile». «Da questa visita · …» scrive `visita` e `coveredDue`. «Dal ritmo in corso · …» scrive `ritmo` e la stessa `coveredDue`. Annulla non scrive. Il secondo appuntamento dello stesso salvataggio non riceve i campi. In modifica, la domanda torna solo se il giorno cambia. Lo stesso giorno, anche a un’ora diversa, conserva la scelta già scritta. Un salvataggio fallito tiene la risposta per lo stesso giorno.

- [ ] **Step 1: Write the failing test**

In `src/pages/appointments.test.tsx`:

```tsx
it('un mensile fuori scadenza chiede il ritmo e Annulla non scrive', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile', recurrenceWeeks: 4 }))
  completeAppointment(account.uid, createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 0, 1, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  }).id)
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
  await user.click(await screen.findByRole('button', { name: /^Bagno · / }))
  fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-20' } })
  await user.click(screen.getByRole('button', { name: '09:30' }))
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(await screen.findByRole('heading', { name: 'Ritmo del mensile' })).toBeInTheDocument()
  expect(screen.getByText('Il 20 gen non è la scadenza del 29 gen. Da dove ripartono le 4 settimane?')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Da questa visita · 17 feb' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Dal ritmo in corso · 26 feb' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Annulla' }))
  expect(screen.queryByRole('heading', { name: 'Ritmo del mensile' })).not.toBeInTheDocument()
  const before = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
  expect(Object.values(before).filter((item) => item.status === 'programmato')).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  await user.click(await screen.findByRole('button', { name: 'Da questa visita · 17 feb' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
  const saved = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cycleAnchor?: string; coveredDue?: string }>)
    .find((item) => item.status === 'programmato')
  expect(saved?.cycleAnchor).toBe('visita')
  expect(saved?.coveredDue).toBe(new Date(2026, 0, 29, 9, 30, 0, 0).toISOString())
  vi.useRealTimers()
})

it('il giorno della scadenza salva senza domanda', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
  completeAppointment(account.uid, createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 0, 1, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  }).id)
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
  await user.click(await screen.findByRole('button', { name: /^Bagno · / }))
  fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-29' } })
  await user.click(screen.getByRole('button', { name: '11:00' }))
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
  expect(screen.queryByRole('heading', { name: 'Ritmo del mensile' })).not.toBeInTheDocument()
  const saved = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cycleAnchor?: string }>)
    .find((item) => item.status === 'programmato')
  expect(saved?.cycleAnchor).toBeUndefined()
  vi.useRealTimers()
})

it('il secondo appuntamento dello stesso salvataggio non copia la scelta', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile', recurrenceWeeks: 4 }))
  completeAppointment(account.uid, createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 0, 1, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  }).id)
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
  await user.click(await screen.findByRole('button', { name: /^Bagno · / }))
  fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-20' } })
  await user.click(screen.getByRole('button', { name: '09:30' }))
  await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  await user.click(await screen.findByRole('button', { name: 'Dal ritmo in corso · 26 feb' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
  const items = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; start: string; cycleAnchor?: string }>)
    .filter((item) => item.status === 'programmato')
    .sort((a, b) => a.start.localeCompare(b.start))
  expect(items).toHaveLength(2)
  expect(items[0].cycleAnchor).toBe('ritmo')
  expect(items[1].cycleAnchor).toBeUndefined()
  vi.useRealTimers()
})
```

Se `userEvent` con i timer finti si blocca, usa `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`. I test del file che non fissano l’orologio restano sui timer veri: chiama `vi.useRealTimers()` anche se il test fallisce a metà, nel `finally` non serve se `afterEach` del file non lo fa; aggiungi `vi.useRealTimers()` in un `afterEach` di questo describe solo se il describe degli appuntamenti non ne ha già uno. Il describe attuale fa solo `localStorage.clear()`: metti `vi.useRealTimers()` alla fine di ogni test nuovo, come sopra.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL perché il salvataggio non apre «Ritmo del mensile».

- [ ] **Step 3: Write minimal implementation**

In `AppointmentPage.tsx` importa `rhythmChoice` e `rhythmQuestion` da `../lib/cycle`, e `CycleAnchor` dai modelli.

Stato:

```tsx
const [rhythm, setRhythm] = useState<{
  write: AppointmentWrite
  plan: SavePlan | null
  freshDog: DogWrite | null
  editingId: string | null
  choice: NonNullable<ReturnType<typeof rhythmChoice>>
} | null>(null)
const kept = useRef<{ dayKey: string; anchor: CycleAnchor; coveredDue: number } | null>(null)
```

Funzione usata da `save` e da `saveEdit`:

```tsx
function weeksAfter(dog: Dog | undefined, plan: SavePlan | null): number {
  if (plan && plan.nextClientType === 'mensile' && plan.setFrequency) return plan.weeks
  return frequencyOf(dog)
}

function projectDog(dog: Dog, plan: SavePlan | null): Dog {
  if (!plan) return dog
  return { ...dog, clientType: plan.nextClientType, recurrenceWeeks: weeksAfter(dog, plan) }
}

function attachAnchor(write: AppointmentWrite, anchor: CycleAnchor, coveredDue: Date, use: boolean): AppointmentWrite {
  if (!use) {
    const plain = { ...write }
    delete plain.cycleAnchor
    delete plain.coveredDue
    return plain
  }
  return { ...write, cycleAnchor: anchor, coveredDue }
}
```

All’inizio di `save`, prima di creare il cane:

```tsx
const dog = freshDog ? undefined : dogs.find((item) => item.id === write.dogId)
if (dog) {
  const choice = rhythmChoice(projectDog(dog, plan), appointments, new Date(), write.start, weeksAfter(dog, plan))
  const dayKey = localDayKey(write.start)
  if (choice && !(kept.current && kept.current.dayKey === dayKey && kept.current.coveredDue === choice.coveredDue.getTime())) {
    setRhythm({ write, plan, freshDog, editingId: null, choice })
    return
  }
  if (choice && kept.current) {
    write = attachAnchor(write, kept.current.anchor, choice.coveredDue, true)
  }
}
```

Nel ciclo dei `starts`, solo il primo elemento (`index === 0`) tiene `cycleAnchor` e `coveredDue`. Gli altri:

```tsx
const item: AppointmentWrite = index === 0 ? { ...write, dogId, start } : attachAnchor({ ...write, dogId, start }, 'visita', write.start, false)
```

`attachAnchor(..., false)` toglie i campi. Il primo li ha solo se `write` li ha già.

In `saveEdit`:

```tsx
function saveEdit(appointmentId: string, write: AppointmentWrite) {
  const current = appointments.find((item) => item.id === appointmentId)
  const dog = current ? dogs.find((item) => item.id === current.dogId) : undefined
  let nextWrite = current?.seriesId && !write.seriesId ? { ...write, seriesId: current.seriesId } : write
  if (current && dog) {
    const choice = rhythmChoice(dog, appointments, new Date(), nextWrite.start, frequencyOf(dog), current.id)
    const dayChanged = localDayKey(nextWrite.start) !== localDayKey(current.start)
    const dayKey = localDayKey(nextWrite.start)
    if (dayChanged && choice && !(kept.current && kept.current.dayKey === dayKey && kept.current.coveredDue === choice.coveredDue.getTime())) {
      setRhythm({ write: nextWrite, plan: null, freshDog: null, editingId: appointmentId, choice })
      return
    }
    if (!dayChanged && current.cycleAnchor && current.coveredDue) {
      nextWrite = attachAnchor(nextWrite, current.cycleAnchor, current.coveredDue, true)
    } else if (choice && kept.current) {
      nextWrite = attachAnchor(nextWrite, kept.current.anchor, choice.coveredDue, true)
    } else {
      nextWrite = attachAnchor(nextWrite, 'visita', nextWrite.start, false)
    }
  }
  if (!saveExisting(appointmentId, nextWrite)) {
    toast.show('Salvataggio non riuscito', 'plain')
    return
  }
  kept.current = null
  toast.show('Salvato', 'ok')
  setEditing(false)
}
```

Lo `Sheet`, nel render del foglio nuovo e in quello di modifica (basta uno, fratello del foglio aperto):

```tsx
<Sheet open={rhythm !== null} title="Ritmo del mensile" onClose={() => setRhythm(null)}>
  {rhythm ? (
    <>
      <p style={{ margin: 0 }}>{rhythmQuestion(weeksAfter(
        dogs.find((item) => item.id === rhythm.write.dogId),
        rhythm.plan,
      ), rhythm.write.start, rhythm.choice.coveredDue)}</p>
      <button type="button" onClick={() => commitRhythm('visita')}>
        {`Da questa visita · ${format(rhythm.choice.visitaOn, 'd MMM', IT_DATE)}`}
      </button>
      <button type="button" onClick={() => commitRhythm('ritmo')}>
        {`Dal ritmo in corso · ${format(rhythm.choice.ritmoOn, 'd MMM', IT_DATE)}`}
      </button>
      <button type="button" onClick={() => setRhythm(null)}>Annulla</button>
    </>
  ) : null}
</Sheet>
```

`commitRhythm`:

```tsx
function commitRhythm(anchor: CycleAnchor) {
  const pending = rhythm
  if (!pending) return
  kept.current = {
    dayKey: localDayKey(pending.write.start),
    anchor,
    coveredDue: pending.choice.coveredDue.getTime(),
  }
  const write = attachAnchor(pending.write, anchor, pending.choice.coveredDue, true)
  setRhythm(null)
  if (pending.editingId) saveEdit(pending.editingId, write)
  else save(write, pending.plan, pending.freshDog)
}
```

Se `save` fallisce dopo `kept.current`, il ref resta: un secondo Salva sullo stesso giorno non riapre il foglio e riscrive la stessa scelta. `Annulla` chiama solo `setRhythm(null)` e non tocca `kept`. Un successo di `save` che chiude il foglio può lasciare `kept`: il foglio si chiude. Azzera `kept.current` in coda a `save`, dopo il toast, così un tentativo nuovo parte pulito. Se il salvataggio esce prima con il toast di errore, non azzerare `kept`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AppointmentPage.tsx src/pages/appointments.test.tsx
git commit -m "feat: chiede da dove ripartono le settimane prima di fissare"
```

---

### Task 6: Fissa il prossimo e lo spostamento di 15 minuti

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (`coreWrite`, `bookNext`)
- Test: `src/pages/completato.test.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `nextDueAfter(appointment, weeks)`, `frequencyOf`, `coreWrite`, `Appointment.cycleAnchor`, `Appointment.coveredDue`.
- Produces: **Fissa il prossimo** crea l’appuntamento in `nextDueAfter` alla stessa ora, senza `cycleAnchor` e senza il foglio del ritmo. `coreWrite` ricopia `cycleAnchor` e `coveredDue`. Anticipa −15 e Posticipa +15 non aprono «Ritmo del mensile» e non cancellano la scelta.

- [ ] **Step 1: Write the failing test**

In `src/pages/completato.test.tsx`:

```tsx
it('Fissa il prossimo di un ritmo scrive il 26 febbraio senza chiedere', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 21, 12, 0, 0, 0))
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile', recurrenceWeeks: 4 }))
  const created = createAppointment(account.uid, {
    dogId: luna.id,
    start: new Date(2026, 0, 20, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    cycleAnchor: 'ritmo',
    coveredDue: new Date(2026, 0, 29, 9, 30, 0, 0),
  })
  completeAppointment(account.uid, created.id)
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
  await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Fissato per gio 26 feb 09:30')
  expect(screen.queryByRole('heading', { name: 'Ritmo del mensile' })).not.toBeInTheDocument()
  const next = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; start: string; cycleAnchor?: string }>)
    .find((item) => item.status === 'programmato')
  expect(new Date(next!.start)).toEqual(new Date(2026, 1, 26, 9, 30, 0, 0))
  expect(next?.cycleAnchor).toBeUndefined()
  vi.useRealTimers()
})
```

Controlla che `createAppointment` del test passi `cycleAnchor` e `coveredDue`: il write del Task 1 li accetta. Se l’helper del test costruisce l’input a mano, aggiungi i due campi a quella chiamata.

In `src/pages/appointments.test.tsx`:

```tsx
it('posticipare di 15 minuti tiene il ritmo e non chiede', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
  const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
  const created = createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 0, 20, 9, 30, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    cycleAnchor: 'ritmo',
    coveredDue: covered,
  })
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
  await user.click(await screen.findByRole('button', { name: 'Posticipa +15' }))
  expect(screen.queryByRole('heading', { name: 'Ritmo del mensile' })).not.toBeInTheDocument()
  const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { start: string; cycleAnchor?: string; coveredDue?: string }
  expect(new Date(stored.start).getMinutes()).toBe(45)
  expect(stored.cycleAnchor).toBe('ritmo')
  expect(stored.coveredDue).toBe(covered.toISOString())
})
```

Il nome accessibile del bottone è «Posticipa +15», come in `AppointmentPage.tsx`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/appointments.test.tsx`

Expected: FAIL. **Fissa il prossimo** scrive il 17 febbraio (20 gennaio più 4 settimane) invece del 26 febbraio, oppure lo spostamento perde `cycleAnchor`.

- [ ] **Step 3: Write minimal implementation**

In `coreWrite`, prima del `return`:

```tsx
if (patch.cycleAnchor) write.cycleAnchor = patch.cycleAnchor
else if (appointment.cycleAnchor) write.cycleAnchor = appointment.cycleAnchor
if (patch.coveredDue) write.coveredDue = patch.coveredDue
else if (appointment.coveredDue) write.coveredDue = new Date(appointment.coveredDue.getTime())
```

`AppointmentWrite` nel tipo di `patch` ha già i campi dal Task 1. Allarga `Partial<AppointmentWrite>` se `coreWrite` tipizza il patch senza di loro: il parametro è già `Partial<AppointmentWrite>`.

In `bookNext`:

```tsx
const start = nextDueAfter(appointment, frequencyOf(dog))
const write: AppointmentWrite = {
  dogId: appointment.dogId,
  start,
  services: appointment.services.map((line) => ({ ...line })),
}
if (appointment.seriesId) write.seriesId = appointment.seriesId
```

Non copiare `cycleAnchor` né `coveredDue`. Importa `nextDueAfter` da `../lib/cycle`. `sameClockWeeksLater` può restare se altre funzioni del file lo usano ancora; il secondo appuntamento del form continua a usarlo.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/appointments.test.tsx src/lib/cycle.test.ts src/pages/monthly.test.tsx`

Expected: PASS

Poi l’intera suite:

Run: `npx vitest run`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/AppointmentPage.tsx src/pages/completato.test.tsx src/pages/appointments.test.tsx
git commit -m "feat: Fissa il prossimo segue il ritmo e un quarto d'ora non lo cancella"
```
