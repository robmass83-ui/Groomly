# Appuntamento personale e chiusure — piano

> Archiviato il 22 ottobre 2026. Già nell'app.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dal **+** si crea un appuntamento personale e una chiusura del salone, visibili nel calendario e in Oggi, senza entrare negli incassi.

**Architecture:** Il personale è un `Appointment` con `kind: 'personale'` nella raccolta già esistente. La chiusura è un record a parte, locale e cloud, accanto agli appuntamenti. Il calendario legge i due conteggi e il velo. La visita al cane, su un giorno chiuso, chiede conferma prima di salvare.

**Tech Stack:** React 18, React Router 6, TypeScript, Vitest, happy-dom, Firebase Firestore già usato dal salone. Nessuna dipendenza nuova.

## Global Constraints

- Spec: `docs/superpowers/specs/archive/2026-10-21-personale-chiusure-design.md`. I testi fra virgolette si copiano così come sono.
- `Appointment.end` non è l’ora di fine del personale. Quella è `plannedEnd`.
- Un documento senza `kind` si legge `pelosetto`. Non si riscrivono gli appuntamenti vecchi solo per aggiungere il tipo.
- Il personale non ha `dogId`, `services`, `status`, `total`, `photos`. `classify` restituisce `'escluso'`.
- Le chiusure non stanno in `settings/main`. Chiave locale `groomly.users.{uid}.closures`. Cloud `salonDocPath('closures', id)`. `firestore.rules` non si modifica.
- Nessun colore esadecimale nuovo. Velo: `--closed` = `color-mix(in srgb, var(--bad) 8%, transparent)`, `--closed-line` = `color-mix(in srgb, var(--bad) 16%, transparent)`.
- Controlli nuovi alti almeno 44 px.
- Il foglio della visita nuova resta intitolato «Nuovo appuntamento».
- Non alzare `APP_VERSION` e non pubblicare l’APK in questi task. Il publish sta dopo, quando tutto il piano è verde.
- I test del task devono passare prima del commit di quel task. Per un file: `npx vitest run src/path/file.test.ts`.

---

### Task 1: Regole pure di personale, chiusura e incassi

**Files:**
- Create: `src/lib/personal.ts`
- Create: `src/lib/closures.ts`
- Test: `src/lib/personal.test.ts`
- Test: `src/lib/closures.test.ts`
- Modify: `src/types/models.ts` (`Appointment`)
- Modify: `src/lib/earnings.ts` (`classify`)
- Test: `src/lib/earnings.test.ts` (o il file di test che già copre `classify`)

**Interfaces:**
- Consumes: `localDayKey` da `src/lib/appointments.ts`, `Appointment` da `src/types/models.ts`
- Produces:
  - `appointmentKind(appointment: { kind?: 'pelosetto' | 'personale' }): 'pelosetto' | 'personale'`
  - `personalTitleOk(title: string): boolean`
  - `personalEndOk(start: Date, plannedEnd: Date | null): boolean`
  - `personalPlaceMinutes(start: Date, plannedEnd: Date | null): number`
  - `Closure` con `id`, `reason`, `startDay`, `endDay`, `createdAt`, `updatedAt`
  - `closureReasonOk(reason: string): boolean`
  - `closureRangeOk(startDay: string, endDay: string): boolean`
  - `closureCovers(closure: { startDay: string; endDay: string }, dayKey: string): boolean`
  - `closuresOverlap(a: { startDay: string; endDay: string }, b: { startDay: string; endDay: string }): boolean`
  - `closureOn(closures: Closure[], dayKey: string): Closure | null`

- [ ] **Step 1: Write the failing test**

