# A2 — Prova gratis solo a chi non ha mai avuto Plus o Salone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La prova gratis da sé è concessa (app e server) solo a un salone oggi su Go senza tracce di un piano superiore; il server ricorda d'ora in poi ogni piano superiore; l'operatore può sempre avviare la prova.

**Architecture:** Regola pura `provaConcessa(doc, adesso)` in `src/lib/piano.ts` (già importata dalle functions per `statoPiano`). Il server la usa in `decisioneProva`; `scriviPiano` segna `provaUsata` sui piani `pro`/`salone`; `campiAzione('prova')` dell'operatore non controlla più `provaUsata`. L'app espone `provaConcessa` da `usePiano` e la usa in vetrina e paywall.

**Tech Stack:** React 18 + Vitest/Testing Library; Cloud Functions TypeScript (firebase-admin); test functions eseguiti dalla radice con `npx vitest run`.

**Spec:** `docs/superpowers/specs/2026-11-01-a2-prova-gratis-solo-a-chi-non-ha-mai-avuto-plus-design.md`

## Global Constraints
- Ramo `fix/a2-prova-solo-a-chi-non-ha-mai-avuto-plus`.
- Prova da sé concessa solo se `statoPiano(doc, adesso).livello === 'base'` e nessuna traccia di piano superiore: `provaUsata !== true`, `piano` non `'pro'`/`'salone'`, `fonte` non `'play'`/`'omaggio'`/`'manuale'`/`'prova'`. Documento assente → concessa.
- Solo il titolare avvia la prova da sé (controlli di oggi invariati).
- L'operatore può sempre avviare la prova; le altre azioni operatore invariate.
- Nessuna modifica ai dati esistenti.
- Messaggio di rifiuto del server: `'Prova non disponibile'` (sostituisce `'Prova già usata'`); `'Accesso negato'` resta per chi non è titolare.
- Commit con riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Salone in grazia (`stato: 'grazia'`, `scadeIl` futuro, mai fatto la prova): niente prova, né in app né sul server → test in Task 1 e Task 2.
2. Omaggio senza scadenza (`fonte: 'omaggio'`, `scadeIl: null`): niente prova → test in Task 1 e Task 2.
3. Ex-Plus pagato tornato Go (`piano: 'pro'`, `stato: 'scaduto'`, `fonte: 'play'`, `provaUsata` assente): niente prova → test in Task 1.
4. Omaggio riportato a Go dall'operatore dopo questa modifica: `campiBase` conserva `provaUsata: true` scritto dall'omaggio → niente prova da sé; l'operatore può ancora avviarla → test in Task 2.
5. Go puro senza documento `pro/main` o con `piano: 'base'` senza tracce: la prova resta → test in Task 1 e Task 3.

---

### Task 1: La regola condivisa `provaConcessa`

**Files:**
- Modify: `src/lib/piano.ts` (nuova funzione esportata)
- Test: `src/lib/piano.test.ts`

**Interfaces:**
- Produces: `export function provaConcessa(doc: ProMain | undefined, adesso: Date): boolean`.

- [ ] **Step 1: Test** `'prova concessa solo a chi è su Go senza tracce di un piano superiore'` con `ADESSO` fisso:
  - vero: `undefined`; `{ piano: 'base', stato: 'scaduto', fonte: null }`; `{}`.
  - falso: `{ piano: 'pro', stato: 'attivo', fonte: 'play', scadeIl: <futuro> }`; `{ piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: <futuro>, provaUsata: true }`; `{ piano: 'pro', stato: 'grazia', fonte: 'play', scadeIl: <futuro> }`; `{ piano: 'pro', stato: 'disdetto', fonte: 'play', scadeIl: <futuro> }`; `{ piano: 'pro', stato: 'attivo', fonte: 'omaggio', scadeIl: null }`; `{ piano: 'salone', stato: 'attivo', fonte: 'manuale' }`; `{ piano: 'pro', stato: 'scaduto', fonte: 'play' }` (ex-Plus pagato); `{ piano: 'base', stato: 'scaduto', fonte: null, provaUsata: true }` (omaggio riportato a Go); `{ piano: 'pro', stato: 'prova', fonte: 'prova', scadeIl: <passato> }`.
