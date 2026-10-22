# Cancellazione profili, note aggiuntive, menu del più — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un profilo cane cancellato non torna, la scheda accetta note aggiuntive sotto l’avviso rosso, e il menu del più distingue la visita dal personale.

**Architecture:** La cancellazione nasconde subito il cane con un insieme di sessione e con `groomly.deleted.pending`, poi scrive un documento `deletedDogs/{id}` e cancella ogni copia del salone il cui percorso o campo `id` coincide. Le note aggiuntive sono `extraNotes` sul cane. Il menu cambia solo due titoli.

**Tech Stack:** TypeScript, React, Vitest, happy-dom, Firestore già in uso. Nessuna dipendenza nuova. Shell: PowerShell, un comando per volta, senza `&&`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-cancellazione-note-menu-design.md`. In caso di conflitto vince la spec.
- Roberto non applica `groomly.deleted` ai cani condivisi. Il test `Roberto non applica il segno locale ai cani condivisi mentre Laura continua ad applicarlo` resta verde.
- Non si cancellano documenti sotto `users/`. Il test `un cane eliminato non torna al prossimo accesso` continua a vedere `users/fb-1/dogs/marcello`.
- `criticalNote` e il campo singolo `notes` non cambiano ruolo. Le note nuove sono solo `extraNotes`.
- La parola in agenda è esattamente `altro`, minuscolo.
- I task 1–8 non alzano `APP_VERSION` e non pubblicano. Pubblica solo il task 9, a suite verde, da `1.1.71` a `1.1.72` (`versionCode` `10172`).
- `tsconfig` ha `noUnusedLocals` e `noUnusedParameters`. Prima di ogni commit: `npx tsc --noEmit`. Vitest non fa il controllo tipi.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.
- Un commit del task elenca solo i file di quel task.

---

### Task 1: Segni di sessione e pending

**Files:**
- Modify: `src/lib/tombstone.ts`
- Test: `src/lib/tombstone.test.ts`

**Interfaces:**
- Consumes: `Tombstone`, `readDeletion`, `rememberDeletion` già in `src/lib/tombstone.ts`.
- Produces:

```ts
export const PENDING_DELETE_KEY = 'groomly.deleted.pending'

export function noteSessionDogDeletion(id: string): void
export function sessionHidesDog(id: string): boolean
export function resetSessionDogDeletions(): void
export function rememberPendingDogDeletion(id: string): void
export function readPendingDogDeletions(): string[]
export function forgetPendingDogDeletion(id: string): void
export function dogHiddenNow(id: string): boolean
```

`dogHiddenNow` è vero se l’id non è vuoto e sta nella sessione oppure in `pending`. Non legge `groomly.deleted`.

- [ ] **Step 1: Scrivere i test che falliscono**

In `src/lib/tombstone.test.ts`, nello stesso stile degli altri `describe`, aggiungere:

```ts
describe('cancellazione cane in corso', () => {
  afterEach(() => {
    resetSessionDogDeletions()
    localStorage.removeItem(PENDING_DELETE_KEY)
  })

  it('la sessione e il pending nascondono, la pietra storica no', () => {
    rememberDeletion({ ids: ['storico'] })
    expect(dogHiddenNow('storico')).toBe(false)
    noteSessionDogDeletion('adesso')
    expect(sessionHidesDog('adesso')).toBe(true)
    expect(dogHiddenNow('adesso')).toBe(true)
    rememberPendingDogDeletion('coda')
    rememberPendingDogDeletion('coda')
    expect(readPendingDogDeletions()).toEqual(['coda'])
    expect(dogHiddenNow('coda')).toBe(true)
    forgetPendingDogDeletion('coda')
    expect(dogHiddenNow('coda')).toBe(false)
    expect(dogHiddenNow('')).toBe(false)
  })
})
```

Importare i simboli nuovi insieme a quelli già importati dal file.

- [ ] **Step 2: Eseguire il test e vederlo fallire**

`npx vitest run src/lib/tombstone.test.ts`

Atteso: FAIL, `noteSessionDogDeletion` non definito.

- [ ] **Step 3: Implementare**

In `src/lib/tombstone.ts`, dopo il blocco degli appuntamenti di sessione:

```ts
export const PENDING_DELETE_KEY = 'groomly.deleted.pending'

const sessionDogIds = new Set<string>()

export function noteSessionDogDeletion(id: string): void {
  if (id) sessionDogIds.add(id)
}

export function sessionHidesDog(id: string): boolean {
  return sessionDogIds.has(id)
}

export function resetSessionDogDeletions(): void {
  sessionDogIds.clear()
}

function readPendingIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETE_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    return strings(parsed)
  } catch {
    return []
  }
}

export function readPendingDogDeletions(): string[] {
  return readPendingIds()
}

export function rememberPendingDogDeletion(id: string): void {
  if (!id) return
  const next = [...new Set([...readPendingIds(), id])]
  localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(next))
}

