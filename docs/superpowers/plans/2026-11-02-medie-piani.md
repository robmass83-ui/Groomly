# Medie «Piani» (audit 8, 10, 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** I piani scaduti si chiudono da soli (collaboratori fuori), il titolare vede un avviso per piano in grazia o disdetto, e chi non ha Salone non finisce sulla pagina Team con testi sbagliati.

**Architecture:** Una funzione pura in `src/lib/abbonamento.ts` decide l'avviso dallo `StatoPiano`; la usano scheda e pagina Abbonamento. Il controllo orario `chiudiProveScadute` sceglie i piani da chiudere con una funzione pura che riusa `statoPiano`. Il rimando di `/impostazioni/pro` sta in `ProOTeam` (`src/app/router.tsx`).

**Tech Stack:** TypeScript, React (Vite), Firebase Functions v2 + firebase-admin, vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-medie-piani-design.md`

## Global Constraints

- Mai toccare i dati di produzione: prove solo sugli emulatori `demo-groomly`.
- Test dalla radice: `npx vitest run <file> --exclude '.claude/**'`. Suite completa con `--exclude '.claude/**'`; fallimento noto e non correlato: `src/lib/driveInvio.test.ts`.
- Testo italiano fissato dalla spec: «Pagamento non riuscito · aggiorna il pagamento su Google Play»; «Disdetto · attivo fino al <data>». Link: `https://play.google.com/store/account/subscriptions`. Tre lingue it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`).
- Avviso solo al titolare.
- Un piano senza scadenza (omaggi, VIP, manuali senza data) non si chiude mai. Chiusura = `scriviPiano(campiBase(true), adesso)` come le prove.
- Nessun cambio alle regole Firestore.
- Commenti brevi in italiano, nello stile del file.

## Review Focus

