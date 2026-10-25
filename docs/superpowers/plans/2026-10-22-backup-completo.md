# Backup completo Implementation Plan

Eseguito — vedi commit 3c6a3cf

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il pulsante Backup completo, che consegna uno ZIP con i dati, il Registro collegato alle cartelle e i file letti.

**Architecture:** `backupCompleto` è una funzione pura, sorella di `backupZip`. Il pulsante accumula i byte che `onFile` consegna, genera l'Excel con `cartellaFoto` e poi lo ZIP. `registroXlsx` lascia vuota la cella quando il collegamento è una stringa vuota.

**Tech Stack:** TypeScript, Vitest, happy-dom, JSZip 3.10.2, exceljs 4.4.0. Nessuna dipendenza nuova.

## Global Constraints

- `backupCompleto(raccolto, registro, file, now)` sta in `src/lib/backupCompleto.ts`. `src/lib/backupZip.ts` non si modifica.
- `raccolto` ha `json`, `manifest` e `dati`. `file` è `{ percorso: string; bytes: Uint8Array }[]`.
- `dati/groomly-dati.json` è la stringa `json`, senza un altro `JSON.stringify` e senza togliere `passwordHash`.
- `dati/manifest.json` è `JSON.stringify(manifest, null, 2)`. La funzione non ricalcola il checksum e non confronta i conteggi.
- `cartellaFoto(percorso, percorsiScritti)` restituisce la cartella con `/` finale solo se un file scritto sta direttamente lì. Altrimenti `''`.
- `registroXlsx`: `''` da `risolviLink` lascia la cella vuota. La colonna resta. `giornoExcel` non si tocca. Il pulsante Registro Excel non passa `risolviLink`.
- `dati/foto-mancanti.txt` solo se l'elenco ha righe, nell'ordine ricevuto. Riga: `id motivo` e, se ci sono, `byteSize` poi `lunghezza`, separati da spazio. A capo finale.
- `LEGGIMI.txt` usa i cinque conteggi del manifest. `Foto non lette: N` usa `dati.fotoMancanti.length` e compare solo se N > 0.
- File dell'elenco e `Registro Groomly.xlsx`: `compression: 'STORE'`. Testi e JSON: default DEFLATE. Dopo `loadAsync` si legge `_data.compression.magic`: `\x00\x00` STORE, `\x08\x00` DEFLATE.
- Nome: `Groomly Backup completo – {nomeSicuro} – {romeDay}.zip`. Il trattino è U+2013. Salone vuoto: si passa `Groomly` a `nomeSicuro`.
- Il pulsante chiama `raccogliBackup(now, { includiByte: true, onFile })` e accumula il terzo argomento. `completoBusy` disabilita solo quel pulsante.
- Condivisione: titolo «Backup Groomly». Annullare resta in silenzio. Senza rete: «Serve la connessione per creare il backup». Altro errore: «Esportazione non riuscita».
- Non si modificano `exportRegistro`, `exportBackupZip`, il chip, `uploadBackupFile`, `enabled.ts`, `client.ts`, `vite.config.ts`, `firebaseEnv.test.ts`.
- La base è `812ccae` o un discendente. Non si lavora in `D:\Groomly-worktrees\backup-zip`.
- Si pubblica 1.1.72, `versionCode` 10172, solo se l'APK contiene la chiave Firebase. Questa fase di piano non alza la versione.
- Commit con `git add` e poi `git commit --only -m "msg" -- percorsi`, così l'indice sporco di `D:\Groomly` non entra. I comandi si eseguono nel worktree `D:\Groomly-worktrees\backup-completo`.

---

### Task 1: Archivio e collegamento vuoto

**Files:**
- Create: `src/lib/backupCompleto.ts`
- Create: `src/lib/backupCompleto.test.ts`
- Modify: `src/lib/registroXlsx.ts` (solo `link`)
- Test: `src/lib/registroXlsx.test.ts`

**Interfaces:**
- Consumes: `registroXlsx(dati, { now, risolviLink })`, `buildManifest`, `canonicalJson`, `sha256Hex`, `nomeSicuro`, `romeDay`, JSZip.
- Produces: `backupCompleto(raccolto: { json: string; manifest: BackupManifest; dati: GroomlyDati }, registro: Blob, file: ReadonlyArray<{ percorso: string; bytes: Uint8Array }>, now: Date): Promise<{ blob: Blob; name: string }>` e `cartellaFoto(percorso: string, percorsiScritti: readonly string[]): string`.

