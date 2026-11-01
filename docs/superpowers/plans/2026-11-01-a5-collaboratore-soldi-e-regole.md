# A5 — Il collaboratore non vede i soldi, la scheda cane non si svuota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per il ruolo collaboratore niente incassi nell'app (chip in Home, pagine Incassi/Report/Statistiche, scorciatoia in Impostazioni); nelle regole Firestore il collaboratore non può salvare una scheda cane svuotata; test delle regole sulle visite che oggi mancano.

**Architecture:** Una funzione pura `vedeIncassi(role)` in `src/lib/salonAccess.ts` decide chi vede i soldi; la usano un wrapper di rotta `SoloIncassi` (nuovo, `src/app/SoloIncassi.tsx`), la Home e le Impostazioni. Nelle regole, una funzione `dogIntact()` aggiunta ai rami del collaboratore in `match /salons/{salonId}/dogs/{dogId}`.

**Tech Stack:** React 18 + react-router, Vitest + Testing Library, Firestore rules + `@firebase/rules-unit-testing` (emulatore, `npm run test:rules`).

**Spec:** `docs/superpowers/specs/2026-11-01-a5-collaboratore-soldi-e-regole-design.md`

## Global Constraints
- Ramo `fix/a5-collaboratore-soldi-regole`. Mai dati veri: test delle regole solo sull'emulatore `demo-groomly`.
- Solo il ruolo `collaboratore` perde gli incassi; `titolare`, `socio` e account senza `role` (titolare storico) restano come oggi.
- Il collaboratore continua a vedere l'importo dentro una singola visita e nel modulo di chiusura (non obiettivo).
- Regole `appointments` invariate. Regole `dogs`: per il collaboratore restano i controlli di oggi su `status` e il divieto di `delete`; si aggiunge solo l'integrità della scheda.
- Ogni documento cane che l'app produce con `dogToDoc` (`src/lib/firebaseMap.ts:191`) per un cane valido deve restare accettato.
- Testi in tutte e tre le lingue (`src/i18n/it.ts`, `en.ts`, `es.ts`).
- Commit con riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Account vecchio senza `role` (titolare storico, `role` undefined): deve vedere incassi, chip e pagine → test in Task 1 (`vedeIncassi(undefined) === true`).
2. Socio: vede tutto come oggi → test in Task 1.
3. Link diretto del collaboratore con query (`/incassi?periodo=giorno`) e sottopagine: arriva in Home senza mostrare importi neanche per un attimo → test in Task 1 sul wrapper.
4. Cane creato dal collaboratore con i dati minimi (es. dal modulo appuntamento, senza razza né email): accettato dalle regole → test in Task 2.
5. Modifica normale del collaboratore che cambia prezzi personalizzati e note e toglie l'email del contatto: accettata → test in Task 2.

---

### Task 1: Niente incassi per il collaboratore nell'app

