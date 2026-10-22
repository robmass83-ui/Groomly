# Sync degli appuntamenti personali — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare un appuntamento personale toglie solo quel documento, e crearne un altro non riporta quelli eliminati.

**Architecture:** I personali restano in `salon/shared/appointments`. `mergePersonalAppointments` li tiene per id e li toglie solo se quell’id è cancellato. Le visite continuano a essere sostituite dallo snapshot del server. La funzione push salta gli id già nella pietra e lascia intatti promemoria e aggiornamento.

**Tech Stack:** React 18, TypeScript, Vitest, happy-dom, Firebase Firestore e Cloud Functions già presenti. Nessuna dipendenza nuova. Shell: PowerShell, un comando per volta, senza `&&`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-personale-sync-design.md`.
- I personali restano nella collezione `salon/shared/appointments`. Non si crea una collezione nuova.
- L’id dell’appuntamento è l’id del documento. `documentId` in `src/lib/firebaseMap.ts` non si tocca.
- Un personale sparisce solo se il suo id è nella pietra che vale per quell’account o in `sessionDeletedAppointmentIds()`. L’assenza da uno snapshot non è una cancellazione.
- Per Roberto (`usesOnlyCloudData`, email `masala.roberto@hotmail.it` dentro `shared`) la pietra del telefono non nasconde né un personale né una visita. Vale la pietra passata dal listener, più gli id di sessione.
- Le visite si sostituiscono con lo snapshot del server, come oggi. La cache dopo `sawServer` si ignora per intero. La cache vuota si ignora.
- `dropMissing` continua a escludere `kind === 'personale'`. `copyUserKind` non si modifica.
- `remove` non cambia ordine: delete locale, segno di sessione, stato, `rememberDeletion` di quell’id, `removeAppointment`.
- Promemoria: `kind: 'reminder'`, uno per id, url `/appuntamenti/personale/{id}`, finestra 30 minuti. Aggiornamento: `kind: 'updates'`, titolo `Aggiornamento disponibile`, `data.type === 'update'`. Un personale non produce `kind: 'complete'`.
- Se la lettura di `salon/shared/meta/deleted-dogs` fallisce, `appointmentsForPush` riceve `null` e non toglie nulla.
- Non alzare `APP_VERSION` e non pubblicare l’APK nei task 1–4. Il task 5 lo fa il coordinatore, a piano verde.
- I test del task passano prima del commit. Comando: `npx vitest run <file>`.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.

---

### Task 1: Fusione pura dei personali

**Files:**
- Create: `src/lib/personalSync.ts`
- Create: `src/lib/personalSync.test.ts`

**Interfaces:**
- Consumes: `Appointment` da `src/types/models.ts`, `appointmentKind` da `src/lib/personal.ts`
- Produces: `mergePersonalAppointments(previous: readonly Appointment[], incoming: readonly Appointment[], deletedIds: readonly string[]): Appointment[]`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/personalSync.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { mergePersonalAppointments } from './personalSync'

function personal(id: string, updatedAt: Date, start = new Date(2026, 9, 21, 18, 0)): Appointment {
  return {
    id,
    kind: 'personale',
    title: id,
    dogId: '',
    start,
    services: [],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt,
  }
}

function visit(id: string): Appointment {
  return {
    id,
    dogId: 'dog-1',
    start: new Date(2026, 9, 21, 9, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

describe('mergePersonalAppointments', () => {
  const older = new Date(2026, 9, 1, 8, 0)
  const newer = new Date(2026, 9, 2, 8, 0)

  it('tiene un personale assente dallo snapshot e ignora le visite', () => {
    const monday = personal('p-lun', older, new Date(2026, 9, 20, 18, 0))
    const tuesday = personal('p-mar', older, new Date(2026, 9, 21, 18, 0))
    const merged = mergePersonalAppointments([monday, tuesday, visit('v1')], [monday, visit('v2')], [])
    expect(merged.map((item) => item.id)).toEqual(['p-lun', 'p-mar'])
  })

  it('toglie un id cancellato anche se lo snapshot lo contiene ancora', () => {
    const monday = personal('p-lun', older, new Date(2026, 9, 20, 18, 0))
    const tuesday = personal('p-mar', older, new Date(2026, 9, 21, 18, 0))
    const merged = mergePersonalAppointments([monday, tuesday], [monday, tuesday], ['p-lun'])
    expect(merged.map((item) => item.id)).toEqual(['p-mar'])
  })

  it('con lo stesso id tiene updatedAt più nuovo e, a parità, incoming', () => {
    const local = personal('p1', newer)
    const stale = personal('p1', older)
    stale.title = 'Vecchio'
    local.title = 'Nuovo'
    expect(mergePersonalAppointments([local], [stale], [])[0]?.title).toBe('Nuovo')

    const sameTime = personal('p1', older)
    sameTime.title = 'Cloud'
    const previous = personal('p1', older)
    previous.title = 'Telefono'
    expect(mergePersonalAppointments([previous], [sameTime], [])[0]?.title).toBe('Cloud')
  })

  it('ignora un id vuoto', () => {
    const blank = personal('', older)
    expect(mergePersonalAppointments([blank], [blank], [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/personalSync.test.ts`