export function forgetPendingDogDeletion(id: string): void {
  const next = readPendingIds().filter((item) => item !== id)
  if (next.length === 0) localStorage.removeItem(PENDING_DELETE_KEY)
  else localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(next))
}

export function dogHiddenNow(id: string): boolean {
  return id.length > 0 && (sessionDogIds.has(id) || readPendingIds().includes(id))
}
```

`strings` è già nel file.

- [ ] **Step 4: Eseguire il test e vederlo passare**

`npx vitest run src/lib/tombstone.test.ts`

Atteso: PASS.

- [ ] **Step 5: Tipi**

`npx tsc --noEmit`

- [ ] **Step 6: Commit**

```powershell
git add src/lib/tombstone.ts src/lib/tombstone.test.ts
git commit -m "fix: nascondi subito un cane in cancellazione"
```

---

### Task 2: Il cane si toglie anche se le visite non si puliscono

**Files:**
- Create: `src/lib/dogRemoval.ts`
- Create: `src/lib/dogRemoval.test.ts`
- Modify: `src/pages/DogPage.tsx` (`confirmRemove`, circa riga 1183)

**Interfaces:**
- Consumes: niente dal task 1.
- Produces:

```ts
export function finishDogRemoval(actions: { removeDog: () => boolean; dropVisits: () => boolean }): boolean
```

- [ ] **Step 1: Test**

`src/lib/dogRemoval.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { finishDogRemoval } from './dogRemoval'

describe('finishDogRemoval', () => {
  it('toglie il cane anche se le visite falliscono, e non tocca le visite se il cane resta', () => {
    const order: string[] = []
    expect(finishDogRemoval({
      removeDog: () => { order.push('cane'); return true },
      dropVisits: () => { order.push('visite'); return false },
    })).toBe(true)
    expect(order).toEqual(['cane', 'visite'])

    const skipped: string[] = []
    expect(finishDogRemoval({
      removeDog: () => false,
      dropVisits: () => { skipped.push('visite'); return true },
    })).toBe(false)
    expect(skipped).toEqual([])

    expect(finishDogRemoval({
      removeDog: () => true,
      dropVisits: () => { throw new Error('archivio') },
    })).toBe(true)
  })
})
```

- [ ] **Step 2: Vederlo fallire**

`npx vitest run src/lib/dogRemoval.test.ts`

Atteso: FAIL, modulo assente.

- [ ] **Step 3: Implementare**

`src/lib/dogRemoval.ts`:

```ts
export function finishDogRemoval(actions: { removeDog: () => boolean; dropVisits: () => boolean }): boolean {
  if (!actions.removeDog()) return false
  try {
    actions.dropVisits()
  } catch {
    // Le visite non riportano il cane in lista.
  }
  return true
}
```

In `confirmRemove` di `src/pages/DogPage.tsx` sostituire il corpo con:

```ts
function confirmRemove() {
  if (!dog) return
  setConfirmDelete(false)
  const dogId = dog.id
  const gone = finishDogRemoval({
    removeDog: () => api.remove(dogId),
    dropVisits: () => visits.dropDog(dogId),
  })
  if (!gone) {
    toast.show('Salvataggio non riuscito', 'plain')
    return
  }
  navigate('/animali')
}
```

Aggiungere l’import di `finishDogRemoval`.

- [ ] **Step 4: Test**

`npx vitest run src/lib/dogRemoval.test.ts src/pages/DogsPage.test.tsx`

Atteso: PASS. Il test esistente «spezza l’avviso e toglie il cane insieme agli appuntamenti» resta verde: le visite si puliscono ancora quando `dropDog` riesce.

- [ ] **Step 5: Tipi e commit**

`npx tsc --noEmit`

```powershell
git add src/lib/dogRemoval.ts src/lib/dogRemoval.test.ts src/pages/DogPage.tsx
git commit -m "fix: la cancellazione del cane non dipende dalle visite"
```

---

### Task 3: Copia cloud, id del percorso, documento deletedDogs

**Files:**
- Modify: `src/types/models.ts` (`Dog`)
- Modify: `src/lib/firebaseMap.ts` (`dogFromDoc`)
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/data/local/dogs.ts` (`StoredDog`, `toDomain`, `toStored`)
- Modify: `src/data/firebase/localSeed.ts` se copia i campi opzionali a mano
- Modify: `src/data/firebase/client.ts` (`removeDog`, `mergedDeletion`, `saveDog`, `copyUserKind`, `listenDogs`)
- Test: `src/data/firebase/client.test.ts`
- Test: `src/lib/firebaseMap.test.ts`

**Interfaces:**
- Consumes: `dogHiddenNow`, `readPendingDogDeletions`, `forgetPendingDogDeletion` dal task 1.
- Produces: `Dog.sourceDocId?: string`. `removeDog(uid: string, id: string, sourceDocId?: string): Promise<void>`. `dogFromDoc` valorizza `sourceDocId` solo quando il percorso è diverso dall’id del campo.

