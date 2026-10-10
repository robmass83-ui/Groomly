# Groomly Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere form cane, foglio appuntamento, calendario, mensili, archivio e spazi di Groomly in un’unica consegna, migrando i dati già salvati.

**Architecture:** I calcoli nuovi stanno in funzioni pure (`src/lib`) e si testano prima delle pagine. Le pagine restano quelle già presenti e le chiamano. `monthlyStatus` è l’unica fonte di banner, Mensili, campanello e notifica. `migrateMaps` è l’unica migrazione, all’avvio e nel ripristino di un backup. Il foglio appuntamento non cambia rotta: la pagina di partenza resta montata sotto.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6.30, react-hook-form, zod, date-fns 4, Vitest 3, Testing Library, happy-dom, Capacitor Android 8 (`@capacitor/local-notifications` già presente; niente `@capacitor/app`).

Specifica: `docs/superpowers/specs/2026-10-10-groomly-fix-design.md`. Un solo piano, perché il lavoro si consegna insieme. I task sono in ordine: ognuno lascia i test verdi e il successivo li usa.

Lavorare in `D:\Groomly` sul branch `feat/groomly-fix`, partendo da `master`. Non aprire un worktree. Non cambiare `git config`. Non fare push. Non usare `--no-verify`.

## Esecuzione

Esegui questo piano con i subagent (`subagent-driven-development`), un task alla volta. Non chiedere nulla all’utente. Procedi da solo fino alla fine del piano ed esegui tutti i test previsti da ogni task. Se trovi una domanda, un bivio o più opzioni, scegli tu la soluzione che rispetta questa specifica e vai avanti. Non fermarti per una conferma. I task 1 e 2 sono già committati su `feat/groomly-fix`: non rifarli. Il task 12, se non c’è un telefono né un emulatore, fa build e `cap sync` e scrive nel report che i tre gesti non sono stati provati sul dispositivo: non dichiararli superati.

## Global Constraints

- Interfaccia solo in italiano. Telefono 360–390 px. Su 390×844 il form cane con le sezioni chiuse mostra Salva senza scorrere.
- **Annulla** solo nei toast, per disfare l’ultima azione. Mai su un foglio di conferma. La conferma sporca è «Chiudere senza salvare?» con Resta e Chiudi senza salvare.
- Stati appuntamento: `programmato`, `completato`, `disdetto`, `non_venuto`. Niente `window.confirm`.
- «Fissa anche il prossimo» su un occasionale non cambia `clientType`. Il link «Rendilo cliente mensile» scrive il tipo solo al salvataggio.
- Dopo un nuovo appuntamento si torna alla pagina di partenza. Il toast ha Annulla e Vedi. Vedi apre il calendario di quel giorno.
- `isSenior === (ageCategory === 'anziano')`. Nessuna checkbox Anziano.
- Niente reset CSS su `h1`, `p`, `label`, `ul` fuori dai contenitori toccati.
- Fascia di trascinamento e di tap vuoto: 08:00–19:00. `snapQuarter` non cambia estremi. `hourHeight` diventa 50.
- La specifica del 9 ottobre vale per ciò che questa non nomina.
- PowerShell: non usare `&&`. Il commit è una here-string. Non usare `git add -A`: elencare i file. Non aggiungere `GROOMLY.md`, `groomly-design.html`, `fix/groomly-fix-ux.md`.
- `npm run build` esegue `tsc --noEmit`. Non importare simboli inutilizzati.
- Nei test con data fissa usare `new Date(2026, 9, 10, 12, 0, 0, 0)` (sabato 10 ottobre 2026). Il 15 ottobre 2026 è giovedì.
- I test di `App` tengono `// @vitest-environment happy-dom` come prima riga. Lo spy è `vi.spyOn(localStorage, 'setItem')`.

## File map

- Create `src/lib/migrate.ts`: le quattro regole del §11.
- Create `src/lib/dogScreen.ts`: bozza del form, età dalle soglie, `isSenior` ricavato.
- Modify `src/lib/dogList.ts`: `phoneDigits`, `matchesDog`, `breedSurname`, `dogMark`. `buildSearchKey` include le cifre.
- Modify `src/lib/quote.ts`: `rankDogs` cerca anche il telefono, ultimo gradino.
- Modify `src/lib/cycle.ts`: `monthlyStatus` sostituisce l’orizzonte di 14 giorni come fonte. `dueSoon` filtra i da fissare.
- Modify `src/lib/calendarView.ts`: `placeAppointments`, `gridBounds`, `openingScroll`, `offHourCounts`.
- Modify `src/lib/backupDoc.ts`: `restoreBackup` migra prima di scrivere.
- Modify `src/types/models.ts`: stati `disdetto` e `non_venuto`, `cancelReason`.
- Modify `src/data/local/dogs.ts` e `appointments.ts`: chiave di ricerca e stati. `listDogs` / `listAppointments` migrano prima di leggere.
- Modify le pagine del §10 della specifica. Non creare un secondo set di pagine.
- `src/lib/firebaseMap.ts` accetta i quattro stati, altrimenti `programmato`.

---

### Task 1: Migrazione dei dati già salvati

**Files:**
- Create: `src/lib/migrate.ts`
- Create: `src/lib/migrate.test.ts`
- Modify: `src/lib/backupDoc.ts`
- Modify: `src/lib/backupDoc.test.ts`
- Modify: `src/data/local/dogs.ts` (chiamare la migrazione in `listDogs`)
- Modify: `src/data/local/appointments.ts` (chiamare la migrazione in `listAppointments`)
- Test: `src/lib/migrate.test.ts`, `src/lib/backupDoc.test.ts`

**Interfaces:**
- Consumes: `buildSearchKey` da `src/lib/dogList.ts` (il task 3 la estende; qui la chiave si ricalcola con nome, razza, nomi contatto e cifre telefono già strippate).
- Produces:
  - `migrateMaps(dogs: Record<string, unknown>, appointments: Record<string, unknown>): { dogs: Record<string, unknown>; appointments: Record<string, unknown>; changed: boolean }`
  - `migrateStored(uid: string): void` — legge le due mappe, se `changed` le riscrive.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/lib/migrate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { migrateMaps } from './migrate'

