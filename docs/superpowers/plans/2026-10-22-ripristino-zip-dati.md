# Ripristino ZIP solo dati Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far leggere a Ripristina lo ZIP di Backup ZIP, sostituire i dati con la scrittura già presente e, solo dopo un successo cloud, sostituire `meta/codici-cani`.

**Architecture:** `leggiRipristino` e `impostazioniRipristino` sono funzioni pure. Il pulsante prepara il bundle e chiama `restoreBackup` oppure `replaceCloudData`, che non si modificano. `scriviCodiciCane` sostituisce il documento dei codici sul salone attivo, senza unirlo a quello già presente.

**Tech Stack:** TypeScript, Vitest, happy-dom, JSZip 3.10.2. Nessuna dipendenza nuova.

## Global Constraints

- Specifica: `docs/superpowers/specs/2026-10-22-ripristino-zip-dati-design.md`. In caso di conflitto vince la specifica.
- `leggiRipristino(bytes)` e `impostazioniRipristino(dalFile, dalTelefono)` stanno in `src/lib/leggiRipristino.ts`. Non scrivono nulla.
- `readRestoreBundle`, `restoreBackup`, `replaceCloudData`, `backupZip`, `backupCompleto` non si modificano.
- Un file è uno ZIP se i primi due byte sono `PK`. Il testo di `dati/groomly-dati.json` non si riformatta: lo SHA-256 è `sha256Hex` di quel testo.
- `formato` è `groomly-backup` e `versioneFormato` è `1`, nel manifest e nei dati. `manifest.checksum['groomly-dati.json']` è una stringa.
- Prima si scarta il file malformato, poi `tipo` `completo` riceve «Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.». `solo-dati` apre il foglio. Ogni altro rifiuto è «File non valido».
- Un JSON con la chiave `versioneFormato` riceve «Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.». Senza quella chiave passa da `readRestoreBundle`.
- `impostazioniRipristino` tiene le impostazioni del file e ci mette `backup` e `passwordHash` del telefono. Se il telefono non ha un blocco, il risultato non lo ha. Si chiama alla conferma, sulle impostazioni visibili.
- I codici si scrivono solo dopo che `replaceCloudData` ha risolto, con `scriviCodiciCane` in `src/data/firebase/backupCollect.ts`. Il documento è `{ next, cartella, byId }` del file. Il percorso è quello del salone attivo. Mai `salon/shared` scritto a mano.
- Se i dati falliscono, i codici non si scrivono. Se i codici falliscono, il foglio resta aperto e il toast è «Ripristino incompleto, riprova». Senza rete: «Connessione assente». In locale non si scrivono i codici.
- I documenti `files` non si toccano. `fotoMancanti` e `deletedDogs` non si applicano. Il tema non ha logica nuova.
- `accept` diventa `application/json,.json,application/zip,.zip`. Il chip, Esporta, «Esegui ora», il toggle, Registro Excel, Backup ZIP e Backup completo non cambiano. Il ripristino non aggiorna `backup.lastAt`.
- Non si toccano `src/data/firebase/enabled.ts`, `src/data/firebase/client.ts`, `vite.config.ts`, `src/data/firebase/firebaseEnv.test.ts`.
- `noUnusedLocals` e `noUnusedParameters` sono accesi. Togliere gli import rimasti inutilizzati.
- Il worktree di esecuzione è `D:\Groomly-worktrees\ripristino-zip`, ramo `feat/ripristino-zip`, creato dal commit di questa specifica (`8fcbed7` o un discendente committato). Non si lavora sull'albero sporco di `D:\Groomly` e non si usa `D:\Groomly-worktrees\backup-zip`. Non si committano l'archivio, `.env.local`, `groomly.apk`, `android/app/build` né `package-lock.json`.
- Commit nel worktree: `git add -- percorsi` e poi `git commit --only -m "msg" -- percorsi`.
- Si pubblica 1.1.73, `versionCode` 10173, solo a task 1-3 verdi e solo se l'APK contiene `AIza` e `1.1.73`. Questa fase di piano non alza la versione. Non si unisce a `origin/main`.