**Files:**
- Modify: `src/lib/salonAccess.ts` (nuova `vedeIncassi`), test in `src/lib/salonAccess.test.ts`
- Create: `src/app/SoloIncassi.tsx`, test `src/app/SoloIncassi.test.tsx`
- Modify: `src/app/router.tsx:150-152` (le tre rotte incassi avvolte in `SoloIncassi`, dentro `Guard`)
- Modify: `src/pages/HomePage.tsx:~726-734` (il riquadro incassi, sia `EarningsTile` sia il segnaposto di caricamento, non compare per il collaboratore), test in `src/pages/HomePage.test.tsx`
- Modify: `src/pages/SettingsPage.tsx:~840` (la scorciatoia `/incassi/report` non compare per il collaboratore; c'è già `const collaboratore` a ~731), test in `src/pages/SettingsPage.test.tsx`
- Modify: `proRuoloDettaglio` in `src/i18n/it.ts:1153`, `en.ts:1155`, `es.ts:1155`

**Interfaces:**
- Produces: `export function vedeIncassi(role: string | undefined): boolean` — `false` solo per `'collaboratore'`.
- Produces: `export function SoloIncassi({ children }: { children: ReactElement }): ReactElement` — legge il ruolo da `useSession()` (`gate.kind === 'in' ? gate.account.role : undefined`); se `!vedeIncassi(role)` rende `<Navigate to="/" replace />`, altrimenti `children`.

- [ ] **Step 1: Test di `vedeIncassi`** in `salonAccess.test.ts`: `'vedeIncassi: solo il collaboratore non vede gli incassi'` → `vedeIncassi('collaboratore') === false`; `vedeIncassi('titolare')`, `vedeIncassi('socio')`, `vedeIncassi(undefined)` tutti `true`.
- [ ] **Step 2: Test di `SoloIncassi`** (MemoryRouter con rotte `/` → testo «HOME» e `/incassi` → `<SoloIncassi><p>SOLDI</p></SoloIncassi>`, sessione finta come negli altri test di `src/app/`):
  - `'il collaboratore che apre /incassi?periodo=giorno finisce in Home'` → si vede «HOME», mai «SOLDI».
  - `'titolare e socio vedono la pagina incassi'` → «SOLDI» per `role: 'titolare'`, `'socio'` e senza `role`.
- [ ] **Step 3: Test Home** in `HomePage.test.tsx` (stesso setup dei test esistenti, account con `role: 'collaboratore'`): `'il collaboratore non vede gli incassi di oggi'` → nessun link verso `/incassi?periodo=giorno` e nessun testo `homeIncassiOggi`; il titolare li vede ancora (test esistenti o un caso in più).
- [ ] **Step 4: Test Impostazioni** in `SettingsPage.test.tsx`: `'il collaboratore non ha la scorciatoia agli incassi'` → nessun link con `href` `/incassi/report`; il titolare sì.
- [ ] **Step 5: Esegui** `npx vitest run src/lib/salonAccess.test.ts src/app/SoloIncassi.test.tsx src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx` → i nuovi test FAIL.
- [ ] **Step 6: Implementa** `vedeIncassi`, `SoloIncassi`, le rotte in `router.tsx` (`<Guard><SoloIncassi><EarningsPage /></SoloIncassi></Guard>` e analoghe), il riquadro in Home (per il collaboratore la griglia mostra i tre riquadri restanti, senza buchi vuoti) e la scorciatoia in Impostazioni. Cerca con grep altri link a `/incassi` (oggi: `EarningsTile`, `EarningsPage:393`, `EarningsReportPage:205`, `StatistichePage:36`, `SettingsPage:840`, `src/lib/systemBack.ts:18`): quelli dentro le pagine incassi non servono, il wrapper li copre.
- [ ] **Step 7: Testi** `proRuoloDettaglio`, esattamente:
  - it: `'Il socio ha il pieno controllo del salone. Il collaboratore gestisce cani e appuntamenti e non vede gli incassi.'`
  - en: `'A partner has full control of the salon. A collaborator handles dogs and appointments and does not see the earnings.'`
  - es: `'El socio controla todo el salón. El colaborador lleva perros y citas y no ve los ingresos.'`
- [ ] **Step 8: Esegui** gli stessi test → PASS; poi `npx vitest run` (fallimento noto non correlato: `src/lib/driveInvio.test.ts`), `npx tsc --noEmit`, `npm run build` → puliti.
- [ ] **Step 9: Commit** `fix(A5): il collaboratore non vede gli incassi`

### Task 2: Regole — la scheda cane del collaboratore resta intera; test sulle visite

**Files:**
- Modify: `firestore.rules` (`match /salons/{salonId}/dogs/{dogId}`, ~178-188)
- Test: `src/lib/firestoreRules.emulator.test.ts` (setup esistente: `SALON`, `ALTRO` titolare, `COLLAB` collaboratore, `pro/main` acceso, visita `done` completata)

**Interfaces:**
- Consumes: niente da Task 1.
- Produces: funzione regole `dogIntact()` = `request.resource.data.name is string && request.resource.data.name.size() > 0 && 'species' in request.resource.data && request.resource.data.contact is map`, aggiunta in `&&` ai rami del collaboratore di `create` e `update` (non ai rami `ownerRank`).

- [ ] **Step 1: Prepara nel `beforeEach`** (regole disattivate) un cane `fido` con status `attivo` costruito con `dogToDoc` da un `Dog` valido (nome «Fido», specie `cane`, contatto con nome e telefono, un prezzo personalizzato) e una visita `aperta` `programmato` assegnata ad `ALTRO`.
- [ ] **Step 2: Test cani (collaboratore)**:
  - `'il collaboratore non svuota la scheda di un cane'` → `setDoc` di `fido` con `{ status: 'attivo' }` → `assertFails`.
  - `'il collaboratore non lascia il nome vuoto'` → `updateDoc(fido, { name: '' })` → `assertFails`.
  - `'il collaboratore modifica prezzi, note e contatto di un cane'` → `setDoc` con `dogToDoc` del cane modificato (prezzo cambiato, note nuove, contatto senza email) → `assertSucceeds`.
  - `'il collaboratore crea un cane con i dati minimi'` → `setDoc` di un nuovo cane da `dogToDoc` con solo nome, specie e contatto (nessuna razza/email) → `assertSucceeds`.
  - `'il titolare può ancora salvare un cane come vuole'` → `setDoc` di `fido` con `{ status: 'attivo' }` dal titolare → `assertSucceeds` (comportamento di oggi per `ownerRank`, invariato).
- [ ] **Step 3: Test visite (collaboratore)**:
  - `'il collaboratore sposta e chiude la visita di un altro'` → `updateDoc(aperta, { start: <altro orario> })` e poi `updateDoc(aperta, { status: 'completato', total: 30, paymentMethod: 'contanti' })` → entrambi `assertSucceeds`.
  - `'il collaboratore non cambia stato, pagamento e durata di un completato'` → `updateDoc(done, { status: 'programmato' })`, `{ paymentMethod: 'pos' }`, `{ actualDurationMin: 5 }` → tutti `assertFails` (importo e persona hanno già i loro test).
- [ ] **Step 4: Esegui** `npm run test:rules` (emulatore con Java: `JAVA_HOME` = jbr di Android Studio, vedi memoria `emulatori-java-credenziale`) → i test cani di svuotamento/nome vuoto FAIL, gli altri PASS.
- [ ] **Step 5: Implementa** `dogIntact()` in `firestore.rules`.
- [ ] **Step 6: Esegui** `npm run test:rules` → tutti PASS (anche i test esistenti, es. `'i salvataggi della 1.1.94 restano permessi a titolare, socio e collaboratore…'`); `npx vitest run src/lib/firestoreRules.test.ts` → PASS.
- [ ] **Step 7: Commit** `fix(A5): le regole non lasciano svuotare la scheda di un cane al collaboratore`

### Task 3: Verifica, audit, merge, release (controller)

- [ ] **Step 1:** Emulatori + seed come in `PROGRESS.md`; un solo runner alla volta.
- [ ] **Step 2:** `/qa-my-app:verify` con criteri: come collaboratore (staff55a) niente chip incassi in Home, niente scorciatoia in Impostazioni, `/incassi`, `/incassi/report`, `/incassi/statistiche` portano in Home; titolare (salone55) vede tutto; il collaboratore modifica una scheda cane (prezzi, note) e chiude una visita del titolare con importo; la pagina Team dice «non vede gli incassi».
- [ ] **Step 3:** Solo se tutto passa: A5 «risolto» nell'audit, commit `docs: A5 verificato e chiuso`, merge in `main`, `firebase deploy --only firestore:rules`, release APK (memoria `release-apk-automatica`).
