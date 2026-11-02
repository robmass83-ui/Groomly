# A10 — «Esci» pulisce il telefono — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dopo «Esci» sul telefono non restano dati dei clienti; se ci sono modifiche non inviate, prima un avviso con «Resta» / «Esci comunque».

**Architecture:** La lista delle eliminazioni diventa per account (chiave per uid impostata dalla sessione). Una funzione dice se ci sono modifiche in sospeso (Firestore + coda di caricamento + foto in attesa). `logout()` dopo lo scollegamento pulisce `localStorage` dell'account, foto in attesa e cache IndexedDB di Firestore, poi ricarica da `/login`. Un hook `useEsci()` mostra l'avviso dove c'è «Esci».

**Tech Stack:** React + TypeScript, Firebase web SDK v10+ (`waitForPendingWrites`, `terminate`, `clearIndexedDbPersistence`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-a10-esci-pulisce-il-telefono-design.md`

## Global Constraints
- Solo test e emulatore; mai dati veri.
- Modalità locale (`firebaseEnabled()` falso): **nessuna** pulizia.
- Restano sul telefono: lingua, preferenze notifiche, `PUSH_TOKEN_KEY` e id dispositivo, suggerimento d'accesso (`signInHint`, solo email), `groomly.pendingSalon.*`, i segni `groomly.mirror.<uid>` e la copia condivisa fidata (`sharedMirrorKey`) come in `pulisciDatiSalone`.
- Si tolgono: `groomly.users.<uid>.*` (tranne `sharedMirrorKey(uid)`), `groomly.piano.<uid>`, foto in attesa di `uid` (`discardPendingPhotos(uid)`), lista eliminazioni di `uid`, cache IndexedDB di Firestore.
- Attesa massima per sapere se Firestore ha scritture in sospeso: **1500 ms**.
- Testi (it): avviso «Ci sono modifiche non ancora salvate online: se esci adesso si perdono.»; pulsanti «Resta» ed «Esci comunque». Stesse chiavi in en/es.
- Ogni accesso a `localStorage` in try/catch.

## Review Focus
1. Uscita offline con scritture in sospeso: l'avviso compare entro ~1,5 s e non resta appeso. → test Task 2.
2. `clearIndexedDbPersistence` che fallisce (altra scheda o già terminato): l'uscita si completa comunque e ricarica. → test Task 3.
3. Doppio tocco su «Esci» / «Esci comunque»: una sola uscita. → test Task 4.
4. Eliminazioni fatte prima dell'aggiornamento (vecchia chiave `groomly.deleted`) non si perdono per l'account che entra. → test Task 1.
5. `EliminaAccountPage` esce senza avviso e pulisce. → test Task 3/4.

---

### Task 1: Lista delle eliminazioni per account

**Files:** Modify `src/lib/tombstone.ts`, `src/hooks/useSession.tsx`; Test `src/lib/tombstone.test.ts`

**Interfaces — Produces:**
- `export function impostaAccountEliminazioni(uid: string | null): void` — da qui in poi `readDeletion`/`rememberDeletion` usano `groomly.deleted.<uid>`; con `null` leggono una lista vuota e non scrivono.
- `export function dimenticaEliminazioni(uid: string): void` — toglie `groomly.deleted.<uid>`.
- `export function chiaveEliminazioni(uid: string): string` → `` `groomly.deleted.${uid}` ``.
- Migrazione: alla prima `impostaAccountEliminazioni(uid)` con la vecchia `groomly.deleted` presente, la si unisce (`mergeTombstone`) a quella dell'account e si cancella la vecchia.
- `SessionProvider` chiama `impostaAccountEliminazioni(gate.kind === 'in' ? gate.account.uid : null)` quando cambia l'account (prima che gli hook dei dati leggano: es. nel corpo del provider con `useMemo`/effetto di layout, scelta del builder purché coperta da test).

- [ ] **Step 1: test che falliscono:** due account A e B: `rememberDeletion` con A attivo, poi B attivo → `readDeletion()` vuota; di nuovo A → c'è. Vecchia `groomly.deleted` con `{ ids: ['d1'] }` → dopo `impostaAccountEliminazioni('A')` `readDeletion().ids` contiene `d1` e la vecchia chiave non c'è più. `null` → lista vuota e `rememberDeletion` non scrive nulla. `dimenticaEliminazioni('A')` toglie la chiave.
- [ ] **Step 2:** `npx vitest run src/lib/tombstone.test.ts` → FAIL.
- [ ] **Step 3:** implementare; aggiornare i test esistenti che usano `TOMBSTONE_KEY` direttamente.
- [ ] **Step 4:** `npx vitest run src/lib src/hooks src/data` verdi; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix(A10): la lista delle eliminazioni è per account`.

### Task 2: Sapere se ci sono modifiche in sospeso

**Files:** Modify `src/data/firebase/taskQueue.ts`, `src/data/firebase/client.ts`, `src/lib/pendingPhoto.ts`; Test `src/data/firebase/taskQueue.test.ts` (o il file di test esistente della coda), `src/lib/pendingPhoto.test.ts`, `src/data/firebase/client.test.ts`

**Interfaces — Produces:**
- coda: metodo `inAttesa(): boolean` (vero se ci sono compiti in lista o uno in corso).
- `export function haFotoInAttesa(uid: string): boolean` in `pendingPhoto.ts`.
- `export async function modificheInSospeso(uid: string, attesaMs = 1500): Promise<boolean>` in `client.ts`: vero se `uploadQueue.inAttesa()`, o `haFotoInAttesa(uid)`, o `waitForPendingWrites(db)` non si risolve entro `attesaMs`. In modalità locale → `false`.
- [ ] **Step 1: test che falliscono:** coda vuota → `inAttesa()` falso; con un compito in lista o in corso → vero; dopo `clear()` → falso. `haFotoInAttesa` vero dopo `rememberPendingDog` con foto, falso dopo `discardPendingPhotos`. `modificheInSospeso` con `waitForPendingWrites` che non risolve → `true` dopo ~`attesaMs` (timer finti); che risolve subito e niente coda/foto → `false`.
- [ ] **Step 2:** test → FAIL.
- [ ] **Step 3:** implementare.
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `feat(A10): l'app sa se ci sono modifiche non ancora inviate`.

### Task 3: «Esci» pulisce il telefono e riparte

**Files:** Create `src/data/local/uscita.ts`, `src/data/local/uscita.test.ts`; Modify `src/data/firebase/client.ts` (svuotare la cache), `src/hooks/useSession.tsx` (`logout`); Test `src/hooks/useSession.test.tsx` (o il test esistente della sessione)

**Interfaces:**
- Consumes: `dimenticaEliminazioni`, `impostaAccountEliminazioni` (Task 1); `discardPendingPhotos`; `sharedMirrorKey`.
- Produces:
  - `export function pulisciDatiAccount(uid: string): void` (in `uscita.ts`): toglie le chiavi elencate nei Global Constraints per `uid` (anche senza il segno di copia del cloud: all'uscita si toglie tutto ciò che è dell'account); nessun effetto in modalità locale.
  - `export async function svuotaCacheCloud(): Promise<void>` in `client.ts`: `terminate(db)` + `clearIndexedDbPersistence(db)`, azzera `dbPromise`; ogni errore ingoiato.
  - `export function ripartiDaAccesso(): void` in `uscita.ts`: `window.location.replace('/login')`, sostituibile nei test come in `cambioSalone.ts`.
  - `logout()` (modalità Firebase): dopo `signOutEmail` (e solo dopo, anche se fallisce) → `pulisciDatiAccount(uid)`, `dimenticaEliminazioni(uid)`, `await svuotaCacheCloud()`, `ripartiDaAccesso()`. Una seconda chiamata mentre la prima è in corso non fa nulla. In modalità locale, invariato.
- [ ] **Step 1: test che falliscono:** `pulisciDatiAccount('u1')` toglie `groomly.users.u1.dogs`, `groomly.users.u1.settings`, `groomly.piano.u1`, e tiene `groomly.users.u2.dogs`, `sharedMirrorKey('u1')`, `groomly.mirror.u1`, la lingua, `PUSH_TOKEN_KEY`, il suggerimento d'accesso, `groomly.pendingSalon.x`; in modalità locale non toglie nulla. `logout()` chiama in ordine scollegamento → pulizia → svuota cache → ripartenza; `svuotaCacheCloud` che rifiuta → la ripartenza avviene lo stesso; due `logout()` → una sola ripartenza.
- [ ] **Step 2:** test → FAIL.
- [ ] **Step 3:** implementare.
- [ ] **Step 4:** test → PASS; `npx vitest run src` (noto: `src/lib/driveInvio.test.ts`); `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix(A10): Esci cancella dal telefono i dati dell'account e la cache`.

### Task 4: Avviso prima di uscire con modifiche non inviate

**Files:** Create `src/hooks/useEsci.tsx` (hook + foglio di conferma); Modify `src/pages/SettingsPage.tsx:~1193`, `src/components/AccessoSospeso.tsx:~90`, `src/pages/LoginPage.tsx:~343,~413`, `src/i18n/{it,en,es}.ts`; Test `src/hooks/useEsci.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `modificheInSospeso(uid)` (Task 2), `session.logout()` (Task 3).
- Produces: `export function useEsci(): { esci: () => void; foglio: ReactNode }` — `esci()` controlla `modificheInSospeso`; falso → `logout()`; vero → apre il foglio (testi dei Global Constraints) con «Resta» (chiude) ed «Esci comunque» (`logout()`). Ignora tocchi mentre controlla o esce. Se il controllo fallisce → esce come oggi (nessun avviso).
- `EliminaAccountPage` continua a chiamare `session.logout()` direttamente.
- [ ] **Step 1: test che falliscono:** senza modifiche → `logout` chiamato una volta, nessun foglio; con modifiche → foglio col testo esatto, «Resta» chiude senza `logout`, «Esci comunque» → `logout` una volta; doppio tocco su «Esci» → un solo controllo; SettingsPage usa il hook (tocco su «Esci» con modifiche → foglio).
- [ ] **Step 2:** test → FAIL.
- [ ] **Step 3:** implementare e sostituire i quattro `session.logout()` dei pulsanti «Esci».
- [ ] **Step 4:** test → PASS; `npx vitest run src`; `npx tsc --noEmit -p .`; parità i18n.
- [ ] **Step 5:** commit `feat(A10): avviso prima di uscire con modifiche non inviate`.

### Task 5 (coordinatore): verifica e rilascio
- [ ] Browser su emulatore: accesso, «Esci» → `localStorage` senza `groomly.users.<uid>.*`, IndexedDB di Firestore vuoto, pagina di accesso; rientro → dati dal cloud. Offline con una modifica → avviso; «Resta» / «Esci comunque».
- [ ] Audit A10 «risolto», PROGRESS, merge, release APK (niente functions).