- [ ] **Step 1: Write the failing test**

Creare `src/lib/backupCompleto.test.ts` con questo contenuto. Il trattino nel nome del file è U+2013.

```ts
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { backupCompleto, cartellaFoto } from './backupCompleto'
import { buildManifest, canonicalJson, sha256Hex, type BackupFileMeta, type BackupManifest, type GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-22T12:00:00.000Z')
const PERCORSO = 'cani/C0001 - Fido/profilo.webp'

function meta(id: string, percorsoBackup: string, extra: Partial<BackupFileMeta> = {}): BackupFileMeta {
  return {
    id,
    kind: 'foto',
    owner: 'dog:d1',
    name: 'profilo.webp',
    mime: 'image/webp',
    byteSize: 3,
    chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z',
    createdBy: 'u',
    estensione: '.webp',
    percorsoBackup,
    esito: 'ok',
    ...extra,
  }
}

function dati(salonName: string): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {
      d1: {
        id: 'd1', name: 'Fido', breed: 'Barboncino',
        contact: { name: 'Ada', phone: '0333' },
        photo: 'file:f1', gallery: [], status: 'attivo',
      },
    },
    appointments: {},
    services: {},
    settings: { business: { salonName } },
    closures: {},
    files: { f1: meta('f1', PERCORSO) },
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    fotoMancanti: [
      { id: 'm1', motivo: 'assente' },
      { id: 'm2', motivo: 'dimensione', byteSize: 12, lunghezza: 9 },
    ],
  }
}

async function raccolto(salonName: string, base = dati(salonName)) {
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: true })
  return { base, json, checksum, manifest }
}

async function voci(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name).sort()
  return { zip, files }
}

function magic(file: JSZip.JSZipObject): string {
  const data = file as JSZip.JSZipObject & { _data?: { compression?: { magic?: string } } }
  return data._data?.compression?.magic ?? ''
}

function leggiMi(manifest: BackupManifest, mancanti: number): string {
  const nome = manifest.salone.nome.trim() || 'Groomly'
  const counts = manifest.conteggi
  const lines = [
    'Backup Groomly',
    `Salone: ${nome}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone, il Registro Excel e le cartelle dei file.',
    'Estrai lo ZIP prima di aprire l\'Excel, altrimenti i link alle cartelle non funzionano.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
  ]
  if (mancanti > 0) {
    lines.push('', `Foto non lette: ${mancanti}`, 'L\'elenco è in dati/foto-mancanti.txt.')
  }
  lines.push('')
  return lines.join('\n')
}

describe('cartellaFoto', () => {
  it('apre la cartella solo se contiene un file scritto', () => {
    expect(cartellaFoto(PERCORSO, [PERCORSO])).toBe('cani/C0001 - Fido/')
    expect(cartellaFoto(PERCORSO, ['cani/C0001 - Fido/2026-10-15 - Bagno/prima-01.webp'])).toBe('')
    expect(cartellaFoto('profilo.webp', ['profilo.webp'])).toBe('')
  })
})