- [ ] **Step 1: Test sulla mappa**

In `src/lib/firebaseMap.test.ts`:

```ts
it('un percorso diverso dal campo id resta sul cane e non torna nel documento', () => {
  const dog = dogFromDoc('percorso-vecchio', { id: 'scheda-nuova', name: 'Luna', createdAt: 1, updatedAt: 1 })
  expect(dog.id).toBe('scheda-nuova')
  expect(dog.sourceDocId).toBe('percorso-vecchio')
  expect(dogToDoc(dog).sourceDocId).toBeUndefined()
  expect(dogFromDoc('stesso', { id: 'stesso', name: 'Luna', createdAt: 1, updatedAt: 1 }).sourceDocId).toBeUndefined()
})
```

- [ ] **Step 2: Vederlo fallire, poi mappare**

`npx vitest run src/lib/firebaseMap.test.ts`

In `Dog` di `src/types/models.ts` aggiungere `sourceDocId?: string` dopo `id`.

Rinominare il primo parametro di `dogFromDoc` da `id` a `pathId` e aggiornare i punti del corpo che oggi usano quel parametro come id di riserva (`text(data.id, pathId)`). Dopo aver costruito `dog`:

```ts
if (pathId && pathId !== dog.id) dog.sourceDocId = pathId
```

`dogToDoc` non va toccato: non elenca `sourceDocId`, quindi il test `toBeUndefined` passa.

In `StoredDog` e in `toDomain` / `toStored` di `src/data/local/dogs.ts` copiare `sourceDocId` se è una stringa non vuota, sullo stesso modello di `criticalNote`. Controllare `src/data/firebase/localSeed.ts`: se costruisce l’oggetto a mano, copiare anche lì.

- [ ] **Step 3: Test cloud del profilo vecchio**

In `src/data/firebase/client.test.ts`, vicino a «un cane eliminato non torna al prossimo accesso»:

```ts
it('un profilo vecchio con percorso diverso dal campo id non torna e la copia personale non lo riscrive', async () => {
  seedCloud('salon/shared/dogs', 'percorso-vecchio')
  fs.store.get('salon/shared/dogs')?.set('percorso-vecchio', { id: 'scheda-nuova', name: 'Luna', updatedAt: 1 })
  seedCloud('users/fb-1/dogs', 'percorso-vecchio')
  fs.store.get('users/fb-1/dogs')?.set('percorso-vecchio', { id: 'scheda-nuova', name: 'Luna vecchia', updatedAt: 9 })
  authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
  await client.signInEmail(LAURA, 'segretissimo')
  await client.removeDog('fb-1', 'scheda-nuova', 'percorso-vecchio')
  expect(fs.store.get('salon/shared/dogs')?.has('percorso-vecchio')).toBe(false)
  expect(fs.store.get('salon/shared/deletedDogs')?.has('scheda-nuova')).toBe(true)
  expect(fs.store.get('salon/shared/deletedDogs')?.has('percorso-vecchio')).toBe(true)
  expect(fs.store.get('users/fb-1/dogs')?.has('percorso-vecchio')).toBe(true)
  fs.store.get('salon/shared/meta')?.delete('restored-fb-1')
  await client.signOutEmail()
  await client.signInEmail(LAURA, 'segretissimo')
  expect(fs.store.get('salon/shared/dogs')?.has('percorso-vecchio')).toBe(false)
  const seen: { id: string }[][] = []
  await client.listenDogs('fb-1', (dogs) => { seen.push(dogs) })
  fs.emit('salon/shared/dogs', collectionSnap([
    { id: 'percorso-vecchio', data: { id: 'scheda-nuova', name: 'Luna' } },
  ], false))
  await vi.waitFor(() => expect(seen).toHaveLength(1))
  expect(seen[0]).toEqual([])
})
```

Adattare `seedCloud`, `collectionSnap`, `LAURA` e `firebaseUser` ai nomi già presenti nel file. Se il falso di Firestore non ha la mappa `deletedDogs` finché non si scrive, la scrittura di `setDoc` del client di test la crea da sola: è lo stesso meccanismo di `salon/shared/dogs`.

Aggiungere anche:

```ts
it('saveDog non riscrive un id presente in deletedDogs', async () => {
  seedCloud('salon/shared/deletedDogs', 'scheda-nuova')
  fs.store.get('salon/shared/deletedDogs')?.set('scheda-nuova', { at: 1 })
  authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
  await client.signInEmail(LAURA, 'segretissimo')
  const local = createDog('fb-1', dogWrite('Luna'))
  await client.saveDog('fb-1', { ...local, id: 'scheda-nuova' })
  expect(fs.store.get('salon/shared/dogs')?.has('scheda-nuova')).toBe(false)
})
```

