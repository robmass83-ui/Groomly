# Groomly ciclo 3 — Appuntamenti — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire «In arrivo» in Home e il segnaposto Calendario con gli appuntamenti del giorno, salvati sul dispositivo in `groomly.users.{uid}.appointments`.

**Architecture:** Le pagine chiamano solo `useAppointments`. L’hook chiama solo `src/data/local/appointments.ts`, che usa `readJson` e `writeJson`. Nel dominio le date sono `Date`; su disco sono ISO. Durata, prezzo, sovrapposizione, giorno locale e chip sono funzioni pure e non scrivono. Il modulo valida con Zod e `prepareAppointmentWrite` prima dell’hook.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6, Zod 3, date-fns 4, Vitest 3.2.7, Testing Library, happy-dom per i test che montano `App` e per lo spy `localStorage.setItem` del repository.

Directory di lavoro: `D:\Groomly`. Shell: PowerShell. Non usare `&&`. Non usare HEREDOC bash: il commit va con la here-string PowerShell mostrata in ogni task. Branch di lavoro: `feat/groomly-appuntamenti`, creato dal `master` attuale prima del Task 1. Non committare `GROOMLY.md`, `groomly-design.html`, `groomly-cursor-kit.zip`, né `docs/superpowers/plans/`.

Specifica: `docs/superpowers/specs/2026-10-03-groomly-appuntamenti-design.md`.

## Global Constraints

Ogni task include queste regole. I valori sono quelli della specifica.

- Interfaccia solo in italiano. Colonna massima 390 px. A 360 px nessuno scroll orizzontale.
- Chiave `groomly.users.{uid}.appointments`. Date `Date` nel dominio, ISO nello storage. Nessun campo stato e nessun campo fine.
- Obbligatori: cane attivo, almeno un servizio attivo, giorno, ora. Errori: «Scegli un cane», «Scegli un servizio», «Scegli il giorno», «Scegli l’ora». Nessun cane attivo: «Nessun cane» e Salva non scrive.
- Ora di inizio: quarti d’ora dalle 08:00 alle 19:00 comprese. La fine può superare le 19:00. Modulo dal menu +: ora iniziale 09:00. Modulo dal chip senza copia: ora non selezionata.
- Durata e prezzo: somma del listino per la taglia del cane, copiati sul record al Salva dal modulo. Il chip copia le righe già salvate, non riapre il listino. Un listino o una taglia cambiati dopo non riscrivono il record.
- La fine è `start` più la somma dei minuti. Due intervalli `[start, end)` che si toccano alle 10:00 non si sovrappongono. La sovrapposizione si salva. Frase: «Si sovrappone a Rex, Luna», nomi in ordine di inizio. Cane mancante: «Cane assente». In modifica l’appuntamento non conta se stesso.
- Chip: futuro più vicino con `start` maggiore o uguale a adesso; altrimenti il passato più recente; altrimenti apre `/appuntamenti/nuovo?cane={id}&data=aaaa-mm-gg` senza salvare. La data vuota è oggi più 2, 4 o 6 settimane. Con una copia, l’inizio è quello sorgente più le settimane. Toast «Fissato per gio 29 ott 09:30» con Annulla, due secondi. Annulla cancella solo il nuovo.
- Durata visibile: «45 min» sotto i 60, «2h» se i minuti sono un multiplo di 60, altrimenti «1h 15». Prezzo: `formatEuro`. Il 29 ottobre 2026 alle 09:30 produce esattamente «gio 29 ott 09:30».
- Giorno di Home e Calendario: giorno locale di `start`, non la data UTC. Calendario: query `data`. Senza query, o con una data non valida, è oggi.
- Lista vuota: «Nessun appuntamento». Riga: ora `HH:mm`, durata, foto, nome, al massimo due servizi poi «+N», icona carattere, segno rosso se c’è l’avviso critico. Il tocco apre il dettaglio.
- Dettaglio: avviso critico in riquadro rosso sotto la foto. Telefono `tel:` solo se non vuoto. Modifica, poi Salva con toast «Salvato» e tono `ok`. Indietro in modifica abbandona e resta nel dettaglio. Cancella chiede «Cancellare questo appuntamento?» con Annulla e Cancella, senza `window.confirm` e senza toast. Poi apre `/calendario?data=` di quel giorno.
- Un cane archiviato non si cerca e non ha i chip. Se è già il cane dell’appuntamento, la modifica può tenerlo. Id sconosciuto: «Appuntamento assente».
- `appointment_missing`, messaggio «Appuntamento assente», non scrive. `setItem` che lancia: toast «Salvataggio non riuscito», tono `plain`, record precedente invariato. Il toast nasce dal booleano dell’hook, non da un effetto sull’errore.
- JSON illeggibile: «Dati locali illeggibili», e il valore resta nella chiave. Esci toglie solo `groomly.session`. Archiviare un cane non tocca gli appuntamenti.
- Il Listino resta «In arrivo». «Nuovo cane» non cambia. La ricerca della Home apre ancora Animali e mette il fuoco nel campo.
- I test che montano `<App>` portano `// @vitest-environment happy-dom` come prima riga. Lo spy della scrittura è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`. Il test del repository appuntamenti porta la stessa prima riga, come `dogs.test.ts`.
- Non alzare Vitest. Non creare `src/lib/firebase.ts`. Non implementare settimana, mese, griglia, trascinamento, anticipa e posticipa, «Completato», foto del lavoro, mensili, PDF, backup, Capacitor.
- Non modificare `Input`: l’errore resta dentro la `label` e `forwardRef` resta. Non aggiungere `end` al `NavLink` della Home.

## File map

| File | Responsabilità |
|---|---|
| `src/data/errors.ts` | Codice `appointment_missing` |
| `src/data/local/storage.ts` | Chiave `appointments` e regex |
| `src/types/models.ts` | `Appointment`, `AppointmentService`, `AppointmentWrite` |
| `src/lib/appointments.ts` | Orari, durata, prezzo, sovrapposizione, giorno, chip, preventivo |
| `src/lib/schemas.ts` | `appointmentFormSchema` |
| `src/data/local/appointments.ts` | Lettura e scrittura della mappa |
| `src/hooks/useAppointments.ts` | Lista e azioni, booleani, nessun toast |
| `src/components/layout/Toast.tsx` | Azione opzionale Annulla |
| `src/components/layout/Header.tsx` | `onBack` opzionale, i link esistenti restano |
| `src/components/domain/AppointmentRow.tsx` | Riga di Home e Calendario |
| `src/pages/HomePage.tsx` | Sezione Oggi al posto di «In arrivo» |
| `src/pages/CalendarPage.tsx` | Giorno scelto |
| `src/pages/AppointmentForm.tsx` | Campi del modulo |
| `src/pages/AppointmentPage.tsx` | Dettaglio, modifica, cancellazione |
| `src/pages/NextAppointment.tsx` | Blocco e chip sulla scheda del cane |
| `src/pages/ShellFrame.tsx` | «Nuovo appuntamento» naviga |
| `src/app/router.tsx` | `/calendario`, `/appuntamenti/nuovo`, `/appuntamenti/:id` |

---

### Task 1: Chiave appuntamenti e dati illeggibili

**Files:**
- Modify: `src/data/errors.ts`
- Modify: `src/data/local/storage.ts`
- Modify: `src/data/local/storage.test.ts`
- Modify: `src/app/corruptStorage.test.tsx`

**Interfaces:**
- Consumes: `findCorruptGroomlyKey`, `createAccount`, `App`
- Produces: `storageKeys.appointments(uid: string): string`. `AppErrorCode` include `'appointment_missing'`. La regex di `findCorruptGroomlyKey` include `appointments`.

- [ ] **Step 1: Creare il branch e scrivere i test che falliscono**

```powershell
git checkout -b feat/groomly-appuntamenti
```

Se il branch esiste già, `git checkout feat/groomly-appuntamenti` e non ricrearlo.

In `src/data/local/storage.test.ts`, aggiungere questo test dentro il `describe` esistente:

```ts
  it('riconosce la mappa appuntamenti illeggibile e non la cancella', () => {
    const key = storageKeys.appointments('uid-1')
    localStorage.setItem(key, '{')
    expect(findCorruptGroomlyKey()).toBe(key)
    expect(localStorage.getItem(key)).toBe('{')
  })