describe('backupCompleto', () => {
  it('mette i file letti, i mancanti e il Registro con la cartella', async () => {
    const pronto = await raccolto('Pelosetti')
    const percorsi = [PERCORSO, 'listino/logo.webp']
    const registro = await registroXlsx(pronto.base, { now: NOW, risolviLink: (percorso) => cartellaFoto(percorso, percorsi) })
    const file = await backupCompleto(
      { json: pronto.json, manifest: pronto.manifest, dati: pronto.base },
      registro,
      [{ percorso: PERCORSO, bytes: Uint8Array.of(1, 2, 3) }, { percorso: 'listino/logo.webp', bytes: Uint8Array.of(4, 5) }],
      NOW,
    )
    expect(file.blob.type).toBe('application/zip')
    expect(file.name).toBe('Groomly Backup completo – Pelosetti – 2026-10-22.zip')
    const opened = await voci(file.blob)
    expect(opened.files).toEqual([
      'LEGGIMI.txt',
      'Registro Groomly.xlsx',
      PERCORSO,
      'dati/foto-mancanti.txt',
      'dati/groomly-dati.json',
      'dati/manifest.json',
      'listino/logo.webp',
    ])
    expect(await opened.zip.file('dati/foto-mancanti.txt')!.async('string')).toBe('m1 assente\nm2 dimensione 12 9\n')
    const json = await opened.zip.file('dati/groomly-dati.json')!.async('string')
    expect(json).toBe(pronto.json)
    expect(await sha256Hex(json)).toBe(pronto.checksum)
    const manifest = JSON.parse(await opened.zip.file('dati/manifest.json')!.async('string')) as BackupManifest
    expect(manifest.tipo).toBe('completo')
    expect(manifest.fotoIncluse).toBe(true)
    expect(manifest.checksum['groomly-dati.json']).toBe(pronto.checksum)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toBe(leggiMi(pronto.manifest, 2))
    expect(magic(opened.zip.file(PERCORSO)!)).toBe('\x00\x00')
    expect(magic(opened.zip.file('Registro Groomly.xlsx')!)).toBe('\x00\x00')
    expect(magic(opened.zip.file('LEGGIMI.txt')!)).toBe('\x08\x00')
    expect(await opened.zip.file(PERCORSO)!.async('uint8array')).toEqual(Uint8Array.of(1, 2, 3))
    const excel = await import('exceljs')
    const ExcelJS = excel.default ?? excel
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await opened.zip.file('Registro Groomly.xlsx')!.async('arraybuffer'))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    const href = raw && typeof raw === 'object' && 'hyperlink' in raw ? raw.hyperlink : cell?.hyperlink
    expect(text).toBe('Apri cartella')
    expect(href).toBe('cani/C0001 - Fido/')
  })

  it('senza mancanti non scrive l elenco', async () => {
    const base = dati('Pelosetti')
    base.fotoMancanti = []
    const pronto = await raccolto('Pelosetti', base)
    const registro = await registroXlsx(pronto.base, { now: NOW })
    const file = await backupCompleto({ json: pronto.json, manifest: pronto.manifest, dati: pronto.base }, registro, [], NOW)
    const opened = await voci(file.blob)
    expect(opened.files).not.toContain('dati/foto-mancanti.txt')
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).not.toContain('Foto non lette')
  })

  it('sistema il nome vuoto e il nome con la barra', async () => {
    const registro = await registroXlsx(dati('Pelosetti'), { now: NOW })
    const vuoto = dati('')
    vuoto.fotoMancanti = []
    const primo = await raccolto('', vuoto)
    const fileVuoto = await backupCompleto({ json: primo.json, manifest: primo.manifest, dati: primo.base }, registro, [], NOW)
    expect(fileVuoto.name).toBe('Groomly Backup completo – Groomly – 2026-10-22.zip')
    const slash = dati('A/B')
    slash.fotoMancanti = []
    const secondo = await raccolto('A/B', slash)
    const fileSlash = await backupCompleto({ json: secondo.json, manifest: secondo.manifest, dati: secondo.base }, registro, [], NOW)
    expect(fileSlash.name).toContain('AB')
    expect(await (await JSZip.loadAsync(await fileSlash.blob.arrayBuffer())).file('LEGGIMI.txt')!.async('string')).toContain('Salone: A/B')
  })
})
```

In `src/lib/registroXlsx.test.ts`, dopo il test «con risolviLink aggiunge Apri cartella», aggiungere:

```ts
  it('risolviLink vuoto lascia la cella vuota', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW, risolviLink: () => '' }))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).toContain('Cartella foto')
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    expect(text).not.toBe('Apri cartella')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backupCompleto.test.ts src/lib/registroXlsx.test.ts`

Expected: FAIL. `backupCompleto` non esiste. Il test del collegamento vuoto trova ancora «Apri cartella».

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/backupCompleto.ts`:

```ts
import JSZip from 'jszip'
import type { BackupManifest, GroomlyDati } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'

function nomeSalone(manifest: BackupManifest): string {
  return manifest.salone.nome.trim() || 'Groomly'
}

export function cartellaFoto(percorso: string, percorsiScritti: readonly string[]): string {
  const slash = percorso.lastIndexOf('/')
  if (slash <= 0) return ''
  const cartella = percorso.slice(0, slash)
  const prefix = `${cartella}/`
  const presente = percorsiScritti.some((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
  return presente ? prefix : ''
}

function rigaMancante(row: GroomlyDati['fotoMancanti'][number]): string {
  const parts = [row.id, row.motivo]
  if (row.byteSize !== undefined) parts.push(String(row.byteSize))
  if (row.lunghezza !== undefined) parts.push(String(row.lunghezza))
  return parts.join(' ')
}

function leggiMi(manifest: BackupManifest, mancanti: number): string {
  const counts = manifest.conteggi
  const lines = [
    'Backup Groomly',
    `Salone: ${nomeSalone(manifest)}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone, il Registro Excel e le cartelle dei file.',
    'Estrai lo ZIP prima di aprire l\'Excel, altrimenti i link alle cartelle non funzionano.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
  ]
  if (mancanti > 0) {
    lines.push('', `Foto non lette: ${mancanti}`, 'L\'elenco è in dati/foto-mancanti.txt.')
  }
  lines.push('')
  return lines.join('\n')
}

