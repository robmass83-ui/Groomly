# Raccoglitore del backup — piano

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Eseguito — vedi commit f213d9c

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produrre `groomly-dati.json` e `manifest.json` del salone aperto, con codici cane stabili, byte ricomposti e percorsi, senza cambiare schermate.

**Architecture:** Funzioni pure in `src/lib` (nomi, codici, fuso di Roma, byte, JSON). `src/data/firebase/backupCollect.ts` legge solo tramite `salonRootPath` e `salonDocPath`, scrive soltanto `meta/codici-cani`, e consegna i byte a `onFile` uno alla volta. Nessuna pagina importa questi moduli.

**Tech Stack:** TypeScript, Vitest, happy-dom, Firestore già presente. Nessuna dipendenza nuova. Shell: PowerShell, un comando per volta, senza `&&`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`. Quella specifica prevale su `docs/Groomly_Backup_PIANO.md`.
- Nessuna schermata cambia. `SettingsPage` non importa il raccoglitore.
- Non modificare `uploadBackupFile`, `enqueueBackup`, `runCloudDailyBackup`, `triggerDownload`, `maybeDailyBackup`, `replaceCloudData`.
- Il salone si legge solo con `salonRootPath` e `salonDocPath`. Nessun letterale `salon/shared` o `salons/` nel raccoglitore.
- I byte stanno in `files/{id}/full/data` se `chunkCount` è 0, altrimenti in `chunks/0` … `chunks/{n-1}`. `thumb` non è il file. `image/webp` resta `.webp`. Nessuna ricodifica.
- `onFile(meta, bytes, percorsoBackup)` si attende prima del successivo. Al massimo tre letture in corso. Senza `onFile` i byte si verificano e si scartano. Il JSON non contiene byte.
- Un file citato più volte ha un solo `percorsoBackup`: appuntamento, poi galleria, poi profilo, poi logo, poi file di listino, poi `file-sciolti`. Gli altri percorsi stanno in `altriRiferimenti`.
- Giorno cartella e `creatoIl` usano `Europe/Rome`. `2026-10-22T21:30:00.000Z` è il giorno `2026-10-22` e `creatoIl` è `2026-10-22T23:30:00+02:00`.
- Lo SHA-256 è dei byte UTF-8 della stringa canonica di `groomly-dati.json`. Il ripristino futuro, non questo piano, verificherà quei byte così come letti dal file, senza un nuovo `JSON.stringify`.
- `settings.backup` non entra nel JSON e il documento impostazioni non si riscrive.
- Un cane con documento e id in lapide entra in `dogs` e riceve un codice. Un id solo in lapide, senza documento, no.
- Senza rete: `AppError` codice `backup_offline`, messaggio `Serve la connessione per creare il backup`. Non usare `auth_offline`.
- `members`, `accounts` e token non si leggono.
- Non alzare `APP_VERSION` e non pubblicare: il raccoglitore non è collegato all’app.
- I test del task passano prima del commit. Comando: `npx vitest run <file>`.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.

---

### Task 1: Nomi sicuri

**Files:**
- Create: `src/lib/nomeSicuro.ts`
- Create: `src/lib/nomeSicuro.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `nomeSicuro(testo: string): string`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/nomeSicuro.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { nomeSicuro } from './nomeSicuro'

