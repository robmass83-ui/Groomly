# Medie «Dati e caricamento» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere i quattro difetti del gruppo «Dati e caricamento» dell'audit.

**Architecture:** Due correzioni mirate in `client.ts` (tolleranza dell'orologio in `isStaleWrite`; `resolveSalon` che distingue «lettura fallita» da «account assente», con un'entrata di attesa che riprova) e due indagini riprodotte (avviso «non aggiornati», Home vuota) seguite dalla correzione della causa.

**Tech Stack:** React + TypeScript, Firebase web SDK (onSnapshot con metadati), Vitest, emulatori `demo-groomly` + Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-medie-dati-e-caricamento-design.md`

## Global Constraints
- Mai dati veri: solo test ed emulatore (`127.0.0.1:8080` Firestore, `9099` Auth, app `http://127.0.0.1:5173` in modo emu, già accesi). **Un solo browser alla volta** e svuotare `firebase-debug.log` (`: > firebase-debug.log`) prima di una prova lunga. Account e password `Test1234!` si creano con firebase-admin dagli script (vedi `QA-tests/.qa-catalog/verify-a10-browser.cjs` come modello).
- Tolleranza orologio: **5 minuti** (300 000 ms).
- Testi esistenti da usare: `frasi.authOffline` («Connessione assente»), `frasi.homeDatiStantii` (invariato), `AttesaRiga` / «…».
- Vietato nascondere l'avviso «non aggiornati» con un timer o toglierlo.
- Percorso di Laura (email condivisa, `isSharedEmail`) invariato.
- Si correggono cause riprodotte, non sintomi (superpowers:systematic-debugging per i Task 3 e 4).

## Review Focus
1. Orologio: documento con `updatedAt` 4 minuti avanti → la scrittura vecchia è ancora scartata (la protezione resta). → test Task 1.
2. Accesso offline di un account già usato sul telefono: deve aprire il salone dalla cache come oggi, non mostrare «Connessione assente» se la cache basta. → test Task 2.
3. Accesso con lettura fallita e poi rete che torna: entra da solo una volta sola (nessun doppio `bindSalon`). → test Task 2.
4. Avviso «non aggiornati»: con la rete davvero tolta deve ancora comparire. → prova Task 3.
5. Home di un salone davvero vuoto: dopo il caricamento mostra ancora «Nessun appuntamento» / 0 (lo stato vuoto vero non sparisce). → test Task 4.

---

### Task 1: L'orologio avanti non fa scartare le modifiche

**Files:** Modify `src/data/firebase/client.ts:~1036` (`isStaleWrite`); Test `src/data/firebase/client.test.ts`

- [ ] **Step 1: test che falliscono:** con `Date.now()` finto: cloud `updatedAt` = adesso + 1 giorno, in arrivo = adesso → non vecchia (si scrive); cloud = adesso + 4 min, in arrivo = adesso → vecchia (scartata, come oggi); cloud = adesso − 1 min, in arrivo = adesso − 2 min → vecchia; stessi tre casi con `updatedAt` ISO (`iso = true`). Un test d'integrazione su un salvataggio esistente (es. impostazioni) con cloud nel futuro → il documento viene scritto.
- [ ] **Step 2:** `npx vitest run src/data/firebase/client.test.ts` → FAIL.
- [ ] **Step 3:** in `isStaleWrite`, se `before > Date.now() + 300_000` → `false`.
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: un orologio avanti non fa più scartare le modifiche degli altri`.

### Task 2: Accesso con il database irraggiungibile

**Files:** Modify `src/data/firebase/client.ts:~2161-2196` (`resolveSalon`), `src/lib/authGate.ts` (`EntryGate`), `src/hooks/useSession.tsx`, `src/pages/LoginPage.tsx`; Test `src/data/firebase/client.test.ts`, `src/lib/authGate.test.ts`, `src/pages/LoginPage.test.tsx` (config lenta)

**Interfaces — Produces:**
- `resolveSalon`: se la lettura di `accounts/<uid>` è fallita (e l'email non è condivisa) **non** chiama `clearSalon()`; segna lo stato «salone da rileggere» (es. `accountDaRileggere = true`) leggibile dal client.
- `EntryGate` aggiunge `{ kind: 'offline-salone' }`, scelto da `entryGate` quando il client segnala «da rileggere» (nuovo input `salonUnreachable: boolean`), prima di `repair-salon`.
- `export async function riprovaSalone(): Promise<boolean>` in client.ts: rilegge `accounts/<uid>`; se riesce applica la logica normale (`bindSalon` o, se confermato assente, `clearSalon` → `repair-salon`) e ritorna `true`; se fallisce di nuovo ritorna `false`.
- `LoginPage` con entrata `offline-salone`: `frasi.authOffline` + `AttesaRiga`; richiama `riprovaSalone` all'evento `online` e ogni 5 s (un solo tentativo in corso alla volta); al successo aggiorna la sessione (stesso modo di `replaceAccount`/`reloadSignedInAccount`) e prosegue.
- [ ] **Step 1: test che falliscono:** `resolveSalon` con `readDoc` che rifiuta → nessun `clearSalon`, stato «da rileggere»; `entryGate` con `salonUnreachable` → `offline-salone`; `riprovaSalone` che riesce → `bindSalon` una volta; che conferma l'assenza → `repair-salon`; account già nella cache (lettura che riesce dalla cache) → apre il salone come oggi; `LoginPage` in `offline-salone` mostra «Connessione assente», riprova all'evento `online`, nessun tentativo doppio.
- [ ] **Step 2:** test → FAIL.
- [ ] **Step 3:** implementare.
- [ ] **Step 4:** test → PASS; `npx vitest run src --exclude '.claude/**'` (noto: `src/lib/driveInvio.test.ts`); `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: con il database irraggiungibile l'accesso aspetta e riprova invece di chiedere di riscrivere il salone`.

