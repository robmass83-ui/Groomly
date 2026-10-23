# Ripristino foto dallo ZIP completo — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ripristina accetta lo ZIP di Backup completo e, in cloud, riscrive i file `ok` negli stessi id.

**Architecture:** `leggiRipristino` valida i percorsi e copia i byte. Non scrive. `applicaFileRipristino` li mette in Firestore con `salonRootPath`, senza passare da `client.ts` e senza ricomprimere. La pagina tiene l'ordine dati, codici, file.

**Tech Stack:** React, Vitest, happy-dom, JSZip 3.10.2 già presente, Firestore `writeBatch`. Nessuna dipendenza nuova.

## Global Constraints

- Specifica: `docs/superpowers/specs/2026-10-23-ripristino-foto-design.md`. Quella prevale su questo piano se un testo diverge.
- Lo ZIP solo dati, il JSON di Esporta e il JSON interno restano come in `docs/superpowers/specs/2026-10-22-ripristino-zip-dati-design.md`.
- Il messaggio «Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.» non si usa più.
- Non modificare `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts`, `src/data/firebase/firebaseEnv.test.ts`, `src/lib/backupZip.ts`, `src/lib/backupCompleto.ts`, `src/lib/registroXlsx.ts`.
- Non modificare `replaceCloudData`, `restoreBackup`, `scriviCodiciCane`, `impostazioniRipristino`, `backupZip`, `backupCompleto`.
- Nessuna dipendenza nuova. WebP resta WebP. Nessuna miniatura nuova.
- Il foglio, il chip, Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo non cambiano comportamento. Il ripristino non aggiorna `backup.lastAt`.
- `accept` resta `application/json,.json,application/zip,.zip`.
- Lavorare in `D:\Groomly-worktrees\ripristino-foto` sul ramo `feat/ripristino-foto`. Non committare da `D:\Groomly`. Non `git add -A`. Non rimuovere gli altri worktree. Non pushare `origin/main`.
- I quattro file di versione non si alzano prima del task 4. `APP_VERSION` di partenza è `1.1.75`.
- Commit nel worktree, un compito alla volta, messaggio in italiano come i commit già nel ramo (`docs:`, `feat:`, `release:`).

---

### Task 1: lettura dello ZIP completo

