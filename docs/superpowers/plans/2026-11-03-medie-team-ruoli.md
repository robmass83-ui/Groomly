# Medie «Team e ruoli» gruppo B (16-17) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il collaboratore vede solo ciò che può fare (listino in sola lettura, niente «Correggi», Elimina account da membro, niente foglio Backup) e titolare/socio cambiano il ruolo delle persone dalla pagina Team.

**Architecture:** Solo app (React). Il ruolo arriva da `useSession()` (`gate.account.role`); si nasconde ciò che le regole Firestore vietano. Il cambio di ruolo usa la callable esistente `changeMemberRole` tramite `callChangeMemberRole(uid, role)` in `src/data/firebase/client.ts`.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-medie-team-ruoli-design.md`

## Global Constraints
- Testi in it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`); ogni chiave nuova in tutti e tre; nessun testo italiano fisso nei componenti (aria-label compresi).
- Nessun cambio a `firestore.rules` né a `functions/`.
- Titolare e socio vedono listino, «Correggi chiusura», Elimina account e Backup esattamente come oggi.
- I messaggi d'errore non mostrano codici grezzi: usare `messaggioCallable(error, fallito, riprova)` da `src/components/team/messaggioCallable.ts`.
- Test dalla radice: `npx vitest run <file>`; typecheck `npx tsc --noEmit`. Fallimento noto non correlato: `src/lib/driveInvio.test.ts`; ignorare `.claude/**`.
- Commit con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Ruolo non ancora noto all'apertura:** prima che la sessione sia `in`, Listino e AppointmentPage non devono mostrare per un istante i tasti di modifica a un collaboratore né nasconderli al titolare in modo permanente. Si decide solo a sessione `in`; prima, come oggi per il titolare. Test nel Task 1 (collaboratore: tasti assenti fin dal primo render a sessione `in`).
2. **Socio di un salone altrui contro titolare:** in Elimina account `membro` è già calcolato (`collaboratore`, oppure `socio` con `salonId !== uid`); il socio di un salone altrui deve avere il percorso da membro, il titolare quello di oggi. Test nel Task 3 per entrambi.
3. **Il tasto ruolo sul proprio nome o sul titolare:** non deve comparire mai (né per il titolare che guarda se stesso, né per un socio che guarda se stesso). Test nel Task 4.
4. **Doppio tocco su «Conferma» del ruolo:** una sola chiamata; il dialog non si chiude mentre la chiamata è in corso. Test nel Task 4.
5. **Collaboratore che arriva a `/impostazioni` con `state.openBackup`:** il foglio non si apre e lo stato si consuma come oggi. Test nel Task 3.

---

### Task 1: Listino in sola lettura per il collaboratore

**Files:**
- Modify: `src/pages/ListinoPage.tsx` (pulsanti in alto ~443-449, «Aggiungi il tuo listino prezzi» ~455, rinomina/elimina file ~513-520, link «Gestisci» ~150, input file nascosto)
- Test: `src/pages/ListinoPage.test.tsx`

**Interfaces:**
- Produces: nessuna.

- [ ] **Step 1: Test che falliscono:**
  - collaboratore (sessione `in`, `role: 'collaboratore'`): non ci sono i pulsanti con nome `frasi.lisGestione`, `frasi.lisAggiornaPrezzi`, `frasi.lisAggiungiFile`, nessun pulsante «Rinomina …» / «Elimina …» sui file, nessun link `frasi.lisGestisci`; un file esistente si vede ancora (nome visibile) e i prezzi si vedono.
  - titolare e socio: tutti questi pulsanti ci sono (test esistenti o uno nuovo per il socio).
  - «Stampa» (`lisStampa`): resta per tutti se la rotta `/listino/stampa` è aperta al collaboratore, altrimenti si nasconde anche quella — controllare `src/app/router.tsx` (`StaffSettings`) e seguire la rotta.
- [ ] **Step 2:** `npx vitest run src/pages/ListinoPage.test.tsx` → FAIL.
- [ ] **Step 3:** In `ListinoPage` calcolare `const soloLettura = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'` e non rendere le azioni sopra; passare il valore ai sottocomponenti che rendono «Gestisci».
- [ ] **Step 4:** stesso comando → PASS.
- [ ] **Step 5: Commit** `feat(listino): il collaboratore vede il listino in sola lettura`