---

### Task 1: Lettura dello ZIP e impostazioni del telefono

**Files:**
- Create: `src/lib/leggiRipristino.ts`
- Create: `src/lib/leggiRipristino.test.ts`

**Interfaces:**
- Consumes: `sha256Hex`, `buildManifest`, `canonicalJson`, `readRestoreBundle`, `BackupBundle`, `CodiciCaneDoc`, JSZip.
- Produces:
  - `leggiRipristino(bytes: Uint8Array): Promise<{ esito: 'vecchio'; bundle: BackupBundle } | { esito: 'solo-dati'; bundle: BackupBundle; codici: CodiciCaneDoc } | { esito: 'rifiutato'; messaggio: string }>`
  - `impostazioniRipristino(dalFile: Record<string, unknown>, dalTelefono: Record<string, unknown>): Record<string, unknown>`
  - I tre messaggi, esatti: `File non valido`; `Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.`; `Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/leggiRipristino.test.ts`.

```ts
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildManifest, canonicalJson, sha256Hex, type BackupManifest, type GroomlyDati } from './backupBundle'
import { readRestoreBundle } from './backupDoc'
import { impostazioniRipristino, leggiRipristino } from './leggiRipristino'

const NOW = new Date('2026-10-22T12:00:00.000Z')
const FILE = 'File non valido'
const FOTO = 'Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.'
const INTERNO = 'Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.'

function dati(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: { a: {}, b: {} },
    appointments: { p: {} },
    services: { s: {} },
    settings: { business: { salonName: 'Pelosetti' }, backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' } },
    closures: {},
    files: {},
    deletedDogs: { ids: ['x'], appointmentIds: [] },
    codiciCane: { next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } },
    fotoMancanti: [],
  }
}

async function zipDi(json: string, modifica?: (manifest: BackupManifest) => void, includiByte = false): Promise<Uint8Array> {
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(dati(), { now: NOW, salonId: 'salon', checksum, includiByte })
  modifica?.(manifest)
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  return zip.generateAsync({ type: 'uint8array' })
}

describe('leggiRipristino', () => {
  it('legge lo ZIP solo dati e ignora le altre voci', async () => {
    const json = canonicalJson(dati())
    const esito = await leggiRipristino(await zipDi(json))
    expect(esito.esito).toBe('solo-dati')
    if (esito.esito !== 'solo-dati') return
    expect(Object.keys(esito.bundle).sort()).toEqual(['appointments', 'closures', 'dogs', 'services', 'settings'])
    expect(Object.keys(esito.bundle.dogs)).toEqual(['a', 'b'])
    expect(esito.codici).toEqual({ next: 3, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
  })

  it('rifiuta checksum, formato, versione, tipo e codici', async () => {
    const json = canonicalJson(dati())
    const checksum = await sha256Hex(json)
    const spaced = await zipDi(`${json} `, (manifest) => { manifest.checksum['groomly-dati.json'] = checksum })
    expect(await leggiRipristino(spaced)).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const casi: Array<Uint8Array> = [
      await zipDi(json, (manifest) => { manifest.formato = 'altro' as 'groomly-backup' }),
      await zipDi(json, (manifest) => { manifest.versioneFormato = 2 as 1 }),
      await zipDi(json, (manifest) => { manifest.tipo = 'altro' as 'solo-dati' }),
      await zipDi(json, (manifest) => { delete (manifest.checksum as { 'groomly-dati.json'?: string })['groomly-dati.json'] }),
    ]
    for (const bytes of casi) {
      const esito = await leggiRipristino(bytes)
      expect(esito).toEqual({ esito: 'rifiutato', messaggio: FILE })
    }
    const rotto = dati()
    rotto.versioneFormato = 2 as 1
    const testoRotto = canonicalJson(rotto)
    expect(await leggiRipristino(await zipDi(testoRotto))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const chiusure = dati()
    chiusure.closures = [] as unknown as GroomlyDati['closures']
    expect(await leggiRipristino(await zipDi(canonicalJson(chiusure)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const next = dati()
    next.codiciCane = { next: 1.5, cartella: 'cani', byId: {} }
    expect(await leggiRipristino(await zipDi(canonicalJson(next)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const cartella = dati()
    cartella.codiciCane = { next: 1, cartella: 'gatti' as 'cani', byId: {} }
    expect(await leggiRipristino(await zipDi(canonicalJson(cartella)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const lista = dati()
    lista.codiciCane = { next: 1, cartella: 'cani', byId: [] as unknown as Record<string, string> }
    expect(await leggiRipristino(await zipDi(canonicalJson(lista)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const vuoto = dati()
    vuoto.codiciCane = { next: 1, cartella: 'cani', byId: { a: '' } }
    expect(await leggiRipristino(await zipDi(canonicalJson(vuoto)))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    const zip = new JSZip()
    zip.file('dati/groomly-dati.json', json)
    expect(await leggiRipristino(await zip.generateAsync({ type: 'uint8array' }))).toEqual({ esito: 'rifiutato', messaggio: FILE })
    expect(await leggiRipristino(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })

  it('il completo valido parla delle foto e quello col checksum rotto è un file non valido', async () => {
    const json = canonicalJson(dati())
    expect(await leggiRipristino(await zipDi(json, undefined, true))).toEqual({ esito: 'rifiutato', messaggio: FOTO })
    const guasto = dati()
    guasto.dogs = [] as unknown as GroomlyDati['dogs']
    expect(await leggiRipristino(await zipDi(canonicalJson(guasto), (manifest) => { manifest.tipo = 'completo'; manifest.fotoIncluse = true }))).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })

  it('il JSON interno non passa dal backup vecchio', async () => {
    const json = JSON.stringify({ versioneFormato: 1, dogs: { a: {} }, appointments: {}, services: {}, settings: {} })
    const esito = await leggiRipristino(new TextEncoder().encode(json))
    expect(esito).toEqual({ esito: 'rifiutato', messaggio: INTERNO })
  })

  it('il JSON di Esporta resta il bundle di oggi', async () => {
    const vecchio = { dogs: { a: {} }, appointments: {}, services: { s: {} }, settings: { business: { salonName: 'Pelosetti' } } }
    const esito = await leggiRipristino(new TextEncoder().encode(JSON.stringify(vecchio)))
    expect(esito.esito).toBe('vecchio')
    if (esito.esito !== 'vecchio') return
    expect(esito.bundle).toEqual(readRestoreBundle(vecchio))
    const rotto = new TextEncoder().encode('{')
    expect(await leggiRipristino(rotto)).toEqual({ esito: 'rifiutato', messaggio: FILE })
  })
})

describe('impostazioniRipristino', () => {
  it('tiene il salone del file e il backup del telefono', () => {
    const risultato = impostazioniRipristino(
      { business: { salonName: 'Dal file' }, tagSuggestions: ['ipo'], backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' }, passwordHash: 'dal-file' },
      { backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z', snapshot: { dogs: { a: {} } } }, passwordHash: 'dal-telefono' },
    )
    expect(risultato.business).toEqual({ salonName: 'Dal file' })
    expect(risultato.tagSuggestions).toEqual(['ipo'])
    expect(risultato.backup).toEqual({ autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z', snapshot: { dogs: { a: {} } } })
    expect(risultato.passwordHash).toBe('dal-telefono')
  })

  it('senza i blocchi del telefono non li prende dal file', () => {
    const risultato = impostazioniRipristino(
      { business: { salonName: 'Dal file' }, backup: { lastAt: '1999-01-01T00:00:00.000Z' }, passwordHash: 'dal-file' },
      {},
    )
    expect(risultato.business).toEqual({ salonName: 'Dal file' })
    expect('backup' in risultato).toBe(false)
    expect('passwordHash' in risultato).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/lib/leggiRipristino.test.ts`

