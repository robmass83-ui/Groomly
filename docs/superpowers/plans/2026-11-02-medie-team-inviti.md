# Medie «Team e ruoli» gruppo A (12-15) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inviti accettati solo con un tocco e con l'email confermata, inviti in sospeso visibili e annullabili, revoca con conferma e avviso a chi viene tolto, titolare senza Salone che può staccare chi è rimasto agganciato, membro bloccato che può tornare al suo salone.

**Architecture:** Le decisioni pure stanno in `src/lib/salonAccess.ts` (condivise app/server). La logica server nuova sta in un modulo `functions/src/piano/invitiTeam.ts` provato con `firestoreFinto`; `functions/src/index.ts` la espone come callable. L'app chiama le callable da `src/data/firebase/client.ts` e cambia `InvitePage`, `ProPage`, `AbbonamentoPage`, `StaffLock` e `HomePage`.

**Tech Stack:** React + TypeScript + Vite, Firebase (Auth, Firestore, Functions v2), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-02-medie-team-inviti-design.md`

## Global Constraints
- Testi in it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`); le chiavi nuove vanno in tutti e tre (il test `frasiFisse`/tipi lo controllano).
- Nessun cambio a `firestore.rules`.
- Il token dell'invito non esce mai dal server se non nel link già spedito: l'id degli inviti in sospeso è `sha256(token)` in esadecimale.
- I messaggi d'errore mostrati non contengono mai codici grezzi come `[400]`, `failed-precondition`, `INTERNAL`.
- Test delle functions lanciati dalla radice: `npx vitest run functions/src/...`. Test dell'app: `npx vitest run src/...`.
- Mai toccare dati di produzione.
- Commit con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Email confermata ma token vecchio:** chi conferma l'email e torna sull'invito senza uscire ha ancora un ID token con `email_verified: false`. `callAcceptInvite` deve forzare `getIdToken(true)` prima della chiamata, altrimenti il server rifiuta chi ha appena confermato. Test nel Task 4.
2. **Doppia accettazione / doppio tocco:** due «Accetta» veloci o la pagina riaperta dopo l'accettazione non devono mostrare un errore rosso: il secondo giro trova `usato` con `usedBy` = chi chiama e deve dire «Fai già parte di <salone>». Test nei Task 2 e 4.
3. **Annullare un invito già accettato nel frattempo:** `annullaInvito` su un invito diventato `usato` non deve cancellarlo né togliere una scadenza da `openInviteExpiries` (il posto è già passato al membro). Test nel Task 2.
4. **Revoca del titolare senza Salone:** togliere il requisito del piano non deve permettere a un collaboratore di revocare, né a chiunque di revocare il titolare. Test nel Task 1.
5. **Avviso d'uscita su chi lascia da solo:** `tornaAlMioSalone` (scelta del membro) non scrive `avvisi/uscita`; solo `revokeMember`. Test nel Task 2 (la funzione di scrittura è chiamata solo dalla revoca) e verifica nel Task 8.

---

### Task 1: Decisioni condivise (email confermata, revoca senza Salone, rifiuto)

**Files:**
- Modify: `src/lib/salonAccess.ts` (`acceptInviteDecision`, `revokeDecision`)
- Modify: `functions/src/index.ts` (chiamate a `revokeDecision` e `acceptInviteDecision`, solo per adattare i parametri)
- Test: `src/lib/salonAccess.test.ts`

**Interfaces:**
- Produces:
  - `acceptInviteDecision(input)` con due campi nuovi in input: `emailVerified: boolean`, `legacy: boolean`. Se `!emailVerified && !legacy` → `denied('Conferma la tua email per accettare l’invito')`. Il controllo va **dopo** quelli su invito valido/scaduto/email diversa e **prima** di «Questo account ha già un salone».
  - Il controllo email diversa ora dice `denied('Questo invito è per un’altra email')` (oggi «Invito non valido»).
  - `revokeDecision(input: { caller: Manager; salonId: string; targetUid: string; targetRole: string })` — **senza** `proEnabled`. Restano: titolare/`targetUid === salonId` → «Non puoi revocare il titolare»; caller non titolare/socio di `salonId` → «Accesso negato».
  - `export const MESSAGGIO_EMAIL_NON_CONFERMATA = 'Conferma la tua email per accettare l’invito'` (usato dalla pagina per riconoscere il caso).
  - `export type StatoInvito = 'aperto' | 'gia-tuo' | 'scaduto' | 'altra-email' | 'non-valido'` (stesso tipo per app e server).