describe('migrateMaps', () => {
  it('porta un senior vecchio ad anziano, dà 4 settimane ai mensili e ricalcola la chiave', () => {
    const result = migrateMaps(
      {
        ercole: {
          id: 'ercole',
          name: 'Àrtù',
          breed: 'Terranova',
          ageCategory: 'adulto',
          isSenior: true,
          clientType: 'mensile',
          contact: { name: 'Maria Usai', phone: '+39 345 2424242' },
          contacts: [{ name: 'Maria Usai', phone: '+39 345 2424242' }],
          searchKey: 'artu scritto a mano',
        },
        luna: {
          id: 'luna',
          name: 'Luna',
          breed: 'Maltese',
          ageCategory: 'adulto',
          isSenior: false,
          clientType: 'occasionale',
          contact: { name: 'Bianchi', phone: '333' },
          searchKey: 'luna maltese bianchi',
        },
      },
      {
        a1: { id: 'a1', status: 'cancellato' },
        a2: { id: 'a2', status: 'completato' },
      },
    )
    expect(result.changed).toBe(true)
    const ercole = result.dogs.ercole as { ageCategory: string; isSenior: boolean; recurrenceWeeks: number; searchKey: string }
    expect(ercole.ageCategory).toBe('anziano')
    expect(ercole.isSenior).toBe(true)
    expect(ercole.recurrenceWeeks).toBe(4)
    expect(ercole.searchKey).toContain('artu')
    expect(ercole.searchKey).toContain('3452424242')
    expect(ercole.searchKey).not.toContain('+39')
    const luna = result.dogs.luna as { recurrenceWeeks?: number; ageCategory: string }
    expect(luna.ageCategory).toBe('adulto')
    expect(luna.recurrenceWeeks).toBeUndefined()
    expect((result.appointments.a1 as { status: string }).status).toBe('programmato')
    expect((result.appointments.a2 as { status: string }).status).toBe('completato')
  })

  it('non riscrive dati già a posto', () => {
    const dogs = {
      ok: {
        id: 'ok',
        name: 'Ok',
        breed: 'Barboncino',
        ageCategory: 'anziano',
        isSenior: true,
        clientType: 'mensile',
        recurrenceWeeks: 6,
        contact: { name: 'Lea', phone: '3452424242' },
        searchKey: 'ok barboncino lea 3452424242',
      },
    }
    const appointments = { a: { id: 'a', status: 'disdetto' } }
    const result = migrateMaps(dogs, appointments)
    expect(result.changed).toBe(false)
    expect((result.appointments.a as { status: string }).status).toBe('disdetto')
  })
})
```

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/lib/migrate.test.ts`
Expected: FAIL, `migrateMaps` non esiste.

- [ ] **Step 3: Implementare**

`src/lib/migrate.ts` applica, su oggetti piani, solo queste regole:

- `isSenior === true` e `ageCategory !== 'anziano'` → `ageCategory = 'anziano'`.
- `clientType === 'mensile'` e `recurrenceWeeks` non è un numero finito → `4`. Un occasionale non riceve il campo.
- `searchKey` = `buildSearchKey(name, breed, ...nomi)` più, se ci sono almeno 3 cifre, lo spazio e `phoneDigits` di ogni telefono (contatto principale e `contacts`). Il task 3 definisce `phoneDigits`; fino ad allora una copia locale identica va bene, poi si importa da `dogList.ts` e si toglie la copia.
- `status` assente dai quattro valori `programmato | completato | disdetto | non_venuto` → `programmato`.

`changed` è true se un campo è diverso dal valore in ingresso. Non mutare gli oggetti ricevuti: copiare.

`migrateStored(uid)` legge `storageKeys.dogs` e `storageKeys.appointments`. Se `changed`, riscrive solo le mappe cambiate. `listDogs` e `listAppointments` la chiamano come prima istruzione.

`restoreBackup` in `src/lib/backupDoc.ts`, dopo `readRestoreBundle` e prima di `writeJson`, chiama `migrateMaps` e scrive i risultati.

In `src/lib/backupDoc.test.ts` aggiungere il test del §11: un bundle con il cane senior-solo-checkbox, il mensile senza settimane, `searchKey` a mano e un appuntamento `status: 'annullato'`. Dopo `restoreBackup('uid-1', bundle)`, `localStorage` contiene `ageCategory: 'anziano'`, `recurrenceWeeks: 4`, la chiave con le cifre senza `+39`, e `status: 'programmato'`.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/lib/migrate.test.ts src/lib/backupDoc.test.ts src/data/local/dogs.test.ts src/data/local/appointments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/migrate.ts src/lib/migrate.test.ts src/lib/backupDoc.ts src/lib/backupDoc.test.ts src/data/local/dogs.ts src/data/local/appointments.ts
git commit -m @"
feat: migra cani e appuntamenti già salvati

"@
```

---

### Task 2: Età del cane, una sola fonte

**Files:**
- Create: `src/lib/dogScreen.ts`
- Create: `src/lib/dogScreen.test.ts`

**Interfaces:**
- Consumes: `AgeCategory` da `src/types/models.ts`. Soglie già in impostazioni: `ageThresholds` `{ giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 }`.
- Produces:
  - `categoryFromYear(year: number, now: Date, thresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }): AgeCategory`
  - `seniorOf(category: AgeCategory): boolean` — `category === 'anziano'`.
  - `applyBirthYear(screen: { ageCategory: AgeCategory; birthYear: string }, year: string, now: Date, thresholds): { ageCategory: AgeCategory; birthYear: string }` — un anno di 4 cifre ricalcola; un anno incompleto lascia `ageCategory`.
  - `DogScreen` con specie, razza, sesso, età, taglia, carattere, cliente, nome, proprietario, telefono, nota, avviso, anno, peso, `recurrenceWeeks`.

- [ ] **Step 1: Scrivere il test che fallisce**

```ts
import { describe, expect, it } from 'vitest'
import { applyBirthYear, categoryFromYear, seniorOf } from './dogScreen'

const thresholds = { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 }
const now = new Date(2026, 9, 10, 12, 0, 0, 0)

describe('categoryFromYear', () => {
  it('usa le soglie già salvate', () => {
    expect(categoryFromYear(2026, now, thresholds)).toBe('cucciolo')
    expect(categoryFromYear(2024, now, thresholds)).toBe('giovane')
    expect(categoryFromYear(2020, now, thresholds)).toBe('adulto')
    expect(categoryFromYear(2015, now, thresholds)).toBe('anziano')
  })
})

describe('seniorOf', () => {
  it('è vero solo per anziano', () => {
    expect(seniorOf('anziano')).toBe(true)
    expect(seniorOf('adulto')).toBe(false)
  })
})

