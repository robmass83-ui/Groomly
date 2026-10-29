# ZIP solo dati — piano

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Eseguito — vedi commit c1ee758

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il pulsante Backup ZIP nella card Dati e backup, che consegna un archivio con LEGGIMI, Registro Excel e i due JSON del raccoglitore, senza foto.

**Architecture:** `backupZip` riceve il risultato del raccoglitore e il Blob del Registro e li mette in uno ZIP in memoria con JSZip. La pagina chiama `raccogliBackup` con `includiByte: false`, genera l'Excel senza `risolviLink`, poi condivide il file. Esporta e Registro Excel restano funzioni separate.

**Tech Stack:** TypeScript, Vitest, happy-dom, JSZip e exceljs già in dipendenza. Nessuna dipendenza nuova. Shell: PowerShell, un comando per volta, senza `&&`. Eseguire su un worktree pulito: `D:\Groomly` ha modifiche d'archivio non correlate. Un commit del task elenca solo i file di quel task (`git commit --only -m "..." -- <file>` se l'indice contiene altro).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-22-backup-zip-design.md`. Per i fogli dell'Excel prevale `docs/superpowers/specs/2026-10-22-registro-excel-design.md`. Per codici, fuso, lapidi, checksum e lettura del salone prevale `docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`.
- JSZip in memoria. Non aggiungere `fflate`, `zip.js` o file temporanei.
- Il pulsante chiama `raccogliBackup(now, { includiByte: false })` e `registroXlsx(dati, { now })` senza `risolviLink`. Nessun byte di foto. La colonna «Cartella foto» non c'è.
- `dati/groomly-dati.json` è la stringa `json` del raccoglitore, UTF-8, senza un a capo aggiunto. Non rifare `JSON.stringify` su quei dati.
- `dati/manifest.json` è `JSON.stringify(manifest, null, 2)`. `tipo` è `solo-dati`, `fotoIncluse` è `false`. La funzione non ricalcola il checksum e non confronta `checksum` con il manifest.
- `LEGGIMI.txt` è il testo del §2 della spec, UTF-8, righe `\n`, con un a capo finale. I conteggi sono quelli del manifest, anche se le foto non sono nel file. Gli appuntamenti del conteggio includono i personali.
- Nome file: `Groomly Backup – {nomeSicuro(salone)} – {romeDay(now)}.zip`. Il trattino lungo è U+2013. Salone vuoto: `Groomly`. Quel nome va a `shareFiles` e a `downloadAnchor`. Se il filesystem lo rifiuta, fermarsi e dirlo: non rinominare in silenzio.
- «Esegui ora», il toggle, Esporta, Ripristina, Registro Excel, il chip e `uploadBackupFile` non si modificano. `exportRegistro` non si modifica. Il chip non si aggiorna.
- Sul nativo, `shareFiles([{ blob, name }], 'Backup Groomly')`. Nel browser, `downloadAnchor`. Annullare la condivisione non mostra un avviso.
- Senza rete: toast «Serve la connessione per creare il backup». Ogni altro errore del pulsante: «Esportazione non riuscita».
- Il pulsante ha un proprio stato di attesa. Mentre gira, solo lui è disabilitato.
- I task 1 e 2 non alzano `APP_VERSION` e non pubblicano. Pubblica solo il task 3, a suite verde.
- `tsconfig` ha `noUnusedLocals` e `noUnusedParameters`. `npx tsc --noEmit` prima di ogni commit: Vitest non fa il controllo tipi.
- Non committare `groomly.apk`, `android/app/build`, `.env.local`, `.agents/`, `.grok/`, `.claude/`.

---

### Task 1: ZIP in memoria

**Files:**
- Create: `src/lib/backupZip.ts`
- Create: `src/lib/backupZip.test.ts`

**Interfaces:**
- Consumes: `BackupManifest`, `GroomlyDati`, `buildManifest`, `canonicalJson`, `sha256Hex` da `src/lib/backupBundle.ts`; `nomeSicuro` da `src/lib/nomeSicuro.ts`; `romeDay` da `src/lib/romeTime.ts`; `registroXlsx` da `src/lib/registroXlsx.ts`; `JSZip` già in dipendenza.
- Produces:

```ts
export async function backupZip(
  raccolto: { json: string; manifest: BackupManifest },
  registro: Blob,
  now: Date,
): Promise<{ blob: Blob; name: string }>
```

`checksum` non è nel tipo: la funzione non lo legge, e `noUnusedParameters` è attivo. Il risultato di `raccogliBackup` ha anche `checksum` e si può passare lo stesso, perché i campi in più sono ammessi.

- [ ] **Step 1: Write the failing test**

Creare `src/lib/backupZip.test.ts`.

```ts
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { backupZip } from './backupZip'
import { buildManifest, canonicalJson, sha256Hex, type BackupManifest, type GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-22T12:00:00.000Z')

function dati(salonName: string): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
  }
}

async function raccolto(salonName: string) {
  const base = dati(salonName)
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: false })
  return { base, json, checksum, manifest }
}