- [ ] **Step 1: Test che falliscono** in `salonAccess.test.ts`:
  - `acceptInviteDecision` con invito valido, `emailVerified: false, legacy: false` → `{ ok: false, message: MESSAGGIO_EMAIL_NON_CONFERMATA }`; con `legacy: true` → ok; con `emailVerified: true` → ok.
  - email diversa → message `'Questo invito è per un’altra email'`.
  - `revokeDecision({ caller: { salonId: 's', role: 'titolare' }, salonId: 's', targetUid: 'c', targetRole: 'collaboratore' })` → ok (nessun piano); caller `collaboratore` → «Accesso negato»; `targetRole: 'titolare'` → «Non puoi revocare il titolare»; caller di un altro salone → «Accesso negato».
  - Aggiornare i test esistenti che passano `proEnabled` a `revokeDecision`.
- [ ] **Step 2:** `npx vitest run src/lib/salonAccess.test.ts` → FAIL sui nuovi casi.
- [ ] **Step 3:** Implementare. In `functions/src/index.ts`: `revokeMember` smette di leggere `pro/main` per la decisione (la lettura di `proSnap` si può togliere); `acceptInvite` passa `emailVerified: request.auth?.token?.email_verified === true` e `legacy: <campo legacy dell'account letto nella transazione> === true` (leggere `legacy` dai dati grezzi del documento, `accountOf` non lo espone).
- [ ] **Step 4:** `npx vitest run src/lib/salonAccess.test.ts functions/src/salonInvite.test.ts` → PASS; `cd functions && npx tsc --noEmit` → nessun errore.
- [ ] **Step 5: Commit** `feat(team): invito solo con email confermata, revoca anche senza Salone`

### Task 2: Modulo server degli inviti del team

**Files:**
- Create: `functions/src/piano/invitiTeam.ts`
- Test: `functions/src/piano/invitiTeam.test.ts` (con `vi.mock('firebase-admin/firestore', … firestoreFinto(archivio))` come `pausaSalone.test.ts`)

**Interfaces:**
- Consumes: `StatoInvito` (Task 1); `removeOneOpenInviteExpiry` da `functions/src/salonInvite.ts`; `salonCollection`, `normalizeEmail` da `src/lib/salonPath.ts`; `isStaffRole`/`StaffRole` da `src/lib/salonAccess.ts`.
- Produces:
  - `idInvito(token: string): string` — sha256 esadecimale.
  - `leggiInvitoPer(db: Firestore, chi: { uid: string; email: string }, token: string, adesso?: Date): Promise<{ stato: StatoInvito; salone: string; ruolo: StaffRole | null }>` — `salone` è `settings/main.business.salonName` del salone dell'invito (stringa vuota se manca o se `non-valido`); `gia-tuo` quando `status === 'usato' && usedBy === uid`; `altra-email` quando l'email normalizzata non coincide (in quel caso `salone` vuoto e `ruolo` null, per non rivelare nulla); token malformato o inesistente, `rifiutato`, `usato` da altri → `non-valido`.
  - `rifiutaInvitoPer(db, chi: { uid: string; email: string }, token: string, adesso?: Date): Promise<{ ok: true } | { ok: false; message: string }>` — in transazione: solo se `aperto`, non scaduto, email coincide → `status: 'rifiutato'`, `rifiutatoIl: <ISO>` e una scadenza in meno in `salons/<salonId>/pro/main.openInviteExpiries`. Altrimenti `{ ok: false, message: 'Invito non valido' }`.
  - `type InvitoInSospeso = { id: string; email: string; ruolo: StaffRole; scade: string }`
  - `invitiInSospesoPer(db, uid: string, adesso?: Date): Promise<{ ok: true; inviti: InvitoInSospeso[] } | { ok: false; message: string }>` — chiamante deve avere account con `role` titolare/socio sul suo `salonId` (altrimenti «Accesso negato»); elenco degli `invites` con `salonId` uguale, `status === 'aperto'` e `expiresAt` futura, ordinati per `scade` crescente.
  - `annullaInvitoPer(db, uid: string, id: string, adesso?: Date): Promise<{ ok: true } | { ok: false; message: string }>` — stesso controllo del chiamante; trova tra gli inviti del salone quello con `idInvito(doc.id) === id`; in transazione, solo se ancora `aperto`: cancella il documento e toglie una scadenza da `openInviteExpiries`. Invito non trovato o non più aperto → `{ ok: false, message: 'Invito non più in sospeso' }`.
  - `scriviAvvisoUscita(tx: Transaction, db: Firestore, uid: string, salone: string, adesso: Date): void` — `tx.set(salons/<uid>/avvisi/uscita, { salone, quando: adesso.toISOString(), letto: false })`.
  - `segnaAvvisoUscitaPer(db, uid: string): Promise<void>` — `set({ letto: true }, { merge: true })` su `salons/<uid>/avvisi/uscita`.