1. Piano Salone omaggio/VIP (`scadeIl: null`) → mai chiuso dal controllo. Test nel Task 1.
2. Piano `fonte: 'play'` `attivo` con `scadeIl` passata → chiuso (stessa regola dell'app, che già lo mostra Go). Test nel Task 1.
3. Data `scadeIl` illeggibile → non chiuso (l'app lo tratta come senza scadenza). Test nel Task 1.
4. Plus in prova con la data passata → si chiude ancora come prima (comportamento esistente invariato). Test nel Task 1.
5. Socio/collaboratore di un Salone in grazia → nessun avviso; Go → nessun avviso. Test nel Task 2.

---

### Task 1: Il controllo orario chiude ogni piano scaduto (audit 10)

**Files:**
- Modify: `functions/src/piano/chiudiProve.ts`
- Modify: `functions/src/piano/scriviPiano.ts` (nuova funzione pura accanto a `documentoChiuso`)
- Test: `functions/src/piano/piano.test.ts` (pura), `functions/src/piano/chiudiProve.test.ts` (nuovo, `firestoreFinto.testutil` — vedi l'uso in testa al file; estendilo al minimo se manca `collectionGroup` o `where(…, 'in', …)`)

**Interfaces:**
- Produces: `pianoScaduto(attuale: CampiPiano, adesso: Date): DocumentoPiano | null` in `scriviPiano.ts` — restituisce `scriviPiano(campiBase(true), adesso)` quando `statoPiano(attuale, adesso)` (da `src/lib/piano.ts`) dà `stato === 'scaduto'` per un documento con stato `attivo | prova | grazia | disdetto` e `scadeIl` leggibile; altrimenti `null`. Qualunque `fonte`, compresa `play`. `documentoChiuso` resta (usata altrove? se non più usata, sostituiscila con `pianoScaduto` e aggiorna i suoi test).
- `chiudiProveScadute(adesso?: Date): Promise<number>` stessa firma; legge `collectionGroup('pro').where('stato', 'in', ['attivo', 'prova', 'grazia', 'disdetto'])`, solo documenti `main`.

- [ ] **Step 1: Test che falliscono.** In `piano.test.ts`, `describe('pianoScaduto')` con `adesso = new Date('2026-11-02T10:00:00.000Z')` e una data passata `'2026-11-01T10:00:00.000Z'`:
  - Salone `grazia` `fonte: 'play'` data passata → `{ piano: 'base', stato: 'scaduto', enabled: false, provaUsata: true }` (`toMatchObject`).
  - Salone `disdetto` data passata → chiuso; Plus `attivo` `fonte: 'play'` data passata → chiuso; Plus `prova` data passata → chiuso.
  - Salone `grazia` data futura → `null`; Salone `attivo` `fonte: 'omaggio'` `scadeIl: null` → `null`; Salone `attivo` `fonte: 'manuale'` `scadeIl: null` → `null`; `scadeIl: 'mah'` → `null`; già `scaduto` → `null`.
  In `chiudiProve.test.ts`: tre documenti `salons/a/pro/main` (Salone grazia passato), `salons/b/pro/main` (omaggio senza data), `salons/c/pro/main` (prova passata) → `chiudiProveScadute(adesso)` restituisce `2`; `a` ha `enabled: false`, `stato: 'scaduto'`, `updatedAt` = `adesso.toISOString()`; `b` invariato.
- [ ] **Step 2: Lancia e verifica che falliscono** — `npx vitest run functions/src/piano/piano.test.ts functions/src/piano/chiudiProve.test.ts --exclude '.claude/**'` — FAIL.
- [ ] **Step 3: Implementa** `pianoScaduto` e usala in `chiudiProveScadute`. Un commento di una riga: stessa regola dell'app, i piani senza data non scadono.
- [ ] **Step 4: Lancia** gli stessi test + `cd functions && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit** — `fix: il controllo orario chiude ogni piano scaduto e spegne l'accesso dei collaboratori`

---

### Task 2: Avviso per piano in grazia o disdetto (audit 8)

**Files:**
- Modify: `src/lib/abbonamento.ts` (funzione pura)
- Modify: `src/components/abbonamento/SchedaAbbonamento.tsx`, `src/pages/AbbonamentoPage.tsx`
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` (nuove frasi `abbGrazia`, `abbGraziaLink`, `abbDisdetto` con `{{data}}`)
- Test: `src/lib/abbonamento.test.ts`, `src/pages/AbbonamentoPage.test.tsx`

**Interfaces:**
- Produces: `avvisoPiano(stato: StatoPiano, titolare: boolean): { tipo: 'grazia' } | { tipo: 'disdetto'; fine: Date } | null` — `null` se non titolare, se `stato.livello === 'base'`, o se lo stato non è `grazia`/`disdetto`; `disdetto` senza `scadeIl` → `null`.

- [ ] **Step 1: Test che falliscono.**
  - `abbonamento.test.ts`: `avvisoPiano` con `statoPiano({ piano: 'salone', stato: 'grazia', fonte: 'play', scadeIl: <futura> }, adesso)` e `titolare: true` → `{ tipo: 'grazia' }`; stesso con `titolare: false` → `null`; Plus `disdetto` con data futura → `{ tipo: 'disdetto', fine: <quella data> }`; Plus `attivo` → `null`; Go → `null`; `disdetto` con data passata (livello base) → `null`.
  - `AbbonamentoPage.test.tsx`: con `usePiano` simulato in grazia (titolare) la pagina mostra «Pagamento non riuscito» e un link con `href` `https://play.google.com/store/account/subscriptions`; in disdetto mostra «Disdetto · attivo fino al» con la data. Segui i mock già presenti nel file.
- [ ] **Step 2: Lancia e verifica che falliscono** — `npx vitest run src/lib/abbonamento.test.ts src/pages/AbbonamentoPage.test.tsx --exclude '.claude/**'` — FAIL.
- [ ] **Step 3: Implementa.** Scheda: con avviso, la seconda riga della scheda «Il tuo piano» mostra il testo breve dell'avviso al posto del nome del piano (colore leggibile già usato per la seconda riga). Pagina Abbonamento: una riga sopra le schede, con il link Play per la grazia. Il titolare si ricava come nelle Impostazioni (ruolo dell'account dalla sessione: `useSession`, ruolo diverso da `socio`/`collaboratore`). Data in formato breve nella lingua dell'app (usa le funzioni di data già presenti in `src/i18n` o `toLocaleDateString` con la lingua corrente).
- [ ] **Step 4: Lancia** gli stessi test + `src/components/abbonamento/*.test.tsx` + `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** — `feat: avviso per piano in grazia o disdetto`

---

### Task 3: `/impostazioni/pro` e pagina Team (audit 11)

**Files:**
- Modify: `src/app/router.tsx` (`ProOTeam`)
- Modify: `src/pages/ProPage.tsx` (titolo della scheda del piano), `src/i18n/it.ts`, `en.ts`, `es.ts` (frase per «Piano Salone» e testo di `proAccendi` che parla del Salone)
- Test: `src/pages/ProPage.test.tsx`, test del router se esiste uno per `ProOTeam` (altrimenti in `ProPage.test.tsx` o un nuovo `src/app/router.proOTeam.test.tsx`)

**Interfaces:**
- Consumes: `isOperator` (già in `ProPage.tsx`), `haAccesso(piano.stato, 'team')`.

- [ ] **Step 1: Test che falliscono.**
  - `ProOTeam` per un titolare Go o Plus non operatore → porta a `/impostazioni/abbonamento`; per l'operatore senza Salone → mostra ancora `ProPage`; con Salone → `/impostazioni/team` (invariato).
  - `ProPage` con accesso Salone attivo → la scheda dice «Piano Salone» e non «Piano Plus».
- [ ] **Step 2: Lancia e verifica che falliscono** — FAIL.
- [ ] **Step 3: Implementa.** `ProOTeam`: con Salone → team; operatore → `ProPage`; altrimenti `<Navigate to="/impostazioni/abbonamento" replace />` (il ramo `mostraPiani` diventa inutile: toglilo se non serve più). In `ProPage` usa la nuova frase per il titolo; aggiorna `proAccendi` in it/en/es perché parli del piano Salone. Non cambiare la chiave `impPiano` se è usata altrove con il senso «Plus» (controlla con grep).
- [ ] **Step 4: Lancia** `npx vitest run src/pages/ProPage.test.tsx <test router> --exclude '.claude/**'` + `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** — `fix: chi non ha Salone va alla pagina Abbonamento; la pagina Team dice «Piano Salone»`

---

### Task 4: Verifica sull'emulatore, audit, PROGRESS

**Files:**
- Create: `QA-tests/.qa-catalog/verify-piani.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (punti 8, 10, 11 «— **risolto** (2 novembre 2026, ramo `fix/medie-piani`, spec `docs/superpowers/specs/2026-11-02-medie-piani-design.md`). <cosa>. Verifica: `QA-tests/.qa-catalog/verify-piani.cjs`.»), `PROGRESS.md`

- [ ] **Step 1:** `cd functions && npx tsc`; script sul modello di `QA-tests/.qa-catalog/verify-prenotazioni-online.cjs` (funzioni compilate, emulatori già accesi su 8080/9099, account e saloni di prova propri): (a) Salone in grazia con data passata + collaboratore attivo → `chiudiProveScadute` → `pro/main.enabled === false`; (b) con le regole dell'emulatore, il collaboratore (client SDK autenticato) non legge più `salons/<id>/dogs` (protetta da `canUse`; non usare `settings/main`, che resta leggibile con `accountSalonIs`) → permesso negato, mentre prima della chiusura la lettura riusciva; (c) omaggio Salone senza data → invariato.
- [ ] **Step 2:** browser (Playwright, app `--mode emu` su 5173): titolare Salone in grazia → scheda in Impostazioni e pagina Abbonamento con l'avviso; titolare Go che apre `/impostazioni/pro` → arriva su `/impostazioni/abbonamento`. Screenshot in `QA-tests/results/piani/`.
- [ ] **Step 3:** suite completa — unico fallimento ammesso `src/lib/driveInvio.test.ts`.
- [ ] **Step 4:** aggiorna audit e PROGRESS (voce «Fatto» con deploy `chiudiProve` + APK da fare; «Prossimo passo» → medie «Team e ruoli» 12-17), commit `docs: medie «Piani» 8, 10, 11 verificate e segnate risolte`.