### Task 2: «Correggi chiusura» nascosto al collaboratore

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (blocco `done` ~594-603 con `frasi.chiudiCorreggi`; il ruolo è `sessionRole` ~705 nel componente principale: passarlo al sottocomponente che rende il blocco)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/AppointmentPage.test.tsx` (o il file di test che oggi copre `chiudiCorreggi`; cercarlo con grep)

**Interfaces:**
- Chiave nuova (it): `chiudiChiediTitolare: 'Per correggere la chiusura chiedi al titolare'`.

- [ ] **Step 1: Test che falliscono:** visita `completato` aperta da un collaboratore (anche assegnata a lui) → nessun pulsante «Correggi» (`frasi.chiudiCorreggi`), si legge «Per correggere la chiusura chiedi al titolare»; aperta da titolare o socio → «Correggi» presente e la riga assente.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare (testo in `TYPE.meta`, colore `var(--tx3)` come la nota di correzione accanto).
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(visita): il collaboratore non corregge le chiusure, chiede al titolare`

### Task 3: Elimina account da membro e Backup chiuso al collaboratore

**Files:**
- Modify: `src/pages/EliminaAccountPage.tsx`
- Modify: `src/pages/SettingsPage.tsx` (effetto su `openBackupState` ~395-407)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/EliminaAccountPage.test.tsx`, `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `membro` già calcolato in `EliminaAccountPage`; `confermaEliminaValida(scritto, nomeSalone)` in `src/lib/confermaElimina.ts` (accetta `ELIMINA` o il nome).
- Chiave nuova (it): `delScriviMembro: 'Scrivi ELIMINA'`. Per il primo passo del membro si riusa `delMembro` ('Si cancella solo il tuo account. I dati del salone restano al titolare.').

Comportamento per `membro`:
- passo 0: titolo `delCosa`, testo `delMembro` al posto di `delElenco`;
- `avanti()` dal passo 0 salta il passo 1 (backup): va al 2 se `play`, altrimenti al 3;
- passo 3: invariato (`delMembro`);
- passo 5: etichetta `delScriviMembro`; conferma valida solo se il testo, tolti gli spazi, è `ELIMINA` (chiamare `confermaEliminaValida(frase, '')`).
Il titolare resta identico.

In `SettingsPage`: con ruolo `collaboratore` lo stato `openBackup` si consuma (come oggi, `navigate` che pulisce lo stato) ma il foglio Backup non si apre.

- [ ] **Step 1: Test che falliscono:**
  - collaboratore: passo 0 mostra «Si cancella solo il tuo account…» e non «Profilo, salone, cani…»; dopo «Avanti» non compare `delPrima`/`delSalva`; al passo finale l'etichetta è «Scrivi ELIMINA», scrivere il nome del salone non abilita il pulsante, `ELIMINA` sì.
  - socio con `salonId !== uid`: stesso percorso da membro.
  - titolare: passo 0 con `delElenco`, passo backup presente, il nome del salone abilita il pulsante (comportamento di oggi).
  - `SettingsPage` con collaboratore e `state: { openBackup: true }` → il foglio Backup (cercare il suo titolo o il testo «Ripristina da un file») non c'è; con titolare → c'è.
- [ ] **Step 2:** `npx vitest run src/pages/EliminaAccountPage.test.tsx src/pages/SettingsPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando + `npx vitest run src/i18n` → PASS.
- [ ] **Step 5: Commit** `feat(account): Elimina account da membro senza backup; Backup chiuso al collaboratore`

### Task 4: Cambio di ruolo nella pagina Team

**Files:**
- Create: `src/components/team/ConfermaRuolo.tsx`
- Modify: `src/pages/ProPage.tsx` (riga della persona accanto a «Revoca»)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/components/team/ConfermaRuolo.test.tsx`, `src/pages/ProPage.test.tsx`