```

In `src/app/corruptStorage.test.tsx`, aggiungere questo test dentro il `describe` esistente:

```ts
  it('mostra il messaggio per gli appuntamenti e lascia il valore nella chiave', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const key = storageKeys.appointments(account.uid)
    localStorage.setItem(key, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(localStorage.getItem(key)).toBe('{')
  })
```

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/data/local/storage.test.ts src/app/corruptStorage.test.tsx`

Expected: FAIL perché `storageKeys.appointments` non esiste.

- [ ] **Step 3: Aggiungere chiave, regex e codice errore**

In `src/data/errors.ts`, aggiungere `'appointment_missing'` all’unione `AppErrorCode`, dopo `'dog_missing'`.

In `src/data/local/storage.ts`:

```ts
  dogs: (uid: string) => `groomly.users.${uid}.dogs`,
  appointments: (uid: string) => `groomly.users.${uid}.appointments`,
```

Sostituire la regex con:

```ts
const JSON_KEY = /^groomly\.(auth|users\..+\.(settings|services|dogs|appointments))$/
```

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/data/local/storage.test.ts src/app/corruptStorage.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/data/errors.ts src/data/local/storage.ts src/data/local/storage.test.ts src/app/corruptStorage.test.tsx
git commit -m @"
feat: riconosce la mappa appuntamenti illeggibile

"@
```

---

### Task 2: Tipi e calcoli puri

**Files:**
- Modify: `src/types/models.ts`
- Create: `src/lib/appointments.ts`
- Create: `src/lib/appointments.test.ts`

**Interfaces:**
- Consumes: `DogSize`, `Service` da `src/types/models.ts`
- Produces: i tipi e le funzioni sotto. I task successivi importano questi nomi così come sono.

```ts
export interface AppointmentService {
  serviceId: string
  name: string
  durationMin: number
  price: number
}

export interface Appointment {
  id: string
  dogId: string
  start: Date
  services: AppointmentService[]
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentWrite {
  dogId: string
  start: Date
  services: AppointmentService[]
}
```

```ts
export const START_TIMES: string[]
export function isStartTime(value: string): boolean
export function formatDuration(minutes: number): string
export function formatBookedWhen(date: Date): string
export function sumDuration(services: { durationMin: number }[]): number
export function sumPrice(services: { price: number }[]): number
export function localDayKey(date: Date): string
export function startOfLocalDay(date: Date): Date
export function parseDayParam(value: string | null, now: Date): Date
export function combineDayTime(day: string, time: string): Date
export function appointmentEnd(start: Date, services: { durationMin: number }[]): Date
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean
export function overlapLabel(items: Appointment[], dogName: (dogId: string) => string, start: Date, end: Date, ignoreId?: string): string | null
export function onLocalDay(items: Appointment[], day: Date): Appointment[]
export function chipSource(items: Appointment[], dogId: string, now: Date): Appointment | null
export function nextAppointment(items: Appointment[], dogId: string, now: Date): Appointment | null
export function shiftWeeks(start: Date, weeks: 2 | 4 | 6): Date
export function chipOpenDay(now: Date, weeks: 2 | 4 | 6): string
export function quoteServices(catalog: Service[], ids: string[], size: DogSize): AppointmentService[] | null
export function visibleServiceNames(names: string[]): { shown: string[]; extra: number }
```

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `src/lib/appointments.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Appointment, Service } from '../types/models'
import {
  chipOpenDay,
  chipSource,
  formatBookedWhen,
  formatDuration,
  localDayKey,
  nextAppointment,
  overlapLabel,
  parseDayParam,
  quoteServices,
  rangesOverlap,
  shiftWeeks,
  visibleServiceNames,
} from './appointments'

function at(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function item(partial: Pick<Appointment, 'id' | 'dogId' | 'start'> & { minutes?: number }): Appointment {
  return {
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: partial.minutes ?? 60, price: 20 }],
    createdAt: partial.start,
    updatedAt: partial.start,
    ...partial,
  }
}

const bagno: Service = {
  id: 'bagno', name: 'Bagno', kind: 'principale', order: 0, active: true,
  durationMin: { piccola: 30, media: 45, grande: 60 },
  price: { piccola: 20, media: 28, grande: 38 },
  createdAt: at(2026, 10, 1, 9, 0),
  updatedAt: at(2026, 10, 1, 9, 0),
}

describe('appuntamenti puri', () => {
  it('formatta durata, prezzo copiato e la data del toast', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(75)).toBe('1h 15')
    expect(formatDuration(120)).toBe('2h')
    expect(formatBookedWhen(at(2026, 10, 29, 9, 30))).toBe('gio 29 ott 09:30')
    expect(quoteServices([bagno], ['bagno'], 'piccola')).toEqual([
      { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
    ])
    expect(quoteServices([{ ...bagno, active: false }], ['bagno'], 'piccola')).toBeNull()
    expect(quoteServices([bagno], ['manca'], 'piccola')).toBeNull()
  })

  it('non sovrappone due intervalli che si toccano e raggruppa il giorno locale', () => {
    expect(rangesOverlap(at(2026, 10, 3, 9, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 11, 0))).toBe(false)
    expect(rangesOverlap(at(2026, 10, 3, 9, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 9, 30), at(2026, 10, 3, 10, 30))).toBe(true)
    expect(localDayKey(at(2026, 1, 3, 0, 30))).toBe('2026-01-03')
    const now = at(2026, 10, 3, 12, 0)
    expect(localDayKey(parseDayParam(null, now))).toBe('2026-10-03')
    expect(localDayKey(parseDayParam('2026-02-31', now))).toBe('2026-10-03')
    expect(localDayKey(parseDayParam('2026-10-05', now))).toBe('2026-10-05')
    const label = overlapLabel(
      [item({ id: 'a', dogId: 'manca', start: at(2026, 10, 3, 9, 0) }), item({ id: 'b', dogId: 'rex', start: at(2026, 10, 3, 9, 30) })],
      (dogId) => (dogId === 'rex' ? 'Rex' : 'Cane assente'),
      at(2026, 10, 3, 9, 15),
      at(2026, 10, 3, 10, 15),
      'self',
    )
    expect(label).toBe('Si sovrappone a Cane assente, Rex')
  })

  it('sceglie il futuro più vicino, altrimenti il passato, e sposta le settimane', () => {
    const now = at(2026, 10, 3, 12, 0)
    const items = [
      item({ id: 'past', dogId: 'bobi', start: at(2026, 10, 1, 9, 0) }),
      item({ id: 'soon', dogId: 'bobi', start: at(2026, 10, 4, 9, 30) }),
      item({ id: 'later', dogId: 'bobi', start: at(2026, 10, 20, 9, 0) }),
      item({ id: 'other', dogId: 'luna', start: at(2026, 10, 4, 8, 0) }),
    ]
    expect(chipSource(items, 'bobi', now)?.id).toBe('soon')
    expect(nextAppointment(items, 'bobi', now)?.id).toBe('soon')
    expect(chipSource(items, 'bobi', at(2026, 10, 21, 12, 0))?.id).toBe('later')
    expect(chipSource(items, 'nuovo', now)).toBeNull()
    expect(nextAppointment([items[0]], 'bobi', now)).toBeNull()
    const shifted = shiftWeeks(at(2026, 10, 29, 9, 30), 2)
    expect(formatBookedWhen(shifted)).toBe('gio 12 nov 09:30')
    expect(chipOpenDay(at(2026, 10, 3, 15, 0), 2)).toBe('2026-10-17')
    expect(visibleServiceNames(['Bagno', 'Taglio', 'Nodi'])).toEqual({ shown: ['Bagno', 'Taglio'], extra: 1 })
    expect(visibleServiceNames(['Bagno'])).toEqual({ shown: ['Bagno'], extra: 0 })
  })
})
```

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/lib/appointments.test.ts`

