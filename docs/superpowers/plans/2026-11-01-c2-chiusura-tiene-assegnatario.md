# C2 — Chiudere una visita non perde chi l'ha fatta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sola funzione produce la copia locale di un appuntamento, così chiusure e backup non perdono più `assigneeUid`, `chiusoIl` e `kind`.

**Architecture:** `toStored` di `src/data/local/appointments.ts` (già completo) diventa l'unico serializzatore, esportato come `appointmentToStored`; `appointmentToLocal` di `src/data/firebase/localSeed.ts` lo richiama invece di duplicarlo. Un test di andata e ritorno con un appuntamento a campi completi protegge dai campi futuri.

**Tech Stack:** React 18, TypeScript, Vitest + Testing Library, Firebase JS SDK.

**Spec:** `docs/superpowers/specs/2026-11-01-c2-chiusura-tiene-assegnatario-design.md`

## Global Constraints

- Il formato della copia locale già salvata sui telefoni non cambia (stesse chiavi di `StoredAppointment`): le versioni attuali devono rileggerla.
- Nessun campo che oggi `appointmentToLocal` salva può sparire: in caso di differenza vince l'unione dei due serializzatori.
- Vale da ora in poi: nessuna migrazione o recupero delle visite già chiuse.
- Nessuna modifica a regole Firestore, Functions o al modo in cui la chiusura scrive nel cloud.

## Review Focus

1. Impegno personale assegnato (`kind: 'personale'` con `assigneeUid`): dopo il salvataggio locale conserva titolo, fine prevista e assegnatario (test in Task 1).
2. Visita con `kind` assente (dati vecchi): resta senza `kind`, non diventa `'personale'` (test in Task 1).
3. Disdetta annullata dal toast (`restoreScheduled`): torna `programmato` mantenendo `assigneeUid` (test in Task 2).
4. Collaboratore che chiude la propria visita: l'incasso resta suo nei suoi Incassi (verifica in Task 4).
5. Ripristino di un backup fatto prima di questa correzione (senza `assigneeUid`): si legge senza errori (test in Task 3).

---

### Task 1: Un solo serializzatore della copia locale, con test di andata e ritorno

**Files:**
- Modify: `src/data/local/appointments.ts` (`toStored` ~252 → export `appointmentToStored`)
- Modify: `src/data/firebase/localSeed.ts` (`appointmentToLocal` ~73-125)
- Test: `src/data/firebase/localSeed.test.ts` (crea se manca)

**Interfaces:**
- Produces: `export function appointmentToStored(appointment: Appointment): StoredAppointment` in `src/data/local/appointments.ts` (stesso corpo di `toStored`; gli usi interni restano); `appointmentToLocal(appointment)` in `localSeed.ts` ritorna `appointmentToStored(appointment)`; `appointmentsToLocalMap` invariata nella firma.

- [ ] **Step 1: Scrivi i test** in `src/data/firebase/localSeed.test.ts`, che passano dal percorso vero: `appointmentsToLocalMap([...])` → `localStorage.setItem(storageKeys.appointments('u'), JSON.stringify(map))` → `listAppointments('u')`.
  - `'una visita con tutti i campi torna identica dalla copia locale'`: fixture tipizzata `Required<Omit<Appointment, 'title' | 'plannedEnd'>>` con ogni campo valorizzato (`kind: 'pelosetto'`, `assigneeUid: 'collab-1'`, `chiusoIl`, `status: 'completato'`, `total: 35`, `paymentMethod: 'contanti'`, foto, extraNotes, `provvisorio: true`, `scadeIl`, `richiestaId`, `ospiteNome`, …) → `expect(listAppointments('u')[0]).toEqual(fixture)`. Il tipo `Required<…>` fa fallire la compilazione del test se si aggiunge un campo ad `Appointment` senza valorizzarlo qui.
  - `'un impegno personale assegnato torna identico'`: `{ kind: 'personale', title, plannedEnd, assigneeUid: 'collab-1', … }` → uguale.
  - `'una visita senza kind resta senza kind'`: niente `kind` nel risultato.
  - `'chiusura: assigneeUid, chiusoIl e kind non si perdono'`: la fixture precedente con `assigneeUid`, `chiusoIl`, `kind: 'pelosetto'` → `appointmentsToLocalMap` contiene le tre chiavi.

- [ ] **Step 2: Esegui** `npx vitest run src/data/firebase/localSeed.test.ts` → FAIL su `assigneeUid`/`chiusoIl`/`kind`.

- [ ] **Step 3: Implementa** l'export e la delega. Prima confronta i due corpi: se `appointmentToLocal` salva qualcosa che `toStored` non salva, aggiungilo a `toStored` (unione).

