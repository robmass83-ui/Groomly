# A7 — Invito che non si perde e salone in pausa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il link d'invito sopravvive a «Entra»/«Crea account»/conferma email; chi ha un salone pieno può unirsi a un altro mettendo in pausa (o no) il proprio, tornarci da sé, e ritrovarlo com'era.

**Architecture:** Logica pura in `src/lib` (decisione d'invito, calcolo di pausa e ripresa) usata dal server; il server scrive la pausa nella stessa transazione dell'accettazione e la toglie in ogni via di ritorno con una funzione comune. Il client ricorda il token in `localStorage` e rimanda all'invito appena l'ingresso è `home`.

**Tech Stack:** React + TypeScript (Vite, Capacitor), Firebase Functions v2 (admin SDK), Firestore, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-a7-invito-non-si-perde-design.md`

## Global Constraints
- Mai dati veri: test solo con Firestore finti (vitest) ed emulatore `demo-groomly`.
- Testi dell'app in `src/i18n/it.ts`, `en.ts`, `es.ts` (stesse chiavi); i messaggi d'errore del server sono in italiano, come gli altri.
- **Deviazione dalla specifica (decisa in pianificazione):** il ricordo della pausa sta in `salons/<uid>/pro/main.pausa` (le regole vietano al client di scrivere `pro/*`), **non** in `settings/main`: il client riscrive `settings/main` intero (`putDoc` = `setDoc` senza merge, `src/data/firebase/client.ts:~1109`) e cancellerebbe un campo che non conosce.
- Ogni scrittura del server su `settings/main` usa `set(..., { merge: true })` e mette `updatedAt: new Date().toISOString()`, così una copia più vecchia sul telefono non la ricopre (`isStaleWrite`, `client.ts:~1036`).
- Lista d'attesa = `settings/main.serviziEmail.attesa` (`SceltaServizio`, `modo: 'spento' | 'manuale' | 'automatico'`); prenotazioni = `settings/main.prenotazioniOnline` (boolean).
- `acceptInvite` resta una transazione unica (tutte le letture prima delle scritture).
- Testi esatti (it):
  - avviso: titolo «Hai già un salone su Groomly»; testo «Hai già un account Groomly con il salone {nome}. I tuoi dati restano salvati. Cosa vuoi fare con il tuo salone mentre lavori nell'altro?»; pulsanti «Metti in pausa il mio salone» (riga sotto: «Prenotazioni online e lista d'attesa si fermano e riprendono quando torni.»), «Lascia aperto il mio salone», «Annulla»; riga finale «Se hai un abbonamento attivo, si gestisce dal Play Store: Groomly non lo cambia.»
  - Home: titolo «Il tuo salone è in pausa», dettaglio «Prenotazioni online e lista d'attesa sono sospese. Le impostazioni sono conservate.», azione «Riprendi».
  - Impostazioni: «Torna al mio salone»; conferma «Lascerai il salone {nome}. Potrai rientrarci solo con un nuovo invito.» con «Torna al mio salone» / «Annulla».
  - Pagina invito da sloggati: «Entra» (esistente `authEntra`) e «Crea account».
  - Server, scelta mancante con salone pieno: «Aggiorna l'app per accettare l'invito».
  - Nome del salone creato registrandosi da un invito: «Salone di {Nome}».

## Review Focus
1. Il token ricordato viene da un altro account (apre il link, entra con un'email diversa): il server dice «Invito non valido», il token si toglie e non si riprova in loop. → test in Task 5.
2. Un telefono con impostazioni locali vecchie salva dopo la pausa: le prenotazioni non devono riaccendersi. → test `updatedAt` in Task 1.
3. Si accetta un nuovo invito mentre `pausa` c'è già (salone tornato «in hold» dopo `eliminaSalone`): i valori salvati non vanno sovrascritti con «spento». → test in Task 1.
4. Il tour di benvenuto (`/benvenuto`) scatta per chi si è appena registrato per un invito e ruba il rimando all'invito. → test in Task 5.
5. `eliminaSalone`: persona con salone pieno non perde l'accesso Auth né `accounts/<uid>`. → test in Task 3.

---

### Task 1: Logica pura — decisione d'invito e calcolo pausa/ripresa

**Files:**
- Create: `src/lib/pausaSalone.ts`, `src/lib/pausaSalone.test.ts`
- Modify: `src/lib/salonAccess.ts:~123-153` (`acceptInviteDecision`), `src/lib/salonAccess.test.ts:~119-135`, `src/lib/piano.ts:~17` (`ProMain`)

**Interfaces:**
- Produces:
  - `export type SceltaSalonePersonale = 'pausa' | 'aperto'`
  - `export interface PausaSalone { prenotazioniOnline: boolean; attesa: SceltaServizio | null; dal: string }` (in `pausaSalone.ts`); `ProMain.pausa?: PausaSalone`
  - `export function leggiPausa(value: unknown): PausaSalone | null` — valida il campo letto da Firestore.
  - `export function pausaDa(settings: Record<string, unknown>, adesso: Date): { pausa: PausaSalone; settings: { prenotazioniOnline: false; serviziEmail: { attesa: { modo: 'spento' } }; updatedAt: string } }`
  - `export function ripresaDa(settings: Record<string, unknown>, pausa: PausaSalone, adesso: Date): { prenotazioniOnline?: boolean; attesa?: SceltaServizio | 'togli'; updatedAt: string } | null` — `null` se non c'è nulla da rimettere. Rimette `prenotazioniOnline` solo se ora è `!== true`; rimette `attesa` solo se ora `serviziEmail.attesa?.modo === 'spento'` (o manca); `'togli'` quando `pausa.attesa === null`.
  - `acceptInviteDecision` input: `personalSalonHasData` resta; nuovo `sceltaSalone?: SceltaSalonePersonale`. Output ok: `{ ok: true; salonId; role; pausa: boolean }`.

- [ ] **Step 1: test che falliscono** in `salonAccess.test.ts`:
  - `personalSalonHasData: true, sceltaSalone: 'pausa'` → `{ ok: true, salonId: 'owner', role: 'collaboratore', pausa: true }`; con `'aperto'` → `pausa: false`.
  - `personalSalonHasData: true` senza `sceltaSalone` → `message: "Aggiorna l'app per accettare l'invito"`.
  - `personalSalonHasData: false` con `sceltaSalone: 'pausa'` → `pausa: false` (niente da mettere in pausa).
  - account con `salonId: 'altro'` → resta `'Questo account ha già un salone'`.
  - aggiornare l'attesa del caso ok esistente con `pausa: false`.
  In `pausaSalone.test.ts`:
  - `pausaDa({ prenotazioniOnline: true, serviziEmail: { attesa: { modo: 'automatico' } } }, new Date('2026-11-02T10:00:00Z'))` → `pausa: { prenotazioniOnline: true, attesa: { modo: 'automatico' }, dal: '2026-11-02T10:00:00.000Z' }`, `settings.updatedAt === '2026-11-02T10:00:00.000Z'`, `settings.prenotazioniOnline === false`.
  - `pausaDa({}, …)` → `pausa.prenotazioniOnline === false`, `pausa.attesa === null`.
  - `ripresaDa` con impostazioni ancora spente → `{ prenotazioniOnline: true, attesa: { modo: 'automatico' }, updatedAt }`.
  - `ripresaDa` con `prenotazioniOnline: true` già riaccese da un socio e `attesa.modo: 'manuale'` → `null`.
  - `ripresaDa` con `pausa.attesa === null` e attesa spenta → `attesa: 'togli'`.
  - `leggiPausa(undefined) === null`, `leggiPausa({ prenotazioniOnline: 'x' }) === null`.
- [ ] **Step 2:** `npx vitest run src/lib/salonAccess.test.ts src/lib/pausaSalone.test.ts` → FAIL.
- [ ] **Step 3:** implementare (in `acceptInviteDecision` la regola diventa: non titolare del proprio uid → «Questo account ha già un salone»; dati senza scelta → «Aggiorna l'app per accettare l'invito»; `pausa = personalSalonHasData && sceltaSalone === 'pausa'`).
- [ ] **Step 4:** stessi test → PASS; `npx tsc --noEmit -p .` pulito.
- [ ] **Step 5:** commit `feat(A7): decisione d'invito con salone pieno e calcolo della pausa`.

### Task 2: Server — pausa all'accettazione, ritorno, ripresa

**Files:**
- Create: `functions/src/piano/pausaSalone.ts`, `functions/src/piano/pausaSalone.test.ts`
- Modify: `functions/src/index.ts:~1051-1104` (`acceptInvite`), `~1106-1139` (`revokeMember`), nuove callable `tornaAlMioSalone`, `riprendiSalone` accanto

**Interfaces:**
- Consumes: Task 1 (`pausaDa`, `ripresaDa`, `leggiPausa`, `acceptInviteDecision`).
- Produces (in `functions/src/piano/pausaSalone.ts`):
  - `export type LettoPausa = { settings: Record<string, unknown>; pausa: PausaSalone | null }`
  - `export async function leggiPerPausa(tx: Transaction, db: Firestore, uid: string): Promise<LettoPausa>`
  - `export function scriviPausa(tx: Transaction, db: Firestore, uid: string, letto: LettoPausa, adesso: Date): void` — se `letto.pausa` c'è già non fa nulla; altrimenti `settings/main` merge con `pausaDa(...).settings` e `pro/main` merge `{ pausa }`.
  - `export function scriviRipresa(tx: Transaction, db: Firestore, uid: string, letto: LettoPausa, adesso: Date): void` — senza pausa nulla; altrimenti applica `ripresaDa` (merge; `'togli'` → `FieldValue.delete()` su `serviziEmail.attesa` via `tx.update` con percorso a punti) e toglie `pro/main.pausa` con `FieldValue.delete()`.
  - `export async function riprendiSalone(db: Firestore, uid: string, adesso?: Date): Promise<void>` — transazione con le due sopra (per chi non è già in una transazione).
  - Callable `acceptInvite` accetta `data.sceltaSalone` (`'pausa' | 'aperto'`, altro → undefined).
  - Callable `tornaAlMioSalone()` → `{ ok: true }`; callable `riprendiSalone()` → `{ ok: true }`.

- [ ] **Step 1: test che falliscono** in `pausaSalone.test.ts` con un Firestore finto che supporti `runTransaction` (sul modello di `eliminaAccount.test.ts`, `tx.get/set/update` = operazioni sul `Map`; `FieldValue.delete()` riconosciuto):
  - `riprendiSalone` con `pro/main.pausa = { prenotazioniOnline: true, attesa: { modo: 'automatico' }, dal }` e settings spente → settings con `prenotazioniOnline: true`, `serviziEmail.attesa.modo: 'automatico'`, `updatedAt` stringa; `pro/main.pausa` assente.
  - `riprendiSalone` senza pausa → settings identiche (stesso oggetto per contenuto).
  - `scriviPausa` con `letto.pausa` già presente → nessuna scrittura.
- [ ] **Step 2:** `npx vitest run functions/src/piano/pausaSalone.test.ts` (dalla radice) → FAIL.
- [ ] **Step 3:** implementare `pausaSalone.ts`; poi in `index.ts`:
  - `acceptInvite`: dopo le letture esistenti, se `!dogs.empty || !appointments.empty` leggere `leggiPerPausa(tx, db, uid)` **prima** di qualunque scrittura; passare `sceltaSalone`; se `decision.pausa` → `scriviPausa`.
  - `revokeMember`: quando `shouldRestoreAccount(...)` è vero, `leggiPerPausa(tx, db, targetUid)` prima delle scritture e `scriviRipresa` insieme al ripristino dell'account.
  - `tornaAlMioSalone`: account del chiamante con `role !== 'titolare'` e `salonId !== uid` (altrimenti `Accesso negato`); `members/<uid>` del salone attuale a `{ status: 'revocato' }` (merge), account a `{ salonId: uid, role: 'titolare' }` (merge), `scriviRipresa` su `uid`.
  - `riprendiSalone`: account del chiamante; ammesso se `role === 'titolare' && salonId === uid` oppure `role === 'socio'` (altrimenti `Accesso negato`); ripresa su `account.salonId`.
- [ ] **Step 4:** test → PASS; `cd functions && npx tsc` pulito.
- [ ] **Step 5:** commit `feat(A7): pausa del salone personale nell'accettazione, ritorno e ripresa`.

### Task 3: Server — eliminazioni che rispettano il salone personale

**Files:**
- Modify: `functions/src/piano/eliminaAccount.ts:~68-90`, `functions/src/piano/eliminaSalone.ts:~37-75`, test `functions/src/piano/eliminaAccount.test.ts`, `functions/src/piano/eliminaSalone.test.ts`

**Interfaces:**
- Consumes: `riprendiSalone(db, uid)` (Task 2).
- Produces: `eliminaSalonePer` ritorna `{ ok: true; persone: number; riportate: number }` (persone = cancellate).

- [ ] **Step 1: test che falliscono** (estendere il Firestore finto con `runTransaction` come in Task 2):
  - `eliminaAccountPer` del titolare con un collaboratore il cui `salons/<membro>/pro/main.pausa` esiste e settings spente → account del membro riportato **e** prenotazioni rimesse, `pausa` tolta.
  - `eliminaAccountPer` di un **membro** (`azione: 'membro'`) con `salons/<membro>/dogs/d1` → `salons/<membro>` e i suoi documenti non esistono più (il salone personale non resta orfano).
  - `eliminaSalonePer` con un collaboratore che ha `salons/<collab>/dogs/d1` e `pro/main.pausa` → `accounts/<collab>` esiste con `{ salonId: '<collab>', role: 'titolare' }`, `authCancellati` non contiene `<collab>`, `pausa` **ancora presente**, `riportate: 1`; un secondo collaboratore con salone vuoto → cancellato come oggi.
- [ ] **Step 2:** `npx vitest run functions/src/piano/eliminaAccount.test.ts functions/src/piano/eliminaSalone.test.ts` → FAIL.
- [ ] **Step 3:** implementare:
  - `eliminaAccount` ramo `salone`: dopo `accountMembro.set(...)` chiamare `await riprendiSalone(db, member.id)`.
  - `eliminaAccount` ramo `membro`: prima di cancellare l'account, `recursiveDelete(salons/<uid>)` + `pulisciRaccolteSalone(db, uid)`.
  - `eliminaSalone`: per ogni persona ≠ titolare, se `salons/<uid>/dogs` o `appointments` (limit 1) non è vuoto → `accounts/<uid>` merge `{ salonId: uid, role: 'titolare' }` e la si toglie dalle liste di `pulisciPersona` e `deleteUser`; la pausa non si tocca.
- [ ] **Step 4:** test → PASS (anche i test esistenti dei due file).
- [ ] **Step 5:** commit `feat(A7): le eliminazioni riportano al proprio salone chi ha dei dati`.

### Task 4: Client — dati: token ricordato, chiamate, salone personale

**Files:**
- Create: `src/data/local/invitoInSospeso.ts`, `src/data/local/invitoInSospeso.test.ts`
- Modify: `src/data/firebase/client.ts:~605` (callable), `src/hooks/useSession.tsx:~155` (`logout`), `src/hooks/usePiano.tsx` (esporre la pausa)

**Interfaces:**
- Produces:
  - `export function ricordaInvito(token: string, adesso?: Date): void`, `export function invitoInSospeso(adesso?: Date): string | null` (null se assente, malformato o salvato da più di `INVITE_DAYS` giorni), `export function dimenticaInvito(): void`. Chiave `groomly.invitoInSospeso`, valore `{ token, at }`; ogni accesso in try/catch.
  - `callAcceptInvite(token: string, sceltaSalone?: SceltaSalonePersonale): Promise<void>`; `callTornaAlMioSalone(): Promise<void>`; `callRiprendiSalone(): Promise<void>`.
  - `export async function salonePersonale(uid: string): Promise<{ haDati: boolean; nome: string }>` — legge `salons/<uid>/dogs` e `appointments` (limit 1) e `settings/main.business.salonName`.
  - `PianoValore.pausa?: PausaSalone | null` (da `leggiPausa(pro?.pausa)`).
  - `logout()` chiama `dimenticaInvito()`.
- [ ] **Step 1: test che falliscono** (`invitoInSospeso.test.ts`): ricorda e rilegge; dopo 8 giorni `null`; JSON rotto `null`; `dimenticaInvito` lo toglie; token non esadecimale da 64 → non salvato.
- [ ] **Step 2:** `npx vitest run src/data/local/invitoInSospeso.test.ts` → FAIL.
- [ ] **Step 3:** implementare tutto quanto sopra.
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit -p .` pulito.
- [ ] **Step 5:** commit `feat(A7): il telefono ricorda l'invito e sa del salone personale`.

### Task 5: Client — pagina d'invito, rimando, registrazione per invito

**Files:**
- Modify: `src/pages/InvitePage.tsx`, `src/app/router.tsx:~120-125` (componente di rimando accanto a `TourAvvio`), `src/app/TourAvvio.tsx` (niente tour con invito in sospeso), `src/pages/LoginPage.tsx` (`CreateView` in modo invito), `src/i18n/{it,en,es}.ts`
- Test: `src/pages/InvitePage.test.tsx` (nuovo), `src/pages/LoginPage.test.tsx`, `src/app/TourAvvio.test.tsx`

**Interfaces:**
- Consumes: Task 4.
- Produces: `export function RimandoInvito(): null` in `src/app/RimandoInvito.tsx` — montato quando `gate.kind === 'in' && entry.kind === 'home'`; se `invitoInSospeso()` e il percorso non è già `/invito/...` → `navigate('/invito/<token>', { replace: true })`.

- [ ] **Step 1: test che falliscono:**
  - InvitePage da sloggati: salva il token (`invitoInSospeso() === token`) e mostra «Entra» e «Crea account»; «Crea account» porta a `/login` con `state: { mode: 'create' }`.
  - InvitePage da dentro, salone vuoto → chiama `callAcceptInvite(token, undefined)` senza avviso, poi `dimenticaInvito` e home.
  - InvitePage da dentro, salone pieno «Luna» → mostra «Hai già un account Groomly con il salone Luna…»; «Metti in pausa il mio salone» → `callAcceptInvite(token, 'pausa')`; «Annulla» → home, nessuna chiamata, token dimenticato.
  - Errore `Invito non valido` (e `Invito scaduto`, `Posti esauriti`) → messaggio mostrato, token dimenticato, una sola chiamata.
  - `RimandoInvito`: con token in sospeso ed entrata `home` su `/` → va a `/invito/<token>`.
  - TourAvvio: con token in sospeso non manda a `/benvenuto`.
  - LoginPage in modo invito (token in sospeso): il modulo «Crea account» non mostra Toelettatura, P.IVA e indirizzo; `createAccount` riceve `salonName: 'Salone di Ada'`, `vatNumber: ''`, `address: ''`.
- [ ] **Step 2:** `npx vitest run src/pages/InvitePage.test.tsx src/pages/LoginPage.test.tsx src/app/TourAvvio.test.tsx` → FAIL.
- [ ] **Step 3:** implementare. `LoginPage` apre in `create` se `location.state?.mode === 'create'`. Lo schema del modulo in modo invito omette `salonName`, `vatNumber`, `address` (`registrationSchemaPer(lingua).omit(...)`).
- [ ] **Step 4:** test → PASS; `npx vitest run src` senza nuovi fallimenti (noto e non correlato: `src/lib/driveInvio.test.ts`).
- [ ] **Step 5:** commit `feat(A7): l'invito sopravvive ad accesso e registrazione, con avviso per chi ha un salone`.

### Task 6: Client — avviso «in pausa» in Home e «Torna al mio salone»

**Files:**
- Modify: `src/pages/HomePage.tsx:~694-712` (altro `Notice`), `src/pages/SettingsPage.tsx` (voce per socio/collaboratore), `src/i18n/{it,en,es}.ts`
- Test: `src/pages/HomePage.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `usePiano().pausa`, `callRiprendiSalone`, `callTornaAlMioSalone`, `reloadSignedInAccount` + `session.replaceAccount` (come `InvitePage`).

- [ ] **Step 1: test che falliscono:**
  - Home con `pausa` presente e ruolo titolare o socio → `Notice` «Il tuo salone è in pausa»; «Riprendi» chiama `callRiprendiSalone` una volta. Senza `pausa` o da collaboratore → nessun avviso.
  - Impostazioni da collaboratore/socio → «Torna al mio salone»; conferma con «Lascerai il salone {nome}…»; confermando chiama `callTornaAlMioSalone`, ricarica l'account e va a `/`. Da titolare la voce non c'è.
- [ ] **Step 2:** `npx vitest run src/pages/HomePage.test.tsx src/pages/SettingsPage.test.tsx` → FAIL.
- [ ] **Step 3:** implementare (errori del server mostrati con il toast come gli altri).
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit -p .` e `npm run lint` puliti.
- [ ] **Step 5:** commit `feat(A7): avviso del salone in pausa e ritorno al proprio salone`.

### Task 7: Verifica, audit, rilascio (lo fa il coordinatore, non un sotto-agente)

- [ ] `QA-tests/.qa-catalog/verify-a7.cjs` sulle funzioni compilate in emulatore: accetta con salone pieno + `pausa` → settings spente e `pro/main.pausa`; `revokeMember` → rimesse; `tornaAlMioSalone` → rimesse; `eliminaSalone` → account riportato, pausa ancora lì; `riprendiSalone` → tolta.
- [ ] `/qa-my-app:verify` nel browser (3 percorsi della specifica, punto 9).
- [ ] Audit A7 segnato «risolto», PROGRESS aggiornato, merge in `main`, deploy functions (`acceptInvite`, `revokeMember`, `tornaAlMioSalone`, `riprendiSalone`, `eliminaAccount`, `eliminaSalone`, con `FUNCTIONS_DISCOVERY_TIMEOUT=60`), release APK.