Expected: FAIL perché il modulo non esiste.

- [ ] **Step 3: Implementare tipi e funzioni**

In coda a `src/types/models.ts`, dopo i tipi del cane, aggiungere `AppointmentService`, `Appointment` e `AppointmentWrite` con le firme del blocco Interfaces. Importare `Service` resta dov’è; questi tre tipi non importano nulla di nuovo.

Creare `src/lib/appointments.ts`:

```ts
import { addWeeks } from 'date-fns'
import type { Appointment, AppointmentService, DogSize, Service } from '../types/models'

function buildStartTimes(): string[] {
  const times: string[] = []
  for (let minutes = 8 * 60; minutes <= 19 * 60; minutes += 15) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  return times
}

export const START_TIMES = buildStartTimes()

export function isStartTime(value: string): boolean {
  return START_TIMES.includes(value)
}

export function sumDuration(services: { durationMin: number }[]): number {
  return services.reduce((total, line) => total + line.durationMin, 0)
}

export function sumPrice(services: { price: number }[]): number {
  return services.reduce((total, line) => total + line.price, 0)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}`
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export function formatBookedWhen(date: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`
}

export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseDayParam(value: string | null, now: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return startOfLocalDay(now)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return startOfLocalDay(now)
  return date
}

export function combineDayTime(day: string, time: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, date, hours, minutes, 0, 0)
}

export function appointmentEnd(start: Date, services: { durationMin: number }[]): Date {
  return new Date(start.getTime() + sumDuration(services) * 60_000)
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function overlapLabel(items: Appointment[], dogName: (dogId: string) => string, start: Date, end: Date, ignoreId?: string): string | null {
  const names = items
    .filter((item) => item.id !== ignoreId)
    .filter((item) => rangesOverlap(start, end, item.start, appointmentEnd(item.start, item.services)))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    .map((item) => dogName(item.dogId))
  if (names.length === 0) return null
  return `Si sovrappone a ${names.join(', ')}`
}

export function onLocalDay(items: Appointment[], day: Date): Appointment[] {
  const key = localDayKey(day)
  return items.filter((item) => localDayKey(item.start) === key)
}

function byDog(items: Appointment[], dogId: string): Appointment[] {
  return items.filter((item) => item.dogId === dogId)
}

export function nextAppointment(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const future = byDog(items, dogId)
    .filter((item) => item.start.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
  return future[0] ?? null
}

export function chipSource(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const upcoming = nextAppointment(items, dogId, now)
  if (upcoming) return upcoming
  const past = byDog(items, dogId)
    .filter((item) => item.start.getTime() < now.getTime())
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return past[0] ?? null
}

export function shiftWeeks(start: Date, weeks: 2 | 4 | 6): Date {
  return addWeeks(start, weeks)
}

export function chipOpenDay(now: Date, weeks: 2 | 4 | 6): string {
  return localDayKey(addWeeks(now, weeks))
}

export function quoteServices(catalog: Service[], ids: string[], size: DogSize): AppointmentService[] | null {
  const lines: AppointmentService[] = []
  for (const id of ids) {
    const service = catalog.find((item) => item.id === id && item.active)
    if (!service) return null
    lines.push({
      serviceId: service.id,
      name: service.name,
      durationMin: service.durationMin[size],
      price: service.price[size],
    })
  }
  return lines
}

export function visibleServiceNames(names: string[]): { shown: string[]; extra: number } {
  if (names.length <= 2) return { shown: names, extra: 0 }
  return { shown: names.slice(0, 2), extra: names.length - 2 }
}
```

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/lib/appointments.test.ts`

Expected: PASS

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/lib/appointments.ts src/lib/appointments.test.ts
git commit -m @"
feat: calcola durata, sovrapposizione e chip senza scrivere

"@
```

---

### Task 3: Schema e preventivo del modulo

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/schemas.test.ts`
- Modify: `src/lib/appointments.ts`
- Modify: `src/lib/appointments.test.ts`

**Interfaces:**
- Consumes: `isStartTime`, `quoteServices`, `combineDayTime`, `Dog`, `Service`, `Appointment`, `AppointmentWrite`
- Produces:

```ts
export type AppointmentField = 'dogId' | 'serviceIds' | 'day' | 'time'

export interface AppointmentFormValues {
  dogId: string
  serviceIds: string[]
  day: string
  time: string
}

export const appointmentFormSchema: z.ZodType<AppointmentFormValues>

export function prepareAppointmentWrite(
  values: AppointmentFormValues,
  dogs: Dog[],
  services: Service[],
  existing: Appointment | null,
): { ok: true; write: AppointmentWrite } | { ok: false; field: AppointmentField; message: string }
```

`prepareAppointmentWrite` ordina gli id scelti secondo `service.order` prima di chiamare `quoteServices`. Un cane `attivo` va bene. Un cane non attivo va bene solo se `existing?.dogId === values.dogId` e quel cane è ancora nella lista. Altrimenti `{ ok: false, field: 'dogId', message: 'Scegli un cane' }`. Servizio inattivo o assente: `{ ok: false, field: 'serviceIds', message: 'Scegli un servizio' }`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/schemas.test.ts` importare `appointmentFormSchema` e aggiungere:

```ts
  it('rifiuta cane, servizio, giorno e ora mancanti', () => {
    const parsed = appointmentFormSchema.safeParse({ dogId: '', serviceIds: [], day: '', time: '' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.message)
      expect(fields).toContain('Scegli un cane')
      expect(fields).toContain('Scegli un servizio')
      expect(fields).toContain('Scegli il giorno')
      expect(fields).toContain('Scegli l’ora')
    }
    expect(appointmentFormSchema.safeParse({ dogId: 'bobi', serviceIds: ['bagno'], day: '2026-10-03', time: '09:00' }).success).toBe(true)
    expect(appointmentFormSchema.safeParse({ dogId: 'bobi', serviceIds: ['bagno'], day: '2026-10-03', time: '09:10' }).success).toBe(false)
  })
```

In `src/lib/appointments.test.ts` importare `prepareAppointmentWrite` e `Dog`. Aggiungere il test:

```ts
  it('prepara le righe per la taglia e tiene il cane archiviato già legato', () => {
    const dog = {
      id: 'bobi', name: 'Bobi', species: 'cane' as const, breed: '', ageCategory: 'adulto' as const,
      size: 'piccola' as const, temperament: 'bravo' as const, clientType: 'occasionale' as const,
      contact: { name: '', phone: '333' }, status: 'attivo' as const, searchKey: 'bobi',
      createdAt: at(2026, 10, 1, 9, 0), updatedAt: at(2026, 10, 1, 9, 0),
    }
    const values = { dogId: 'bobi', serviceIds: ['bagno'], day: '2026-10-03', time: '09:00' }
    const ready = prepareAppointmentWrite(values, [dog], [bagno], null)
    expect(ready.ok).toBe(true)
    if (ready.ok) {
      expect(ready.write.services[0]).toEqual({ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 })
      expect(ready.write.start).toEqual(at(2026, 10, 3, 9, 0))
    }
    const archived = { ...dog, status: 'deceduto' as const }
    expect(prepareAppointmentWrite(values, [archived], [bagno], null)).toEqual({ ok: false, field: 'dogId', message: 'Scegli un cane' })
    const kept = prepareAppointmentWrite(values, [archived], [bagno], item({ id: 'app', dogId: 'bobi', start: at(2026, 10, 3, 9, 0) }))
    expect(kept.ok).toBe(true)
  })
```

Il tipo del letterale cane deve soddisfare `Dog`. Se `tsc` segnala un campo mancante, aggiungere solo quel campo al letterale del test, senza cambiare `prepareAppointmentWrite`.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/lib/schemas.test.ts src/lib/appointments.test.ts`

Expected: FAIL perché schema e `prepareAppointmentWrite` non esistono.

- [ ] **Step 3: Implementare schema e prepare**

In `src/lib/schemas.ts` importare `isStartTime` da `./appointments` e aggiungere:

```ts
export interface AppointmentFormValues {
  dogId: string
  serviceIds: string[]
  day: string
  time: string
}

export const appointmentFormSchema = z.object({
  dogId: z.string().min(1, 'Scegli un cane'),
  serviceIds: z.array(z.string()).min(1, 'Scegli un servizio'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scegli il giorno'),
  time: z.string().refine(isStartTime, 'Scegli l’ora'),
})
```

`z.object` qui è già `ZodType<AppointmentFormValues>` senza transform. Non serve il cast del resolver dei cani.

In `src/lib/appointments.ts` aggiungere gli import di `appointmentFormSchema` e `AppointmentFormValues` da `./schemas`, più `AppointmentWrite` e `Dog`. Aggiungere:

```ts
export type AppointmentField = 'dogId' | 'serviceIds' | 'day' | 'time'

export function prepareAppointmentWrite(
  values: AppointmentFormValues,
  dogs: Dog[],
  services: Service[],
  existing: Appointment | null,
): { ok: true; write: AppointmentWrite } | { ok: false; field: AppointmentField; message: string } {
  const parsed = appointmentFormSchema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const key = issue.path[0]
    const field: AppointmentField = key === 'serviceIds' || key === 'day' || key === 'time' ? key : 'dogId'
    return { ok: false, field, message: issue.message }
  }
  const dog = dogs.find((item) => item.id === parsed.data.dogId)
  const kept = existing?.dogId === parsed.data.dogId
  if (!dog || (dog.status !== 'attivo' && !kept)) return { ok: false, field: 'dogId', message: 'Scegli un cane' }
  const ordered = [...parsed.data.serviceIds].sort((a, b) => {
    const left = services.find((service) => service.id === a)?.order ?? 0
    const right = services.find((service) => service.id === b)?.order ?? 0
    return left - right
  })
  const lines = quoteServices(services, ordered, dog.size)
  if (!lines) return { ok: false, field: 'serviceIds', message: 'Scegli un servizio' }
  return {
    ok: true,
    write: { dogId: dog.id, start: combineDayTime(parsed.data.day, parsed.data.time), services: lines },
  }
}
```

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/lib/schemas.test.ts src/lib/appointments.test.ts`

Expected: PASS

Run: `npx tsc --noEmit`

Expected: exit 0. Se l’import tra `schemas.ts` e `appointments.ts` si chiude in un ciclo e `tsc` fallisce, spostare `appointmentFormSchema` in `src/lib/appointmentForm.ts` e aggiornare solo gli import di questo task. Le firme restano quelle del blocco Interfaces.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/schemas.ts src/lib/schemas.test.ts src/lib/appointments.ts src/lib/appointments.test.ts src/lib/appointmentForm.ts
git commit -m @"
feat: valida il modulo e copia il prezzo della taglia

"@
```

`src/lib/appointmentForm.ts` va aggiunto solo se lo step 4 lo ha creato. Non aggiungere file assenti.

---

### Task 4: Repository appuntamenti

**Files:**
- Create: `src/data/local/appointments.ts`
- Create: `src/data/local/appointments.test.ts`

**Interfaces:**
- Consumes: `Appointment`, `AppointmentWrite`, `storageKeys.appointments`, `readJson`, `writeJson`, `AppError`
- Produces:

```ts
export function listAppointments(uid: string): Appointment[]
export function createAppointment(uid: string, input: AppointmentWrite): Appointment
export function updateAppointment(uid: string, id: string, input: AppointmentWrite): Appointment
export function deleteAppointment(uid: string, id: string): void
```

`listAppointments` ordina per `start.getTime()` e poi per `id`. Create e update scrivono la mappa solo dopo aver costruito l’oggetto. Un id assente lancia `new AppError('Appuntamento assente', 'appointment_missing')` prima di `writeJson`. `deleteAppointment` toglie solo quella chiave. Le righe `services` si salvano come arrivano: il repository non legge il listino né il cane.

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `src/data/local/appointments.test.ts`. La prima riga del file è `// @vitest-environment happy-dom`.

```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { createDog, updateDog } from './dogs'
import { ensureServiceSeed, updateService } from './services'
import { createAppointment, deleteAppointment, listAppointments, updateAppointment } from './appointments'
import { storageKeys } from './storage'
import type { AppointmentWrite, DogWrite } from '../../types/models'

function dog(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
  }
}

function write(partial: Partial<AppointmentWrite> = {}): AppointmentWrite {
  return {
    dogId: 'dog-1',
    start: new Date(2026, 9, 3, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    ...partial,
  }
}

describe('appointments', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('salva le righe copiate e non le ricalcola se cambiano listino o taglia', () => {
    const created = createAppointment('uid-1', write())
    const raw = localStorage.getItem(storageKeys.appointments('uid-1'))
    const stored = JSON.parse(raw!)[created.id]
    expect(stored.services[0]).toEqual({ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 })
    expect(typeof stored.start).toBe('string')
    expect(stored.status).toBeUndefined()
    expect(stored.end).toBeUndefined()
    const listed = listAppointments('uid-1')
    expect(listed[0].start).toBeInstanceOf(Date)
    expect(listed[0].start).toEqual(created.start)
    const seeded = ensureServiceSeed('uid-1')
    const bagno = seeded.find((service) => service.id === 'bagno')!
    updateService('uid-1', bagno.id, { durationMin: { piccola: 99, media: 99, grande: 99 }, price: { piccola: 1, media: 1, grande: 1 } })
    const rex = createDog('uid-1', dog('Rex'))
    updateDog('uid-1', rex.id, { ...dog('Rex'), size: 'grande' })
    expect(listAppointments('uid-1')[0].services[0].durationMin).toBe(30)
    expect(listAppointments('uid-1')[0].services[0].price).toBe(20)
    logout()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toContain('Bagno')
  })

  it('ordina per inizio e poi per id', () => {
    const later = createAppointment('uid-1', write({ start: new Date(2026, 9, 3, 11, 0, 0, 0) }))
    const earlier = createAppointment('uid-1', write({ start: new Date(2026, 9, 3, 9, 0, 0, 0) }))
    expect(listAppointments('uid-1').map((item) => item.id)).toEqual([earlier.id, later.id])
  })

  it('un id assente non scrive e la cancellazione toglie solo una voce', () => {
    const created = createAppointment('uid-1', write())
    const other = createAppointment('uid-1', write({ start: new Date(2026, 9, 4, 9, 0, 0, 0) }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    expect(() => updateAppointment('uid-1', 'manca', write())).toThrowError(expect.objectContaining({ code: 'appointment_missing' }))
    expect(() => deleteAppointment('uid-1', 'manca')).toThrowError(expect.objectContaining({ code: 'appointment_missing' }))
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
    deleteAppointment('uid-1', created.id)
    expect(listAppointments('uid-1').map((item) => item.id)).toEqual([other.id])
  })

  it('se setItem lancia resta l’appuntamento precedente', () => {
    const created = createAppointment('uid-1', write())
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => updateAppointment('uid-1', created.id, write({ services: [{ serviceId: 'bagno', name: 'Altro', durationMin: 10, price: 1 }] }))).toThrowError(expect.objectContaining({ code: 'storage_write' }))
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
    expect(listAppointments('uid-1')[0].services[0].name).toBe('Bagno')
  })
})
```

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/data/local/appointments.test.ts`

Expected: FAIL perché il modulo non esiste.

- [ ] **Step 3: Implementare il repository**

Creare `src/data/local/appointments.ts` sullo stampo di `src/data/local/dogs.ts`: `StoredAppointment` con `start: string` e `services` uguale al dominio; `toDomain` fa `new Date(stored.start)` e copia `createdAt` e `updatedAt`; `toStored` usa `toISOString()`. `readMap` e `writeMap` usano `storageKeys.appointments`. Create usa `crypto.randomUUID()` e `new Date()` per entrambe le date, poi scrive. Update e delete leggono la mappa, lanciano se l’id manca, e solo dopo costruiscono la mappa nuova. Update tiene `createdAt` precedente e aggiorna `updatedAt`. Delete copia la mappa, `delete next[id]`, poi `writeMap`.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/data/local/appointments.test.ts`

Expected: PASS. Se lo spy `setItem` non intercetta sotto jsdom, la prima riga happy-dom resta: non spostare lo spy su `Storage.prototype`.

- [ ] **Step 5: Commit**

```powershell
git add src/data/local/appointments.ts src/data/local/appointments.test.ts
git commit -m @"
feat: salva gli appuntamenti sul dispositivo

"@
```

---

### Task 5: Hook useAppointments

**Files:**
- Create: `src/hooks/useAppointments.ts`

**Interfaces:**
- Consumes: `listAppointments`, `createAppointment`, `updateAppointment`, `deleteAppointment`, `Appointment`, `AppointmentWrite`, `AppError`
- Produces:

```ts
export function useAppointments(uid: string): {
  appointments: Appointment[]
  error: string | null
  lastCreatedId: React.MutableRefObject<string | null>
  saveNew: (input: AppointmentWrite) => boolean
  saveExisting: (id: string, input: AppointmentWrite) => boolean
  remove: (id: string) => boolean
}
```

Stesso `guard` di `useDogs`. I codici catturati sono `storage_write` e `appointment_missing`. In entrambi `setError('Salvataggio non riuscito')` e `return false`. Nessun `useEffect` e nessun toast. `saveNew` assegna `lastCreatedId.current` solo dentro il `guard`, con l’id restituito da `createAppointment`.

- [ ] **Step 1: Scrivere l’hook**

Creare il file con la firma sopra. `useState` iniziale: `() => listAppointments(uid)`. Dopo un’azione riuscita, `setAppointments(listAppointments(uid))` e `setError(null)`.

- [ ] **Step 2: Verificare i tipi**

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useAppointments.ts
git commit -m @"
feat: espone gli appuntamenti alle pagine senza toast

"@
```

---

### Task 6: Toast con azione e Indietro callback

**Files:**
- Modify: `src/components/layout/Toast.tsx`
- Modify: `src/components/layout/Header.tsx`
- Create: `src/components/layout/toastAction.test.tsx`

**Interfaces:**
- Consumes: `useToast`, `Header`
- Produces: `show(message: string, tone: 'ok' | 'plain', action?: { label: string; onClick: () => void }): void`. `Header` accetta `onBack?: () => void`. Se `onBack` c’è, il controllo Indietro è un `button` con `aria-label="Indietro"` che chiama `onBack` e non è un `Link`. Se `onBack` manca, il `Link` verso `backTo` resta com’è.

Il timeout resta 2000 ms e confronta ancora l’id. Il click sull’azione svuota il toast e chiama `onClick`. Gli altri toast, chiamati con due argomenti, non mostrano un pulsante.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/components/layout/toastAction.test.tsx`. Prima riga: `// @vitest-environment happy-dom`.

```ts
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Probe() {
  const toast = useToast()
  return <button type="button" onClick={() => toast.show('Fissato per gio 29 ott 09:30', 'plain', { label: 'Annulla', onClick: () => { document.body.dataset.undone = '1' } })}>Apri</button>
}

describe('toast', () => {
  it('mostra Annulla solo quando l’azione c’è', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><Probe /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(document.body.dataset.undone).toBe('1')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/components/layout/toastAction.test.tsx`

Expected: FAIL perché `show` non accetta il terzo argomento, oppure Annulla non c’è.

- [ ] **Step 3: Implementare toast e onBack**

In `Toast.tsx` estendere lo stato con `action?: { label: string; onClick: () => void }`. `show` salva l’azione insieme al messaggio. Nel riquadro `role="status"`, dopo il messaggio, se c’è l’azione:

```tsx
<button type="button" onClick={() => { const run = toast.action?.onClick; setToast(null); run?.() }}>{toast.action.label}</button>
```

Non cambiare i toast esistenti: `Salvato` resta tono `ok` e senza pulsante.

In `Header.tsx` aggiungere `onBack?: () => void`. Lo stile del controllo Indietro resta quello del `Link` attuale. Se `onBack` è definito, renderizzare il `button`. Altrimenti, se `backTo` è definito, il `Link` attuale.

- [ ] **Step 4: Verificare che passa e che i cani non si rompono**

Run: `npx vitest run src/components/layout/toastAction.test.tsx src/pages/DogsPage.test.tsx`

Expected: PASS. Il test dei cani che preme Indietro deve ancora trovare il link verso Animali.

- [ ] **Step 5: Commit**

```powershell
git add src/components/layout/Toast.tsx src/components/layout/Header.tsx src/components/layout/toastAction.test.tsx
git commit -m @"
feat: aggiunge Annulla al toast e il ritorno in pagina

"@
```

---

### Task 7: Riga e Home di oggi

**Files:**
- Create: `src/components/domain/AppointmentRow.tsx`
- Modify: `src/pages/HomePage.tsx`
- Create: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `useAppointments`, `useDogs`, `onLocalDay`, `formatDuration`, `visibleServiceNames`, `DogAvatar`, `TemperamentIcon`, `Chip`, `TriangleAlert` da `lucide-react`
- Produces: `AppointmentRow({ appointment, dog }: { appointment: Appointment; dog: Dog | undefined })`. Il pulsante ha `aria-label={`Apri ${dog?.name ?? 'Cane assente'}`}` e naviga a `/appuntamenti/${appointment.id}`.

Home toglie il paragrafo «In arrivo». Sotto la ricerca, un `h2` «Oggi» e le righe `onLocalDay(appointments, new Date())`. L’ordine è quello di `listAppointments`, già per inizio e id: non riordinare. Zero righe: «Nessun appuntamento». Ricerca, data e Impostazioni restano.

La riga mostra l’ora con ore e minuti a due cifre, `formatDuration(sumDuration(appointment.services))`, `DogAvatar` `md`, il nome o «Cane assente», i chip di `visibleServiceNames`, e se `extra > 0` un chip `+${extra}`. Se `dog.criticalNote` c’è, un `TriangleAlert` con `aria-label="Avviso critico"`. Se il cane ha un carattere, `TemperamentIcon` con `size={16}`.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `src/pages/appointments.test.tsx` con la prima riga `// @vitest-environment happy-dom`.

```ts
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola',
    temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' },
    ...extra,
  }
}

describe('agenda', () => {
  beforeEach(() => localStorage.clear())

  it('in Home mostra solo gli appuntamenti di oggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { criticalNote: 'Morde' }))
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    const other = new Date()
    other.setDate(other.getDate() + 1)
    other.setHours(9, 0, 0, 0)
    createAppointment(account.uid, {
      dogId: rex.id,
      start: today,
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
        { serviceId: 'taglio', name: 'Taglio / tosatura', durationMin: 45, price: 30 },
        { serviceId: 'nodi', name: 'Gestione nodi', durationMin: 20, price: 5 },
      ],
    })
    createAppointment(account.uid, {
      dogId: rex.id,
      start: other,
      services: [{ serviceId: 'bagno', name: 'Domani', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('1h 35')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.queryByText('Domani')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Avviso critico')).toBeInTheDocument()
  })
})
```

30 + 45 + 20 = 95 minuti, cioè `1h 35`. Il test lo blocca.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL perché manca il titolo Oggi.

- [ ] **Step 3: Implementare riga e Home**

Creare `AppointmentRow.tsx` e sostituire in `HomePage.tsx` il paragrafo «In arrivo» con la sezione. Home usa `useSession`, `useDogs` e `useAppointments`. Il cane della riga è `dogs.find((item) => item.id === appointment.dogId)`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS. Il test del guscio che cerca «In arrivo» dopo «Nuovo appuntamento» deve ancora passare: quel toast si toglie solo nel Task 8.

- [ ] **Step 5: Commit**

```powershell
git add src/components/domain/AppointmentRow.tsx src/pages/HomePage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: mostra gli appuntamenti di oggi in Home

"@
```

---

### Task 8: Calendario e menu +

**Files:**
- Create: `src/pages/CalendarPage.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/pages/ShellFrame.tsx`
- Modify: `src/pages/shellPages.test.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `parseDayParam`, `localDayKey`, `onLocalDay`, `AppointmentRow`, `formatHomeDate`, `ShellFrame`
- Produces: `CalendarPage`. Rotta `/calendario` usa `CalendarPage` al posto di `PlaceholderPage`. `/listino` resta `PlaceholderPage`.

`ShellFrame` legge `useLocation` e `useSearchParams`. «Nuovo appuntamento» chiude il foglio e naviga. Se `pathname === '/calendario'` e la query `data` è una `aaaa-mm-gg`, l’indirizzo è `/appuntamenti/nuovo?data=` più quel valore. Altrimenti `/appuntamenti/nuovo`. «Nuovo cane» resta `/animali/nuovo`.

Il Calendario ha titolo «Calendario», sottotitolo `formatHomeDate(day)`, pulsanti «Giorno prima», «Giorno dopo» e «Oggi». Cambiare giorno scrive la query `data` con `localDayKey`. Le righe sono `onLocalDay`. Vuoto: «Nessun appuntamento».

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/pages/shellPages.test.tsx` sostituire il corpo del test «il più annuncia che l’appuntamento arriva dopo» con:

```ts
  it('nuovo appuntamento apre il modulo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
```

Il titolo del modulo arriva nel Task 9. In questo task il test può fermarsi all’indirizzo: dopo il click, `expect(screen.getByText('Nuovo appuntamento')).toBeInTheDocument()` va bene anche se per questo task la pagina è solo un `Header` titolo «Nuovo appuntamento» temporaneo dentro `AppointmentPage`. Creare quel titolo minimo qui, non nel Task 9: il Task 9 sostituisce il file con il modulo intero.

In `src/pages/appointments.test.tsx` aggiungere:

```ts
  it('il Calendario cambia giorno e tiene la data nell’indirizzo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Giorno dopo' }))
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByText('Nessun appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino' })).toBeInTheDocument()
    expect(screen.getByText('In arrivo')).toBeInTheDocument()
  })
```

Per far trovare «Giorno dopo» come cambio di query, il test sopra non controlla l’URL. Aggiungere nel test, dopo «Giorno dopo», il controllo che il sottotitolo non è più quello del 5 ottobre. `formatHomeDate(new Date(2026, 9, 5))` è «Lunedì 5 ottobre». Dopo il click non deve esserci «Lunedì 5 ottobre». Il 6 ottobre 2026 è martedì.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/shellPages.test.tsx`

Expected: FAIL sul Calendario segnaposto o sul toast «In arrivo».

- [ ] **Step 3: Implementare Calendario, rotta, menu e titolo minimo**

`CalendarPage` calcola `day` con `parseDayParam(searchParams.get('data'), new Date())`. I tre pulsanti usano `setSearchParams({ data: localDayKey(...) })`. «Oggi» usa `new Date()`. Giorno prima e dopo sono `addDays` di `date-fns` sul `day` già normalizzato.

In `router.tsx` registrare, in questo ordine: `/calendario` → `CalendarPage`, `/appuntamenti/nuovo` → `AppointmentPage`, `/appuntamenti/:id` → `AppointmentPage`. `/appuntamenti/nuovo` sta prima di `:id`.

`AppointmentPage` in questo task è solo:

```tsx
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'

export function AppointmentPage() {
  return (
    <PhoneShell>
      <Header title="Nuovo appuntamento" backTo="/" />
    </PhoneShell>
  )
}
```

Il Task 9 sostituisce questo file. Non aggiungere qui la logica del modulo.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/CalendarPage.tsx src/pages/AppointmentPage.tsx src/app/router.tsx src/pages/ShellFrame.tsx src/pages/shellPages.test.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: apre il giorno scelto e il modulo dal menu

"@
```

---

### Task 9: Creazione e lettura del dettaglio

**Files:**
- Create: `src/pages/AppointmentForm.tsx`
- Modify: `src/pages/AppointmentPage.tsx` (sostituire il titolo minimo del Task 8)
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `prepareAppointmentWrite`, `START_TIMES`, `localDayKey`, `parseDayParam`, `formatDuration`, `sumDuration`, `sumPrice`, `formatEuro`, `overlapLabel`, `appointmentEnd`, `useAppointments`, `useDogs`, `listServices`, `ensureServiceSeed`, `normalizeSearch`, `buildSearchKey`
- Produces: `AppointmentForm` e `AppointmentPage` in grado di creare e di leggere.

`AppointmentForm` non chiama l’hook. Riceve:

```ts
{
  dogs: Dog[]
  services: Service[]
  appointments: Appointment[]
  ignoreId?: string
  initial: AppointmentFormValues
  onSubmit: (write: AppointmentWrite) => void
}
```

I cani cercabili sono solo `status === 'attivo'`. Il campo ha `aria-label="Cane"`. Il confronto usa `buildSearchKey(dog.name, dog.breed, dog.contact.name)` e `normalizeSearch` della query: il nome normalizzato è contenuto nella search key. I servizi attivi sono pulsanti `aria-pressed`, in ordine di `order`. Giorno: `input type="date"` con `aria-label="Giorno"`. Ora: `select` con `aria-label="Ora"`, prima opzione `value=""` e testo «Scegli», poi `START_TIMES`. Il riepilogo `formatDuration(sumDuration(lines)) · formatEuro(sumPrice(lines))` compare solo se `prepareAppointmentWrite(...).ok`. La frase di `overlapLabel` sta sotto l’ora quando il preventivo è ok. Salva è `type="submit"`. Se `prepareAppointmentWrite` non è ok, si mostra `message` sotto il campo `field` e non si chiama `onSubmit`.

`AppointmentPage` per un modulo nuovo: `initial.day` è la query `data` se `parseDayParam` la accetta, altrimenti `localDayKey(new Date())`. `initial.time` è `09:00` se non c’è query `cane`, altrimenti `''`. `initial.dogId` è la query `cane` solo se quel cane è attivo, altrimenti `''`. `initial.serviceIds` è `[]`. `backTo`: se c’è `cane` ed è un id di cane, `/animali/${cane}`; se c’è `data` valida, `/calendario?data=${data}`; altrimenti `/`. Dopo `saveNew` true, `navigate(\`/appuntamenti/${lastCreatedId.current}\`, { replace: true })` e toast «Salvato» tono `ok`. Se false, toast «Salvataggio non riuscito» tono `plain` e si resta nel modulo.

In lettura, se l’id non è nella lista: titolo «Appuntamento» e «Appuntamento assente». Se c’è: foto `xl`, nome o «Cane assente», `TemperamentIcon` se il cane c’è, riquadro rosso dell’avviso sotto la foto con gli stessi colori della scheda cane (`color: var(--bad)`, `background: var(--bad-s)`), poi giorno con `formatHomeDate`, ora `HH:mm`, durata, `formatEuro`, nomi dei servizi, e il telefono come `<a href={\`tel:${phone}\`}>` solo se `dog.contact.phone.trim()` non è vuoto. Pulsante «Modifica» visibile ma in questo task non cambia schermata: il Task 10 lo collega. Non mostrare ancora Cancella.

I servizi del preventivo si leggono con `ensureServiceSeed(uid)` una volta dentro il render solo se `uid` non è vuoto. Non seminare se la mappa esiste già: `ensureServiceSeed` lo fa da solo.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/pages/appointments.test.tsx` aggiungere:

```ts
  it('crea l’appuntamento, apre il dettaglio e non scrive se manca il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Maria', phone: '333' }, size: 'piccola' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.click(await screen.findByRole('button', { name: 'Salva' }))
    expect(screen.getByText('Scegli un cane')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cane' }), 'labr')
    await user.click(screen.getByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('€ 20')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '333' })).toHaveAttribute('href', 'tel:333')
    expect(screen.getByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
  })