describe('applyBirthYear', () => {
  it('un anno incompleto non sposta il segmento', () => {
    expect(applyBirthYear({ ageCategory: 'giovane', birthYear: '20' }, '201', now, thresholds).ageCategory).toBe('giovane')
  })

  it('un anno completo sposta, e il segmento successivo resta finché l’anno non cambia', () => {
    const fromYear = applyBirthYear({ ageCategory: 'adulto', birthYear: '' }, '2024', now, thresholds)
    expect(fromYear.ageCategory).toBe('giovane')
    expect(fromYear.birthYear).toBe('2024')
  })
})
```

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/lib/dogScreen.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Implementare**

Anni = `now.getFullYear() - year`. Sotto `giovaneFrom` → `cucciolo`; sotto `adultoFrom` → `giovane`; sotto `anzianoFrom` → `adulto`; altrimenti `anziano`. Anno completo = `/^\d{4}$/` e anno fra 1990 e l’anno corrente incluso. `applyBirthYear` se l’anno è completo e diverso da quello già nel campo, ricalcola; se è uguale, non tocca la categoria (così la scelta manuale resta). Se incompleto, aggiorna solo la stringa.

- [ ] **Step 4: Lanciare il test**

Run: `npx vitest run src/lib/dogScreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/dogScreen.ts src/lib/dogScreen.test.ts
git commit -m @"
feat: ricava l’anziano solo dalla categoria

"@
```

---

### Task 3: Ricerca, telefono, omonimi

**Files:**
- Modify: `src/lib/dogList.ts`
- Modify: `src/lib/dogList.test.ts`
- Modify: `src/lib/quote.ts`
- Modify: `src/lib/quote.test.ts`
- Modify: `src/data/local/dogs.ts` (`buildSearchKey` con i telefoni)
- Modify: `src/data/local/dogs.test.ts` (le asserzioni `searchKey.includes('333') === false`)

**Interfaces:**
- Consumes: `normalizeSearch`, `shortOwner`.
- Produces:
  - `phoneDigits(value: string): string` — toglie un prefisso iniziale `+39` o `0039` (spazi subito dopo non contano), poi tiene le cifre. Un `39` senza quel prefisso resta.
  - `matchesDog(dog, query: string): boolean` — non legge `searchKey`. Testo normalizzato su nome, razza e nomi contatto. Telefono solo se la query, dopo `phoneDigits`, ha almeno 3 cifre, e quelle cifre sono contenute in un telefono del cane.
  - `breedSurname(dog): string` — razza e ultima parola del proprietario, unite da ` · `. Vuota se manca tutto.
  - `dogMark(dog, peers: Dog[]): string | null` — null se nessun pari ha lo stesso nome normalizzato. Altrimenti `breedSurname`; se quella riga è identica a un pari, `shortOwner`; se manca tutto, null.
  - `rankDogs` aggiunge il gradino 3: telefono, stesse regole delle 3 cifre, dopo nome, proprietario e razza. Sempre al massimo 6 attivi.

`visibleDogs` usa `matchesDog`, non `searchKey.includes`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/dogList.test.ts`:

```ts
it('toglie +39 e 0039 e lascia un 39 nazionale', () => {
  expect(phoneDigits('+39 345 2424242')).toBe('3452424242')
  expect(phoneDigits('+393452424242')).toBe('3452424242')
  expect(phoneDigits('00393452424242')).toBe('3452424242')
  expect(phoneDigits('3921234567')).toBe('3921234567')
})

it('artu trova Àrtù anche se la searchKey è scritta a mano', () => {
  const dog = dogOf({ name: 'Àrtù', breed: 'Terranova', searchKey: 'non-normalizzata' })
  expect(matchesDog(dog, 'artu')).toBe(true)
})

it('il telefono corrisponde da 3 cifre, senza prefisso', () => {
  const dog = dogOf({ contact: { name: 'Usai', phone: '+39 345 2424242' } })
  expect(matchesDog(dog, '3452424242')).toBe(true)
  expect(matchesDog(dog, '+393452424242')).toBe(true)
  expect(matchesDog(dog, '33')).toBe(false)
})

it('una Luna archiviata non marca quella attiva', () => {
  const attiva = dogOf({ id: 'a', name: 'Luna', breed: 'Maltese', status: 'attivo', contact: { name: 'G. Bianchi', phone: '' } })
  const archivio = dogOf({ id: 'b', name: 'Luna', breed: 'Barboncino', status: 'non_in_cura', contact: { name: 'Verdi', phone: '' } })
  expect(dogMark(attiva, [attiva, archivio].filter((item) => item.status === 'attivo'))).toBeNull()
  expect(dogMark(archivio, [archivio])).toBeNull()
})
```

Adattare `dogOf` al helper già nel file. In `quote.test.ts` un cane trovato solo dal telefono sta nel risultato, dopo chi combacia per nome. In `dogs.test.ts` sostituire `expect(stored.searchKey.includes('333')).toBe(false)` : il telefono `333` (3 cifre) entra nella chiave; un telefono `+39 345 2424242` contribuisce `3452424242` e non `39`.

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `npx vitest run src/lib/dogList.test.ts src/lib/quote.test.ts`
Expected: FAIL su `phoneDigits` / `matchesDog` / `dogMark`.

- [ ] **Step 3: Implementare**

`phoneDigits`: `trim`, se inizia con `+39` togli 3 caratteri, se inizia con `0039` togli 4, poi togli gli spazi in testa, poi `replace(/\D/g, '')`.

`buildSearchKey(name, breed, ...contactNames)` resta il testo. Aggiungere un argomento opzionale `phones: string[] = []` in coda, oppure una funzione `searchKeyOf(dog)` usata da `dogs.ts` che concatena testo e cifre (`>= 3`). Aggiornare `dogFromWrite` in `src/data/local/dogs.ts`.

`dogMark` riceve già il gruppo di pari: Home, calendario e nuovo appuntamento passano solo gli `attivo`. Il tab Archivio passa solo `non_in_cura` e `deceduto`.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/lib/dogList.test.ts src/lib/quote.test.ts src/data/local/dogs.test.ts src/lib/migrate.test.ts`
Expected: PASS. Se il task 1 aveva una copia di `phoneDigits`, toglierla e importare da `dogList.ts`; rilanciare `src/lib/migrate.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/dogList.ts src/lib/dogList.test.ts src/lib/quote.ts src/lib/quote.test.ts src/data/local/dogs.ts src/data/local/dogs.test.ts src/lib/migrate.ts
git commit -m @"
feat: cerca dal vivo nome, razza e telefono

