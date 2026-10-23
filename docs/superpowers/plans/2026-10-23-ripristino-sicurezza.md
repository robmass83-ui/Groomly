# Copia di sicurezza prima del ripristino — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prima di ogni ripristino l'app tiene una copia dello stato attuale, e **Annulla ripristino** la rimette.

**Architecture:** I byte da poter rimettere stanno nella collezione Firestore `sicurezza`. Il documento `meta/ripristino-sicurezza` tiene bundle, codici e id assenti. In locale la copia è una chiave `localStorage`. La pagina salva la copia una volta per foglio, poi esegue il ripristino già presente.

**Tech Stack:** React, Vitest, happy-dom, Firestore già presente. Nessuna dipendenza nuova.

## Global Constraints

- Specifica: `docs/superpowers/specs/2026-10-23-ripristino-sicurezza-design.md`. Se un testo diverge, vince la specifica.
- Non modificare `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts`, `src/data/firebase/firebaseEnv.test.ts`, `src/lib/backupZip.ts`, `src/lib/backupCompleto.ts`, `src/lib/registroXlsx.ts`, `firestore.rules`.
- Non modificare `replaceCloudData`, `restoreBackup`, `buildBackup`, `scriviCodiciCane`, `impostazioniRipristino`, `backupZip`, `backupCompleto`.
- Il foglio di conferma, il chip, Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo non cambiano comportamento. Il ripristino non aggiorna `backup.lastAt`.
- `accept` resta `application/json,.json,application/zip,.zip`.
- Lavorare in `D:\Groomly-worktrees\ripristino-sicurezza` sul ramo `feat/ripristino-sicurezza`. Non committare da `D:\Groomly`. Non `git add -A`. Non rimuovere gli altri worktree. Non pushare `origin/main`.
- I quattro file di versione non si alzano prima del task 4. `APP_VERSION` di partenza è `1.1.76`.
- Nessuna dipendenza nuova. I percorsi di salone escono da `salonRootPath()`.

---

### Task 1: leggere, scrivere e cancellare i file in una collezione

**Files:**
- Modify: `src/data/firebase/ripristinoFile.ts`
- Modify: `src/data/firebase/ripristinoFile.test.ts`

**Interfaces:**
- Consumes: `FileRipristino`, `FirestoreApi`, `salonRootPath`, `splitChunks`, `ricomponiFile`, `FILE_MAX_BYTES`.
- Produces:
  - `applicaFileRipristino(files, fs, db, collezione = 'files')`
  - `leggiFileAttuali(ids, fs, db, collezione = 'files'): Promise<{ presenti: FileRipristino[]; assenti: string[] }>`
  - `eliminaFileRipristino(ids, fs, db, collezione = 'files'): Promise<void>`
  - `scriviFileRipristino` resta su `files`.

- [ ] **Step 1: Write the failing test**

Nel describe già presente, aggiungi questi test. `fakeFirestore`, `foto` e `FakeBytes` esistono già nel file.

```ts
it('scrive la copia nella collezione sicurezza e non in files', async () => {
  const { api, docs } = fakeFirestore()
  await applicaFileRipristino([foto(new Uint8Array([4]))], api, {}, 'sicurezza')
  expect(docs.has('salon/shared/sicurezza/f1')).toBe(true)
  expect(docs.has('salon/shared/files/f1')).toBe(false)
})

it('legge i byte attuali e segna assente un id senza documento', async () => {
  const { api, docs } = fakeFirestore()
  docs.set('salon/shared/files/f1', {
    kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 2, chunkCount: 0,
    createdAt: 1000, createdBy: 'u1',
  })
  docs.set('salon/shared/files/f1/full/data', { dati: new FakeBytes(new Uint8Array([4, 5])) })
  const letti = await leggiFileAttuali(['f1', 'manca'], api, {})
  expect(letti.assenti).toEqual(['manca'])
  expect(letti.presenti).toEqual([foto(new Uint8Array([4, 5]), { createdAt: 1000 })])
})

it('cancella il documento, full/data e i chunk fino all indice 63', async () => {
  const { api, docs } = fakeFirestore()
  docs.set('salon/shared/files/f9', { chunkCount: 65 })
  docs.set('salon/shared/files/f9/full/data', { dati: new FakeBytes(new Uint8Array([1])) })
  for (let index = 0; index < 65; index += 1) docs.set(`salon/shared/files/f9/chunks/${index}`, { dati: new FakeBytes(new Uint8Array([1])) })
  await eliminaFileRipristino(['f9'], api, {})
  expect(docs.has('salon/shared/files/f9')).toBe(false)
  expect(docs.has('salon/shared/files/f9/full/data')).toBe(false)
  expect(docs.has('salon/shared/files/f9/chunks/63')).toBe(false)
  expect(docs.has('salon/shared/files/f9/chunks/64')).toBe(true)
})
```