export async function backupCompleto(
  raccolto: { json: string; manifest: BackupManifest; dati: GroomlyDati },
  registro: Blob,
  file: ReadonlyArray<{ percorso: string; bytes: Uint8Array }>,
  now: Date,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  const mancanti = raccolto.dati.fotoMancanti
  zip.file('LEGGIMI.txt', leggiMi(raccolto.manifest, mancanti.length))
  zip.file('Registro Groomly.xlsx', await registro.arrayBuffer(), { compression: 'STORE' })
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  if (mancanti.length > 0) zip.file('dati/foto-mancanti.txt', `${mancanti.map(rigaMancante).join('\n')}\n`)
  for (const item of file) zip.file(item.percorso, item.bytes, { compression: 'STORE' })
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  const name = `Groomly Backup completo – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
```

In `src/lib/registroXlsx.ts`, sostituire `link` con:

```ts
function link(opzioni: RegistroOpzioni, percorso: string): Cella {
  if (!opzioni.risolviLink || !percorso) return null
  const href = opzioni.risolviLink(percorso)
  if (!href) return null
  return { text: 'Apri cartella', hyperlink: href }
}
```

Non modificare `giornoExcel` né le altre funzioni.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backupCompleto.test.ts src/lib/registroXlsx.test.ts src/lib/backupZip.test.ts`

Expected: PASS. I test di `backupZip` restano verdi.

Poi: `npx tsc --noEmit`

Expected: exit 0. `noUnusedLocals` e `noUnusedParameters` sono accesi.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/backupCompleto.ts src/lib/backupCompleto.test.ts src/lib/registroXlsx.ts src/lib/registroXlsx.test.ts
git commit --only -m "feat: archivio del backup completo con le cartelle" -- src/lib/backupCompleto.ts src/lib/backupCompleto.test.ts src/lib/registroXlsx.ts src/lib/registroXlsx.test.ts
```

---

### Task 2: Pulsante Backup completo

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `backupCompleto` e `cartellaFoto` dal task 1. `raccogliBackup(now, { includiByte: true, onFile })`. `onFile` è `(meta, bytes, percorsoBackup) => void`.
- Produces: il pulsante «Backup completo» sotto Backup ZIP.

- [ ] **Step 1: Write the failing test**

In `src/pages/SettingsPage.test.tsx`, sotto `raccoltoZip`, aggiungere. Non modificare `raccoltoZip` né i due test di Backup ZIP.

```ts
async function raccoltoCompleto() {
  const base = datiRegistro()
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte: true })
  return { dati: base, json, checksum, manifest }
}
```

Dentro `describe('impostazioni')`, dopo il test «Backup ZIP senza rete», aggiungere:

```ts
  it('Backup completo consegna il file del giorno di Roma e intanto è disabilitato', async () => {
    const pronto = await raccoltoCompleto()
    let release: (value: typeof pronto) => void = () => undefined
    const gate = new Promise<typeof pronto>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Backup completo' })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Backup ZIP' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Registro Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
    await waitFor(() => expect(raccogliBackup).toHaveBeenCalledWith(expect.any(Date), expect.objectContaining({ includiByte: true, onFile: expect.any(Function) })))
    release(pronto)
    const name = `Groomly Backup completo – Pelosetti – ${romeDay(new Date())}.zip`
    await waitFor(() => expect(downloads.some((item) => item.name === name)).toBe(true), { timeout: 10_000 })
  })

  it('Backup completo senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Backup completo' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL, unable to find a button named Backup completo.

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx`, accanto a `zipBusy`:

```ts
  const [completoBusy, setCompletoBusy] = useState(false)
```

Aggiungere questa funzione nel componente, senza modificare `exportRegistro` né `exportBackupZip`:

```ts
  async function exportBackupCompleto() {
    if (!uid || completoBusy) return
    setCompletoBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const { backupCompleto, cartellaFoto } = await import('../lib/backupCompleto')
      const scritti: string[] = []
      const file: { percorso: string; bytes: Uint8Array }[] = []
      const raccolto = await raccogliBackup(now, {
        includiByte: true,
        onFile: (meta, bytes, percorso) => {
          void meta
          scritti.push(percorso)
          file.push({ percorso, bytes })
        },
      })
      const registro = await registroXlsx(raccolto.dati, { now, risolviLink: (percorso) => cartellaFoto(percorso, scritti) })
      const pronto = await backupCompleto(raccolto, registro, file, now)
      if (Capacitor.isNativePlatform()) await shareFiles([pronto], 'Backup Groomly')
      else downloadAnchor(pronto.blob, pronto.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setCompletoBusy(false)
    }
  }
```

Subito dopo la `SRow` di Backup ZIP, prima di `</Card>` e di Personalizza:

```tsx
          <SRow>
            <Button onClick={() => void exportBackupCompleto()} disabled={completoBusy} aria-busy={completoBusy} style={{ flex: 1 }}>
              Backup completo
            </Button>
          </SRow>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/backupCompleto.test.ts`

Expected: PASS

Poi: `npx tsc --noEmit`

Expected: exit 0.

Poi, una volta sola: `npm test`

Expected: PASS. Se l'attesa del download scade sotto la suite intera, alzare solo quel `waitFor` restando dentro il `testTimeout` di Vitest (15 secondi). Il test deve continuare a esigere il nome del file.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit --only -m "feat: pulsante Backup completo nella scheda backup" -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
```

---

### Task 3: Pubblicazione

Solo dopo che il task 2 ha la suite verde. La scheda è cambiata: si alza la patch da `1.1.71` a `1.1.72`. `versionCode` diventa `10172`.

- [ ] **Step 1: Alzare la versione negli stessi quattro punti**

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.72'`
- `package.json` → `"version": "1.1.72"`
- `android/app/build.gradle` → `versionName "1.1.72"` e `versionCode 10172`
- `hosting/release.json` → `version` `1.1.72`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.72/groomly.apk`, e nelle note la frase «In Dati e backup, Backup completo crea un archivio con i dati, il Registro e le cartelle dei file.»

Non modificare `enabled.ts`, `client.ts`, `vite.config.ts`, `firebaseEnv.test.ts`.

- [ ] **Step 2: Verificare e costruire**

`npm test`, poi `npm run build`, `npx cap sync android`. Se il sync sporca solo i fine riga di `android/app/capacitor.build.gradle` o `android/capacitor.settings.gradle`, ripristinarli con `git checkout --` e non committarli.

In `android`: `.\gradlew assembleDebug`. Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice del worktree e in `D:\Groomly\groomly.apk`, fuori da `hosting/` e fuori dal commit.

Prima del commit, controllare l'APK. Se manca la chiave, fermarsi e non pubblicare.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("groomly.apk")
$js = $zip.Entries | Where-Object { $_.FullName -match 'assets/public/assets/index-.*\.js$' } | Select-Object -First 1
$reader = New-Object System.IO.StreamReader($js.Open())
$text = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()
if (-not $text.Contains('AIza')) { throw 'APK senza chiave Firebase' }
if (-not $text.Contains('1.1.72')) { throw 'APK senza versione 1.1.72' }
```

- [ ] **Step 3: Commit, merge, push e release**

Il commit della versione si fa nel worktree. Poi, in `D:\Groomly` sul ramo `feat/listino-razze`, `git merge --ff-only feat/backup-completo`. Non includere le modifiche d'archivio aperte su `D:\Groomly`.

```powershell
git add -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit --only -m "release: 1.1.72, Backup completo nella scheda backup" -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
```

Da `D:\Groomly`, dopo il fast-forward:

```powershell
git push origin HEAD
gh release create v1.1.72 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.72" --notes "In Dati e backup, Backup completo crea un archivio con i dati, il Registro e le cartelle dei file."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook. Non committare `groomly.apk`. Non cancellare il worktree.

---

## Copertura della specifica

- Archivio, percorsi, checksum, STORE, LEGGIMI, mancanti, nome del file, `cartellaFoto`: task 1.
- Cella vuota quando `risolviLink` restituisce `''`: task 1.
- Pulsante, `includiByte: true`, `onFile`, attesa separata, errori: task 2.
- Backup ZIP, Registro Excel, chip e login non si toccano: i file non sono nei task 1 e 2, e il task 3 rifiuta l'APK senza chiave.
- Pubblicazione 1.1.72 solo a suite verde: task 3.
