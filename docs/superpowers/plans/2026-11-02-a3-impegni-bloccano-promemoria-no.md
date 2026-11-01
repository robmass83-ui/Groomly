# A3 — Gli impegni bloccano l'orario, i promemoria no — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gli impegni personali tolgono l'orario dalle prenotazioni online (dall'inizio alla fine, un'ora se senza fine), i promemoria no; nel Salone un impegno può non bloccare con un interruttore.

**Architecture:** Due campi facoltativi sugli impegni personali, scritti solo quando servono: `promemoria: true` e `bloccaOnline: false` (assenti = impegno che blocca). Passano per Firestore, copia locale e backup. Sul server `appuntamentoOccupato` (unico punto usato da sito, richieste, conferme, lista d'attesa) li legge. Nell'app il modulo dell'impegno personale fa scegliere tipo e interruttore; agenda e Home distinguono il promemoria.

**Tech Stack:** React 18 + Vitest/Testing Library; Cloud Functions TypeScript; test functions dalla radice (`npx vitest run functions/...`).

**Spec:** `docs/superpowers/specs/2026-11-02-a3-impegni-bloccano-promemoria-no-design.md`

## Global Constraints
- Ramo `fix/a3-impegni-bloccano-promemoria-no`.
- Campi: `promemoria?: true` (solo per i promemoria) e `bloccaOnline?: false` (solo per impegni con l'interruttore spento). Assenti = impegno che blocca. Nessuna riscrittura dei dati esistenti.
- Occupazione: promemoria → niente; impegno con `bloccaOnline: false` → niente; impegno → da `start` a `plannedEnd`, senza `plannedEnd` → `start` + 60 minuti. Le visite normali come oggi.
- L'impegno nuovo richiede l'ora di fine; il promemoria non ha ora di fine.
- Interruttore «Blocca l'orario per le prenotazioni online» solo col piano Salone (`haAccesso(piano.stato, 'team')`), acceso di partenza.
- Gli impegni non entrano mai in contatori, durata della giornata, incassi, statistiche (come oggi).
- Testi in it/en/es.
- Commit con riga finale `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Impegno già esistente senza `plannedEnd` e senza campi nuovi: blocca un'ora → test in Task 2.
2. Promemoria alle 15:00 con una visita alle 15:30: il sito non offre comunque le 15:00 se la visita copre l'intervallo richiesto (solo il promemoria non conta) → test in Task 2.
3. Copia locale e backup non perdono `promemoria`/`bloccaOnline` (andata e ritorno) → test in Task 1.
4. Aprire un impegno vecchio senza fine e salvarlo senza toccare nulla: errore chiaro sulla fine, nessun salvataggio silenzioso → test in Task 3.
5. Fuori dal Salone l'interruttore non compare e un impegno salvato non ha `bloccaOnline` → test in Task 3.

---

### Task 1: I campi nuovi passano per tutte le copie

**Files:**
- Modify: `src/types/models.ts` (`Appointment` ~160-190 e il tipo di scrittura ~196-212: `promemoria?: true`, `bloccaOnline?: false`)
- Modify: `src/lib/firebaseMap.ts` (`appointmentToDoc` ramo personale ~337-348; lettura ramo personale ~400-420)
- Modify: `src/data/local/appointments.ts` (`StoredAppointment`, `appointmentToStored` e `toDomain` rami personale; dove la scrittura di un impegno compone l'oggetto, es. ~348-365)
- Test: `src/lib/firebaseMap.test.ts`, `src/data/local/appointments.test.ts` (o il file di test della copia locale esistente), `src/data/firebase/backupCollect.test.ts`

**Interfaces:**
- Produces: `Appointment.promemoria?: true`, `Appointment.bloccaOnline?: false`; stessi nomi nei documenti Firestore e nella copia locale.

- [ ] **Step 1: Test** `'un promemoria e un impegno che non blocca fanno andata e ritorno'`: per Firestore (`appointmentToDoc` → lettura), per la copia locale (`appointmentToStored` → `toDomain`) e per il backup (`raccogliBackup` → ZIP → `leggiRipristino`, come i test C2 esistenti): `promemoria: true` resta; `bloccaOnline: false` resta; un impegno senza campi non li acquista.
- [ ] **Step 2: Esegui** i tre file → FAIL.
- [ ] **Step 3: Implementa** i campi (scritti solo con quei valori; letti solo se esattamente `true`/`false`).
- [ ] **Step 4: Esegui** → PASS; `npx vitest run` (noto: `src/lib/driveInvio.test.ts`), `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `fix(A3): promemoria e blocco online salvati con l'impegno`

### Task 2: Il server toglie l'orario solo per gli impegni che bloccano

**Files:**
- Modify: `functions/src/piano/postiLiberi.ts` (`appuntamentoOccupato` ~65)
- Test: `functions/src/piano/postiLiberi.test.ts`

**Interfaces:**
- Consumes: i nomi dei campi di Task 1 (sui `DocumentData`).

- [ ] **Step 1: Test**:
  - `'un impegno personale occupa dall’inizio alla fine'` → `{ kind: 'personale', start, plannedEnd: start+2h }` → un occupante `programmato` da `start` a `start+2h`.
  - `'un impegno senza fine occupa un’ora'` → `{ kind: 'personale', start }` → da `start` a `start+60min`.
  - `'promemoria e impegno che non blocca non occupano'` → `{ kind: 'personale', start, promemoria: true }` e `{ kind: 'personale', start, plannedEnd, bloccaOnline: false }` → `[]`.
  - `'il sito non offre l’orario di un impegno e offre quello di un promemoria'` → con `intervalloAncoraLibero` (o `postiLiberiPer` sul Firestore in memoria dei test esistenti): intervallo dentro un impegno → non libero; stesso intervallo con un promemoria → libero.
- [ ] **Step 2: Esegui** `npx vitest run functions/src/piano/postiLiberi.test.ts` → FAIL.
- [ ] **Step 3: Implementa** il ramo `kind === 'personale'` in `appuntamentoOccupato`. Se allineare il controllo «posto già preso» dell'invio offerte (`functions/src/piano/inviaCoda.ts` ~407) costa poche righe e un test, fallo; altrimenti scrivilo nel report.
- [ ] **Step 4: Esegui** → PASS; root `npx vitest run` (noto: driveInvio), `cd functions && npx tsc --noEmit`.
- [ ] **Step 5: Commit** `fix(A3): gli impegni tolgono l'orario dalle prenotazioni online`

### Task 3: Il modulo sceglie impegno o promemoria; agenda e Home li distinguono

**Files:**
- Modify: `src/pages/PersonalAppointmentPage.tsx` (scelta tipo, fine obbligatoria per l'impegno, interruttore nel Salone)
- Modify: `src/components/domain/PersonalAppointment.tsx` (resa del promemoria, es. icona diversa da `PersonalGlyph`; usata da `PersonalEntry` in Home e dall'agenda — verifica `src/components/calendar/WeekRows.tsx` e `src/pages/CalendarPage.tsx`)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts` (testi nuovi)
- Test: `src/pages/PersonalAppointmentPage.test.tsx`, test del componente o della Home

**Interfaces:**
- Consumes: campi di Task 1.

- [ ] **Step 1: Test**:
  - `'nuovo impegno: senza ora di fine non si salva'` → tipo Impegno, nessuna fine → messaggio di fine (`persFine` o nuovo) e nessuna scrittura.
  - `'un promemoria si salva senza ora di fine e con promemoria true'`.
  - `'nel Salone l’interruttore è acceso e spegnendolo si salva bloccaOnline false'`; `'fuori dal Salone l’interruttore non c’è e l’impegno non ha bloccaOnline'`.
  - `'un impegno vecchio senza fine aperto e salvato chiede la fine'`.
  - Home o agenda: `'un promemoria si distingue da un impegno'` (es. etichetta accessibile o icona diversa).
- [ ] **Step 2: Esegui** → FAIL.
- [ ] **Step 3: Implementa**. Testi, esattamente:
  - scelta: it `'Impegno'` / `'Promemoria'`; en `'Commitment'` / `'Reminder'`; es `'Compromiso'` / `'Recordatorio'`.
  - spiegazione sotto la scelta: it `'L’impegno toglie l’orario dalle prenotazioni online. Il promemoria resta solo in agenda.'`; en `'A commitment removes the time from online bookings. A reminder only stays in the calendar.'`; es `'El compromiso quita la hora de las reservas online. El recordatorio solo queda en la agenda.'`
  - interruttore: it `'Blocca l’orario per le prenotazioni online'`; en `'Block this time for online bookings'`; es `'Bloquear esta hora para las reservas online'`.
- [ ] **Step 4: Esegui** → PASS; `npx vitest run` (noto: driveInvio), `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 5: Commit** `fix(A3): nel modulo si sceglie impegno o promemoria`

### Task 4: Verifica, audit, merge, release (controller)

- [ ] **Step 1:** Emulatori: script che chiama `postiLiberiPer`/`intervalloAncoraLibero` compilati su un salone con un impegno 15:00-17:00, un impegno vecchio senza fine, un promemoria e (Salone) un impegno con `bloccaOnline: false` → solo gli impegni che bloccano tolgono gli orari.
- [ ] **Step 2:** `/qa-my-app:verify` nel browser: creare impegno (fine obbligatoria) e promemoria, interruttore visibile solo nel Salone, promemoria riconoscibile in Home e agenda.
- [ ] **Step 3:** Solo se tutto passa: A3 «risolto» nell'audit, commit `docs: A3 verificato e chiuso`, merge in `main`, deploy functions `postiLiberi`, `inviaRichiesta`, `gestisciPrenotazione`, `confermaAttesa` (e `giraCoda` se cambiato `inviaCoda`) con `FUNCTIONS_DISCOVERY_TIMEOUT=60`, release APK.
