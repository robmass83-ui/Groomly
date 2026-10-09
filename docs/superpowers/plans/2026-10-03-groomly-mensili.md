# Groomly clienti mensili Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dare la pagina «Clienti mensili» e il banner in Home, e aprire il modulo appuntamento già esistente senza scrivere una memoria nuova.

**Architecture:** Una funzione pura in `src/lib/monthly.ts` divide i cani già letti da `useDogs` e `useAppointments`. Non c’è un hook che salva uno stato mensile. **Fissa** naviga a `/appuntamenti/nuovo` con cane, giorno, ora, servizi e `da=mensili`. Il modulo legge quei parametri. `backTarget` guarda `da` prima del cane e del giorno.

**Tech Stack:** React 18, TypeScript, Vite 6, React Router 6, date-fns 4, Vitest 3, Testing Library. I test di `App` usano happy-dom. Il resto del progetto resta su localStorage.

Lavorare in `D:\Groomly` sul branch `feat/groomly-mensili`, partendo da `master`. Non aprire un worktree. Non cambiare `git config`. Non fare push.

Il 3 ottobre 2026 è sabato. Il 5 settembre 2026 è sabato. Il 10, il 17 e il 31 ottobre 2026 sono sabati. Non scrivere «Lunedì 5 ottobre» né altre date inventate.

## Global Constraints

- Interfaccia solo in italiano.
- Colonna 390 px; a 360 px di larghezza nessuna pagina di questo ciclo scorre in orizzontale.
- Nessuna chiave `localStorage` nuova e nessun campo nuovo su `Dog` o `Appointment`.
- `findCorruptGroomlyKey` non cambia. Un JSON illeggibile resta «Dati locali illeggibili» e il valore non si cancella.
- Esci toglie solo `groomly.session`.
- Copia esatta: «Clienti mensili», «Da fissare», «Fissati», «Nessun mensile», «Nessun appuntamento», «Ultimo sabato 5 settembre», «Fissa», «1 mensile da programmare», «N mensili da programmare», «Vedi», «Sabato 31 ottobre · 09:30», «Nuovo appuntamento», «Scegli», «Scegli un cane», «Scegli un servizio», «Scegli il giorno», «Scegli l’ora», «Salvataggio non riuscito», «In arrivo».
- `da=mensili` è esatto. Un altro valore non torna alla lista.
- **Salva** rilegge durata e prezzo dal listino per la taglia attuale, tramite `prepareAppointmentWrite`. Il chip +2 / +4 / +6 continua a copiare le righe già salvate e a scrivere subito.
- Il chip e il menu + non mettono `da=mensili`.
- Fuori da questo ciclo: stato «Completato», `recurrenceWeeks`, mese corrente e mese successivo, filtri, conteggio «3 da fissare · 5 fissati», notifiche, Capacitor, campanello, listino PDF, backup, Firebase, Storage, `src/lib/firebase.ts`, vista settimana, vista mese, griglia, trascinamento, anticipa e posticipa, foto prima/dopo.
- Il Listino resta «In arrivo». «Nuovo cane» non cambia. Archiviare un cane non tocca gli appuntamenti.
- Non alzare Vitest. Non modificare `Input`, il `NavLink` di Home (`end` resta assente) e lo schema della password.
- La sovrapposizione resta quella del ciclo 3: «Si sovrappone a …» e **Salva** scrive comunque.
- Indietro non usa `window.confirm`.
- I test di `App` hanno `// @vitest-environment happy-dom` come prima riga.
- Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`.
- I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
- PowerShell: non usare `&&`. Il commit è una here-string. Non aggiungere `GROOMLY.md`, `groomly-design.html`, `groomly-cursor-kit.zip`, né `docs/superpowers/plans/`.
- Non importare simboli inutilizzati: `npm run build` esegue `tsc --noEmit` e `noUnusedLocals` fa fallire la build.
- Il modulo crea lo stato con `useState(initial)` solo al montaggio. **Fissa** arriva da `/mensili`, quindi la pagina si monta di nuovo. Non aggiungere una `key` e non aggiungere un `useEffect` per riallineare la query.
- Non modificare `NextAppointment.tsx`, `ShellFrame.tsx`, `DogPage.tsx`, i repository cani e appuntamenti, né il ramo di modifica di `AppointmentPage`.

## File map

- Create `src/lib/monthly.ts`: liste, sottotitoli, inizio proposto, indirizzo di **Fissa**, filtro servizi, testo del banner. Nessuna lettura né scrittura.
- Create `src/lib/monthly.test.ts`: prove pure con un `now` esplicito.
- Modify `src/pages/AppointmentPage.tsx`: leggere `ora`, `servizi` e `da` solo nel modulo nuovo.
- Create `src/pages/MonthlyPage.tsx`: pagina senza barra in basso.
- Create `src/components/domain/MonthlyBanner.tsx`: banner di Home.
- Modify `src/pages/HomePage.tsx`: banner sotto la ricerca e sopra «Oggi».
- Modify `src/app/router.tsx`: `/mensili` dietro l’accesso, prima di `/listino`.
- Create `src/pages/monthly.test.tsx`: prove di `App` con l’orologio fermo.

---

### Task 1: Calcolo puro

**Files:**
- Create: `src/lib/monthly.ts`
- Test: `src/lib/monthly.test.ts`

**Interfaces:**
- Consumes: `nextAppointment(items, dogId, now)`, `isStartTime(value)`, `localDayKey(date)` da `src/lib/appointments.ts`; `addWeeks` da `date-fns`; `formatHomeDate` da `src/lib/format.ts`.
- Produces:
  - `activeServiceIds(ids: string[], services: Service[]): string[]`
  - `suggestedVisit(appointments: Appointment[], dogId: string, services: Service[], now: Date): { day: string; time: string; serviceIds: string[] }`
  - `bookHref(dogId: string, appointments: Appointment[], services: Service[], now: Date): string`
  - `monthlyLists(dogs: Dog[], appointments: Appointment[], now: Date): { toBook: ToBookRow[]; booked: BookedRow[] }`
  - `bannerCopy(toBook: ToBookRow[]): { title: string; names: string } | null`
  - `ToBookRow = { dog: Dog; last: Appointment | null; subtitle: string }`
  - `BookedRow = { dog: Dog; next: Appointment; subtitle: string }`
  - A parità di `start` in **Fissati**, il pareggio è `next.id`, non l’id del cane.

- [ ] **Step 1: Creare il branch e il test che fallisce**

```powershell
git checkout master
git checkout -b feat/groomly-mensili
```

Creare `src/lib/monthly.test.ts` con questo contenuto intero.

```ts
import { describe, expect, it } from 'vitest'
import { bannerCopy, bookHref, monthlyLists, suggestedVisit } from './monthly'
import type { Appointment, Dog, Service } from '../types/models'