### Task 3: Avviso «Dati non aggiornati · offline» solo quando è vero

**Files:** da stabilire con l'indagine; probabili `src/hooks/useDogs.ts`, `src/hooks/useAppointments.ts`, `src/hooks/useSettings.tsx`, `src/lib/attesaServer.ts`, ascolti in `client.ts` (`listenDogs` ~1395, `listenAppointments` ~1494-1509, `listenSettings` ~1826); Test accanto al file corretto.

- [ ] **Step 1: riproduzione** (systematic-debugging): script Playwright sull'emulatore (in `QA-tests/.qa-catalog/`, sul modello di `verify-a10-browser.cjs`): accesso, attesa caricamento; (a) ricarica della pagina; (b) `context.setOffline(true)` 10 s poi `false`. Registrare per ciascuno dei tre hook quando `stantio` diventa vero/falso (es. esponendo temporaneamente i valori o leggendo il testo dell'avviso + log in console). Mettere in evidenza quale hook resta `stantio` e perché (metadati `fromCache`, ascolto con più sorgenti, timer `rivela`, `subscribeCloudUnavailable` che non si spegne…).
- [ ] **Step 2: test che fallisce** che riproduce la causa trovata a livello di hook/funzione.
- [ ] **Step 3:** correggere la causa (niente timer che nasconde l'avviso).
- [ ] **Step 4:** test → PASS; rilanciare lo script: avviso spento entro pochi secondi dopo (a) e dopo il ritorno della rete in (b); con la rete tolta l'avviso c'è. `npx vitest run src --exclude '.claude/**'`; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: l'avviso «Dati non aggiornati» sparisce quando la sincronizzazione riprende` + lo script.

### Task 4: La Home non mostra «nessuno» / «0» mentre carica

**Files:** `src/pages/HomePage.tsx` (e componenti dei riquadri usati in Home); Test `src/pages/HomePage.test.tsx`

- [ ] **Step 1: riproduzione:** sull'emulatore, accesso a un salone con visite oggi; screenshot ogni 500 ms per i primi 12 s (o throttling di rete); elencare le parti della Home che mostrano «Nessun appuntamento», «0», «0/0» o simili prima dei dati e da quale stato dipendono.
- [ ] **Step 2: test che falliscono:** Home con dati non ancora arrivati (`synced`/`settled`/`ready` falsi) → nessun «Nessun appuntamento» né «0»/«0/0» nelle parti trovate, c'è l'attesa; dati arrivati e salone davvero vuoto → «Nessun appuntamento» e 0 come oggi.
- [ ] **Step 3:** implementare (stesso stile d'attesa già usato in Home).
- [ ] **Step 4:** test → PASS; `npx vitest run src --exclude '.claude/**'`; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: la Home mostra l'attesa invece di zeri mentre carica`.

### Task 5 (coordinatore): verifica e rilascio
- [ ] Prove della spec («Verifica») sull'emulatore; audit (medie 1-4 «risolto»), PROGRESS, merge, release APK.