`dogWrite` e `createDog` sono già usati in quel file. Se `createDog` non c’è, costruire il `Dog` minimo come negli altri test di `saveDog`.

- [ ] **Step 4: Vederli fallire**

`npx vitest run src/data/firebase/client.test.ts -t "profilo vecchio|deletedDogs"`

Atteso: FAIL.

- [ ] **Step 5: Lettura dei segni**

In `mergedDeletion` la pietra cloud che entra in `deletionForActiveSalon` è l’unione di `meta/deleted-dogs` e degli id in `deletedDogs`. Non saltare `deletionForActiveSalon`: Roberto deve continuare a ignorare `groomly.deleted`.

```ts
const legacy = readTombstone(await readDoc(salonDocPath('meta', 'deleted-dogs')))
const { collection, getDocs } = await loadFirestore()
const snap = await getDocs(collection(await database(), ...salonPath('deletedDogs')))
const cloud = mergeTombstone(legacy, { ids: snap.docs.map((item) => item.id), appointmentIds: [] })
const merged = deletionForActiveSalon(cloud)
```

Se `getDocs` o la lettura della pietra lanciano, il `catch` già presente restituisce `null` e lo snapshot non si pubblica. Gli id in `readPendingDogDeletions()` che stanno in `merged.ids` si tolgono con `forgetPendingDogDeletion`. Quelli assenti si ripassano a `removeDog` una volta per ascolto, non a ogni snapshot: un `Set` locale a `listenDogs` basta.

`saveDog` rifiuta il cane se `tombstoneRejectsDog` è vero per `dog.id` o per `dog.sourceDocId`, oppure se `dogHiddenNow` è vero per uno dei due. Lo stesso controllo va ripetuto nella callback `stillWanted` passata a `saveWithMedia`. Oggi `saveDog` non passa `stillWanted`: aggiungerla.

`copyUserKind`, nel ramo cani, calcola il campo id con `typeof data.id === 'string' ? data.id : ''` e salta il documento se la pietra rifiuta `item.id` o quel campo.

- [ ] **Step 6: removeDog**

Sostituire il corpo del task dentro `removeDog` in modo che:

1. Gli id da segnare siano solo `id` e, se diverso e non vuoto, `sourceDocId`. Non rileggere `merged.ids` per rimandarlo tutto a `arrayUnion`.
2. Per ciascun id, `setDoc` su `salonDocPath('deletedDogs', id)` con `{ at: Date.now() }`.
3. `getDocs` della collezione cani. Cancellare ogni documento il cui `item.id`, o il cui `data().id` stringa, è uno degli id da segnare.
4. `writeDeletionSign` solo con quegli id cane e con gli id visita nuovi (quelli di `doomed` non già in `merged.appointmentIds`). Le visite si cancellano dopo. Un errore sulle visite non deve impedire i passi 2 e 3: i passi 2 e 3 stanno prima, e il `catch` del task non rimette i documenti cane. Avvolgere solo il `Promise.all` delle visite in `try/catch` vuoto.
5. Non chiamare `deleteDoc` su percorsi `users/`.

La firma diventa `export async function removeDog(_uid: string, id: string, sourceDocId?: string)`.

- [ ] **Step 7: Test cloud e regressione**

`npx vitest run src/data/firebase/client.test.ts src/lib/firebaseMap.test.ts`

Atteso: PASS, incluso «Roberto non applica il segno locale» e «un cane eliminato non torna al prossimo accesso».

- [ ] **Step 8: Tipi e commit**

`npx tsc --noEmit`

```powershell
git add src/types/models.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/data/local/dogs.ts src/data/firebase/localSeed.ts src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "fix: un profilo vecchio cancellato non viene ricopiato"
```

Se `localSeed.ts` non è cambiato, non aggiungerlo.

---

### Task 4: Lo snapshot non rimette il cane in lista

**Files:**
- Modify: `src/hooks/useDogs.ts`
- Test: `src/hooks/useCloudOnlyData.test.tsx`

**Interfaces:**
- Consumes: `dogHiddenNow`, `noteSessionDogDeletion`, `rememberPendingDogDeletion`, `Dog.sourceDocId`, `removeDog(uid, id, sourceDocId?)`.
- Produces: `useDogs().remove` nasconde il cane prima del cloud e non lo riammette dalle fusioni.

- [ ] **Step 1: Test di Roberto**

In `src/hooks/useCloudOnlyData.test.tsx`, con l’account Roberto già nel mock:

```ts
it('Roberto non rivede un cane appena cancellato se lo snapshot lo rimanda', async () => {
  mocks.account = ROBERTO
  const dog = { ...createDog('rob-uid', dogWrite('Luna')), sourceDocId: 'percorso-vecchio' }
  const { result } = renderHook(() => useDogs('rob-uid'))
  await waitFor(() => expect(mocks.dogListener).not.toBeNull())
  act(() => { mocks.dogListener?.([dog], false) })
  await waitFor(() => expect(result.current.dogs.map((item) => item.id)).toEqual([dog.id]))
  act(() => { expect(result.current.remove(dog.id)).toBe(true) })
  expect(result.current.dogs).toEqual([])
  act(() => { mocks.dogListener?.([dog], false) })
  expect(result.current.dogs).toEqual([])
  expect(mocks.saveDog).not.toHaveBeenCalled()
  await waitFor(() => expect(mocks.removeDog).toHaveBeenCalledWith('rob-uid', dog.id, 'percorso-vecchio'))
})
```

`createDog` scrive in locale. Il test deve partire da lista vuota: chiamare `remove` solo dopo che lo snapshot ha messo il cane. Se `remove` lancia perché la mappa locale non ha l’id, il hook va corretto nel passo 3 seminando da `dogsRef` prima di `deleteDog`, che è già il comportamento di `withLocalKey`. Se il test fallisce per un altro cane in lista, filtrare gli id.

Importare `act` se manca. Resettare `mocks.saveDog.mockClear()` e `resetSessionDogDeletions` nel `beforeEach` insieme a `resetPending` se il file già pulisce lo storage. Aggiungere `localStorage.removeItem('groomly.deleted.pending')` nel `beforeEach`.

- [ ] **Step 2: Vederlo fallire**

`npx vitest run src/hooks/useCloudOnlyData.test.tsx -t "non rivede"`

Atteso: FAIL, lo snapshot rimette Luna oppure `removeDog` è chiamato senza `sourceDocId`.

- [ ] **Step 3: Filtro**

In `useDogs.ts` importare `dogHiddenNow`, `noteSessionDogDeletion`, `rememberPendingDogDeletion`.

```ts
function hideDeleted<T extends { id: string; sourceDocId?: string }>(dogs: T[]): T[] {
  return dogs.filter((dog) => !dogHiddenNow(dog.id) && !dogHiddenNow(dog.sourceDocId ?? ''))
}
```

Applicare `hideDeleted` al risultato di ogni `setDogs` che nasce da snapshot, da `mergePendingDogs` o da `listDogs`, anche nel ramo `cloudOnly`. Applicarlo prima di `writeJson`. Non applicare `readDeletion()` a Roberto: `hideDeleted` guarda solo sessione e pending.

All’inizio di `remove`, prima di `deleteDog`:

```ts
noteSessionDogDeletion(id)
rememberPendingDogDeletion(id)
const sourceDocId = dogsRef.current.find((dog) => dog.id === id)?.sourceDocId
```

La chiamata cloud diventa `mod.removeDog(uid, id, sourceDocId)`.

- [ ] **Step 4: Test**

`npx vitest run src/hooks/useCloudOnlyData.test.tsx`

Atteso: PASS, inclusi i test già presenti sul personale e sulla cache.

- [ ] **Step 5: Tipi e commit**

`npx tsc --noEmit`

```powershell
git add src/hooks/useDogs.ts src/hooks/useCloudOnlyData.test.tsx
git commit -m "fix: lo snapshot non riporta un cane appena cancellato"
```

---

### Task 5: Modello extraNotes

**Files:**
- Create: `src/lib/dogNotes.ts`
- Create: `src/lib/dogNotes.test.ts`
- Modify: `src/types/models.ts`
- Modify: `src/data/local/dogs.ts`
- Modify: `src/data/local/dogs.test.ts`
- Modify: `src/lib/firebaseMap.ts`
- Modify: `src/lib/firebaseMap.test.ts`
- Modify: `src/data/firebase/localSeed.ts` solo se copia i campi a mano
- Modify: `src/pages/DogPage.tsx` (`writeFromScreen`, `dogToWrite`)
- Modify: `src/lib/registroModello.ts`
- Test: `src/lib/registroModello.test.ts`

**Interfaces:**
- Produces:

```ts
export interface DogExtraNote { id: string; text: string; createdAt: Date }
export const EXTRA_NOTE_MAX = 240
export const EXTRA_NOTE_LIMIT = 40
export function cleanExtraNote(text: string): string | null
export function hasExtraNotes(notes: readonly { text: string }[] | undefined): boolean
```

`extraNotes?: DogExtraNote[]` su `DogDraft`.

- [ ] **Step 1: Test puri**

`src/lib/dogNotes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EXTRA_NOTE_LIMIT, EXTRA_NOTE_MAX, cleanExtraNote, hasExtraNotes } from './dogNotes'

describe('cleanExtraNote', () => {
  it('tiene 240 caratteri, scarta il vuoto e il 241', () => {
    expect(cleanExtraNote('  si muove  ')).toBe('si muove')
    expect(cleanExtraNote('   ')).toBeNull()
    expect(cleanExtraNote('a'.repeat(EXTRA_NOTE_MAX))).toHaveLength(EXTRA_NOTE_MAX)
    expect(cleanExtraNote('a'.repeat(EXTRA_NOTE_MAX + 1))).toBeNull()
    expect(EXTRA_NOTE_LIMIT).toBe(40)
  })

  it('hasExtraNotes ignora il vuoto', () => {
    expect(hasExtraNotes(undefined)).toBe(false)
    expect(hasExtraNotes([{ text: '  ' }])).toBe(false)
    expect(hasExtraNotes([{ text: 'in piedi' }])).toBe(true)
  })
})
```