`src/lib/personal.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { appointmentKind, personalEndOk, personalPlaceMinutes, personalTitleOk } from './personal'

describe('personale', () => {
  it('senza kind è pelosetto', () => {
    expect(appointmentKind({})).toBe('pelosetto')
    expect(appointmentKind({ kind: 'personale' })).toBe('personale')
  })

  it('il titolo ha da 1 a 60 caratteri', () => {
    expect(personalTitleOk('  Dentista  ')).toBe(true)
    expect(personalTitleOk('   ')).toBe(false)
    expect(personalTitleOk('a'.repeat(61))).toBe(false)
  })

  it('la fine vuota va bene; lo stesso minuto no; il giorno dopo no', () => {
    const start = new Date(2026, 9, 21, 18, 0)
    expect(personalEndOk(start, null)).toBe(true)
    expect(personalEndOk(start, new Date(2026, 9, 21, 18, 0))).toBe(false)
    expect(personalEndOk(start, new Date(2026, 9, 21, 19, 0))).toBe(true)
    expect(personalEndOk(start, new Date(2026, 9, 22, 9, 0))).toBe(false)
  })

  it('senza fine occupa 15 minuti, con fine i minuti veri', () => {
    const start = new Date(2026, 9, 21, 18, 0)
    expect(personalPlaceMinutes(start, null)).toBe(15)
    expect(personalPlaceMinutes(start, new Date(2026, 9, 21, 19, 30))).toBe(90)
  })
})
```

`src/lib/closures.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { closureCovers, closureOn, closureRangeOk, closureReasonOk, closuresOverlap, type Closure } from './closures'

const closure = (partial: Partial<Closure>): Closure => ({
  id: 'c1',
  reason: 'Ferie',
  startDay: '2026-08-20',
  endDay: '2026-08-24',
  createdAt: new Date(2026, 7, 1),
  updatedAt: new Date(2026, 7, 1),
  ...partial,
})

describe('chiusure', () => {
  it('motivo e periodo', () => {
    expect(closureReasonOk('  Ferie ')).toBe(true)
    expect(closureReasonOk('   ')).toBe(false)
    expect(closureReasonOk('a'.repeat(41))).toBe(false)
    expect(closureRangeOk('2026-08-20', '2026-08-20')).toBe(true)
    expect(closureRangeOk('2026-08-20', '2026-08-19')).toBe(false)
  })

  it('il 24 e il 25 non si sovrappongono; il 24 ripetuto sì', () => {
    expect(closuresOverlap({ startDay: '2026-08-20', endDay: '2026-08-24' }, { startDay: '2026-08-25', endDay: '2026-08-25' })).toBe(false)
    expect(closuresOverlap({ startDay: '2026-08-20', endDay: '2026-08-24' }, { startDay: '2026-08-24', endDay: '2026-08-26' })).toBe(true)
    expect(closureCovers(closure({}), '2026-08-22')).toBe(true)
    expect(closureCovers(closure({}), '2026-08-25')).toBe(false)
  })

  it('closureOn restituisce la chiusura del giorno', () => {
    expect(closureOn([closure({})], '2026-08-21')?.reason).toBe('Ferie')
    expect(closureOn([closure({})], '2026-08-25')).toBeNull()
  })
})
```

Nel test di `classify`, aggiungi un appuntamento `kind: 'personale'` con `status: 'completato'` e aspetta `'escluso'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/personal.test.ts src/lib/closures.test.ts`
Expected: FAIL perché i moduli non esistono.

- [ ] **Step 3: Write minimal implementation**

In `Appointment` aggiungi campi facoltativi, senza toccare `end`:

```ts
kind?: 'pelosetto' | 'personale'
title?: string
plannedEnd?: Date
```

`src/lib/personal.ts` esporta le quattro funzioni del test. `appointmentKind` restituisce `'personale'` solo se `kind === 'personale'`, altrimenti `'pelosetto'`. `personalTitleOk` fa trim e controlla la lunghezza 1–60. `personalEndOk` con `null` restituisce true; altrimenti stesso `localDayKey` e `plannedEnd.getTime() > start.getTime()`. `personalPlaceMinutes` con `null` restituisce 15, altrimenti la differenza in minuti.

`src/lib/closures.ts` confronta le date `AAAA-MM-GG` come stringhe. `closuresOverlap` è vero se `a.startDay <= b.endDay && b.startDay <= a.endDay`. `closureOn` restituisce la prima chiusura per cui `closureCovers` è vero, oppure `null`.

In `classify`, prima riga:

```ts
if (appointmentKind(a) === 'personale') return 'escluso'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/personal.test.ts src/lib/closures.test.ts src/lib/earnings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/personal.ts src/lib/personal.test.ts src/lib/closures.ts src/lib/closures.test.ts src/types/models.ts src/lib/earnings.ts src/lib/earnings.test.ts
git commit -m "feat: regole di appuntamento personale e chiusura del salone"
```

---

### Task 2: Salvare il personale insieme agli appuntamenti

**Files:**
- Modify: `src/lib/firebaseMap.ts` (`appointmentToDoc`, `appointmentFromDoc`)
- Modify: `src/data/local/appointments.ts` (`StoredAppointment` e la lettura)
- Modify: `src/lib/tombstone.ts` (`filterAppointments`, `tombstoneRejectsAppointment`)
- Test: `src/lib/firebaseMap.test.ts`
- Test: `src/data/local/appointments.test.ts`
- Test: `src/lib/tombstone.test.ts`

**Interfaces:**
- Consumes: `appointmentKind`, `personalTitleOk` dal Task 1
- Produces: un round-trip cloud e locale di un personale con `title` e `plannedEnd`, senza `dogId` e senza `status`. Un personale il cui id è in `appointmentIds` sparisce. Un id cane nella pietra tombale non lo fa sparire.

- [ ] **Step 1: Write the failing test**

Nel test di `firebaseMap`, un personale:

```ts
const personal: Appointment = {
  id: 'p1',
  kind: 'personale',
  title: 'Dentista',
  dogId: '',
  start: new Date(2026, 9, 21, 18, 0),
  plannedEnd: new Date(2026, 9, 21, 19, 0),
  services: [],
  status: 'programmato',
  createdAt: new Date(2026, 9, 1),
  updatedAt: new Date(2026, 9, 1),
}
const doc = appointmentToDoc(personal)
expect(doc.kind).toBe('personale')
expect(doc.title).toBe('Dentista')
expect(doc.dogId).toBeUndefined()
expect(doc.status).toBeUndefined()
expect(doc.services).toBeUndefined()
const back = appointmentFromDoc('p1', doc)
expect(back.kind).toBe('personale')
expect(back.title).toBe('Dentista')
expect(back.plannedEnd?.getHours()).toBe(19)
expect(appointmentFromDoc('old', { dogId: 'd1', start: Date.now(), services: [], status: 'programmato' }).kind).toBe('pelosetto')
```

`appointmentFromDoc` resta per i documenti validi. Aggiungi `appointmentFromDocMaybe(id, data): Appointment | null`. Per un personale con titolo vuoto o di soli spazi ritorna `null`. `listenAppointments` e `listAppointments` tengono solo i valori non null. Il test aspetta `null` per `{ kind: 'personale', title: '  ' }`.

Pietra tombale:

```ts
expect(tombstoneRejectsAppointment(stone, 'p1', '')).toBe(false)
expect(tombstoneRejectsAppointment({ ...stone, appointmentIds: ['p1'] }, 'p1', '')).toBe(true)
```

dove `stone.ids` contiene un id cane qualsiasi, e il personale non ha quel cane.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firebaseMap.test.ts src/lib/tombstone.test.ts`
Expected: FAIL perché `kind` non viene scritto e la pietra tombale tratta il `dogId` vuoto come un cane se l’implementazione attuale fa `stone.ids.includes(dogId)`.

- [ ] **Step 3: Write minimal implementation**

`appointmentToDoc`: se `appointmentKind` è `personale`, il documento contiene `id`, `kind`, `title` trimmato, `start`, `plannedEnd` se c’è, `createdAt`, `updatedAt`. Non contiene `dogId`, `services`, `status`. Altrimenti il documento di oggi, più `kind: 'pelosetto'` solo se era già scritto; se `kind` manca, non aggiungerlo.

`appointmentFromDoc`: se `data.kind === 'personale'`, leggi `title`. Se `personalTitleOk` è falso, il chiamante in `listenAppointments` e `listAppointments` salta il record. `plannedEnd` si legge come data facoltativa. `dogId` resta `''` in memoria solo se il tipo lo esige, e non si scrive sul cloud.

`tombstoneRejectsAppointment`: se il quarto argomento o un flag `personal` è vero, ritorna solo `stone.appointmentIds.includes(id)`. `filterAppointments` passa quel flag quando `appointmentKind(item) === 'personale'`.

`removeAppointment` per un personale segna l’id in `appointmentIds` e cancella il documento, senza aggiungere un cane a `stone.ids`.

La lettura locale accetta `kind`, `title`, `plannedEnd` e non pretende `services` né `status` per il personale.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firebaseMap.test.ts src/data/local/appointments.test.ts src/lib/tombstone.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/local/appointments.ts src/lib/tombstone.ts src/data/firebase/client.ts
git commit -m "feat: l'appuntamento personale si salva senza cane"
```

