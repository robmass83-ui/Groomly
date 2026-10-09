# Groomly Completato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Segnare un appuntamento come «completato» dal dettaglio e, da lì, fissare subito il successivo con +2 / +4 / +6 settimane, senza che quel completato resti «il prossimo».

**Architecture:** `Appointment` guadagna `status`. La lettura normalizza un valore assente o sconosciuto a `'programmato'`. `createAppointment` scrive sempre `'programmato'`. `updateAppointment` ricopia lo stato precedente. `completeAppointment` mette solo `'completato'`. `nextAppointment` salta i completati; `chipSource` usa quel prossimo e, se non c’è, l’appuntamento con `start` più grande. Il dettaglio non usa `chipSource`: i suoi chip partono dall’appuntamento aperto. Clienti mensili e la scheda leggono `nextAppointment` com’è già. Il giorno e «Oggi» non filtrano lo stato.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6, date-fns 4, Vitest 3, Testing Library. I test di `App` usano happy-dom. Il resto del progetto resta su localStorage.

Lavorare in `D:\Groomly` sul branch `feat/groomly-completato`, partendo da `master`. Non aprire un worktree. Non cambiare `git config`. Non fare push.

Il 3 ottobre 2026 è sabato. Il 17 e il 31 ottobre 2026 sono sabati. `formatBookedWhen` di sabato 31 ottobre 2026 alle 09:30 è `sab 31 ott 09:30`. Non scrivere altre date inventate.

## Global Constraints

- Interfaccia solo in italiano.
- Colonna 390 px; a 360 px di larghezza nessuna pagina di questo ciclo scorre in orizzontale.
- Nessuna chiave `localStorage` nuova. Lo stato sta nella mappa appuntamenti già usata. Nessun campo nuovo su `Dog`. Su `Appointment` l’unico campo nuovo è `status`: `'programmato'` o `'completato'`.
- `findCorruptGroomlyKey` non cambia. Un JSON illeggibile resta «Dati locali illeggibili» e il valore non si cancella.
- Esci toglie solo `groomly.session`.
- Copia esatta: «Completato · fissa il prossimo», «Completato», «+2 sett», «+4 sett», «+6 sett», «Fissato per sab 31 ott 09:30», «Annulla», «Salvataggio non riuscito», «Nessun appuntamento», «Da fissare», «Modifica», «Cancella», «Salva», «In arrivo».
- Un record senza `status`, o con un valore diverso dai due, si legge `'programmato'` e non si riscrive finché non c’è un altro salvataggio.
- Un appuntamento nuovo, anche da un chip, è sempre `'programmato'`.
- **Completato** non ricalcola durata e prezzo. I chip copiano le righe già salvate.
- Il prossimo è `start >= now` e `status !== 'completato'`. Vale per la scheda e per Clienti mensili.
- Un completato resta nel giorno del suo `start`, in Home sotto «Oggi» e nel calendario del giorno.
- I chip del dettaglio partono da quell’appuntamento. Non usano `chipSource`. Non aprono il modulo. Non controllano la sovrapposizione.
- I chip della scheda restano gli stessi tre pulsanti, nello stesso punto, e continuano a salvare subito con **Annulla**. Non marcare completato l’appuntamento di partenza. Non modificare `NextAppointment.tsx` né `DogPage.tsx`.
- **Modifica** resta e non riporta lo stato a `'programmato'`. **Cancella** resta. **Annulla** sul toast toglie solo l’appuntamento appena creato.
- Fuori da questo ciclo: durata reale da digitare, `actualDurationMin`, `recurrenceWeeks`, scadenza mensile, mese corrente e mese successivo, filtri, conteggio «3 da fissare · 5 fissati», un bottone per rimettere «programmato», notifiche, Capacitor, campanello, listino PDF, backup, Firebase, Storage, `src/lib/firebase.ts`, vista settimana, vista mese, griglia, trascinamento, anticipa e posticipa, foto prima/dopo.
- Il Listino resta «In arrivo». «Nuovo cane» non cambia. Il menu + non cambia. Archiviare un cane non tocca gli appuntamenti.
- Non alzare Vitest. Non modificare `Input`, il `NavLink` di Home (`end` resta assente) e lo schema della password.
- La sovrapposizione del modulo resta quella del ciclo 3: «Si sovrappone a …» e **Salva** scrive comunque. I chip non la mostrano.
- Indietro non usa `window.confirm`.
- I test di `App` hanno `// @vitest-environment happy-dom` come prima riga.
- Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`.
- I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
- PowerShell: non usare `&&`. Il commit è una here-string. Non aggiungere `GROOMLY.md`, `groomly-design.html`, `groomly-cursor-kit.zip`, né `docs/superpowers/plans/`.
- Non importare simboli inutilizzati: `npm run build` esegue `tsc --noEmit` e `noUnusedLocals` fa fallire la build.
- Il toast nasce dal booleano di `complete` o `saveNew`, non da un effetto su `error`.
- Non aggiungere una `key` e non aggiungere un `useEffect` per riallineare il dettaglio.

## File map

- Modify `src/types/models.ts`: `AppointmentStatus` e `status` su `Appointment`. `AppointmentWrite` non cambia.
- Modify `src/data/local/appointments.ts`: lettura, creazione, modifica, `completeAppointment`.
- Modify `src/data/local/appointments.test.ts`: persistenza dello stato.
- Modify `src/lib/monthly.test.ts`: il helper `visit` ha `status: 'programmato'`, così `tsc` passa. Nessun comportamento nuovo.
- Modify `src/lib/appointments.ts`: `nextAppointment` e `chipSource`.
- Modify `src/lib/appointments.test.ts`: il helper `item` ha lo stato di default, più i casi completati.
- Modify `src/hooks/useAppointments.ts`: `complete(id)`.
- Modify `src/pages/AppointmentPage.tsx`: bottone, riga «Completato», chip. Il ramo `editing` non cambia.
- Create `src/pages/completato.test.tsx`: prove di `App`.
- Non modificare `NextAppointment.tsx`, `DogPage.tsx`, `HomePage.tsx`, `CalendarPage.tsx`, `MonthlyPage.tsx`.

---

### Task 1: Lo stato sull’appuntamento

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/data/local/appointments.ts`
- Modify: `src/data/local/appointments.test.ts`
- Modify: `src/lib/monthly.test.ts` (solo `status` nel helper `visit`)
- Modify: `src/lib/appointments.test.ts` (solo `status` nel helper `item`)