Atteso: FAIL, modulo `./leggiRipristino` assente.

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/leggiRipristino.ts`.

```ts
import JSZip from 'jszip'
import type { CodiciCaneDoc } from './codiceCane'
import { sha256Hex } from './backupBundle'
import { readRestoreBundle, type BackupBundle } from './backupDoc'

const FILE = 'File non valido'
const FOTO = 'Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.'
const INTERNO = 'Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.'

export type EsitoRipristino =
  | { esito: 'vecchio'; bundle: BackupBundle }
  | { esito: 'solo-dati'; bundle: BackupBundle; codici: CodiciCaneDoc }
  | { esito: 'rifiutato'; messaggio: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function rifiuto(messaggio: string): EsitoRipristino {
  return { esito: 'rifiutato', messaggio }
}

function leggiCodici(value: unknown): CodiciCaneDoc | null {
  if (!isRecord(value)) return null
  const { next, cartella, byId } = value
  if (typeof next !== 'number' || !Number.isInteger(next) || next < 1) return null
  if (cartella !== 'cani' && cartella !== 'animali') return null
  if (!isRecord(byId)) return null
  const codes: Record<string, string> = {}
  for (const [id, code] of Object.entries(byId)) {
    if (typeof code !== 'string' || code.length === 0) return null
    codes[id] = code
  }
  return { next, cartella, byId: codes }
}

function bundleDati(value: Record<string, unknown>, codici: CodiciCaneDoc): { bundle: BackupBundle; codici: CodiciCaneDoc } | null {
  if (value.versioneFormato !== 1) return null
  if (!isRecord(value.dogs) || !isRecord(value.appointments) || !isRecord(value.services) || !isRecord(value.settings) || !isRecord(value.closures)) return null
  return {
    bundle: {
      dogs: value.dogs,
      appointments: value.appointments,
      services: value.services,
      settings: value.settings,
      closures: value.closures,
    },
    codici,
  }
}

async function leggiZip(bytes: Uint8Array): Promise<EsitoRipristino> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(bytes)
  } catch {
    return rifiuto(FILE)
  }
  const manifestFile = zip.file('dati/manifest.json')
  const datiFile = zip.file('dati/groomly-dati.json')
  if (!manifestFile || !datiFile) return rifiuto(FILE)
  const manifestText = await manifestFile.async('string')
  const json = await datiFile.async('string')
  let manifest: unknown
  try {
    manifest = JSON.parse(manifestText) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (!isRecord(manifest) || manifest.formato !== 'groomly-backup' || manifest.versioneFormato !== 1) return rifiuto(FILE)
  const checksums = manifest.checksum
  const checksum = isRecord(checksums) ? checksums['groomly-dati.json'] : undefined
  if (typeof checksum !== 'string' || await sha256Hex(json) !== checksum) return rifiuto(FILE)
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (!isRecord(parsed)) return rifiuto(FILE)
  const codici = leggiCodici(parsed.codiciCane)
  const pronto = codici ? bundleDati(parsed, codici) : null
  if (!pronto) return rifiuto(FILE)
  if (manifest.tipo === 'completo') return rifiuto(FOTO)
  if (manifest.tipo !== 'solo-dati') return rifiuto(FILE)
  return { esito: 'solo-dati', bundle: pronto.bundle, codici: pronto.codici }
}

