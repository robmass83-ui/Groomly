# Tre piccole decisioni dopo A7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scheda del piano a tutta riga per il collaboratore; uscita dalla lista d'attesa sempre possibile dal link; membro tolto dal salone con l'app aperta che riparte nel suo salone.

**Architecture:** Tre ritocchi indipendenti: uno stile in `SettingsPage`, una condizione spostata in `confermaAttesaPer` più un pulsante nella pagina pubblica, una rilettura dell'account in `StaffLock` che riusa `dopoCambioSalone` di A7.

**Tech Stack:** React + TypeScript, Firebase Functions v2, pagina pubblica in JS puro (`hosting/s/pagina.js`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-piccole-decisioni-dopo-a7-design.md`

## Global Constraints
- Solo emulatore / Firestore finti nei test; mai dati veri.
- Testi esistenti, da non cambiare: `t.offertaFinita` «Questa offerta non è più disponibile. Per prenotare contatta il salone.», `t.esco` (pulsante «Esci dalla lista» e traduzioni già presenti), `t.uscito` «Sei uscito dalla lista.», `t.ko`; «Il titolare ha spento il piano. I dati non sono persi.» (`frasi.sospesoDettaglio`).
- Con la lista d'attesa spenta solo `esci` passa; `leggi`, `conferma`, `rifiuta`, `resta` restano `{ ok: false, errore: 'spento' }`.
- `StaffLock` rilegge l'account **al massimo una volta** per ogni passaggio a «sospeso» (niente loop di richieste).

## Review Focus
1. Pagina pubblica: doppio tocco su «Esci dalla lista» → una sola chiamata (pulsante disabilitato durante l'invio). → test Task 2.
2. `StaffLock` con il piano spento dal titolare ma member ancora attivo: nessuna rilettura, messaggio di oggi. → test Task 3.
3. `StaffLock` con rilettura fallita (rete): messaggio di oggi, nessun crash, nessun nuovo tentativo a ripetizione. → test Task 3.
4. `esci` con token valido ma iscritto già uscito, lista spenta: risponde `uscito` senza scrivere. → test Task 2.
5. Titolare: la griglia delle scorciatoie resta identica a oggi. → test Task 1.

---

### Task 1: Scheda «Il tuo piano» a tutta riga senza Incassi

**Files:** Modify `src/pages/SettingsPage.tsx:~866-886`; Test `src/pages/SettingsPage.test.tsx`

- [ ] **Step 1: test che falliscono:** da collaboratore il link/scheda del piano (`SchedaAbbonamento`, trovarlo come fanno i test esistenti) ha stile `grid-column: 1 / -1`; da titolare non ce l'ha.
- [ ] **Step 2:** eseguire il test (controllare se `SettingsPage.test.tsx` va con `--config vitest.slow.config.ts`) → FAIL.
- [ ] **Step 3:** `SchedaAbbonamento` riceve lo stile con `gridColumn: '1 / -1'` quando `!vedeIncassi(account?.role)`.
- [ ] **Step 4:** test → PASS; `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: la scheda del piano del collaboratore occupa tutta la riga`.

### Task 2: Uscire dalla lista d'attesa anche quando è spenta

**Files:** Modify `functions/src/piano/confermaAttesa.ts:~60-80`, `hosting/s/pagina.js:~1166-1240`; Test `functions/src/piano/confermaAttesa.test.ts`, `hosting/s/paginaAttesa.test.ts`

- [ ] **Step 1: test che falliscono:**
  - `confermaAttesa.test.ts` (salone con lista `'spento'`, come il test esistente ~261): `esci` → `{ ok: true, esito: 'uscito' }` e iscritto `attivo: false`; iscritto già `attivo: false` → `uscito` senza scritture; `leggi` e `conferma` → `{ ok: false, errore: 'spento' }`; token sconosciuto con lista spenta e `esci` → `{ ok: false, errore: 'token' }`.
  - `paginaAttesa.test.ts`: pagina con `attesa: false` e `?attesa=<token>` → testo `offertaFinita` e un pulsante «Esci dalla lista»; il click chiama `confermaAttesa` con `azione: 'esci'` una volta (due click → una chiamata) e poi mostra «Sei uscito dalla lista.»; risposta non valida → `t.ko` e pulsante di nuovo attivo. Stessa cosa quando una risposta `{ ok: false, errore: 'spento' }` arriva dopo un'azione.
- [ ] **Step 2:** `npx vitest run functions/src/piano/confermaAttesa.test.ts hosting/s/paginaAttesa.test.ts` → FAIL.
- [ ] **Step 3:** server: il controllo `listaAttesaAccesa` vale per tutte le azioni tranne `esci` (che continua a cercare l'offerta e a fare la transazione di oggi). Pagina: una funzione `offertaFinitaConUscita()` (nome a scelta) usata nei due punti che oggi chiamano `messaggioLink(t.offertaFinita, true)`; il token è già validato col formato di oggi prima di mostrare il pulsante (token non valido → `t.linkKo` come oggi).
- [ ] **Step 4:** test → PASS; `cd functions && npx tsc -p .`.
- [ ] **Step 5:** commit `fix: dal link dell'offerta si esce dalla lista d'attesa anche quando è spenta`.

### Task 3: Il membro tolto dal salone riparte nel suo con l'app aperta

**Files:** Modify `src/components/AccessoSospeso.tsx`; Test `src/components/AccessoSospeso.test.tsx`

**Interfaces:** Consumes `reloadSignedInAccount(): Promise<LocalAccount | null>` (`src/data/firebase/client.ts`) e `dopoCambioSalone(uid: string)` (`src/data/local/cambioSalone.ts`, leggerne la firma esatta).

- [ ] **Step 1: test che falliscono** in `AccessoSospeso.test.tsx`:
  - accesso con il proprio member `revocato` (piano spento o acceso) e `reloadSignedInAccount` che restituisce `{ ...account, salonId: uid, role: 'titolare' }` → `dopoCambioSalone` chiamato una volta con `uid`, il messaggio «Il titolare ha spento il piano…» non compare (mostra l'attesa nel frattempo).
  - piano spento, member `attivo` → messaggio di oggi, `reloadSignedInAccount` non chiamato.
  - member revocato e `reloadSignedInAccount` che rifiuta → messaggio di oggi, una sola chiamata anche dopo altri aggiornamenti dell'accesso.
  - member revocato e account riletto che punta ancora allo stesso salone → messaggio di oggi, `dopoCambioSalone` non chiamato.
- [ ] **Step 2:** `npx vitest run src/components/AccessoSospeso.test.tsx` → FAIL.
- [ ] **Step 3:** in `StaffLock`: «tolto» = `access` presente e nessun member con `uid` e `status === 'attivo'`. Se `accessoSospeso` **oppure** «tolto»: alla prima volta rileggere l'account (ref per non ripetere); se `salonId !== salonId attuale` → `dopoCambioSalone(uid)` e mostrare `AttesaRiga`; in tutti gli altri esiti, il comportamento di oggi. Nota: oggi con il piano acceso e member revocato `accessoSospeso` è falso e la persona continua a vedere il salone; con questa modifica anche quel caso riparte nel suo salone se il server l'ha già riportata.
- [ ] **Step 4:** test → PASS; `npx vitest run src` (noto: `src/lib/driveInvio.test.ts`); `npx tsc --noEmit -p .`.
- [ ] **Step 5:** commit `fix: il membro tolto dal salone riparte nel suo anche con l'app aperta`.

### Task 4 (coordinatore): verifica e rilascio
- [ ] Emulatore: `confermaAttesaPer` compilata con lista spenta (`esci` → uscito); pagina pubblica nel browser con lista spenta: pulsante e uscita; app: collaboratore con app aperta, `revokeMember` dal titolare → riparte nel suo salone.
- [ ] PROGRESS aggiornato, merge in `main`, deploy `confermaAttesa` + hosting, release APK.