**Interfaces:**
- Consumes: `callChangeMemberRole(uid: string, role: 'socio' | 'collaboratore'): Promise<void>` (esistente, `client.ts`); `messaggioCallable`; `rosterLabel`, `SalonMember` (`src/lib/salonRoster.ts`); `Dialog` (`src/components/layout/Dialog.tsx`).
- Produces: `ConfermaRuolo({ membro, onChiudi }: { membro: SalonMember | null; onChiudi: () => void })` — `Dialog` aperto quando `membro` non è null; ruolo nuovo = l'opposto di `membro.role`; testo `teamRendiSocioDomanda` o `teamRendiCollaboratoreDomanda` con `{{nome}}` = `rosterLabel(membro)`; pulsanti `invitoAnnulla` e `teamRuoloConferma`; «Conferma» chiama `callChangeMemberRole(membro.uid, nuovo)` una sola volta (disabilita durante la chiamata, `onClose` ignorato mentre è in corso), errore mostrato nel dialog con `messaggioCallable(error, frasi.invitoInvio, frasi.impInvioRiprova)`, riuscita → `onChiudi()`.
- Chiavi nuove (it): `teamRendiSocio: 'Rendi socio'`, `teamRendiCollaboratore: 'Rendi collaboratore'`, `teamRendiSocioA: 'Rendi socio {{nome}}'`, `teamRendiCollaboratoreA: 'Rendi collaboratore {{nome}}'` (aria-label), `teamRendiSocioDomanda: 'Rendere {{nome}} socio? Avrà il pieno controllo del salone, incassi compresi.'`, `teamRendiCollaboratoreDomanda: 'Rendere {{nome}} collaboratore? Non vedrà più gli incassi e non potrà cambiare servizi, listino e impostazioni.'`, `teamRuoloConferma: 'Conferma'`.

Comportamento in `ProPage`: per ogni persona con ruolo socio/collaboratore e `uid` diverso da chi guarda, se chi guarda è titolare o socio, un pulsante testuale (stesso stile di «Revoca», colore `var(--pri)`) «Rendi socio» per un collaboratore, «Rendi collaboratore» per un socio, che apre `ConfermaRuolo`. Sulla riga del titolare e sulla propria riga nessun pulsante. L'elenco si aggiorna da solo (`watchSalonAccess` è in ascolto). La riga resta leggibile a 360 px (nome, ruolo e due pulsanti: se serve i pulsanti vanno su una seconda riga).

- [ ] **Step 1: Test che falliscono:**
  - titolare con un collaboratore Anna e un socio Sara: «Rendi socio Anna» e «Rendi collaboratore Sara» presenti; nessun pulsante ruolo sulla riga del titolare.
  - socio che guarda: nessun pulsante ruolo sulla propria riga; sì sugli altri.
  - tocco su «Rendi socio Anna» → «Rendere Anna socio? Avrà il pieno controllo del salone, incassi compresi.»; «Conferma» → `callChangeMemberRole('anna-uid', 'socio')` una volta (doppio tocco → una chiamata); «Annulla» → nessuna chiamata.
  - errore `{ code: 'functions/failed-precondition', message: 'Accesso negato' }` → «Accesso negato» nel dialog; `{ code: 'functions/internal', message: 'INTERNAL' }` → testo di `impInvioRiprova`.
- [ ] **Step 2:** `npx vitest run src/components/team src/pages/ProPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** stesso comando + `npx vitest run src/i18n` → PASS; poi suite intera `npx vitest run --exclude '.claude/**'`.
- [ ] **Step 5: Commit** `feat(team): cambio di ruolo dalla pagina Team`

### Task 5: Verifica sull'emulatore e audit

**Files:**
- Create: `QA-tests/.qa-catalog/verify-team-ruoli.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (punti 16, 17 «risolto»; per 17 annotare che «Esci dal salone» è «Torna al mio salone» e che la sospensione è stata scartata da Roberto), `PROGRESS.md`

Browser (Playwright sull'app in modo emu, account creati con firebase-admin, callable `changeMemberRole` eseguita con `.run()` come `verify-team-inviti.cjs`), a 390 e 360 px con misura delle righe:
- collaboratore: Listino senza azioni di modifica; visita completata senza «Correggi» e con la riga; Elimina account con testo da membro, senza backup, «Scrivi ELIMINA»; `/impostazioni` con `openBackup` non apre il foglio.
- titolare: «Rendi socio» su un collaboratore → conferma → il documento `members/<uid>` e `accounts/<uid>` hanno `role: 'socio'`; la riga mostra «Socio» e «Rendi collaboratore».
- il telefono della persona promossa (secondo contesto del browser): dopo il cambio vede i menu del socio (al massimo dopo una ricarica; annotare quale dei due).

- [ ] **Step 1:** Ambiente come in PROGRESS («Ambiente di test»).
- [ ] **Step 2:** `node QA-tests/.qa-catalog/verify-team-ruoli.cjs` → tutti OK, screenshot in `QA-tests/results/team-ruoli/`.
- [ ] **Step 3:** Audit e PROGRESS; commit `docs: Team e ruoli 16-17 risolti e verificati`.
