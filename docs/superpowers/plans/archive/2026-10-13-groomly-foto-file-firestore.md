# Foto e file in Firestore — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Foto del cane, foto del lavoro e file del listino si salvano in Firestore (`salon/shared/files/{id}`) come in Amici per la coda, senza Cloud Storage.

**Architecture:** Oggi `client.ts` manda ogni `data:` a Storage con `uploadDataUrl(path, dataUrl)` e scrive l’URL `https://` nel documento. Lo sostituiamo con `storeFile(owner, kind, dataUrl, name)`, che scrive i byte in `files/{id}` e restituisce `file:{id}`. Tutta la logica esistente delle foto in attesa (`pendingPhoto.ts`, `withKeptMedia`, coda) resta: per lei `file:{id}` è un valore remoto come prima lo era `https://`. Lo schermo risolve `file:{id}` in un URL `blob:` con il hook `useFileSrc`.

**Tech Stack:** React 18 + TypeScript, Vite, Capacitor 8 (Android), Firebase JS 13 (Firestore con cache persistente), Vitest + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-13-groomly-foto-file-firestore-design.md`

## Global Constraints

- Nessuna foto o file del listino va su Cloud Storage. `firebase/storage` resta importato solo da `uploadBackupFile` (backup giornaliero, F6).
- Archivio: `salon/shared/files/{id}` con campi `kind` (`foto` | `file`), `owner` (`dog:{dogId}` | `appointment:{appointmentId}` | `listino`), `mime`, `name`, `w`, `h` (solo foto), `byteSize`, `thumb` (Bytes, solo foto), `chunkCount`, `createdAt` (millis), `createdBy` (uid).
- Byte interi: `chunkCount: 0` → `salon/shared/files/{id}/full/data` campo `dati`; `chunkCount > 0` → `salon/shared/files/{id}/chunks/{n}` campo `dati`, `n` da `0` a `chunkCount - 1`. Sempre `Bytes` di Firestore, mai base64.
- Riferimento nei documenti: `file:{id}`, nei campi `dog.photo`, `dog.gallery[].photo`, `appointment.photos[].photo`, `settings.priceList.dataUrl`, `settings.priceListHistory[].dataUrl`.
- Foto intera: lato 1400 px, qualità 80, massimo 450 × 1024 byte; qualità −5 fino a 45, poi lato 1100 px; oltre → errore.
- Miniatura: lato 200 px, qualità 70, massimo 12 × 1024 byte; qualità −5 fino a 45, poi lato × 0,85 (mai sotto 40 px), al massimo 8 tentativi falliti; oltre 25000 byte → errore.
- Formato WebP; se `canvas.toBlob` non restituisce `image/webp`, JPEG con la stessa scala.
- File del listino: inline fino a 700 × 1024 byte; sopra, pezzi da 600 × 1024 byte scritti in gruppi da 8; sopra 10 × 1024 × 1024 byte rifiuto.
- Massimo 20 foto per cane (profilo + galleria, riferimenti distinti). Foto dell’appuntamento senza tetto.
- Messaggi, alla lettera:
  - «La foto è troppo grande per essere salvata. Prova con un’altra immagine.»
  - «Puoi caricare al massimo 20 foto per cane.»
  - «Il file pesa più di 10 MB. Riduci la scansione e riprova.»
- Regole Firestore: `files/{id}` → `thumb` assente o `thumb.size() < 25000`; `files/{id}/full/data` → `dati.size() <= 716800`; `files/{id}/chunks/{n}` → `dati.size() <= 614400`.
- Modalità solo telefono (Firebase spento): le foto restano `data:` come oggi; nessun cambiamento di comportamento.
- Liste, avatar, griglia galleria, foto del lavoro e storico leggono la miniatura; ritratto grande, foto ingrandita e listino leggono la foto intera.
- `removedPhotoIds?: string[]` su cane e appuntamento: id di foto tolte; il salone non le rimette.
- Lingua dell’interfaccia e dei messaggi: italiano. Stile del codice: come quello intorno (niente commenti superflui, funzioni piccole, nomi italiani solo dove già usati).
- Comandi: `npx vitest run <file>` per un file, `npm test` per tutto, `npm run build` (tsc + vite). Shell: PowerShell su Windows, cartella `d:\Groomly`.
- Non committare `.cursor/rules/rapporto-consumi.mdc`, `.superpowers/`, `android/app/build`, `.env.local`, `groomly.apk`. Usare `git add` con percorsi espliciti.

---

## File Structure

| File | Responsabilità |
|---|---|
| Create `src/lib/photoCodec.ts` | Scala di Amici (pura, con encoder iniettato) e encoder canvas WebP/JPEG; `compressPhoto`, `photoFromDataUrl` |
| Create `src/lib/photoCodec.test.ts` | Test della scala |
| Modify `src/lib/dogPhoto.ts` | `prepareDogPhoto` usa `compressPhoto`; `prepareListinoPhoto` resta |
| Modify `src/lib/dogPhoto.test.ts` | Adatta i test di `prepareDogPhoto` |
| Create `src/lib/fileBytes.ts` | `file:{id}`, data URL ↔ byte, pezzi, costanti dei limiti |
| Create `src/lib/fileBytes.test.ts` | Test |
| Create `src/data/firebase/files.ts` | `createFileStore(fs, db, codec)`: `write`, `read`, `remove` su `salon/shared/files` |
| Create `src/data/firebase/files.test.ts` | Test con Firestore finto in memoria |
| Modify `src/data/firebase/client.ts` | `storeFile` al posto di `uploadDataUrl`; cancellazione a cascata; `readStoredFile`; ripresa delle foto `data:` all’avvio |
| Modify `src/lib/firebaseMap.ts` | `storagePaths` tiene solo `backup`; `removedPhotoIds` nei mapper |
| Modify `src/types/models.ts`, `src/data/local/dogs.ts`, `src/data/local/appointments.ts` | `removedPhotoIds` |
| Create `src/hooks/useFileSrc.ts` | Risolve `file:{id}` in `blob:` (miniatura o intera), con cache |
| Modify `src/components/domain/DogAvatar.tsx`, `src/pages/DogPage.tsx`, `src/pages/AppointmentPage.tsx`, `src/pages/PriceViewPage.tsx`, `src/lib/openDocument.ts` | Mostrano `file:{id}` |
| Modify `src/pages/DogPage.tsx`, `src/pages/AppointmentPage.tsx`, `src/pages/ListinoPage.tsx` | Messaggi e tetti |
| Modify `firestore.rules`, `firebase.json`, delete `storage.rules`, modify `.cursor/rules/publish-update.mdc` | Regole e pubblicazione senza Storage |

---

### Task 1: Scala di compressione delle foto (photoCodec)

**Files:**
- Create: `src/lib/photoCodec.ts`
- Create: `src/lib/photoCodec.test.ts`
- Modify: `src/lib/dogPhoto.ts` (solo `prepareDogPhoto`, righe 54-61, e import)
- Modify: `src/lib/dogPhoto.test.ts` (blocco `describe('prepareDogPhoto')`, righe 44-66)

**Interfaces:**
- Consumes: `fitInside(width, height, maxSide)` da `src/lib/dogPhoto.ts` (già esiste, esportata).
- Produces:
  - `PHOTO_TOO_LARGE: string`, `class PhotoTooLargeError extends Error`
  - `type Encode = (maxSide: number, quality: number) => Promise<Uint8Array>`
  - `ladderFull(encode: Encode): Promise<Uint8Array>`
  - `ladderThumb(encode: Encode): Promise<Uint8Array>`
  - `type CompressedPhoto = { full: Uint8Array; thumb: Uint8Array; mime: 'image/webp' | 'image/jpeg'; width: number; height: number }`
  - `compressPhoto(source: Blob): Promise<CompressedPhoto>`
  - `photoFromDataUrl(dataUrl: string): Promise<CompressedPhoto>` — tiene i byte così come sono se sono già un’immagine ≤ 450 KB, e calcola solo la miniatura; altrimenti ricomprime.
  - `FULL_MAX_BYTES = 460800`, `THUMB_MAX_BYTES = 12288`, `THUMB_HARD_MAX_BYTES = 25000`

- [ ] **Step 1: Write the failing test** — `src/lib/photoCodec.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { FULL_MAX_BYTES, PhotoTooLargeError, THUMB_MAX_BYTES, ladderFull, ladderThumb, type Encode } from './photoCodec'

function recorder(sizeOf: (side: number, quality: number) => number) {
  const calls: Array<[number, number]> = []
  const encode: Encode = async (side, quality) => {
    calls.push([side, quality])
    return new Uint8Array(sizeOf(side, quality))
  }
  return { calls, encode }
}

describe('ladderFull', () => {
  it('tiene 1400 px qualità 80 se sta sotto 450 KB', async () => {
    const { calls, encode } = recorder(() => 300 * 1024)
    const bytes = await ladderFull(encode)
    expect(bytes.length).toBe(300 * 1024)
    expect(calls).toEqual([[1400, 80]])
  })

  it('scende di 5 fino a 45 e poi passa a 1100 px', async () => {
    const { calls, encode } = recorder((side) => (side === 1100 ? 400 * 1024 : 500 * 1024))
    const bytes = await ladderFull(encode)
    expect(bytes.length).toBeLessThanOrEqual(FULL_MAX_BYTES)
    expect(calls).toEqual([
      [1400, 80], [1400, 75], [1400, 70], [1400, 65], [1400, 60], [1400, 55], [1400, 50], [1400, 45],
      [1100, 45],
    ])
  })

  it('rifiuta la foto che non sta neanche al minimo', async () => {
    const { encode } = recorder(() => 600 * 1024)
    await expect(ladderFull(encode)).rejects.toBeInstanceOf(PhotoTooLargeError)
    await expect(ladderFull(encode)).rejects.toThrow('La foto è troppo grande per essere salvata. Prova con un’altra immagine.')
  })
})