Aggiungi anche i test toccati.

---

### Task 3: Raccolta chiusure e backup

**Files:**
- Modify: `src/data/local/storage.ts`
- Create: `src/data/local/closures.ts`
- Create: `src/hooks/useClosures.ts`
- Modify: `src/data/firebase/client.ts` (`listenClosures`, `saveClosure`, `removeClosure`)
- Modify: `src/lib/backupDoc.ts`
- Test: `src/data/local/closures.test.ts`
- Test: `src/lib/backupDoc.test.ts`

**Interfaces:**
- Consumes: `Closure`, `closureReasonOk`, `closureRangeOk` dal Task 1. `salonDocPath`, `readJson`, `writeJson`, `storageKeys`
- Produces:
  - `storageKeys.closures(uid)`
  - `listClosures(uid)`, `saveClosureLocal(uid, closure)`, `deleteClosureLocal(uid, id)`
  - `useClosures(uid): { closures: Closure[]; save: (closure: Closure) => Promise<void>; remove: (id: string) => Promise<void> }`
  - `BackupBundle.closures?: unknown`

- [ ] **Step 1: Write the failing test**

`closures.test.ts` salva una chiusura, la rilegge, ne cancella una e non cancella l’altra. Un record con motivo vuoto o `endDay` precedente non entra in lista.

`backupDoc.test.ts`:

```ts
it('un backup vecchio non cancella le chiusure', () => {
  saveClosureLocal(uid, closure)
  restoreBackup(uid, { dogs: {}, appointments: {}, services: {}, settings: { theme: 'auto' } })
  expect(listClosures(uid)).toHaveLength(1)
})

it('un backup con closures le sostituisce', () => {
  saveClosureLocal(uid, closure)
  restoreBackup(uid, { dogs: {}, appointments: {}, services: {}, settings: { theme: 'auto' }, closures: {} })
  expect(listClosures(uid)).toHaveLength(0)
})
```