- [ ] **Step 2: Esegui** `npx vitest run src/lib/piano.test.ts` → FAIL (funzione assente).
- [ ] **Step 3: Implementa** `provaConcessa` in `src/lib/piano.ts`.
- [ ] **Step 4: Esegui** → PASS; `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `fix(A2): una sola regola per la prova gratis`

### Task 2: Il server rispetta la regola e ricorda i piani superiori

**Files:**
- Modify: `functions/src/piano/scriviPiano.ts` (`decisioneProva` ~105, `scriviPiano` ~28, `campiAzione` ~124)
- Modify: `functions/src/piano/avviaProva.ts:20` (passa `adesso`)
- Test: `functions/src/piano/piano.test.ts` (aggiorna i casi `'la seconda prova risponde Prova già usata'`)

**Interfaces:**
- Consumes: `provaConcessa` da Task 1 (`import ... from '../../../src/lib/piano'`, come gli altri import da `src/lib` nelle functions).
- Produces: `decisioneProva(ruolo: string, documento: ProMain | undefined, adesso: Date): { ok: true } | { ok: false; message: string }` — `'Accesso negato'` se non titolare, `'Prova non disponibile'` se `!provaConcessa(documento, adesso)`.

- [ ] **Step 1: Test** in `piano.test.ts`:
  - `'la prova da sé è rifiutata a chi ha o ha avuto un piano superiore'` → `decisioneProva('titolare', <grazia>, adesso)`, `<omaggio senza scadenza>`, `<ex-Plus pagato scaduto>`, `{ provaUsata: true }` → `{ ok: false, message: 'Prova non disponibile' }`; `decisioneProva('titolare', undefined, adesso)` → `{ ok: true }`; `decisioneProva('collaboratore', undefined, adesso)` → `{ ok: false, message: 'Accesso negato' }`.
  - `'un piano Plus o Salone scritto lascia il segno della prova'` → `scriviPiano(campiOmaggio('pro'), adesso).provaUsata === true`, idem `campiOmaggio('salone')`, `campiProva(adesso)`, `campiBypass({ piano: 'pro', ... })` (forma come nei test esistenti); `scriviPiano(campiBase(false), adesso).provaUsata` resta `false`.
  - `'l’operatore avvia la prova anche se è già stata usata'` → `campiAzione('prova', adesso, true)` restituisce i campi della prova (`stato: 'prova'`, `fonte: 'prova'`), non un messaggio.
  - Sostituisci le attese di `'la seconda prova risponde Prova già usata'` con quelle nuove (il caso `campiAzione('prova', adesso, true)` ora non è più un rifiuto).
- [ ] **Step 2: Esegui** `npx vitest run functions/src/piano/piano.test.ts` → i nuovi FAIL.
- [ ] **Step 3: Implementa**: `decisioneProva` con `provaConcessa`; `avviaProva.ts` chiama `decisioneProva(account.role, snap.data() as ProMain | undefined, adesso)`; in `scriviPiano`, `provaUsata: true` quando `campi.piano` è `'pro'` o `'salone'`, altrimenti il valore di `campi.provaUsata` come oggi; `campiAzione('prova')` restituisce sempre `campiProva(adesso)`.
- [ ] **Step 4: Esegui** → PASS; poi `npx vitest run` alla radice (noto: `src/lib/driveInvio.test.ts`) e `cd functions && npx tsc --noEmit`.
- [ ] **Step 5: Commit** `fix(A2): il server dà la prova solo a chi non ha mai avuto Plus`

### Task 3: L'app mostra «Prova gratis» solo se concessa

**Files:**
- Modify: `src/hooks/usePiano.tsx` (campo `provaConcessa` in `PianoValore`, default `false`; calcolato con `provaConcessa(comePro(pro), adesso)`; `mostraProva` a riga ~201 = `piano.mostraPiani && piano.provaConcessa`)
- Modify: `src/components/abbonamento/Vetrina.tsx:91` (`provaDisponibile = piano === 'plus' && stato.provaConcessa && (ruolo === undefined || ruolo === 'titolare')`)
- Test: `src/hooks/usePiano.test.tsx` e un test della vetrina (nuovo `src/components/abbonamento/Vetrina.test.tsx` sul modello di `BlocchiPiano.test.tsx`, o il test della pagina Abbonamento se monta già la vetrina)

**Interfaces:**
- Consumes: `provaConcessa` (Task 1).
- Produces: `PianoValore.provaConcessa: boolean`.

- [ ] **Step 1: Test**:
  - `usePiano`: `'provaConcessa segue la regola: Go puro sì, grazia e omaggio no'` → con `pro/main` assente → `true`; con grazia → `false`; con omaggio → `false`.
  - Vetrina: `'in grazia la vetrina di Plus non offre la prova gratis'` → nessun testo/pulsante «Prova gratis»/`abbTrentaGiorni`, c'è «Abbonati»; `'un Go puro vede la prova gratis'` → il pulsante c'è.
- [ ] **Step 2: Esegui** i due file di test → FAIL.
- [ ] **Step 3: Implementa** come in Files.
- [ ] **Step 4: Esegui** → PASS; `npx vitest run` (noto: `driveInvio`), `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 5: Commit** `fix(A2): l'app offre la prova gratis solo a chi può averla`

### Task 4: Verifica, audit, merge, release (controller)

- [ ] **Step 1:** Verifica sugli emulatori: `avviaProvaPer` compilata chiamata direttamente (le callable in emulatore danno INTERNAL) su plus41 (grazia), plus44 (omaggio), un ex-Plus pagato e un Go puro → solo il Go puro passa; nel browser la vetrina di plus41/plus44 non offre la prova, quella di un Go puro sì.
- [ ] **Step 2:** Solo se tutto passa: A2 «risolto» nell'audit, commit `docs: A2 verificato e chiuso`, merge in `main`, deploy functions `avviaProva`, `impostaPianoManuale` (e le altre che importano `scriviPiano`, es. `chiudiProve`) con `FUNCTIONS_DISCOVERY_TIMEOUT=60`, release APK (memoria `release-apk-automatica`).
