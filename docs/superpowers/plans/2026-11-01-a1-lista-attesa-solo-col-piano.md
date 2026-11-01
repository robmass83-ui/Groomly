# A1 — La lista d'attesa funziona solo col piano — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Iscrizione, conferma delle offerte e pagina pubblica considerano la lista d'attesa accesa solo se il piano del salone la comprende; chi apre un'offerta vecchia legge che non è più disponibile.

**Architecture:** Una funzione pura `listaAttesaAccesa(servizi, pro, adesso)` accanto a `serviziPerPiano` in `functions/src/piano/inviaCoda.ts`, usata dai tre punti del server (che leggono `salons/<id>/pro/main`). Sulla pagina pubblica (`hosting/s/pagina.js`) un testo nuovo per il link di un'offerta con la lista ferma.

**Tech Stack:** Cloud Functions (TypeScript, firebase-admin), Vitest con Firestore in memoria (pattern dei test esistenti), JS della pagina pubblica testato con Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-01-a1-lista-attesa-solo-col-piano-design.md`

## Global Constraints
- Ramo `fix/a1-lista-attesa-solo-col-piano`.
- Criterio unico «lista accesa»: `serviziAccesi(serviziPerPiano(settings.serviziEmail, pro, adesso)).includes('attesa')` (stesso di `functions/src/piano/giraCoda.ts:387`).
- Con la lista ferma: iscrizione → `{ ok: false, errore: 'spento' }`; conferma e lettura offerta → `{ ok: false, errore: 'spento' }` senza scritture; pagina pubblica → `attesa: false`.
- Nessun dato cancellato o spento in Firestore.
- Piano Plus (`piano: 'pro'`) o Salone (`piano: 'salone'`) attivo, in prova o in grazia: tutto come oggi.
- Testi della pagina pubblica in it/en/es.
- Commit con riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Salone senza documento `pro/main` (mai avuto un piano) con `serviziEmail.attesa` acceso: lista ferma → test in Task 1.
2. Prova Plus scaduta (`stato: 'prova'`, `scadeIl` nel passato): lista ferma → test in Task 1.
3. Plus in grazia (`stato: 'grazia'`, `scadeIl` nel futuro): lista attiva → test in Task 1.
4. Offerta vecchia aperta con la lista ferma: nessuna visita, nessuna scheda cane, iscritto intatto → test in Task 1.
5. Link `?attesa=<token>` sulla pagina pubblica con `attesa: false`: messaggio «offerta non più disponibile», nessuna chiamata a `confermaAttesa` → test in Task 2.

---

### Task 1: Il server accende la lista solo col piano

**Files:**
- Modify: `functions/src/piano/inviaCoda.ts` (nuova `listaAttesaAccesa`), test in `functions/src/piano/inviaCoda.test.ts`
- Modify: `functions/src/piano/iscrivitiAttesa.ts:50-51`, test `functions/src/piano/iscrivitiAttesa.test.ts`
- Modify: `functions/src/piano/confermaAttesa.ts:59-60`, test `functions/src/piano/confermaAttesa.test.ts`
- Modify: `functions/src/piano/paginaPubblica.ts:~45-66` (usa il `pro` già letto a riga 45 per `attesa`)

**Interfaces:**
- Produces: `export function listaAttesaAccesa(servizi: unknown, pro: ProMain | undefined, adesso: Date): boolean` = `serviziAccesi(serviziPerPiano(servizi, pro, adesso)).includes('attesa')`.

- [ ] **Step 1: Test di `listaAttesaAccesa`** in `inviaCoda.test.ts` (`servizi = { attesa: { modo: 'manuale' } }`, `ADESSO` fisso):
  - `'lista d’attesa: accesa solo col piano che la comprende'` → `true` per `{ piano: 'pro', stato: 'attivo' }`, `{ piano: 'salone', stato: 'attivo' }`, `{ piano: 'pro', stato: 'grazia', scadeIl: <futuro> }`, `{ piano: 'pro', stato: 'prova', scadeIl: <futuro> }`; `false` per `undefined`, `{ piano: 'pro', stato: 'prova', scadeIl: <passato> }`, `{ piano: 'pro', stato: 'scaduto' }`, `{ piano: 'pro', stato: 'sospeso' }`, `{ piano: 'base', stato: 'attivo' }`.
  - `'lista d’attesa: spenta nelle impostazioni resta spenta anche con Plus'` → `{ attesa: { modo: 'spento' } }` + Plus attivo → `false`.
- [ ] **Step 2: Test iscrizione** in `iscrivitiAttesa.test.ts`: aggiungi a `salone()` il documento `${BASE}/pro/main` = `{ piano: 'pro', stato: 'attivo' }` di default (così i test esistenti restano validi) con un parametro per cambiarlo o toglierlo. Nuovi test:
  - `'senza un piano con la lista l’iscrizione è spenta e non scrive nulla'` → senza `pro/main` e con `{ piano: 'pro', stato: 'prova', scadeIl: '2026-10-01T00:00:00.000Z' }` → `{ ok: false, errore: 'spento' }`, `elenco(`${BASE}/attesa`)` vuoto.
- [ ] **Step 3: Test conferma** in `confermaAttesa.test.ts`: stesso default Plus in `salone()`. Nuovo test:
  - `'senza un piano con la lista un’offerta vecchia non prenota nulla'` → con `{ piano: 'pro', stato: 'scaduto' }`, `conferma(db, 'conferma')` e `conferma(db, 'leggi')` → `{ ok: false, errore: 'spento' }`; appuntamenti, cani e `attesa/i1` invariati rispetto all'inizio.
- [ ] **Step 4: Esegui** `cd functions && npx vitest run src/piano/inviaCoda.test.ts src/piano/iscrivitiAttesa.test.ts src/piano/confermaAttesa.test.ts` (o il comando dei test functions in `functions/package.json`) → i nuovi test FAIL, gli esistenti PASS.
- [ ] **Step 5: Implementa** `listaAttesaAccesa` e usala nei tre punti; iscrizione e conferma leggono `salons/<salonId>/pro/main` e passano `input.adesso`; la pagina pubblica usa `new Date()` come per le prenotazioni.
- [ ] **Step 6: Esegui** gli stessi test → PASS; poi tutta la suite delle functions, `npx tsc --noEmit` nella cartella functions (o `npm run build` delle functions) e `npx vitest run` alla radice (fallimento noto non correlato: `src/lib/driveInvio.test.ts`).
- [ ] **Step 7: Commit** `fix(A1): la lista d'attesa funziona solo col piano che la comprende`