"@
```

---

### Task 4: Mensili, una sola funzione

**Files:**
- Modify: `src/lib/cycle.ts`
- Modify: `src/lib/cycle.test.ts`
- Modify: `src/lib/monthly.test.ts` se importa `cycleRow` / `dueSoon` con l’orizzonte di 14 giorni

**Interfaces:**
- Consumes: `Appointment`, `Dog`, `startOfLocalDay`, `recurrenceWeeksOf`.
- Produces:
  - `MonthlyGroup = 'in_ritardo' | 'in_scadenza' | 'nuovo' | 'fissato'`
  - `MonthlyRow`: `dog`, `due: Date | null`, `lastCompleted`, `booked`, `late: boolean`, `group`.
  - `monthlyStatus(dog, appointments, now, daysBefore): MonthlyRow | null` — null se il cane non è attivo mensile.
  - `dueSoon(...)` restituisce solo i gruppi `in_ritardo` e `in_scadenza`, stesso ordine di scadenza poi nome. `reminderText` riceve quel gruppo, non un calcolo suo.

Regole:

- Senza un `completato`: gruppo `nuovo`, `due` null, anche se esiste un futuro. Non è da fissare.
- `booked`: il `programmato` con giorno locale ≥ oggi, il più vicino. `disdetto` e `non_venuto` non fissano e non spostano la scadenza. Un `programmato` di un giorno precedente non fissa e non è l’ultimo trattamento.
- Con completato e `booked`: gruppo `fissato`. `late` se `booked.start` è dopo `due + 14 giorni`.
- Con completato, senza `booked`, scadenza prima di oggi: `in_ritardo`.
- Con completato, senza `booked`, scadenza entro `daysBefore` da oggi (oggi incluso): `in_scadenza`.
- Scadenza oltre l’anticipo e senza futuro: `monthlyStatus` restituisce null. Non entra nel conteggio.

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
const now = new Date(2026, 9, 10, 12, 0, 0, 0)

it('un futuro oltre 14 giorni dalla scadenza è fissato in ritardo, non da fissare', () => {
  const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 24, 10))], now, 7)
  expect(row?.group).toBe('fissato')
  expect(row?.late).toBe(true)
})

it('senza completati è nuovo e non accende il banner', () => {
  expect(monthlyStatus(mensile, [], now, 7)?.group).toBe('nuovo')
  expect(dueSoon([mensile], [], now, 7)).toEqual([])
})

it('un programmato di ieri non fissa', () => {
  const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 9, 10))], now, 7)
  expect(row?.group).toBe('in_ritardo')
  expect(row?.booked).toBeNull()
})
```

I helper `mensile`, `completed`, `programmato` stanno già in `cycle.test.ts`: estenderli, non duplicare il cane.

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/lib/cycle.test.ts`
Expected: FAIL, `monthlyStatus` assente o orizzonte 14 ancora in `bookedOf`.

- [ ] **Step 3: Implementare**

`bookedOf` non filtra più `due + 14`. Quel confronto resta solo per `late`. `cycleRow` può delegare a `monthlyStatus` se qualche test vecchio lo importa ancora; la pagina, il banner e `providers.tsx` nel task 10 leggono `dueSoon` / `monthlyStatus`, non un secondo calcolo.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/lib/cycle.test.ts src/lib/monthly.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/cycle.ts src/lib/cycle.test.ts src/lib/monthly.test.ts
git commit -m @"
feat: unisce banner e mensili in monthlyStatus

"@
```

---

### Task 5: Colonne, fascia e scroll del calendario

**Files:**
- Modify: `src/lib/calendarView.ts`
- Modify: `src/lib/calendarView.test.ts` (crearlo se manca)
- Modify: `src/theme/sizes.ts` — `calendar.hourHeight: 50`

**Interfaces:**
- Produces:
  - `placeAppointments(items: { id: string; start: Date; durationMin: number }[]): { id: string; column: number; columnCount: number }[]`
  - `gridBounds(spans: { start: Date; end: Date }[]): { startHour: number; endHour: number }` — base 8 e 19; si allunga all’ora intera precedente o successiva.
  - `openingScroll({ isToday, now, startHour, endHour, hourHeight, viewportHeight }): number`
  - `offHourCounts(spans, startHour, endHour): { before: number; after: number }`

Sovrapposizione: gli intervalli si toccano senza dividersi (`fine <= inizio` del successivo). Durata 0, solo per le colonne, vale 15 minuti. Ordine: inizio, poi `id` con `localeCompare`. Prima colonna libera. `columnCount` è quello del gruppo che si sovrappone, non il massimo del giorno. `snapQuarter` resta 08:00–19:00.

`openingScroll`: se non è oggi, l’offset delle 08:00 in cima. Se è oggi e l’ora è dentro la griglia, la linea sta a un terzo del viewport dall’alto. Prima dell’inizio, 0. Dopo la fine, il massimo. Mai negativo, mai oltre il fondo.

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('affianca 10:00, 10:30 e 11:00 e non divide chi si tocca', () => {
  const placed = placeAppointments([
    { id: 'c', start: new Date(2026, 9, 10, 11, 0), durationMin: 60 },
    { id: 'a', start: new Date(2026, 9, 10, 10, 0), durationMin: 60 },
    { id: 'b', start: new Date(2026, 9, 10, 10, 30), durationMin: 60 },
    { id: 'd', start: new Date(2026, 9, 10, 12, 0), durationMin: 60 },
  ])
  const byId = Object.fromEntries(placed.map((item) => [item.id, item]))
  expect(new Set([byId.a.column, byId.b.column, byId.c.column]).size).toBe(3)
  expect(byId.a.columnCount).toBe(3)
  expect(byId.d.columnCount).toBe(1)
})

it('mostra per intero le 07:00 e le 18:45 più due ore', () => {
  expect(gridBounds([
    { start: new Date(2026, 9, 10, 7, 0), end: new Date(2026, 9, 10, 8, 0) },
    { start: new Date(2026, 9, 10, 18, 45), end: new Date(2026, 9, 10, 20, 45) },
  ])).toEqual({ startHour: 7, endHour: 21 })
})

it('un giorno che non è oggi parte dalle 08:00', () => {
  expect(openingScroll({
    isToday: false,
    now: new Date(2026, 9, 10, 15, 0),
    startHour: 7,
    endHour: 21,
    hourHeight: 50,
    viewportHeight: 400,
  })).toBe(50)
})
```

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/lib/calendarView.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementare**

Cluster: ordinare, e aprire un gruppo nuovo quando l’inizio è ≥ alla fine massima del gruppo. Dentro il gruppo, la prima colonna la cui fine è ≤ all’inizio. `columnCount` = colonne usate in quel gruppo.

`gridBounds` senza appuntamenti restituisce `{ startHour: 8, endHour: 19 }`. Un inizio alle 07:15 porta `startHour` a 7. Una fine alle 20:00 esatte porta `endHour` a 20; una fine alle 20:45 porta 21.

- [ ] **Step 4: Lanciare il test**

Run: `npx vitest run src/lib/calendarView.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/calendarView.ts src/lib/calendarView.test.ts src/theme/sizes.ts
git commit -m @"
feat: affianca gli appuntamenti e allunga la griglia

"@
```

---

### Task 6: Form e scheda cane

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogFields.tsx`
- Modify: `src/pages/DogPage.test.tsx` (o il test di pagina già presente)
- Modify: `src/lib/dogFormSeed.ts` solo se il seme contraddice `DogScreen`