- [ ] **Step 2: Implementare `dogNotes.ts`**

```ts
export const EXTRA_NOTE_MAX = 240
export const EXTRA_NOTE_LIMIT = 40

export function cleanExtraNote(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > EXTRA_NOTE_MAX) return null
  return trimmed
}

export function hasExtraNotes(notes: readonly { text: string }[] | undefined): boolean {
  return (notes ?? []).some((item) => item.text.trim().length > 0)
}
```

- [ ] **Step 3: Giro completo locale e Firestore**

`DogExtraNote` in `src/types/models.ts`. `extraNotes?` su `DogDraft`.

In `toStored` salvare `{ id, text, createdAt: date.toISOString() }`. In `toDomain` rileggere solo righe con id stringa, testo stringa non vuoto e data parsabile. Ordine conservato.

`updateDog`: se `input.extraNotes` è `undefined`, assegnare al write una copia di `previous.extraNotes` prima di `dogFromWrite`. Se è un array, `dogFromWrite` lo copia così com’è, anche vuoto.

Test in `src/data/local/dogs.test.ts`:

```ts
it('updateDog tiene le note aggiuntive se il write non le cita, e le toglie con un array vuoto', () => {
  const created = createDog('uid-1', { ...write(), extraNotes: [{ id: 'n1', text: 'si muove', createdAt: new Date('2026-10-01T00:00:00.000Z') }] })
  const kept = updateDog('uid-1', created.id, write())
  expect(kept.extraNotes?.map((item) => item.text)).toEqual(['si muove'])
  const cleared = updateDog('uid-1', created.id, { ...write(), extraNotes: [] })
  expect(cleared.extraNotes ?? []).toEqual([])
})
```

`write()` è l’helper già nel file. Se il suo tipo non accetta `extraNotes`, è perché il task non ha ancora esteso `DogWrite`: lo accetta appena `DogDraft` ha il campo.

In `dogToDoc`, `extraNotes` diventa `[{ id, text, createdAt: dateToMillis }]`. In `dogFromDoc` si leggono solo gli oggetti con id, testo e millisecondi finiti. Test tondo in `firebaseMap.test.ts`: un cane con una nota torna con lo stesso testo e `sourceDocId` assente.

`writeFromScreen` e `dogToWrite` copiano `dog.extraNotes` con `{ ...item, createdAt: new Date(item.createdAt) }`.

In `registroModello.ts`, dove oggi si uniscono `criticalNote` e `notes`, aggiungere dopo i testi di `extraNotes` separati da `\n`. Test in `registroModello.test.ts`: un cane con avviso `Mordace`, notes `vecchia` e una extra `in piedi` produce una cella che contiene le tre righe in quest’ordine.

- [ ] **Step 4: Test e commit**

`npx vitest run src/lib/dogNotes.test.ts src/data/local/dogs.test.ts src/lib/firebaseMap.test.ts src/lib/registroModello.test.ts`

`npx tsc --noEmit`

```powershell
git add src/lib/dogNotes.ts src/lib/dogNotes.test.ts src/types/models.ts src/data/local/dogs.ts src/data/local/dogs.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/pages/DogPage.tsx src/lib/registroModello.ts src/lib/registroModello.test.ts
git commit -m "feat: note aggiuntive sul cane, distinte dall'avviso rosso"
```

Aggiungere `localSeed.ts` solo se è stato modificato.

---

### Task 6: Aggiungi nota e Togli sulla scheda

**Files:**
- Modify: `src/pages/DogPage.tsx`
- Test: `src/pages/DogsPage.test.tsx`

**Interfaces:**
- Consumes: `cleanExtraNote`, `EXTRA_NOTE_LIMIT`, `Dog.extraNotes`, `dogToWrite`, `api.saveExisting`.

- [ ] **Step 1: Test di scheda**

In `src/pages/DogsPage.test.tsx`:

```ts
it('sotto l’avviso rosso si aggiunge una nota e si toglie, senza aprire Modifica', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const created = createDog(account.uid, write({ name: 'Bobi', criticalNote: 'Mordace' }))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
  expect(await screen.findByText('Mordace')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Aggiungi nota' }))
  const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
  await user.type(within(dialog).getByLabelText('Nota'), 'Si muove tanto')
  await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
  expect(await screen.findByText('Si muove tanto')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Modifica' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Togli nota: Si muove tanto' }))
  await waitFor(() => expect(screen.queryByText('Si muove tanto')).not.toBeInTheDocument())
  expect(screen.getByText('Mordace')).toBeInTheDocument()
})
```