- [ ] **Step 4: Esegui** `npx vitest run src/data` → PASS; `npx tsc --noEmit` pulito.

- [ ] **Step 5: Commit** `fix(C2): una sola copia locale degli appuntamenti, chi fa la visita non si perde`

### Task 2: Le quattro chiusure conservano assegnatario, data di chiusura e tipo

**Files:**
- Test: `src/hooks/useAppointments.personal.test.tsx` (o nuovo `src/hooks/useAppointments.chiusura.test.tsx` sul suo modello)
- Modify: solo se un test fallisce dopo il Task 1, `src/hooks/useAppointments.ts` (`complete` ~273, `saveClose` ~287, `setStatus` ~301, ripristino dal toast)

**Interfaces:**
- Consumes: Task 1 (`appointmentsToLocalMap` completa).

- [ ] **Step 1: Scrivi i test** con una visita `programmato` di ieri, `assigneeUid: 'collab-1'`, `kind: 'pelosetto'`; per ognuna delle azioni controlla l'appuntamento passato al salvataggio cloud (mock del client, come negli altri test del file) e quello in memoria:
  - `'Completato tiene assigneeUid e kind e scrive chiusoIl'`
  - `'Salva e completa tiene assigneeUid e kind e scrive chiusoIl'` (`saveClose(id, { total: 35, actualDurationMin: 45, adjustmentNote: 'x', paymentMethod: 'contanti' }, true)`)
  - `'Non venuto e Disdetto tengono assigneeUid e kind'` (`setStatus(id, 'non_venuto')`, `setStatus(id, 'disdetto', 'cliente')`)
  - `'annullare la disdetta dal toast riporta programmato con assigneeUid'`

- [ ] **Step 2: Esegui** il file di test. Atteso: PASS se il Task 1 basta; se qualcosa fallisce, è un secondo punto che perde i campi.

- [ ] **Step 3: Solo se Step 2 fallisce**, correggi il punto che perde i campi in `useAppointments.ts` (stessa regola: non riscrivere la visita da una copia parziale).

- [ ] **Step 4: Esegui** `npx vitest run src/hooks` → PASS.

- [ ] **Step 5: Commit** `test(C2): le chiusure tengono chi fa la visita` (o `fix(C2): …` se Step 3 ha cambiato codice)

### Task 3: I backup conservano l'assegnatario

**Files:**
- Test: `src/data/firebase/backupCollect.test.ts`

**Interfaces:**
- Consumes: Task 1.

- [ ] **Step 1: Scrivi i test**
  - `'il backup contiene assigneeUid, chiusoIl e kind delle visite'`: con il setup già usato nel file (`raccogliBackup` → ZIP → `leggiRipristino`), una visita chiusa con `assigneeUid: 'collab-1'`, `chiusoIl`, `kind: 'pelosetto'` → dopo la lettura del ripristino la visita ha i tre campi.
  - `'un backup vecchio senza assigneeUid si ripristina senza errori'`: bundle con una visita senza quei campi → lettura ok, campi assenti.

- [ ] **Step 2: Esegui** `npx vitest run src/data/firebase/backupCollect.test.ts` → il primo test PASS grazie al Task 1 (se FAIL, c'è un altro punto da correggere in `backupCollect.ts`/`leggiRipristino.ts`: correggilo).

- [ ] **Step 3: Esegui** la suite intera `npx vitest run` (fallimento noto non correlato: `src/lib/driveInvio.test.ts`), `npx tsc --noEmit`, `npm run build` → puliti.

- [ ] **Step 4: Commit** `test(C2): i backup tengono chi fa la visita`

### Task 4: Verifica nel browser con `qa-my-app:verify` e chiusura nell'audit

**Files:**
- Modify: `docs/AUDIT-QA-2026-11-01.md` (voce C2: «— risolto» con data e commit)

- [ ] **Step 1:** Emulatori staccati e seed (`scripts/test360/seed-audit.ts` + `test-results/audit/work/coord/fix-enabled.cjs`), log dell'emulatore svuotato periodicamente; un solo runner alla volta.
- [ ] **Step 2:** `/qa-my-app:verify --branch main` con i criteri della spec: in un Salone con collaboratore, visite assegnate a lui chiuse con Completato, Salva e completa, Non venuto e Disdetto → nel cloud restano `assigneeUid`, `chiusoIl`, `kind`; il collaboratore vede l'incasso nei suoi Incassi e il titolare non lo vede attribuito a sé; backup e ripristino conservano l'assegnatario.
- [ ] **Step 3:** Solo se tutti i criteri passano: segna C2 risolto nell'audit; commit `docs: C2 verificato e chiuso`; release APK secondo la memoria `release-apk-automatica`.
