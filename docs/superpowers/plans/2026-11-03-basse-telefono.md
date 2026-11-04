# Basse «Telefono» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nell'APK i pulsanti foto di cane, galleria e visita offrono «Scatta foto» / «Scegli dalla galleria»; la galleria non chiede più il permesso della fotocamera; l'avvio non dà più l'errore `triggerEvent`.

**Architecture:** Un hook condiviso `useScegliFoto` (`src/components/ScegliFoto.tsx`) possiede due input file nascosti (galleria senza `capture`, fotocamera con `capture="environment"`) e un `Dialog` di scelta, mostrato solo sul nativo. I punti logo/listino perdono `guardCaptureClick`, che viene eliminato. `MainActivity.onResume` manda `groomlyResume` con un JS protetto.

**Tech Stack:** React + TypeScript, Vitest + Testing Library, Capacitor 8 (`@capacitor/core`, `@capacitor/camera`), Java (Android).

**Spec:** `docs/superpowers/specs/2026-11-03-basse-telefono-design.md`

## Global Constraints

- Solo APK: niente functions, regole, versioni (`build.gradle`, `package.json`, `appVersion.ts`, `release.json`), niente release né deploy.
- Testi nuovi in `src/i18n/{it,en,es}.ts` con chiavi nuove (test «frasi fisse» `src/i18n/frasiFisse.test.ts`).
- vitest: `npx vitest run --dir src <file>`. Fallimenti già presenti su main da ignorare: `src/lib/driveInvio.test.ts`, 21 test di `src/pages/DogPage.test.tsx`, 3 di `src/pages/appointments.test.tsx`.
- L'input della fotocamera va cliccato **dentro il tocco**: mai dopo un `await` (vedi commit 66364e6).
- Nel browser (non nativo) nessuna scelta nuova: il pulsante apre il selettore come oggi.
- Le `aria-label` degli input della galleria restano quelle di oggi (`schedaFoto`, `schedaAggiungiGalleria`, `schedaCambiaFoto`, `appFotoPrima`, `appFotoDopo`, `appAggiungiFoto`): i test esistenti le usano.

## Review Focus

- Permesso fotocamera rifiutato: dopo «Scatta foto» e rifiuto compare `schedaPermessoFoto` («Permesso foto negato»), una volta sola, e niente si rompe.
- Stessa foto scelta due volte di fila: l'input va svuotato (`value = ''`) dopo ogni `change`, altrimenti la seconda scelta non arriva.
- Annullare la fotocamera col permesso già concesso: nessun avviso.
- Foto del cane nel riquadro esistente (`photoSheet`): dopo la scelta il riquadro si chiude come oggi (`setPhotoSheet(false)`, `setPhotoZoom(false)`).
- Logo e listino: nessuna chiamata a `@capacitor/camera`, input senza `capture`, listino con `multiple` e PDF come oggi.

---

### Task 1: Hook `useScegliFoto`