Il pulsante Modifica in lettura esiste già: il test verifica che il salvataggio della nota non entri nel form. Se il nome accessibile di Modifica è diverso, usare quello già asserito negli altri test del file.

- [ ] **Step 2: Vederlo fallire**

`npx vitest run src/pages/DogsPage.test.tsx -t "sotto l’avviso"`

Atteso: FAIL, pulsante assente.

- [ ] **Step 3: UI**

Nella vista lettura di `DogPage`, subito dopo `<CriticalNote>`, e prima del blocco `notesText`:

- ordinare `dog.extraNotes` per `createdAt` poi `id`;
- per ciascuna, una `Card` con il testo e un bottone «Togli»;
- sotto, un `button` «Aggiungi nota». A 40 note è `disabled` e sotto, in `var(--tx3)`, c’è «Troppe note».

Stato locale `noteOpen` e `noteDraft`. Dialogo titolo «Aggiungi nota». `textarea` con `aria-label="Nota"` e `maxLength={240}`. «Annulla» chiude e svuota. «Salva» chiama `cleanExtraNote`. Se `null`, non chiude. Se stringa, `dogToWrite` più `extraNotes` con la riga nuova `{ id: crypto.randomUUID(), text, createdAt: new Date() }` e le precedenti. `api.saveExisting`. Se falso, toast «Salvataggio non riuscito». Se vero, chiudere il dialogo. Quando le note sono già 40, il pulsante è `disabled` e sotto, in `var(--tx3)`, c’è il testo «Troppe note».

Togli: stesso `saveExisting` con l’elenco filtrato. Non chiedere conferma. `aria-label` è `` `Togli nota: ${text}` ``.

Il blocco sta solo nel ramo lettura, dopo `CriticalNote` e prima del blocco `notesText`. Nel ramo Modifica non c’è.

- [ ] **Step 4: Test e commit**

`npx vitest run src/pages/DogsPage.test.tsx`

`npx tsc --noEmit`

```powershell
git add src/pages/DogPage.tsx src/pages/DogsPage.test.tsx
git commit -m "feat: aggiungi nota dalla scheda senza aprire Modifica"
```

---

### Task 7: La parola altro