```

Il pulsante di scelta del cane e il chip Bagno hanno lo stesso ruolo `button`. Il test prima scrive nel textbox, poi preme il bottone il cui nome accessibile è esattamente `Rex`, non `Apri Rex`. Il chip servizio è un `button` di nome `Bagno`. Non usare `getByLabelText` dopo un errore di campo.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL sul textbox Cane o su Salva.

- [ ] **Step 3: Implementare form e pagina**

Sostituire `AppointmentPage.tsx` e creare `AppointmentForm.tsx` con il comportamento del blocco Interfaces. Il dettaglio in lettura non dipende dal form. Il titolo del modulo è «Nuovo appuntamento». Il titolo del dettaglio è «Appuntamento». `PhoneShell` senza `showNav`.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/shellPages.test.tsx`

Expected: PASS

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentForm.tsx src/pages/AppointmentPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: crea e apre l’appuntamento

"@
```

---

### Task 10: Modifica, sovrapposizione e cancellazione

**Files:**
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `Header.onBack`, `saveExisting`, `remove`, `localDayKey`
- Produces: modifica in pagina e cancellazione confermata.

«Modifica» monta `AppointmentForm` con `initial` preso dall’appuntamento: `dogId`, `serviceIds` dalle righe, `day` con `localDayKey(start)`, `time` `HH:mm`. `ignoreId` è l’id aperto. Salva con `saveExisting`. Se true, toast «Salvato» tono `ok` e si torna in lettura. Se false, toast «Salvataggio non riuscito» e si resta nel form. `onBack` di `Header` esce dalla modifica senza chiamare `saveExisting`: il form si smonta e il dettaglio rilegge l’appuntamento salvato.

Cancella mostra il testo «Cancellare questo appuntamento?» e i pulsanti «Annulla» e «Cancella». Annulla nasconde la domanda. Cancella chiama `remove`. Se true, `navigate(\`/calendario?data=${localDayKey(appointment.start)}\`)` senza toast. Se false, toast «Salvataggio non riuscito» e la domanda si chiude, il dettaglio resta.

Un cane archiviato già legato resta selezionabile come valore iniziale, ma i risultati della ricerca non lo propongono se l’utente svuota il campo e cerca. Questo è già il filtro `attivo` del form: non aggiungere un secondo elenco.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/pages/appointments.test.tsx` aggiungere tre test.

Modifica e Indietro:

```ts
  it('modifica e salva, e Indietro non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '10:00')
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.queryByText('10:00')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '10:00')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('10:00')).toBeInTheDocument()
  })