- [ ] **Step 1: Test che falliscono:**
  - `leggiInvitoPer`: aperto → `{ stato: 'aperto', salone: 'Bauci', ruolo: 'collaboratore' }`; usato da me → `gia-tuo` con nome; usato da altri → `non-valido`; scaduto → `scaduto`; email diversa → `{ stato: 'altra-email', salone: '', ruolo: null }`; email con maiuscole diverse → `aperto`; token `'abc'` → `non-valido`.
  - `rifiutaInvitoPer`: aperto → `status: 'rifiutato'` e `openInviteExpiries` perde la sua scadenza; seconda chiamata → `{ ok: false }`; email diversa → `{ ok: false }` senza scritture.
  - `invitiInSospesoPer`: titolare e socio vedono solo gli aperti non scaduti del proprio salone (un invito di un altro salone, uno `usato`, uno scaduto non compaiono); l'`id` è `idInvito(token)` e **non** il token; collaboratore → `{ ok: false, message: 'Accesso negato' }`.
  - `annullaInvitoPer`: aperto → documento sparito e scadenza tolta; invito diventato `usato` → `{ ok: false, message: 'Invito non più in sospeso' }`, documento e `openInviteExpiries` invariati; id di un invito d'altro salone → `{ ok: false }`.
  - `scriviAvvisoUscita` dentro `db.runTransaction` → documento `salons/u2/avvisi/uscita` con `letto: false`; `segnaAvvisoUscitaPer` → `letto: true`.
- [ ] **Step 2:** `npx vitest run functions/src/piano/invitiTeam.test.ts` → FAIL (modulo assente).
- [ ] **Step 3:** Implementare `invitiTeam.ts` (sha256 con `node:crypto` `createHash`).
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5: Commit** `feat(team): lettura, rifiuto e annullamento degli inviti; avviso d'uscita`

### Task 3: Callable e chiamate dal client

**Files:**
- Modify: `functions/src/index.ts`
- Modify: `src/data/firebase/client.ts`
- Test: `functions/src/piano/invitiTeam.test.ts` (nulla di nuovo); controllo di compilazione

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces (server, tutte `onCall(callable, …)` come `acceptInvite`):
  - `leggiInvito({ token })` → `{ stato, salone, ruolo }`
  - `rifiutaInvito({ token })` → `{ ok: true }` o `deny(message)`
  - `invitiInSospeso({})` → `{ inviti: InvitoInSospeso[] }` o `deny`
  - `annullaInvito({ id })` → `{ ok: true }` o `deny`
  - `segnaAvvisoUscita({})` → `{ ok: true }`, uid dal token, solo se l'account è titolare del proprio salone (`titolareUid`)
  - `revokeMember`: dentro la transazione, quando `restore` è vero, legge **prima delle scritture** `salons/<salonId>/settings/main` e poi chiama `scriviAvvisoUscita(tx, db, targetUid, salonNameOf(settings), new Date())`.