**Files:**
- Modify: `src/lib/leggiRipristino.ts`
- Modify: `src/lib/leggiRipristino.test.ts`
- Modify: `src/pages/SettingsPage.test.tsx` (solo l'asserzione che oggi aspetta il messaggio delle foto)

**Interfaces:**
- Consumes: `sha256Hex`, `FILE_MAX_BYTES`, `readRestoreBundle`, JSZip.
- Produces:
  - `export type FileRipristino = { id: string; kind: 'foto' | 'file'; owner: string; name: string; mime: string; byteSize: number; createdAt: number; createdBy: string; bytes: Uint8Array; w?: number; h?: number }`
  - `EsitoRipristino` guadagna `{ esito: 'completo'; bundle: BackupBundle; codici: CodiciCaneDoc; file: FileRipristino[] }`
  - `leggiRipristino` non scrive.

- [ ] **Step 1: Write the failing test**

In `src/lib/leggiRipristino.test.ts`, togli la costante `FOTO`. Sostituisci il test `il completo valido parla delle foto...` con questi tre test. Aggiungi l'import di `FILE_MAX_BYTES` da `./fileBytes` e di `BackupFileMeta` dal tipo in `./backupBundle`.

```ts
function metaOk(over: Partial<BackupFileMeta> = {}): BackupFileMeta {
  return {
    id: 'f1',
    kind: 'foto',
    owner: 'dog:a',
    name: '',
    mime: 'image/webp',
    byteSize: 3,
    chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z',
    createdBy: 'u1',
    estensione: '.webp',
    percorsoBackup: 'cani/C0001 - Fido/profilo.webp',
    esito: 'ok',
    ...over,
  }
}

async function zipCompleto(files: GroomlyDati['files'], voci: Record<string, Uint8Array> = {}): Promise<Uint8Array> {
  const base = dati()
  base.files = files
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: true })
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  for (const [path, bytes] of Object.entries(voci)) zip.file(path, bytes)
  return zip.generateAsync({ type: 'uint8array' })
}

it('legge il WebP dello ZIP completo e non lo mette nel bundle', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const esito = await leggiRipristino(await zipCompleto(
    { f1: metaOk(), assente: metaOk({ id: 'assente', esito: 'mancante', percorsoBackup: 'manca.webp', byteSize: 1 }) },
    { 'cani/C0001 - Fido/profilo.webp': bytes },
  ))
  expect(esito.esito).toBe('completo')
  if (esito.esito !== 'completo') return
  expect(Object.keys(esito.bundle).sort()).toEqual(['appointments', 'closures', 'dogs', 'services', 'settings'])
  expect(esito.codici).toEqual({ next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
  expect(esito.file).toEqual([{
    id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3,
    createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', bytes,
  }])
})

it('rifiuta percorso, lunghezza, esito, id e i limiti prima di accettare il completo', async () => {
  const bytes = new Uint8Array([1, 2, 3])
  const path = 'cani/C0001 - Fido/profilo.webp'
  const casi = [
    await zipCompleto({ f1: metaOk({ percorsoBackup: '../segreto.webp' }) }, { '../segreto.webp': bytes }),
    await zipCompleto({ f1: metaOk() }, { [path]: new Uint8Array([1, 2]) }),
    await zipCompleto({ f1: metaOk({ esito: undefined as unknown as 'ok' }) }, { [path]: bytes }),
    await zipCompleto({ 'a/b': metaOk({ id: 'a/b' }) }),
    await zipCompleto({ f1: metaOk({ mime: 'application/pdf' }) }, { [path]: bytes }),
    await zipCompleto({
      f1: metaOk(),
      f2: metaOk({ id: 'f2', percorsoBackup: path }),
    }, { [path]: bytes }),
  ]
  for (const archivio of casi) {
    expect(await leggiRipristino(archivio)).toEqual({ esito: 'rifiutato', messaggio: FILE })
  }
  const tanti: GroomlyDati['files'] = {}
  for (let index = 0; index < 201; index += 1) {
    const id = `f${index}`
    tanti[id] = metaOk({ id, percorsoBackup: `file-sciolti/${id}.webp`, byteSize: 0 })
  }
  expect(await leggiRipristino(await zipCompleto(tanti))).toEqual({ esito: 'rifiutato', messaggio: FILE })
  const pesanti: GroomlyDati['files'] = {}
  for (let index = 0; index < 9; index += 1) {
    const id = `p${index}`
    pesanti[id] = metaOk({ id, percorsoBackup: `file-sciolti/${id}.webp`, byteSize: FILE_MAX_BYTES })
  }
  expect(await leggiRipristino(await zipCompleto(pesanti))).toEqual({ esito: 'rifiutato', messaggio: FILE })
})

it('uno ZIP completo senza file ok è valido e uno solo dati non legge le foto', async () => {
  const vuoto = await leggiRipristino(await zipCompleto({}))
  expect(vuoto.esito).toBe('completo')
  if (vuoto.esito !== 'completo') return
  expect(vuoto.file).toEqual([])
  const solo = await leggiRipristino(await zipDi(canonicalJson(dati())))
  expect(solo.esito).toBe('solo-dati')
})
```

In `src/pages/SettingsPage.test.tsx`, nel test `lo ZIP completo, il checksum rotto e il JSON interno non scrivono`, sostituisci solo il primo caricamento. Il completo vuoto ora apre il foglio. Non confermare. Checksum e JSON interno restano come sono.

```tsx
await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }))
expect(await screen.findByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
expect(scriviCodiciCane).not.toHaveBeenCalled()
expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogs)
await user.click(screen.getByRole('button', { name: 'Annulla' }))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/leggiRipristino.test.ts src/pages/SettingsPage.test.tsx`

Expected: FAIL. Il lettore rifiuta ancora il completo col messaggio delle foto, oppure il tipo `completo` non esiste.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/leggiRipristino.ts` importa `FILE_MAX_BYTES` da `./fileBytes`. Togli la costante `FOTO`. Estendi `EsitoRipristino` con `completo` e esporta `FileRipristino` come nel blocco Interfaces.

Sostituisci il finale di `leggiZip` (dal punto in cui `pronto` è nullo) con:

```ts
  if (!pronto) return rifiuto(FILE)
  if (manifest.tipo === 'completo') return leggiCompleto(zip, parsed, pronto)
  if (manifest.tipo !== 'solo-dati') return rifiuto(FILE)
  return { esito: 'solo-dati', bundle: pronto.bundle, codici: pronto.codici }
```

Aggiungi queste funzioni nello stesso file. `80 * 1024 * 1024` e `200` sono i limiti della specifica. Un `mancante` non si legge. `owner`, `name` e `createdBy` possono essere stringhe vuote. `w` e `h` si copiano solo se la chiave c'è ed è un numero finito.

```ts
const LIMITE_FILE = 200
const LIMITE_BYTE = 80 * 1024 * 1024
const ID_OK = /^[A-Za-z0-9_-]{1,128}$/

type FileInCorso = Omit<FileRipristino, 'bytes'> & { percorso: string }

function percorsoOk(path: string): boolean {
  if (!path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || path.endsWith('/') || path.includes('//')) return false
  return path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
}

function leggiVoce(id: string, value: unknown): { esito: 'mancante' } | { esito: 'ok'; file: FileInCorso } | null {
  if (!ID_OK.test(id) || !isRecord(value)) return null
  if ('id' in value && value.id !== id) return null
  if (value.esito === 'mancante') return { esito: 'mancante' }
  if (value.esito !== 'ok') return null
  const percorso = value.percorsoBackup
  if (typeof percorso !== 'string' || !percorsoOk(percorso)) return null
  if (value.kind !== 'foto' && value.kind !== 'file') return null
  if (typeof value.mime !== 'string' || value.mime.length === 0) return null
  if (typeof value.owner !== 'string' || typeof value.name !== 'string' || typeof value.createdBy !== 'string') return null
  if (value.kind === 'foto' && !value.mime.startsWith('image/')) return null
  const byteSize = value.byteSize
  if (typeof byteSize !== 'number' || !Number.isInteger(byteSize) || byteSize < 0 || byteSize > FILE_MAX_BYTES) return null
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) return null
  const file: FileInCorso = {
    id,
    kind: value.kind,
    owner: value.owner,
    name: value.name,
    mime: value.mime,
    byteSize,
    createdAt: Date.parse(value.createdAt),
    createdBy: value.createdBy,
    percorso,
  }
  if (typeof value.w === 'number' && Number.isFinite(value.w)) file.w = value.w
  if (typeof value.h === 'number' && Number.isFinite(value.h)) file.h = value.h
  return { esito: 'ok', file }
}