const now = new Date(2026, 9, 3, 12, 0, 0, 0)

function dog(id: string, name: string, extra: Partial<Dog> = {}): Dog {
  return {
    id,
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    status: 'attivo',
    contact: { name: '', phone: '333' },
    searchKey: name.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...extra,
  }
}

function visit(id: string, dogId: string, start: Date, serviceIds: string[] = ['bagno']): Appointment {
  return {
    id,
    dogId,
    start,
    services: serviceIds.map((serviceId) => ({ serviceId, name: serviceId, durationMin: 30, price: 99 })),
    createdAt: start,
    updatedAt: start,
  }
}

function service(id: string, active = true): Service {
  return {
    id,
    name: id,
    kind: 'principale',
    durationMin: { piccola: 30, media: 45, grande: 60 },
    price: { piccola: 20, media: 28, grande: 38 },
    order: 0,
    active,
    createdAt: now,
    updatedAt: now,
  }
}

describe('monthly', () => {
  it('tiene fuori occasionale, archiviato, e divide futuro e passato', () => {
    const lists = monthlyLists([
      dog('rex', 'Rex'),
      dog('otto', 'Otto', { clientType: 'occasionale' }),
      dog('lux', 'Lux', { status: 'deceduto' }),
      dog('kira', 'Kira'),
    ], [
      visit('past', 'kira', new Date(2026, 8, 5, 9, 30, 0, 0)),
      visit('future', 'kira', new Date(2026, 9, 17, 9, 0, 0, 0)),
    ], now)
    expect(lists.toBook.map((row) => row.dog.name)).toEqual(['Rex'])
    expect(lists.toBook[0].subtitle).toBe('Nessun appuntamento')
    expect(lists.booked.map((row) => row.dog.name)).toEqual(['Kira'])
    expect(lists.booked[0].subtitle).toBe('Sabato 17 ottobre · 09:00')
    expect(lists.booked[0].next.id).toBe('future')
  })

  it('ordina Da fissare: senza passato per nome, poi il passato più vecchio', () => {
    const lists = monthlyLists([
      dog('nino', 'Nino'),
      dog('anna', 'Anna'),
      dog('anna-b', 'Anna'),
      dog('ciro', 'Ciro'),
      dog('bea', 'Bea'),
    ], [
      visit('c', 'ciro', new Date(2026, 8, 20, 9, 0, 0, 0)),
      visit('b', 'bea', new Date(2026, 8, 1, 9, 0, 0, 0)),
    ], now)
    expect(lists.toBook.map((row) => row.dog.id)).toEqual(['anna', 'anna-b', 'nino', 'bea', 'ciro'])
    expect(lists.toBook.find((row) => row.dog.id === 'bea')?.subtitle).toBe('Ultimo domenica 1 settembre')
  })

  it('scrive Ultimo con la prima lettera minuscola', () => {
    const lists = monthlyLists(
      [dog('luna', 'Luna')],
      [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0))],
      now,
    )
    expect(lists.toBook[0].subtitle).toBe('Ultimo sabato 5 settembre')
    expect(lists.toBook[0].last?.id).toBe('old')
  })

  it('a parità di passato prende lo start più grande e, a pari ora, l’id minore', () => {
    const start = new Date(2026, 8, 5, 9, 30, 0, 0)
    const lists = monthlyLists(
      [dog('luna', 'Luna')],
      [
        visit('b', 'luna', start, ['taglio']),
        visit('a', 'luna', start, ['bagno']),
      ],
      now,
    )
    expect(lists.toBook[0].last?.id).toBe('a')
  })

  it('ordina Fissati per start e poi per id dell’appuntamento', () => {
    const start = new Date(2026, 9, 10, 11, 0, 0, 0)
    const lists = monthlyLists(
      [dog('rex', 'Rex'), dog('luna', 'Luna')],
      [visit('m-2', 'luna', start), visit('m-1', 'rex', start)],
      now,
    )
    expect(lists.booked.map((row) => row.next.id)).toEqual(['m-1', 'm-2'])
  })

  it('senza storico propone oggi, ora vuota e nessun servizio', () => {
    expect(suggestedVisit([], 'rex', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '',
      serviceIds: [],
    })
  })

  it('dal 5 settembre alle 09:30 propone il 31 ottobre alle 09:30', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), ['taglio', 'bagno'])]
    expect(suggestedVisit(appointments, 'luna', [service('bagno'), service('taglio')], now)).toEqual({
      day: '2026-10-31',
      time: '09:30',
      serviceIds: ['taglio', 'bagno'],
    })
  })

  it('se le 14:00 del 3 ottobre sono ancora davanti, non aggiunge un altro mese', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 14, 0, 0, 0))]
    expect(suggestedVisit(appointments, 'luna', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '14:00',
      serviceIds: ['bagno'],
    })
  })

  it('un’ora che non è un quarto d’ora lascia il campo vuoto e porta il giorno a oggi o dopo', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 7, 0, 0))]
    expect(suggestedVisit(appointments, 'luna', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '',
      serviceIds: ['bagno'],
    })
  })

  it('toglie i servizi assenti o spenti e, se non ne resta, omette il parametro', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), ['spento', 'assente'])]
    const visitPlan = suggestedVisit(appointments, 'luna', [service('spento', false), service('bagno')], now)
    expect(visitPlan.serviceIds).toEqual([])
    const href = bookHref('luna', appointments, [service('spento', false), service('bagno')], now)
    const params = new URL(href, 'http://local').searchParams
    expect(params.get('cane')).toBe('luna')
    expect(params.get('data')).toBe('2026-10-31')
    expect(params.get('ora')).toBe('09:30')
    expect(params.get('servizi')).toBeNull()
    expect(params.get('da')).toBe('mensili')
  })

  it('mette nell’indirizzo solo ora e servizi quando ci sono', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0))]
    const params = new URL(bookHref('luna', appointments, [service('bagno')], now), 'http://local').searchParams
    expect(params.get('servizi')).toBe('bagno')
    expect(params.get('da')).toBe('mensili')
  })

  it('il banner è assente senza righe, singolare con una, e mostra solo tre nomi', () => {
    expect(bannerCopy([])).toBeNull()
    const one = monthlyLists([dog('rex', 'Rex')], [], now).toBook
    expect(bannerCopy(one)).toEqual({ title: '1 mensile da programmare', names: 'Rex' })
    const four = monthlyLists([
      dog('zoe', 'Zoe'),
      dog('anna', 'Anna'),
      dog('mia', 'Mia'),
      dog('bea', 'Bea'),
    ], [], now).toBook
    expect(bannerCopy(four)).toEqual({
      title: '4 mensili da programmare',
      names: 'Anna, Bea, Mia',
    })
  })
})
```

Il 1 settembre 2026 è domenica. `formatHomeDate` scrive «Domenica 1 settembre»; il sottotitolo è «Ultimo domenica 1 settembre».

- [ ] **Step 2: Verificare che fallisce**

Run: `npx vitest run src/lib/monthly.test.ts`

Expected: FAIL perché `./monthly` non esiste.

- [ ] **Step 3: Scrivere l’implementazione minima**

Creare `src/lib/monthly.ts`.

```ts
import { addWeeks } from 'date-fns'
import { isStartTime, localDayKey, nextAppointment } from './appointments'
import { formatHomeDate } from './format'
import type { Appointment, Dog, Service } from '../types/models'