- Produces (client, in `client.ts`, accanto a `callAcceptInvite`):
  - `callLeggiInvito(token: string): Promise<{ stato: StatoInvito; salone: string; ruolo: 'socio' | 'collaboratore' | null }>` (risposta malformata → `{ stato: 'non-valido', salone: '', ruolo: null }`)
  - `callRifiutaInvito(token: string): Promise<void>`
  - `callInvitiInSospeso(): Promise<{ id: string; email: string; ruolo: 'socio' | 'collaboratore'; scade: string }[]>`
  - `callAnnullaInvito(id: string): Promise<void>`
  - `callSegnaAvvisoUscita(): Promise<void>`
  - `listenAvvisoUscita(onData: (avviso: { salone: string; letto: boolean } | null) => void): Promise<() => void>` — stesso schema di `listenAvvisoPiano` su `salonPath('avvisi', 'uscita')`.
  - `callAcceptInvite` forza `(await auth()).currentUser?.getIdToken(true)` prima della chiamata.

- [ ] **Step 1:** Implementare server e client.
- [ ] **Step 2:** `cd functions && npx tsc --noEmit` e `npx tsc --noEmit -p tsconfig.app.json` (o il comando `npm run typecheck` se esiste) → nessun errore.
- [ ] **Step 3:** `npx vitest run functions/src src/lib/salonAccess.test.ts --exclude '.claude/**'` → PASS.
- [ ] **Step 4: Commit** `feat(team): callable per inviti in sospeso, rifiuto e avviso d'uscita`

### Task 4: Pagina d'invito con Accetta e Rifiuta

**Files:**
- Modify: `src/pages/InvitePage.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/InvitePage.test.tsx`

**Interfaces:**
- Consumes: `callLeggiInvito`, `callRifiutaInvito`, `callAcceptInvite` (Task 3); `session.emailVerified`, `session.legacy` da `useSession`; `MESSAGGIO_EMAIL_NON_CONFERMATA` (Task 1).
- Chiavi nuove (it): `invitoEntra: 'Entra nel salone {{nome}} come {{ruolo}}'`, `invitoEntraSenzaNome: 'Entra nel salone come {{ruolo}}'`, `invitoAccetta: 'Accetta'`, `invitoRifiuta: 'Rifiuta'`, `invitoConfermaEmail: 'Conferma la tua email per accettare l’invito'`, `invitoGiaTuo: 'Fai già parte di {{nome}}'`, `invitoGiaTuoSenzaNome: 'Fai già parte di questo salone'`, `invitoAltraEmail: 'Questo invito è per un’altra email'`, `invitoScaduto: 'Invito scaduto'`, `invitoNonValido: 'Invito non valido'`, `invitoVaiHome: 'Vai alla Home'`.

Comportamento da dentro (gate `in`):
1. Chiama `callLeggiInvito(token)` una volta. Mentre legge: riga d'attesa.
2. `aperto` e email non confermata (`!emailVerified && !legacy`): testo `invitoConfermaEmail`, niente pulsanti d'accettazione (resta `ricordaInvito(token)`).
3. `aperto`: titolo `invitoEntra` (ruolo con `roleLabel`), **Accetta** e **Rifiuta**. Accetta → se il salone personale ha dati, la scelta pausa/aperto di oggi; altrimenti `accetta(undefined)`. Chi è già in un altro salone (`altroSalone`) → `accetta(undefined)` diretto come oggi, il server risponde «Questo account ha già un salone». Rifiuta → `callRifiutaInvito`, `dimenticaInvito()`, `navigate('/')`.
4. `gia-tuo`: `invitoGiaTuo` + «Vai alla Home», `dimenticaInvito()`.
5. `scaduto` / `altra-email` / `non-valido`: il testo relativo + «Vai alla Home», `dimenticaInvito()`.
6. Errore della lettura (rete): `invitoInvio` come oggi + «Vai alla Home».
7. `callableMessage` toglie i codici: oltre al prefisso `code: `, toglie un suffisso ` [<3 cifre>]`; se il messaggio è `MESSAGGIO_EMAIL_NON_CONFERMATA` mostra `invitoConfermaEmail`.
8. Mai accettazione automatica all'apertura.

