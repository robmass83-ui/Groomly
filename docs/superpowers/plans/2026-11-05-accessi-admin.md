# Accessi admin — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permessi admin solo dal claim, hotmail solo in `/admin`, robmass83 in `shared`, registro e riconferma per le azioni admin.

**Architecture:** il claim `admin` entra nella sessione come nuovo esito di `entryGate`, che spegne da solo i servizi legati a `entry.kind === 'home'`. Regole e functions leggono solo il token. Lo script di passaggio lavora lato server, in sola prova finché non riceve `--esegui`.

**Tech Stack:** React, TypeScript, Vitest, Firebase (Auth, Firestore, Functions v2), firebase-admin, Capacitor.

**Spec:** `docs/superpowers/specs/2026-11-05-accessi-admin-design.md`

## Global Constraints

- Mai scrivere, migrare o cancellare dati di `salon/shared` (unica eccezione: l'eventuale `salon/shared/members/{uidHotmail}` in `stacca`).
- Le regole non si allentano: nessuna creazione di account in `shared` dal telefono.
- Niente deploy, script in produzione o APK senza il via esplicito di Roberto. Questo piano si ferma ai test verdi sul ramo.
- Modifiche a `src/data/firebase/client.ts` piccole: è in comune con la sessione di conformità.
- Riconferma password oltre **15 minuti** da `auth_time`. Limite avvisi: **10 all'ora**.
- Nuove frasi nelle 5 lingue (`it`, `en`, `es`, `fr`, `de`). Testi e commenti in italiano, come il codice intorno.
- Comandi: `npm test -- <file>` per un file, `npm test` per tutto, `npm run test:rules` per le regole (Java 21: `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`), test delle functions con `npm test` da `functions/` se presenti lì.

## Review Focus

1. Admin senza rete all'avvio: si apre `/admin` o il login, mai il salone; test in Task 1.
2. Hotmail con claim **e** ancora `accounts/{uid}` su `shared`: vince `admin` e non si lega il salone; test in Task 1.
3. Token vecchio senza claim su un telefono già autenticato: dopo l'aggiornamento all'avvio l'esito passa ad `admin`; test in Task 1.
4. Password sbagliata nella riconferma: l'azione non parte e il dialogo mostra l'errore; test in Task 7.
5. `collega` con un salone che ha altre persone, o con bersaglio `shared`: si ferma senza scrivere nulla; test in Task 8.

---

### Task 1: Sessione admin (claim, `entryGate`, `useRuolo`)

**Files:**
- Modify: `src/lib/authGate.ts`, `src/lib/authGate.test.ts`
- Modify: `src/data/firebase/client.ts` (`watchAuth`, nuovo `lastAdmin`), `src/data/firebase/client.test.ts`
- Modify: `src/data/local/signInHint.ts`, `src/hooks/useSession.tsx`
- Create: `src/hooks/useRuolo.ts`, `src/hooks/useRuolo.test.tsx`

**Interfaces:**
- Produces: `EntryGate` con `{ kind: 'admin' }`; `entryGate({ ..., admin?: boolean })`; `lastAdmin(): boolean` in `client.ts`; `useRuolo(): { admin: boolean; caricato: boolean }`; `SessionApi.admin: boolean`, `SessionApi.ruoloCaricato: boolean`.

- [ ] **Step 1: Test `authGate.test.ts`**: con `admin: true` l'esito è `{ kind: 'admin' }` anche con `hasAccountDoc: false`, `salonUnreachable: true`, `emailVerified: false`; con `admin` assente gli esiti esistenti non cambiano.
- [ ] **Step 2: Test `client.test.ts`**:
  - `watchAuth` con token `claims.admin === true` chiama `onAccount` senza leggere `accounts/{uid}`, senza `migrate` né `ensureShared`, e `currentSalonId()` resta vuoto, anche se il documento punta a `shared`.
  - Offline (`getIdTokenResult(true)` rifiuta): si usa `getIdTokenResult(false)` e l'esito resta admin.
  - Token aggiornato che porta il claim: `lastAdmin()` diventa `true`.
- [ ] **Step 3: Test `useRuolo.test.tsx`**: `caricato` è `false` prima della risposta di Firebase e `true` dopo; `admin` segue la sessione. Con il suggerimento d'accesso `admin: true` e Firebase che non ha risposto, `entry.kind` è `admin`, non `home`.
- [ ] **Step 4: Verifica il fallimento** con `npm test -- src/lib/authGate.test.ts src/hooks/useRuolo.test.tsx src/data/firebase/client.test.ts`.
- [ ] **Step 5: Implementa.** In `watchAuth`, prima di `resolveSalon`: `leggiClaimAdmin(user)` prova `getIdTokenResult(true)` e ripiega su `false`. Se admin: `clearSalon()`, `accountDoc = null`, `onAccount(toAccount(user))`, return. `writeSignInHint` accetta `admin`. `useSession` calcola `entry` con `admin` anche prima di `cloudSeen`, se il suggerimento lo dice.
- [ ] **Step 6: Verifica** gli stessi test verdi, più `src/app/firebaseGate.test.tsx`.
- [ ] **Step 7: Commit** `feat(admin): esito admin nella sessione e useRuolo`.

### Task 2: Rotte `/admin`, cornice e redirect

**Files:**
- Create: `src/components/admin/AdminFrame.tsx`, `src/app/router.admin.test.tsx`
- Modify: `src/app/router.tsx`, `src/lib/percorsoAdmin.ts` e il suo test
- Modify: `src/pages/AdminManagerPage.tsx`, `src/pages/AvvisiSistemaPage.tsx`, `src/hooks/useAvvisiSistema.ts`

**Interfaces:**
- Consumes: `useRuolo`, `entry.kind === 'admin'`.
- Produces: `AdminFrame({ children })`; `AdminGuard({ children })`; `PERCORSO_ADMIN = '/admin'`; rotte `/admin`, `/admin/avvisi`.

- [ ] **Step 1: Test `router.admin.test.tsx`**:
  - Admin su `/`, `/animali`, `/impostazioni` → `/admin`.
  - Admin al login, con destinazione ricordata `/animali` → `/admin`.
  - Non admin su `/admin` e `/admin/avvisi` → `/`; non autenticato → `/login`.
  - `/impostazioni/admin-manager?tab=saloni&id=x` → `/admin?tab=saloni&id=x`.
  - `/impostazioni/utenti?zona=note` → `/admin?tab=suggerimenti`.
  - Su `/admin` non vengono montati `useDogs`, `useAppointments` e `ShellFrame`.
- [ ] **Step 2: Test** in `percorsoAdmin`: i casi sopra; test di `AvvisiSistemaPage`: in sessione admin `segnaAvvisiLetti` non si chiama.
- [ ] **Step 3: Verifica il fallimento.**
- [ ] **Step 4: Implementa.** `AdminFrame`: titolo «Groomly Admin», Esci (`session.logout`), link Avvisi/Manager. Le due pagine scelgono la cornice con un prop `cornice` (default `ShellFrame`) e `backTo` coerente. Le rotte vecchie stanno fuori da `Guard`. Se `usePiano` o `PanoramicaAdmin` falliscono senza salone, correggi qui, con un test.
- [ ] **Step 5: Verifica** `npm test -- src/app src/lib/percorsoAdmin src/pages/AdminManagerPage src/pages/AvvisiSistemaPage`.
- [ ] **Step 6: Commit** `feat(admin): rotte /admin con cornice propria e vecchi link`.

### Task 3: Client solo da claim, tour, Impostazioni

**Files:**
- Modify: `src/lib/salonPath.ts`, `src/lib/salonPath.test.ts`, `src/lib/tourBenvenuto.ts` e test
- Modify: `src/app/router.tsx`, `src/app/TourAvvio.tsx` e test, `src/pages/AdminManagerPage.tsx`, `src/pages/AvvisiSistemaPage.tsx`, `src/pages/InfoGroomlyPage.tsx`, `src/pages/ProPage.tsx`, `src/pages/SettingsPage.tsx`

**Interfaces:**
- Produces: `operatoreAutorizzato(input: { admin?: boolean }): boolean`, vero solo con `admin === true`. `isOperator` non esiste più. `deveVedereTour` riceve `salonCondiviso: boolean` al posto di `operatore`.

- [ ] **Step 1: Test**: `operatoreAutorizzato` falso per Laura, robmass83 e hotmail con email verificata senza claim, vero con `admin: true`. `deveVedereTour` con `salonCondiviso: true` → `'niente'`. `SettingsPage` non mostra `frasi.adminManager` per Laura. `ProPage`: Laura non vede l'interruttore.
- [ ] **Step 2: Verifica il fallimento.**
- [ ] **Step 3: Implementa.** Gli usi passano a `useRuolo().admin`; in `SettingsPage` si toglie il blocco `hubOperatori`. Le firme delle functions con `email` e `emailVerified` si aggiornano nel Task 4: fino ad allora restano accettate come campi in più.
- [ ] **Step 4: Verifica** con `npm test` e `npx tsc --noEmit`. `grep -rn "isOperator" src --include=*.ts --include=*.tsx --exclude=*.test.*` non trova nulla.
- [ ] **Step 5: Commit** `feat(admin): il client decide solo dal claim`.

### Task 4: Regole e functions solo da claim

**Files:**
- Modify: `firestore.rules`, `src/lib/firestoreRules.test.ts`, `src/lib/firestoreRules.emulator.test.ts`
- Modify: `functions/src/beta/comune.ts`, `functions/src/abbonamenti/{annuncio,accensione,index}.ts`, `functions/src/config/{impostaConfigPiani,impostaTour}.ts`, `functions/src/piano/{eliminaSalone,impostaPianoManuale}.ts`, `functions/src/campioneEmail.ts`, `functions/src/index.ts` e relativi test
- Modify: `scripts/emu/beta.mjs`, `scripts/emu/eliminaSalone.mjs`, `scripts/test360/rules.ts`, `scripts/test360/seed.ts`

**Interfaces:**
- Produces: `TokenOperatore = { admin?: boolean; operatorEmail?: string }`; `operatorEmail` resta solo come dato (`invitatoDa`). `inviaCampione({ admin, apiKey, invia })`.

- [ ] **Step 1: Test emulatore**: admin legge `salons/*`, `accounts/*`, `betaFeedback`; Laura con email verificata e senza claim **non** legge `salons/altro` ma legge e scrive `salon/shared`; robmass83 con `accounts/{uid}.salonId == 'shared'` legge e scrive `salon/shared`; admin senza account non scrive `salon/shared`; la creazione di `accounts/{uid}` con `salonId: 'shared'` resta negata.
- [ ] **Step 2: Test functions**: ogni `*.test.ts` che usava `operatorEmail` + `emailVerified` per concedere ora usa `admin: true`; aggiungi un caso con Laura verificata senza claim → negato; `inviaCampione` con `admin: false` → `motivo: 'negato'`; `decisioneEliminaSalone` conserva i blocchi su `shared`, chiamante e `isSharedEmail`.
- [ ] **Step 3: Verifica il fallimento.**
- [ ] **Step 4: Implementa.** `isOperator()` nelle regole come da spec; togli dai tipi delle functions `emailVerified`; `greeting.ts` non si tocca qui.
- [ ] **Step 5: Verifica** `npm test`, `npm run test:rules`, compilazione delle functions; `grep -n "hotmail" firestore.rules functions/src -r --include=*.ts --exclude=*.test.ts` non trova nulla.
- [ ] **Step 6: Commit** `feat(admin): regole e functions solo dal claim`.

### Task 5: robmass83 al posto della hotmail in `shared`

**Files:**
- Modify: `src/lib/salonPath.ts`, `src/lib/greeting.ts` e test, `src/lib/authGate.test.ts`, `src/data/firebase/client.test.ts`, `src/lib/salonAccess.test.ts`, `src/hooks/useCloudOnlyData.test.tsx`, gli altri test con la hotmail come membro condiviso

**Interfaces:**
- Produces: `ROBERTO_SALONE_EMAIL = 'robmass83@gmail.com'`; `ROBERTO_EMAIL` non esiste più.

- [ ] **Step 1: Test**: `isSharedEmail('robmass83@gmail.com')` vero, `isSharedEmail('masala.roberto@hotmail.it')` falso; `usesOnlyCloudData('robmass83@gmail.com', 'shared')` vero; robmass83 senza documento → `home`; `client.test`: robmass83 con documento su `shared` apre `shared` e scarta i dati del telefono; con documento mancante aggancia `shared` in memoria senza altre scritture oltre al tentativo su `accounts/{uid}`.
- [ ] **Step 2: Verifica il fallimento.**
- [ ] **Step 3: Implementa** il rinomina e aggiorna i test con la vecchia email.
- [ ] **Step 4: Verifica** `npm test`; `grep -rn "hotmail" src --include=*.ts --include=*.tsx --exclude=*.test.*` non trova nulla.
- [ ] **Step 5: Commit** `feat(salone): robmass83 entra in shared al posto della hotmail`.

### Task 6: Registro `adminLog`

**Files:**
- Create: `functions/src/adminLog.ts`, `functions/src/adminLog.test.ts`
- Modify: `functions/src/index.ts`, `functions/src/abbonamenti/index.ts`, `firestore.rules`, test delle regole

**Interfaces:**
- Produces: `registraAdmin(db: Firestore, voce: { azione: string; salonId?: string; dettagli?: Record<string, unknown> }): Promise<void>`; `conRegistro<T>(azione: string, dati: (esito: T) => Omit<Voce, 'azione'>, esegui: () => Promise<T>): Promise<T>`.

- [ ] **Step 1: Test `adminLog.test.ts`**: scrive `{ quando, azione, salonId, dettagli }`; se l'azione fallisce non scrive; se la scrittura del registro fallisce `conRegistro` restituisce comunque l'esito e chiama `console.error`.
- [ ] **Step 2: Test emulatore**: admin legge `adminLog`, Laura no, nessun client scrive.
- [ ] **Step 3: Verifica il fallimento.**
- [ ] **Step 4: Implementa e avvolgi nelle callable**: `setSalonPro`, `impostaPianoManuale`, `eliminaSalone`, `invitaBeta`, `revocaBeta`, `estendiBeta`, `segnaEarlyAdopter`, `impostaConfigPiani`, `impostaMostraPiani`, `impostaTourBenvenuto`, `confermaPartitaIva`, `accendiAbbonamenti`, `spegniAbbonamenti`, `annunciaPagamenti`. In `dettagli` nessun dato dei clienti finali.
- [ ] **Step 5: Verifica** test e `npm run test:rules`.
- [ ] **Step 6: Commit** `feat(admin): registro adminLog delle azioni`.

### Task 7: Riconferma password e avvisi via functions

**Files:**
- Create: `functions/src/accessoRecente.ts` e test, `functions/src/config/avvisiSistema.ts` e test, `src/components/admin/RiconfermaPassword.tsx` e test
- Modify: `src/i18n/errori.ts`, `src/i18n/{it,en,es,fr,de}.ts`, `functions/src/rateLimit.ts` e test, `functions/src/index.ts`, `functions/src/abbonamenti/index.ts`, `firestore.rules`, test regole
- Modify: `src/data/firebase/client.ts` (`pubblicaAvvisoSistema`, `eliminaAvvisoSistema`, nuova `riconfermaPassword`), `src/components/admin/useAzioniPiano.tsx`, `src/components/admin/PannelloAccensione.tsx`, `src/pages/AvvisiSistemaPage.tsx`

**Interfaces:**
- Produces: `RICONFERMA_MS = 15 * 60 * 1000`; `controllaAccessoRecente(authTimeSec: unknown, adesso: number): void`, che lancia `erroreServer('failed-precondition', 'riconferma_richiesta')`; `AVVISI_RATE_MAX = 10`, `AVVISI_RATE_WINDOW_MS = 60 * 60 * 1000`, `avvisiRateDecision(hits, now)`; callable `pubblicaAvvisoSistema`, `eliminaAvvisoSistema`; `riconfermaPassword(password: string): Promise<void>`; hook `useRiconferma(): { conRiconferma<T>(azione: () => Promise<T>): Promise<T>; dialogo: ReactNode }`.

- [ ] **Step 1: Test server**: `auth_time` a 14:59 passa, a 15:01 rifiuta, assente rifiuta; `pubblicaAvvisoSistema` valida come le vecchie regole (`tipo`, titolo 1–120, testo ≤ 2000), nega senza claim, alla undicesima chiamata in un'ora rifiuta, scrive `creato` lato server e `adminLog`; `eliminaAvvisoSistema` non chiede riconferma e scrive il registro.
- [ ] **Step 2: Test regole**: `avvisiSistema` create e delete negate anche all'admin; lettura invariata.
- [ ] **Step 3: Test client**: `conRiconferma` ripete l'azione una sola volta dopo `riconferma_richiesta` e password giusta; con password sbagliata mostra l'errore e non ripete; annullando non ripete; altri errori passano intatti.
- [ ] **Step 4: Verifica il fallimento.**
- [ ] **Step 5: Implementa.** `controllaAccessoRecente` entra in `eliminaSalone`, `accendiAbbonamenti`, `spegniAbbonamenti`, `pubblicaAvvisoSistema`. `riconfermaPassword` riusa il modello di `reauthenticateWithCredential` già in `client.ts` e poi `getIdToken(true)`. Il codice `riconferma_richiesta` in `errori.ts`, con le 5 lingue.
- [ ] **Step 6: Verifica** `npm test`, `npm run test:rules`, audit lingue verde.
- [ ] **Step 7: Commit** `feat(admin): riconferma password e avvisi via functions`.

### Task 8: Script di passaggio

**Files:**
- Modify: `scripts/imposta-admin.ts`
- Create: `scripts/passaggioAdmin.ts` (decisioni pure), `scripts/passaggioAdmin.test.ts`, `scripts/emu/passaggioAdmin.mjs`

**Interfaces:**
- Produces: `decidiCollega(stato: StatoRobmass): { ok: true; passi: string[] } | { ok: false; motivo: string }`; `decidiStacca(stato: StatoStacco): stesso tipo`. `StatoRobmass = { uid: string | null; salonId: string | null; altrePersone: number }`. `StatoStacco = { claimAdmin: boolean; robmassSalonId: string | null; robmassEntratoDopoCollegamento: boolean }`.
- Comandi: `controlla`, `claim on|off <email>`, `collega`, `stacca`, con `--esegui`.

- [ ] **Step 1: Test decisioni**: `collega` con `uid: null` → ferma; con `salonId: 'shared'` → già collegato, nessun passo; con `altrePersone: 1` → ferma; con `salonId: 'shared/x'` o un id diverso dall'uid → ferma; salone proprio → passi con eliminazione e scrittura account; `stacca` senza claim, con robmass non su `shared` o mai entrato → ferma.
- [ ] **Step 2: Verifica il fallimento.**
- [ ] **Step 3: Implementa.**
  - Senza `--esegui` stampa e non scrive. Il vecchio interruttore `IMPOSTA_ADMIN` si toglie.
  - `claim` fa `{ ...customClaims, admin: true }`, e toglie solo `admin` con `off`.
  - `collega` usa `recursiveDelete(salons/{uid})`, le query di `pulisciRaccolteSalone` e `accounts/{uid}.set(...)` con `salonId: 'shared'`, `role: 'titolare'`, `legacy: true`, nomi conservati. `avvisiLettiFino` e altri campi personali si perdono: accettato.
  - `stacca` cancella `accounts/{uid}` con `recursiveDelete` e `salon/shared/members/{uid}`.
  - `controlla` conta con `count()` gli appuntamenti di `salon/shared` con `assigneeUid` hotmail.
  - Un'asserzione unica impedisce `recursiveDelete` su percorsi che non siano esattamente `salons/{uidRobmass}` o `accounts/{uid}`.
- [ ] **Step 4: Prova su emulatori** con `scripts/emu/passaggioAdmin.mjs`: senza `--esegui` non cambia nulla; dopo `collega` il salone di prova è sparito, il cane di `salon/shared` è intatto, l'utente Auth esiste; `stacca` lascia intatto il cane di `shared`.
- [ ] **Step 5: Verifica** `npm test -- scripts/passaggioAdmin.test.ts` e l'esito dello script.
- [ ] **Step 6: Commit** `feat(admin): script di passaggio con sola prova`.

### Task 9: Verifica finale e guida

**Files:**
- Modify: `docs/GUIDA-ADMIN-MANAGER.md`, `PROGRESS.md`

- [ ] **Step 1:** `npm test`, `npm run test:rules`, `npx tsc --noEmit`, build delle functions, `npm run build`: tutto verde.
- [ ] **Step 2:** `npm run test:360` se praticabile sugli emulatori; se non lo è, dillo nel resoconto.
- [ ] **Step 3:** prova nel browser con emulatori: hotmail → `/admin`, robmass83 → Home, Laura senza voce admin.
- [ ] **Step 4:** aggiorna la guida con la nuova rotta e i passi manuali (§ordine di rilascio della spec). La versione dell'app si alza solo alla pubblicazione.
- [ ] **Step 5: Commit** `docs: guida degli accessi admin`.