Expected: FAIL, `mergePersonalAppointments` non è definito.

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/personalSync.ts`:

```ts
import type { Appointment } from '../types/models'
import { appointmentKind } from './personal'

export function mergePersonalAppointments(
  previous: readonly Appointment[],
  incoming: readonly Appointment[],
  deletedIds: readonly string[],
): Appointment[] {
  const gone = new Set(deletedIds.filter((id) => id.length > 0))
  const byId = new Map<string, Appointment>()
  for (const item of previous) {
    if (appointmentKind(item) !== 'personale' || item.id.length === 0 || gone.has(item.id)) continue
    byId.set(item.id, item)
  }
  for (const item of incoming) {
    if (appointmentKind(item) !== 'personale' || item.id.length === 0 || gone.has(item.id)) continue
    const current = byId.get(item.id)
    if (!current || item.updatedAt.getTime() >= current.updatedAt.getTime()) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/personalSync.test.ts`

Expected: PASS, 4 test.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/personalSync.ts src/lib/personalSync.test.ts
git commit -m "fix: la fusione dei personali ignora l'assenza e rispetta l'id cancellato"
```

---

### Task 2: Hook e listener

**Files:**
- Modify: `src/lib/tombstone.ts` (dopo `sessionHidesAppointment`)
- Modify: `src/hooks/useAppointments.ts` (callback del listener, circa 49–72, e l’effetto su `writes`, circa 87–98)
- Modify: `src/data/firebase/client.ts` (`listenAppointments`, circa 836–853)
- Test: `src/hooks/useAppointments.personal.test.tsx`
- Test: `src/hooks/useCloudOnlyData.test.tsx`

**Interfaces:**
- Consumes: `mergePersonalAppointments(previous, incoming, deletedIds)` da `src/lib/personalSync.ts`
- Produces:
  - `sessionDeletedAppointmentIds(): string[]` da `src/lib/tombstone.ts`
  - `listenAppointments(uid, onData)` con `onData(appointments, fromCache?, deletedAppointmentIds?: readonly string[])`
  - Il terzo valore passato in produzione è `stone.appointmentIds`

- [ ] **Step 1: Write the failing tests**

In `src/hooks/useAppointments.personal.test.tsx`, cambiare il tipo del listener in:

```ts
appointmentListener: null as ((items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) | null,
```

e la firma nel mock:

```ts
listenAppointments: async (_uid: string, onData: (items: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void) => {
```

Aggiungere questi due test dentro `describe('appuntamento personale nel hook')`, dopo l’ultimo test:

```ts
  it('uno snapshot del server con solo il personale nuovo tiene gli altri e non riporta l’eliminato', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    const wednesday = personalOn('p-mer', 22)
    act(() => {
      mocks.appointmentListener?.([monday, tuesday, wednesday], false)
    })
    act(() => {
      expect(result.current.remove('p-lun')).toBe(true)
    })
    let saved = false
    act(() => {
      saved = result.current.saveNew({
        dogId: '',
        start: new Date(2026, 9, 23, 11, 0),
        services: [],
        kind: 'personale',
        title: 'Nuovo',
      })
    })
    expect(saved).toBe(true)
    const created = result.current.appointments.find((item) => item.title === 'Nuovo')
    expect(created).toBeDefined()

    act(() => {
      mocks.appointmentListener?.([created as Appointment], false)
    })

    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-mar', 'p-mer', created?.id].sort())
    expect(listAppointments('uid-1').map((item) => item.id).sort()).toEqual(['p-mar', 'p-mer', created?.id].sort())

    act(() => {
      mocks.appointmentListener?.([monday, created as Appointment], false)
    })
    expect(result.current.appointments.map((item) => item.id)).not.toContain('p-lun')
    expect(result.current.appointments.map((item) => item.id)).toContain('p-mar')
    expect(result.current.appointments.map((item) => item.id)).toContain('p-mer')
  })

  it('uno snapshot del server con una sola visita tiene i personali e toglie la visita assente', async () => {
    const { result } = renderHook(() => useAppointments('uid-1'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    const monday = personalOn('p-lun', 20)
    const tuesday = personalOn('p-mar', 21)
    const first = visit('v1', 'dog-1')
    const second = visit('v2', 'dog-2')
    act(() => {
      mocks.appointmentListener?.([monday, tuesday, first, second], false)
    })
    act(() => {
      mocks.appointmentListener?.([first], false)
    })
    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar', 'v1'])
  })
```

In `src/hooks/useCloudOnlyData.test.tsx`, aggiornare allo stesso modo il tipo di `appointmentListener` e la firma di `listenAppointments` nel mock, aggiungendo il terzo argomento opzionale `deletedAppointmentIds?: readonly string[]`.

Aggiungere questo test dentro `describe('useDogs e useAppointments per Roberto dentro shared')`:

```ts
  it('Roberto: uno snapshot corto non cancella un personale e la pietra del telefono non nasconde gli altri', async () => {
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: [], appointmentIds: ['p-mar', 'v-live'] }))
    const monday: Appointment = {
      id: 'p-lun',
      kind: 'personale',
      title: 'Lun',
      dogId: '',
      start: new Date(2026, 9, 20, 18, 0),
      services: [],
      status: 'programmato',
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    }
    const tuesday: Appointment = { ...monday, id: 'p-mar', title: 'Mar', start: new Date(2026, 9, 21, 18, 0) }
    const liveVisit: Appointment = {
      id: 'v-live',
      dogId: 'dog-1',
      start: new Date(2026, 9, 21, 9, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      status: 'programmato',
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    }
    const { result } = renderHook(() => useAppointments('rob-uid'))
    await waitFor(() => expect(mocks.appointmentListener).not.toBeNull())
    act(() => { mocks.appointmentListener?.([monday, tuesday, liveVisit], false) })
    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-lun', 'p-mar', 'v-live'])

    act(() => { expect(result.current.remove('p-lun')).toBe(true) })
    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-mar', 'v-live'])

    act(() => { mocks.appointmentListener?.([liveVisit], false, ['p-lun']) })
    expect(result.current.appointments.map((item) => item.id).sort()).toEqual(['p-mar', 'v-live'])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useAppointments.personal.test.tsx src/hooks/useCloudOnlyData.test.tsx`

Expected: FAIL sui tre test nuovi. Lo snapshot del server sostituisce l’elenco e fa sparire `p-mar`. I test già presenti di questi file restano verdi. Se un test vecchio fallisce, fermarsi: la modifica al tipo del mock non doveva cambiare il comportamento.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/tombstone.ts`, dopo `sessionHidesAppointment`:

```ts
export function sessionDeletedAppointmentIds(): string[] {
  return [...sessionAppointmentIds]
}
```

In `src/data/firebase/client.ts`, cambiare la firma e la chiamata. La firma diventa:

```ts
export async function listenAppointments(uid: string, onData: (appointments: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[]) => void): Promise<() => void> {
```

La riga `onData(...)` diventa:

```ts
onData(filterAppointments(appointments, stone), cached, stone.appointmentIds)
```

In `src/hooks/useAppointments.ts` aggiungere gli import `mergePersonalAppointments` da `../lib/personalSync` e `sessionDeletedAppointmentIds` da `../lib/tombstone`.

Sostituire il callback passato a `listenAppointments` con:

```ts
    void import('../data/firebase/client').then((mod) => mod.listenAppointments(uid, (next, fromCache, cloudDeletedIds) => {
      if (cancelled || (next.length === 0 && fromCache)) return
      if (fromCache && sawServer.current) return
      const onlyCloud = cloudOnlyRef.current
      const stone = readDeletion()
      const tombstoneIds = cloudDeletedIds ?? (onlyCloud ? [] : stone.appointmentIds)
      const deletedIds = [...tombstoneIds, ...sessionDeletedAppointmentIds()]
      const previous = itemsRef.current
      const previousVisits = previous.filter((item) => appointmentKind(item) !== 'personale')
      const visits = next.filter((item) => appointmentKind(item) !== 'personale')
      const incoming = (onlyCloud ? visits : filterAppointments(visits, stone)).filter((item) => !sessionHidesAppointment(item.id))
      const fromCloud = mergePendingAppointments(incoming, previousVisits)
      const incomingIds = new Set(fromCloud.map((item) => item.id))
      for (const id of incomingIds) sessionIds.current.delete(id)
      const carried = fromCache
        ? previousVisits.filter((item) => !incomingIds.has(item.id) && !sessionHidesAppointment(item.id))
        : onlyCloud
          ? previousVisits.filter((item) => sessionIds.current.has(item.id) && !incomingIds.has(item.id) && !sessionHidesAppointment(item.id))
          : []
      const kept = !onlyCloud && fromCache ? filterAppointments(carried, stone) : carried
      const visitMerged = kept.length > 0 ? [...fromCloud, ...kept] : fromCloud
      const personalMerged = mergePersonalAppointments(previous, next, deletedIds)
      const merged = sortAppointments([...visitMerged, ...personalMerged])
      if (!fromCache) sawServer.current = true
      markSalonMirror(uid)
      writeJson(storageKeys.appointments(uid), appointmentsToLocalMap(merged))
      itemsRef.current = merged
      setAppointments(merged)
      setSynced(true)
    })).then((unsub) => {
```

Il `.then((unsub)` e il resto dell’effetto restano come sono. Non cambiare `remove`.

Sostituire il ramo non-locale dell’effetto su `writes` con:

```ts
      setAppointments((current) => {
        const next = cloudOnlyRef.current
          ? current.filter((item) => !sessionHidesAppointment(item.id))
          : filterAppointments(current, readDeletion())
        itemsRef.current = next
        return next
      })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useAppointments.personal.test.tsx src/hooks/useCloudOnlyData.test.tsx src/lib/personalSync.test.ts src/lib/tombstone.test.ts src/lib/firebaseMap.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/tombstone.ts src/hooks/useAppointments.ts src/data/firebase/client.ts src/hooks/useAppointments.personal.test.tsx src/hooks/useCloudOnlyData.test.tsx
git commit -m "fix: lo snapshot non cancella i personali non eliminati"
```

---

### Task 3: Un cane eliminato non cancella i personali

**Files:**
- Modify: `src/lib/personalSync.ts`
- Modify: `src/lib/personalSync.test.ts`
- Modify: `src/data/firebase/client.ts` (`replayLocalDeletion` circa 585–590, `removeDog` circa 773–776)

**Interfaces:**
- Consumes: il file `src/lib/personalSync.ts` del task 1. Non riscrivere `mergePersonalAppointments`.
- Produces:
  - `appointmentMatchedByDeletedDog(data: { kind?: unknown; dogId?: unknown }, deletedDogIds: readonly string[]): boolean`
  - `appointmentRemovedWithDog(docId: string, data: { kind?: unknown; dogId?: unknown }, deletedDogId: string, explicitAppointmentIds: readonly string[]): boolean`
  - Entrambe restituiscono `false` se `data.kind === 'personale'`.

- [ ] **Step 1: Write the failing test**

Aggiungere in `src/lib/personalSync.test.ts` l’import delle due funzioni e questo `describe`:

```ts
import { appointmentMatchedByDeletedDog, appointmentRemovedWithDog, mergePersonalAppointments } from './personalSync'

describe('un cane eliminato non sceglie un personale', () => {
  it('non abbina un personale al cane, e abbina una visita con quel dogId', () => {
    expect(appointmentMatchedByDeletedDog({ kind: 'personale', dogId: 'dog-1' }, ['dog-1'])).toBe(false)
    expect(appointmentMatchedByDeletedDog({ dogId: 'dog-1' }, ['dog-1'])).toBe(true)
    expect(appointmentMatchedByDeletedDog({ dogId: 'dog-2' }, ['dog-1'])).toBe(false)
    expect(appointmentMatchedByDeletedDog({ dogId: '' }, [''])).toBe(false)
  })

  it('removeDog non cancella un personale anche se l’id è già nella pietra', () => {
    expect(appointmentRemovedWithDog('p1', { kind: 'personale', dogId: 'dog-1' }, 'dog-1', ['p1'])).toBe(false)
    expect(appointmentRemovedWithDog('v1', { dogId: 'dog-1' }, 'dog-1', [])).toBe(true)
    expect(appointmentRemovedWithDog('v2', { dogId: 'dog-2' }, 'dog-1', ['v2'])).toBe(true)
    expect(appointmentRemovedWithDog('v3', { dogId: 'dog-2' }, 'dog-1', [])).toBe(false)
  })
})
```

`appointmentMatchedByDeletedDog` è falsa anche quando `dogId` è `''`, perché un id vuoto non è un cane.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/personalSync.test.ts`

Expected: FAIL, le due funzioni non sono definite. I quattro test di `mergePersonalAppointments` restano verdi.

- [ ] **Step 3: Write minimal implementation**

In fondo a `src/lib/personalSync.ts`:

```ts
export function appointmentMatchedByDeletedDog(
  data: { kind?: unknown; dogId?: unknown },
  deletedDogIds: readonly string[],
): boolean {
  if (data.kind === 'personale') return false
  return typeof data.dogId === 'string' && data.dogId.length > 0 && deletedDogIds.includes(data.dogId)
}

export function appointmentRemovedWithDog(
  docId: string,
  data: { kind?: unknown; dogId?: unknown },
  deletedDogId: string,
  explicitAppointmentIds: readonly string[],
): boolean {
  if (data.kind === 'personale') return false
  return explicitAppointmentIds.includes(docId) || data.dogId === deletedDogId
}
```

In `src/data/firebase/client.ts` aggiungere:

```ts
import { appointmentMatchedByDeletedDog, appointmentRemovedWithDog } from '../../lib/personalSync'
```

Nel ciclo di `replayLocalDeletion`, sostituire il corpo che legge `dogId` con:

```ts
      for (const item of snap.docs) {
        const data = item.data() as { dogId?: unknown; kind?: unknown }
        if (!appointmentMatchedByDeletedDog(data, dogIds)) continue
        if (!visitIds.includes(item.id) && !cloud.appointmentIds.includes(item.id)) found.push(item.id)
      }
```

Non togliere la cancellazione di `visitIds`: quegli id, anche se il documento è personale, restano la cancellazione esplicita dell’appuntamento.

In `removeDog`, sostituire il filtro `doomed` con:

```ts
    const doomed = snap.docs.filter((item) => appointmentRemovedWithDog(
      item.id,
      item.data() as { dogId?: unknown; kind?: unknown },
      id,
      merged.appointmentIds,
    ))
```

Non modificare `copyUserKind`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/personalSync.test.ts src/hooks/useAppointments.personal.test.tsx src/hooks/useCloudOnlyData.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/personalSync.ts src/lib/personalSync.test.ts src/data/firebase/client.ts
git commit -m "fix: eliminare un cane non cancella gli appuntamenti personali"
```

---

### Task 4: Promemoria e aggiornamento

**Files:**
- Modify: `src/lib/pushDue.ts` (dopo `selectPushes`)
- Test: `src/lib/pushDue.test.ts`
- Modify: `functions/src/sendPush.ts` (re-export)
- Modify: `functions/src/index.ts` (caricamento `appointments` dentro `sendPush`, circa 176–191)

**Interfaces:**
- Consumes: `selectPushes` e `deliveryId` da `src/lib/pushDue.ts`. Non cambiare il corpo di `selectPushes`.
- Produces: `appointmentsForPush<T extends { id: string }>(appointments: readonly T[], deletedIds: readonly string[] | null): T[]`
  - `deletedIds === null` restituisce una copia e non toglie nulla.
  - Un array toglie quegli id. Un id vuoto non resta.

- [ ] **Step 1: Write the failing test**

In `src/lib/pushDue.test.ts` importare `appointmentsForPush`. Aggiungere:

```ts
  it('due personali nella finestra fanno due promemoria e l’aggiornamento resta', () => {
    const startMs = summer + 20 * 60 * 1000
    const prefs = { ...DEFAULT_PUSH_PREFS, enabled: true, complete: true, updates: true }
    const base = {
      deviceId: 'd1',
      token: 'tok',
      appVersion: '1.1.66',
      nowMs: summer,
      delivered: [] as string[],
      dogNames: {},
      latestVersion: '1.1.67',
      prefs,
    }
    const dentista = { id: 'p1', dogId: '', status: '', startMs, durationMin: 0, personalTitle: 'Dentista' }
    const spesa = { id: 'p2', dogId: '', status: '', startMs, durationMin: 0, personalTitle: 'Spesa' }
    const both = selectPushes({ ...base, appointments: [dentista, spesa] })
    expect(both.filter((item) => item.kind === 'reminder').map((item) => item.subject).sort()).toEqual(['p1', 'p2'])
    expect(both.filter((item) => item.kind === 'updates')).toEqual([expect.objectContaining({
      title: 'Aggiornamento disponibile',
      data: { type: 'update', version: '1.1.67' },
    })])
    expect(both.filter((item) => item.kind === 'complete')).toEqual([])
    const one = selectPushes({ ...base, appointments: [spesa] })
    expect(one.filter((item) => item.kind === 'reminder').map((item) => item.subject)).toEqual(['p2'])
    expect(one.some((item) => item.kind === 'updates')).toBe(true)
  })

  it('il filtro push toglie solo gli id nella pietra e, se la pietra non si legge, non toglie nulla', () => {
    const rows = [{ id: 'p1' }, { id: 'p2' }, { id: '' }]
    expect(appointmentsForPush(rows, null).map((item) => item.id)).toEqual(['p1', 'p2', ''])
    expect(appointmentsForPush(rows, ['p1']).map((item) => item.id)).toEqual(['p2'])
    expect(appointmentsForPush(rows, []).map((item) => item.id)).toEqual(['p1', 'p2'])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pushDue.test.ts`

Expected: FAIL, `appointmentsForPush` non è definito. Il test dei due promemoria passa già, perché `selectPushes` è già per id: non modificarlo per far passare quel test.

- [ ] **Step 3: Write minimal implementation**

In fondo a `src/lib/pushDue.ts`:

```ts
export function appointmentsForPush<T extends { id: string }>(
  appointments: readonly T[],
  deletedIds: readonly string[] | null,
): T[] {
  if (deletedIds === null) return [...appointments]
  const gone = new Set(deletedIds.filter((id) => id.length > 0))
  return appointments.filter((item) => item.id.length > 0 && !gone.has(item.id))
}
```

In `functions/src/sendPush.ts`, dopo gli import:

```ts
export { appointmentsForPush } from '../../src/lib/pushDue'
```

In `functions/src/index.ts`, aggiungere `appointmentsForPush` all’import da `./sendPush`. Sostituire il corpo di `appointments` dentro `load` con:

```ts
    appointments: async () => {
      const [due, upcoming] = await Promise.all([
        db.collection('salon/shared/appointments')
          .where('status', '==', 'programmato')
          .where('start', '<=', now)
          .get(),
        db.collection('salon/shared/appointments')
          .where('kind', '==', 'personale')
          .where('start', '>=', now)
          .where('start', '<=', now + 30 * 60 * 1000)
          .get(),
      ])
      const byId = new Map<string, Record<string, unknown>>()
      for (const doc of [...due.docs, ...upcoming.docs]) byId.set(doc.id, doc.data())
      const mapped = [...byId.entries()].map(([id, data]) => appointmentFromDoc(id, data))
      let deletedIds: string[] | null
      try {
        const tombstone = await db.doc('salon/shared/meta/deleted-dogs').get()
        const raw = tombstone.data()?.appointmentIds
        deletedIds = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0) : []
      } catch {
        deletedIds = null
      }
      return appointmentsForPush(mapped, deletedIds)
    },
```

Non cambiare la query né la finestra di 30 minuti.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/pushDue.test.ts src/lib/personalSync.test.ts src/hooks/useAppointments.personal.test.tsx src/hooks/useCloudOnlyData.test.tsx`

Expected: PASS.

Poi, dalla cartella `functions`: `npx tsc --noEmit` se `tsc` è lo script di build (`npm run build` in `functions`). Expected: exit 0. Se `tsc` non è configurato con `--noEmit`, usare `npm run build` in `functions` e accettare l’emit già previsto da quello script.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/pushDue.ts src/lib/pushDue.test.ts functions/src/sendPush.ts functions/src/index.ts
git commit -m "fix: il promemoria push di un personale resta per id"
```

Non aggiungere `functions/lib` se è generato e non è già tracciato. Se `npm run build` aggiorna `functions/lib` e quei file sono già nel repo, includerli nello stesso commit.

---

### Task 5: Pubblicazione 1.1.67

Questo task lo esegue il coordinatore dopo la review finale, non un subagent di implementazione. Non pubblicare se un test del piano fallisce.

- [ ] **Step 1: Alzare la versione insieme**

Da `1.1.66` a `1.1.67`. `versionCode` diventa `10167`.

- `src/lib/appVersion.ts` → `APP_VERSION`
- `package.json` → `version`
- `android/app/build.gradle` → `versionName "1.1.67"` e `versionCode 10167`
- `hosting/release.json` → `version` `1.1.67` e `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.67/groomly.apk`

La nota di `release.json` dice che eliminare un personale lascia gli altri e che crearne uno non riporta quelli eliminati.

- [ ] **Step 2: Verificare e costruire**

In sequenza, fermandosi al primo exit code diverso da 0:

```powershell
npm test
npm run build
npx cap sync android
```

Poi in `android`:

```powershell
.\gradlew assembleDebug
```

Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del repo. Non metterlo in `hosting/` e non committarlo.

- [ ] **Step 3: Commit, push, release**

Commit solo dei file di versione e del codice di questo piano, sul branch corrente. Push su `origin`. Poi:

```powershell
gh release create v1.1.67 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.67" --notes "Eliminare un appuntamento personale toglie solo quello. Crearne uno nuovo non riporta quelli eliminati. Il promemoria e l'avviso di aggiornamento restano."
```

- [ ] **Step 4: Firebase**

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push.
