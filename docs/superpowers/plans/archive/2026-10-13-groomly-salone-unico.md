# Salone unico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo salone condiviso, visibile subito dalla copia locale, in cui cancellare un cane toglie per sempre i suoi appuntamenti, il listino si apre, e il calendario non sposta più le visite trascinandole.

**Architecture:** Il segno `{ ids, appointmentIds }` vive in `groomly.deleted` e in `salon/shared/meta/deleted-dogs`, e filtra liste e scritture. Le cartelle `users/{uid}` si copiano una sola volta, solo per gli id assenti, e non si riscrivono. Foto e listino nuovi stanno sotto `salon/`. Il tema resta in `groomly.theme`.

**Tech Stack:** React 18, Vite, Vitest, Testing Library, Firebase Firestore e Storage, Capacitor Browser.

## Global Constraints

- Cani, appuntamenti, foto, servizi, listino, promemoria, etichette e suggerimenti sono del salone. Chi entra li legge e li scrive tutti.
- Il tema (`light`, `dark`, `auto`) resta solo sul telefono, chiave `groomly.theme`. Non si scrive nel documento condiviso e un tema arrivato dal salone non cambia lo schermo.
- All’apertura si vede subito l’ultima copia locale. Il salone aggiorna sul posto e non lascia la pagina vuota mentre risponde.
- Eliminare un cane toglie, per tutti e per sempre, la scheda e tutti i suoi appuntamenti, passati e futuri. Una copia vecchia non li ricrea.
- Una foto del listino (JPEG o PNG) si apre nell’app e si ingrandisce con due dita. Un PDF si apre nel lettore del telefono.
- Nel calendario il dito che scorre sposta la pagina. Il tocco sul riquadro apre la scheda. Data e ora si cambiano da Modifica.
- In lettura, le note stanno sopra i prezzi. Lo storico è chiuso in fondo e, al tocco, è una linea del tempo.
- Non si cambia il ritmo del mensile, la barra, Chiama e WhatsApp, lo switch dei prezzi, né chi può entrare. Non ci sono ruoli.
- I backup restano sotto `users/{uid}/backups`.
- Toast di scrittura fallita: «Salvataggio non riuscito». File illeggibile: «File non apribile». PDF senza lettore: «Nessuna app per aprire il PDF».
- Test: `npx vitest run <file>`. Commit solo i file del task. Messaggio in italiano, come i commit recenti (`fix:` / `feat:`).

## File structure

- `src/lib/tombstone.ts` — forma del segno, unione, filtro, rifiuto di una scrittura. Nessun Firebase.
- `src/data/local/storage.ts` — la chiave `groomly.deleted` entra nel controllo dei JSON corrotti.
- `src/lib/firebaseMap.ts` — percorsi `salon/…` e `theme` assente dal documento condiviso.
- `storage.rules` — `salon/**` leggibile e scrivibile da chi è autenticato.
- `src/data/firebase/client.ts` — copia una tantum, cancellazione, ascolto che non aspetta la copia.
- `src/data/firebase/taskQueue.ts` — coda seriale, le cancellazioni prima degli altri salvataggi.
- `src/hooks/useDogs.ts`, `src/hooks/useAppointments.ts` — il segno locale si scrive prima della rete; lo snapshot filtrato diventa la copia locale.
- `src/lib/openDocument.ts` — apre il PDF fuori dall’app.
- `src/lib/pinchScale.ts` — scala del pizzico, tra 1 e 4.
- `src/pages/PriceViewPage.tsx` — foto con zoom, PDF al lettore.
- `src/pages/CalendarPage.tsx` — il riquadro non cattura il dito e non cambia `start`.
- `src/pages/DogPage.tsx` — ordine di lettura e storico a linea del tempo.

---

### Task 1: Segno delle cancellazioni

**Files:**
- Create: `src/lib/tombstone.ts`
- Create: `src/lib/tombstone.test.ts`
- Modify: `src/data/local/storage.ts`

**Interfaces:**
- Consumes: niente
- Produces:
  - `export type Tombstone = { ids: string[]; appointmentIds: string[] }`
  - `export const TOMBSTONE_KEY = 'groomly.deleted'`
  - `export function emptyTombstone(): Tombstone`
  - `export function readTombstone(raw: unknown): Tombstone`
  - `export function mergeTombstone(left: Tombstone, right: Tombstone): Tombstone`
  - `export function tombstoneRejectsDog(stone: Tombstone, id: string): boolean`
  - `export function tombstoneRejectsAppointment(stone: Tombstone, id: string, dogId: string): boolean`
  - `export function filterDogs<T extends { id: string }>(dogs: T[], stone: Tombstone): T[]`
  - `export function filterAppointments<T extends { id: string; dogId: string }>(items: T[], stone: Tombstone): T[]`
  - `export function readDeletion(): Tombstone`
  - `export function rememberDeletion(patch: Partial<Tombstone>): Tombstone`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/tombstone.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  filterAppointments,
  filterDogs,
  mergeTombstone,
  readDeletion,
  readTombstone,
  rememberDeletion,
  tombstoneRejectsAppointment,
  tombstoneRejectsDog,
  TOMBSTONE_KEY,
} from './tombstone'