**Interfaces:**
- Consumes: `AppError` con codice `'appointment_missing'`; `writeJson` che rilancia `'storage_write'`.
- Produces:
  - `AppointmentStatus = 'programmato' | 'completato'`
  - `Appointment.status: AppointmentStatus`
  - `completeAppointment(uid: string, id: string): Appointment`
  - `createAppointment` persiste `status: 'programmato'`
  - `updateAppointment` ricopia `previous.status`
  - `listAppointments` legge uno stato assente o sconosciuto come `'programmato'`

- [ ] **Step 1: Creare il branch e il test che fallisce**

```powershell
git checkout master
git checkout -b feat/groomly-completato
```

In `src/data/local/appointments.test.ts` aggiungere `completeAppointment` all’import da `./appointments` e `AppError` da `../errors`.

Sostituire `expect(stored.status).toBeUndefined()` con `expect(stored.status).toBe('programmato')` e `expect(listed[0].status).toBe('programmato')` nello stesso test, dopo l’assert su `listed[0].start`.

Aggiungere questi test nello stesso `describe('appointments')`.

```ts
  it('legge uno stato assente o sconosciuto come programmato e non riscrive', () => {
    const start = new Date(2026, 9, 17, 9, 0, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { id: 'a', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start },
      b: { id: 'b', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start, status: 'chiuso' },
    }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    const listed = listAppointments('uid-1')
    expect(listed.find((item) => item.id === 'a')?.status).toBe('programmato')
    expect(listed.find((item) => item.id === 'b')?.status).toBe('programmato')
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
  })

  it('completato tiene righe e inizio, e la modifica non riapre', () => {
    const created = createAppointment('uid-1', write({
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    }))
    const done = completeAppointment('uid-1', created.id)
    expect(done.status).toBe('completato')
    expect(done.start).toEqual(created.start)
    expect(done.services).toEqual(created.services)
    expect(done.createdAt).toEqual(created.createdAt)
    const nextStart = new Date(2026, 9, 3, 11, 0, 0, 0)
    const updated = updateAppointment('uid-1', created.id, write({ start: nextStart }))
    expect(updated.status).toBe('completato')
    expect(updated.start).toEqual(nextStart)
    expect(updated.services[0].price).toBe(99)
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].status).toBe('completato')
  })

  it('completare un id assente fallisce come le altre scritture assenti', () => {
    expect(() => completeAppointment('uid-1', 'assente')).toThrow(AppError)
    try {
      completeAppointment('uid-1', 'assente')
    } catch (caught) {
      expect(caught).toBeInstanceOf(AppError)
      expect((caught as AppError).code).toBe('appointment_missing')
    }
  })
```