### Task 2: Pagina pubblica — offerta non più disponibile

**Files:**
- Modify: `hosting/s/pagina.js` (testi it ~73, en ~141, es ~209; `avviaLink` ~1235; `esitoLink` ~1221)
- Test: `hosting/s/paginaAttesa.test.ts` (setup esistente del `describe('la pagina pubblica con la lista d’attesa')`)

**Interfaces:**
- Consumes: l'esito `{ ok: false, errore: 'spento' }` di Task 1 (forma invariata).
- Produces: chiave di testo `offertaFinita` in ogni lingua.

- [ ] **Step 1: Test**:
  - `'un link d’offerta con la lista ferma dice che l’offerta non è più disponibile e non chiama il server'` → pagina con `attesa: false` e URL `?attesa=<token valido>` → compare il testo `offertaFinita` italiano, nessuna `fetch` a `confermaAttesa`.
  - `'se il server risponde spento a un link d’offerta compare lo stesso messaggio'` → `attesa: true`, `confermaAttesa` risponde `{ result: { ok: false, errore: 'spento' } }` (forma delle risposte come negli altri test) → testo `offertaFinita`.
- [ ] **Step 2: Esegui** `npx vitest run hosting/s/paginaAttesa.test.ts` → i nuovi FAIL.
- [ ] **Step 3: Implementa**: aggiungi `offertaFinita`, esattamente:
  - it: `'Questa offerta non è più disponibile. Per prenotare contatta il salone.'`
  - en: `'This offer is no longer available. To book, please contact the salon.'`
  - es: `'Esta oferta ya no está disponible. Para reservar, contacta con el salón.'`
  e usala al posto di `t.listaSpenta` in `avviaLink` (lista ferma) e in `esitoLink` (`errore === 'spento'`). Il modulo d'iscrizione (~1152) resta con `t.listaSpenta`.
- [ ] **Step 4: Esegui** il test → PASS; `npx vitest run` alla radice (noto: `driveInvio`).
- [ ] **Step 5: Commit** `fix(A1): chi apre un'offerta vecchia legge che non è più disponibile`

### Task 3: Verifica, audit, merge, release (controller)

- [ ] **Step 1:** Emulatori con functions (memoria `emulatori-java-credenziale`: le callable danno INTERNAL; usare le funzioni `*Per` compilate direttamente su Firestore emulato, come `ELIMINA_DIRETTO=1` in `scripts/emu/eliminaSalone.mjs`) oppure verifica con script diretti sui dati dell'emulatore.
- [ ] **Step 2:** `/qa-my-app:verify` con criteri: salone Go/prova scaduta con lista accesa → pagina pubblica senza lista, iscrizione rifiutata, offerta vecchia non prenota e il link dice «non più disponibile»; salone Plus attivo → iscrizione e conferma funzionano.
- [ ] **Step 3:** Solo se tutto passa: A1 «risolto» nell'audit, commit `docs: A1 verificato e chiuso`, merge in `main`, deploy functions (`FUNCTIONS_DISCOVERY_TIMEOUT=60`) e hosting. Nessun APK: l'app non cambia (solo server e pagina pubblica).
