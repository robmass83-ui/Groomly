# Beta Fondamenta (A1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fase 1 del programma beta: fonte `beta`, traccia permanente, modello inviti/feedback, `config/globale.piani` con callable operatore, ID fissi, prova self-service spenta, regole.

**Architecture:** Tipi e letture difensive in `src/lib/` (condivisi da app e functions, come `piano.ts`); helper di scrittura in `functions/src/piano/scriviPiano.ts`; callable config in `functions/src/config/`; regole in `firestore.rules` con test sull'emulatore.

**Tech Stack:** TypeScript, React, Firebase Functions v2, Firestore rules, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-beta-fondamenta-design.md`

## Global Constraints
- `salon/shared` mai toccato; VIP (`fonte: 'omaggio'`) invariati.
- Piano, inviti, feedback e config scritti solo da functions; callable solo per `operatoreAutorizzato`.
- `provaSelfService` default **false**; `showPrezziInBeta` default **false**.
- Nessuna interfaccia nuova; `mostraPiani`/`abbonamentiAttivi` restano in radice di `config/globale`.

## Review Focus
1. Documento `pro/main` con fonte sconosciuta o futura → letta come `null`, livello invariato (test in Task 1).
2. Beta con `scadeIl` passata → `chiudiProve` la chiude e la traccia resta (Task 2).
3. Config assente o malformata (`piani` stringa, campi di tipo sbagliato) → default (Task 4).
4. `impostaConfigPiani` con campo sconosciuto o testo troppo lungo → nessuna scrittura (Task 4).
5. Socio o collaboratore che legge l'invito del suo salone → negato (Task 6).

---

### Task 1: Fonte unica e `beta` in `piano.ts`
**Files:** Modify `src/lib/piano.ts`, `functions/src/piano/scriviPiano.ts`, `functions/src/piano/chiudiProve.ts`, `functions/src/piano/impostaPianoManuale.ts`, `src/data/firebase/client.ts:2145`, `src/pages/UsersPage.tsx:108`. Test `src/lib/piano.test.ts` (o file esistente).
**Produces:** `FONTI_PIANO`, `FontePiano` (con `'beta'`), `fonteDi(value: unknown): FontePiano | null`, `TracciaBeta`, `tracciaBetaDi(doc: unknown): TracciaBeta`.
- [ ] Test: `fonteDi('beta') === 'beta'`, `fonteDi('xyz') === null`, `fonteDi(3) === null`; `provaConcessa({piano:'base', stato:'scaduto', fonte:'beta'})` falso; `provaConcessa({piano:'base', exBeta:true})` falso; `statoPiano` beta attiva futura → livello `salone`, passata → `base`; `tracciaBetaDi({exBeta:true, betaPiano:'x', earlyAdopter:'si'})` → `{exBeta:true}`.
- [ ] Implementare; `provaConcessa` falso anche con `exBeta === true`; sostituire le liste scritte a mano con `fonteDi`.
- [ ] `npx vitest run src/lib functions/src/piano` verde; commit.

### Task 2: Helper beta e traccia in `scriviPiano.ts`
**Produces:** `campiBeta(livello: 'pro'|'salone', giorni: number, adesso: Date): CampiPiano` (lancia `RangeError` se giorni non intero o fuori 1–365); `tracciaBeta(livello, adesso: Date, fine: string): Required<Omit<TracciaBeta,'earlyAdopter'>> & { earlyAdopter: true }`.
- [ ] Test: `scriviPiano(campiBeta('salone',30,adesso))` → `{fonte:'beta', stato:'attivo', seatsIncluded:3, seats:3, enabled:true, provaUsata:true, scadeIl: adesso+30g}`; `campiBeta('pro',0,…)` lancia; `pianoScaduto` di una beta passata non contiene chiavi della traccia; `chiudiProveScadute` con doc beta scaduto + traccia → piano base e `exBeta`, `betaPiano`, `earlyAdopter` intatti.
- [ ] Implementare; test verdi; commit.

### Task 3: Modelli inviti, feedback, ID fissi
**Files:** Create `src/lib/betaInvito.ts`, `src/lib/betaFeedback.ts`, `src/lib/idAbbonamenti.ts` + test.
**Produces:** tipi e costanti della sezione Contratti; `invitoBetaDi(doc: unknown): InvitoBeta | null`; `transizioneInvito(da, a): boolean`; `GIORNI_SCADENZA_INVITO = 14`; `PRODOTTI_PLAY`, `OFFERTA_EARLY_ADOPTER = 'early-adopter'`, `ENTITLEMENT = { pro: 'plus', salone: 'salone' }`, `OFFERING_ID = 'groomly_standard'`, `idProdottoRevenueCat(abbonamento, pianoBase)`.
- [ ] Test: transizioni ammesse/negate come da spec; `invitoBetaDi` rifiuta stato o piano sconosciuti; `idProdottoRevenueCat('groomly_plus','mensile') === 'groomly_plus:mensile'`.
- [ ] Implementare; aggiornare `docs/legal/PRIMA-DEI-PAGAMENTI.md` con la tabella ID; commit.

### Task 4: `config/globale.piani` e `impostaConfigPiani`
**Files:** Create `src/lib/configPiani.ts`, `functions/src/config/impostaConfigPiani.ts` + test; modify `functions/src/index.ts` (export `impostaConfigPiani`), `src/data/firebase/client.ts` (`callImpostaConfigPiani`).
**Produces:** `ConfigPiani`, `CONFIG_PIANI_DEFAULT`, `leggiConfigPiani(globale: unknown): ConfigPiani`, `configPianiDopo(attuale: ConfigPiani, modifiche: unknown): ConfigPiani` (lancia `HttpsError('invalid-argument')`), `impostaConfigPianiPer({operatorEmail, emailVerified, admin, modifiche}): Promise<{ok:true; piani: ConfigPiani}>`.
- [ ] Test: default con `undefined`/`{piani:'x'}`/tipi sbagliati; modifica parziale conserva il resto; chiave sconosciuta, testo > 500, chiave SDK > 200, data non ISO → errore; non operatore → «Accesso negato»; operatore scrive `piani` completo (firestore finto).
- [ ] Implementare; commit.

### Task 5: Prova self-service spenta
**Files:** Modify `functions/src/piano/avviaProva.ts`, `src/hooks/usePiano.tsx` + test.
- [ ] Test: `avviaProvaPer` con config assente → `failed-precondition` «Prova non disponibile» e nessuna scrittura; con `piani.provaSelfService: true` scrive la prova; azione operatore `prova` funziona anche con config spenta (test `impostaPianoManuale` esistente o nuovo); `usePiano` → `provaConcessa` falso con config spenta (test hook o funzione pura `provaSelfServiceConcessa(config, doc, adesso)` in `configPiani.ts`).
- [ ] Implementare (lettura `config/globale` nella stessa transazione); commit.

### Task 6: Regole Firestore
**Files:** Modify `firestore.rules`, `src/lib/firestoreRules.emulator.test.ts`.
- [ ] Test: `betaInviti/{s}` read titolare ok, socio/collaboratore/altro salone negato, operatore ok, write negata a tutti; `storico` read solo operatore; `betaFeedback` read operatore, create titolare negata; `betaFeedbackLimiti` tutto negato; `config/globale` write operatore negata.
- [ ] Implementare; `npm run test:rules` verde; commit.

### Task 7: Chiusura
- [ ] `npm test` completo, `npx tsc -p functions` e `npx tsc --noEmit` (o `npm run build`), `npm run test:rules`.
- [ ] `docs/DECISIONI-AUTOMATICHE.md` (sezione A1), `PROGRESS.md`; commit.