function leggiJson(bytes: Uint8Array): EsitoRipristino {
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    return rifiuto(FILE)
  }
  if (isRecord(parsed) && 'versioneFormato' in parsed) return rifiuto(INTERNO)
  const bundle = readRestoreBundle(parsed)
  if (!bundle) return rifiuto(FILE)
  return { esito: 'vecchio', bundle }
}

export async function leggiRipristino(bytes: Uint8Array): Promise<EsitoRipristino> {
  if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) return leggiZip(bytes)
  return leggiJson(bytes)
}

export function impostazioniRipristino(dalFile: Record<string, unknown>, dalTelefono: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...dalFile }
  if (isRecord(dalTelefono.backup)) copy.backup = dalTelefono.backup
  else delete copy.backup
  if (typeof dalTelefono.passwordHash === 'string') copy.passwordHash = dalTelefono.passwordHash
  else delete copy.passwordHash
  return copy
}
```

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/lib/leggiRipristino.test.ts`

Atteso: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/leggiRipristino.ts src/lib/leggiRipristino.test.ts
git commit --only -m "feat: lettura dello ZIP solo dati per il ripristino" -- src/lib/leggiRipristino.ts src/lib/leggiRipristino.test.ts
```

---

### Task 2: Sostituzione dei codici cane

**Files:**
- Modify: `src/data/firebase/backupCollect.ts` (solo una funzione nuova in fondo)
- Modify: `src/data/firebase/backupCollect.test.ts` (import e due test in fondo al describe `raccogliBackup`)

**Interfaces:**
- Consumes: `transactionSalon` da `./client` (già importato), `salonRootPath` (già importato), `CodiciCaneDoc`.
- Produces: `scriviCodiciCane(codici: CodiciCaneDoc): Promise<void>`. Scrive `{ next, cartella, byId }` su `meta/codici-cani` del salone attivo. Non legge il documento precedente e non chiama `assegnaCodici`.

- [ ] **Step 1: Write the failing test**

In `src/data/firebase/backupCollect.test.ts` aggiungere `scriviCodiciCane` all'import da `./backupCollect`. Prima della chiusura del describe `raccogliBackup`, aggiungere:

```ts
  it('scriviCodiciCane sostituisce il documento senza unire i codici già presenti', async () => {
    fake.docs.set('salon/shared/meta/codici-cani', { next: 9, cartella: 'cani', byId: { vecchio: 'C0009' } })
    await scriviCodiciCane({ next: 2, cartella: 'animali', byId: { d1: 'C0001' } })
    expect(fake.docs.get('salon/shared/meta/codici-cani')).toEqual({ next: 2, cartella: 'animali', byId: { d1: 'C0001' } })
    expect(fake.writes).toEqual(['salon/shared/meta/codici-cani'])
  })

  it('scriviCodiciCane scrive sotto il salone attivo', async () => {
    bindSalon('uid-9')
    await scriviCodiciCane({ next: 1, cartella: 'cani', byId: {} })
    expect(fake.writes).toEqual(['salons/uid-9/meta/codici-cani'])
    expect(fake.docs.has('salon/shared/meta/codici-cani')).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/data/firebase/backupCollect.test.ts`

Atteso: FAIL, `scriviCodiciCane` non esportato.

- [ ] **Step 3: Write minimal implementation**

In fondo a `src/data/firebase/backupCollect.ts`:

```ts
export async function scriviCodiciCane(codici: CodiciCaneDoc): Promise<void> {
  salonRootPath()
  await transactionSalon(async (tx) => {
    tx.set('meta', 'codici-cani', { next: codici.next, cartella: codici.cartella, byId: { ...codici.byId } })
  })
}
```

Non aggiungere il controllo di rete del raccoglitore: l'assenza di rete la decide la pagina, col messaggio «Connessione assente».

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/data/firebase/backupCollect.test.ts`

Atteso: PASS, compresi i test già presenti del raccoglitore.

- [ ] **Step 5: Commit**

```powershell
git add -- src/data/firebase/backupCollect.ts src/data/firebase/backupCollect.test.ts
git commit --only -m "feat: sostituzione dei codici cane dal ripristino" -- src/data/firebase/backupCollect.ts src/data/firebase/backupCollect.test.ts
```

---

### Task 3: Pulsante Ripristina

**Files:**
- Modify: `src/pages/SettingsPage.tsx` (`onRestoreFile`, `confirmRestore`, lo stato `pending`, `counts`, `accept`)
- Modify: `src/pages/SettingsPage.test.tsx` (mock, un toast esistente, i test nuovi)

**Interfaces:**
- Consumes: `leggiRipristino`, `impostazioniRipristino`, `scriviCodiciCane(codici)`, `replaceCloudData`, `restoreBackup`, `backupCounts`.
- Produces: il selettore accetta anche lo ZIP. Il foglio e i testi restano quelli di oggi. La conferma locale non chiama `scriviCodiciCane`. La conferma cloud chiama prima `replaceCloudData` e poi `scriviCodiciCane`.

`src/pages/SettingsPage.test.tsx` sostituisce l'intero modulo `backupCollect` con un falso. Senza `scriviCodiciCane` in quel falso, la pagina non può chiamarlo.

- [ ] **Step 1: Write the failing test**

Nel mock in cima a `src/pages/SettingsPage.test.tsx`:

```ts
const { raccogliBackup, scriviCodiciCane } = vi.hoisted(() => ({
  raccogliBackup: vi.fn(),
  scriviCodiciCane: vi.fn(),
}))

vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup, scriviCodiciCane }))
```

Dentro `beforeEach`, dopo `localStorage.clear()`:

```ts
scriviCodiciCane.mockReset()
```

Nel test «un file senza settings non cancella groomly.session e non sostituisce i cani», la riga del toast diventa:

```ts
expect(await screen.findByRole('status')).toHaveTextContent('File non valido')
```

Il file senza `settings` non è più «Salvataggio non riuscito»: `leggiRipristino` lo rifiuta come file non valido. Session e cani restano le asserzioni già scritte.

Dopo quel test, aggiungere questi. `datiRegistro`, `canonicalJson`, `sha256Hex`, `buildManifest` e `JSZip` sono già importati nel file.

```ts
async function fileZip(includiByte: boolean, settings: Record<string, unknown>) {
  const base = datiRegistro()
  base.dogs = { a: {}, b: {} }
  base.settings = settings
  base.codiciCane = { next: 4, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } }
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte })
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', 'ciao\n')
  zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('dati/groomly-dati.json', json)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], 'backup.zip', { type: 'application/zip' })
}

it('lo ZIP solo dati in locale rimette i cani e tiene il backup del telefono', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const phone = getSettings(account.uid)
  writeJson(storageKeys.settings(account.uid), {
    ...phone,
    backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' },
  })
  createDog(account.uid, dog('Bobi'))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  expect(screen.getByLabelText('Scegli backup').getAttribute('accept')).toBe('application/json,.json,application/zip,.zip')
  const file = await fileZip(false, {
    ...phone,
    business: { ...phone.business, salonName: 'Dal file' },
    backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z', snapshot: { dogs: {} } },
  })
  await user.upload(screen.getByLabelText('Scegli backup'), file)
  const preview = await screen.findByRole('dialog', { name: 'Ripristina' })
  expect(preview).toHaveTextContent('2 cani, 0 appuntamenti, 0 servizi')
  expect(preview).toHaveTextContent('Sostituisce i dati di questo salone.')
  await user.click(screen.getByRole('button', { name: 'Annulla' }))
  expect(scriviCodiciCane).not.toHaveBeenCalled()
  expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).not.toEqual(['a', 'b'])
  await user.upload(screen.getByLabelText('Scegli backup'), file)
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  await waitFor(() => {
    expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
  })
  const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
  expect(stored?.backup).toEqual({ autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' })
  expect(stored?.business.salonName).toBe('Dal file')
  expect(scriviCodiciCane).not.toHaveBeenCalled()
})

it('lo ZIP completo, il checksum rotto e il JSON interno non scrivono', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  createDog(account.uid, dog('Bobi'))
  const dogs = localStorage.getItem(storageKeys.dogs(account.uid))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }))
  expect(await screen.findByText('Questo archivio ha le foto: il ripristino delle foto arriva dopo. Per i dati usa Backup ZIP.')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const base = datiRegistro()
  const json = canonicalJson(base)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum: '0'.repeat(64), includiByte: false })
  const zip = new JSZip()
  zip.file('dati/manifest.json', JSON.stringify(manifest))
  zip.file('dati/groomly-dati.json', json)
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  await user.upload(screen.getByLabelText('Scegli backup'), new File([bytes], 'rotto.zip', { type: 'application/zip' }))
  expect(await screen.findByText('File non valido')).toBeInTheDocument()
  const interno = new File([JSON.stringify({ versioneFormato: 1, dogs: { a: {} }, appointments: {}, services: {}, settings: {} })], 'groomly-dati.json', { type: 'application/json' })
  await user.upload(screen.getByLabelText('Scegli backup'), interno)
  expect(await screen.findByText('Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.')).toBeInTheDocument()
  expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogs)
  expect(scriviCodiciCane).not.toHaveBeenCalled()
})
```

Il test cloud sta nello stesso file e usa il vero `leggiRipristino`. Forza il ramo cloud solo al momento del clic, con spie sulle funzioni già importate dalla pagina.

```ts
it('in cloud la conferma scrive i dati e poi i codici', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const phone = getSettings(account.uid)
  writeJson(storageKeys.settings(account.uid), {
    ...phone,
    backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' },
  })
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, {
    business: { salonName: 'Dal file' },
    backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' },
  }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  const order: string[] = []
  const replace = vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
  scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
  expect(order).toEqual(['dati', 'codici'])
  const written = replace.mock.calls[0]?.[1] as { settings?: { backup?: { lastAt?: string } } }
  expect(written.settings?.backup?.lastAt).toBe('2026-10-22T10:00:00.000Z')
  expect(scriviCodiciCane).toHaveBeenCalledWith({ next: 4, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('se i codici falliscono il foglio resta aperto', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
  scriviCodiciCane.mockRejectedValue(new Error('codici'))
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
  expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
  expect(replace).toHaveBeenCalledOnce()
  expect(scriviCodiciCane).toHaveBeenCalledOnce()
})

it('se la sostituzione cloud fallisce i codici non si scrivono', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  vi.spyOn(client, 'replaceCloudData').mockRejectedValue(new Error('dati'))
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
  expect(scriviCodiciCane).not.toHaveBeenCalled()
})

it('senza rete non scrive dati né codici', async () => {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
  const enabled = await import('../data/firebase/enabled')
  const client = await import('../data/firebase/client')
  vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
  vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
  const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
  await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
  expect(replace).not.toHaveBeenCalled()
  expect(scriviCodiciCane).not.toHaveBeenCalled()
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
})
```

- [ ] **Step 2: Run test to verify it fails**

`npx vitest run src/pages/SettingsPage.test.tsx`

Atteso: FAIL. Lo ZIP non apre il foglio, oppure il toast del file senza settings è ancora «Salvataggio non riuscito».

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx`:

- Aggiungere l'import di `CodiciCaneDoc` da `../lib/codiceCane`.
- Togliere `readRestoreBundle` dall'import di `backupDoc` se non resta usato.
- Sostituire lo stato `pending` con:

```ts
type RipristinoPronto = { bundle: BackupBundle; codici: CodiciCaneDoc | null }
const [pending, setPending] = useState<RipristinoPronto | null>(null)
```

- `counts` diventa `pending ? backupCounts(pending.bundle) : null`.
- `accept` dell'input diventa `application/json,.json,application/zip,.zip`.
- Sostituire `onRestoreFile` e `confirmRestore` con:

```ts
async function onRestoreFile(file: File) {
  try {
    const { leggiRipristino } = await import('../lib/leggiRipristino')
    const esito = await leggiRipristino(new Uint8Array(await file.arrayBuffer()))
    if (esito.esito === 'rifiutato') {
      toast.show(esito.messaggio, 'plain')
      return
    }
    setPending({ bundle: esito.bundle, codici: esito.esito === 'solo-dati' ? esito.codici : null })
  } catch {
    toast.show('File non valido', 'plain')
  }
}

async function confirmRestore() {
  if (!uid || !pending) return
  const { impostazioniRipristino } = await import('../lib/leggiRipristino')
  const bundle = {
    ...pending.bundle,
    settings: impostazioniRipristino(
      pending.bundle.settings as Record<string, unknown>,
      settings as unknown as Record<string, unknown>,
    ),
  }
  if (firebaseEnabled() && !readsLocal()) {
    if (restoringRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    const codici = pending.codici
    restoringRef.current = true
    setRestoring(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.replaceCloudData(uid, bundle)
      if (codici) {
        const { scriviCodiciCane } = await import('../data/firebase/backupCollect')
        await scriviCodiciCane(codici)
      }
      toast.show('Ripristinato', 'plain')
      setPending(null)
    } catch {
      toast.show('Ripristino incompleto, riprova', 'plain')
    } finally {
      restoringRef.current = false
      setRestoring(false)
    }
    return
  }
  try {
    restoreBackup(uid, bundle)
    reload()
    setPending(null)
  } catch {
    toast.show('Salvataggio non riuscito', 'plain')
  }
}
```

Non aggiornare `backup.lastAt`. Non chiamare `scriviCodiciCane` nel ramo locale. Non aggiungere uno stato di attesa per la lettura. Il foglio, «Sostituisce i dati di questo salone.» e i due pulsanti restano come sono.

- [ ] **Step 4: Run test to verify it passes**

`npx vitest run src/pages/SettingsPage.test.tsx`

Atteso: PASS, compresi Registro Excel, Backup ZIP, Backup completo e il ripristino del JSON vecchio.

Poi `npm test`. Atteso: la suite intera verde. Se un test di `LoginPage` va in timeout una volta e al rilancio passa, il rilancio è il risultato che conta. Non si modifica `LoginPage`.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit --only -m "feat: Ripristina legge lo ZIP solo dati" -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
```

---

### Task 4: Pubblicazione 1.1.73

Solo dopo che il task 3 ha la suite verde. La scheda è cambiata: si alza la patch da `1.1.72` a `1.1.73`. `versionCode` diventa `10173`.

- [ ] **Step 1: Alzare la versione negli stessi quattro punti**

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.73'`
- `package.json` → `"version": "1.1.73"`
- `android/app/build.gradle` → `versionName "1.1.73"` e `versionCode 10173`
- `hosting/release.json` → `version` `1.1.73`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.73/groomly.apk`, e nelle note la frase «In Dati e backup, Ripristina legge anche lo ZIP solo dati e rimette i codici dei cani.»

Non modificare `enabled.ts`, `client.ts`, `vite.config.ts`, `firebaseEnv.test.ts`.

Se il worktree non ha `.env.local`, copiarlo da `D:\Groomly\.env.local`. Non committarlo.

- [ ] **Step 2: Verificare e costruire**

`npm test`, poi `npm run build`, `npx cap sync android`. Se il sync sporca solo i fine riga di `android/app/capacitor.build.gradle` o `android/capacitor.settings.gradle`, ripristinarli con `git checkout --` e non committarli.

In `android`: `.\gradlew assembleDebug`. Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del worktree e in `D:\Groomly\groomly.apk`, fuori da `hosting/` e fuori dal commit.

Prima del commit, controllare l'APK. Se manca la chiave o la versione, fermarsi e non pubblicare.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("groomly.apk")
$js = $zip.Entries | Where-Object { $_.FullName -match 'assets/public/assets/index-.*\.js$' } | Select-Object -First 1
$reader = New-Object System.IO.StreamReader($js.Open())
$text = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
if (-not $text.Contains('AIza')) { throw 'APK senza chiave Firebase' }
if (-not $text.Contains('1.1.73')) { throw 'APK senza versione 1.1.73' }
```

- [ ] **Step 3: Commit, merge, push e release**

Il commit della versione si fa nel worktree. Poi, in `D:\Groomly` sul ramo `feat/listino-razze`, `git merge --ff-only feat/ripristino-zip`. Non includere le modifiche aperte su `D:\Groomly`.

```powershell
git add -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit --only -m "release: 1.1.73, Ripristina legge lo ZIP solo dati" -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
```

Da `D:\Groomly`, dopo il fast-forward:

```powershell
git push origin HEAD
gh release create v1.1.73 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.73" --notes "In Dati e backup, Ripristina legge anche lo ZIP solo dati e rimette i codici dei cani."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook. Non cancellare il worktree.