async function leggiCompleto(
  zip: JSZip,
  parsed: Record<string, unknown>,
  pronto: { bundle: BackupBundle; codici: CodiciCaneDoc },
): Promise<EsitoRipristino> {
  if (!isRecord(parsed.files)) return rifiuto(FILE)
  const pronti: FileInCorso[] = []
  const percorsi = new Set<string>()
  for (const [id, value] of Object.entries(parsed.files)) {
    const voce = leggiVoce(id, value)
    if (!voce) return rifiuto(FILE)
    if (voce.esito === 'mancante') continue
    if (percorsi.has(voce.file.percorso)) return rifiuto(FILE)
    percorsi.add(voce.file.percorso)
    pronti.push(voce.file)
  }
  if (pronti.length > LIMITE_FILE) return rifiuto(FILE)
  if (pronti.reduce((sum, file) => sum + file.byteSize, 0) > LIMITE_BYTE) return rifiuto(FILE)
  const file: FileRipristino[] = []
  for (const item of pronti) {
    const entry = zip.file(item.percorso)
    if (!entry) return rifiuto(FILE)
    let letti: Uint8Array
    try {
      letti = await entry.async('uint8array')
    } catch {
      return rifiuto(FILE)
    }
    if (letti.length !== item.byteSize) return rifiuto(FILE)
    const { percorso, ...rest } = item
    void percorso
    file.push({ ...rest, bytes: new Uint8Array(letti) })
  }
  return { esito: 'completo', bundle: pronto.bundle, codici: pronto.codici, file }
}
```

Non leggere `LEGGIMI.txt`, il Registro, `foto-mancanti.txt` o `altriRiferimenti`. Non cambiare `impostazioniRipristino`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/leggiRipristino.test.ts src/pages/SettingsPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/leggiRipristino.ts src/lib/leggiRipristino.test.ts src/pages/SettingsPage.test.tsx
git commit -m "feat: Ripristina legge i file dello ZIP completo"
```