Importa `leggiFileAttuali` e `eliminaFileRipristino`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/ripristinoFile.test.ts`

Expected: FAIL. Le funzioni non esistono, oppure `applicaFileRipristino` non accetta la collezione.

- [ ] **Step 3: Write minimal implementation**

In `applicaFileRipristino` aggiungi il quarto parametro `collezione = 'files'` e usalo al posto della stringa fissa `files` dentro `at`.

Aggiungi le due funzioni. `leggiFileAttuali` usa `ricomponiFile`. Un documento assente mette l'id in `assenti`. Byte illeggibili, lunghezza diversa da `byteSize` quando `byteSize` è un numero, o lunghezza sopra `FILE_MAX_BYTES` lanciano `Error('Copia di sicurezza non riuscita')`. `createdAt` numero finito si copia; una stringa data si converte con `Date.parse`; altrimenti `0`. `kind` resta `foto` o `file`; se manca, `image/` diventa `foto`.

`eliminaFileRipristino` cancella `full/data`, i chunk da `0` a `min(chunkCount, 64) - 1`, e il documento principale. `chunkCount` assente vale `0`.

`scriviFileRipristino` continua a chiamare `applicaFileRipristino` senza il quarto argomento.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/ripristinoFile.test.ts`

Expected: PASS. I test già presenti della collezione `files` restano verdi.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/firebase/ripristinoFile.ts src/data/firebase/ripristinoFile.test.ts
git commit -m "feat: la copia di sicurezza ha una collezione propria"
```

---

### Task 2: salvare e leggere la copia

**Files:**
- Create: `src/data/firebase/ripristinoSicurezza.ts`
- Create: `src/data/firebase/ripristinoSicurezza.test.ts`
- Create: `src/lib/ripristinoSicurezza.ts`
- Create: `src/lib/ripristinoSicurezza.test.ts`

**Interfaces:**
- Consumes: `loadCloudBackup`, `readSalonDoc`, `transactionSalon` da `client.ts` (solo chiamate). `leggiFileAttuali`, `applicaFileRipristino`, `eliminaFileRipristino`. `buildBackup`, `writeJson`, `readJson`.
- Produces:
  - `salvaCopiaCloud(uid: string, ids: readonly string[]): Promise<void>`
  - `leggiCopiaCloud(): Promise<{ bundle: BackupBundle; codici: CodiciCaneDoc | null; file: FileRipristino[]; assenti: string[] } | null>`
  - `cancellaCopiaCloud(): Promise<void>`
  - `salvaCopiaLocale(uid: string): void`
  - `leggiCopiaLocale(uid: string): BackupBundle | null`
  - `cancellaCopiaLocale(uid: string): void`

- [ ] **Step 1: Write the failing test**

`src/lib/ripristinoSicurezza.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
import { cancellaCopiaLocale, leggiCopiaLocale, salvaCopiaLocale } from './ripristinoSicurezza'