In `src/lib/monthly.test.ts`, dentro `visit`, aggiungere `status: 'programmato'` accanto a `updatedAt`.

In `src/lib/appointments.test.ts`, dentro `item`, aggiungere `status: 'programmato'` prima dello spread `...partial`, così un test può sovrascriverlo.

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/data/local/appointments.test.ts`

Expected: FAIL perché `completeAppointment` non esiste, oppure perché `stored.status` non è ancora `'programmato'`.

- [ ] **Step 3: Scrivere l’implementazione minima**

In `src/types/models.ts`, prima di `Appointment`, aggiungere:

```ts
export type AppointmentStatus = 'programmato' | 'completato'
```

Aggiungere `status: AppointmentStatus` su `Appointment`, dopo `services`. Non aggiungerlo a `AppointmentWrite`.

In `src/data/local/appointments.ts` importare il tipo `AppointmentStatus`. `StoredAppointment` guadagna `status?: string`.

```ts
function appointmentStatus(value: unknown): AppointmentStatus {
  return value === 'programmato' || value === 'completato' ? value : 'programmato'
}
```

`toDomain` imposta `status: appointmentStatus(stored.status)`. `toStored` scrive `status: appointment.status`.

`appointmentFromWrite` riceve lo stato e lo copia. Non lo decide da sola.

```ts
function appointmentFromWrite(input: AppointmentWrite, id: string, createdAt: Date, status: AppointmentStatus): Appointment {
  return {
    id,
    dogId: input.dogId,
    start: input.start,
    services: input.services,
    status,
    createdAt,
    updatedAt: new Date(),
  }
}
```

`createAppointment` chiama `appointmentFromWrite(input, crypto.randomUUID(), now, 'programmato')`.

`updateAppointment` chiama `appointmentFromWrite(input, id, previous.createdAt, previous.status)`.

Aggiungere:

```ts
export function completeAppointment(uid: string, id: string): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const appointment = { ...previous, status: 'completato' as const, updatedAt: new Date() }
  writeMap(uid, { ...map, [id]: toStored(appointment) })
  return appointment
}
```

`appointmentStatus` resta privata. Non esportarla.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/data/local/appointments.test.ts src/lib/monthly.test.ts src/lib/appointments.test.ts`

Expected: PASS. Poi `npm run build`. Expected: exit code 0. Se `tsc` segnala un altro letterale `Appointment` senza `status`, aggiungere solo `status: 'programmato'` in quel letterale.

- [ ] **Step 5: Commit**

```powershell
git add src/types/models.ts src/data/local/appointments.ts src/data/local/appointments.test.ts src/lib/monthly.test.ts src/lib/appointments.test.ts
git commit -m @"
feat: segna l’appuntamento come programmato o completato

"@
```

---

### Task 2: Il prossimo salta i completati

**Files:**
- Modify: `src/lib/appointments.ts` (solo `nextAppointment` e `chipSource`)
- Test: `src/lib/appointments.test.ts`

**Interfaces:**
- Consumes: `Appointment.status` dal Task 1.
- Produces: `nextAppointment(items, dogId, now)` restituisce `null` se l’unico futuro è `'completato'`. `chipSource(items, dogId, now)` restituisce prima quel prossimo; se è `null`, l’appuntamento del cane con `start` più grande, a parità l’`id` minore. Può essere un completato.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/appointments.test.ts`, dentro `describe('appuntamenti puri')`, aggiungere:

```ts
  it('un completato ancora davanti non è il prossimo, e senza aperti il chip prende lo start più grande', () => {
    const now = at(2026, 10, 3, 12, 0)
    const done = item({ id: 'done', dogId: 'bobi', start: at(2026, 10, 17, 9, 0), status: 'completato' })
    const older = item({ id: 'old', dogId: 'bobi', start: at(2026, 10, 1, 9, 0), status: 'completato' })
    const open = item({ id: 'open', dogId: 'bobi', start: at(2026, 10, 20, 9, 0) })
    expect(nextAppointment([done], 'bobi', now)).toBeNull()
    expect(nextAppointment([done, open], 'bobi', now)?.id).toBe('open')
    expect(chipSource([done, open], 'bobi', now)?.id).toBe('open')
    expect(chipSource([done, older], 'bobi', now)?.id).toBe('done')
    const same = at(2026, 10, 1, 9, 0)
    expect(chipSource([
      item({ id: 'b', dogId: 'bobi', start: same, status: 'completato' }),
      item({ id: 'a', dogId: 'bobi', start: same, status: 'completato' }),
    ], 'bobi', now)?.id).toBe('a')
  })