---

### Task 2: scrittura dei file nello stesso id

**Files:**
- Create: `src/data/firebase/ripristinoFile.ts`
- Create: `src/data/firebase/ripristinoFile.test.ts`

**Interfaces:**
- Consumes: `FileRipristino` da `src/lib/leggiRipristino.ts`. `FirestoreApi` da `src/data/firebase/files.ts`. `splitChunks`, `CHUNK_WRITE_GROUP`, `FILE_MAX_BYTES` da `src/lib/fileBytes.ts`. `salonRootPath` da `src/data/firebase/salonRoot.ts`.
- Produces:
  - `export async function applicaFileRipristino(files: readonly FileRipristino[], fs: FirestoreApi, db: unknown): Promise<void>`
  - `export async function scriviFileRipristino(files: readonly FileRipristino[]): Promise<void>`

- [ ] **Step 1: Write the failing test**

Crea `src/data/firebase/ripristinoFile.test.ts`. Il falso è lo stesso di `files.test.ts`, con `delete` sul batch.

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { applicaFileRipristino } from './ripristinoFile'
import type { FirestoreApi } from './files'
import { bindSalon } from './salonRoot'
import { CHUNK_BYTES } from '../../lib/fileBytes'
import type { FileRipristino } from '../../lib/leggiRipristino'

class FakeBytes {
  constructor(readonly raw: Uint8Array) {}
  static fromUint8Array(raw: Uint8Array) { return new FakeBytes(raw) }
  toUint8Array() { return this.raw }
}

function fakeFirestore() {
  const docs = new Map<string, Record<string, unknown>>()
  const commits: string[][] = []
  const api = {
    Bytes: FakeBytes,
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    getDoc: async (ref: { path: string }) => ({ exists: () => docs.has(ref.path), data: () => docs.get(ref.path) }),
    writeBatch: () => {
      const ops: Array<() => void> = []
      const paths: string[] = []
      return {
        set(ref: { path: string }, data: Record<string, unknown>) { paths.push(ref.path); ops.push(() => docs.set(ref.path, data)) },
        delete(ref: { path: string }) { paths.push(`-${ref.path}`); ops.push(() => docs.delete(ref.path)) },
        async commit() { ops.forEach((op) => op()); commits.push(paths) },
      }
    },
  } as unknown as FirestoreApi
  return { api, docs, commits }
}

function foto(bytes: Uint8Array, over: Partial<FileRipristino> = {}): FileRipristino {
  return {
    id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp',
    byteSize: bytes.length, createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', bytes, ...over,
  }
}