export interface ToBookRow {
  dog: Dog
  last: Appointment | null
  subtitle: string
}

export interface BookedRow {
  dog: Dog
  next: Appointment
  subtitle: string
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function latestPast(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const past = items
    .filter((item) => item.dogId === dogId && item.start.getTime() < now.getTime())
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return past[0] ?? null
}

function byNameId(a: Dog, b: Dog): number {
  return a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id)
}

function lastSubtitle(last: Appointment | null): string {
  if (!last) return 'Nessun appuntamento'
  const formatted = formatHomeDate(last.start)
  const sentence = formatted.charAt(0).toLocaleLowerCase('it-IT') + formatted.slice(1)
  return `Ultimo ${sentence}`
}

function bookedSubtitle(next: Appointment): string {
  return `${formatHomeDate(next.start)} · ${clock(next.start)}`
}

export function activeServiceIds(ids: string[], services: Service[]): string[] {
  const active = new Set(services.filter((service) => service.active).map((service) => service.id))
  return ids.filter((id) => active.has(id))
}

export function suggestedVisit(
  appointments: Appointment[],
  dogId: string,
  services: Service[],
  now: Date,
): { day: string; time: string; serviceIds: string[] } {
  const source = latestPast(appointments, dogId, now)
  if (!source) return { day: localDayKey(now), time: '', serviceIds: [] }
  const serviceIds = activeServiceIds(source.services.map((line) => line.serviceId), services)
  const time = clock(source.start)
  if (!isStartTime(time)) {
    let cursor = addWeeks(source.start, 4)
    while (localDayKey(cursor) < localDayKey(now)) cursor = addWeeks(cursor, 4)
    return { day: localDayKey(cursor), time: '', serviceIds }
  }
  let cursor = addWeeks(source.start, 4)
  while (cursor.getTime() < now.getTime()) cursor = addWeeks(cursor, 4)
  return { day: localDayKey(cursor), time: clock(cursor), serviceIds }
}