```

Sovrapposizione e cancellazione:

```ts
  it('salva anche se si sovrappone e la cancellazione apre il giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-03" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Rex')
    await user.click(screen.getByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    expect(screen.getByText('Si sovrappone a Luna')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(await screen.findByRole('button', { name: 'Cancella' }))
    expect(screen.getByText('Cancellare questo appuntamento?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByText('Cancellare questo appuntamento?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    expect(screen.getByText('Sabato 3 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
  })
```

Il secondo click su Cancella è la conferma. Il 3 ottobre 2026 è un sabato: il sottotitolo è «Sabato 3 ottobre». La riga Luna resta perché il primo appuntamento non è stato cancellato. Mentre la domanda è aperta, il pulsante Cancella del dettaglio non è in pagina: resta un solo pulsante di nome Cancella, quello della conferma.

Salvataggio fallito:

```ts
  it('se setItem lancia resta l’ora precedente', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '11:00')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('11:00')
    expect(JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!)[created.id].start).toContain('T')
    const storedStart = JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!)[created.id].start as string
    expect(new Date(storedStart).getHours()).toBe(9)
  })
```

Aggiungere `vi` all’import di vitest del file, se non c’è già.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL perché Modifica non apre l’ora, o Cancella non c’è.

- [ ] **Step 3: Collegare modifica e cancellazione**

Aggiornare `AppointmentPage` senza cambiare le firme di `AppointmentForm`. In modifica `Header` riceve `onBack` e non `backTo`. In lettura e nel modulo nuovo riceve solo `backTo`.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: modifica e cancella l’appuntamento

"@
```