**Interfaces:**
- Consumes: `DogScreen`, `applyBirthYear`, `seniorOf`, `categoryFromYear`.
- Produces: la pagina tiene un solo `DogScreen`. Salva scrive quello, con `isSenior: seniorOf(ageCategory)`.

Comportamento, dalla specifica §1:

- `/animali/nuovo` è solo il form compatto: avatar, Nome, Razza | Taglia, Proprietario | Telefono, tre sticker 48 px con etichetta, avviso, «Altri dettagli» chiuso, «Prezzi personalizzati» chiuso, Salva a tutta larghezza. Niente griglia matita, storico, galleria, icona telefono, Modifica, checkbox Anziano, scritta Annulla.
- Obbligatori: nome, proprietario, telefono. Default: Cane, Adulto, Piccola, Bravo, Occasionale.
- Da 360 px le due coppie stanno sulla stessa riga; sotto, una colonna.
- Mensile: in Altri dettagli, «Frequenza: ogni [4] settimane». Occasionale: quel campo non c’è.
- Anno completo ricalcola; poi il segmento manuale vale fino al prossimo cambio dell’anno.
- Prezzi chiusi non scrivono nulla. Aperti: Prezzo € e Durata min, listino come placeholder, si salva solo lo scostamento. Switch «nascondi questo servizio per questo cane».
- Foto dall’avatar. L’input file non è visibile.
- Salva: toast «Fido salvato» con Annulla, poi la scheda. Fallimento: schermo invariato, «Salvataggio non riuscito».
- Lettura: foto 64 px, nome, razza · età, proprietario, Chiama, chip, banda rossa, prossimo o «Fissa appuntamento», storico con freccia se il prezzo è cambiato, note, Dettagli chiusi, contatti. Matita nell’header. Archivio nel menu ⋯. Ruolo di un contatto nuovo: vuoto.
- «Fissa il prossimo» e +2 / +4 / +6, se c’è già un `programmato` futuro, chiedono «Ercole ha già un appuntamento il 22 ott. Crearne un altro?» e non scrivono prima della conferma.
- `inputmode="tel"` e `decimal`, `autocapitalize="words"`, Avanti sul campo successivo, ultimo campo = Salva. Etichette tramite `Field`.

- [ ] **Step 1: Scrivere il test che fallisce**

Nel test di `DogPage`, con router in memoria su `/animali/nuovo`:

```ts
it('crea con nome, proprietario e telefono e non mostra la checkbox Anziano', async () => {
  renderDog('/animali/nuovo')
  expect(screen.queryByRole('checkbox', { name: /anziano/i })).toBeNull()
  expect(screen.queryByText('Rinomina Razza')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Modifica' })).toBeNull()
  await user.type(screen.getByLabelText(/nome/i), 'Fido')
  await user.type(screen.getByLabelText(/proprietario/i), 'Usai')
  await user.type(screen.getByLabelText(/telefono/i), '3452424242')
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(await screen.findByText('Fido salvato')).toBeTruthy()
  const saved = listDogs(uid)[0]
  expect(saved.name).toBe('Fido')
  expect(saved.isSenior).toBe(false)
  expect(saved.ageCategory).toBe('adulto')
})
```

Secondo test: segmento Anziano, Salva, `isSenior === true`. Terzo: anno 2024 su un adulto porta Giovane; un tap su Adulto dopo resta Adulto finché l’anno non cambia.

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/pages/DogPage.test.tsx`
Expected: FAIL, la checkbox o la griglia sono ancora in creazione.

- [ ] **Step 3: Implementare**

Togliere il secondo stato (`temperamentOverride`, `categoryOverride`, `yearTouched`) da `writeFromScreen`. La pagina possiede `DogScreen`. `DogFields` riceve valore e `onChange`, non un `useForm` interno che può vincere al salvataggio. In creazione non montare `DogLower`. In lettura i dettagli sono la sezione chiusa, non una griglia viva.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/pages/DogPage.test.tsx src/lib/dogScreen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/DogPage.tsx src/pages/DogFields.tsx src/pages/DogPage.test.tsx src/lib/dogFormSeed.ts
git commit -m @"
feat: un solo form per creare e modificare il cane

"@
```

---

### Task 7: Foglio nuovo appuntamento

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/app/router.tsx` se serve la rotta di sfondo
- Modify: `src/pages/CalendarPage.tsx`, `src/pages/MonthlyPage.tsx`, `src/pages/DogPage.tsx` solo per passare `state.background` all’apertura
- Test: `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `matchesDog`, `rankDogs`, `breedSurname`, `dogMark`, `quotedPrice`.
- Produces: `requestClose()` usato da Chiudi, sfondo, swipe ≥ 80 px e dal passo indietro (`popstate` / `navigate(-1)`).

Comportamento, specifica §2:

- Niente seconda `PhoneShell`, niente link «Calendario», niente freccia dentro il foglio. Header: Chiudi (✕) e titolo.
- Le aperture dall’app passano `location.state.background`. URL diretto: la storia ha sotto la pagina di `backTarget` (niente parametri → Home; `?da=mensili` → Mensili; `?data=` → quel giorno; `?cane=` → scheda se esiste).
- Sporco = un cambio rispetto ai valori già messi. Aprire e chiudere subito è pulito. Dettaglio in lettura non è sporco. «Appuntamento assente» chiude senza domanda.
- Pulito: un passo, la pagina sotto, l’app resta aperta. Sporco: «Chiudere senza salvare?». Domanda aperta: Indietro = Resta.
- Salva un nuovo appuntamento: chiude e torna alla pagina di partenza. Toast «Appuntamento salvato per lun 12 ott 09:00» con Annulla e Vedi. Annulla toglie l’appuntamento e il cane se è nato in questa azione. Vedi va al calendario di quel giorno.
- Una modifica salvata resta sul dettaglio.
- Ricerca: prima di scrivere, fino a 5 `recentDogIds` attivi; se vuoto, niente «Nessun cane». Righe con foto, nome, razza, proprietario, icona carattere e sempre razza · cognome. Massimo 6. «+ Nuovo cane» ultima riga, senza navigare: mini-scheda Nome, Specie (Cane), Taglia (Piccola), Proprietario, Telefono. Nome già scritto. Gatto resta gatto. Grande usa i prezzi grandi. Nome identico a un attivo: «Esiste già Ercole (Terranova, Usai). Crearne un altro?».
- Chip a due colonne: `Bagno · 30m · €20`. Totale vivo sotto i servizi e sticky sopra Salva: «10:00 → 12:00 · 2h · €60».
- Data e ora sulla stessa riga. Scorciatoie Oggi, Domani, +7 gg, +30 gg. Slot occupati grigi in base alla durata. «09:00 → 10:15».
- Sovrapposizione: riquadro giallo «Si sovrappone a Zeus 11:00–14:00», anche in creazione. Salva dopo conferma.
- Salva disabilitato senza cane, un servizio, data e ora.
- Ordine: Cane, Servizi, Quando, Riepilogo, Salva. 20 px tra i blocchi.