- [ ] **Step 1: Test che falliscono** (mock di `client` come nei test attuali):
  - aperto + email confermata → si vedono «Entra nel salone Bauci come Collaboratore», «Accetta», «Rifiuta»; `callAcceptInvite` **non** chiamata finché non si tocca Accetta; dopo il tocco chiamata una volta (doppio tocco veloce → una sola chiamata).
  - aperto + email non confermata → «Conferma la tua email per accettare l’invito», nessun «Accetta».
  - legacy non confermato → «Accetta» presente.
  - Rifiuta → `callRifiutaInvito(token)` e navigazione a `/`.
  - `gia-tuo` → «Fai già parte di Bauci» e «Vai alla Home».
  - errore `new Error('failed-precondition: Invito scaduto [400]')` da `callAcceptInvite` → testo «Invito scaduto», nessun «[400]» nel documento.
  - in `src/data/firebase/client.invito.test.ts` (nuovo, `vi.mock('firebase/functions')` e `auth` finto): `callAcceptInvite` chiama `getIdToken(true)` prima di `httpsCallable(...)(data)`.
  - testi in en/es presenti (chiavi in tutti e tre i file).
- [ ] **Step 2:** `npx vitest run src/pages/InvitePage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando + `npx vitest run src/i18n` → PASS.
- [ ] **Step 5: Commit** `feat(invito): Accetta e Rifiuta, email confermata, niente codici grezzi`

### Task 5: Team — inviti in sospeso e conferma di revoca

**Files:**
- Create: `src/components/team/ConfermaRevoca.tsx`
- Modify: `src/pages/ProPage.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/ProPage.test.tsx`, `src/components/team/ConfermaRevoca.test.tsx`

**Interfaces:**
- Consumes: `callInvitiInSospeso`, `callAnnullaInvito`, `callRevokeMember` (Task 3).
- Produces: `ConfermaRevoca({ membro, onChiudi, onTolto }: { membro: SalonMember | null; onChiudi: () => void; onTolto?: () => void })` — `Dialog` aperto quando `membro` non è null; testo `teamTogliDomanda`, pulsanti `invitoAnnulla` e `teamTogli` (variant `bad`); «Togli» chiama `callRevokeMember(membro.uid)`, disabilita i pulsanti durante la chiamata, in caso d'errore mostra il messaggio (senza codici) dentro il dialog, in caso di riuscita `onTolto?.()` e `onChiudi()`.
- Chiavi nuove (it): `teamTogliDomanda: 'Togliere {{nome}} dal salone? Non vedrà più cani e appuntamenti del salone.'`, `teamTogli: 'Togli'`, `teamInvitiSospeso: 'Inviti in sospeso'`, `teamInvitoScade: '{{ruolo}} · scade il {{data}}'`, `teamAnnullaInvito: 'Annulla'`, `teamAnnullaDomanda: 'Annullare l’invito a {{email}}? Il posto si libera subito.'`, `teamAnnullaConferma: 'Annulla invito'`.

Comportamento in `ProPage` (solo se `!inactive` e il chiamante è titolare o socio):
- Il pulsante «Revoca» apre `ConfermaRevoca` invece di revocare subito.
- Sezione `teamInvitiSospeso` (in una `Card` sotto le persone, nascosta se vuota): per ogni invito email, `teamInvitoScade` (data `toLocaleDateString(lingua)`), «Annulla» che apre un `Dialog` di conferma → `callAnnullaInvito(id)` → rilettura dell'elenco.
- L'elenco si legge all'apertura, dopo un invito spedito con successo e dopo un annullamento; un errore di lettura nasconde la sezione (niente errore a schermo).

- [ ] **Step 1: Test che falliscono:**
  - tocco su «Revoca Anna» → `callRevokeMember` **non** chiamata, compare «Togliere Anna dal salone? …»; «Togli» → chiamata con l'uid; «Annulla» → nessuna chiamata.
  - con `callInvitiInSospeso` che restituisce un invito → compaiono «Inviti in sospeso», l'email e «Collaboratore · scade il …»; «Annulla» → conferma → `callAnnullaInvito(id)` e nuova lettura.
  - collaboratore (non arriva qui per rotta, ma il componente non deve chiamare `callInvitiInSospeso` se il ruolo è collaboratore).
  - `ConfermaRevoca` con errore `'failed-precondition: Accesso negato'` → mostra «Accesso negato».
- [ ] **Step 2:** `npx vitest run src/pages/ProPage.test.tsx src/components/team` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5: Commit** `feat(team): inviti in sospeso annullabili, revoca con conferma`

### Task 6: Senza Salone — persone ancora collegate e «Torna al mio salone»

**Files:**
- Create: `src/components/team/PersoneCollegate.tsx`
- Modify: `src/pages/AbbonamentoPage.tsx`
- Modify: `src/components/AccessoSospeso.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/components/team/PersoneCollegate.test.tsx`, `src/pages/AbbonamentoPage.test.tsx`, `src/components/AccessoSospeso.test.tsx`

**Interfaces:**
- Consumes: `watchSalonAccess` (esistente), `ConfermaRevoca` (Task 5), `callTornaAlMioSalone`, `reloadSignedInAccount` (esistenti), `dopoCambioSalone` (esistente).
- Produces: `PersoneCollegate({ salonId }: { salonId: string })` — ascolta `watchSalonAccess(salonId)`; mostra una `Card` titolo `teamCollegati` solo se ci sono membri `attivo` con ruolo socio/collaboratore; per ognuno nome (`rosterLabel`), ruolo, «Togli» → `ConfermaRevoca`. Niente se l'elenco è vuoto o illeggibile.
- In `AbbonamentoPage`: `<PersoneCollegate salonId={account.uid} />` solo se l'account è `titolare` del proprio salone (`salonId === uid`) **e** `!haAccesso(stato, 'team')`.
- In `StaffLock` (schermata sospesa): titolo `sospesoTitolo` invariato; dettaglio nuovo `sospesoDettaglio: 'Il piano Salone di {{nome}} non è attivo. I dati del salone non sono persi.'` (con variante `sospesoDettaglioSenzaNome: 'Il piano Salone non è attivo. I dati del salone non sono persi.'`); pulsante `impTornaSalone` (secondario, sopra «Esci») che apre un `Dialog` con `impTornaSaloneTesto`/`impTornaSaloneTestoSenzaNome` (chiavi esistenti) e conferma → `callTornaAlMioSalone()` → `dopoCambioSalone(uid)`; errore → `frasi.operazioneKo` nel dialog.
- Chiavi nuove (it): `teamCollegati: 'Persone ancora collegate al tuo salone'`, `teamCollegatiDettaglio: 'Il piano Salone non è attivo: queste persone non possono entrare. Toglile per liberare il loro account.'`, `sospesoDettaglioSenzaNome` come sopra; `sospesoDettaglio` cambia testo.

- [ ] **Step 1: Test che falliscono:**
  - `PersoneCollegate` con un collaboratore attivo → «Persone ancora collegate al tuo salone», nome e «Togli»; «Togli» → conferma → `callRevokeMember`.
  - `PersoneCollegate` senza membri staff attivi (solo titolare o revocati) → nulla.
  - `AbbonamentoPage` per titolare Go/Plus → monta `PersoneCollegate`; per titolare Salone o per collaboratore → no.
  - `StaffLock` sospeso → testo «Il piano Salone di Bauci non è attivo…» (non più «Il titolare ha spento il piano»), «Torna al mio salone» → conferma → `callTornaAlMioSalone` e `dopoCambioSalone`.
- [ ] **Step 2:** `npx vitest run src/components/team src/pages/AbbonamentoPage.test.tsx src/components/AccessoSospeso.test.tsx` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5: Commit** `feat(team): senza Salone si tolgono le persone collegate; il membro bloccato torna al suo salone`

### Task 7: Avviso in Home per chi è stato tolto

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `listenAvvisoUscita`, `callSegnaAvvisoUscita` (Task 3).
- Chiavi nuove (it): `avvisoUscita: 'Non fai più parte di {{nome}}. Ora sei nel tuo salone.'`, `avvisoUscitaSenzaNome: 'Non fai più parte del salone. Ora sei nel tuo salone.'`, `avvisoUscitaOk: 'Ok'`.
- Comportamento: con Firebase e account titolare del proprio salone si ascolta `listenAvvisoUscita` (stesso schema di `avvisoPiano`, righe ~299-320); se c'è un avviso non letto, `Card` accanto a quella dell'avviso del piano con il testo e «Ok» → `callSegnaAvvisoUscita()`; riuscita → l'avviso sparisce; errore → `toast.show(frasi.authSalvataggio, 'plain')`.

- [ ] **Step 1: Test che falliscono:** avviso `{ salone: 'Bauci', letto: false }` → «Non fai più parte di Bauci. Ora sei nel tuo salone.»; «Ok» → `callSegnaAvvisoUscita` e l'avviso sparisce; `letto: true` → nulla; collaboratore → `listenAvvisoUscita` non chiamata.
- [ ] **Step 2:** `npx vitest run src/pages/HomePage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando → PASS; poi suite intera `npx vitest run --exclude '.claude/**'` (fallimento noto non correlato: `src/lib/driveInvio.test.ts`).
- [ ] **Step 5: Commit** `feat(home): avviso a chi è stato tolto dal salone`