**Files:**
- Create: `src/components/domain/NoteAltro.tsx`
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/calendar/WeekRows.tsx`
- Modify: `src/components/domain/AppointmentRow.tsx`
- Modify: `src/pages/AppointmentPage.tsx`
- Modify: `src/pages/AppointmentForm.tsx`
- Test: `src/pages/appointments.test.tsx`
- Test: `src/components/calendar/WeekRows.test.tsx`
- Test: `src/pages/HomePage.test.tsx` o il test di Home che già rende una visita con avviso, se la riga di Home passa da `AppointmentRow`

**Interfaces:**
- Consumes: `hasExtraNotes`.
- Produces:

```tsx
export function NoteAltro({ note, altro, muted }: { note: string; altro: boolean; muted?: boolean }): JSX.Element | null
```

`null` se `note` è vuoto e `altro` è falso. Altrimenti una riga flex: il `note` in `var(--bad)` (o `var(--tx3)` se `muted`), con ellissi; `altro` in `var(--tx2)`, peso 700, `flex: none`, testo `altro`.

- [ ] **Step 1: Test agenda**

Nel test di `appointments.test.tsx` che crea Luna con `criticalNote: 'Sempre pieno di nodi'`, estendere il cane con

```ts
extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }]
```

e asserire `screen.getByText('altro')`. Asserire anche `expect(screen.queryByText('Pelo cortissimo')).not.toBeInTheDocument()` nella vista calendario. La scheda non è aperta.

In `WeekRows.test.tsx`, sul cane che ha già `criticalNote`, passare `extraNotes` con un testo e asserire `altro` dentro la card. Il testo della nota extra non è nella card.

In Home, la riga di oggi usa `AppointmentRow`. Aggiungere `extraNotes` al cane di un test di Home già esistente che mostra un appuntamento, e asserire `altro` accanto al nome.

- [ ] **Step 2: Vederli fallire**

`npx vitest run src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx -t "altro"`

Se il filtro `-t` non prende i test vecchi, eseguire i file interi dopo aver aggiunto `getByText('altro')` e vedere il FAIL su quel testo.

- [ ] **Step 3: Collegare**

`NoteAltro` come nell’interfaccia. `USER_TEXT` si importa da `src/theme/text`.

Sostituire le stampe del titolo rosso in:

- `CalendarPage.tsx` `AppointmentBlock`, tutti i rami che oggi stampano `note` (`giorno`, settimana non compatta, compatta);
- `WeekRows.tsx`, lo span del `title`;
- `AppointmentPage.tsx` e `AppointmentForm.tsx`, il paragrafo rosso. Il paragrafo resta il contenitore; dentro, `NoteAltro` con il testo intero dell’avviso, non solo la parte prima del punto. In agenda si continua a passare `splitCritical(...).title`. Nel foglio e nel modulo si passa l’avviso intero, come oggi.

Nella vista compatta, accanto a `TriangleAlert`, renderizzare `NoteAltro` con `note=""` e `altro` vero quando ci sono note aggiuntive. L’icona resta.

In `AppointmentRow`, dopo il nome, se `hasExtraNotes(dog?.extraNotes)`, uno span `altro` con le stesse regole di colore e peso. Non si stampa il testo rosso: quella riga non lo stampava.

In `dayScaleItems` di `CalendarPage.tsx`, `hasNote` diventa `Boolean(note) || hasExtraNotes(dog?.extraNotes)`.

- [ ] **Step 4: Test e commit**

`npx vitest run src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx src/pages/AppointmentPage.test.tsx`

`npx tsc --noEmit`

```powershell
git add src/components/domain/NoteAltro.tsx src/pages/CalendarPage.tsx src/components/calendar/WeekRows.tsx src/components/domain/AppointmentRow.tsx src/pages/AppointmentPage.tsx src/pages/AppointmentForm.tsx src/pages/appointments.test.tsx src/components/calendar/WeekRows.test.tsx src/pages/HomePage.test.tsx
git commit -m "feat: altro accanto all'avviso rosso quando ci sono altre note"
```

---

### Task 8: Titoli del menu del più

**Files:**
- Modify: `src/pages/ShellFrame.tsx`
- Test: `src/pages/shellPages.test.tsx`

**Interfaces:**
- Consumes: niente dei task precedenti. Le destinazioni non cambiano.

- [ ] **Step 1: Aggiornare il test esistente**

In `shellPages.test.tsx` le `aria-label` diventano:

```ts
const pelosetto = within(dialog).getByRole('button', { name: 'Fissa appuntamento pelosetto, metti un cane in agenda' })
const personale = within(dialog).getByRole('button', { name: 'Appuntamento personale, un impegno fuori dal salone' })
```

Chiusura e nuovo cane restano con le label di oggi. Aggiungere:

```ts
expect(pelosetto).toHaveTextContent('Fissa appuntamento pelosetto')
expect(pelosetto).toHaveTextContent('Metti un cane in agenda')
expect(personale).toHaveTextContent('Appuntamento personale')
expect(personale).toHaveTextContent('Un impegno fuori dal salone')
expect(chiusura).toHaveTextContent('Chiusura')
expect(dog).toHaveTextContent('Nuovo cane')
```

- [ ] **Step 2: Vederlo fallire**

`npx vitest run src/pages/shellPages.test.tsx`

Atteso: FAIL sulle label nuove.

- [ ] **Step 3: Titoli**

In `ShellFrame.tsx` cambiare solo i due titoli in grassetto e le due `aria-label`, come la tabella del §4 della spec. Sottotitoli, icone e `onClick` invariati. Sullo span del titolo aggiungere `overflowWrap: 'anywhere'` così la frase va a capo senza uscire dalla riga.

- [ ] **Step 4: Test e commit**

`npx vitest run src/pages/shellPages.test.tsx`

`npx tsc --noEmit`

```powershell
git add src/pages/ShellFrame.tsx src/pages/shellPages.test.tsx
git commit -m "fix: il menu del più distingue la visita dal personale"
```

---

### Task 9: Pubblicazione 1.1.72

**Files:**
- Modify: `src/lib/appVersion.ts`
- Modify: `package.json`
- Modify: `android/app/build.gradle`
- Modify: `hosting/release.json`

**Interfaces:**
- Consumes: i task 1–8 già committati e verdi.

- [ ] **Step 1: Suite**

`npm test`

Atteso: PASS. Se fallisce, non si alza la versione.

- [ ] **Step 2: Versione**

`APP_VERSION`, `package.json` `version`, `versionName` e `hosting/release.json` `version` diventano `1.1.72`. `versionCode` diventa `10172`. `url` diventa `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.72/groomly.apk`. `notes` di `release.json`:

```json
["Un profilo cancellato non torna. Sotto l'avviso rosso si aggiungono note, e il menu del più distingue la visita dal personale."]
```

- [ ] **Step 3: APK**

`npm run build`

`npx cap sync android`

Nella cartella `android`: `.\gradlew assembleDebug`

Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del repo. Non metterlo in `hosting/` e non aggiungerlo al commit.

- [ ] **Step 4: Commit, push, release, Firebase**

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "chore: pubblica 1.1.72"
git push origin HEAD
gh release create v1.1.72 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.72" --notes "Un profilo cancellato non torna. Sotto l'avviso rosso si aggiungono note, e il menu del più distingue la visita dal personale."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook.

Le regole Firestore non cambiano: `deletedDogs` rientra in `salon/shared/{kind}/{id}`. Il deploy delle regole è comunque quello previsto a ogni pubblicazione.