**Files:**
- Create: `src/components/ScegliFoto.tsx`
- Test: `src/components/ScegliFoto.test.tsx`
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`

**Interfaces:**
- Produces:
  ```ts
  export function useScegliFoto(opzioni: { etichetta: string; onFile: (file: File | undefined) => void }): {
    nativo: boolean
    apri: () => void      // nativo: apre il Dialog di scelta; web: clicca subito l'input galleria
    scatta: () => void    // clicca subito l'input fotocamera (chiude il Dialog)
    galleria: () => void  // clicca subito l'input galleria (chiude il Dialog)
    elementi: ReactNode   // i due input nascosti + il Dialog; da rendere una volta
  }
  ```
- Chiavi i18n: `fotoScegliTitolo` (it «Aggiungi foto», en «Add photo», es «Añadir foto»), `fotoScatta` («Scatta foto» / «Take photo» / «Hacer foto»), `fotoGalleria` («Scegli dalla galleria» / «Choose from gallery» / «Elegir de la galería»).

- [ ] **Step 1: Write the failing tests** in `src/components/ScegliFoto.test.tsx`, con `vi.mock('@capacitor/core')` (`Capacitor.isNativePlatform`) e `vi.mock('@capacitor/camera')` (`Camera.checkPermissions`), un piccolo componente di prova che usa il hook con un pulsante «Apri» → `apri()`:
  - `web: apri clicca l'input galleria senza Dialog` — `isNativePlatform` false; spia su `HTMLInputElement.prototype.click`; dopo «Apri» chiamata una volta su un input senza attributo `capture`, nessun testo «Scatta foto».
  - `nativo: apri mostra Scatta foto e Scegli dalla galleria` — entrambi i pulsanti visibili.
  - `nativo: Scatta foto clicca l'input con capture="environment" nello stesso tocco` — il click avviene in modo sincrono nell'handler (nessun `await` prima), su un input con `capture === 'environment'` e `accept === 'image/*'`.
  - `nativo: Scegli dalla galleria clicca l'input senza capture`.
  - `l'input galleria ha aria-label = etichetta e manda il file a onFile, poi si svuota` — `fireEvent.change` con un `File`; `onFile` chiamato col file; `input.value === ''`.
  - `fotocamera annullata con permesso negato mostra Permesso foto negato` — `checkPermissions` risolve `{ camera: 'denied' }`; `fireEvent(cameraInput, new Event('cancel'))`; compare il toast `schedaPermessoFoto` (rendere dentro il provider del Toast usato dalle pagine).
  - `fotocamera annullata con permesso concesso non avvisa` — `{ camera: 'granted' }` → nessun toast.
  - `la galleria non chiama mai Camera` — dopo «Scegli dalla galleria» e un `change`, `Camera.checkPermissions` e `Camera.requestPermissions` mai chiamati.

- [ ] **Step 2: Run** `npx vitest run --dir src src/components/ScegliFoto.test.tsx` — Expected: FAIL (modulo mancante).

- [ ] **Step 3: Implement `useScegliFoto`** in `src/components/ScegliFoto.tsx`. Dialog: `Dialog` di `src/components/layout/Dialog.tsx` con `title={frasi.fotoScegliTitolo}` e due pulsanti grandi (icone `Camera` e `Image` di lucide-react, stile come `SchedaChoice` in `DogPage.tsx`). Avviso con `useToast()` e `toast.show(frasi.schedaPermessoFoto, 'plain')`. Il permesso negato si scopre solo all'evento `cancel` dell'input fotocamera: `Camera.checkPermissions()` e avviso se `camera !== 'granted'`; errori ignorati. Aggiungere le tre chiavi in it/en/es.

- [ ] **Step 4: Run** `npx vitest run --dir src src/components/ScegliFoto.test.tsx src/i18n` — Expected: PASS.

- [ ] **Step 5: Commit** `feat(foto): scelta Scatta foto / Scegli dalla galleria`.

### Task 2: Usare la scelta in cane, galleria e visita; togliere `guardCaptureClick`

**Files:**
- Modify: `src/pages/DogPage.tsx` (`FormAvatar` ~465, `ReadPortrait` ~539, `Gallery` ~779, riquadro `photoSheet` ~1725-1760)
- Modify: `src/pages/AppointmentPage.tsx` (~296-322: input `primaRef`/`dopoRef`/`addRef`)
- Modify: `src/pages/AccountPage.tsx:343`, `src/pages/ListinoPage.tsx:543`, `src/pages/PriceSheetManagePage.tsx:281` (solo togliere `onClick={guardCaptureClick…}` e l'import)
- Delete: `src/lib/photoCapture.ts`, `src/lib/photoCapture.test.ts`
- Test: `src/pages/DogPage.test.tsx`, `src/pages/AppointmentPage*.test.tsx` esistenti (non devono peggiorare)

**Interfaces:**
- Consumes: `useScegliFoto({ etichetta, onFile })` del Task 1.

- [ ] **Step 1:** In `FormAvatar`, `ReadPortrait` (solo quando non c'è `src`, come oggi), `Gallery`, e in `AppointmentPage` per prima/dopo/aggiungi (tre hook con le etichette `appFotoPrima`/`appFotoDopo`/`appAggiungiFoto` e `onAdd(file, 'prima'|'dopo'|'auto')`): sostituire `ref.current?.click()` con `apri()` e l'`<input>` con `{elementi}`. Il `denyPhoto` di `AppointmentPage` non serve più se il toast è nel hook: toglierlo se resta inutilizzato.
- [ ] **Step 2:** Riquadro `photoSheet` in `DogPage`: con `nativo` le voci diventano «Scatta foto» (`scatta`) e «Scegli dalla galleria» (`galleria`) al posto di «Cambia»; sul web resta «Cambia» → `galleria`. `onFile` del hook fa ciò che fa oggi l'`onChange` (`onPhoto(file)`, `setPhotoSheet(false)`, `setPhotoZoom(false)`); etichetta `schedaCambiaFoto`.
- [ ] **Step 3:** Togliere `guardCaptureClick` da Account, Listino, PriceSheetManage; eliminare `src/lib/photoCapture.ts` e il suo test. `grep -rn "guardCaptureClick\|photoCapture" src` → nessun risultato.
- [ ] **Step 4: Run** `npx tsc -b --noEmit` (o `npm run typecheck` se esiste) e `npx vitest run --dir src src/pages src/components` — Expected: tipi ok; nei test delle pagine solo i fallimenti già noti (21 DogPage, 3 appointments), nessuno nuovo.
- [ ] **Step 5: Commit** `fix(foto): galleria senza permesso fotocamera; Scatta foto per cane, galleria e visita`.

### Task 3: Avvio senza errore `triggerEvent`

**Files:**
- Modify: `android/app/src/main/java/it/groomly/app/MainActivity.java:54-58`

- [ ] **Step 1:** In `onResume`, al posto di `getBridge().triggerWindowJSEvent("groomlyResume")`, eseguire sul WebView del bridge:
  `window.Capacitor && window.Capacitor.triggerEvent && window.Capacitor.triggerEvent('groomlyResume', 'window')` con `getBridge().getWebView().evaluateJavascript(script, null)` (controllare `getBridge() != null` e `getWebView() != null`). Una riga di commento sul perché (al primo avvio la pagina non è ancora caricata).
- [ ] **Step 2:** Compilare: `cd android && ./gradlew :app:compileGithubDebugJavaWithJavac` (o il flavor disponibile; con il JBR di Android Studio come `JAVA_HOME`) — Expected: BUILD SUCCESSFUL.
- [ ] **Step 3: Commit** `fix(android): groomlyResume solo a pagina pronta`.

### Task 4: Verifica sull'emulatore Android (la fa il coordinatore, non un implementatore)

APK di prova (memoria `test-apk-emulatore-android`: `vite build --mode emu`, cleartext **temporaneo** non committato, `cap sync`, `assemblePlayDebug`, `adb reverse`), account di prova `telefono-…` su `demo-groomly`. Controlli via `adb` + CDP:
1. Avvio a freddo: nessun `Cannot read properties of undefined (reading 'triggerEvent')` nei log della WebView (`adb logcat` chromium/Capacitor + CDP `Runtime.exceptionThrown`).
2. Scheda cane → Galleria → Aggiungi → «Scegli dalla galleria»: si apre il selettore **senza** dialogo del permesso.
3. «Scatta foto» (permessi azzerati con `pm revoke it.groomly.app android.permission.CAMERA`): compare il dialogo del permesso; consenti → si apre la fotocamera; con «Non consentire» → «Permesso foto negato».
4. Logo in Account: selettore senza dialogo del permesso.
Alla fine: `git checkout capacitor.config.ts`, `vite build` normale + `cap sync`. Esito in `PROGRESS.md`.