### Task 8: Verifica sull'emulatore e audit

**Files:**
- Create: `QA-tests/.qa-catalog/verify-team-inviti.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (punti 12-15 «risolto» con la verifica), `PROGRESS.md`

Server (funzioni compilate, `cd functions && npx tsc`, emulatore `demo-groomly`, come `verify-a7.cjs`):
- (a) `acceptInvite` con utente non verificato → rifiuto «Conferma la tua email…»; verificato → accettato.
- (b) `leggiInvito` aperto / già tuo / altra email; `rifiutaInvito` libera il posto (`openInviteExpiries` −1).
- (c) `invitiInSospeso` dal titolare non contiene token; `annullaInvito` cancella e libera; annullare un invito `usato` non tocca nulla.
- (d) Titolare Go con un collaboratore agganciato: `revokeMember` riesce, l'account del collaboratore torna al suo salone e `salons/<collab>/avvisi/uscita` ha il nome del salone; `tornaAlMioSalone` di un altro membro non scrive `avvisi/uscita`.

Browser (`--browser`, Playwright, callable intercettate su `:5001` ed eseguite con `.run()` come `verify-a7-browser.cjs`, a 390 e 360 px con misura delle righe):
- pagina d'invito: Accetta/Rifiuta; email non confermata; «Fai già parte di …»;
- Team: inviti in sospeso e conferma di revoca;
- Abbonamento di un titolare Go con persona collegata → «Togli»;
- blocco del collaboratore → «Torna al mio salone»;
- Home del revocato → avviso e «Ok».

- [ ] **Step 1:** Rifare l'ambiente (PROGRESS, «Ambiente di test»).
- [ ] **Step 2:** `node QA-tests/.qa-catalog/verify-team-inviti.cjs` → tutti i casi OK; `--browser` → OK, screenshot in `QA-tests/results/team-inviti/`.
- [ ] **Step 3:** Aggiornare audit e PROGRESS; commit `docs: Team e ruoli 12-15 risolti e verificati`.