---

### Task 11: Prossimo appuntamento e chip sulla scheda

**Files:**
- Create: `src/pages/NextAppointment.tsx`
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `useAppointments`, `chipSource`, `nextAppointment`, `shiftWeeks`, `chipOpenDay`, `formatBookedWhen`, `formatDuration`, `sumDuration`
- Produces: `NextAppointment({ dog, uid }: { dog: Dog; uid: string })`, renderizzato da `DogRead` subito dopo il riquadro dell’avviso critico e prima delle righe anagrafiche. `DogRead` accetta `children?: ReactNode` e li mette in quel punto. `DogPage` passa `<NextAppointment dog={dog} uid={uid} />`.

Se `nextAppointment` esiste, il blocco è un pulsante o un link con giorno (`formatHomeDate`), ora, nomi servizi e durata, e porta a `/appuntamenti/${id}`. Se non esiste, il testo è «Nessun appuntamento». I pulsanti «+2 sett», «+4 sett» e «+6 sett» si vedono solo se `dog.status === 'attivo'`.

Con `chipSource` non nullo: `saveNew` di una `AppointmentWrite` con lo stesso `dogId`, `start: shiftWeeks(source.start, weeks)` e `services` copiate dall’oggetto sorgente (`services.map((line) => ({ ...line }))`). Se true, toast `Fissato per ${formatBookedWhen(start)}` tono `plain`, con azione `{ label: 'Annulla', onClick }`. `onClick` chiama `remove(lastCreatedId.current)`. Se `remove` restituisce false, un secondo toast «Salvataggio non riuscito». Se `saveNew` restituisce false, solo «Salvataggio non riuscito», senza «Fissato per».