Usa la forma reale di `settings` che `readRestoreBundle` già accetta. `buildBackup` include la chiave `closures`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/local/closures.test.ts src/lib/backupDoc.test.ts`
Expected: FAIL perché la chiave e le funzioni non esistono.

- [ ] **Step 3: Write minimal implementation**

`storageKeys.closures` e aggiorna `JSON_KEY` con `closures` accanto a `appointments`.

`saveClosure` cloud fa `setDoc` su `salonDocPath('closures', id)` con `reason`, `startDay`, `endDay`, `createdAt`, `updatedAt` in millis, senza media e senza pietra tombale. `removeClosure` fa `deleteDoc` e basta. `listenClosures` è `onSnapshot` della raccolta, scarta i record illeggibili, ordina per `startDay` poi `id`.

`useClosures` tiene la lista locale e, se Firebase è acceso, sostituisce con lo snapshot. `save` scrive prima in locale e poi in cloud. `remove` toglie locale e cloud. Niente foto, niente `sessionIds`, niente id cane.

`readRestoreBundle` copia `closures` solo se è un oggetto. `restoreBackup`, se `accepted.closures` è un oggetto, fa `writeJson(storageKeys.closures(uid), accepted.closures)`. Se la chiave non c’era nel bundle letto, non chiama `writeJson` sulle chiusure. `buildBackup` aggiunge `closures: readJson(storageKeys.closures(uid)) ?? {}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/local/closures.test.ts src/lib/backupDoc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/local/storage.ts src/data/local/closures.ts src/data/local/closures.test.ts src/hooks/useClosures.ts src/data/firebase/client.ts src/lib/backupDoc.ts src/lib/backupDoc.test.ts
git commit -m "feat: le chiusure del salone si sincronizzano e entrano nel backup"
```

---

### Task 4: Voci del + e percorsi foglio

**Files:**
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/lib/sheetRoute.ts`
- Modify: `src/app/router.tsx`
- Create: `src/pages/PersonalAppointmentPage.tsx`
- Create: `src/pages/ClosurePage.tsx`
- Create: `src/lib/sheetRoute.test.ts`
- Test: `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: `useOpenSheet`, `Dialog` già in `ShellFrame`
- Produces: percorsi `/appuntamenti/personale/nuovo`, `/appuntamenti/personale/:id`, `/chiusure/nuovo`, `/chiusure/:id`, tutti fogli. Pagine con titolo «Appuntamento personale» e «Chiusura del salone».

- [ ] **Step 1: Write the failing test**

Nel test del dialogo «Nuovo», le voci in ordine sono «Appuntamento pelosetto», «Appuntamento personale», «Chiusura del salone», «Aggiungi Pelosetto». Non c’è più un bottone il cui nome accessibile è solo «Appuntamento».

«Appuntamento pelosetto» porta al titolo «Nuovo appuntamento». «Appuntamento personale» porta al titolo «Appuntamento personale». «Chiusura del salone» porta al titolo «Chiusura del salone».

Crea `src/lib/sheetRoute.test.ts` con `isSheetPath('/appuntamenti/personale/nuovo')`, `isSheetPath('/chiusure/nuovo')` e `isSheetPath('/chiusure/c1')` veri, e `isSheetPath('/chiusure')` falso.

Dal calendario con `?data=2026-10-21`, il personale si apre con `data=2026-10-21` nell’indirizzo. Dalla home, senza `data`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/shellPages.test.tsx src/lib/sheetRoute.test.ts`
Expected: FAIL perché il bottone si chiama ancora «Appuntamento», gli altri due non ci sono, e `sheetRoute.test.ts` non passa.

- [ ] **Step 3: Write minimal implementation**

Quattro bottoni, ordine della specifica. Icone Lucide già usate nel file: `Calendar` per il pelosetto, `UserRound` per il personale, `CircleOff` per la chiusura, `PawPrint` per il cane. Il riquadro icona resta `iconTile`.

`newAppointment` esistente cambia solo il nome del bottone. Due funzioni nuove copiano la stessa regola di `data` e aprono i percorsi nuovi.

`isSheetPath` è vero anche per `/appuntamenti/personale/nuovo`, `/appuntamenti/personale/` più un id, `/chiusure/nuovo`, `/chiusure/` più un id. Non è vero per `/chiusure` da solo.

Le pagine nuove, in questo task, mostrano solo il titolo nel foglio già usato da `AppointmentPage` (`AppointmentSheet` o l’equivalente). I campi arrivano nei task 5 e 6.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/shellPages.test.tsx src/lib/sheetRoute.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShellFrame.tsx src/lib/sheetRoute.ts src/app/router.tsx src/pages/PersonalAppointmentPage.tsx src/pages/ClosurePage.tsx src/pages/shellPages.test.tsx
git commit -m "feat: il più apre personale e chiusura del salone"
```

---

### Task 5: Foglio dell’appuntamento personale

**Files:**
- Modify: `src/pages/PersonalAppointmentPage.tsx`
- Test: `src/pages/PersonalAppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `personalTitleOk`, `personalEndOk`, `useAppointments` (`create` / `update` / `remove` già usati dalle visite), `parseDayParam`
- Produces: salvataggio di un `Appointment` `kind: 'personale'` con `title` trimmato e `plannedEnd` assente oppure successivo.

- [ ] **Step 1: Write the failing test**

Il foglio ha etichette «Titolo», «Data», «Ora di inizio», «Ora di fine» e il testo «Se non la sai, lasciala vuota.»

