# Basse «Team» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il titolare compare sempre in `members` appena qualcuno entra nel salone, e il pulsante/foglio d'invito di Team dice «Invita una persona» ed è tradotto.

**Architecture:** Una funzione pura condivisa (`functions/src/piano/titolareMembro.ts`) decide il documento `members/<titolare>` da creare se manca; la usano `acceptInvite` (nella sua transazione) e `impostaPianoManuale` (al posto del suo codice in linea). Lato app solo testi nuovi in `ProPage.tsx` con chiavi i18n nuove.

**Tech Stack:** TypeScript, Firebase Functions v2 (firebase-admin), React, vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-team-design.md`

## Global Constraints

- Testi nuovi solo con chiavi nuove in `src/i18n/it.ts`, `en.ts`, `es.ts` (test «frasi fisse» `src/i18n/frasiFisse.test.ts`).
- Frasi: pulsante «Invita una persona» / «Invite someone» / «Invitar a alguien»; titolo foglio «Invita» / «Invite» / «Invitar»; etichetta «Email» / «Email» / «Email»; tasto «Invia» / «Send» / «Enviar».
- Il titolare non occupa posti: `activeStaffCount` (server) e `usedSeats` (app) restano invariati.
- Niente regole Firestore, niente cambi di versione, niente deploy.
- vitest con `--dir src` per l'app; i fallimenti già noti (`src/lib/driveInvio.test.ts`, 21 di `DogsPage.test.tsx`, 3 di `appointments.test.tsx`) si ignorano.

## Review Focus

- Salone con member titolare già presente (anche revocato o con dati diversi) → non va riscritto.
- `accounts/<salonId>` mancante, con `role` diverso da `titolare` o con `salonId` diverso dal salone (il titolare è a sua volta entrato in un altro salone) → niente member creato.
- Ordine letture/scritture nella transazione di `acceptInvite`: tutte le `tx.get` prima della prima scrittura, altrimenti Firestore lancia.
- Email del titolare: in `members` va normalizzata come per gli altri (`normalizeEmail`), stringa vuota se manca.
- Testo inglese/spagnolo del pulsante in una riga a 320 px (lo misura la verifica).

---

### Task 1: Titolare in `members` (server)

**Files:**
- Create: `functions/src/piano/titolareMembro.ts`
- Create: `functions/src/piano/titolareMembro.test.ts`
- Modify: `functions/src/piano/impostaPianoManuale.ts:78-87` (usa la funzione nuova)
- Modify: `functions/src/index.ts` `acceptInvite` (~1056-1114)

**Interfaces:**
- Produces: `export function membroTitolareMancante(salonId: string, memberEsiste: boolean, account: Record<string, unknown> | undefined): { uid: string; email: string; role: 'titolare'; firstName: string; lastName: string; status: 'attivo' } | null`

- [ ] **Step 1: Test che falliscono** in `titolareMembro.test.ts`:
  - `crea il titolare se manca`: `membroTitolareMancante('s1', false, { salonId: 's1', role: 'titolare', email: ' Ana@X.it ', firstName: 'Ana', lastName: 'Bi' })` → `{ uid: 's1', email: 'ana@x.it', role: 'titolare', firstName: 'Ana', lastName: 'Bi', status: 'attivo' }`
  - `già presente non tocca`: `memberEsiste = true` → `null`
  - `account mancante` (`undefined`) → `null`
  - `account non titolare` (`role: 'socio'`) → `null`
  - `titolare entrato in un altro salone` (`salonId: 'altro'`) → `null`
  - `campi mancanti`: `{ salonId: 's1', role: 'titolare' }` → email/firstName/lastName `''`
- [ ] **Step 2:** `npx vitest run functions/src/piano/titolareMembro.test.ts` → FAIL (modulo mancante).
- [ ] **Step 3:** Implementa la funzione (email con `normalizeEmail` da `../../../src/lib/salonPath`).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: `impostaPianoManuale`**: sostituisci il blocco `if (!owner || …) return; tx.set(memberRef, {…})` con `const membro = membroTitolareMancante(input.salonId, memberSnap.exists, owner); if (membro) tx.set(memberRef, membro)`; resta la condizione su `azione` salone/bypass-salone. Nota: oggi l'email non era normalizzata; da ora sì (scelta voluta).
- [ ] **Step 6: `acceptInvite`**: dentro `if (invite)`, dopo la lettura di `members`, ricava `titolareEsiste = members.docs.some((d) => d.id === invite.salonId)`; se manca leggi `accounts/<invite.salonId>` con `tx.get` (prima di qualsiasi scrittura). Dopo `tx.set` del member nuovo: `const titolare = …membroTitolareMancante(decision.salonId, titolareEsiste, datiAccountTitolare)` e se non `null` `tx.set(db.doc(salonDocPath(decision.salonId, 'members', decision.salonId)), titolare)`. Solo quando `decision.ok`.
- [ ] **Step 7:** `cd functions && npx tsc --noEmit -p .` (o `npm run build`) → nessun errore; `npx vitest run functions/src/piano` → verde.
- [ ] **Step 8: Commit** `fix(team): acceptInvite aggiunge il titolare a members se manca`.

### Task 2: Testi d'invito in Team (app)

**Files:**
- Modify: `src/pages/ProPage.tsx` (~311 pulsante, ~336-341 foglio)
- Modify: `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` (chiavi nuove vicino a `teamAnnullaInvito`)
- Test: `src/pages/ProPage.test.tsx`

**Interfaces:**
- Produces: chiavi `teamInvitaPersona`, `teamInvitaTitolo`, `teamInvitaEmail`, `teamInvitaInvia`.

- [ ] **Step 1:** In `ProPage.test.tsx` sostituisci ogni nome `'Invita nuovo collaboratore'` con `'Invita una persona'`; aggiungi un test `in inglese il pulsante e il foglio sono tradotti` che con lingua `en` trova `button 'Invite someone'`, lo apre e trova `form 'Invite'`, l'input `Email` e il pulsante `Send` (usa il modo con cui gli altri test della cartella impostano la lingua; cercare `LinguaProvider`/`lingua` nei test vicini).
- [ ] **Step 2:** `npx vitest run --dir src src/pages/ProPage.test.tsx` → FAIL.
- [ ] **Step 3:** Aggiungi le quattro chiavi nei tre file con le frasi delle Global Constraints; in `ProPage.tsx` usa `frasi.teamInvitaPersona` per il pulsante, `frasi.teamInvitaTitolo` per `title` del `Dialog` e `aria-label` del form, `frasi.teamInvitaEmail` per `label` dell'`Input`, `frasi.teamInvitaInvia` per il tasto.
- [ ] **Step 4:** `npx vitest run --dir src src/pages/ProPage.test.tsx src/i18n` → PASS.
- [ ] **Step 5: Commit** `fix(team): «Invita una persona» e foglio d'invito tradotto`.

### Task 3: Verifica sull'emulatore (la fa la sessione, non un implementatore)

**Files:**
- Create: `QA-tests/.qa-catalog/verify-basse-team.cjs` (sul modello di `verify-team-inviti.cjs` e `verify-team-ruoli.cjs`)

- [ ] Server (funzioni compilate su `demo-groomly`, account `team-…`): salone con `pro/main` Salone attivo e senza `members/<titolare>`; invito scritto con l'admin come `createInvite`; accettazione → `members/<titolare>` creato con `role: 'titolare'`; `openInviteExpiries`/posti invariati per il titolare; secondo invito accettato non riscrive il titolare.
- [ ] Browser a 320/360/390 px: Team del titolare con «Invita una persona» in una riga (misurata) e in inglese «Invite someone»/foglio tradotto; invito scaduto → testo «scaduto», «Vai alla Home», nessun «[400]»; dopo l'accettazione nessun «Salvataggio non riuscito» né «Dati non aggiornati» per 10 s; Listino del collaboratore senza Gestione/Aggiorna prezzi/Gestisci; «Chi lo fa» nel nuovo appuntamento del titolare mostra il titolare.
- [ ] Screenshot in `QA-tests/results/basse-team/`; commit dello script.