```

Il 17 ottobre 2026 è sabato, dopo il 3 ottobre alle 12:00. Il 20 ottobre è ancora dopo. `item` mette già `'programmato'` se `status` non è passato.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/lib/appointments.test.ts`

Expected: FAIL. `nextAppointment([done], ...)` oggi restituisce `done`, perché guarda solo `start >= now`.

- [ ] **Step 3: Scrivere l’implementazione minima**

In `nextAppointment`, il filtro diventa:

```ts
.filter((item) => item.start.getTime() >= now.getTime() && item.status !== 'completato')
```

Sostituire il corpo di `chipSource` dopo la chiamata a `nextAppointment`:

```ts
export function chipSource(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const upcoming = nextAppointment(items, dogId, now)
  if (upcoming) return upcoming
  const latest = byDog(items, dogId)
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return latest[0] ?? null
}
```

Non filtrare il giorno. Non cambiare `onLocalDay`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/appointments.test.ts src/lib/monthly.test.ts`

Expected: PASS. I mensili con un futuro `'programmato'` restano «Fissati».

- [ ] **Step 5: Commit**

```powershell
git add src/lib/appointments.ts src/lib/appointments.test.ts
git commit -m @"
feat: un appuntamento completato non è più il prossimo

"@
```

---

### Task 3: Il dettaglio completa e fissa il successivo

**Files:**
- Modify: `src/hooks/useAppointments.ts`
- Modify: `src/pages/AppointmentPage.tsx`
- Create: `src/pages/completato.test.tsx`

**Interfaces:**
- Consumes: `completeAppointment(uid, id)` dal Task 1; `shiftWeeks(start, weeks)` e `formatBookedWhen(date)` da `src/lib/appointments.ts`; `saveNew`, `remove`, `lastCreatedId` già sul hook.
- Produces: `useAppointments(uid).complete(id: string): boolean`. Sul dettaglio, stato `'programmato'` mostra **Completato · fissa il prossimo**. Stato `'completato'` mostra la riga **Completato** e i chip. Il ramo `editing` non legge `status`.

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `src/pages/completato.test.tsx`.

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { createAppointment } from '../data/local/appointments'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'

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

describe('completato', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Completato tiene il prezzo, mostra i chip, e +4 sett copia le righe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    expect(await screen.findByText('Completato')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato · fissa il prossimo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+2 sett' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+6 sett' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('completato')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].services[0].price).toBe(99)
    await user.click(screen.getByRole('button', { name: '+4 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, services: { price: number }[], start: string }>
    expect(Object.keys(map)).toHaveLength(2)
    const createdNext = Object.values(map).find((item) => item.status === 'programmato')
    expect(createdNext?.services[0].price).toBe(99)
    expect(new Date(createdNext!.start).getDate()).toBe(31)
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    const after = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.keys(after)).toEqual([created.id])
    expect(after[created.id].status).toBe('completato')
    expect(screen.getByText('Completato')).toBeInTheDocument()
  })

  it('se completare fallisce resta il bottone e non compaiono i chip', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completato · fissa il prossimo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+2 sett' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('programmato')
    spy.mockRestore()
  })

  it('Modifica di un completato lo lascia completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    expect(screen.queryByRole('button', { name: 'Completato · fissa il prossimo' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '11:00')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Completato')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string, start: string }
    expect(stored.status).toBe('completato')
    expect(new Date(stored.start).getHours()).toBe(11)
  })

  it('se il chip non scrive, il completato e i chip restano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await screen.findByText('Completato')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: '+2 sett' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByText('Completato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+2 sett' })).toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toEqual([created.id])
    spy.mockRestore()
  })

  it('se Annulla non cancella, il nuovo resta e il completato pure', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.findByRole('button', { name: '+4 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.keys(map)).toHaveLength(2)
    expect(map[created.id].status).toBe('completato')
    spy.mockRestore()
  })

  it('un +2 sett che cade ancora nel passato si salva lo stesso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 19 set 09:30')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    const next = Object.values(map).find((item) => item.status === 'programmato')
    expect(new Date(next!.start)).toEqual(new Date(2026, 8, 19, 9, 30, 0, 0))
  })
})
```