async function voci(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name).sort()
  return { zip, files }
}

function leggiMi(manifest: BackupManifest): string {
  const nome = manifest.salone.nome.trim() || 'Groomly'
  const counts = manifest.conteggi
  return [
    'Backup Groomly',
    `Salone: ${nome}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone e il Registro Excel.',
    'Estrai lo ZIP prima di aprire l\'Excel.',
    '',
    'Le cartelle delle foto arrivano con il backup completo.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
    '',
  ].join('\n')
}

describe('backupZip', () => {
  it('mette i quattro file, il checksum e il Registro senza cartelle', async () => {
    const pronto = await raccolto('Pelosetti')
    const registro = await registroXlsx(pronto.base, { now: NOW })
    const file = await backupZip({ json: pronto.json, manifest: pronto.manifest }, registro, NOW)
    expect(file.blob.type).toBe('application/zip')
    expect(file.name).toBe('Groomly Backup – Pelosetti – 2026-10-22.zip')
    const opened = await voci(file.blob)
    expect(opened.files).toEqual(['LEGGIMI.txt', 'Registro Groomly.xlsx', 'dati/groomly-dati.json', 'dati/manifest.json'])
    expect(Object.keys(opened.zip.files).some((name) => name.startsWith('cani/') || name.startsWith('listino/'))).toBe(false)
    const json = await opened.zip.file('dati/groomly-dati.json')!.async('string')
    expect(json).toBe(pronto.json)
    expect(await sha256Hex(json)).toBe(pronto.checksum)
    const manifest = JSON.parse(await opened.zip.file('dati/manifest.json')!.async('string')) as BackupManifest
    expect(manifest.tipo).toBe('solo-dati')
    expect(manifest.fotoIncluse).toBe(false)
    expect(manifest.checksum['groomly-dati.json']).toBe(pronto.checksum)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toBe(leggiMi(pronto.manifest))
    const excel = await import('exceljs')
    const ExcelJS = excel.default ?? excel
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await opened.zip.file('Registro Groomly.xlsx')!.async('arraybuffer'))
    const headers = (workbook.getWorksheet('Cani')?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).not.toContain('Cartella foto')
  })

  it('usa Groomly se il salone non ha nome e toglie la barra dal nome del file', async () => {
    const vuoto = await raccolto('')
    const registro = await registroXlsx(vuoto.base, { now: NOW })
    const senzaNome = await backupZip({ json: vuoto.json, manifest: vuoto.manifest }, registro, NOW)
    expect(senzaNome.name).toBe('Groomly Backup – Groomly – 2026-10-22.zip')
    const slash = await raccolto('A/B')
    const conBarra = await backupZip({ json: slash.json, manifest: slash.manifest }, registro, NOW)
    expect(conBarra.name).toBe('Groomly Backup – AB – 2026-10-22.zip')
    const opened = await voci(conBarra.blob)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toContain('Salone: A/B')
  })
})
```

Un marcatore di cartella `dati/` creato da JSZip è ammesso: il test conta solo i file, con `!file.dir`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/backupZip.test.ts`

Expected: FAIL, cannot find module `./backupZip`

- [ ] **Step 3: Write minimal implementation**

Creare `src/lib/backupZip.ts`.

```ts
import JSZip from 'jszip'
import type { BackupManifest } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'

function nomeSalone(manifest: BackupManifest): string {
  return manifest.salone.nome.trim() || 'Groomly'
}

function leggiMi(manifest: BackupManifest): string {
  const counts = manifest.conteggi
  return [
    'Backup Groomly',
    `Salone: ${nomeSalone(manifest)}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone e il Registro Excel.',
    'Estrai lo ZIP prima di aprire l\'Excel.',
    '',
    'Le cartelle delle foto arrivano con il backup completo.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
    '',
  ].join('\n')
}

export async function backupZip(
  raccolto: { json: string; manifest: BackupManifest },
  registro: Blob,
  now: Date,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', leggiMi(raccolto.manifest))
  zip.file('Registro Groomly.xlsx', await registro.arrayBuffer())
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  const name = `Groomly Backup – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/backupZip.test.ts`

Expected: PASS, 2 tests.

Poi: `npx tsc --noEmit`

Expected: exit 0. Se il controllo tipi fallisce sul codice incollato, correggere solo ciò che il compilatore dimostra e descriverlo nel rapporto.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/backupZip.ts src/lib/backupZip.test.ts
git commit --only -m "feat: zip dei dati e del Registro senza foto" -- src/lib/backupZip.ts src/lib/backupZip.test.ts
```

---

### Task 2: Pulsante sulla card

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `backupZip` dal task 1; `registroXlsx`; `raccogliBackup`; `shareFiles`, `downloadAnchor`, `isShareCancel`; `AppError`; `Capacitor.isNativePlatform`; `buildManifest`, `canonicalJson`, `sha256Hex`; `romeDay`.
- Produces: il pulsante **Backup ZIP** sotto Registro Excel.

Non modificare `exportRegistro`, `runBackup`, `exportZip`, `onRestoreFile`, `onAuto`.

- [ ] **Step 1: Write the failing test**

In `src/pages/SettingsPage.test.tsx`, sostituire l'import del tipo con:

```ts
import { buildManifest, canonicalJson, sha256Hex, type GroomlyDati } from '../lib/backupBundle'
import { romeDay } from '../lib/romeTime'
```

Dopo `datiRegistro()`, aggiungere:

```ts
async function raccoltoZip(salonName = 'Pelosetti') {
  const base = datiRegistro()
  base.settings = { business: { salonName } }
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte: false })
  return { dati: base, json, checksum, manifest }
}
```

Dentro `describe('impostazioni')`, aggiungere questi due test. Non cambiare i test di Registro Excel: il loro `release` continua a passare solo `{ dati }`.

```ts
  it('Backup ZIP consegna il file del giorno di Roma e intanto è disabilitato', async () => {
    const pronto = await raccoltoZip()
    let release: (value: typeof pronto) => void = () => undefined
    const gate = new Promise<typeof pronto>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Backup ZIP' })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Registro Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
    release(pronto)
    const name = `Groomly Backup – Pelosetti – ${romeDay(new Date())}.zip`
    await waitFor(() => expect(downloads.some((item) => item.name === name)).toBe(true), { timeout: 10_000 })
  })

  it('Backup ZIP senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Backup ZIP' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`

Expected: FAIL, unable to find a button named Backup ZIP

- [ ] **Step 3: Write minimal implementation**

In `src/pages/SettingsPage.tsx`, accanto a `registroBusy`:

```ts
  const [zipBusy, setZipBusy] = useState(false)
```

Aggiungere questa funzione nel componente, senza modificare `exportRegistro`:

```ts
  async function exportBackupZip() {
    if (!uid || zipBusy) return
    setZipBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const { backupZip } = await import('../lib/backupZip')
      const raccolto = await raccogliBackup(now, { includiByte: false })
      const registro = await registroXlsx(raccolto.dati, { now })
      const file = await backupZip(raccolto, registro, now)
      if (Capacitor.isNativePlatform()) await shareFiles([file], 'Backup Groomly')
      else downloadAnchor(file.blob, file.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setZipBusy(false)
    }
  }
```

Subito dopo la `SRow` di Registro Excel, prima di Personalizza:

```tsx
          <SRow>
            <Button onClick={() => void exportBackupZip()} disabled={zipBusy} aria-busy={zipBusy} style={{ flex: 1 }}>
              Backup ZIP
            </Button>
          </SRow>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/backupZip.test.ts`

Expected: PASS

Poi: `npx tsc --noEmit`

Expected: exit 0.

Poi, una volta sola: `npm test`

Expected: PASS. Se l'attesa del download scade sotto la suite intera, alzare solo quel `waitFor` restando dentro il `testTimeout` di Vitest (15 secondi). Il test deve continuare a esigere il nome del file.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit --only -m "feat: pulsante Backup ZIP nella scheda backup" -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
```

---

### Task 3: Pubblicazione

Solo dopo che il task 2 ha la suite verde. La scheda è cambiata: si alza la patch da `1.1.69` a `1.1.70`. `versionCode` diventa `10170` (`major * 10000 + minor * 100 + patch`).

- [ ] **Step 1: Alzare la versione negli stessi quattro punti**

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.70'`
- `package.json` → `"version": "1.1.70"`
- `android/app/build.gradle` → `versionName "1.1.70"` e `versionCode 10170`
- `hosting/release.json` → `version` `1.1.70`, `url` `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.70/groomly.apk`, e nelle note la frase «In Dati e backup, Backup ZIP crea un archivio con i dati e il Registro, senza le foto.»

- [ ] **Step 2: Verificare e costruire**

`npm test`, poi `npm run build`, `npx cap sync android`, e in `android` `.\gradlew assembleDebug`. Copiare `android/app/build/outputs/apk/debug/app-debug.apk` in `groomly.apk` nella radice, fuori da `hosting/` e fuori dal commit.

- [ ] **Step 3: Commit, push e release**

Il commit della versione si fa sul ramo che traccia `origin`, oggi `feat/listino-razze`, dopo averci portato i commit dei task 1 e 2. Non includere le modifiche d'archivio aperte su `D:\Groomly`.

```powershell
git add src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit --only -m "release: 1.1.70, Backup ZIP nella scheda backup" -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git push origin HEAD
gh release create v1.1.70 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.70" --notes "In Dati e backup, Backup ZIP crea un archivio con i dati e il Registro, senza le foto."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermarsi e dirlo. Non forzare il push e non saltare gli hook. Non committare `groomly.apk`.

---

## Copertura della specifica

- Flusso del pulsante, consegna nativa o browser, errori e stato di attesa separato: task 2.
- Quattro percorsi, checksum, manifest `solo-dati`, LEGGIMI, nome del file, Excel senza colonna: task 1.
- Esporta, Registro Excel, chip e gli altri controlli non si toccano: task 2 non modifica quelle funzioni; i test già presenti restano.
- Pubblicazione solo a scheda cambiata e suite verde: task 3.