Salvare senza titolo mostra «Scrivi un titolo.» e non chiude. Salvare «Dentista», data 21 ottobre 2026, inizio 18:00, fine vuota, scrive un personale senza `plannedEnd`. Fine 18:00 mostra «L'ora di fine è dopo l'inizio.» e non salva. Fine 19:00 salva `plannedEnd` alle 19:00.

Con `?data=2026-10-21` la data è già quella. Nessun dialogo «Salone chiuso» anche se quel giorno ha una chiusura `Ferie`.

Aprire `/appuntamenti/personale/p1` mostra il titolo salvato. «Elimina» apre «Eliminare Dentista del {formatHomeDate} alle 18:00?» e, dopo «Elimina», il record non c’è più.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/PersonalAppointmentPage.test.tsx`
Expected: FAIL perché i campi non ci sono.

- [ ] **Step 3: Write minimal implementation**

Campi con `label` visibile, non solo placeholder. «Salva» valida con `personalTitleOk` e `personalEndOk`. Gli errori stanno sotto il campo relativo. Il salvataggio chiama la stessa creazione degli appuntamenti con `kind: 'personale'`, `title` trimmato, `services: []` solo se il tipo in memoria lo richiede, e senza `dogId` sul documento cloud (Task 2). Non leggere `useClosures` per bloccare il salvataggio.

L’eliminazione usa il dialogo della specifica e poi `remove` dell’appuntamento.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/PersonalAppointmentPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/PersonalAppointmentPage.tsx src/pages/PersonalAppointmentPage.test.tsx
git commit -m "feat: si compila l'appuntamento personale con la fine facoltativa"
```

---

### Task 6: Foglio della chiusura

**Files:**
- Modify: `src/pages/ClosurePage.tsx`
- Test: `src/pages/ClosurePage.test.tsx`

**Interfaces:**
- Consumes: `useClosures`, `closureReasonOk`, `closureRangeOk`, `closuresOverlap`, `closureOn`, `useAppointments`, `appointmentKind`
- Produces: un record `Closure`. Sovrapposizione bloccata. Visite già presenti avvisate e non cancellate.

- [ ] **Step 1: Write the failing test**

Etichette «Motivo», «Questo giorno», «Un periodo», «Dal», «Al».

Motivo vuoto: «Scrivi un motivo.» Periodo 24–20: «La fine del periodo è il giorno di inizio o un giorno dopo.»

Salvare «Ferie» sul 21 ottobre scrive un record con `startDay === endDay === '2026-10-21'`. Salvare dal 20 al 24 scrive un solo record.

Con una chiusura già sul 20–24 agosto 2026, salvarne una sul 24 mostra `Questi giorni sono già chiusi (Ferie dal ${formatHomeDate(new Date(2026, 7, 20))} al ${formatHomeDate(new Date(2026, 7, 24))}). Modifica quella chiusura.` e non aggiunge record. «Apri» va a `/chiusure/{id}`. Il 25, con la precedente che finisce il 24, si salva.

Una visita pelosetto il 21 e una chiusura nuova sul 21 mostrano «In questi giorni c'è già 1 visita. La chiusura non le toglie.» «Salva» crea la chiusura e la visita resta. Un personale quel giorno non fa comparire la frase.

«Riapri» su un periodo mostra «Riaprire toglie la chiusura da tutti i giorni, dal {dal} al {al}.» e poi la lista è vuota.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ClosurePage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

La scelta «Questo giorno» / «Un periodo» è un `Segmented` o due radio con quei nomi. Le date del periodo si vedono solo su «Un periodo». Il controllo di sovrapposizione ignora l’id aperto. Le date nel messaggio usano `formatHomeDate` del giorno parsato da `AAAA-MM-GG`.

Il conteggio visite è `appointments.filter` con `appointmentKind === 'pelosetto'` e `localDayKey(start)` dentro l’intervallo, estremi compresi.

«Riapri» chiama `remove` di `useClosures` solo dopo conferma.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/ClosurePage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/ClosurePage.tsx src/pages/ClosurePage.test.tsx
git commit -m "feat: si imposta un giorno o un periodo di chiusura"
```

---

### Task 7: Mese, giorno e settimana

**Files:**
- Modify: `src/theme/tokens.css`
- Modify: `src/lib/calendarView.ts` (`monthCellFace`)
- Modify: `src/lib/calendarView.test.ts`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/calendar/WeekRows.tsx`
- Test: `src/pages/appointments.test.tsx` (i test di calendario già presenti)
- Test: `src/components/calendar/WeekRows.test.tsx`