describe('tombstone', () => {
  beforeEach(() => localStorage.clear())

  it('un documento vecchio senza appointmentIds è un elenco vuoto', () => {
    expect(readTombstone({ ids: ['rex'] })).toEqual({ ids: ['rex'], appointmentIds: [] })
    expect(readTombstone(null)).toEqual({ ids: [], appointmentIds: [] })
    expect(readTombstone({ ids: [1, 'rex'], appointmentIds: ['a', 2] })).toEqual({
      ids: ['rex'],
      appointmentIds: ['a'],
    })
  })

  it('unisce senza duplicare e rifiuta cane e appuntamento collegato', () => {
    const stone = mergeTombstone(
      { ids: ['rex'], appointmentIds: ['a'] },
      { ids: ['rex', 'luna'], appointmentIds: ['a', 'b'] },
    )
    expect(stone).toEqual({ ids: ['rex', 'luna'], appointmentIds: ['a', 'b'] })
    expect(tombstoneRejectsDog(stone, 'luna')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'z', 'luna')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'b', 'altro')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'c', 'altro')).toBe(false)
    expect(filterDogs([{ id: 'rex' }, { id: 'oli' }], stone).map((dog) => dog.id)).toEqual(['oli'])
    expect(filterAppointments(
      [{ id: 'b', dogId: 'oli' }, { id: 'c', dogId: 'oli' }, { id: 'z', dogId: 'luna' }],
      stone,
    ).map((item) => item.id)).toEqual(['c'])
  })

  it('ricorda il segno sul telefono e lo rilegge', () => {
    rememberDeletion({ ids: ['rex'], appointmentIds: ['a'] })
    rememberDeletion({ appointmentIds: ['b'] })
    expect(localStorage.getItem(TOMBSTONE_KEY)).toContain('"rex"')
    expect(readDeletion()).toEqual({ ids: ['rex'], appointmentIds: ['a', 'b'] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tombstone.test.ts`
Expected: FAIL, impossibile risolvere `./tombstone`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/tombstone.ts`:

```ts
export const TOMBSTONE_KEY = 'groomly.deleted'

export type Tombstone = { ids: string[]; appointmentIds: string[] }

export function emptyTombstone(): Tombstone {
  return { ids: [], appointmentIds: [] }
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function readTombstone(raw: unknown): Tombstone {
  if (!raw || typeof raw !== 'object') return emptyTombstone()
  const record = raw as { ids?: unknown; appointmentIds?: unknown }
  return { ids: strings(record.ids), appointmentIds: strings(record.appointmentIds) }
}

function union(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])]
}

export function mergeTombstone(left: Tombstone, right: Tombstone): Tombstone {
  return {
    ids: union(left.ids, right.ids),
    appointmentIds: union(left.appointmentIds, right.appointmentIds),
  }
}

export function tombstoneRejectsDog(stone: Tombstone, id: string): boolean {
  return stone.ids.includes(id)
}

export function tombstoneRejectsAppointment(stone: Tombstone, id: string, dogId: string): boolean {
  return stone.appointmentIds.includes(id) || stone.ids.includes(dogId)
}

export function filterDogs<T extends { id: string }>(dogs: T[], stone: Tombstone): T[] {
  return dogs.filter((dog) => !tombstoneRejectsDog(stone, dog.id))
}

export function filterAppointments<T extends { id: string; dogId: string }>(items: T[], stone: Tombstone): T[] {
  return items.filter((item) => !tombstoneRejectsAppointment(stone, item.id, item.dogId))
}

export function readDeletion(): Tombstone {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    return raw ? readTombstone(JSON.parse(raw) as unknown) : emptyTombstone()
  } catch {
    return emptyTombstone()
  }
}

export function rememberDeletion(patch: Partial<Tombstone>): Tombstone {
  const next = mergeTombstone(readDeletion(), {
    ids: patch.ids ?? [],
    appointmentIds: patch.appointmentIds ?? [],
  })
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(next))
  return next
}
```

In `src/data/local/storage.ts` allargare la regex usata da `findCorruptGroomlyKey`:

```ts
const JSON_KEY = /^groomly\.(auth|deleted|users\..+\.(settings|services|dogs|appointments))$/
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tombstone.test.ts src/data/local/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tombstone.ts src/lib/tombstone.test.ts src/data/local/storage.ts
git commit -m "feat: il segno locale ricorda cani e appuntamenti eliminati"
```

---

### Task 2: Percorsi comuni e tema fuori dal salone

**Files:**
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `storage.rules`
- Modify: `src/data/firebase/client.ts` (solo la chiamata `.price(...)`)

**Interfaces:**
- Consumes: `storagePaths(uid)` già esportato da `firebaseMap.ts`. `backup` continua a ricevere il giorno.
- Produces: gli altri quattro percorsi non dipendono più dal nome del file né, tranne il backup, dall’uid. `settingsToDoc` non contiene `theme`.

- [ ] **Step 1: Write the failing test**

In `src/lib/firebaseMap.test.ts` sostituire le aspettative dei percorsi:

```ts
expect(storagePaths('u').profile('d')).toBe('salon/dogs/d/profile.jpg')
expect(storagePaths('u').gallery('d', 'p')).toBe('salon/dogs/d/gallery/p.jpg')
expect(storagePaths('u').work('a', 'p', 'prima')).toBe('salon/appointments/a/prima-p.jpg')
expect(storagePaths('u').price('file-id')).toBe('salon/pricelist/file-id')
expect(storagePaths('u').backup('2026-10-09')).toBe('users/u/backups/2026-10-09.json')
```

Nello stesso file, nel test `settingsToDoc omette snapshot...`, aggiungere:

```ts
expect(doc.theme).toBeUndefined()
```

`settingsFromDoc` può continuare a leggere un `theme` vecchio dentro l’oggetto `SettingsMain`: lo schermo non lo usa (Task 3 non lo applica; l’hook tiene già `readDeviceTheme`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/firebaseMap.test.ts`
Expected: FAIL sui percorsi `users/u/...` e su `doc.theme`.

- [ ] **Step 3: Write minimal implementation**

In `storagePaths`:

```ts
export function storagePaths(uid: string) {
  return {
    profile: (dogId: string) => `salon/dogs/${dogId}/profile.jpg`,
    gallery: (dogId: string, photoId: string) => `salon/dogs/${dogId}/gallery/${photoId}.jpg`,
    work: (appointmentId: string, photoId: string, kind: 'prima' | 'dopo' | 'altro') =>
      `salon/appointments/${appointmentId}/${kind}-${photoId}.jpg`,
    price: (fileId: string) => `salon/pricelist/${fileId}`,
    backup: (day: string) => `users/${uid}/backups/${day}.json`,
  }
}
```

Alla fine di `settingsToDoc`, prima del `return copy`:

```ts
delete copy.theme
```

In `src/data/firebase/client.ts`, `uploadPrice` usa l’id, non il nome:

```ts
return { ...file, dataUrl: await uploadDataUrl(storagePaths(uid).price(file.id), file.dataUrl) }
```

`storage.rules` diventa:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /salon/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    match /users/{uid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/firebaseMap.test.ts src/pages/SettingsPage.test.tsx`
Expected: PASS. Il test «il tema del salone non sostituisce quello del telefono» resta verde: `useSettings` applica solo `readDeviceTheme()`, non `settings.theme`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/firebase/client.ts storage.rules
git commit -m "fix: foto e listino stanno nel salone e il tema non viaggia con le impostazioni"
```

---

### Task 3: Copia una tantum e cancellazione che non resuscita

**Files:**
- Modify: `src/data/firebase/client.ts`
- Modify: `src/data/firebase/client.test.ts`
- Modify: `src/hooks/useDogs.ts`
- Modify: `src/hooks/useAppointments.ts`
- Modify: `src/pages/DogPage.tsx` (solo `confirmRemove`, se serve passare gli id)

**Interfaces:**
- Consumes: `readTombstone`, `mergeTombstone`, `rememberDeletion`, `readDeletion`, `tombstoneRejectsDog`, `tombstoneRejectsAppointment` da `src/lib/tombstone.ts`.
- Produces:
  - `removeDog(uid: string, id: string): Promise<void>` non cancella sotto `users/`. Scrive `{ ids, appointmentIds }` e cancella in `salon/shared` il cane e ogni appuntamento con quell’id o con quel `dogId`.
  - `removeAppointment(uid: string, id: string): Promise<void>` aggiunge l’id a `appointmentIds` e cancella solo `salon/shared/appointments/{id}`.
  - `saveDog` e `saveAppointment` ritornano senza `putDoc` se il segno rifiuta l’id.
  - `copyUserKind` copia solo un id assente dal salone e assente dal segno. Non chiama `deleteDoc` sulla cartella personale. Non cancella servizi del salone.
  - `restoreAccount` non chiama `syncMemberMedia`.

- [ ] **Step 1: Write the failing test**

In `src/data/firebase/client.test.ts` riscrivere i due test della cancellazione e quello delle foto.

Il test del cane eliminato, dopo `removeDog` e un secondo accesso con la cartella personale che contiene ancora Marcello, aspetta:

```ts
expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')).toMatchObject({
  ids: ['marcello'],
})
expect(fs.store.get('salon/shared/dogs')?.has('marcello')).toBe(false)
expect(fs.store.get('users/fb-1/dogs')?.has('marcello')).toBe(true)
expect(fs.deletes.some((path) => path.startsWith('users/'))).toBe(false)
```

Togliere la riga che rimette Marcello solo dopo aver cancellato il marker, se il test ricrea il documento personale: il documento personale non viene cancellato, quindi basta non aspettarne la scomparsa.

Il test dell’appuntamento non cancella a mano `vis-marcello` dal salone. Dopo `removeDog` e il secondo accesso:

```ts
expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')?.appointmentIds).toContain('vis-marcello')
expect(fs.store.get('salon/shared/appointments')?.has('vis-marcello')).toBe(false)
expect(fs.store.get('users/fb-1/appointments')?.has('vis-marcello')).toBe(true)
```

Aggiungere:

```ts
it('una copia personale non sostituisce un cane già nel salone', async () => {
  seedCloud('salon/shared/dogs', 'lulu')
  fs.store.get('salon/shared/dogs')?.set('lulu', { id: 'lulu', name: 'Lulu del salone', updatedAt: 1 })
  seedCloud('users/laura/dogs', 'lulu')
  fs.store.get('users/laura/dogs')?.set('lulu', {
    id: 'lulu', name: 'Lulu vecchia', updatedAt: 99,
    photo: 'https://files.example/lulu.jpg',
  })
  seedCloud('users/laura/dogs', 'nuovo')
  fs.store.get('users/laura/dogs')?.set('nuovo', { id: 'nuovo', name: 'Nuovo', updatedAt: 5 })
  authFns.signIn.mockResolvedValue({ user: firebaseUser('laura', 'laura@salone.it') })
  await client.signInEmail('laura@salone.it', 'segretissimo')
  expect(fs.store.get('salon/shared/dogs')?.get('lulu')).toMatchObject({ name: 'Lulu del salone' })
  expect(fs.store.get('salon/shared/dogs')?.get('lulu')?.photo).toBeUndefined()
  expect(fs.store.get('salon/shared/dogs')?.get('nuovo')).toMatchObject({ name: 'Nuovo' })
})

it('salvare un cane già eliminato non lo riscrive', async () => {
  seedCloud('salon/shared/meta', 'deleted-dogs')
  fs.store.get('salon/shared/meta')?.set('deleted-dogs', { ids: ['marcello'], appointmentIds: [] })
  authFns.signIn.mockResolvedValue({ user: firebaseUser() })
  await client.signInEmail('maria@salone.it', 'segretissimo')
  const local = createDog('fb-1', dogWrite('Marcello'))
  await client.saveDog('fb-1', { ...local, id: 'marcello' })
  expect(fs.store.get('salon/shared/dogs')?.has('marcello')).toBe(false)
})
```

Il test esistente «mostra a tutti le foto…» va sostituito da «una copia personale non sostituisce un cane già nel salone». Non deve più aspettarsi che la galleria `data:` della cartella personale venga fusa nel documento già presente.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: FAIL perché `removeDog` cancella ancora `users/...` e `saveDog` riscrive il cane.

- [ ] **Step 3: Write minimal implementation**

In `copyUserKind`, al posto del ramo che cancella il documento personale e di `shouldCopy`:

```ts
if (droppedDog) continue
const kept = copyableDoc(data)
const current = await readDoc(sharedPath(kind, item.id), true)
if (current) continue
await putDoc(sharedPath(kind, item.id), kept)
```

Cancellare l’intero blocco che, se `kind === 'services'`, elimina dal salone i servizi seme assenti dalla cartella personale.

In `restoreAccount`, togliere `await syncMemberMedia()`. La funzione `syncMemberMedia` può restare nel file se non è più chiamata; se il lint segnala unused, eliminarla insieme a `fillMissingMedia` se resta orfana.

`removeDog`:

```ts
export async function removeDog(_uid: string, id: string): Promise<void> {
  const cloud = readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs')))
  const merged = mergeTombstone(readDeletion(), cloud)
  const ids = merged.ids.includes(id) ? merged.ids : [...merged.ids, id]
  await putDoc(sharedPath('meta', 'deleted-dogs'), { ids, appointmentIds: merged.appointmentIds })
  const { collection, deleteDoc, doc, getDocs } = await import('firebase/firestore')
  const db = await database()
  await deleteDoc(doc(db, 'salon', 'shared', 'dogs', id))
  const snap = await getDocs(collection(db, 'salon', 'shared', 'appointments'))
  await Promise.all(snap.docs.filter((item) => {
    const dogId = (item.data() as { dogId?: unknown }).dogId
    return merged.appointmentIds.includes(item.id) || dogId === id
  }).map((item) => deleteDoc(item.ref)))
}
```

`removeAppointment` cancella solo `salon/shared/appointments/{id}` e unisce l’id in `appointmentIds` con la stessa lettura-unione-scrittura. Non tocca `users/{uid}`.

All’inizio di `saveDog` e `saveAppointment`:

```ts
const stone = mergeTombstone(readDeletion(), readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'))))
if (tombstoneRejectsDog(stone, dog.id)) return
```

Per l’appuntamento il controllo è `tombstoneRejectsAppointment(stone, appointment.id, appointment.dogId)`.

In `useDogs.remove`, prima della chiamata Firebase:

```ts
rememberDeletion({ ids: [id] })
```

In `useAppointments.dropDog`, prima di cancellare gli appuntamenti:

```ts
const ids = itemsRef.current.filter((item) => item.dogId === dogId).map((item) => item.id)
rememberDeletion({ appointmentIds: ids })
```

In `useAppointments.remove`:

```ts
rememberDeletion({ appointmentIds: [id] })
```

`confirmRemove` in `DogPage.tsx` resta `dropDog` poi `remove`: il primo scrive gli id degli appuntamenti, il secondo l’id del cane. Non invertire l’ordine.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/client.test.ts src/lib/tombstone.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/firebase/client.ts src/data/firebase/client.test.ts src/hooks/useDogs.ts src/hooks/useAppointments.ts src/pages/DogPage.tsx
git commit -m "fix: una copia vecchia non ricrea un cane eliminato né i suoi appuntamenti"
```

---

### Task 4: Apertura immediata e servizi non riseminati dalla cache

**Files:**
- Create: `src/lib/salonListen.ts`
- Create: `src/lib/salonListen.test.ts`
- Modify: `src/data/firebase/client.ts` (`listenDogs`, `listenAppointments`, `listenServices`, `listenSettings`)
- Modify: `src/hooks/useDogs.ts`
- Modify: `src/hooks/useAppointments.ts`

**Interfaces:**
- Consumes: `filterDogs`, `filterAppointments`, `readDeletion` da `tombstone.ts`. `dogsToLocalMap` e `appointmentsToLocalMap` già in `src/data/firebase/localSeed.ts`.
- Produces: `export function shouldSeedServices(empty: boolean, fromCache: boolean): boolean` — vero solo se l’elenco è vuoto e lo snapshot non arriva dalla cache.

- [ ] **Step 1: Write the failing test**

`src/lib/salonListen.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldSeedServices } from './salonListen'

describe('shouldSeedServices', () => {
  it('non semina uno snapshot vuoto della cache', () => {
    expect(shouldSeedServices(true, true)).toBe(false)
    expect(shouldSeedServices(false, false)).toBe(false)
    expect(shouldSeedServices(true, false)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/salonListen.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`src/lib/salonListen.ts`:

```ts
export function shouldSeedServices(empty: boolean, fromCache: boolean): boolean {
  return empty && !fromCache
}
```

In ciascuna `listenDogs`, `listenAppointments`, `listenServices`, `listenSettings`, togliere `await ensureShared(uid)` dall’inizio e mettere, prima di `onSnapshot`:

```ts
void ensureShared(uid).catch(() => notifySaveFailed())
```

In `listenServices`, il ramo `snap.empty` diventa:

```ts
if (snap.empty) {
  if (!shouldSeedServices(true, snap.metadata.fromCache) || seeding || cloudReplaceDepth > 0) return
  seeding = true
  void seedServices(uid).catch(() => {
    seeding = false
    notifySaveFailed()
  })
  return
}
```

Il callback di `onSnapshot` per i cani, prima di `onData`, filtra con `filterDogs(dogs, readDeletion())`. Gli appuntamenti usano `filterAppointments`. Poi `onData` riceve solo la lista filtrata.

In `useDogs`, quando il callback riceve `next`:

```ts
const visible = filterDogs(next, readDeletion())
writeJson(storageKeys.dogs(uid), dogsToLocalMap(visible))
setDogs((current) => mergePendingDogs(visible, current, uid))
```

Lo stato iniziale resta `mergePendingDogs(listDogs(uid), [], uid)` filtrato con `readDeletion()`, così il primo fotogramma non mostra un id già nel segno. Non chiamare `setDogs([])` all’avvio dell’effetto.

Stessa cosa in `useAppointments` con `filterAppointments`, `appointmentsToLocalMap` e `storageKeys.appointments`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/salonListen.test.ts src/data/firebase/client.test.ts src/pages/HomePage.test.tsx`
Expected: PASS. Se un test del client aspetta che `listenDogs` abbia già finito `ensureShared` prima di registrare lo snapshot, aggiornare quell’attesa: lo snapshot è registrato anche se la copia è ancora in corso. `fs.snapshots` contiene `salon/shared/dogs` subito dopo la risoluzione di `listenDogs`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/salonListen.ts src/lib/salonListen.test.ts src/data/firebase/client.ts src/hooks/useDogs.ts src/hooks/useAppointments.ts
git commit -m "fix: l'apertura mostra la copia locale e non risemina i servizi dalla cache"
```

---

### Task 5: Le cancellazioni partono prima degli altri salvataggi

**Files:**
- Modify: `src/data/firebase/taskQueue.ts`
- Modify: `src/data/firebase/taskQueue.test.ts`
- Modify: `src/data/firebase/client.ts` (il punto in cui `removeDog` / `removeAppointment` entrano in coda, se oggi partono fuori coda)

**Interfaces:**
- Consumes: `createUploadQueue` in `src/data/firebase/taskQueue.ts`.
- Produces: `enqueue(task: () => Promise<void>): void` e `enqueueFirst(task: () => Promise<void>): void` sullo stesso oggetto. Una sola pompa: finisce un task prima del successivo. `enqueueFirst` sta davanti a `enqueue`. Offline, nessun task parte e `onFail` non è chiamato. Al ritorno di `online`, riparte dalla cancellazione.

- [ ] **Step 1: Write the failing test**

Aggiungere in `taskQueue.test.ts`:

```ts
it('esegue la cancellazione prima di un salvataggio già in coda', async () => {
  const order: string[] = []
  let releaseSave: () => void = () => {}
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve })
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const queue = createUploadQueue(vi.fn())
  queue.enqueue(() => saveGate.then(() => { order.push('save') }))
  queue.enqueueFirst(() => { order.push('delete'); return Promise.resolve() })
  online.mockReturnValue(true)
  window.dispatchEvent(new Event('online'))
  await vi.waitFor(() => expect(order).toEqual(['delete']))
  releaseSave()
  await vi.waitFor(() => expect(order).toEqual(['delete', 'save']))
  online.mockRestore()
})
```

I due test già presenti restano: un rifiuto chiama `onFail` una volta; offline non chiama il task.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/taskQueue.test.ts`
Expected: FAIL, `enqueueFirst` non esiste.

- [ ] **Step 3: Write minimal implementation**

Sostituire il corpo di `createUploadQueue` con due liste, `first` e `rest`, e una pompa seriale. `enqueue` aggiunge a `rest`. `enqueueFirst` aggiunge a `first`. `pump` prende `first.shift() ?? rest.shift()`. Se `navigator.onLine === false`, rimette il task in testa alla sua lista, registra `online` una sola volta, e esce. Se il task rifiuta, chiama `onFail` e rimette quel task in testa alla sua lista. `pump` non si sovrappone: un flag `pumping` fa uscire la seconda chiamata.

In `client.ts`, le chiamate di rete di `removeDog` e `removeAppointment` passano da `enqueueFirst`. I salvataggi di cani, appuntamenti, servizi, listino e backup restano su `enqueue`. Il segno locale è già scritto dal Task 3 prima di entrare in coda: se `enqueueFirst` fallisce, `onFail` è `notifySaveFailed` e il task resta in `first`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/taskQueue.test.ts src/data/firebase/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/firebase/taskQueue.ts src/data/firebase/taskQueue.test.ts src/data/firebase/client.ts
git commit -m "fix: in coda la cancellazione parte prima del salvataggio"
```

---

### Task 6: Il listino si guarda, il PDF esce dall’app

**Files:**
- Create: `src/lib/pinchScale.ts`
- Create: `src/lib/pinchScale.test.ts`
- Create: `src/lib/openDocument.ts`
- Create: `src/pages/priceView.test.tsx`
- Modify: `src/pages/PriceViewPage.tsx`
- Modify: `src/data/firebase/client.ts` (`saveSettings`)

**Interfaces:**
- Consumes: `Browser` da `@capacitor/browser`, `Capacitor` da `@capacitor/core`, `PriceFile.mime` e `PriceFile.dataUrl`.
- Produces:
  - `export function pinchScale(startDistance: number, nextDistance: number, startScale: number): number` — risultato fra 1 e 4.
  - `export async function openPdf(url: string): Promise<void>` — rifiuta con `Error('File non apribile')` se l’url non inizia con `https://`; rifiuta con `Error('Nessuna app per aprire il PDF')` se l’apertura fallisce o, sul web, `window.open` ritorna `null`.

- [ ] **Step 1: Write the failing test**

`src/lib/pinchScale.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { pinchScale } from './pinchScale'

describe('pinchScale', () => {
  it('ingrandisce con le dita e non esce da 1–4', () => {
    expect(pinchScale(100, 200, 1)).toBe(2)
    expect(pinchScale(100, 0, 2)).toBe(2)
    expect(pinchScale(100, 900, 1)).toBe(4)
    expect(pinchScale(100, 10, 1)).toBe(1)
  })
})
```

`src/pages/priceView.test.tsx` usa `// @vitest-environment happy-dom`, `vi.mock('../lib/openDocument', () => ({ openPdf: vi.fn(() => Promise.resolve()) }))`, poi `createAccount`, e scrive il listino come `listino.test.tsx`:

```ts
function seedPrice(uid: string, priceList: PriceFile) {
  const settings = getSettings(uid)
  writeJson(storageKeys.settings(uid), { ...settings, priceList, priceListHistory: [] })
}
```

Quattro casi, ciascuno con `render(<App memory isDev={false} initialPath="/listino/vedi" />)` dopo `seedPrice`:

- JPEG con `dataUrl: 'https://files.example/listino.jpg'`: c’è `img` con quell’`src`, non c’è `iframe`.
- PDF con `dataUrl: 'https://files.example/listino.pdf'`: non c’è `iframe`; `openPdf` è stato chiamato con quell’url.
- `mime: 'application/zip'`: si legge «File non apribile» e `openPdf` non è chiamato.
- JPEG, poi `fireEvent.error` sull’`img`: si legge «File non apribile».

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pinchScale.test.ts src/pages/priceView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`pinchScale`: se `startDistance <= 0`, ritorna `startScale`. Altrimenti `Math.min(4, Math.max(1, startScale * (nextDistance / startDistance)))`.

`openDocument.ts`:

```ts
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export async function openPdf(url: string): Promise<void> {
  if (!url.startsWith('https://')) throw new Error('File non apribile')
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url })
      return
    }
    if (window.open(url, '_blank', 'noopener') == null) {
      throw new Error('Nessuna app per aprire il PDF')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Nessuna app per aprire il PDF') throw error
    throw new Error('Nessuna app per aprire il PDF')
  }
}
```

`PriceViewPage`: se manca il file, resta «Nessun file». Se `mime` inizia con `image/`, un bottone senza bordo contiene l’`img` a `width: 100%`. Due dita chiamano `pinchScale` e applicano `transform: scale(n)` con origine al centro. `onError` dell’immagine mostra «File non apribile». Se `mime === 'application/pdf'`, un effetto chiama `openPdf(file.dataUrl)` e la pagina mostra il nome del file, non un iframe. Se rifiuta, il testo del rifiuto («File non apribile» o «Nessuna app per aprire il PDF»). Ogni altro mime mostra «File non apribile».

In `saveSettings`, se `settingsHaveBinary(settings)`, caricare prima con `withUploadedPrices`. Solo se ogni `dataUrl` del risultato inizia con `https://`, chiamare `putDoc`. Se il caricamento lancia, non chiamare `putDoc`: il documento comune resta quello precedente. Il `catch` esistente della coda chiama `notifySaveFailed`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pinchScale.test.ts src/pages/priceView.test.tsx src/pages/listino.test.tsx src/data/firebase/client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pinchScale.ts src/lib/pinchScale.test.ts src/lib/openDocument.ts src/pages/PriceViewPage.tsx src/pages/priceView.test.tsx src/data/firebase/client.ts
git commit -m "feat: la foto del listino si ingrandisce e il PDF si apre nel lettore"
```

---

### Task 7: Il calendario non sposta più trascinando

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/appointments.test.tsx`

**Interfaces:**
- Consumes: `useOpenSheet`, già usato dal riquadro. Il foglio `/appuntamenti/{id}` e il pulsante Modifica non si toccano.
- Produces: `AppointmentBlock` non ha `onMove`. Il bottone ha `touchAction: 'pan-y'` e un `onClick` che chiama `openSheet(\`/appuntamenti/${appointment.id}\`)`.

- [ ] **Step 1: Write the failing test**

Sostituire il test `trascinare un blocco sposta, salva anche se si sovrappone e Annulla ripristina` con:

```ts
it('scorrere su un appuntamento non lo sposta e il tocco apre la scheda', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const rex = createDog(account.uid, dog('Rex'))
  const moved = createAppointment(account.uid, {
    dogId: rex.id,
    start: new Date(2026, 9, 5, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
  })
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
  const block = await screen.findByRole('button', { name: 'Apri Rex' })
  expect(block.style.touchAction).toBe('pan-y')
  fireEvent.pointerDown(block, { pointerId: 1, clientX: 20, clientY: 10 })
  fireEvent.pointerMove(block, { pointerId: 1, clientX: 20, clientY: 100 })
  fireEvent.pointerUp(block, { pointerId: 1, clientX: 20, clientY: 100 })
  const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
  expect(new Date(stored[moved.id].start).getHours()).toBe(9)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await user.click(block)
  expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
})
```

Il test `il rilascio del trascinamento su un’ora vuota non apre un nuovo appuntamento` diventa: lo stesso `pointerMove` sul riquadro non apre «Nuovo appuntamento». Se dopo questa modifica è coperto dal test qui sopra, cancellarlo invece di lasciarlo rosso.

Non toccare i test dello swipe del giorno, che scorrono la pagina e non il riquadro.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/appointments.test.tsx -t "scorrere su un appuntamento"`
Expected: FAIL, l’ora diventa 10 e compare «Spostato alle 10:00».

- [ ] **Step 3: Write minimal implementation**

In `AppointmentBlock` togliere `drag`, `moved`, `onPointerDown`, `onPointerMove`, `onPointerUp` e la prop `onMove`. `touchAction` del bottone diventa `'pan-y'`. `onClick` chiama solo `openSheet(\`/appuntamenti/${appointment.id}\`)`.

Togliere `onMove` da `DayColumn` e dal punto in `CalendarPage` che lo passa. Cancellare la funzione `onMove` che calcola i minuti e chiama `saveExisting`. Non cancellare `releaseSwipe` / `daySwipe`: quello cambia giorno, non l’ora di una visita.

Il riordino in `src/pages/ServicesPage.tsx` resta, `touchAction: 'none'` compreso.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/appointments.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/CalendarPage.tsx src/pages/appointments.test.tsx
git commit -m "fix: scorrere il calendario non sposta l'appuntamento"
```

---

### Task 8: Note sopra i prezzi e storico a linea del tempo

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Modify: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `format` e `IT_DATE` già importati in `DogPage.tsx`, `formatEuro`, `visitPrice`, `formatCompactDuration`, il foglio «Prezzo» già dentro `History`.
- Produces: in lettura, l’ordine del §6 della specifica. Il componente `History` è chiuso, ultimo blocco, e si apre solo se c’è almeno un completato.

- [ ] **Step 1: Write the failing test**

In `DogsPage.test.tsx`, un test che crea un account, un cane con `notes: 'Ha paura del phon'`, due appuntamenti completati dello stesso cane (il più recente con servizio «Bagno e tosatura», prezzo, `tools: ['Forbici']`, `actualDurationMin: 55`; l’altro solo «Bagno»), apre la scheda e aspetta:

```ts
const page = await screen.findByRole('heading', { name: 'Scheda' })
const root = page.closest('div')!.parentElement!
const text = root.textContent ?? ''
expect(text.indexOf('Note')).toBeLessThan(text.indexOf('Prezzi personalizzati'))
expect(text.indexOf('Prezzi personalizzati')).toBeLessThan(text.indexOf('Storico'))
expect(screen.getByText('2 visite')).toBeInTheDocument()
expect(screen.queryByText('Bagno e tosatura')).not.toBeInTheDocument()
await user.click(screen.getByRole('button', { name: 'Storico' }))
const opened = root.textContent ?? ''
expect(opened).toContain('Bagno e tosatura')
expect(opened).toMatch(/€.*Forbici.*55 min/)
expect(opened.indexOf('12 mar 2026')).toBeLessThan(opened.indexOf('28 feb 2026'))
```

I due `start` sono `new Date(2026, 2, 12, 9)` e `new Date(2026, 1, 28, 9)`. Dopo l’apertura, il testo «12 mar 2026» sta prima di «28 feb 2026» nel `textContent` della scheda. `createAppointment` assegna lui l’id: non serve passarlo.

Un secondo caso, cane senza completati: il bottone «Storico» non c’è, c’è il testo «Nessun trattamento», e un click su quella riga non fa comparire servizi.

Il modulo di modifica non si apre in questi test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/DogsPage.test.tsx -t "storico"`
Expected: FAIL, lo storico è aperto in mezzo alla scheda e le note stanno sotto.

- [ ] **Step 3: Write minimal implementation**

Nell’albero di lettura di `DogPage`, spostare il blocco `notesText` subito prima di `<CustomPrices`. Spostare `<History ...>` dopo la galleria e dopo «Ripristina».

`History` tiene `const [open, setOpen] = useState(false)`. La riga è un `button` con `aria-label` assente se non ci sono visite: in quel caso un `div` con titolo «Storico» e sotto «Nessun trattamento», senza `onClick`. Con visite, il bottone si chiama «Storico», sotto c’è «1 visita» o «N visite», `aria-expanded={open}`. Il click fa `setOpen((value) => !value)`.

Aperto, i completati ordinati da `b.start - a.start`, poi `b.id.localeCompare(a.id)`. Ogni visita è una riga con un pallino e, a destra, la data `d MMM yyyy`, i nomi dei servizi uniti da virgola, e una riga costruita così:

```ts
function historyDetail(item: Appointment): string {
  const parts = [formatEuro(visitPrice(item))]
  if (item.tools?.length) parts.push(item.tools.join(', '))
  if (item.actualDurationMin != null) parts.push(formatCompactDuration(item.actualDurationMin))
  if (item.products?.length) parts.push(item.products.join(', '))
  if (item.cutStyle) parts.push(item.cutStyle)
  return parts.join(' · ')
}
```

Le foto `prima` e `dopo` restano sotto, come oggi. La matita resta e apre lo stesso foglio «Prezzo». Togliere il pulsante «Tutti N» e il limite di 3: aperte, si vedono tutte.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/DogsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: le note stanno sopra i prezzi e lo storico si apre in linea del tempo"
```

---

### Task 9: Verifica dell’insieme

**Files:**
- Nessun file nuovo. Si gira la suite e si corregge solo un test reso rosso da questi task, senza allargare il comportamento.

**Interfaces:**
- Consumes: tutti i task precedenti.
- Produces: `npx vitest run` verde.

- [ ] **Step 1: Run the suite**

Run: `npx vitest run`
Expected: PASS. Se fallisce un test vecchio che pretende la copia delle foto dalla cartella personale, il trascinamento, o la cancellazione sotto `users/`, aggiornare il test alla specifica, non il codice.

- [ ] **Step 2: Commit, solo se lo step 1 ha modificato un test**

```bash
git add -u -- src
git commit -m "test: allinea i casi vecchi al salone unico"
```

Se la suite era già verde, non creare un commit vuoto.