describe('nomeSicuro', () => {
  it('sostituisce il più e lascia gli accenti', () => {
    expect(nomeSicuro('Bagno + taglio')).toBe('Bagno e taglio')
    expect(nomeSicuro('Città')).toBe('Città')
  })

  it('toglie i simboli vietati e comprime gli spazi', () => {
    expect(nomeSicuro('a<b>c:d"e/f\\g|h?i*j')).toBe('abcdefghij')
    expect(nomeSicuro('  ciao   mondo  ')).toBe('ciao mondo')
  })

  it('tiene le emoji e taglia a 60 senza spezzare un surrogato', () => {
    expect(nomeSicuro('cane 🐕')).toBe('cane 🐕')
    const lungo = `${'a'.repeat(59)}😀`
    expect(nomeSicuro(lungo)).toBe('a'.repeat(59))
    expect(nomeSicuro('x'.repeat(80)).length).toBeLessThanOrEqual(60)
  })

  it('vuoto, soli punti e nomi riservati', () => {
    expect(nomeSicuro('')).toBe('senza-nome')
    expect(nomeSicuro('...')).toBe('senza-nome')
    expect(nomeSicuro('aux')).toBe('aux_')
    expect(nomeSicuro('COM1')).toBe('COM1_')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nomeSicuro.test.ts`

Expected: FAIL, cannot find module `./nomeSicuro`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/nomeSicuro.ts`:

```ts
const VIETATI = /[<>:"/\\|?*\u0000-\u001F\u007F]/g
const RISERVATI = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

export function nomeSicuro(testo: string): string {
  let value = testo.replaceAll('+', 'e').replace(VIETATI, '')
  value = value.replace(/\s+/g, ' ').trim().replace(/[ .]+$/g, '')
  if (value === '') value = 'senza-nome'
  if (RISERVATI.test(value)) value = `${value}_`
  if (value.length > 60) {
    value = value.slice(0, 60)
    const last = value.charCodeAt(value.length - 1)
    if (last >= 0xD800 && last <= 0xDBFF) value = value.slice(0, -1)
    value = value.replace(/[ .]+$/g, '')
    if (value === '') value = 'senza-nome'
  }
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/nomeSicuro.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/nomeSicuro.ts src/lib/nomeSicuro.test.ts
git commit -m "feat: nomi di file sicuri per il backup"
```

---

### Task 2: Giorno e ora di Roma

**Files:**
- Create: `src/lib/romeTime.ts`
- Create: `src/lib/romeTime.test.ts`

**Interfaces:**
- Consumes: niente
- Produces: `romeDay(date: Date): string`, `romeIso(date: Date): string`

- [ ] **Step 1: Write the failing test**

Creare `src/lib/romeTime.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { romeDay, romeIso } from './romeTime'

describe('Europe/Rome', () => {
  it('le 23:30 italiane restano nello stesso giorno anche visto da UTC+3', () => {
    const instant = new Date('2026-10-22T21:30:00.000Z')
    expect(romeDay(instant)).toBe('2026-10-22')
    expect(romeIso(instant)).toBe('2026-10-22T23:30:00+02:00')
  })

  it('in inverno l’offset è +01:00', () => {
    const instant = new Date('2026-01-15T12:00:00.000Z')
    expect(romeDay(instant)).toBe('2026-01-15')
    expect(romeIso(instant)).toBe('2026-01-15T13:00:00+01:00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/romeTime.test.ts`

Expected: FAIL, cannot find module `./romeTime`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/romeTime.ts`. `hourCycle: 'h23'` su qualche motore scrive `24` a mezzanotte: in quel caso l’ora diventa `00`.

```ts
const ROME = 'Europe/Rome'

function parts(date: Date, time: boolean): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(time ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' as const, timeZoneName: 'longOffset' as const } : {}),
  }).formatToParts(date)
}

function pick(list: Intl.DateTimeFormatPart[], type: string): string {
  return list.find((part) => part.type === type)?.value ?? ''
}

export function romeDay(date: Date): string {
  const list = parts(date, false)
  return `${pick(list, 'year')}-${pick(list, 'month')}-${pick(list, 'day')}`
}

export function romeIso(date: Date): string {
  const list = parts(date, true)
  let hour = pick(list, 'hour')
  if (hour === '24') hour = '00'
  const offset = pick(list, 'timeZoneName').replace('GMT', '') || '+00:00'
  return `${pick(list, 'year')}-${pick(list, 'month')}-${pick(list, 'day')}T${hour}:${pick(list, 'minute')}:${pick(list, 'second')}${offset}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/romeTime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/romeTime.ts src/lib/romeTime.test.ts
git commit -m "feat: giorno e ora del backup fissi su Europe/Rome"
```

---

### Task 3: Codici cane

**Files:**
- Create: `src/lib/codiceCane.ts`
- Create: `src/lib/codiceCane.test.ts`

**Interfaces:**
- Consumes: niente
- Produces:

```ts
export type CodiciCaneDoc = { next: number; cartella: 'cani' | 'animali'; byId: Record<string, string> }
export type CaneCodice = { id: string; createdAt?: number; species?: string }
export function formatCodice(n: number): string
export function assegnaCodici(doc: CodiciCaneDoc | null, cani: readonly CaneCodice[]): { doc: CodiciCaneDoc; changed: boolean }
```

- [ ] **Step 1: Write the failing test**

Creare `src/lib/codiceCane.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assegnaCodici, formatCodice } from './codiceCane'

describe('assegnaCodici', () => {
  it('formatta almeno quattro cifre e non tronca oltre 9999', () => {
    expect(formatCodice(1)).toBe('C0001')
    expect(formatCodice(10000)).toBe('C10000')
  })

  it('assegna in ordine di creazione e non rinumera', () => {
    const first = assegnaCodici(null, [
      { id: 'b', createdAt: 2, species: 'cane' },
      { id: 'a', createdAt: 1, species: 'cane' },
    ])
    expect(first.doc.byId).toEqual({ a: 'C0001', b: 'C0002' })
    expect(first.doc.next).toBe(3)
    expect(first.doc.cartella).toBe('cani')
    expect(first.changed).toBe(true)
    const second = assegnaCodici(first.doc, [
      { id: 'a', createdAt: 1, species: 'cane' },
      { id: 'b', createdAt: 2, species: 'cane' },
      { id: 'c', createdAt: 3, species: 'gatto' },
    ])
    expect(second.doc.byId.a).toBe('C0001')
    expect(second.doc.byId.c).toBe('C0003')
    expect(second.doc.cartella).toBe('cani')
    expect(assegnaCodici(second.doc, [
      { id: 'a', createdAt: 1 },
      { id: 'b', createdAt: 2 },
      { id: 'c', createdAt: 3 },
    ]).changed).toBe(false)
  })

  it('non riusa un codice di un cane sparito e ripara next', () => {
    const kept = assegnaCodici({ next: 1, cartella: 'cani', byId: { vecchio: 'C0005' } }, [
      { id: 'nuovo', createdAt: 1, species: 'cane' },
    ])
    expect(kept.doc.byId.vecchio).toBe('C0005')
    expect(kept.doc.byId.nuovo).toBe('C0006')
    expect(kept.doc.next).toBe(7)
  })

  it('trecento cani ricevono codici univoci', () => {
    const cani = Array.from({ length: 300 }, (_, index) => ({ id: `d${index}`, createdAt: index, species: 'cane' as const }))
    const assigned = assegnaCodici(null, cani)
    const codes = Object.values(assigned.doc.byId)
    expect(new Set(codes).size).toBe(300)
    expect(assigned.doc.byId.d0).toBe('C0001')
    expect(assigned.doc.byId.d299).toBe('C0300')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/codiceCane.test.ts`

Expected: FAIL, cannot find module `./codiceCane`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/codiceCane.ts`:

```ts
export type CodiciCaneDoc = {
  next: number
  cartella: 'cani' | 'animali'
  byId: Record<string, string>
}

export type CaneCodice = { id: string; createdAt?: number; species?: string }

export function formatCodice(n: number): string {
  return `C${String(n).padStart(4, '0')}`
}

function numeroDi(code: string): number | null {
  const match = /^C(\d+)$/.exec(code)
  if (!match) return null
  const value = Number(match[1])
  return Number.isSafeInteger(value) ? value : null
}

export function assegnaCodici(doc: CodiciCaneDoc | null, cani: readonly CaneCodice[]): { doc: CodiciCaneDoc; changed: boolean } {
  const byId = { ...(doc?.byId ?? {}) }
  const inputNext = typeof doc?.next === 'number' && doc.next >= 1 ? doc.next : 1
  let next = inputNext
  let max = 0
  for (const code of Object.values(byId)) {
    const value = numeroDi(code)
    if (value !== null && value > max) max = value
  }
  if (next < max + 1) next = max + 1
  const pending = cani.filter((dog) => byId[dog.id] === undefined).sort((a, b) => {
    const left = a.createdAt ?? Number.POSITIVE_INFINITY
    const right = b.createdAt ?? Number.POSITIVE_INFINITY
    if (left !== right) return left - right
    return a.id.localeCompare(b.id)
  })
  for (const dog of pending) {
    byId[dog.id] = formatCodice(next)
    next += 1
  }
  const cartella = doc?.cartella ?? (cani.some((dog) => dog.species && dog.species !== 'cane') ? 'animali' : 'cani')
  const changed = doc === null
    ? cani.length > 0
    : next !== inputNext || pending.length > 0 || cartella !== doc.cartella
  return { doc: { next, cartella, byId }, changed }
}
```

Un documento assente e zero cani ha `changed: false`: non si crea il documento. Con almeno un cane, `changed` è true.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/codiceCane.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/codiceCane.ts src/lib/codiceCane.test.ts
git commit -m "feat: codici cane stabili in un documento a parte"
```

---

### Task 4: Ricomposizione dei byte

**Files:**
- Create: `src/lib/backupFile.ts`
- Create: `src/lib/backupFile.test.ts`

**Interfaces:**
- Consumes: `joinChunks` da `src/lib/fileBytes.ts`
- Produces:

```ts
export type MotivoMancante = 'assente' | 'chunk-assente' | 'dimensione' | 'illeggibile'
export function estensioneDaMime(mime: string): string
export function stimaByte(files: readonly { byteSize?: number }[]): number
export function ricomponiFile(input: {
  chunkCount: number
  byteSize?: number
  parts: ReadonlyArray<Uint8Array | null>
}): { ok: true; bytes: Uint8Array } | { ok: false; motivo: MotivoMancante; byteSize?: number; lunghezza?: number }
```

- [ ] **Step 1: Write the failing test**

Creare `src/lib/backupFile.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { estensioneDaMime, ricomponiFile, stimaByte } from './backupFile'

describe('backupFile', () => {
  it('un webp intero resta webp e la stima non legge i byte', () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const done = ricomponiFile({ chunkCount: 0, byteSize: 4, parts: [bytes] })
    expect(done).toEqual({ ok: true, bytes })
    expect(estensioneDaMime('image/webp')).toBe('.webp')
    expect(estensioneDaMime('image/jpeg')).toBe('.jpg')
    expect(stimaByte([{ byteSize: 4 }, {}])).toBe(4)
  })

  it('concatena i chunk nell’ordine degli indici', () => {
    const done = ricomponiFile({
      chunkCount: 3,
      byteSize: 6,
      parts: [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5, 6])],
    })
    expect(done.ok).toBe(true)
    if (done.ok) expect(Array.from(done.bytes)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('dimensione diversa o pezzo mancante non lancia', () => {
    expect(ricomponiFile({ chunkCount: 0, byteSize: 3, parts: [new Uint8Array([1])] })).toMatchObject({ ok: false, motivo: 'dimensione', lunghezza: 1 })
    expect(ricomponiFile({ chunkCount: 0, byteSize: 1, parts: [null] })).toMatchObject({ ok: false, motivo: 'assente' })
    expect(ricomponiFile({ chunkCount: 2, byteSize: 2, parts: [new Uint8Array([1]), null] })).toMatchObject({ ok: false, motivo: 'chunk-assente' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backupFile.test.ts`

Expected: FAIL, cannot find module `./backupFile`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/backupFile.ts`:

```ts
import { joinChunks } from './fileBytes'

export type MotivoMancante = 'assente' | 'chunk-assente' | 'dimensione' | 'illeggibile'

const NOTE = {
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
} as const

export function estensioneDaMime(mime: string): string {
  const known = NOTE[mime as keyof typeof NOTE]
  if (known) return known
  const sub = mime.split('/')[1] ?? ''
  return /^[a-z0-9]+$/.test(sub) ? `.${sub}` : '.bin'
}

export function stimaByte(files: readonly { byteSize?: number }[]): number {
  return files.reduce((sum, file) => sum + (typeof file.byteSize === 'number' ? file.byteSize : 0), 0)
}

function esito(bytes: Uint8Array, byteSize: number | undefined) {
  if (typeof byteSize === 'number' && bytes.byteLength !== byteSize) {
    return { ok: false as const, motivo: 'dimensione' as const, byteSize, lunghezza: bytes.byteLength }
  }
  return { ok: true as const, bytes }
}

export function ricomponiFile(input: {
  chunkCount: number
  byteSize?: number
  parts: ReadonlyArray<Uint8Array | null>
}): { ok: true; bytes: Uint8Array } | { ok: false; motivo: MotivoMancante; byteSize?: number; lunghezza?: number } {
  try {
    if (input.chunkCount <= 0) {
      const only = input.parts[0]
      if (!only) return { ok: false, motivo: 'assente', byteSize: input.byteSize }
      return esito(only, input.byteSize)
    }
    const parts: Uint8Array[] = []
    for (let index = 0; index < input.chunkCount; index += 1) {
      const part = input.parts[index]
      if (!part) return { ok: false, motivo: 'chunk-assente', byteSize: input.byteSize }
      parts.push(part)
    }
    return esito(joinChunks(parts), input.byteSize)
  } catch {
    return { ok: false, motivo: 'illeggibile', byteSize: input.byteSize }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backupFile.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/backupFile.ts src/lib/backupFile.test.ts
git commit -m "feat: ricompone i file del backup senza cambiarne il mime"
```

---

### Task 5: Percorsi, JSON canonico e manifest

**Files:**
- Create: `src/lib/backupBundle.ts`
- Create: `src/lib/backupBundle.test.ts`

**Interfaces:**
- Consumes: `nomeSicuro`, `romeDay`, `romeIso`, `estensioneDaMime`, `CodiciCaneDoc`, `APP_VERSION` da `src/lib/appVersion.ts`, `readRestoreBundle` da `src/lib/backupDoc.ts`
- Produces: i tipi `BackupFileMeta`, `GroomlyDati`, `BackupManifest`, e le funzioni `cartellaCane`, `scegliPercorsi`, `giornoAppuntamento`, `settingsSenzaBackup`, `canonicalJson`, `sha256Hex`, `buildManifest`, `contaClienti`

`BackupFileMeta` è la voce `files[id]` della specifica, `altriRiferimenti` opzionale.

- [ ] **Step 1: Write the failing test**

Creare `src/lib/backupBundle.test.ts`. Il test del file doppio e quello delle 23:30 stanno qui, sulle funzioni pure. `sha256Hex` si applica ai byte UTF-8 della stringa, non a un secondo `JSON.stringify` di un oggetto riletto.

```ts
import { describe, expect, it } from 'vitest'
import { readRestoreBundle } from './backupDoc'
import {
  cartellaCane,
  contaClienti,
  canonicalJson,
  giornoAppuntamento,
  scegliPercorsi,
  settingsSenzaBackup,
  sha256Hex,
  buildManifest,
  type GroomlyDati,
} from './backupBundle'

describe('percorsi', () => {
  it('un file che è profilo e foto di appuntamento si scrive una volta, nella cartella della visita', () => {
    const chosen = scegliPercorsi([
      { fileId: 'f1', ruolo: 'profilo', path: 'cani/C0001 - Fido/profilo.webp', ordine: 'profilo' },
      { fileId: 'f1', ruolo: 'appuntamento', path: 'cani/C0001 - Fido/2026-10-22 - Bagno/prima-01.webp', ordine: '2026-10-22T21:30:00.000Z' },
    ])
    expect(chosen.get('f1')).toEqual({
      percorsoBackup: 'cani/C0001 - Fido/2026-10-22 - Bagno/prima-01.webp',
      altriRiferimenti: ['cani/C0001 - Fido/profilo.webp'],
    })
  })

  it('le 23:30 italiane restano nel giorno di Roma', () => {
    expect(giornoAppuntamento(new Date('2026-10-22T21:30:00.000Z'))).toBe('2026-10-22')
    expect(cartellaCane('C0001', { name: 'Fido', breed: 'Barboncino', contact: { name: 'Rossi Mario' } })).toBe('C0001 - Fido - Barboncino (Rossi Mario)')
  })
})

describe('json', () => {
  it('è un superinsieme leggibile dal ripristino attuale, senza settings.backup', () => {
    const settings = settingsSenzaBackup({
      business: { salonName: 'Pelosetti', name: 'Laura' },
      backup: { lastAt: '2026-10-19T18:50:25.964Z', autoDaily: true },
    })
    expect(settings.backup).toBeUndefined()
    const dati: GroomlyDati = {
      versioneFormato: 1,
      dogs: { d1: { id: 'd1', name: 'Fido', photo: 'file:f1', contact: { name: 'Ada', phone: '333 111' }, contacts: [] } },
      appointments: {},
      services: {},
      settings,
      closures: {},
      files: {},
      deletedDogs: { ids: ['d1'], appointmentIds: [] },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
      fotoMancanti: [],
    }
    const json = canonicalJson(dati)
    expect(readRestoreBundle(JSON.parse(json))).not.toBeNull()
    expect(json).not.toContain('autoDaily')
    expect(json).toContain('"photo":"file:f1"')
    return sha256Hex(json).then((sum) => {
      expect(sum).toMatch(/^[0-9a-f]{64}$/)
      const manifest = buildManifest(dati, { now: new Date('2026-10-22T21:30:00.000Z'), salonId: 'shared', checksum: sum, includiByte: true })
      expect(manifest.creatoIl).toBe('2026-10-22T23:30:00+02:00')
      expect(manifest.checksum['groomly-dati.json']).toBe(sum)
      expect(contaClienti(dati.dogs)).toBe(1)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backupBundle.test.ts`

Expected: FAIL, cannot find module `./backupBundle`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/backupBundle.ts` con il codice qui sotto. `BackupFileMeta` e `GroomlyDati` sono i tipi della specifica (`altriRiferimenti` opzionale, `esito` `'ok' | 'mancante'`). `BackupManifest` è il manifest della specifica.

```ts
import { APP_VERSION } from './appVersion'
import type { CodiciCaneDoc } from './codiceCane'
import { nomeSicuro } from './nomeSicuro'
import { romeDay, romeIso } from './romeTime'

const RANGO = { appuntamento: 0, galleria: 1, profilo: 2, logo: 3, listino: 4, sciolto: 5 } as const

export type RiferimentoFile = {
  fileId: string
  ruolo: keyof typeof RANGO
  path: string
  ordine: string
}

export function scegliPercorsi(refs: readonly RiferimentoFile[]) {
  const grouped = new Map<string, RiferimentoFile[]>()
  for (const ref of refs) grouped.set(ref.fileId, [...(grouped.get(ref.fileId) ?? []), ref])
  const chosen = new Map<string, { percorsoBackup: string; altriRiferimenti?: string[] }>()
  for (const [fileId, list] of grouped) {
    const ordered = [...list].sort((a, b) => RANGO[a.ruolo] - RANGO[b.ruolo] || a.ordine.localeCompare(b.ordine))
    const primary = ordered[0]?.path ?? ''
    const others = [...new Set(ordered.slice(1).map((item) => item.path).filter((path) => path !== primary))].sort()
    chosen.set(fileId, others.length > 0 ? { percorsoBackup: primary, altriRiferimenti: others } : { percorsoBackup: primary })
  }
  return chosen
}

export function giornoAppuntamento(start: Date): string {
  return romeDay(start)
}

export function cartellaCane(codice: string, dog: {
  name: string
  breed?: string
  contact?: { name?: string }
  contacts?: Array<{ name?: string; isPrimary?: boolean }>
}): string {
  const contacts = dog.contacts ?? []
  const padrone = (contacts.find((item) => item.isPrimary)?.name ?? contacts[0]?.name ?? dog.contact?.name ?? '').trim()
  let folder = `${codice} - ${nomeSicuro(dog.name)}`
  if ((dog.breed ?? '').trim()) folder += ` - ${nomeSicuro(dog.breed ?? '')}`
  if (padrone) folder += ` (${nomeSicuro(padrone)})`
  return folder
}

export function settingsSenzaBackup(settings: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...settings }
  delete copy.backup
  delete copy.passwordHash
  return copy
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key])
  }
  return sorted
}

export function canonicalJson(dati: GroomlyDati): string {
  return JSON.stringify({
    versioneFormato: dati.versioneFormato,
    dogs: sortKeys(dati.dogs),
    appointments: sortKeys(dati.appointments),
    services: sortKeys(dati.services),
    settings: sortKeys(dati.settings),
    closures: sortKeys(dati.closures),
    files: sortKeys(dati.files),
    deletedDogs: sortKeys(dati.deletedDogs),
    codiciCane: sortKeys(dati.codiciCane),
    fotoMancanti: sortKeys(dati.fotoMancanti),
  })
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function contaClienti(dogs: Record<string, unknown>): number {
  const keys = new Set<string>()
  for (const [id, raw] of Object.entries(dogs)) {
    const dog = asRecord(raw)
    if (!dog) continue
    const contacts = Array.isArray(dog.contacts) ? dog.contacts.flatMap((item) => {
      const row = asRecord(item)
      return row ? [row] : []
    }) : []
    const primary = contacts.find((item) => item.isPrimary === true) ?? contacts[0]
    const contact = asRecord(dog.contact)
    const phone = typeof primary?.phone === 'string' ? primary.phone : typeof contact?.phone === 'string' ? contact.phone : ''
    const name = typeof primary?.name === 'string' ? primary.name : typeof contact?.name === 'string' ? contact.name : ''
    const digits = phone.replace(/\D/g, '')
    const trimmed = name.trim().toLowerCase()
    keys.add(digits ? `tel:${digits}` : trimmed ? `nome:${trimmed}` : `id:${typeof dog.id === 'string' ? dog.id : id}`)
  }
  return keys.size
}

export function buildManifest(dati: GroomlyDati, input: { now: Date; salonId: string; checksum: string; includiByte?: boolean }): BackupManifest {
  const business = asRecord(dati.settings.business)
  const salonName = typeof business?.salonName === 'string' ? business.salonName.trim() : ''
  const ownerName = typeof business?.name === 'string' ? business.name.trim() : ''
  const bytes = input.includiByte !== false
  const files = Object.values(dati.files)
  return {
    formato: 'groomly-backup',
    versioneFormato: 1,
    creatoIl: romeIso(input.now),
    app: { versione: APP_VERSION },
    salone: { id: input.salonId, nome: salonName || ownerName },
    conteggi: {
      cani: Object.keys(dati.dogs).length,
      clienti: contaClienti(dati.dogs),
      appuntamenti: Object.keys(dati.appointments).length,
      foto: files.filter((file) => file.kind === 'foto' && file.esito === 'ok').length,
      fileListino: files.filter((file) => file.owner === 'listino' && file.esito === 'ok').length,
      fotoMancanti: dati.fotoMancanti.length,
    },
    tipo: bytes ? 'completo' : 'solo-dati',
    fotoIncluse: bytes,
    checksum: { 'groomly-dati.json': input.checksum },
  }
}
```

Dichiarare sopra `canonicalJson` i tipi `BackupFileMeta`, `GroomlyDati` (`codiciCane: CodiciCaneDoc`) e `BackupManifest`, esportati. `sha256Hex` hasha i byte UTF-8 della stringa già canonica: è lo stesso valore che il ripristino futuro otterrà leggendo il file, senza rifare `JSON.stringify`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backupBundle.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/backupBundle.ts src/lib/backupBundle.test.ts
git commit -m "feat: json del backup compatibile con il ripristino attuale"
```

---

### Task 6: Lettura del salone

**Files:**
- Modify: `src/data/errors.ts` (aggiungere `'backup_offline'` all’unione `AppErrorCode`)
- Create: `src/data/firebase/backupCollect.ts`
- Create: `src/data/firebase/backupCollect.test.ts`

**Interfaces:**
- Consumes: tutto ciò che i task 1–5 esportano; `salonDocPath`, `salonRootPath`, `bindSalon`, `currentSalonId` da `src/data/firebase/salonRoot.ts`; `dogFromDoc`, `appointmentFromDocMaybe`, `settingsFromDoc`, `settingsToDoc` da `src/lib/firebaseMap.ts`; `dogsToLocalMap`, `appointmentsToLocalMap`, `servicesToLocalMap` da `src/data/firebase/localSeed.ts`; `closuresToLocalMap` da `src/data/local/closures.ts`; `readTombstone` da `src/lib/tombstone.ts`; `AppError` da `src/data/errors.ts`
- Produces:

```ts
export const LIMITE_LETTURE = 3
export async function mappaConLimite<T>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<void>): Promise<void>
export type BackupSink = (meta: BackupFileMeta, bytes: Uint8Array, percorsoBackup: string) => Promise<void> | void
export async function raccogliBackup(now: Date, opzioni?: { includiByte?: boolean; onFile?: BackupSink }): Promise<{
  dati: GroomlyDati
  manifest: BackupManifest
  json: string
  checksum: string
}>
```

`raccogliBackup` usa `getDoc`, `getDocs` e `runTransaction` di `firebase/firestore` sul database già creato da `src/data/firebase/client.ts`. Non copiare la creazione dell’app: esportare da `client.ts` solo se esiste già un accesso al database; altrimenti duplicare la chiamata interna è vietato. Aggiungere in `client.ts` tre funzioni sottili `readSalonDoc`, `readSalonCollection`, `transactionSalon` che usano `database()` e `loadFirestore()` già presenti, e farle usare al raccoglitore. Non cambiare il corpo di `uploadBackupFile`.

- [ ] **Step 1: Write the failing test**

Creare `src/data/firebase/backupCollect.test.ts` con un falso Firestore nello stile di `src/data/firebase/files.test.ts` (`FakeBytes.toUint8Array`). Il falso registra i path letti e scritti. `bindSalon('shared')` prima di ogni test, `clearSalon()` alla fine.

Casi:

1. `mappaConLimite` su sei elementi con limite 3: un contatore entra e esce attorno a `await Promise.resolve()`, e il massimo contemporaneo è 3. Le chiamate di un sink seriale passato dal test (lo stesso schema di `onFile`: una coda di Promise) non si sovrappongono.
2. Cane `d1` con documento, id anche in `meta/deleted-dogs.ids`, foto `file:f1` usata come `photo` e come foto `prima` dell’appuntamento `a1` con `start` millisecondi di `2026-10-22T21:30:00.000Z`. Il file è `image/webp`, `chunkCount` 0, `byteSize` uguale ai byte in `full/data`. `onFile` è chiamato una volta, con quegli stessi byte. `dati.dogs.d1` esiste. `codiciCane.byId.d1` è `C0001`. `files.f1.percorsoBackup` contiene `2026-10-22` e `prima-01.webp`. `altriRiferimenti` contiene un percorso che finisce con `profilo.webp`. `settings.backup` non è nel JSON. `deletedDogs.ids` contiene `d1`. Il documento cane nel falso, `updatedAt` compreso, è invariato. La seconda raccolta non scrive.
3. La stessa semina con `{ includiByte: false }` non chiama `onFile` e non legge `full/data`. `manifest.tipo` è `solo-dati` e `files.f1.esito` è `ok`.
4. `navigator.onLine = false`: il risultato rifiuta con `code: 'backup_offline'` e `meta/codici-cani` non è stato scritto. Ripristinare `onLine` a true.
5. `runTransaction` rifiuta `{ code: 'unavailable' }`: stesso codice `backup_offline`.
6. `bindSalon('uid-9')`: le letture stanno sotto `salons/uid-9`, non sotto `salon/shared`.

Per il punto 2 il documento cane minimo che `dogFromDoc` accetta:

```ts
{
  id: 'd1',
  name: 'Fido',
  species: 'cane',
  breed: 'Barboncino',
  contact: { name: 'Ada', phone: '333' },
  photo: 'file:f1',
  createdAt: 1,
  updatedAt: 1,
}
```

L’appuntamento minimo:

```ts
{
  id: 'a1',
  dogId: 'd1',
  start: Date.parse('2026-10-22T21:30:00.000Z'),
  services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
  photos: [{ id: 'p1', photo: 'file:f1', kind: 'prima' }],
  status: 'programmato',
  createdAt: 1,
  updatedAt: 1,
}
```

Impostazioni: `{ business: { salonName: 'Pelosetti' }, backup: { autoDaily: true, lastAt: '2026-10-19T18:50:25.964Z' } }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/backupCollect.test.ts`

Expected: FAIL, cannot find module `./backupCollect`

- [ ] **Step 3: Write minimal implementation**

In `src/data/errors.ts` aggiungere `'backup_offline'` all’unione, accanto a `'auth_offline'`.

`mappaConLimite` lancia `limit` worker. Ogni worker prende l’indice successivo e attende `worker`. Il raccoglitore legge i file con `mappaConLimite(files, LIMITE_LETTURE, ...)`. Dentro il worker, se l’esito è `ok` e c’è `onFile`, accoda la chiamata su una Promise unica condivisa e la attende: la successiva `onFile` parte solo quando la precedente si è risolta. Un `onFile` rifiutato fa fallire `raccogliBackup`. Un file mancante segna `fotoMancanti` e non chiama `onFile`.

`raccogliBackup`:

1. Se `navigator.onLine === false`, lancia `new AppError('Serve la connessione per creare il backup', 'backup_offline')`.
2. Se `currentSalonId()` è nullo, lascia salire l’errore di `salonRootPath` (`storage_write`).
3. Legge `dogs`, `appointments`, `services`, `closures`, `files`, `settings/main`, `meta/deleted-dogs` con i path di `salonDocPath` / `salonRootPath`. Non legge `members` né `accounts`.
4. Converte con `dogFromDoc`, `appointmentFromDocMaybe`, `settingsFromDoc` e `settingsToDoc`, poi `settingsSenzaBackup` sulla copia. Gli appuntamenti nulli si saltano. I personali restano, con la stessa forma di `appointmentsBackupMap` in `client.ts` (quella funzione è privata: ripetere qui le sue chiavi, non esportarla).
5. Passa a `assegnaCodici` tutti i cani letti, lapide compresa. Se `changed`, `transactionSalon` rilegge `meta/codici-cani`, ricalcola e scrive solo quel documento. Se la transazione o una lettura fallisce con `unavailable`, `deadline-exceeded` o un codice che contiene `network`, lancia `backup_offline`. Altrimenti `storage_write` con messaggio `Salvataggio non riuscito`.
6. Costruisce i riferimenti percorso (profilo, galleria, appuntamento con `romeDay`, logo, listino, sciolti) e chiama `scegliPercorsi`.
7. Con `includiByte !== false` legge i byte. Se `toUint8Array` lancia, il motivo è `illeggibile`. Chiama `onFile` in coda seriale e compila `fotoMancanti` ordinato per id. Con `includiByte: false` ogni file ha `esito: 'ok'`, `onFile` non si chiama e `full/data` non si legge.
8. `canonicalJson`, `sha256Hex`, `buildManifest`. Il valore restituito non ha un campo byte.

I documenti `dogs` non si passano a nessuna `set`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/backupCollect.test.ts src/lib/backupBundle.test.ts src/lib/nomeSicuro.test.ts src/lib/codiceCane.test.ts src/lib/backupFile.test.ts src/lib/romeTime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/data/errors.ts src/data/firebase/client.ts src/data/firebase/backupCollect.ts src/data/firebase/backupCollect.test.ts
git commit -m "feat: raccoglie il backup del salone aperto senza toccare i cani"
```

Se `client.ts` non è stato modificato perché il database si importava già, non aggiungerlo.

---

## Copertura della specifica

- Nomi sicuri: task 1.
- Codici in `meta/codici-cani`, cani non scritti, cane lapidato con documento incluso: task 3 e task 6.
- `Europe/Rome`, 23:30: task 2 e task 5, e il JSON del task 6.
- Byte, mime, dimensione, `fotoMancanti`: task 4 e task 6.
- `onFile` seriale, limite 3, file doppio una volta sola: task 5 (`scegliPercorsi`) e task 6.
- Superinsieme, `settings.backup` assente, checksum sui byte della stringa: task 5.
- `backup_offline`: task 6.
- Upload Storage e `<a download>`: non compaiono in nessun task.