export function bookHref(dogId: string, appointments: Appointment[], services: Service[], now: Date): string {
  const visit = suggestedVisit(appointments, dogId, services, now)
  const params = new URLSearchParams()
  params.set('cane', dogId)
  params.set('data', visit.day)
  if (visit.time) params.set('ora', visit.time)
  if (visit.serviceIds.length > 0) params.set('servizi', visit.serviceIds.join(','))
  params.set('da', 'mensili')
  return `/appuntamenti/nuovo?${params.toString()}`
}

export function monthlyLists(dogs: Dog[], appointments: Appointment[], now: Date): { toBook: ToBookRow[]; booked: BookedRow[] } {
  const toBook: ToBookRow[] = []
  const booked: BookedRow[] = []
  for (const dog of dogs) {
    if (dog.status !== 'attivo' || dog.clientType !== 'mensile') continue
    const next = nextAppointment(appointments, dog.id, now)
    if (next) {
      booked.push({ dog, next, subtitle: bookedSubtitle(next) })
      continue
    }
    const last = latestPast(appointments, dog.id, now)
    toBook.push({ dog, last, subtitle: lastSubtitle(last) })
  }
  toBook.sort((a, b) => {
    if (!a.last && !b.last) return byNameId(a.dog, b.dog)
    if (!a.last) return -1
    if (!b.last) return 1
    return a.last.start.getTime() - b.last.start.getTime() || byNameId(a.dog, b.dog)
  })
  booked.sort((a, b) => a.next.start.getTime() - b.next.start.getTime() || a.next.id.localeCompare(b.next.id))
  return { toBook, booked }
}

export function bannerCopy(toBook: ToBookRow[]): { title: string; names: string } | null {
  if (toBook.length === 0) return null
  const title = toBook.length === 1 ? '1 mensile da programmare' : `${toBook.length} mensili da programmare`
  return { title, names: toBook.slice(0, 3).map((row) => row.dog.name).join(', ') }
}
```

La virgola nell’indirizzo diventa `%2C`. I test leggono i parametri con `URLSearchParams`, non la stringa grezza.

Con un’ora valida si aggiunge sempre almeno un blocco di 4 settimane, poi si ripete finché l’inizio è `>= now`. Il 5 settembre 2026 alle 09:30 più 4 settimane è il 3 ottobre 2026 alle 09:30, che è prima delle 12:00, quindi si aggiunge un altro blocco e si arriva al 31 ottobre 2026 alle 09:30. Con un’ora non valida si aggiunge sempre almeno un blocco, poi si ripete finché il giorno locale è oggi o dopo, e `time` resta `''`.

- [ ] **Step 4: Verificare che passa**

Run: `npx vitest run src/lib/monthly.test.ts`

Expected: PASS. Se «Ultimo domenica 1 settembre» non coincide con `formatHomeDate`, correggere solo la stringa attesa del test, non la funzione: il sottotitolo è «Ultimo » più la data di Home con la prima lettera minuscola.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/monthly.ts src/lib/monthly.test.ts
git commit -m @"
feat: calcola i mensili da fissare senza scrivere

"@
```

---

### Task 2: Il modulo legge l’indirizzo dei mensili

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (solo `backTarget`, gli import, e l’`initial` del modulo nuovo, oggi intorno alle righe 30-34 e 131-136)
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: `activeServiceIds(ids, services)` dal Task 1; `isStartTime` da `src/lib/appointments.ts`.
- Produces: `backTarget(from, cane, day, dogs)` restituisce `'/mensili'` quando `from === 'mensili'`, prima di guardare il cane. L’`initial` del modulo nuovo ha `serviceIds` filtrati e `time` dall’`ora` valida. Senza `ora` valida, il menu + senza cane resta sulle `09:00`; con `da=mensili` o con `cane` l’ora vuota resta vuota.

- [ ] **Step 1: Scrivere i test che falliscono**

Creare `src/pages/monthly.test.tsx`.