Il passo indietro nei test è `navigate(-1)` o l’evento `popstate` sul memory router, la stessa funzione di Chiudi. Non serve un dispositivo in questo task.

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('da pulito, indietro torna alla pagina sotto', async () => {
  renderAt('/mensili', { then: '/appuntamenti/nuovo' })
  await user.click(screen.getByRole('button', { name: 'Chiudi' }))
  expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
})

it('con dati inseriti, indietro chiede conferma e un secondo indietro è Resta', async () => {
  renderAt('/mensili', { then: '/appuntamenti/nuovo' })
  await user.type(screen.getByLabelText(/cerca cane/i), 'Ercole')
  await user.click(screen.getByRole('button', { name: 'Chiudi' }))
  expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
  await goBack()
  expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
  expect(screen.getByLabelText(/cerca cane/i)).toBeTruthy()
})

it('dopo il salvataggio torna ai Mensili e Vedi apre il calendario', async () => {
  // cane e servizio già scelti, data e ora compilate
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
  expect(screen.getByText(/Appuntamento salvato per/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Vedi' }))
  expect(screen.getByRole('heading', { name: /calendario/i })).toBeTruthy()
})
```

Aggiungere: gatto inline resta `species: 'gatto'`; taglia grande legge il prezzo grande; nome già presente chiede conferma prima della mini-scheda.

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementare**

`requestClose` è l’unica uscita. Il salvataggio nuovo non la usa come «resta sul dettaglio»: `navigate` verso `background` (o `backTarget` se l’URL era diretto), con il toast. Il toast esistente in `src/components/layout/Toast.tsx` guadagna un’azione secondaria `Vedi` oltre Annulla, solo per questo messaggio.

Lo swipe: sulla maniglia, un `pointer` verticale. Se il delta è ≥ 80, `requestClose`; altrimenti l’animazione torna a 0. Il grabber sta in `Sheet` oppure nel foglio appuntamento se `Sheet` è condiviso con conferme che non devono chiudersi a swipe: in quel caso lo swipe vive solo sul foglio appuntamento.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/AppointmentForm.tsx src/pages/AppointmentPage.test.tsx src/pages/ShellFrame.tsx src/pages/CalendarPage.tsx src/pages/MonthlyPage.tsx src/pages/DogPage.tsx src/components/layout/Toast.tsx src/components/layout/Sheet.tsx src/app/router.tsx
git commit -m @"
feat: chiude il nuovo appuntamento sulla pagina di partenza

"@
```

---

### Task 8: Ripeti, stati, scheda appuntamento

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/appointments.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/lib/appointments.ts` se la creazione della serie sta lì
- Test: `src/pages/AppointmentPage.test.tsx`, `src/data/local/appointments.test.ts`

**Interfaces:**
- Consumes: `recurrenceWeeksOf`, `addWeeks`.
- Produces:
  - `AppointmentStatus = 'programmato' | 'completato' | 'disdetto' | 'non_venuto'`
  - `cancelReason?: 'cliente' | 'salone' | 'deceduto'`
  - `repeatChoice(input: { repeat: boolean; makeMonthly: boolean; weeks: number; dogClientType: 'mensile' | 'occasionale' }): { count: 1 | 2; nextClientType: 'mensile' | 'occasionale'; weeks: number }`

`repeatChoice`: `repeat` false → un appuntamento, il tipo cambia solo se `makeMonthly`. `repeat` true → due appuntamenti. Su un occasionale il tipo resta occasionale salvo `makeMonthly`. Su un mensile, `weeks` è la nuova frequenza. Il secondo appuntamento è `addWeeks(start, weeks)`, stessa ora, stesso `seriesId`. Giovedì 15 ottobre 2026, N = 4 → giovedì 12 novembre 2026.

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('su un occasionale crea due appuntamenti e non lo fa mensile', async () => {
  // switch acceso, link non toccato, start 15 ott 2026 10:00, N = 4
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  const items = listAppointments(uid).sort((a, b) => a.start.getTime() - b.start.getTime())
  expect(items).toHaveLength(2)
  expect(items[1].start).toEqual(new Date(2026, 10, 12, 10, 0, 0, 0))
  expect(items[0].seriesId).toBe(items[1].seriesId)
  expect(listDogs(uid)[0].clientType).toBe('occasionale')
})

it('Rendilo cliente mensile scrive il tipo al salvataggio', async () => {
  await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
  await user.click(screen.getByRole('button', { name: 'Salva' }))
  expect(listDogs(uid)[0].clientType).toBe('mensile')
  expect(listDogs(uid)[0].recurrenceWeeks).toBe(4)
})
```

Altri test nello stesso file:

- Completato è abilitato oggi alle 08:00 e su un giorno passato; è disabilitato domani.
- Disdici lascia `disdetto` nello storico. Il toast «Appuntamento disdetto · Annulla» c’è. Annulla riporta `programmato`.
- Non venuto scrive `non_venuto`.
- «Fissa il prossimo» con un futuro già presente mostra «Ercole ha già un appuntamento il 22 ott. Crearne un altro?».
- Lo switch spento crea un solo appuntamento.
- Chiudere senza salvare dopo aver toccato il link non cambia il cane.

`appointmentStatus` in `appointments.ts` e lo status in `firebaseMap.ts` accettano i quattro valori; ogni altro resta `programmato`. `disdetto` e `non_venuto` non contano in `lastCompletedOf` né in `booked`.

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/data/local/appointments.test.ts src/lib/cycle.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementare**

Sulla scheda: card cane, «Sab 10 ott · 10:00–12:00», scontrino servizi, niente seconda copia di ora e durata. Sticky Completato. Sopra, tre bottoni uguali: Anticipa −15, Posticipa +15, Modifica. Disdici rosso, sotto Non venuto. Niente Sposta. Disdici chiede cliente o salone. Elimina solo da ⋯, con foglio.

Dopo Completato restano durata reale, foto, note, «Fissa il prossimo». Anticipa, Posticipa e Modifica non restano. «Note del lavoro» chiusa, aperta dopo Completato.

Un `programmato` di un giorno prima di oggi è da chiudere. Oggi, ora passata, resta completabile.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/data/local/appointments.test.ts src/lib/cycle.test.ts src/lib/firebaseMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/firebaseMap.ts src/lib/appointments.ts src/pages/AppointmentForm.tsx src/pages/AppointmentPage.tsx src/pages/AppointmentPage.test.tsx src/lib/cycle.ts src/lib/cycle.test.ts
git commit -m @"
feat: ripete una volta e distingue disdetto da non venuto

"@
```

---

### Task 9: Calendario disegnato

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/CalendarPage.test.tsx`
- Modify: `src/components/domain/AppointmentRow.tsx` se la lista del mese e del giorno usa quella riga

**Interfaces:**
- Consumes: `placeAppointments`, `gridBounds`, `openingScroll`, `offHourCounts`, `dogMark`, `snapQuarter`.
- Produces: i blocchi del giorno e della settimana, la vista mese senza foglio.

- Giorno e settimana condividono, in settimana, lo stesso `gridBounds`.
- Posizione = ora esatta. Altezza minima disegnata 18 px. «08:00» ha 10 px sopra e non è tagliata.
- Tap vuoto solo 08–19. Un 07:00 si vede; trascinato, `snapQuarter` lo porta in fascia.
- Blocco sovrapposto: 2 px di spazio, contorno `var(--warn)` 2 px. La linea rossa sta sopra i blocchi (`z-index` maggiore).
- Hint «↑ 1 prima delle 8» e «↓ 1 dopo le 19» solo finché quel tratto è fuori vista.
- Colori: completato spunta verde; da chiudere bordo arancione; disdetto e non venuto barrati e grigi; cane archiviato grigio con icona archivio. Il riempimento del `programmato` resta quello già in uso.
- Settimana, colonna intera: icona e nome troncato «Erco…». Omonimo e altezza ≥ 32 px: mark sulla seconda riga. Altrimenti il mark sta solo nel nome accessibile «Apri Luna, Maltese, Bianchi». Le prime lettere del nome restano visibili.
- Settimana, blocco diviso: iniziali se il nome è unico (prima lettera di ogni parola, massimo 3). Omonimo: mark troncato, non una sola lettera.
- Mese: niente striscia della settimana, numero di appuntamenti al posto dei pallini, lista del giorno nella pagina, niente buco sotto.

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('in settimana un appuntamento senza sovrapposizioni mostra le prime lettere', () => {
  renderWeek([{ name: 'Ercole', start: '10:00', durationMin: 60 }])
  expect(screen.getByText(/Erco/)).toBeTruthy()
  expect(screen.queryByText('E')).toBeNull()
})

it('due Luna attive si distinguono e una archiviata no', () => {
  renderDay({ dogs: [lunaBianchi, lunaUsai], bothActive: true })
  expect(screen.getByText(/Bianchi/)).toBeTruthy()
})
```

Aggiungere: tre sovrapposti hanno tre colonne (`style` o `data-column`); il 07:00 è nel documento; la vista mese non ha `role="dialog"` per il giorno.

- [ ] **Step 2: Lanciare il test e vederlo fallire**

Run: `npx vitest run src/pages/CalendarPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementare**

`AppointmentBlock` usa `column`, `columnCount` e l’ora di `gridBounds`, non `left: 2; right: 2` per tutti. Il nome visibile in settimana non è solo l’iniziale quando `columnCount === 1`.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/pages/CalendarPage.test.tsx src/lib/calendarView.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/CalendarPage.tsx src/pages/CalendarPage.test.tsx src/components/domain/AppointmentRow.tsx
git commit -m @"
feat: mostra gli appuntamenti affiancati e il mese in pagina

"@
```

---

### Task 10: Home, Mensili, lista, archivio

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/MonthlyPage.tsx`
- Modify: `src/pages/DogsPage.tsx`
- Modify: `src/components/domain/MonthlyBanner.tsx`
- Modify: `src/app/providers.tsx` (il testo della notifica riceve `dueSoon`)
- Modify: `src/pages/DogPage.tsx` per Deceduto / Non più in cura
- Test: i test di pagina già presenti per Home, Monthly, Dogs

**Interfaces:**
- Consumes: `monthlyStatus`, `dueSoon`, `reminderText`, `dogThirdLine` aggiornata.

Lista Animali, a destra, non su una terza riga: se c’è un futuro, la sua data, mai «Da fissare». Se non c’è un futuro e c’è un `programmato` di un giorno passato, «Da chiudere». Altrimenti «Nessun appuntamento». «Da fissare» è un badge arancione. Sottotitolo resta razza · età · proprietario, senza una riga omonimi in più.

Home, in ordine: data, Oggi (completati in fondo con spunta; in corso o prossimo con bordo blu a sinistra), banner mensili, poi «Da chiudere (N)», una riga sola con tre statistiche (calendario di oggi, mensili, listino), visti di recente solo se i cani sono almeno 3. Il campanello va a `/mensili` e il pallino usa il conteggio di `dueSoon`. «Da chiudere» offre Completato, Non venuto, Disdetto.

Mensili, in ordine: In ritardo (rosso), In scadenza questa settimana (arancione), Nuovi (niente «Scade oggi»), Fissati (verdi, chiusi; il fissato in ritardo dentro resta arancione «Fissato in ritardo · 24 ott»). Riga: nome e «ultimo 5 set · scade 3 ott» a sinistra, Fissa a destra.

Archivio: Deceduto dice quanti futuri `programmato` ci sono e li porta tutti a `disdetto` con `cancelReason: 'deceduto'`. Non offre «Archivia soltanto». Non più in cura chiede ancora: archivia e disdici, oppure archivia soltanto. I completati restano.

Chip servizio: se non entrano, `+N`, e il chip visibile ha la parola intera. Filtro «Altri» solo se esiste almeno un `altro`. Avatar cane / gatto / generico. I testi restano «cane».

- [ ] **Step 1: Scrivere i test che falliscono**

```ts
it('banner, pagina e testo notifica hanno lo stesso numero', () => {
  const rows = dueSoon(dogs, appointments, now, 7)
  expect(reminderText(rows)).toContain(String(rows.length))
  renderHome()
  expect(screen.getByText(new RegExp(String(rows.length)))).toBeTruthy()
})

it('Deceduto disdice i futuri e non chiede di archiviare soltanto', async () => {
  await user.click(screen.getByRole('button', { name: 'Deceduto' }))
  expect(screen.queryByRole('button', { name: /soltanto/i })).toBeNull()
  expect(listAppointments(uid).filter((item) => item.start > now && item.status === 'programmato')).toHaveLength(0)
  expect(listAppointments(uid).some((item) => item.status === 'disdetto')).toBe(true)
})
```

Aggiungere: un futuro oltre 14 giorni non mostra «Da fissare» in lista; un `programmato` di ieri mostra «Da chiudere»; un mensile senza completati non accende il banner.

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/MonthlyPage.test.tsx src/pages/DogsPage.test.tsx src/pages/DogPage.test.tsx`
Expected: FAIL sui casi nuovi. Se un file di test non esiste, crearlo accanto alla pagina, con la stessa memoria router delle altre pagine.

- [ ] **Step 3: Implementare**

`providers.tsx` passa a `reminderText` il risultato di `dueSoon`, non un elenco calcolato a parte. `dogThirdLine` smette di dire «Da fissare» quando `nextAppointment` esiste.

- [ ] **Step 4: Lanciare i test**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/MonthlyPage.test.tsx src/pages/DogsPage.test.tsx src/pages/DogPage.test.tsx src/lib/cycle.test.ts src/lib/reminderText.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/MonthlyPage.tsx src/pages/MonthlyPage.test.tsx src/pages/DogsPage.tsx src/pages/DogsPage.test.tsx src/pages/DogPage.tsx src/pages/DogPage.test.tsx src/components/domain/MonthlyBanner.tsx src/app/providers.tsx src/lib/dogList.ts src/lib/dogList.test.ts src/lib/reminderText.ts
git commit -m @"
feat: allinea home, mensili e archivio alla stessa scadenza

"@
```

---

### Task 11: Spazi, listino, impostazioni, azioni

**Files:**
- Modify: `src/components/ui/Field.tsx` (o il componente etichetta già usato dai form)
- Modify: `src/pages/ListinoPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/pages/DogsPage.tsx` per la lista vuota e la riga
- Modify: `src/components/layout/BottomNav.tsx`
- Test: i test di quelle pagine

Dalla specifica §8, solo sulle schermate toccate:

- `Field`: etichetta a 4 px dal controllo (massimo 6), 13 px, peso 600, margine 0. Tra campi 14–16 px. Tra sezioni 24 px. Input 40–44 px.
- Niente blocchi vuoti. Sezione vuota = titolo e «+ Aggiungi» sulla stessa riga. Titolo di sezione: 16 px sopra, 6 px sotto.
- Pagina: 12–16 px ai lati, 12 px in alto. Header entro 48–52 px. Salva sticky con la safe area e nient’altro sotto.
- Righe 56–64 px, foto 40 px. Foglio `max-height: 90vh`, alto quanto il contenuto; se è lungo, alto quanto lo schermo.
- Una primaria blu, in basso, a tutta larghezza. Titolo 18–20, testo 15, secondario 13 grigio. Bersagli almeno 44 px, 8 px fra due vicini. Cifre tabulari a destra.
- Lista vuota Animali: icona zampa già in app e «Aggiungi il primo cane». Niente disegno nuovo. Le altre liste vuote sono titolo + azione.
- Listino: prezzo unico «€ 5 · tutte le taglie», non solo la colonna Grande. Intestazione sticky. Extra sotto «Servizi aggiuntivi · prezzo unico».
- Impostazioni: righe 52 px. Esci rosso, staccato in fondo. Backup: data dell’ultimo, «Mai eseguito» arancione.
- Il «+» apre due bottoni grandi, prima Appuntamento poi Animale. Voce attiva della barra: grassetto e colore primario.
- Ricerca, tab e filtri sticky; tab e filtri su una riga di chip. Nomi lunghi su una riga con «…».

- [ ] **Step 1: Scrivere il test che fallisce**

```ts
it('un prezzo unico non sta solo nella colonna Grande', () => {
  renderListino({ services: [{ name: 'Nastro', price: { piccola: 5, media: 5, grande: 5 } }] })
  expect(screen.getByText('€ 5 · tutte le taglie')).toBeTruthy()
})

it('il più apre prima Appuntamento', async () => {
  await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
  const buttons = screen.getAllByRole('button')
  const labels = buttons.map((item) => item.textContent)
  expect(labels.indexOf('Appuntamento')).toBeLessThan(labels.indexOf('Animale'))
})
```

Aggiungere: lista cani vuota mostra «Aggiungi il primo cane»; backup senza data mostra «Mai eseguito».

- [ ] **Step 2: Lanciare i test e vederli fallire**

Run: `npx vitest run src/pages/ListinoPage.test.tsx src/pages/SettingsPage.test.tsx src/pages/DogsPage.test.tsx src/components/layout/shell.test.tsx`
Expected: FAIL sui testi nuovi.

- [ ] **Step 3: Implementare**

Non aggiungere un reset globale. I margini si azzerano nel contenitore della schermata. `Field` è l’unico posto della distanza etichetta-controllo.

- [ ] **Step 4: Lanciare build e test**

Run: `npx vitest run`
Expected: PASS.

Run: `npm run build`
Expected: `tsc` e Vite terminano senza errori.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ui/Field.tsx src/pages/ListinoPage.tsx src/pages/ListinoPage.test.tsx src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/pages/ShellFrame.tsx src/pages/DogsPage.tsx src/pages/DogsPage.test.tsx src/components/layout/BottomNav.tsx src/components/layout/shell.test.tsx
git commit -m @"
feat: riavvicina etichette, listino e azioni

"@
```

Se `Field.tsx` ha un altro nome, aggiungere quel file e non crearne uno nuovo.

---

### Task 12: Verifica sul telefono

**Files:**
- Nessuna modifica di prodotto, salvo un bug trovato nei tre gesti. In quel caso il fix sta nel task che possiede il gesto (7 per Indietro e swipe, 10 per la notifica) e si aggiunge un commit separato.

Questo task non ha un test Vitest che possa passare al posto del telefono. I test dei task 7 e 10 restano la rete; qui si guarda il dispositivo.

- [ ] **Step 1: Preparare la build**

Run: `npm run build`
Poi: `npx cap sync android`

Aprire il progetto Android (`npx cap open android`) e installare su un telefono o un emulatore. Serve un account con almeno un mensile da fissare e un appuntamento apribile.

- [ ] **Step 2: Tasto Indietro**

Aprire un appuntamento nuovo dalla lista Mensili, cambiare un campo, premere Indietro (tasto o gesto). Deve comparire «Chiudere senza salvare?» e l’app non si chiude. Premere di nuovo Indietro: la domanda si chiude, il form resta. Chiudere da pulito: si torna ai Mensili, non alla Home e non fuori dall’app.

- [ ] **Step 3: Swipe**

Sulla maniglia, trascinare meno di 80 px: il foglio torna su. Trascinare almeno 80 px su un foglio sporco: stessa domanda di Chiudi. Su un foglio pulito: si chiude sulla pagina sotto.

- [ ] **Step 4: Notifica**

Con il promemoria acceso, leggere il testo della notifica Android. Il numero e i nomi (massimo tre) sono gli stessi del banner in Home. Un futuro oltre 14 giorni dalla scadenza non entra in quel numero. Un mensile senza completati nemmeno.

- [ ] **Step 5: Segnare l’esito**

Nel messaggio di chiusura del task scrivere le tre prove e l’esito (telefono o emulatore, modello se c’è). Se una fallisce, non dichiarare il piano finito: correggere e riprovare quel gesto.

Non c’è commit se il dispositivo conferma i tre gesti e non serve un fix.