**Interfaces:**
- Consumes: `closureOn`, `appointmentKind`, `personalPlaceMinutes`, `useClosures`
- Produces: `monthCellFace({ salonCount, personalCount, closed, selected, today, inMonth, weekend })` con `salonBadge`, `personalBadge`, `closedLabel`. Il vecchio campo unico `count` / `badge` non si usa più.

- [ ] **Step 1: Write the failing test**

Aggiorna i casi esistenti di `monthCellFace` a `salonCount`. Aggiungi:

- `salonCount: 2`, `personalCount: 1`, non chiuso, non selezionato: fondo trasparente, `salonBadge === '2'`, `personalBadge === '1'`, `closedLabel === false`
- solo `personalCount: 1`: niente fondo verde, `personalBadge === '1'`
- `closed: true`, conteggi 1 e 1, non selezionato: `closedLabel === true`, i due badge presenti
- `closed: true` e `selected: true`: `background === 'var(--pri-solid)'`, `closedLabel === true`

In `appointments.test.tsx`, un giorno con una visita e un personale mostra un tondo verde e un tondo blu. Un giorno coperto da «Ferie» ha un elemento con testo «Chiuso» e, nel giorno, il pulsante «Apri chiusura Ferie» con testo «Salone chiuso · Ferie». Il riepilogo cani non cresce per il personale.

Il personale alle 18:00 senza `plannedEnd` non ha un blocco che dichiara la fine alle 19:00. Con `plannedEnd` alle 19:00 il blocco dice `18:00–19:00`.

La settimana mostra il titolo «Dentista» senza sticker del carattere.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendarView.test.ts src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx`
Expected: FAIL sui nuovi conteggi e su «Chiuso».

- [ ] **Step 3: Write minimal implementation**

In `:root` e nel tema scuro aggiungi `--closed` e `--closed-line` come nei vincoli globali.

`monthCellFace` segue la tabella del paragrafo 4 della specifica. Il verde di oggi resta il ramo «solo visite». Il chiamante in `CalendarPage` passa i due conteggi filtrati con `appointmentKind` e `closed: closureOn(closures, key) !== null`.

L’etichetta `aria-label` della casella è quella della specifica. I tondi usano `var(--ok)` e `var(--pri-solid)`, testo `var(--on-pri)`.

La fascia e la cella chiusa usano il fondo velo descritto nella specifica. Il pulsante della fascia naviga a `/chiusure/{id}` con `openSheet`.

Per il personale, `placeAppointments` riceve `personalPlaceMinutes`. L’altezza disegnata è almeno quella di una riga di titolo: se i 15 minuti sono più bassi del contenuto, vince il contenuto, e il blocco non viene allungato fino a un’ora. Il blocco è un bottone «Apri {titolo}» verso `/appuntamenti/personale/{id}`.

`daySummary` riceve solo i pelosetto.

Nella striscia dei sette giorni, al posto di `Dots` con un conteggio unico, un puntino verde se `salonCount > 0` e uno blu se `personalCount > 0`. Il giorno chiuso ha il velo; se è selezionato, fondo `var(--pri-solid)` e «Chiuso» non sta in quei 44 px se non c’entra: la scritta «Chiuso» del mese e della settimana basta, e la striscia comunica la chiusura col velo. Il contrasto della scritta, dove c’è, resta `var(--bad)` oppure `var(--on-pri)` sul selezionato.

`WeekRows` colora la cella del numero con le stesse regole e disegna la carta personale senza `TemperamentSticker` e senza servizi.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/calendarView.test.ts src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme/tokens.css src/lib/calendarView.ts src/lib/calendarView.test.ts src/pages/CalendarPage.tsx src/components/calendar/WeekRows.tsx src/components/calendar/WeekRows.test.tsx src/pages/appointments.test.tsx
git commit -m "feat: il calendario distingue visite, personali e giorni chiusi"
```