describe('copia locale', () => {
  beforeEach(() => localStorage.clear())

  it('tiene i cani di adesso e li toglie quando si cancella', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, { name: 'Bobi', sex: 'male', status: 'in_cura' })
    salvaCopiaLocale(account.uid)
    const copia = leggiCopiaLocale(account.uid)
    expect(Object.values(copia?.dogs ?? {}).map((dog) => (dog as { name: string }).name)).toEqual(['Bobi'])
    expect(localStorage.getItem(`groomly.users.${account.uid}.ripristinoSicurezza`)).toBeTruthy()
    cancellaCopiaLocale(account.uid)
    expect(leggiCopiaLocale(account.uid)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeTruthy()
  })
})
```

Adatta il secondo argomento di `createDog` al tipo `DogWrite` già usato in `SettingsPage.test.tsx` (`dog('Bobi')` non è in questo file: passa i campi obbligatori che `createDog` richiede). Se `createDog` richiede altri campi, copiali dal helper `dog` di `SettingsPage.test.tsx`.

`src/data/firebase/ripristinoSicurezza.test.ts` mocka `./client` e `./ripristinoFile`:

```ts
const calls: string[] = []
const meta = new Map<string, Record<string, unknown>>()
const presenti = { presenti: [] as string[], assenti: [] as string[] }

vi.mock('./client', () => ({
  loadCloudBackup: vi.fn(async () => ({ dogs: { a: {} }, appointments: {}, services: {}, settings: { business: { salonName: 'Pelosetti' } }, closures: {} })),
  readSalonDoc: vi.fn(async (kind: string, id: string) => (kind === 'meta' && id === 'codici-cani' ? { next: 2, cartella: 'cani', byId: { a: 'C0001' } } : meta.get(`${kind}/${id}`) ?? null)),
  transactionSalon: vi.fn(async (run: (tx: { set: (kind: string, id: string, data: Record<string, unknown>) => void }) => Promise<void>) => {
    calls.push('meta')
    await run({ set: (_kind, id, data) => { meta.set(`meta/${id}`, data) } })
  }),
}))

vi.mock('./ripristinoFile', () => ({
  leggiFileAttuali: vi.fn(async (ids: string[]) => {
    calls.push(`leggi:${ids.join(',')}`)
    return presenti
  }),
  applicaFileRipristino: vi.fn(async () => { calls.push('scrivi') }),
  eliminaFileRipristino: vi.fn(async (ids: string[]) => { calls.push(`elimina:${ids.join(',')}`) }),
}))
```

Test:

1. `salvaCopiaCloud('u1', ['f1'])` con `presenti = { presenti: [foto di 1 byte], assenti: ['manca'] }` chiama prima `leggi:f1`, poi `scrivi`, poi `meta`. Il documento `meta/ripristino-sicurezza` ha `assenti: ['manca']`, `presenti: ['f1']`, `codici.next === 2`. `applicaFileRipristino` riceve la collezione `'sicurezza'`.
2. Un bundle il cui `JSON.stringify` supera 900000 caratteri lancia e non chiama `scrivi` né `meta`. Costruisci `dogs` con una chiave lunga abbastanza.
3. `readSalonDoc` dei codici ritorna `null`: il documento salvato ha `codici: null`.
4. `readSalonDoc` dei codici ritorna `{ next: 1.5, cartella: 'cani', byId: {} }`: `salvaCopiaCloud` lancia e non scrive il meta.
5. Una seconda salva, con il meta precedente `presenti: ['vecchio']` e la nuova senza quell'id, chiama `elimina:vecchio` **dopo** `meta`.
6. `leggiCopiaCloud` senza meta ritorna `null`. Con meta e `leggiFileAttuali` sulla collezione `sicurezza` che ritorna i file, il risultato ha quei file e gli `assenti`.
7. `cancellaCopiaCloud` con il meta `presenti: ['f1']` chiama `eliminaFileRipristino(['f1'], fs, db, 'sicurezza')` e poi `deleteDoc` sul percorso `salon/shared/meta/ripristino-sicurezza`. `bindSalon('shared')` prima della chiamata. Il mock di `firebase/firestore` e `firebase/app` è questo, nello stesso file di test:

```ts
const deleted: string[] = []
vi.mock('firebase/firestore', () => ({
  deleteDoc: vi.fn(async (ref: { path: string }) => { deleted.push(ref.path) }),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
  Bytes: { fromUint8Array: (raw: Uint8Array) => raw },
  getFirestore: vi.fn(() => ({})),
}))
vi.mock('firebase/app', () => ({ getApp: vi.fn(() => ({})) }))
```

`cancellaCopiaCloud` non usa `transactionSalon` per la cancellazione del meta.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ripristinoSicurezza.test.ts src/data/firebase/ripristinoSicurezza.test.ts`