Il 5 settembre 2026 è sabato. Più 2 settimane è sabato 19 settembre 2026, ancora prima del 3 ottobre. Il chip lo scrive lo stesso.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/completato.test.tsx`

Expected: FAIL. Il bottone **Completato · fissa il prossimo** non c’è.

- [ ] **Step 3: Hook e dettaglio**

In `src/hooks/useAppointments.ts` importare `completeAppointment` insieme alle altre funzioni del repository.

Nel valore restituito, dopo `saveExisting`:

```ts
complete(id: string) {
  return guard(() => {
    completeAppointment(uid, id)
  })
},
```

`complete` non scrive `lastCreatedId`.

In `src/pages/AppointmentPage.tsx` aggiungere `formatBookedWhen` e `shiftWeeks` all’import da `../lib/appointments`.

Dalla chiamata `useAppointments(uid)` prendere anche `complete`.

Dopo `confirmDelete`, aggiungere:

```ts
function markDone(appointmentId: string) {
  if (!complete(appointmentId)) toast.show('Salvataggio non riuscito', 'plain')
}

function bookWeeks(appointment: Appointment, weeks: 2 | 4 | 6) {
  const start = shiftWeeks(appointment.start, weeks)
  const saved = saveNew({
    dogId: appointment.dogId,
    start,
    services: appointment.services.map((line) => ({ ...line })),
  })
  if (!saved) {
    toast.show('Salvataggio non riuscito', 'plain')
    return
  }
  toast.show(`Fissato per ${formatBookedWhen(start)}`, 'plain', {
    label: 'Annulla',
    onClick: () => {
      const created = lastCreatedId.current
      if (!created || !remove(created)) toast.show('Salvataggio non riuscito', 'plain')
    },
  })
}
```

Nel `return` del dettaglio letto, passare a `AppointmentRead` `onComplete={() => markDone(appointment.id)}` e `onBook={(weeks) => bookWeeks(appointment, weeks)}`.

`AppointmentRead` riceve quelle due callback. `onBook` ha tipo `(weeks: 2 | 4 | 6) => void`. Non importare `chipSource`. Non toccare il ramo `editing`.

Dopo il blocco **Cancella** / conferma, ancora dentro il `div` della pagina:

```tsx
{appointment.status === 'completato' ? (
  <>
    <p style={{ margin: 0, fontWeight: 700 }}>Completato</p>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {([2, 4, 6] as const).map((weeks) => (
        <button
          key={weeks}
          type="button"
          onClick={() => onBook(weeks)}
          style={{
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--tx)',
            borderRadius: SIZES.chip.radius,
            padding: `${SIZES.chip.padY}px ${SIZES.chip.padX}px`,
            fontSize: SIZES.chip.font,
            fontWeight: 600,
          }}
        >
          +{weeks} sett
        </button>
      ))}
    </div>
  </>
) : (
  <Button type="button" onClick={onComplete}>Completato · fissa il prossimo</Button>
)}
```

`AppointmentPage` importa già `SIZES`. I chip sono gli stessi stili di `NextAppointment`. Vanno a capo con `flexWrap: 'wrap'`.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/completato.test.tsx src/pages/appointments.test.tsx`

Expected: PASS. I warning del router sono ammessi.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useAppointments.ts src/pages/AppointmentPage.tsx src/pages/completato.test.tsx
git commit -m @"
feat: completa dal dettaglio e fissa il successivo