Con `chipSource` nullo: `navigate(\`/appuntamenti/nuovo?cane=${dog.id}&data=${chipOpenDay(new Date(), weeks)}\`)` e non si chiama `saveNew`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/pages/appointments.test.tsx` aggiungere:

```ts
  it('il chip copia il prossimo e Annulla toglie solo il nuovo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 29, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Fissato per gio 12 nov 09:30')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    const map = JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!) as Record<string, { start: string }>
    expect(Object.keys(map)).toHaveLength(1)
    expect(new Date(Object.values(map)[0].start).getDate()).toBe(29)
  })

  it('senza appuntamenti il chip apre il modulo e un archiviato non ha i chip', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+4 sett' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('')
  })
```

Il secondo test deve anche archiviare un altro cane e aprirne la scheda. Aggiungere nello stesso test, prima del render, un secondo `render` non è possibile sulla stessa utenza senza `cleanup`. Farne un test separato:

```ts
  it('un cane archiviato non ha i chip', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const { archiveDog } = await import('../data/local/dogs')
    archiveDog(account.uid, rex.id, 'deceduto')
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+2 sett' })).not.toBeInTheDocument()
  })
```

Importare `archiveDog` in cima al file invece dell’import dinamico, accanto a `createDog`.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/appointments.test.tsx`