Expected: FAIL. I moduli non esistono.

- [ ] **Step 3: Write minimal implementation**

`src/lib/ripristinoSicurezza.ts` usa `buildBackup`, `readJson`, `writeJson`. Chiave `groomly.users.${uid}.ripristinoSicurezza`. `leggiCopiaLocale` ritorna `null` se manca. Se c'è ma `readRestoreBundle` ritorna `null`, lancia `Error('Copia di sicurezza non riuscita')`. `cancellaCopiaLocale` fa `localStorage.removeItem`. Non tocca cani e impostazioni.

`src/data/firebase/ripristinoSicurezza.ts`:

- `LIMITE_JSON = 900000`, `LIMITE_BYTE = 80 * 1024 * 1024`.
- `salvaCopiaCloud`: `loadCloudBackup`. Se `JSON.stringify(bundle).length > LIMITE_JSON`, lancia `Error('Copia di sicurezza non riuscita')`. Legge `meta/codici-cani`. `null` diventa `codici: null`. Un documento presente che non ha `next` intero `>= 1`, `cartella` `cani` o `animali`, e `byId` oggetto di stringhe non vuote, lancia lo stesso errore. `leggiFileAttuali(ids)` sulla collezione di default `files`. Somma `byteSize` dei presenti: sopra `LIMITE_BYTE`, lancia. Legge il meta precedente. `applicaFileRipristino(presenti, api, db, 'sicurezza')`. Poi `transactionSalon` `set('meta', 'ripristino-sicurezza', { bundle, codici, assenti, presenti: presenti.map(file => file.id) })`. Poi `eliminaFileRipristino` sugli id vecchi che non sono nei nuovi, collezione `sicurezza`.
- L'api Firestore è `{ doc, getDoc, writeBatch, Bytes }` e `getFirestore(getApp())`, come `scriviFileRipristino`.
- `leggiCopiaCloud`: `readSalonDoc('meta', 'ripristino-sicurezza')`. `null` ritorna `null`. Altrimenti `leggiFileAttuali(presenti, api, db, 'sicurezza')`. Se un id in `presenti` torna in `assenti`, lancia. Ritorna bundle, codici, file letti, assenti del documento.
- `cancellaCopiaCloud`: legge il meta, `eliminaFileRipristino(presenti, ..., 'sicurezza')`, poi `deleteDoc` sul percorso `salonRootPath()` + `meta` + `ripristino-sicurezza`. Meta assente: ritorna senza errore.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ripristinoSicurezza.test.ts src/data/firebase/ripristinoSicurezza.test.ts src/data/firebase/ripristinoFile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/ripristinoSicurezza.ts src/lib/ripristinoSicurezza.test.ts src/data/firebase/ripristinoSicurezza.ts src/data/firebase/ripristinoSicurezza.test.ts
git commit -m "feat: il ripristino tiene una copia dello stato attuale"
```

---

### Task 3: pulsante Annulla ripristino

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `salvaCopiaLocale`, `leggiCopiaLocale`, `cancellaCopiaLocale`, `salvaCopiaCloud`, `leggiCopiaCloud`, `cancellaCopiaCloud`, `eliminaFileDalSalone` non esiste: l'annulla chiama `eliminaFileRipristino` dal modulo `ripristinoFile` solo se lo aggiungi come wrapper. Il task 1 esporta `eliminaFileRipristino(ids, fs, db, collezione)`. Aggiungi in `ripristinoFile.ts`, se non c'è già, `export async function eliminaFileDalSalone(ids: readonly string[]): Promise<void>` che chiama `eliminaFileRipristino` sulla collezione `files` con l'api reale. È il pezzo che la pagina importa. Se il task 1 non lo ha, crealo in questo task nello stesso file, con un test di una riga che la funzione esiste e inoltra la collezione `files` mockando niente: verifica solo che con id vuoto ritorna senza chiamare `salonRootPath` in errore quando il salone è legato. Il modo più piccolo: `eliminaFileDalSalone` chiama `salonRootPath()` e poi `eliminaFileRipristino`.
- Produces: il pulsante **Annulla ripristino** e la copia presa una sola volta per foglio.

- [ ] **Step 1: Write the failing test**

Nel mock di `ripristinoFile` aggiungi `eliminaFileDalSalone: vi.fn()`. Nel `vi.hoisted` idem. `mockReset` in `beforeEach`.

Mock nuovo:

```ts
const { salvaCopiaCloud, leggiCopiaCloud, cancellaCopiaCloud } = vi.hoisted(() => ({
  salvaCopiaCloud: vi.fn(),
  leggiCopiaCloud: vi.fn(),
  cancellaCopiaCloud: vi.fn(),
}))
vi.mock('../data/firebase/ripristinoSicurezza', () => ({ salvaCopiaCloud, leggiCopiaCloud, cancellaCopiaCloud }))
```

Test locale, nello stesso stile di «lo ZIP solo dati in locale»:

```tsx
it('in locale si può annullare il ripristino', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  createDog(account.uid, dog('Bobi'))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  await screen.findByRole('button', { name: 'Annulla ripristino' })
  expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
  await user.click(screen.getByRole('button', { name: 'Annulla ripristino' }))
  await waitFor(() => {
    expect(Object.values(readJson<Record<string, { name?: string }>>(storageKeys.dogs(account.uid)) ?? {}).map((item) => item.name)).toEqual(['Bobi'])
  })
  expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristino annullato')
})
```

Test cloud, spie dopo il foglio aperto e prima del clic, come gli altri test cloud:

```tsx
it('in cloud la copia precede i dati e l annulla rimette i file', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  const foto = new Uint8Array([1, 2, 3])
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
    files: { f1: metaFoto() },
    voci: { 'cani/C0001 - Fido/profilo.webp': foto },
  }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  const order: string[] = []
  salvaCopiaCloud.mockImplementation(async () => { order.push('copia') })
  vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
  scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
  scriviFileRipristino.mockImplementation(async () => { order.push('file') })
  const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
  await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
  expect(order).toEqual(['copia', 'dati', 'codici', 'file'])
})
```

Test separato «se la copia fallisce non scrive»:

```tsx
it('se la copia fallisce non scrive i dati', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  salvaCopiaCloud.mockRejectedValue(new Error('copia'))
  const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByText('Copia di sicurezza non riuscita')).toBeInTheDocument()
  expect(replace).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
})
```

E un test di annulla cloud dopo il successo del primo:

```tsx
it('in cloud annulla rimette dati, codici e file e toglie gli id assenti', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  salvaCopiaCloud.mockResolvedValue(undefined)
  vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  await screen.findByRole('button', { name: 'Annulla ripristino' })
  const order: string[] = []
  vi.mocked(client.replaceCloudData).mockImplementation(async () => { order.push('dati') })
  scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
  scriviFileRipristino.mockImplementation(async () => { order.push('file') })
  eliminaFileDalSalone.mockImplementation(async () => { order.push('assenti') })
  cancellaCopiaCloud.mockImplementation(async () => { order.push('fine') })
  leggiCopiaCloud.mockResolvedValue({
    bundle: { dogs: {}, appointments: {}, services: {}, settings: {} },
    codici: { next: 2, cartella: 'cani', byId: { a: 'C0001' } },
    file: [{ id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 1, createdAt: 1, createdBy: 'u', bytes: new Uint8Array([9]) }],
    assenti: ['nuovo'],
  })
  await user.click(screen.getByRole('button', { name: 'Annulla ripristino' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristino annullato')
  expect(order).toEqual(['dati', 'codici', 'file', 'assenti', 'fine'])
  expect(eliminaFileDalSalone).toHaveBeenCalledWith(['nuovo'])
  expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
})
```

Un test di secondo clic: dopo un `replaceCloudData` rifiutato, `salvaCopiaCloud` è stato chiamato una volta; il secondo clic sullo stesso foglio non lo chiama di nuovo. Parti da `salva` che risolve, `replace` che rifiuta la prima volta, poi il secondo clic con `replace` che risolve: `salvaCopiaCloud` ha `toHaveBeenCalledOnce()`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL. Manca il pulsante, oppure la copia non viene chiamata prima dei dati.

- [ ] **Step 3: Write minimal implementation**

In `ripristinoFile.ts` aggiungi `eliminaFileDalSalone` se manca.

In `SettingsPage.tsx`:

- `presaRef = useRef(false)` e `undo` / `undoing`.
- `onRestoreFile` mette `presaRef.current = false` all'inizio.
- All'apertura, se c'è l'uid: in cloud `leggiCopiaCloud()` e `setUndo(copia !== null)`; in locale `setUndo(leggiCopiaLocale(uid) !== null)`.
- Cloud, dopo il controllo rete e prima delle scritture, se `presaRef` è falso: `salvaCopiaCloud(uid, file.map((item) => item.id))`, poi `presaRef = true`. Se lancia, toast «Copia di sicurezza non riuscita», `restoring` spento, return. Non chiamare `replaceCloudData`.
- Locale, prima di `restoreBackup`, la stessa regola con `salvaCopiaLocale(uid)`.
- Dopo un ripristino riuscito, `setUndo(true)`.
- Il pulsante **Annulla ripristino** sta in una `SRow` sotto la riga di Ripristina, solo se `undo`. È disabilitato mentre `restoring` o `undoing`.
- L'annulla cloud: rete, poi `leggiCopiaCloud`. Se `null`, `setUndo(false)` e return. Poi `replaceCloudData`, codici se non `null`, `scriviFileRipristino` se ci sono file, `eliminaFileDalSalone(assenti)` se ci sono, `cancellaCopiaCloud`, toast «Ripristino annullato», `setUndo(false)`, `setPending(null)`. Catch: «Ripristino incompleto, riprova».
- L'annulla locale: `leggiCopiaLocale`, `restoreBackup`, `cancellaCopiaLocale`, `reload`, toast «Ripristino annullato», `setUndo(false)`. Catch: «Salvataggio non riuscito» e la chiave resta perché `cancella` è dopo `restoreBackup`.

Il testo del foglio non si tocca.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/ripristinoSicurezza.test.ts src/data/firebase/ripristinoSicurezza.test.ts src/data/firebase/ripristinoFile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx src/data/firebase/ripristinoFile.ts src/data/firebase/ripristinoFile.test.ts
git commit -m "feat: si può annullare l'ultimo ripristino"
```

---

### Task 4: pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json`

- [ ] **Step 1: Versione**

Se `APP_VERSION` non è `1.1.76`, fermati e riporta il valore. Se lo è, pubblica `1.1.77`, `versionCode` 10177. Note: `In Dati e backup, si può annullare l'ultimo ripristino.` URL `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.77/groomly.apk`.

- [ ] **Step 2: APK**

Copia `.env.local` da `D:\Groomly` se manca nel worktree. Non committarlo.

`npm test`, `npm run build`, `npx cap sync android`, in `android` `.\gradlew assembleDebug`. Copia l'apk debug in `groomly.apk` nella radice del worktree, fuori da `hosting/`. Lo script `index-*.js` dentro l'apk deve contenere `AIza` e `1.1.77`. Se manca `AIza`, fermati.

Ripristina con `git checkout --` il CRLF di `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle`, e `package-lock.json` se si è sporcato. Non committarli.

- [ ] **Step 3: Commit**

```powershell
git add -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "release: 1.1.77, si può annullare l'ultimo ripristino"
```

- [ ] **Step 4: Push del ramo di integrazione**

In `D:\Groomly`, senza stash e senza committare i file di archivio sporchi:

```powershell
git merge --ff-only feat/ripristino-sicurezza
git push origin HEAD:feat/listino-razze
```

Non `git push origin HEAD` e non `git push origin main`. Se il fast-forward fallisce, fermati.

- [ ] **Step 5: Release e Hosting**

```powershell
gh release create v1.1.77 D:\Groomly-worktrees\ripristino-sicurezza\groomly.apk --repo robmass83-ui/Groomly --target feat/listino-razze --title "v1.1.77" --notes "In Dati e backup, si può annullare l'ultimo ripristino."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermati. Non forzare il push e non saltare gli hook.