describe('applicaFileRipristino', () => {
  beforeEach(() => { bindSalon('shared') })

  it('riscrive il WebP in files/f1 e full/data, senza miniatura', async () => {
    const { api, docs, commits } = fakeFirestore()
    const bytes = new Uint8Array([9, 8, 7])
    await applicaFileRipristino([foto(bytes, { w: 12, h: 8 })], api, {})
    const main = docs.get('salon/shared/files/f1')
    expect(main).toEqual({
      kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3, chunkCount: 0,
      createdAt: Date.parse('2026-10-22T12:00:00.000Z'), createdBy: 'u1', w: 12, h: 8,
    })
    expect(main?.thumb).toBeUndefined()
    expect(Array.from((docs.get('salon/shared/files/f1/full/data')?.dati as FakeBytes).raw)).toEqual([9, 8, 7])
    expect(commits.at(-1)).toEqual(expect.arrayContaining(['salon/shared/files/f1', 'salon/shared/files/f1/full/data']))
  })

  it('un salone non shared non scrive salon/shared', async () => {
    bindSalon('uid-9')
    const { api, docs } = fakeFirestore()
    await applicaFileRipristino([foto(new Uint8Array([1]))], api, {})
    expect(docs.has('salons/uid-9/files/f1')).toBe(true)
    expect([...docs.keys()].some((path) => path.startsWith('salon/shared'))).toBe(false)
  })

  it('sopra i 700 KiB i pezzi precedono il documento principale', async () => {
    const { api, docs, commits } = fakeFirestore()
    const bytes = new Uint8Array(700 * 1024 + 1)
    bytes[0] = 4
    bytes[CHUNK_BYTES] = 5
    await applicaFileRipristino([foto(bytes)], api, {})
    expect(docs.get('salon/shared/files/f1')?.chunkCount).toBe(2)
    expect(docs.has('salon/shared/files/f1/full/data')).toBe(false)
    expect((docs.get('salon/shared/files/f1/chunks/0')?.dati as FakeBytes).raw[0]).toBe(4)
    expect((docs.get('salon/shared/files/f1/chunks/1')?.dati as FakeBytes).raw[0]).toBe(5)
    const last = commits.at(-1) ?? []
    expect(last).toEqual(['salon/shared/files/f1'])
    expect(commits.some((paths) => paths.includes('salon/shared/files/f1/chunks/0'))).toBe(true)
  })

  it('sostituisce i chunk vecchi fino all indice 63 e lascia gli altri id', async () => {
    const { api, docs } = fakeFirestore()
    docs.set('salon/shared/files/f1', { chunkCount: 65, thumb: new FakeBytes(new Uint8Array([1])), mime: 'image/jpeg' })
    for (let index = 0; index < 65; index += 1) docs.set(`salon/shared/files/f1/chunks/${index}`, { dati: new FakeBytes(new Uint8Array([index])) })
    docs.set('salon/shared/files/f1/full/data', { dati: new FakeBytes(new Uint8Array([7])) })
    docs.set('salon/shared/files/f2', { kind: 'file', name: 'resta' })
    await applicaFileRipristino([foto(new Uint8Array([3, 3]))], api, {})
    expect(Array.from((docs.get('salon/shared/files/f1/full/data')?.dati as FakeBytes).raw)).toEqual([3, 3])
    expect(docs.get('salon/shared/files/f1')?.thumb).toBeUndefined()
    expect(docs.get('salon/shared/files/f1')?.mime).toBe('image/webp')
    expect(docs.has('salon/shared/files/f1/chunks/0')).toBe(false)
    expect(docs.has('salon/shared/files/f1/chunks/63')).toBe(false)
    expect(docs.has('salon/shared/files/f1/chunks/64')).toBe(true)
    expect(docs.get('salon/shared/files/f2')).toEqual({ kind: 'file', name: 'resta' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/ripristinoFile.test.ts`

Expected: FAIL. Il modulo non esiste.

- [ ] **Step 3: Write minimal implementation**

Crea `src/data/firebase/ripristinoFile.ts`.

```ts
import { getApp } from 'firebase/app'
import { doc, getDoc, getFirestore, writeBatch, Bytes } from 'firebase/firestore'
import { CHUNK_WRITE_GROUP, FILE_MAX_BYTES, splitChunks } from '../../lib/fileBytes'
import type { FileRipristino } from '../../lib/leggiRipristino'
import type { FirestoreApi } from './files'
import { salonRootPath } from './salonRoot'

type Ref = ReturnType<FirestoreApi['doc']>
type Op =
  | { op: 'delete'; ref: Ref }
  | { op: 'set'; ref: Ref; data: Record<string, unknown> }

async function commitGroups(fs: FirestoreApi, db: unknown, ops: Op[]): Promise<void> {
  const firestore = db as Parameters<typeof fs.writeBatch>[0]
  for (let start = 0; start < ops.length; start += CHUNK_WRITE_GROUP) {
    const batch = fs.writeBatch(firestore)
    for (const item of ops.slice(start, start + CHUNK_WRITE_GROUP)) {
      if (item.op === 'delete') batch.delete(item.ref)
      else batch.set(item.ref, item.data)
    }
    await batch.commit()
  }
}

export async function applicaFileRipristino(files: readonly FileRipristino[], fs: FirestoreApi, db: unknown): Promise<void> {
  if (files.length === 0) return
  const at = (id: string, ...rest: string[]) => {
    const [head, ...tail] = salonRootPath()
    return fs.doc(db as Parameters<typeof fs.doc>[0], head, ...tail, 'files', id, ...rest)
  }
  for (const file of files) {
    if (file.bytes.length !== file.byteSize || file.bytes.length > FILE_MAX_BYTES) throw new Error('File non valido')
    const snap = await fs.getDoc(at(file.id))
    const previous = snap.exists() ? snap.data() as Record<string, unknown> : {}
    const declared = typeof previous.chunkCount === 'number' && Number.isInteger(previous.chunkCount) && previous.chunkCount > 0
      ? Math.min(previous.chunkCount, 64)
      : 0
    const parts = splitChunks(file.bytes)
    const remove: Op[] = [{ op: 'delete', ref: at(file.id, 'full', 'data') }]
    for (let index = parts.length; index < declared; index += 1) remove.push({ op: 'delete', ref: at(file.id, 'chunks', String(index)) })
    await commitGroups(fs, db, remove)
    const main: Record<string, unknown> = {
      kind: file.kind,
      owner: file.owner,
      name: file.name,
      mime: file.mime,
      byteSize: file.bytes.length,
      chunkCount: parts.length,
      createdAt: file.createdAt,
      createdBy: file.createdBy,
    }
    if (file.w !== undefined) main.w = file.w
    if (file.h !== undefined) main.h = file.h
    if (parts.length === 0) {
      await commitGroups(fs, db, [
        { op: 'set', ref: at(file.id, 'full', 'data'), data: { dati: fs.Bytes.fromUint8Array(file.bytes) } },
        { op: 'set', ref: at(file.id), data: main },
      ])
      continue
    }
    await commitGroups(fs, db, parts.map((part, index) => ({
      op: 'set' as const,
      ref: at(file.id, 'chunks', String(index)),
      data: { dati: fs.Bytes.fromUint8Array(part) },
    })))
    await commitGroups(fs, db, [{ op: 'set', ref: at(file.id), data: main }])
  }
}

export async function scriviFileRipristino(files: readonly FileRipristino[]): Promise<void> {
  if (files.length === 0) return
  salonRootPath()
  await applicaFileRipristino(files, { doc, getDoc, writeBatch, Bytes }, getFirestore(getApp()))
}
```

Non importare `client.ts`. Non chiamare il codec delle foto. Non cancellare id assenti dall'elenco. `scriviFileRipristino` non va chiamato dai test: i test passano il falso a `applicaFileRipristino`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/ripristinoFile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/firebase/ripristinoFile.ts src/data/firebase/ripristinoFile.test.ts
git commit -m "feat: il ripristino riscrive i file nello stesso id"
```

---

### Task 3: conferma di Ripristina

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `leggiRipristino`, `impostazioniRipristino`, `FileRipristino`, `scriviCodiciCane`, `scriviFileRipristino`, `replaceCloudData`, `restoreBackup`.
- Produces: lo stato `pending` è `{ bundle: BackupBundle; codici: CodiciCaneDoc | null; file: FileRipristino[] }`.

- [ ] **Step 1: Write the failing test**

In cima a `src/pages/SettingsPage.test.tsx` aggiungi `scriviFileRipristino` al `vi.hoisted` e al mock. In `beforeEach`, `scriviFileRipristino.mockReset()`.

```ts
const { raccogliBackup, scriviCodiciCane, scriviFileRipristino } = vi.hoisted(() => ({
  raccogliBackup: vi.fn(),
  scriviCodiciCane: vi.fn(),
  scriviFileRipristino: vi.fn(),
}))

vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup, scriviCodiciCane }))
vi.mock('../data/firebase/ripristinoFile', () => ({ scriviFileRipristino }))
```

Estendi `fileZip` con un terzo argomento opzionale e, dopo aver scritto il JSON, aggiungi le voci:

```ts
async function fileZip(
  includiByte: boolean,
  settings: Record<string, unknown>,
  extra?: { files?: GroomlyDati['files']; voci?: Record<string, Uint8Array> },
) {
  const base = datiRegistro()
  base.dogs = { a: {}, b: {} }
  base.settings = settings
  base.codiciCane = { next: 4, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } }
  if (extra?.files) base.files = extra.files
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte })
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  for (const [path, bytes] of Object.entries(extra?.voci ?? {})) zip.file(path, bytes)
  const bytes = new Uint8Array(await zip.generateAsync({ type: 'uint8array' }))
  return new File([bytes], 'backup.zip', { type: 'application/zip' })
}
```

Aggiungi in testa al file del test, dopo gli import, niente: `BackupFileMeta` si importa da `../lib/backupBundle`.

```ts
function metaFoto(): GroomlyDati['files'][string] {
  return {
    id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3, chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z', createdBy: 'u1', estensione: '.webp',
    percorsoBackup: 'cani/C0001 - Fido/profilo.webp', esito: 'ok',
  }
}
```

Sostituisci il primo pezzo del test del completo (quello che ora apre il foglio e preme Annulla) con una conferma locale. Il resto del test (checksum e JSON interno) resta e deve anche aspettarsi `scriviFileRipristino` non chiamato.

```tsx
const foto = new Uint8Array([1, 2, 3])
await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
  files: { f1: metaFoto() },
  voci: { 'cani/C0001 - Fido/profilo.webp': foto },
}))
await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
await waitFor(() => {
  expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
})
expect(scriviFileRipristino).not.toHaveBeenCalled()
expect(scriviCodiciCane).not.toHaveBeenCalled()
```

Aggiungi questo test:

```tsx
it('in cloud lo ZIP completo scrive dati, codici e poi i file', async () => {
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
  vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
  scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
  scriviFileRipristino.mockImplementation(async () => { order.push('file') })
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
  expect(order).toEqual(['dati', 'codici', 'file'])
  const scritti = scriviFileRipristino.mock.calls[0]?.[0] as Array<{ id: string; mime: string; bytes: Uint8Array }>
  expect(scritti).toHaveLength(1)
  expect(scritti[0]?.id).toBe('f1')
  expect(scritti[0]?.mime).toBe('image/webp')
  expect(Array.from(scritti[0]?.bytes ?? [])).toEqual([1, 2, 3])
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('se i file falliscono il foglio resta aperto', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
    files: { f1: metaFoto() },
    voci: { 'cani/C0001 - Fido/profilo.webp': new Uint8Array([1, 2, 3]) },
  }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
  scriviFileRipristino.mockRejectedValue(new Error('file'))
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
  expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
  expect(replace).toHaveBeenCalledOnce()
  expect(scriviCodiciCane).toHaveBeenCalledOnce()
  expect(scriviFileRipristino).toHaveBeenCalledOnce()
})
```

Le spie cloud si installano dopo che il foglio è aperto e prima del clic, come i test già presenti. `vi.restoreAllMocks()` in `beforeEach` resta. Nel test già presente `in cloud la conferma scrive i dati e poi i codici` aggiungi `expect(scriviFileRipristino).not.toHaveBeenCalled()` dopo il controllo dei codici.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL. La conferma cloud non chiama `scriviFileRipristino`.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx` importa il tipo:

```ts
import type { FileRipristino } from '../lib/leggiRipristino'
```

Cambia lo stato:

```ts
type RipristinoPronto = { bundle: BackupBundle; codici: CodiciCaneDoc | null; file: FileRipristino[] }
```

In `onRestoreFile`, dopo il rifiuto:

```ts
setPending({
  bundle: esito.bundle,
  codici: esito.esito === 'solo-dati' || esito.esito === 'completo' ? esito.codici : null,
  file: esito.esito === 'completo' ? esito.file : [],
})
```

In `confirmRestore`, nel ramo cloud, dopo `scriviCodiciCane` e prima del toast:

```ts
const file = pending.file
// ... replaceCloudData, poi codici, poi:
if (file.length > 0) {
  const { scriviFileRipristino } = await import('../data/firebase/ripristinoFile')
  await scriviFileRipristino(file)
}
```

`file` va letto prima dell'await, insieme a `codici`. Il ramo locale non importa `ripristinoFile` e non lo chiama. Testo del foglio, Annulla, chip e `accept` restano.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/leggiRipristino.test.ts src/data/firebase/ripristinoFile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: Ripristina rimette le foto dello ZIP completo"
```

---

### Task 4: pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`
- Modify: `package.json` (`version`)
- Modify: `android/app/build.gradle` (`versionName`, `versionCode`)
- Modify: `hosting/release.json` (`version`, `url`, `notes`)

**Interfaces:**
- Consumes: il ramo `feat/ripristino-foto` con i task 1–3 già committati.
- Produces: release GitHub con asset `groomly.apk` e Hosting aggiornato.

- [ ] **Step 1: Leggi la versione e alza la patch**

Nel worktree leggi `APP_VERSION`. Se è `1.1.75`, la release è `1.1.76` e `versionCode` è `10176`. Se non è `1.1.75`, fermati e riporta il valore: non indovinare un'altra patch.

Allinea i quattro file:

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.76'`
- `package.json` → `"version": "1.1.76"`
- `android/app/build.gradle` → `versionName "1.1.76"` e `versionCode 10176`
- `hosting/release.json` → `version` `1.1.76`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.76/groomly.apk`, `notes` con la sola riga `In Dati e backup, Ripristina rimette anche le foto e i file dello ZIP completo.`

- [ ] **Step 2: Test e APK**

Se manca `.env.local` nel worktree, copialo da `D:\Groomly\.env.local`. Non committarlo.

```powershell
npm test
npm run build
npx cap sync android
```

Poi in `android`: `.\gradlew assembleDebug`. Copia `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del worktree, fuori da `hosting/`.

Apri l'APK come ZIP, leggi `assets/public/assets/index-*.js` e verifica che contenga `AIza` e `1.1.76`. Se `AIza` manca, fermati e non pubblicare.

Se `cap sync` sporca solo il CRLF di `android/app/capacitor.build.gradle` o `android/capacitor.settings.gradle`, ripristina quei file con `git checkout --`. Non committarli. Non committare `package-lock.json` se `npm install` lo ha toccato.

- [ ] **Step 3: Commit della versione**

```powershell
git add -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "release: 1.1.76, Ripristina rimette le foto dello ZIP completo"
```

- [ ] **Step 4: Fast-forward e push del ramo di integrazione**

`origin/feat/listino-razze` è il ramo che l'app pubblica. `origin/main` resta dov'è.

In `D:\Groomly`, solo se il working tree non ha modifiche ai quattro file di versione né a `src/lib/leggiRipristino.ts`, `src/pages/SettingsPage.tsx`, `src/data/firebase/ripristinoFile.ts`:

```powershell
git merge --ff-only feat/ripristino-foto
git push origin HEAD:feat/listino-razze
```

Non eseguire `git push origin HEAD` e non `git push origin main`. Se il fast-forward non è possibile, fermati.

- [ ] **Step 5: Release e Hosting**

Da `D:\Groomly`, con `groomly.apk` copiato anche lì (l'asset non sta nel commit):

```powershell
gh release create v1.1.76 groomly.apk --repo robmass83-ui/Groomly --target feat/listino-razze --title "v1.1.76" --notes "In Dati e backup, Ripristina rimette anche le foto e i file dello ZIP completo."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermati e dillo. Non forzare il push e non saltare gli hook.