---

### Task 8: Oggi, elenco del giorno e avviso sulla visita

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/CalendarPage.tsx` (elenco sotto il mese)
- Modify: `src/pages/AppointmentPage.tsx` (salvataggio visita)
- Test: `src/pages/HomePage.test.tsx`
- Test: `src/pages/AppointmentPage.test.tsx`
- Test: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `appointmentKind`, `closureOn`, `useClosures`, dialogo già usato in `AppointmentPage`
- Produces: elenco misto per ora; tessera Oggi invariata sul personale; dialogo «Salone chiuso» solo quando il giorno della visita cambia verso un giorno chiuso.

- [ ] **Step 1: Write the failing test**

Home, oggi: una visita alle 09:00 e «Dentista» alle 18:00 compaiono in quest’ordine dentro Oggi. La tessera il cui nome contiene «Oggi» non aumenta il conteggio per il dentista. Un personale di ieri non compare in «Da chiudere». Se oggi è «Ferie», sopra l’elenco c’è «Apri chiusura Ferie».

Elenco sotto il mese: la riga «Dentista» apre `/appuntamenti/personale/{id}` e non una scheda cane.

`AppointmentPage`: salvare una visita nuova sul giorno di «Ferie» mostra «Il salone è chiuso questo giorno (Ferie). Salvare lo stesso la visita?» «Indietro» non crea la visita. «Salva lo stesso» la crea. Riaprire quella visita, cambiare un servizio e salvare non mostra di nuovo il dialogo. Spostarla su un altro giorno chiuso lo mostra di nuovo.

Una serie che tocca due giorni chiusi mostra «Alcuni giorni sono chiusi:» e «Indietro» non salva nessun giorno di quel gesto.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/AppointmentPage.test.tsx src/pages/appointments.test.tsx`
Expected: FAIL perché il dentista non è in Oggi e il dialogo non c’è.

- [ ] **Step 3: Write minimal implementation**

L’elenco di Oggi concatena le visite già filtrate (`programmato` e `completato`) con i personali di quel giorno, ordina per `start` poi `id`. La riga personale usa `var(--pri-s)`, titolo e ora, `openSheet('/appuntamenti/personale/' + id)`. Non mostra Completato, Non venuto, Disdetto. Il calcolo di `today.length` e dei minuti per la tessera resta sulle sole visite.

«Da chiudere» filtra `appointmentKind === 'pelosetto'`.

In `AppointmentPage`, prima di persistere, calcola i giorni di inizio che il gesto sta per scrivere. Se uno è chiuso e il giorno precedente di quella visita non era già quel giorno chiuso, apri il dialogo della specifica. «Indietro» chiude il dialogo e non chiama il salvataggio. «Salva lo stesso» prosegue il salvataggio intero. Il personale non entra in questa pagina.

L’elenco sotto il mese usa la stessa riga personale.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/HomePage.test.tsx src/pages/AppointmentPage.test.tsx src/pages/appointments.test.tsx src/lib/earnings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/CalendarPage.tsx src/pages/AppointmentPage.tsx src/pages/AppointmentPage.test.tsx src/pages/appointments.test.tsx
git commit -m "feat: Oggi mostra il personale e la visita su un giorno chiuso chiede conferma"
```

---

## Self-review del piano

- Spec §1 menu: Task 4.
- Spec §2 foglio personale, `plannedEnd`, elimina: Task 5. Disegno del blocco: Task 7.
- Spec §3 foglio chiusura, sovrapposizione, visite già presenti, riapri: Task 6. Fascia «Apri chiusura»: Task 7 e Task 8.
- Spec §4 mese, giorno, settimana, riepilogo cani: Task 7.
- Spec §5 liste e tessera Oggi: Task 8.
- Spec §6 avviso visita e serie: Task 8. Sovrapposizione tra cani non si tocca.
- Spec §7 dati, pietra tombale, `classify`, backup: Task 1, 2 e 3.
- Spec §8 verifica: i test dei task corrispondenti.
- `firestore.rules` non ha un task perché la spec lo lascia com’è.
- Nessun task alza la versione o pubblica l’APK.