describe('ladderThumb', () => {
  it('tiene 200 px qualità 70 se sta sotto 12 KB', async () => {
    const { calls, encode } = recorder(() => 8 * 1024)
    await ladderThumb(encode)
    expect(calls).toEqual([[200, 70]])
  })

  it('scende di qualità fino a 45, poi riduce il lato del 15%, al massimo 8 tentativi', async () => {
    const { calls, encode } = recorder(() => 20 * 1024)
    const bytes = await ladderThumb(encode)
    expect(calls).toEqual([
      [200, 70], [200, 65], [200, 60], [200, 55], [200, 50], [200, 45],
      [170, 45], [145, 45],
    ])
    expect(bytes.length).toBe(20 * 1024)
  })

  it('arriva sotto 12 KB riducendo il lato', async () => {
    const { calls, encode } = recorder((side) => (side <= 170 ? THUMB_MAX_BYTES : 20 * 1024))
    const bytes = await ladderThumb(encode)
    expect(bytes.length).toBe(THUMB_MAX_BYTES)
    expect(calls.at(-1)).toEqual([170, 45])
  })

  it('rifiuta una miniatura oltre 25000 byte', async () => {
    const { encode } = recorder(() => 30000)
    await expect(ladderThumb(encode)).rejects.toBeInstanceOf(PhotoTooLargeError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/photoCodec.test.ts`
Expected: FAIL, «Failed to resolve import "./photoCodec"».

- [ ] **Step 3: Write the implementation** — `src/lib/photoCodec.ts`

```ts
import { fitInside } from './dogPhoto'

export const FULL_MAX_SIDE = 1400
export const FULL_REDUCED_SIDE = 1100
export const FULL_QUALITY = 80
export const MIN_QUALITY = 45
export const QUALITY_STEP = 5
export const FULL_MAX_BYTES = 450 * 1024
export const THUMB_MAX_SIDE = 200
export const THUMB_QUALITY = 70
export const THUMB_MAX_BYTES = 12 * 1024
export const THUMB_HARD_MAX_BYTES = 25000
export const THUMB_MAX_ATTEMPTS = 8
export const THUMB_MIN_SIDE = 40

export const PHOTO_TOO_LARGE = 'La foto è troppo grande per essere salvata. Prova con un’altra immagine.'

export class PhotoTooLargeError extends Error {
  constructor() {
    super(PHOTO_TOO_LARGE)
    this.name = 'PhotoTooLargeError'
  }
}

export type Encode = (maxSide: number, quality: number) => Promise<Uint8Array>

export type CompressedPhoto = {
  full: Uint8Array
  thumb: Uint8Array
  mime: 'image/webp' | 'image/jpeg'
  width: number
  height: number
}

export async function ladderFull(encode: Encode): Promise<Uint8Array> {
  let quality = FULL_QUALITY
  let side = FULL_MAX_SIDE
  for (;;) {
    const bytes = await encode(side, quality)
    if (bytes.length <= FULL_MAX_BYTES) return bytes
    if (quality > MIN_QUALITY) {
      quality -= QUALITY_STEP
      continue
    }
    if (side > FULL_REDUCED_SIDE) {
      side = FULL_REDUCED_SIDE
      continue
    }
    throw new PhotoTooLargeError()
  }
}

export async function ladderThumb(encode: Encode): Promise<Uint8Array> {
  let quality = THUMB_QUALITY
  let side = THUMB_MAX_SIDE
  let attempts = 0
  for (;;) {
    const bytes = await encode(side, quality)
    if (bytes.length <= THUMB_MAX_BYTES) return bytes
    attempts += 1
    if (quality > MIN_QUALITY) {
      quality -= QUALITY_STEP
      continue
    }
    if (attempts < THUMB_MAX_ATTEMPTS && side > THUMB_MIN_SIDE) {
      side = Math.min(THUMB_MAX_SIDE, Math.max(THUMB_MIN_SIDE, Math.round(side * 0.85)))
      continue
    }
    if (bytes.length < THUMB_HARD_MAX_BYTES) return bytes
    throw new PhotoTooLargeError()
  }
}

function paint(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const box = fitInside(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('foto')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, box.width, box.height)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('foto'))), mime, quality / 100)
  })
}

async function supportedMime(bitmap: ImageBitmap): Promise<'image/webp' | 'image/jpeg'> {
  const probe = await toBlob(paint(bitmap, THUMB_MIN_SIDE), 'image/webp', THUMB_QUALITY)
  return probe.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
}

function canvasEncoder(bitmap: ImageBitmap, mime: string): Encode {
  return async (maxSide, quality) => {
    const blob = await toBlob(paint(bitmap, maxSide), mime, quality)
    return new Uint8Array(await blob.arrayBuffer())
  }
}

async function openBitmap(source: Blob): Promise<ImageBitmap> {
  if (!source.type.startsWith('image/')) throw new Error('foto')
  const bitmap = await createImageBitmap(source)
  if (bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close()
    throw new Error('foto')
  }
  return bitmap
}

export async function compressPhoto(source: Blob): Promise<CompressedPhoto> {
  const bitmap = await openBitmap(source)
  try {
    const mime = await supportedMime(bitmap)
    const encode = canvasEncoder(bitmap, mime)
    const full = await ladderFull(encode)
    const thumb = await ladderThumb(encode)
    const box = fitInside(bitmap.width, bitmap.height, FULL_MAX_SIDE)
    return { full, thumb, mime, width: box.width, height: box.height }
  } finally {
    bitmap.close()
  }
}

function dataUrlBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const mime = dataUrl.slice(5, comma).split(';')[0] || 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

export async function photoFromDataUrl(dataUrl: string): Promise<CompressedPhoto> {
  const source = dataUrlBlob(dataUrl)
  const bitmap = await openBitmap(source)
  try {
    const mime = await supportedMime(bitmap)
    const encode = canvasEncoder(bitmap, mime)
    const thumb = await ladderThumb(encode)
    const kept = (source.type === 'image/webp' || source.type === 'image/jpeg') && source.size <= FULL_MAX_BYTES
    const full = kept ? new Uint8Array(await source.arrayBuffer()) : await ladderFull(encode)
    const box = fitInside(bitmap.width, bitmap.height, FULL_MAX_SIDE)
    return { full, thumb, mime: kept ? (source.type as CompressedPhoto['mime']) : mime, width: box.width, height: box.height }
  } finally {
    bitmap.close()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/photoCodec.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: `prepareDogPhoto` usa la scala** — in `src/lib/dogPhoto.ts` sostituisci `prepareDogPhoto` e togli le costanti `DOG_MAX_SIDE` / `DOG_QUALITY` se non servono più:

```ts
export async function prepareDogPhoto(file: Blob): Promise<string> {
  const { compressPhoto } = await import('./photoCodec')
  const photo = await compressPhoto(file)
  let binary = ''
  for (let index = 0; index < photo.full.length; index += 0x8000) {
    binary += String.fromCharCode(...photo.full.subarray(index, index + 0x8000))
  }
  return `data:${photo.mime};base64,${btoa(binary)}`
}
```

(L’import dinamico evita il ciclo `dogPhoto` ↔ `photoCodec`, perché `photoCodec` importa `fitInside` da `dogPhoto`.)

- [ ] **Step 6: Adatta il test di `prepareDogPhoto`** in `src/lib/dogPhoto.test.ts`. Lo stub del canvas deve offrire anche `toBlob(callback, type, quality)`. Sostituisci il primo `it` del blocco `describe('prepareDogPhoto')` con:

```ts
  it('salva il fotogramma intero entro 1400 px in WebP, qualità 80', async () => {
    const bitmap = stubBitmap(2800, 1400)
    const calls: Array<[string, number, number]> = []
    const canvas = { width: 0, height: 0, getContext: () => ({ imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage() {} }),
      toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
        calls.push([type, quality, canvas.width])
        callback(new Blob([new Uint8Array(1000)], { type }))
      },
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : realCreate(tagName))) as typeof document.createElement)
    const file = new File([new Uint8Array([1, 2, 3])], 'grande.png', { type: 'image/png' })
    const url = await prepareDogPhoto(file)
    expect(url.startsWith('data:image/webp;base64,')).toBe(true)
    expect(calls).toContainEqual(['image/webp', 0.8, 1400])
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
```

Il test «rifiuta un file che non è un’immagine» resta com’è. I test di `prepareListinoPhoto` restano invariati (usa ancora `toDataURL`).

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/lib/photoCodec.test.ts src/lib/dogPhoto.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/lib/photoCodec.ts src/lib/photoCodec.test.ts src/lib/dogPhoto.ts src/lib/dogPhoto.test.ts
git commit -m "feat: comprimi le foto con la scala di Amici (WebP 1400/450 KB, miniatura 200/12 KB)"
```

---

### Task 2: Byte, pezzi e riferimenti `file:{id}` (fileBytes)

**Files:**
- Create: `src/lib/fileBytes.ts`
- Create: `src/lib/fileBytes.test.ts`

**Interfaces:**
- Produces:
  - `INLINE_MAX_BYTES = 716800`, `CHUNK_BYTES = 614400`, `FILE_MAX_BYTES = 10485760`, `CHUNK_WRITE_GROUP = 8`
  - `FILE_TOO_LARGE: string`
  - `fileRef(id: string): string` → `file:{id}`
  - `fileIdOf(value: string | undefined): string | null`
  - `isFileRef(value: unknown): value is string`
  - `dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array }`
  - `bytesToDataUrl(bytes: Uint8Array, mime: string): string`
  - `splitChunks(bytes: Uint8Array): Uint8Array[]` → `[]` se `bytes.length <= INLINE_MAX_BYTES`
  - `joinChunks(parts: Uint8Array[]): Uint8Array`

- [ ] **Step 1: Write the failing test** — `src/lib/fileBytes.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  CHUNK_BYTES,
  FILE_TOO_LARGE,
  INLINE_MAX_BYTES,
  bytesToDataUrl,
  dataUrlToBytes,
  fileIdOf,
  fileRef,
  isFileRef,
  joinChunks,
  splitChunks,
} from './fileBytes'