```tsx
// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { ensureServiceSeed, updateService } from '../data/local/services'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

describe('mensili', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('da=mensili preseleziona cane, ora e servizio, e Indietro punta alla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno,sparito&da=mensili`} />)
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cane' })).toHaveValue('Luna')
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('09:30')
    expect(screen.getByRole('button', { name: 'Bagno' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/mensili')
  })

  it('un refresh dello stesso indirizzo tiene i valori e non crea appuntamenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const path = `/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno&da=mensili`
    const first = render(<App memory isDev={false} initialPath={path} />)
    expect(await screen.findByRole('textbox', { name: 'Cane' })).toHaveValue('Luna')
    first.unmount()
    render(<App memory isDev={false} initialPath={path} />)
    expect(await screen.findByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('09:30')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
  })

  it('ignora un’ora non valida e un cane archiviato, ma torna comunque ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    archiveDog(account.uid, rex.id, 'deceduto')
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&data=2026-10-03&ora=09:10&da=mensili`} />)
    expect(await screen.findByRole('textbox', { name: 'Cane' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveDisplayValue('Scegli')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/mensili')
  })

  it('un cane sconosciuto lascia il campo vuoto e Indietro resta sui mensili', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?cane=inesistente&da=mensili&data=2026-10-03" />)
    expect(await screen.findByRole('textbox', { name: 'Cane' })).toHaveValue('')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/mensili')
  })

  it('un servizio spento o assente non resta premuto e Salva non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    ensureServiceSeed(account.uid)
    updateService(account.uid, 'bagno', { active: false })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-03&ora=09:00&servizi=bagno,sparito&da=mensili`} />)
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bagno' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Scegli un servizio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/mensili')
  })

  it('da=altro non torna ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&da=altro&data=2026-10-03`} />)
    expect(await screen.findByRole('link', { name: 'Indietro' })).toHaveAttribute('href', `/animali/${rex.id}`)
  })

  it('se il salvataggio fallisce resta nel modulo con il toast plain', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-03&ora=09:00&servizi=bagno&da=mensili`} />)
    await user.click(await screen.findByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    spy.mockRestore()
  })
})
```

In questo file `dog()` ha `clientType: 'mensile'`. Non copiare l’helper di `appointments.test.tsx`, che usa `occasionale`.

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: FAIL. Con un cane presente, Indietro oggi è `/animali/{id}`, non `/mensili`. L’ora `09:30` nell’indirizzo oggi non viene letta.

- [ ] **Step 3: Leggere i parametri nel modulo nuovo**

In `src/pages/AppointmentPage.tsx` aggiungere `isStartTime` all’import da `../lib/appointments` e aggiungere:

```ts
import { activeServiceIds } from '../lib/monthly'
```

Sostituire `backTarget` con:

```ts
function acceptedTime(value: string | null): string {
  return value !== null && isStartTime(value) ? value : ''
}

function backTarget(from: string | null, cane: string | null, day: string | null, dogs: Dog[]): string {
  if (from === 'mensili') return '/mensili'
  if (cane && dogs.some((dog) => dog.id === cane)) return `/animali/${cane}`
  if (day) return `/calendario?data=${day}`
  return '/'
}
```

Nella chiamata del modulo nuovo, sostituire `backTarget(cane, day, dogs)` con `backTarget(searchParams.get('da'), cane, day, dogs)`.

Sostituire solo l’`initial` del modulo nuovo, quello dopo il `return` del dettaglio. Non toccare l’`initial` del ramo `editing`.

```ts
  const fromMonthly = searchParams.get('da') === 'mensili'
  const quotedTime = acceptedTime(searchParams.get('ora'))
  const initial: AppointmentFormValues = {
    dogId: dogs.find((dog) => dog.id === cane && dog.status === 'attivo')?.id ?? '',
    serviceIds: activeServiceIds((searchParams.get('servizi') ?? '').split(','), services),
    day: day ?? localDayKey(now),
    time: quotedTime || (fromMonthly || cane !== null ? '' : '09:00'),
  }
```

Il titolo resta «Nuovo appuntamento». `save` non cambia: se `saveNew` restituisce false, toast «Salvataggio non riuscito» con tono `'plain'` e si resta nel modulo.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/monthly.test.tsx src/pages/appointments.test.tsx`

Expected: PASS. I warning `v7_startTransition` e `v7_relativeSplatPath` sono ammessi.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/AppointmentPage.tsx src/pages/monthly.test.tsx
git commit -m @"
feat: riporta il modulo dei mensili alla loro lista

"@
```

---

### Task 3: Pagina Clienti mensili

**Files:**
- Create: `src/pages/MonthlyPage.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: `monthlyLists(dogs, appointments, now)` e `bookHref(dogId, appointments, services, now)` dal Task 1. `ensureServiceSeed(uid)` da `src/data/local/services.ts`. `PhoneShell` senza `showNav`. `DogAvatar` con `size="sm"` (larghezza 28). `SectionTitle`.
- Produces: rotta `/mensili` che monta `MonthlyPage` dentro `Guard`. Titolo «Clienti mensili», Indietro verso `/`. Nessuna barra in basso.

- [ ] **Step 1: Aggiungere i test della pagina**

In `src/pages/monthly.test.tsx` aggiungere all’import esistente:

```ts
import { createAppointment } from '../data/local/appointments'
```

Dentro lo stesso `describe('mensili')`, prima della chiusura, aggiungere questi test.

```tsx
  it('senza mensili attivi mostra solo Nessun mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const lux = createDog(account.uid, dog('Lux'))
    archiveDog(account.uid, lux.id, 'non_in_cura')
    createDog(account.uid, dog('Otto', { clientType: 'occasionale' }))
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(screen.getByText('Nessun mensile')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fissati' })).not.toBeInTheDocument()
    expect(screen.queryByText('Lux')).not.toBeInTheDocument()
    expect(screen.queryByText('Otto')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/')
  })

  it('ordina Da fissare, scrive Ultimo e non mostra l’avviso critico', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Nino'))
    createDog(account.uid, dog('Anna', { criticalNote: 'Morde' }))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    createAppointment(account.uid, {
      dogId: bea.id,
      start: new Date(2026, 8, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: ciro.id,
      start: new Date(2026, 8, 20, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Da fissare' })).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text.indexOf('Anna')).toBeLessThan(text.indexOf('Nino'))
    expect(text.indexOf('Nino')).toBeLessThan(text.indexOf('Bea'))
    expect(text.indexOf('Bea')).toBeLessThan(text.indexOf('Ciro'))
    expect(screen.getByText('Nessun appuntamento')).toBeInTheDocument()
    expect(screen.getByText('Ultimo domenica 1 settembre')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Anna' })[0]).toHaveAttribute('width', '28')
    expect(screen.queryByLabelText('Avviso critico')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('la riga fissata apre il dettaglio e non ha Fissa', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('Sabato 10 ottobre · 11:00')).toBeInTheDocument()
    expect(screen.getByText('Sabato 17 ottobre · 09:00')).toBeInTheDocument()
    const body = document.body.textContent ?? ''
    expect(body.indexOf('Sabato 10 ottobre · 11:00')).toBeLessThan(body.indexOf('Sabato 17 ottobre · 09:00'))
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Rex/ }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
  })

  it('Fissa senza storico apre oggi, ora Scegli, e Indietro non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Luna'))
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/mensili" />)
    await user.click(await screen.findByRole('button', { name: 'Fissa' }))
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cane' })).toHaveValue('Luna')
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-03')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveDisplayValue('Scegli')
    expect(screen.getByRole('button', { name: 'Bagno' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/mensili')
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('Fissa con lo storico propone il 31 ottobre e Salva rilegge il listino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { size: 'piccola' }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('Ultimo sabato 5 settembre')).toBeInTheDocument()
    const before = localStorage.getItem(storageKeys.appointments(account.uid))
    await user.click(screen.getByRole('button', { name: 'Fissa' }))
    expect(screen.getByRole('textbox', { name: 'Cane' })).toHaveValue('Luna')
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-31')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('09:30')
    expect(screen.getByRole('button', { name: 'Bagno' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBe(before)
    await user.click(screen.getByRole('button', { name: 'Fissa' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('€ 20')).toBeInTheDocument()
    expect(screen.queryByText('€ 99')).not.toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Fissati' })).toBeInTheDocument()
    expect(screen.getByText('Sabato 31 ottobre · 09:30')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Da fissare' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fissa' })).not.toBeInTheDocument()
  })
```

Il prezzo 99 è solo nello storico. «€ 20» e «30 min» dimostrano che **Salva** ha riletto Bagno per la taglia piccola. Non copiare le righe dello storico nel `saveNew` della pagina.

- [ ] **Step 2: Verificare che i test nuovi falliscono**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: FAIL sui test della pagina, perché `/mensili` oggi ricade sulla Home. I test del Task 2 restano PASS.

- [ ] **Step 3: Pagina e rotta**

Creare `src/pages/MonthlyPage.tsx`.

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { ensureServiceSeed } from '../data/local/services'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { bookHref, monthlyLists, type BookedRow, type ToBookRow } from '../lib/monthly'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'

function ToBookLine({ row, onBook }: { row: ToBookRow; onBook: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
      <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{row.dog.name}</div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.subtitle}</div>
      </div>
      <Button variant="ghost" onClick={onBook}>Fissa</Button>
    </div>
  )
}

function BookedLine({ row }: { row: BookedRow }) {
  return (
    <Link
      to={`/appuntamenti/${row.next.id}`}
      style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, color: 'inherit', textDecoration: 'none' }}
    >
      <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700 }}>{row.dog.name}</span>
        <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.subtitle}</span>
      </span>
    </Link>
  )
}

export function MonthlyPage() {
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const { toBook, booked } = monthlyLists(dogs, appointments, now)
  const empty = toBook.length === 0 && booked.length === 0
  return (
    <PhoneShell>
      <Header title="Clienti mensili" backTo="/" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {empty ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun mensile</p> : null}
        {toBook.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Da fissare</SectionTitle>
            {toBook.map((row) => (
              <ToBookLine
                key={row.dog.id}
                row={row}
                onBook={() => navigate(bookHref(row.dog.id, appointments, services, now))}
              />
            ))}
          </section>
        ) : null}
        {booked.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Fissati</SectionTitle>
            {booked.map((row) => <BookedLine key={row.dog.id} row={row} />)}
          </section>
        ) : null}
      </div>
    </PhoneShell>
  )
}
```

In `src/app/router.tsx` importare `MonthlyPage` e inserire la rotta prima di `/listino`:

```tsx
{ path: '/mensili', element: <Guard><MonthlyPage /></Guard> },
```

Non aggiungere la pagina al menu in basso. Non mostrare filtri, conteggi, né l’avviso critico.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/MonthlyPage.tsx src/app/router.tsx src/pages/monthly.test.tsx
git commit -m @"
feat: elenca i clienti mensili da fissare e già fissati

"@
```

---

### Task 4: Banner in Home

**Files:**
- Create: `src/components/domain/MonthlyBanner.tsx`
- Modify: `src/pages/HomePage.tsx`
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: `monthlyLists` e `bannerCopy` dal Task 1. Home ha già `dogs` e `appointments`.
- Produces: `MonthlyBanner({ dogs, appointments })` rende `null` se `bannerCopy` è `null`. Altrimenti una `section` con `aria-label="Mensili da programmare"`, sfondo `var(--tea-s)`, testo `var(--tea)`, titolo, al massimo tre nomi separati da «, », e il pulsante **Vedi** che naviga a `/mensili`.

- [ ] **Step 1: Aggiungere i test del banner**

Dentro `describe('mensili')` in `src/pages/monthly.test.tsx`, aggiungere questi test. `createAppointment`, `dog` e l’orologio fermo ci sono già.

```tsx
  it('un mensile senza appuntamenti mostra il banner singolare e Vedi apre la lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    createDog(account.uid, dog('Otto', { clientType: 'occasionale' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    const banner = await screen.findByRole('region', { name: 'Mensili da programmare' })
    expect(screen.getByText('1 mensile da programmare')).toBeInTheDocument()
    expect(screen.getByText('Rex')).toBeInTheDocument()
    expect(screen.queryByText('Otto')).not.toBeInTheDocument()
    expect(banner.getAttribute('style')).toContain('var(--tea-s)')
    expect(banner.getAttribute('style')).toContain('var(--tea)')
    const search = screen.getByRole('button', { name: 'Cerca' })
    const oggi = screen.getByRole('heading', { name: 'Oggi' })
    expect(search.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(oggi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Vedi' }))
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
  })

  it('quattro Da fissare mostrano il conteggio intero e solo tre nomi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Zoe'))
    createDog(account.uid, dog('Anna'))
    createDog(account.uid, dog('Mia'))
    createDog(account.uid, dog('Bea'))
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('4 mensili da programmare')).toBeInTheDocument()
    expect(screen.getByText('Anna, Bea, Mia')).toBeInTheDocument()
    expect(screen.queryByText('Zoe')).not.toBeInTheDocument()
  })

  it('un mensile già fissato non fa comparire il banner', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mensili da programmare' })).not.toBeInTheDocument()
    expect(screen.queryByText(/da programmare/)).not.toBeInTheDocument()
  })

  it('dopo Salva dell’unico da fissare il banner non c’è più', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { size: 'piccola' }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    await user.click(await screen.findByRole('button', { name: 'Fissa' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('€ 20')).toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByText(/da programmare/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Verificare che falliscono**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: FAIL perché il banner non è nel documento. I test della pagina restano PASS.

- [ ] **Step 3: Banner sotto la ricerca**

Creare `src/components/domain/MonthlyBanner.tsx`.

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { bannerCopy, monthlyLists } from '../../lib/monthly'
import { TYPE } from '../../theme/theme'
import type { Appointment, Dog } from '../../types/models'

export function MonthlyBanner({ dogs, appointments }: { dogs: Dog[]; appointments: Appointment[] }) {
  const navigate = useNavigate()
  const copy = bannerCopy(monthlyLists(dogs, appointments, new Date()).toBook)
  if (!copy) return null
  return (
    <section
      aria-label="Mensili da programmare"
      style={{ background: 'var(--tea-s)', color: 'var(--tea)', borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: TYPE.base }}>{copy.title}</p>
        <p style={{ margin: 0, fontSize: TYPE.base, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{copy.names}</p>
      </div>
      <Button variant="ghost" onClick={() => navigate('/mensili')} style={{ color: 'var(--tea)' }}>Vedi</Button>
    </section>
  )
}
```

In `src/pages/HomePage.tsx` importare `MonthlyBanner` e inserirlo fra `SearchBar` e `SectionTitle`, dentro lo stesso `div`:

```tsx
        <SearchBar onClick={() => navigate('/animali', { state: { focusSearch: true } })} />
        <MonthlyBanner dogs={dogs} appointments={appointments} />
        <SectionTitle>Oggi</SectionTitle>
```

Non spostare la data fuori dall’intestazione. Non aggiungere `end` al `NavLink` di Home. Ricerca, Impostazioni e «Oggi» restano.

- [ ] **Step 4: Verificare che passano**

Run: `npx vitest run src/pages/monthly.test.tsx src/pages/appointments.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/domain/MonthlyBanner.tsx src/pages/HomePage.tsx src/pages/monthly.test.tsx
git commit -m @"
feat: avvisa in Home se un mensile è da programmare

"@
```

---

### Task 5: Chip, menu, listino, archivio e uscita

**Files:**
- Test: `src/pages/monthly.test.tsx`

**Interfaces:**
- Consumes: il comportamento già presente di `NextAppointment`, `ShellFrame`, `PlaceholderPage`, `archiveDog` e `logout`. Questo task non ha una funzione nuova.
- Produces: niente. Se un test fallisce, si corregge il punto in cui un task precedente ha messo `da=mensili` sul chip o sul menu, oppure ha cancellato dati in uscita. Non si cambia il comportamento del chip.

Questi comportamenti esistono già. Il primo giro è PASS. È rosso solo se un task precedente li ha spostati.

- [ ] **Step 1: Aggiungere i test**

Dentro `describe('mensili')`, aggiungere questi test.

```tsx
  it('il chip della scheda non torna ai mensili', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', `/animali/${rex.id}`)
  })

  it('Nuovo appuntamento dal menu + non torna ai mensili e parte dalle 09:00', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('09:00')
  })

  it('il Listino resta In arrivo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino' })).toBeInTheDocument()
    expect(screen.getByText('In arrivo')).toBeInTheDocument()
  })

  it('archiviare non cancella l’appuntamento e il cane esce dalla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const stored = localStorage.getItem(storageKeys.appointments(account.uid))
    archiveDog(account.uid, rex.id, 'deceduto')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBe(stored)
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByText('Nessun mensile')).toBeInTheDocument()
    expect(screen.queryByText('Rex')).not.toBeInTheDocument()
  })

  it('Esci lascia cani e appuntamenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Esci' }))
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toContain('Rex')
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toContain(rex.id)
  })

  it('la sovrapposizione avvisa e Salva scrive comunque', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 31, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${luna.id}&data=2026-10-31&ora=09:30&servizi=bagno&da=mensili`} />)
    expect(await screen.findByText('Si sovrappone a Rex')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid)) ?? '{}') as Record<string, unknown>
    expect(Object.keys(stored)).toHaveLength(2)
  })
```

- [ ] **Step 2: Eseguire i test**

Run: `npx vitest run src/pages/monthly.test.tsx`

Expected: PASS. Se il chip o il menu tornano a `/mensili`, togliere `da=mensili` da quel punto di ingresso. Non cambiare l’ora vuota del chip senza storico e non cambiare le 09:00 del menu +.

- [ ] **Step 3: Commit**

```powershell
git add src/pages/monthly.test.tsx
git commit -m @"
feat: lascia chip, menu, listino e uscita invariati

"@
```

Se l’unico cambiamento è il test e il test è passato senza toccare altro codice, il commit contiene solo `src/pages/monthly.test.tsx`.

---

### Task 6: Verifica dell’insieme

**Files:**
- Nessun file nuovo, salvo un difetto trovato qui.

**Interfaces:**
- Consumes: i task 1–5.
- Produces: suite e build verdi, e un giro manuale a 360×780. Nessun commit se non c’è un difetto.

- [ ] **Step 1: Suite e build**

```powershell
npm test
```

Expected: tutti i test PASS. I warning del router sono ammessi.

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Giro sul telefono, chiaro e poi scuro**

Avviare `npm run dev`. La porta può non essere 5173 se è occupata: usare l’URL che stampa Vite.

Nel browser, viewport 360×780. Per ogni tema, chiaro e poi scuro da Impostazioni:

- Home senza mensili: c’è «Oggi», non c’è il banner, non c’è scorrimento orizzontale (`scrollWidth` 360).
- Un cane mensile attivo senza appuntamenti: sotto la ricerca e sopra «Oggi» compare «1 mensile da programmare» e il nome, sfondo tè. **Vedi** apre «Clienti mensili».
- La riga ha foto piccola, «Nessun appuntamento» e **Fissa**. Non c’è l’avviso critico. Non c’è la barra in basso.
- **Fissa** apre «Nuovo appuntamento» con quel cane, giorno 3 ottobre 2026 se oggi è quello di prova, ora «Scegli», nessun servizio premuto. Indietro torna a «Clienti mensili» e non chiede conferma.
- Un passato al 5 settembre 2026 ore 09:30 con Bagno: **Fissa** propone 31 ottobre 2026 e 09:30, Bagno premuto. **Salva** mostra «30 min» e «€ 20». Il cane passa sotto «Fissati» con «Sabato 31 ottobre · 09:30». Il banner sparisce se era l’unico.
- La riga fissata apre il dettaglio.
- Dalla scheda, +2 sett non torna a «Clienti mensili». Dal menu +, «Nuovo appuntamento» parte alle 09:00 e Indietro torna a Home.
- Listino: «In arrivo». Esci e rientro: cani e appuntamenti ci sono ancora.
- Due appuntamenti alla stessa ora: «Si sovrappone a …» e **Salva** scrive comunque.

- [ ] **Step 3: Commit solo se c’è un difetto**

Se il giro trova un difetto, correggerlo, rilanciare `npm test` e `npm run build`, poi commit solo dei file della correzione. Se non c’è un difetto, non fare commit.

Non aggiungere il piano, `GROOMLY.md`, `groomly-design.html`, né `groomly-cursor-kit.zip`.

## Copertura della specifica

- Scopo, pagina e banner: Task 3 e Task 4.
- Fuori ciclo, listino, nuovo cane, chip, menu, archivio: vincoli globali e Task 5.
- Chi entra, Da fissare, Fissato, ordine, sottotitoli, banner da uno a tre nomi: Task 1 e i test di Task 3 e Task 4.
- **Fissa** non salva, con e senza storico, incluso il secondo salto di 4 settimane: Task 1 e Task 3.
- `da=mensili` prima del cane, refresh, ora non valida, servizio spento, cane archiviato o sconosciuto, toast di salvataggio fallito: Task 2.
- **Salva** rilegge il listino: Task 3, storico con prezzo 99 e dettaglio «€ 20».
- Sovrapposizione, uscita, nessuna chiave nuova: Task 5 e il fatto che `monthly.ts` non chiama `localStorage`.