Expected: FAIL perché «+2 sett» non c’è.

- [ ] **Step 3: Implementare il blocco**

Creare `NextAppointment.tsx`. In `DogRead` aggiungere `children?: ReactNode` e renderizzarli fra l’avviso critico e le righe. In `DogPage`, nel ramo di lettura, passare il children. `uid` è già calcolato in `DogPage`.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/appointments.test.tsx src/pages/DogsPage.test.tsx`

Expected: PASS. I test della scheda cane già esistenti devono ancora trovare Modifica, archivio e ripristino.

Run: `npx tsc --noEmit`

Expected: exit 0

- [ ] **Step 5: Commit**

```powershell
git add src/pages/NextAppointment.tsx src/pages/DogPage.tsx src/pages/appointments.test.tsx
git commit -m @"
feat: fissa il successivo dalla scheda del cane

"@
```

---

### Task 12: Verifica del ciclo

**Files:**
- Nessun file nuovo. Si esegue la suite e il controllo manuale della specifica, sezione 8.

- [ ] **Step 1: Suite e build**

Run: `npm test`

Expected: PASS, compresi login, servizi, cani, guscio e appuntamenti. I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.

Run: `npm run build`

Expected: exit 0. `tsc --noEmit` e `vite build` entrambi verdi.

- [ ] **Step 2: Controllo manuale a 360 px**

Avviare `npm run dev`. Nel browser, viewport 360×780, prima chiaro e poi scuro da Impostazioni:

1. Home senza appuntamenti: «Oggi» e «Nessun appuntamento». Non c’è «In arrivo».
2. Menu +: cane, Bagno, giorno e 09:00, Salva. Il dettaglio mostra durata e prezzo. Refresh: l’appuntamento c’è ancora.
3. Home mostra solo quello di oggi. Il Calendario di un altro giorno no. «Giorno prima», «Giorno dopo» e «Oggi» cambiano il sottotitolo e l’indirizzo `data`.
4. Un secondo appuntamento sovrapposto si salva e mostra «Si sovrappone a …».
5. Modifica l’ora, Salva. Indietro dopo un’altra modifica non scritta tiene l’ora salvata.
6. Cancella chiede conferma. Annulla resta nel dettaglio. Cancella apre il Calendario di quel giorno senza la riga.
7. Sulla scheda di un cane con un appuntamento, «+2 sett» mostra il toast e Annulla toglie solo il nuovo. Senza appuntamenti, il chip apre il modulo con l’ora vuota.
8. Un cane archiviato non ha i chip. Il Listino dice ancora «In arrivo». «Nuovo cane» apre ancora la scheda vuota.
9. Nessuno scroll orizzontale. Esci e rientra: l’appuntamento c’è ancora.

- [ ] **Step 3: Commit**

Nessun commit se il passaggio non ha modificato file. Se ha corretto un difetto trovato qui, un commit separato con il perché, solo dei file di quel difetto.