function filled(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) bytes[index] = index % 251
  return bytes
}

describe('fileBytes', () => {
  it('riferimento file:{id}', () => {
    expect(fileRef('abc')).toBe('file:abc')
    expect(fileIdOf('file:abc')).toBe('abc')
    expect(fileIdOf('data:image/png;base64,QQ==')).toBeNull()
    expect(fileIdOf(undefined)).toBeNull()
    expect(isFileRef('file:x')).toBe(true)
    expect(isFileRef('https://x')).toBe(false)
  })

  it('data URL e byte vanno e tornano uguali', () => {
    const bytes = filled(1000)
    const url = bytesToDataUrl(bytes, 'application/pdf')
    expect(url.startsWith('data:application/pdf;base64,')).toBe(true)
    const back = dataUrlToBytes(url)
    expect(back.mime).toBe('application/pdf')
    expect(Array.from(back.bytes)).toEqual(Array.from(bytes))
  })

  it('un file da 500 KB resta intero', () => {
    expect(splitChunks(filled(500 * 1024))).toEqual([])
    expect(splitChunks(filled(INLINE_MAX_BYTES))).toEqual([])
  })

  it('un file da 2 MB va in 4 pezzi da 600 KB e torna uguale', () => {
    const bytes = filled(2 * 1024 * 1024)
    const parts = splitChunks(bytes)
    expect(parts).toHaveLength(4)
    expect(parts.slice(0, 3).every((part) => part.length === CHUNK_BYTES)).toBe(true)
    expect(Array.from(joinChunks(parts))).toEqual(Array.from(bytes))
  })

  it('messaggio del file troppo grande', () => {
    expect(FILE_TOO_LARGE).toBe('Il file pesa più di 10 MB. Riduci la scansione e riprova.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/fileBytes.test.ts`
Expected: FAIL, import non risolto.

- [ ] **Step 3: Write the implementation** — `src/lib/fileBytes.ts`

```ts
export const INLINE_MAX_BYTES = 700 * 1024
export const CHUNK_BYTES = 600 * 1024
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const CHUNK_WRITE_GROUP = 8

export const FILE_TOO_LARGE = 'Il file pesa più di 10 MB. Riduci la scansione e riprova.'

const PREFIX = 'file:'

export function fileRef(id: string): string {
  return `${PREFIX}${id}`
}

export function isFileRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX) && value.length > PREFIX.length
}

export function fileIdOf(value: string | undefined): string | null {
  return isFileRef(value) ? value.slice(PREFIX.length) : null
}

export function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const comma = dataUrl.indexOf(',')
  const mime = dataUrl.slice(5, comma).split(';')[0] || 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return { mime, bytes }
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

export function splitChunks(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length <= INLINE_MAX_BYTES) return []
  const parts: Uint8Array[] = []
  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) parts.push(bytes.slice(start, start + CHUNK_BYTES))
  return parts
}

export function joinChunks(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }
  return joined
}
```

Poi in `src/lib/photoCodec.ts` (Task 1) sostituisci la funzione locale `dataUrlBlob` con l’uso di `dataUrlToBytes`:

```ts
import { dataUrlToBytes } from './fileBytes'
// ...
function dataUrlBlob(dataUrl: string): Blob {
  const { mime, bytes } = dataUrlToBytes(dataUrl)
  return new Blob([bytes], { type: mime })
}
```

e in `src/lib/dogPhoto.ts` `prepareDogPhoto` usa `bytesToDataUrl(photo.full, photo.mime)` al posto del ciclo con `btoa`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/fileBytes.test.ts src/lib/photoCodec.test.ts src/lib/dogPhoto.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/fileBytes.ts src/lib/fileBytes.test.ts src/lib/photoCodec.ts src/lib/dogPhoto.ts
git commit -m "feat: riferimenti file:{id}, conversione byte e pezzi da 600 KB"
```

---

### Task 3: Archivio `salon/shared/files` (files.ts)

**Files:**
- Create: `src/data/firebase/files.ts`
- Create: `src/data/firebase/files.test.ts`

**Interfaces:**
- Consumes: Task 2 (`fileRef`, `fileIdOf`, `dataUrlToBytes`, `splitChunks`, `joinChunks`, `FILE_MAX_BYTES`, `FILE_TOO_LARGE`, `CHUNK_WRITE_GROUP`); Task 1 (`CompressedPhoto`); `AppError` da `src/data/errors.ts` (`new AppError(message, code)`).
- Produces:
  - `type FileOwner = \`dog:${string}\` | \`appointment:${string}\` | 'listino'`
  - `type FileVariant = 'thumb' | 'full'`
  - `type StoreInput = { owner: FileOwner; kind: 'foto' | 'file'; dataUrl: string; name: string; createdBy: string }`
  - `type FileStore = { write(input: StoreInput): Promise<string>; read(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }>; remove(ref: string): Promise<void> }`
  - `createFileStore(fs: FirestoreApi, db: unknown, codec: { fromDataUrl(dataUrl: string): Promise<CompressedPhoto> }): FileStore`
  - `type FirestoreApi = Pick<typeof import('firebase/firestore'), 'doc' | 'getDoc' | 'writeBatch' | 'Bytes'>`
  - Errori: `AppError(FILE_TOO_LARGE, 'file_too_large')`, `AppError('File non apribile', 'file_missing')`.

- [ ] **Step 1: Write the failing test** — `src/data/firebase/files.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { createFileStore, type FirestoreApi } from './files'
import { bytesToDataUrl, CHUNK_BYTES } from '../../lib/fileBytes'

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

const codec = {
  fromDataUrl: async () => ({ full: new Uint8Array(300), thumb: new Uint8Array(20), mime: 'image/webp' as const, width: 1400, height: 1050 }),
}

function filled(length: number) {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) bytes[index] = index % 253
  return bytes
}

describe('createFileStore', () => {
  it('una foto scrive files/{id} con miniatura e full/data in un solo batch', async () => {
    const { api, docs, commits } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    const id = ref.slice('file:'.length)
    expect(ref.startsWith('file:')).toBe(true)
    expect(commits).toHaveLength(1)
    const main = docs.get(`salon/shared/files/${id}`)
    expect(main).toMatchObject({ kind: 'foto', owner: 'dog:d1', mime: 'image/webp', w: 1400, h: 1050, byteSize: 300, chunkCount: 0, createdBy: 'u1' })
    expect((main?.thumb as FakeBytes).raw.length).toBe(20)
    expect((docs.get(`salon/shared/files/${id}/full/data`)?.dati as FakeBytes).raw.length).toBe(300)
  })

  it('un PDF da 500 KB sta in full/data', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(500 * 1024), 'application/pdf'), name: 'listino.pdf', createdBy: 'u1' })
    const id = ref.slice(5)
    expect(docs.get(`salon/shared/files/${id}`)).toMatchObject({ kind: 'file', chunkCount: 0, name: 'listino.pdf', mime: 'application/pdf' })
    expect(docs.get(`salon/shared/files/${id}`)?.thumb).toBeUndefined()
  })

  it('un PDF da 2 MB va in 4 pezzi scritti prima del documento principale e torna uguale', async () => {
    const { api, docs, commits } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const bytes = filled(2 * 1024 * 1024)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(bytes, 'application/pdf'), name: 'a.pdf', createdBy: 'u1' })
    const id = ref.slice(5)
    expect(docs.get(`salon/shared/files/${id}`)).toMatchObject({ chunkCount: 4 })
    expect((docs.get(`salon/shared/files/${id}/chunks/0`)?.dati as FakeBytes).raw.length).toBe(CHUNK_BYTES)
    expect(commits.at(-1)).toEqual([`salon/shared/files/${id}`])
    const read = await store.read(ref, 'full')
    expect(read.mime).toBe('application/pdf')
    expect(Array.from(read.bytes)).toEqual(Array.from(bytes))
  })

  it('un file da 11 MB non scrive niente', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    await expect(store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(11 * 1024 * 1024), 'application/pdf'), name: 'b.pdf', createdBy: 'u1' }))
      .rejects.toThrow('Il file pesa più di 10 MB. Riduci la scansione e riprova.')
    expect(docs.size).toBe(0)
  })

  it('un file con un pezzo mancante non si apre', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(2 * 1024 * 1024), 'application/pdf'), name: 'c.pdf', createdBy: 'u1' })
    docs.delete(`salon/shared/files/${ref.slice(5)}/chunks/2`)
    await expect(store.read(ref, 'full')).rejects.toThrow('File non apribile')
  })

  it('la miniatura si legge dal documento principale', async () => {
    const { api } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const ref = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    expect((await store.read(ref, 'thumb')).bytes.length).toBe(20)
    expect((await store.read(ref, 'full')).bytes.length).toBe(300)
  })

  it('remove cancella files/{id}, full/data e i pezzi', async () => {
    const { api, docs } = fakeFirestore()
    const store = createFileStore(api, {}, codec)
    const big = await store.write({ owner: 'listino', kind: 'file', dataUrl: bytesToDataUrl(filled(2 * 1024 * 1024), 'application/pdf'), name: 'd.pdf', createdBy: 'u1' })
    const small = await store.write({ owner: 'dog:d1', kind: 'foto', dataUrl: 'data:image/jpeg;base64,QQ==', name: '', createdBy: 'u1' })
    await store.remove(big)
    await store.remove(small)
    expect(docs.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/firebase/files.test.ts`
Expected: FAIL, import non risolto.

- [ ] **Step 3: Write the implementation** — `src/data/firebase/files.ts`

```ts
import { AppError } from '../errors'
import type { CompressedPhoto } from '../../lib/photoCodec'
import {
  CHUNK_WRITE_GROUP,
  FILE_MAX_BYTES,
  FILE_TOO_LARGE,
  dataUrlToBytes,
  fileIdOf,
  fileRef,
  joinChunks,
  splitChunks,
} from '../../lib/fileBytes'

export type FileOwner = `dog:${string}` | `appointment:${string}` | 'listino'
export type FileVariant = 'thumb' | 'full'
export type StoreInput = { owner: FileOwner; kind: 'foto' | 'file'; dataUrl: string; name: string; createdBy: string }
export type FirestoreApi = Pick<typeof import('firebase/firestore'), 'doc' | 'getDoc' | 'writeBatch' | 'Bytes'>
export type FileStore = {
  write(input: StoreInput): Promise<string>
  read(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }>
  remove(ref: string): Promise<void>
}

type Codec = { fromDataUrl(dataUrl: string): Promise<CompressedPhoto> }
type BytesLike = { toUint8Array(): Uint8Array }

function missing(): AppError {
  return new AppError('File non apribile', 'file_missing')
}

export function createFileStore(fs: FirestoreApi, db: unknown, codec: Codec): FileStore {
  const firestore = db as Parameters<typeof fs.doc>[0]
  const at = (...path: string[]) => fs.doc(firestore, 'salon', 'shared', 'files', ...path)
  const bytesOf = (value: unknown): Uint8Array => {
    if (!value || typeof (value as BytesLike).toUint8Array !== 'function') throw missing()
    return (value as BytesLike).toUint8Array()
  }

  async function write(input: StoreInput): Promise<string> {
    const id = crypto.randomUUID()
    const main: Record<string, unknown> = {
      kind: input.kind,
      owner: input.owner,
      name: input.name,
      createdAt: Date.now(),
      createdBy: input.createdBy,
    }
    let bytes: Uint8Array
    if (input.kind === 'foto') {
      const photo = await codec.fromDataUrl(input.dataUrl)
      bytes = photo.full
      Object.assign(main, { mime: photo.mime, w: photo.width, h: photo.height, thumb: fs.Bytes.fromUint8Array(photo.thumb) })
    } else {
      const decoded = dataUrlToBytes(input.dataUrl)
      bytes = decoded.bytes
      main.mime = decoded.mime
    }
    if (bytes.length > FILE_MAX_BYTES) throw new AppError(FILE_TOO_LARGE, 'file_too_large')
    const chunks = splitChunks(bytes)
    main.byteSize = bytes.length
    main.chunkCount = chunks.length
    if (chunks.length === 0) {
      const batch = fs.writeBatch(firestore)
      batch.set(at(id, 'full', 'data'), { dati: fs.Bytes.fromUint8Array(bytes) })
      batch.set(at(id), main)
      await batch.commit()
      return fileRef(id)
    }
    for (let start = 0; start < chunks.length; start += CHUNK_WRITE_GROUP) {
      const batch = fs.writeBatch(firestore)
      chunks.slice(start, start + CHUNK_WRITE_GROUP).forEach((part, offset) => {
        batch.set(at(id, 'chunks', String(start + offset)), { dati: fs.Bytes.fromUint8Array(part) })
      })
      await batch.commit()
    }
    const last = fs.writeBatch(firestore)
    last.set(at(id), main)
    await last.commit()
    return fileRef(id)
  }

  async function readMain(id: string): Promise<Record<string, unknown>> {
    const snap = await fs.getDoc(at(id))
    if (!snap.exists()) throw missing()
    return snap.data() as Record<string, unknown>
  }

  async function read(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }> {
    const id = fileIdOf(ref)
    if (!id) throw missing()
    const main = await readMain(id)
    const mime = typeof main.mime === 'string' ? main.mime : 'application/octet-stream'
    if (variant === 'thumb' && main.thumb) return { bytes: bytesOf(main.thumb), mime }
    const count = typeof main.chunkCount === 'number' ? main.chunkCount : 0
    if (count === 0) {
      const snap = await fs.getDoc(at(id, 'full', 'data'))
      if (!snap.exists()) throw missing()
      return { bytes: bytesOf((snap.data() as Record<string, unknown>).dati), mime }
    }
    const parts = await Promise.all(Array.from({ length: count }, async (_, index) => {
      const snap = await fs.getDoc(at(id, 'chunks', String(index)))
      if (!snap.exists()) throw missing()
      return bytesOf((snap.data() as Record<string, unknown>).dati)
    }))
    return { bytes: joinChunks(parts), mime }
  }

  async function remove(ref: string): Promise<void> {
    const id = fileIdOf(ref)
    if (!id) return
    const snap = await fs.getDoc(at(id))
    const count = snap.exists() && typeof (snap.data() as Record<string, unknown>).chunkCount === 'number'
      ? (snap.data() as Record<string, unknown>).chunkCount as number
      : 0
    const batch = fs.writeBatch(firestore)
    for (let index = 0; index < count; index += 1) batch.delete(at(id, 'chunks', String(index)))
    batch.delete(at(id, 'full', 'data'))
    batch.delete(at(id))
    await batch.commit()
  }

  return { write, read, remove }
}
```

Nota: un batch di Firestore accetta fino a 500 operazioni; un file da 10 MB ha al massimo 18 pezzi, quindi `remove` sta in un batch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/firebase/files.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```powershell
git add src/data/firebase/files.ts src/data/firebase/files.test.ts
git commit -m "feat: archivio salon/shared/files con miniatura, full/data e pezzi"
```

---

### Task 4: `client.ts` salva in `files` invece che su Storage, con cancellazione a cascata

**Files:**
- Modify: `src/data/firebase/client.ts`
- Modify: `src/lib/firebaseMap.ts` (`storagePaths` righe 26-34; mapper cane e appuntamento)
- Modify: `src/lib/firebaseMap.test.ts` (righe 21-26)
- Modify: `src/types/models.ts` (`Dog`, `DogWrite`, `Appointment`)
- Modify: `src/data/local/dogs.ts` (stored ↔ Dog, `updateDog`)
- Modify: `src/data/local/appointments.ts` (stored ↔ Appointment, scrittura delle foto)
- Modify: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: Task 3 `createFileStore`, `FileStore`, `FileOwner`, `FileVariant`; Task 1 `photoFromDataUrl`; Task 2 `isFileRef`.
- Produces (esportate da `client.ts`):
  - `readStoredFile(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }>`
  - `resaveLocalMedia(uid: string): Promise<void>` (usata nel Task 7)
- Produces (modelli): `removedPhotoIds?: string[]` su `Dog` e `Appointment` (e su `DogWrite`, perché `updateDog` riceve un `DogWrite`).

Contesto del codice attuale (leggi prima di toccare):
- `uploadDataUrl(path, dataUrl)` (riga ~438) usa `firebase/storage`. È chiamata da `uploadDogMedia`, `uploadAppointmentMedia`, `liftDogDoc`, `liftVisitDoc`, `uploadPrice`.
- `withKeptMedia(path, data, fields)` (riga ~360) unisce la galleria e le foto del salone con quelle nuove (`unionById`), così un telefono con una copia vecchia non cancella le foto altrui. Va tenuta, ma deve saltare gli id in `removedPhotoIds`.
- `priceDataUrlsAreHttps` (riga ~688) blocca la pubblicazione se un file non è `https://`.
- `bucket()` (riga ~180) e `storagePromise` servono anche a `uploadBackupFile` (riga ~938): **restano** per il backup.
- `pendingPhoto.ts` e `uploadPatch.ts` considerano remoto ogni valore che non inizia con `data:`, quindi `file:{id}` funziona senza toccarli.

- [ ] **Step 1: Write the failing tests** in `src/data/firebase/client.test.ts`.

  a) Il mock di `firebase/firestore` in cima al file deve offrire anche `writeBatch` e `Bytes`. Aggiungi al mock (accanto a `setDoc`, `getDoc`, `deleteDoc`) usando lo stesso `fs.store` (mappa collezione → mappa id → dati) e le stesse funzioni di percorso già usate dal mock:

```ts
  Bytes: class {
    constructor(readonly raw: Uint8Array) {}
    static fromUint8Array(raw: Uint8Array) { return new this(raw) }
    toUint8Array() { return this.raw }
  },
  writeBatch: () => {
    const ops: Array<() => Promise<void> | void> = []
    return {
      set: (ref: unknown, data: Record<string, unknown>) => { ops.push(() => fs.writeDoc(ref, data)) },
      delete: (ref: unknown) => { ops.push(() => fs.removeDoc(ref)) },
      commit: async () => { for (const op of ops) await op() },
    }
  },
```

  Se nel mock la cancellazione non è già una funzione riutilizzabile, estrai quella usata da `deleteDoc` in `fs.removeDoc` (stessa firma di `fs.writeDoc`). Aggiungi anche il mock del codec, perché happy-dom non ha canvas:

```ts
vi.mock('../../lib/photoCodec', () => ({
  photoFromDataUrl: async () => ({ full: new Uint8Array([1, 2, 3]), thumb: new Uint8Array([9]), mime: 'image/webp', width: 10, height: 10 }),
}))
```

  b) Sostituisci il test «carica le foto nel percorso del salone e non scrive il data url» con:

```ts
  it('salva le foto in salon/shared/files e nel cane e nell’appuntamento scrive solo file:{id}', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    await client.saveDog('fb-1', {
      ...dog,
      photo: 'data:image/jpeg;base64,QQ==',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,Qg==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    await client.saveAppointment('fb-1', {
      ...appointment,
      photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }],
    })
    const storedDog = fs.store.get('salon/shared/dogs')?.get(dog.id)
    const storedVisit = fs.store.get('salon/shared/appointments')?.get(appointment.id)
    expect(String(storedDog?.photo)).toMatch(/^file:/)
    expect(JSON.stringify(storedDog)).not.toContain('data:')
    expect(JSON.stringify(storedVisit)).not.toContain('data:')
    const files = fs.store.get('salon/shared/files')
    expect(files?.size).toBe(3)
    const owners = [...(files?.values() ?? [])].map((item) => item.owner).sort()
    expect(owners).toEqual([`appointment:${appointment.id}`, `dog:${dog.id}`, `dog:${dog.id}`])
    expect(fs.uploads).toHaveLength(0)
  })

  it('togliere una foto dalla galleria la cancella da files e un’altra copia non la rimette', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    await client.saveDog('fb-1', {
      ...dog,
      gallery: [
        { id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') },
        { id: 'g2', photo: 'data:image/jpeg;base64,Qg==', takenAt: new Date('2026-03-02T00:00:00.000Z') },
      ],
    })
    const saved = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string; photo: string }> }
    const keep = saved.gallery.find((item) => item.id === 'g2')!
    const gone = saved.gallery.find((item) => item.id === 'g1')!
    await client.saveDog('fb-1', { ...dog, photo: undefined, gallery: [{ id: 'g2', photo: keep.photo, takenAt: new Date('2026-03-02T00:00:00.000Z') }], removedPhotoIds: ['g1'] })
    const after = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string }> }
    expect(after.gallery.map((item) => item.id)).toEqual(['g2'])
    expect(fs.store.get('salon/shared/files')?.has(gone.photo.slice(5))).toBe(false)
    await client.saveDog('fb-1', { ...dog, photo: undefined, gallery: [] })
    const stale = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string }> }
    expect(stale.gallery.map((item) => item.id)).toEqual(['g2'])
  })

  it('un file del listino si salva in files e le impostazioni tengono file:{id}', async () => {
    const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
    await client.saveSettings('fb-1', {
      ...settings,
      priceList: { id: 'pf1', fileName: 'listino.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }, true)
    const stored = fs.store.get('salon/shared/settings')?.get('main') as { priceList: { dataUrl: string } }
    expect(stored.priceList.dataUrl).toMatch(/^file:/)
    expect(fs.store.get('salon/shared/files')?.get(stored.priceList.dataUrl.slice(5))).toMatchObject({ owner: 'listino', kind: 'file', name: 'listino.pdf' })
  })

  it('cancellare un cane cancella i file suoi e dei suoi appuntamenti', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    await client.saveDog('fb-1', { ...dog, photo: 'data:image/jpeg;base64,QQ==' })
    await client.saveAppointment('fb-1', { ...appointment, photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }] })
    expect(fs.store.get('salon/shared/files')?.size).toBe(2)
    await client.removeDog('fb-1', dog.id)
    expect(fs.store.get('salon/shared/files')?.size ?? 0).toBe(0)
  })
```

  (Importa `blankSettings` da `../local/settings` se il file non lo importa già.)

  c) Il test «se il caricamento della foto fallisce non sostituisce la foto precedente» oggi usa `fs.uploadFail`. Cambialo perché faccia fallire il `commit` del batch: aggiungi `fs.batchFail = false` allo stato del mock, azzeralo nel `beforeEach`, e nel `commit` del mock `if (fs.batchFail) throw new Error('batch')`. Nel test usa `fs.batchFail = true` al posto di `fs.uploadFail = true`. Le aspettative restano uguali.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/firebase/client.test.ts`
Expected: FAIL nei 4 test nuovi (le foto finiscono ancora in `fs.uploads`, `removedPhotoIds` non esiste).

- [ ] **Step 3: Modelli e copia locale con `removedPhotoIds`**

  - `src/types/models.ts`: aggiungi `removedPhotoIds?: string[]` a `DogWrite`, `Dog` (se `Dog` non eredita già da `DogWrite`) e `Appointment`.
  - `src/data/local/dogs.ts`: il tipo stored del cane ha `removedPhotoIds?: string[]`; la conversione stored → Dog e Dog → stored lo copia (solo se non vuoto). In `updateDog(uid, id, input)`, prima di costruire il cane:

```ts
  const kept = new Set((input.gallery ?? []).map((item) => item.id))
  const dropped = previous.gallery.filter((item) => !kept.has(item.id)).map((item) => item.id)
  const removedPhotoIds = [...new Set([...(previous.removedPhotoIds ?? []), ...(input.removedPhotoIds ?? []), ...dropped])]
```

  e poi `if (removedPhotoIds.length > 0) dog.removedPhotoIds = removedPhotoIds`.
  - `src/data/local/appointments.ts`: stesso campo nel tipo stored e nelle conversioni. Dove le foto dell’appuntamento cambiano (la funzione che applica `photos` ai dettagli dell’appuntamento, usata da `stageDetails` in `AppointmentPage.tsx`; cercala con `rg -n "photos" src/data/local/appointments.ts src/hooks/useAppointments.ts`), aggiungi a `removedPhotoIds` gli id delle foto che c’erano prima e non ci sono più, con la stessa formula del cane.
  - `src/lib/firebaseMap.ts`: `dogToDoc` scrive `removedPhotoIds` se non vuoto; `dogFromDoc` lo legge con `strings(data.removedPhotoIds)` e lo assegna solo se non vuoto. Uguale per `appointmentToDoc` / `appointmentFromDoc`. `storagePaths` diventa:

```ts
export function storagePaths(uid: string) {
  return {
    backup: (day: string) => `users/${uid}/backups/${day}.json`,
  }
}
```

  - `src/lib/firebaseMap.test.ts`: togli le righe 22-25 (profile, gallery, work, price), tieni quella del backup. Aggiungi:

```ts
  it('removedPhotoIds va e torna nel cane e nell’appuntamento', () => {
    const now = new Date('2026-10-13T00:00:00.000Z')
    const dog = dogFromDoc('d1', { ...dogToDoc(dogFromDoc('d1', { name: 'Birba', createdAt: now.getTime(), updatedAt: now.getTime() })), removedPhotoIds: ['g1'] })
    expect(dog.removedPhotoIds).toEqual(['g1'])
    expect(dogToDoc(dog).removedPhotoIds).toEqual(['g1'])
    const visit = appointmentFromDoc('a1', { dogId: 'd1', start: now.getTime(), removedPhotoIds: ['p1'] })
    expect(appointmentToDoc(visit).removedPhotoIds).toEqual(['p1'])
  })
```

- [ ] **Step 4: `storeFile` al posto di `uploadDataUrl` in `client.ts`**

  Import nuovi:

```ts
import { createFileStore, type FileOwner, type FileStore, type FileVariant } from './files'
import { isFileRef } from '../../lib/fileBytes'
```

  Accanto a `bucket()`:

```ts
let filesPromise: Promise<FileStore> | null = null

async function fileStore(): Promise<FileStore> {
  if (!filesPromise) {
    filesPromise = (async () => {
      const fs = await loadFirestore()
      const { photoFromDataUrl } = await import('../../lib/photoCodec')
      return createFileStore(fs, await database(), { fromDataUrl: photoFromDataUrl })
    })().catch((error: unknown) => {
      filesPromise = null
      throw error
    })
  }
  return filesPromise
}

async function storeFile(owner: FileOwner, kind: 'foto' | 'file', dataUrl: string, name = ''): Promise<string> {
  const createdBy = knownUid ?? (await auth()).currentUser?.uid ?? ''
  return (await fileStore()).write({ owner, kind, dataUrl, name, createdBy })
}

export async function readStoredFile(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }> {
  return (await fileStore()).read(ref, variant)
}

async function dropFiles(refs: Iterable<string>): Promise<void> {
  const store = await fileStore()
  await Promise.all([...new Set(refs)].filter(isFileRef).map((ref) => store.remove(ref).catch(() => undefined)))
}
```

  Cancella `uploadDataUrl`. Sostituzioni:
  - `uploadDogMedia(uid, dog)`: `await storeFile(\`dog:${dog.id}\`, 'foto', dog.photo)` per il profilo e `await storeFile(\`dog:${dog.id}\`, 'foto', item.photo)` per ogni voce della galleria con `data:`. Togli `storagePaths`. Se profilo e una voce della galleria hanno lo stesso identico `data:` (il profilo nasce dalla prima foto della galleria in `dogFromWrite`), scrivi una sola volta e riusa il riferimento: tieni una `Map<string, string>` da data URL a `file:{id}` dentro la funzione.
  - `uploadAppointmentMedia`: `await storeFile(\`appointment:${appointment.id}\`, 'foto', item.photo)`.
  - `liftDogDoc(uid, dogId, data)`: `storeFile(\`dog:${dogId}\`, 'foto', ...)`; `liftVisitDoc(uid, appointmentId, data)`: `storeFile(\`appointment:${appointmentId}\`, 'foto', ...)`.
  - `uploadPrice(uid, file)`: `{ ...file, dataUrl: await storeFile('listino', 'file', file.dataUrl, file.fileName) }`.
  - `priceDataUrlsAreHttps` → rinomina `priceDataUrlsAreRemote` e accetta `https://` oppure `file:`:

```ts
function priceDataUrlsAreRemote(settings: SettingsMain): boolean {
  const files = [...(settings.priceList ? [settings.priceList] : []), ...settings.priceListHistory]
  return files.every((file) => file.dataUrl.startsWith('https://') || isFileRef(file.dataUrl))
}
```

  - Commento in testa al file: punto 4 «Creare Storage.» diventa «Storage serve solo al backup giornaliero.»; punto 6 diventa `npx firebase deploy --only firestore:rules,firestore:indexes,hosting`.
  - `bucket()` e `uploadBackupFile` restano invariati.

- [ ] **Step 5: `withKeptMedia` rispetta `removedPhotoIds` e la cascata**

  Sostituisci `unionById` e `withKeptMedia` con:

```ts
function unionById(primary: unknown, extra: unknown, removed: ReadonlySet<string>): Record<string, unknown>[] {
  const first = asRecords(primary).filter((item) => !removed.has(String(item.id ?? '')))
  const ids = new Set(first.map((item) => String(item.id ?? '')))
  return [...first, ...asRecords(extra).filter((item) => {
    const id = String(item.id ?? '')
    return !ids.has(id) && !removed.has(id)
  })]
}

function removedIds(...docs: Array<Record<string, unknown> | null>): string[] {
  const ids = docs.flatMap((doc) => (Array.isArray(doc?.removedPhotoIds) ? doc.removedPhotoIds : []))
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))]
}

function mediaRefs(doc: Record<string, unknown> | null): string[] {
  if (!doc) return []
  const refs: string[] = []
  if (isFileRef(doc.photo)) refs.push(doc.photo)
  for (const item of [...asRecords(doc.gallery), ...asRecords(doc.photos)]) {
    if (isFileRef(item.photo)) refs.push(item.photo)
  }
  return refs
}

async function withKeptMedia(path: string[], data: Record<string, unknown>, fields: Array<'photo' | 'gallery' | 'photos'>): Promise<{ next: Record<string, unknown>; dropped: string[] }> {
  const current = await readDoc(path)
  if (!current) return { next: data, dropped: [] }
  const removedList = removedIds(data, current)
  const removed = new Set(removedList)
  const next = { ...data }
  if (removedList.length > 0) next.removedPhotoIds = removedList
  if (fields.includes('photo') && (typeof next.photo !== 'string' || next.photo.length === 0) && typeof current.photo === 'string') {
    next.photo = current.photo
  }
  if (fields.includes('gallery')) next.gallery = unionById(next.gallery, current.gallery, removed)
  if (fields.includes('photos')) next.photos = unionById(next.photos, current.photos, removed)
  const kept = new Set(mediaRefs(next))
  return { next, dropped: mediaRefs(current).filter((ref) => !kept.has(ref)) }
}
```

  Attenzione al profilo: se `next.photo` è uguale al riferimento di una foto della galleria tolta, e non c’è più nella galleria, `next.photo` va tolto (altrimenti il file non si cancella e il ritratto mostra una foto tolta). Dopo il calcolo di `next.gallery`, aggiungi:

```ts
  const droppedGallery = new Set(asRecords(current.gallery).filter((item) => removed.has(String(item.id ?? ''))).map((item) => item.photo))
  if (fields.includes('photo') && droppedGallery.has(next.photo)) delete next.photo
```

  `saveDog` diventa:

```ts
export async function saveDog(uid: string, dog: Dog, _waitForUploads = false): Promise<void> {
  const stone = mergeTombstone(readDeletion(), readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'))))
  if (tombstoneRejectsDog(stone, dog.id)) return
  const uploaded = await uploadDogMedia(uid, dog)
  const kept = await withKeptMedia(['salon', 'shared', 'dogs', dog.id], dogToDoc(uploaded), ['photo', 'gallery'])
  const data = await liftDogDoc(uid, dog.id, kept.next)
  if (containsDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  await putDoc(['salon', 'shared', 'dogs', dog.id], data)
  await dropFiles(kept.dropped)
}
```

  `saveAppointment` uguale con `['photos']`, `liftVisitDoc` e `dropFiles(kept.dropped)` dopo `putDoc`.

  Impostazioni: in `publishUploadedSettings` e nel ramo senza binari di `saveSettings`, leggi prima `const current = await readDoc(['salon', 'shared', 'settings', 'main'])`, scrivi, poi cancella i riferimenti `file:` di `current.priceList.dataUrl` e `current.priceListHistory[].dataUrl` che non compaiono più nelle impostazioni scritte:

```ts
function priceRefs(doc: Record<string, unknown> | null): string[] {
  if (!doc) return []
  const files = [...(doc.priceList && typeof doc.priceList === 'object' ? [doc.priceList as Record<string, unknown>] : []), ...asRecords(doc.priceListHistory)]
  return files.map((file) => file.dataUrl).filter(isFileRef)
}
```

  e dopo `putDoc`: `const kept = new Set(priceRefs(written)); await dropFiles(priceRefs(current).filter((ref) => !kept.has(ref)))`, dove `written` è l’oggetto passato a `putDoc`.

  `removeDog`: prima di cancellare, leggi il documento del cane (`readDoc(sharedPath('dogs', id))`) e raccogli `mediaRefs` del cane e di ogni appuntamento in `doomed` (`item.data()`); dopo i `deleteDoc` chiama `await dropFiles(refs)`. `removeAppointment`: leggi il documento prima di cancellarlo e chiama `dropFiles(mediaRefs(doc))` dopo.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/data/firebase/client.test.ts src/lib/firebaseMap.test.ts src/data/firebase/files.test.ts`
Expected: PASS. Poi `npm test`: tutto verde. Se falliscono test di `pendingPhoto`, `uploadPatch` o `firebaseGate` che si aspettano `https://`, aggiorna solo le aspettative su URL di Storage (`https://example.test/salon/...`) in `file:` dove il test passa davvero per `saveDog`/`saveAppointment`/`saveSettings`; non cambiare la logica di `pendingPhoto.ts`.

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: nessun errore TypeScript.

- [ ] **Step 8: Commit**

```powershell
git add src/data/firebase/client.ts src/data/firebase/client.test.ts src/lib/firebaseMap.ts src/lib/firebaseMap.test.ts src/types/models.ts src/data/local/dogs.ts src/data/local/appointments.ts
git commit -m "feat: foto e listino in salon/shared/files, cancellazione a cascata, niente Storage"
```

(Aggiungi al commit anche altri file di test toccati nello Step 6, con percorso esplicito.)

---

### Task 5: Mostrare `file:{id}` sullo schermo e aprire i PDF

**Files:**
- Create: `src/hooks/useFileSrc.ts`
- Create: `src/hooks/useFileSrc.test.tsx`
- Modify: `src/components/domain/DogAvatar.tsx`
- Modify: `src/pages/DogPage.tsx` (`Portrait` riga ~443, `CenteredPhoto` riga ~681, `Gallery` riga ~714, storico riga ~839)
- Modify: `src/pages/AppointmentPage.tsx` (`PhotoWork` righe ~215-218)
- Modify: `src/pages/PriceViewPage.tsx`
- Modify: `src/lib/openDocument.ts`
- Modify: `package.json` (dipendenze native per aprire il PDF)

**Interfaces:**
- Consumes: Task 4 `readStoredFile(ref, variant)` esportata da `src/data/firebase/client.ts`; Task 2 `isFileRef`.
- Produces:
  - `useFileSrc(value: string | undefined, variant: 'thumb' | 'full'): string | undefined` — restituisce `value` così com’è se non è `file:`; altrimenti `undefined` finché carica, poi un URL `blob:`. Cache in memoria per `ref + variant`, così lo stesso file non si legge due volte.
  - `readFileBlob(ref: string): Promise<Blob>` (in `useFileSrc.ts`) per il PDF.
  - `openPdfBlob(blob: Blob, name: string): Promise<void>` in `openDocument.ts`.

- [ ] **Step 1: Write the failing test** — `src/hooks/useFileSrc.test.tsx`

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const read = vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/webp' }))
vi.mock('../data/firebase/client', () => ({ readStoredFile: read }))

describe('useFileSrc', () => {
  beforeEach(() => {
    read.mockClear()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:uno') }))
  })

  it('lascia passare data: e https:', async () => {
    const { useFileSrc } = await import('./useFileSrc')
    expect(renderHook(() => useFileSrc('data:image/png;base64,QQ==', 'thumb')).result.current).toBe('data:image/png;base64,QQ==')
    expect(renderHook(() => useFileSrc('https://x/y.jpg', 'full')).result.current).toBe('https://x/y.jpg')
    expect(read).not.toHaveBeenCalled()
  })

  it('risolve file:{id} in un blob e lo legge una volta sola', async () => {
    const { useFileSrc } = await import('./useFileSrc')
    const first = renderHook(() => useFileSrc('file:abc', 'thumb'))
    await waitFor(() => expect(first.result.current).toBe('blob:uno'))
    const second = renderHook(() => useFileSrc('file:abc', 'thumb'))
    await waitFor(() => expect(second.result.current).toBe('blob:uno'))
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('file:abc', 'thumb')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useFileSrc.test.tsx`
Expected: FAIL, import non risolto.

- [ ] **Step 3: Write the implementation** — `src/hooks/useFileSrc.ts`

```ts
import { useEffect, useState } from 'react'
import { isFileRef } from '../lib/fileBytes'

type Variant = 'thumb' | 'full'

const urls = new Map<string, Promise<string>>()

async function readBytes(ref: string, variant: Variant): Promise<{ bytes: Uint8Array; mime: string }> {
  const { readStoredFile } = await import('../data/firebase/client')
  return readStoredFile(ref, variant)
}

export async function readFileBlob(ref: string): Promise<Blob> {
  const { bytes, mime } = await readBytes(ref, 'full')
  return new Blob([bytes], { type: mime })
}

function objectUrl(ref: string, variant: Variant): Promise<string> {
  const key = `${variant}:${ref}`
  let found = urls.get(key)
  if (!found) {
    found = readBytes(ref, variant).then(({ bytes, mime }) => URL.createObjectURL(new Blob([bytes], { type: mime })))
    found.catch(() => urls.delete(key))
    urls.set(key, found)
  }
  return found
}

export function useFileSrc(value: string | undefined, variant: Variant): string | undefined {
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null)
  const key = value && isFileRef(value) ? `${variant}:${value}` : ''
  useEffect(() => {
    if (!value || !isFileRef(value)) return
    let active = true
    objectUrl(value, variant).then((url) => {
      if (active) setResolved({ key: `${variant}:${value}`, url })
    }).catch(() => undefined)
    return () => {
      active = false
    }
  }, [value, variant])
  if (!key) return value
  return resolved?.key === key ? resolved.url : undefined
}
```

- [ ] **Step 4: Run test**

Run: `npx vitest run src/hooks/useFileSrc.test.tsx`
Expected: PASS.

- [ ] **Step 5: Usa il hook dove si mostrano le foto**

  - `DogAvatar.tsx`: `const shown = useFileSrc(src, 'thumb')` e `src={shown || avatarForSpecies(species)}`.
  - `DogPage.tsx` `Portrait`: `const shown = useFileSrc(src, 'full')`, stesso uso.
  - `DogPage.tsx` `CenteredPhoto`: `const shown = useFileSrc(src ?? undefined, 'full')`; mostra l’`<img>` solo se `shown`.
  - `DogPage.tsx` griglia della galleria (riga ~714) e storico (riga ~839): estrai un componente piccolo nello stesso file

```tsx
function Thumb({ photo, alt, size }: { photo: string; alt: string; size: number }) {
  const shown = useFileSrc(photo, 'thumb')
  return shown ? <img alt={alt} src={shown} width={size} height={size} style={thumbStyle} /> : <span aria-label={alt} style={{ ...thumbStyle, width: size, height: size, display: 'inline-block', background: 'var(--surf)' }} />
}
```

  e usalo al posto dei due `<img ... style={thumbStyle} />` (stessi `alt` di oggi, `size={50}`).
  - `AppointmentPage.tsx` `PhotoWork`: stesso schema con un componente `WorkThumb` (64 px, `objectFit: 'cover'`, `borderRadius: 8`, stessi `alt` «Prima», «Dopo», «»).
  - `PriceViewPage.tsx`: per le immagini `const shownImage = useFileSrc(file?.mime.startsWith('image/') ? file.dataUrl : undefined, 'full')` e `src={shownImage}`; finché è `undefined` mostra «Apertura…» con `noteStyle`.

- [ ] **Step 6: Aprire un PDF salvato in `files`**

  Su Android un URL `blob:` non si apre con `Browser.open`. Installa i plugin ufficiali compatibili con Capacitor 8:

```powershell
npm install @capacitor/filesystem @capacitor/file-viewer
```

  Se `@capacitor/file-viewer` non ha una versione compatibile con `@capacitor/core` 8 (`npm view @capacitor/file-viewer peerDependencies`), usa `@capawesome-team/capacitor-file-opener` e la sua chiamata `FileOpener.openFile({ path })`. In `src/lib/openDocument.ts` aggiungi:

```ts
import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileViewer } from '@capacitor/file-viewer'

async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export async function openPdfBlob(blob: Blob, name: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const safe = name.replace(/[^\w.-]+/g, '_') || 'listino.pdf'
      const written = await Filesystem.writeFile({ path: safe.endsWith('.pdf') ? safe : `${safe}.pdf`, data: await blobBase64(blob), directory: Directory.Cache })
      await FileViewer.openDocumentFromLocalPath({ path: written.uri })
      return
    }
    const url = URL.createObjectURL(blob)
    if (window.open(url, '_blank', 'noopener') == null) throw new Error('Nessuna app per aprire il PDF')
  } catch {
    throw new Error('Nessuna app per aprire il PDF')
  }
}
```

  In `PriceViewPage.tsx` l’effetto del PDF diventa: se `isFileRef(file.dataUrl)` → `readFileBlob(file.dataUrl).then((blob) => openPdfBlob(blob, file.fileName))`, altrimenti `openPdf(file.dataUrl)` come oggi. Un errore di lettura mostra «File non apribile» (il pezzo mancante del Task 3 finisce qui). Poi `npx cap sync android` nel Task 8 registra i plugin.

- [ ] **Step 7: Run tests and build**

Run: `npm test` poi `npm run build`
Expected: tutto verde. I test esistenti che controllano `src` delle immagini con `data:` passano perché il hook lascia passare `data:`.

- [ ] **Step 8: Commit**

```powershell
git add src/hooks/useFileSrc.ts src/hooks/useFileSrc.test.tsx src/components/domain/DogAvatar.tsx src/pages/DogPage.tsx src/pages/AppointmentPage.tsx src/pages/PriceViewPage.tsx src/lib/openDocument.ts package.json package-lock.json
git commit -m "feat: mostra foto e listino salvati in files, apre i PDF sul telefono"
```

---

### Task 6: Tetti e messaggi (20 foto, foto troppo grande, file oltre 10 MB)

**Files:**
- Modify: `src/pages/DogPage.tsx` (`onPhoto` riga ~975, `Gallery.onFile` riga ~697)
- Modify: `src/pages/AppointmentPage.tsx` (`addPhoto` riga ~861)
- Modify: `src/pages/ListinoPage.tsx` (`priceFrom` riga ~78)
- Create: `src/lib/photoLimit.ts`, `src/lib/photoLimit.test.ts`
- Test: `src/pages/DogPage.test.tsx`, `src/pages/ListinoPage.test.tsx` (aggiungere casi)

**Interfaces:**
- Consumes: `PHOTO_TOO_LARGE`, `PhotoTooLargeError` (Task 1); `FILE_MAX_BYTES`, `FILE_TOO_LARGE` (Task 2).
- Produces: `MAX_DOG_PHOTOS = 20`, `TOO_MANY_PHOTOS = 'Puoi caricare al massimo 20 foto per cane.'`, `dogPhotoCount(dog: { photo?: string; gallery: { photo: string }[] }): number` (riferimenti distinti non vuoti).

- [ ] **Step 1: Write the failing test** — `src/lib/photoLimit.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { MAX_DOG_PHOTOS, TOO_MANY_PHOTOS, dogPhotoCount } from './photoLimit'

describe('photoLimit', () => {
  it('conta profilo e galleria senza doppioni', () => {
    expect(dogPhotoCount({ photo: 'file:a', gallery: [{ photo: 'file:a' }, { photo: 'file:b' }] })).toBe(2)
    expect(dogPhotoCount({ gallery: [] })).toBe(0)
  })

  it('tetto e messaggio', () => {
    expect(MAX_DOG_PHOTOS).toBe(20)
    expect(TOO_MANY_PHOTOS).toBe('Puoi caricare al massimo 20 foto per cane.')
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/photoLimit.test.ts` → FAIL.

- [ ] **Step 3: Implementation** — `src/lib/photoLimit.ts`

```ts
export const MAX_DOG_PHOTOS = 20
export const TOO_MANY_PHOTOS = 'Puoi caricare al massimo 20 foto per cane.'

export function dogPhotoCount(dog: { photo?: string; gallery: { photo: string }[] }): number {
  return new Set([dog.photo, ...dog.gallery.map((item) => item.photo)].filter((photo): photo is string => !!photo)).size
}
```

- [ ] **Step 4: Usa i tetti nelle pagine**

  - `DogPage.tsx` `Gallery.onFile`: prima di `prepareDogPhoto`, se `dogPhotoCount({ photo: profilo attuale, gallery }) >= MAX_DOG_PHOTOS` → `toast.show(TOO_MANY_PHOTOS, 'plain')` e return. Per avere il profilo, passa a `Gallery` una prop `profilePhoto?: string` dal chiamante. Nel `catch`, se l’errore è `PhotoTooLargeError` → `toast.show(PHOTO_TOO_LARGE, 'plain')`, altrimenti `onError()` come oggi.
  - `DogPage.tsx` `onPhoto` (foto profilo): se il profilo è vuoto e il conteggio è già 20 → `TOO_MANY_PHOTOS`. Nel `catch`, `PhotoTooLargeError` → `PHOTO_TOO_LARGE`; altro → messaggio di oggi.
  - `AppointmentPage.tsx` `addPhoto`: nel `catch`, `PhotoTooLargeError` → `PHOTO_TOO_LARGE`, altro → «Foto non utilizzabile» come oggi.
  - `ListinoPage.tsx` `priceFrom`: all’inizio, se `file.size > FILE_MAX_BYTES` → `toast.show(FILE_TOO_LARGE, 'plain')` e `return null`. Per le foto del listino controlla il peso del data URL risultante con la stessa soglia.

- [ ] **Step 5: Test di pagina.** In `src/pages/DogPage.test.tsx` aggiungi un test: un cane con 20 foto in galleria (data URL finti `data:image/jpeg;base64,QQ==` con id diversi), apri la scheda in modifica, scegli un file su «Aggiungi alla galleria» (`userEvent.upload`), aspettati il testo «Puoi caricare al massimo 20 foto per cane.» e che la galleria salvata abbia ancora 20 voci. Prendi come modello i test che già usano `userEvent.upload` in quel file (`rg -n "upload\(" src/pages/DogPage.test.tsx`). In `src/pages/ListinoPage.test.tsx` aggiungi: un `File` con `size` 11 MB (`Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })`) di tipo `application/pdf` → compare «Il file pesa più di 10 MB. Riduci la scansione e riprova.» e il listino non cambia.

- [ ] **Step 6: Run** `npx vitest run src/lib/photoLimit.test.ts src/pages/DogPage.test.tsx src/pages/ListinoPage.test.tsx` → PASS; poi `npm test`.

- [ ] **Step 7: Commit**

```powershell
git add src/lib/photoLimit.ts src/lib/photoLimit.test.ts src/pages/DogPage.tsx src/pages/AppointmentPage.tsx src/pages/ListinoPage.tsx src/pages/DogPage.test.tsx src/pages/ListinoPage.test.tsx
git commit -m "feat: massimo 20 foto per cane, messaggi per foto e file troppo grandi"
```

---

### Task 7: Foto `data:` già sul telefono salgono in `files` al primo avvio

**Files:**
- Modify: `src/data/firebase/client.ts` (nuova `resaveLocalMedia`, chiamata da `ensureShared`)
- Modify: `src/data/firebase/client.test.ts`

**Interfaces:**
- Consumes: `saveDog`, `saveAppointment`, `saveSettings` (Task 4), `listDogs`, `listAppointments`, `getSettings` (già importati in `client.ts`), `storageKeys`, `containsDataUrl` (già in `client.ts`).
- Produces: `export async function resaveLocalMedia(uid: string): Promise<void>`.

Contesto: `useDogs` già rimanda ogni cane con `data:` a `saveDog` all’avvio (`claimDogUpload`, `src/hooks/useDogs.ts` riga ~72), quindi i cani salgono da soli. Appuntamenti e impostazioni non hanno questo giro.

- [ ] **Step 1: Write the failing test** in `client.test.ts`

```ts
  it('all’avvio le foto data: di appuntamenti e listino salgono in files', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const visits = JSON.parse(localStorage.getItem(storageKeys.appointments('fb-1')) ?? '{}') as Record<string, Record<string, unknown>>
    visits[appointment.id] = { ...visits[appointment.id], photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }] }
    localStorage.setItem(storageKeys.appointments('fb-1'), JSON.stringify(visits))
    const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
    localStorage.setItem(storageKeys.settings('fb-1'), JSON.stringify({
      ...settings,
      priceList: { id: 'pf1', fileName: 'l.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }))
    await client.resaveLocalMedia('fb-1')
    const storedVisit = fs.store.get('salon/shared/appointments')?.get(appointment.id)
    const storedSettings = fs.store.get('salon/shared/settings')?.get('main')
    expect(JSON.stringify(storedVisit)).toContain('file:')
    expect(JSON.stringify(storedVisit)).not.toContain('data:')
    expect(JSON.stringify(storedSettings)).not.toContain('data:')
    expect(fs.store.get('salon/shared/files')?.size).toBe(2)
  })
```

- [ ] **Step 2: Run** `npx vitest run src/data/firebase/client.test.ts` → FAIL (`resaveLocalMedia` non esiste).

- [ ] **Step 3: Implementation** in `client.ts`

```ts
export async function resaveLocalMedia(uid: string): Promise<void> {
  for (const appointment of listAppointments(uid)) {
    if (!containsDataUrl(appointment.photos ?? [])) continue
    await saveAppointment(uid, appointment, true).catch(() => undefined)
  }
  if (localStorage.getItem(storageKeys.settings(uid)) != null) {
    const settings = getSettings(uid)
    if (containsDataUrl([settings.priceList, ...settings.priceListHistory])) {
      await saveSettings(uid, settings, true).catch(() => undefined)
    }
  }
}
```

  In `ensureShared`, dopo `replayLocalDeletion()`, accoda senza bloccare: `.then(() => { void resaveLocalMedia(uid).catch(() => undefined) })`. Un errore lascia il `data:` com’è e si riprova all’avvio dopo (spec §5).

  Attenzione: in modalità salone la copia locale degli appuntamenti si legge con la chiave `storageKeys.appointments(uid)`; `listAppointments(uid)` legge proprio quella, come nel test.

- [ ] **Step 4: Run** `npx vitest run src/data/firebase/client.test.ts` → PASS; poi `npm test`.

- [ ] **Step 5: Commit**

```powershell
git add src/data/firebase/client.ts src/data/firebase/client.test.ts
git commit -m "feat: le foto e i file data: rimasti sul telefono salgono in files all'avvio"
```

---

### Task 8: Regole Firestore, niente Storage in config e nella pubblicazione

**Files:**
- Modify: `firestore.rules`
- Modify: `firebase.json`
- Delete: `storage.rules`
- Modify: `.cursor/rules/publish-update.mdc` (sezione 4)
- Create: `src/config/firebaseConfig.test.ts`

- [ ] **Step 1: Write the failing test** — `src/config/firebaseConfig.test.ts`

```ts
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../..')

describe('configurazione Firebase', () => {
  it('firebase.json non pubblica Storage e storage.rules non esiste', () => {
    const config = JSON.parse(readFileSync(resolve(root, 'firebase.json'), 'utf8')) as Record<string, unknown>
    expect(config.storage).toBeUndefined()
    expect(existsSync(resolve(root, 'storage.rules'))).toBe(false)
  })

  it('le regole mettono i tetti a files', () => {
    const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8')
    expect(rules).toContain('match /salon/shared/files/{fileId}')
    expect(rules).toContain('thumb.size() < 25000')
    expect(rules).toContain('dati.size() <= 716800')
    expect(rules).toContain('dati.size() <= 614400')
  })

  it('solo il backup importa firebase/storage', () => {
    const client = readFileSync(resolve(root, 'src/data/firebase/client.ts'), 'utf8')
    const uses = client.split('\n').filter((line) => line.includes("import('firebase/storage')"))
    expect(uses.length).toBeLessThanOrEqual(2)
    expect(client).not.toContain('uploadDataUrl')
  })
})
```

(Le due righe ammesse sono `getStorage` in `bucket()` e `ref, uploadString` in `uploadBackupFile`.)

- [ ] **Step 2: Run** `npx vitest run src/config/firebaseConfig.test.ts` → FAIL.

- [ ] **Step 3: `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /salon/shared/files/{fileId} {
      allow read: if request.auth != null;
      allow delete: if request.auth != null;
      allow create, update: if request.auth != null
        && (!('thumb' in request.resource.data) || request.resource.data.thumb.size() < 25000);

      match /full/{part} {
        allow read, delete: if request.auth != null;
        allow create, update: if request.auth != null && request.resource.data.dati.size() <= 716800;
      }

      match /chunks/{n} {
        allow read, delete: if request.auth != null;
        allow create, update: if request.auth != null && request.resource.data.dati.size() <= 614400;
      }
    }
    match /salon/shared/{kind}/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && kind != 'files';
    }
    match /salon/shared/{kind}/{id}/{rest=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && kind != 'files';
    }
    match /users/{uid}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

  Perché così: in Firestore le regole che combaciano si sommano in OR. La vecchia `match /salon/{document=**}` con `allow write` per chiunque abbia fatto l’accesso annullerebbe i tetti di `files`. Tutti i percorsi del salone usati dall’app hanno la forma `salon/shared/{kind}/{id}` (`sharedPath` in `client.ts`; controlla con `rg -n "'salon'" src --glob "!**/*.test.*"` che non ce ne siano altri: se ci sono, aggiungi una regola per loro). Le regole generiche escludono `files`, che ha le sue.

  Aggiungi al test dello Step 1: `expect(rules).toContain("kind != 'files'")` e `expect(rules).not.toContain('match /salon/{document=**}')`.

- [ ] **Step 4: `firebase.json`** — togli il blocco `"storage": { "rules": "storage.rules" },`. Cancella `storage.rules` con `git rm storage.rules`.

- [ ] **Step 5: `.cursor/rules/publish-update.mdc`** — sezione 4: il comando diventa

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

  e la frase su Storage diventa: «Foto e listino stanno in Firestore (`salon/shared/files`); Storage non si pubblica.» Togli anche «Se Storage non è ancora attivato in console, pubblica comunque Firestore e Hosting e segnalalo.»

- [ ] **Step 6: Run** `npx vitest run src/config/firebaseConfig.test.ts` → PASS; poi `npm test` e `npm run build`.

- [ ] **Step 7: Commit**

```powershell
git add firestore.rules firebase.json src/config/firebaseConfig.test.ts .cursor/rules/publish-update.mdc
git rm storage.rules
git commit -m "chore: regole Firestore con i tetti di files, Storage fuori da config e pubblicazione"
```

---

## Dopo i task (controllore, non subagente)

1. `npm test` e `npm run build` verdi.
2. Pubblicazione v1.1.34 secondo `.cursor/rules/publish-update.mdc` aggiornata (senza `storage` nel deploy).