"@
```

---

### Task 4: Scheda, mensili e Oggi

**Files:**
- Test: `src/pages/completato.test.tsx`

**Interfaces:**
- Consumes: `completeAppointment` dal Task 1; `nextAppointment` e `chipSource` dal Task 2; i chip già presenti in `NextAppointment`. Questo task non ha una funzione nuova.
- Produces: niente. Se un test fallisce, si corregge `chipSource` o `nextAppointment`. Non si sposta il chip della scheda e non si filtra «Oggi».

- [ ] **Step 1: Aggiungere i test**

Sostituire `dog()` con questa firma, così i test del Task 3 restano validi:

```ts
function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}
```

Aggiungere `completeAppointment` all’import da `../data/local/appointments`.

Dentro `describe('completato')`, aggiungere questi test.

```tsx
  it('il chip della scheda non marca completato l’appuntamento di partenza', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const source = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:00')
    const booked = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(booked[source.id].status).toBe('programmato')
    expect(Object.values(booked).filter((item) => item.status === 'programmato')).toHaveLength(2)
  })

  it('senza aperti la scheda dice Nessun appuntamento e il chip parte dal completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const source = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, source.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+2 sett' }))
    const again = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    expect(again[source.id].status).toBe('completato')
    const next = Object.values(again).find((item) => item.status === 'programmato')
    expect(new Date(next!.start).getDate()).toBe(31)
  })

  it('un mensile il cui unico futuro è completato torna Da fissare, e Oggi lo tiene', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile' }))
    const future = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const today = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, future.id)
    completeAppointment(account.uid, today.id)
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Da fissare' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fissati' })).not.toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
    expect(screen.queryByText('Nessun appuntamento')).not.toBeInTheDocument()
  })
```

Il 17 ottobre 2026 alle 09:00 più 2 settimane è sabato 31 ottobre 2026 alle 09:00. Il toast è «Fissato per sab 31 ott 09:00».

- [ ] **Step 2: Eseguire i test**

Run: `npx vitest run src/pages/completato.test.tsx`

Expected: PASS. Tutti i test del file passano. Non modificare `NextAppointment.tsx`. Se «Nessun appuntamento» non compare dopo il completato, il buco è `chipSource` o `nextAppointment`, non la scheda.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/completato.test.tsx
git commit -m @"
test: il completato esce dal prossimo e resta in oggi

"@
```

Se per far passare un test si è toccato `src/lib/appointments.ts`, quel file entra nello stesso commit. `NextAppointment.tsx` no.

---

### Task 5: Verifica dell’insieme

**Files:**
- Nessun file nuovo, salvo un difetto trovato qui.

**Interfaces:**
- Consumes: i task 1–4.
- Produces: suite e build verdi. Nessun commit se non c’è un difetto.

- [ ] **Step 1: Suite e build**

```powershell
npm test
```

Expected: tutti i test PASS. I warning del router sono ammessi.

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Giro sul telefono**

Avviare `npm run dev` e usare l’URL che stampa Vite. Viewport 360×780.

- Aprire un appuntamento di oggi. C’è **Completato · fissa il prossimo**. Non c’è scorrimento orizzontale (`scrollWidth` 360).
- Premerlo. Compare **Completato** e i tre chip. Durata e prezzo restano quelli già scritti.
- **+4 sett** mostra il toast «Fissato per …» e **Annulla** toglie solo il nuovo. Il completato resta.
- La scheda non mostra più quel completato come prossimo. I tre chip della scheda sono ancora lì.
- Home, sotto «Oggi», mostra ancora l’appuntamento di oggi.
- Clienti mensili: se quello era l’unico futuro, il cane è sotto **Da fissare**.
- **Modifica** del completato, poi **Salva**: lo stato resta completato.
- Listino: «In arrivo».

- [ ] **Step 3: Commit solo se c’è un difetto**

Se il giro trova un difetto, correggerlo, rilanciare `npm test` e `npm run build`, poi commit solo dei file della correzione. Se non c’è un difetto, non fare commit.

Non aggiungere il piano, `GROOMLY.md`, `groomly-design.html`, né `groomly-cursor-kit.zip`.

## Copertura della specifica

- Campo `status`, lettura, creazione, modifica, `completeAppointment`: Task 1.
- `nextAppointment` e `chipSource`: Task 2.
- Dettaglio, hook `complete`, chip, toast, **Annulla** riuscito e fallito, chip che non scrive, chip nel passato, errore di **Completato**, **Modifica**: Task 3.
- Scheda, Clienti mensili, «Oggi»: Task 4.
- Giorno del calendario: `onLocalDay` non si modifica; «Oggi» usa la stessa funzione e il Task 4 lo blocca.
