# C1 — Groomly non cancella mai visite da solo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nessun percorso dell'app cancella visite dal cloud per l'assenza di un cane; eliminare un cane cancella solo le sue visite future, lo storico e le «da chiudere» restano e si chiudono.

**Architecture:** Il segno di cancellazione (`Tombstone`) prende un terzo elenco `storicoIds`: i cani eliminati con la nuova regola, le cui visite non vengono più nascoste per id cane. `removeDog` riceve gli id esatti delle visite future calcolati alla conferma e cancella solo quelli. La pulizia all'avvio sparisce. `useDogs` espone `dalServer` per decidere quando mostrare «Cane eliminato» e «Rimuovi dalla lista».

**Tech Stack:** React 18, TypeScript, Firebase JS SDK (Firestore), Vitest + Testing Library, Playwright (verifica).

**Spec:** `docs/superpowers/specs/2026-11-01-c1-visite-mai-cancellate-da-sole-design.md`

## Global Constraints

- Nessuna cancellazione dal cloud decisa dal client in base a una visita il cui cane non è in lista. Le uniche cancellazioni di visite restano: azione esplicita sulla visita, visite future del cane eliminato (id calcolati alla conferma), ripristino da backup.
- Visite future = `status === 'programmato'` e `start > adesso` al momento della conferma; `kind === 'personale'` mai toccate.
- Cani nel segno **senza** `storicoIds` (eliminati prima di questo aggiornamento) continuano a nascondere tutte le loro visite, come oggi.
- Le versioni vecchie dell'app ignorano `storicoIds`: accettato (rischio noto nella spec).
- Testi: «Cane eliminato» / «Deleted dog» / «Perro eliminado». Conferma eliminazione: vedi Task 4.
- Regole Firestore invariate. Nessun deploy di Functions.
- Il salone condiviso (`salon/shared`, `usesOnlyCloudDeletion`) usa solo il segno in cloud: il nuovo campo deve essere letto anche lì.

## Review Focus

1. Cane eliminato offline: la cancellazione arriva al cloud ore dopo → devono sparire proprio gli id salvati alla conferma, anche se nel frattempo sono passati (test in Task 2 e Task 3).
2. Secondo telefono dello stesso salone: legge il segno dal cloud, deve vedere lo storico del cane eliminato con la nuova regola e continuare a nascondere i cani vecchi (test in Task 1 su `filterAppointments` con segno unito local+cloud).
3. Cancellazione in sospeso salvata nel formato vecchio (array di stringhe in `groomly.deleted.pending`) da una versione precedente → letta senza errori, nessuna visita cancellata (test in Task 1).
4. Login con lista cani vuota o in ritardo: nessuna chiamata a `removeAppointment` (test in Task 5).
5. Visita «da chiudere» di cane eliminato: Completato apre il foglio di chiusura e salva come ogni altra (test in Task 6).

---

### Task 1: Segno di cancellazione con `storicoIds` e cancellazioni in sospeso con gli id delle visite

**Files:**
- Modify: `src/lib/tombstone.ts`
- Test: `src/lib/tombstone.test.ts`

**Interfaces:**
- Produces:
  - `type Tombstone = { ids: string[]; appointmentIds: string[]; storicoIds: string[] }`
  - `emptyTombstone()`, `readTombstone(raw)` (legge anche `storicoIds`, assente → `[]`), `mergeTombstone(a, b)` (unione dei tre elenchi), `rememberDeletion(patch: Partial<Tombstone>)`.
  - `tombstoneRejectsAppointment(stone, id, dogId, personal = false): boolean` — vero se `appointmentIds` contiene `id`, oppure (non personale e) `ids` contiene `dogId` **e** `storicoIds` non contiene `dogId`.
  - `type PendingDogDeletion = { id: string; visitIds: string[] }`
  - `readPendingDogDeletions(): PendingDogDeletion[]` (voci stringa del formato vecchio → `{ id, visitIds: [] }`)
  - `rememberPendingDogDeletion(id: string, visitIds: string[]): void`
  - `forgetPendingDogDeletion(id: string): void`, `dogHiddenNow(id)` invariati nel comportamento.

- [ ] **Step 1: Aggiorna i test esistenti di forma** (`readTombstone`, `mergeTombstone`, `readDeletion` con `toEqual`) aggiungendo `storicoIds: []`, e scrivi i nuovi test:
  - `'un cane con lo storico tenuto non nasconde le sue visite'`: `tombstoneRejectsAppointment({ ids: ['rex'], appointmentIds: [], storicoIds: ['rex'] }, 'a1', 'rex')` → `false`.
  - `'un cane eliminato prima dell aggiornamento nasconde ancora le sue visite'`: stesso con `storicoIds: []` → `true`.
  - `'una visita futura cancellata resta nascosta anche con lo storico tenuto'`: `{ ids: ['rex'], appointmentIds: ['f1'], storicoIds: ['rex'] }`, `'f1'` → `true`.
  - `'readTombstone legge storicoIds e scarta i non testi'`: `readTombstone({ ids: ['rex'], storicoIds: ['rex', 3] })` → `{ ids: ['rex'], appointmentIds: [], storicoIds: ['rex'] }`.
  - `'una cancellazione in sospeso tiene gli id delle visite'`: `rememberPendingDogDeletion('rex', ['f1', 'f2'])` → `readPendingDogDeletions()` = `[{ id: 'rex', visitIds: ['f1', 'f2'] }]`; `dogHiddenNow('rex')` → `true`.
  - `'il formato vecchio delle cancellazioni in sospeso si legge senza visite'`: `localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(['rex']))` → `[{ id: 'rex', visitIds: [] }]`.

- [ ] **Step 2: Esegui** `npx vitest run src/lib/tombstone.test.ts` → FAIL sui nuovi test.

- [ ] **Step 3: Implementa** le interfacce sopra in `src/lib/tombstone.ts`. In `localStorage` le voci in sospeso diventano oggetti `{ id, visitIds }`; `rememberPendingDogDeletion` sostituisce l'eventuale voce con lo stesso `id`.

- [ ] **Step 4: Esegui** `npx vitest run src/lib/tombstone.test.ts` → PASS; poi `npx tsc --noEmit` e annota gli errori di tipo nei chiamanti (li sistemano i Task 2-3; se un chiamante non è coperto da quei task, sistemalo qui con il comportamento attuale).

- [ ] **Step 5: Commit** `fix(C1): il segno di cancellazione distingue i cani con lo storico tenuto`

### Task 2: `removeDog` cancella solo le visite future decise alla conferma; niente cancellazioni per cane nei percorsi automatici

**Files:**
- Modify: `src/data/firebase/client.ts` (`writeDeletionSign` ~1116, `cloudDeletion` ~1226, `readSignOrNull` ~1239, `removeDog` ~1298-1335, ripresa in `listenDogs` ~1359-1365, `replayLocalDeletion` ~1052-1086)
- Test: `src/data/firebase/client.test.ts` (segui i mock Firestore già usati lì per `removeDog`)

**Interfaces:**
- Consumes: Task 1 (`Tombstone.storicoIds`, `PendingDogDeletion`).
- Produces:
  - `removeDog(uid: string, id: string, sourceDocId?: string, futureVisitIds: readonly string[] = []): Promise<void>`
  - `writeDeletionSign(ids: string[], appointmentIds: string[], storicoIds: string[] = []): Promise<void>` (scrive `storicoIds` con `arrayUnion` in `meta/deleted-dogs`).

- [ ] **Step 1: Scrivi i test**
  - `'removeDog cancella solo le visite future passate e lascia storico e da chiudere'`: Firestore finto con visite di `rex`: `c1` completato, `d1` programmato nel passato, `f1` programmato futuro, `p1` personale; `removeDog('u', 'rex', undefined, ['f1'])` → `deleteDoc` chiamato solo per `dogs/rex` e `appointments/f1`; segno scritto con `ids` contenente `rex`, `appointmentIds` = `['f1']`, `storicoIds` contenente `rex`.
  - `'removeDog cancella gli id decisi anche se nel frattempo sono passati'`: `f1` con `start` ormai passato, passato in `futureVisitIds` → cancellato.
  - `'la ripresa dei cani in sospeso passa gli id salvati'`: con `rememberPendingDogDeletion('rex', ['f1'])` e segno senza `rex`, lo snapshot di `listenDogs` richiama `removeDog(uid, 'rex', undefined, ['f1'])`.
  - `'replayLocalDeletion non cerca più visite per cane'`: segno locale `{ ids: ['rex'], appointmentIds: [] }`, visite di `rex` in cloud → nessun `deleteDoc` su `appointments/*`.
  - `'cloudDeletion e readSignOrNull riportano storicoIds dal cloud'`: `meta/deleted-dogs` con `storicoIds: ['rex']` → risultato con `storicoIds: ['rex']`.

- [ ] **Step 2: Esegui** `npx vitest run src/data/firebase/client.test.ts` → FAIL sui nuovi test.

- [ ] **Step 3: Implementa.** In `removeDog`: tieni il segno del cane (`deletedDogs/<id>` e `ids`), aggiungi i `signIds` a `storicoIds`, sostituisci il filtro `appointmentRemovedWithDog(...)` con la cancellazione dei soli documenti il cui id è in `futureVisitIds` (più eventuali `appointmentIds` espliciti già nel segno unito, come oggi), e scrivi nel segno solo quegli id. In `replayLocalDeletion` togli il ramo `dogIds.length > 0` che cerca visite con `appointmentMatchedByDeletedDog`; restano solo gli `appointmentIds` espliciti. `cloudDeletion`/`readSignOrNull` propagano `storicoIds` da `meta/deleted-dogs`. Se `appointmentRemovedWithDog`/`appointmentMatchedByDeletedDog` (`src/lib/personalSync.ts`) restano senza chiamanti, eliminali con i loro test.

- [ ] **Step 4: Esegui** `npx vitest run src/data/firebase/client.test.ts src/lib/personalSync.test.ts` → PASS.

- [ ] **Step 5: Commit** `fix(C1): eliminare un cane cancella solo le visite future decise alla conferma`

### Task 3: Hook — `useDogs.remove` e `useAppointments.dropDog` lavorano sugli id futuri; `useDogs` espone `dalServer`

**Files:**
- Modify: `src/hooks/useDogs.ts` (`remove` ~270-295, `pubblica` ~89-102, valore di ritorno ~210), `src/hooks/useAppointments.ts` (`dropDog` ~365-369), `src/lib/dogRemoval.ts`
- Test: `src/hooks/useDogs.test.tsx` (crea se manca, sul modello di `src/hooks/useAppointments.personal.test.tsx`), `src/lib/dogRemoval.test.ts`

**Interfaces:**
- Consumes: Task 1 (`rememberPendingDogDeletion(id, visitIds)`, `rememberDeletion({ ids, storicoIds })`), Task 2 (`removeDog(..., futureVisitIds)`).
- Produces:
  - `useDogs(uid).remove(id: string, futureVisitIds: readonly string[]): boolean`
  - `useDogs(uid).dalServer: boolean` — `true` dopo il primo snapshot non dalla cache (`pubblica(next, false)`), `false` al cambio account e prima del server.
  - `useAppointments(uid).dropDog(visitIds: readonly string[]): boolean` — toglie dalla memoria e dal cloud solo quegli id (ricorda nel segno locale solo quegli `appointmentIds`).
  - `finishDogRemoval(actions: { removeDog: () => boolean; dropVisits: () => boolean }): boolean` invariata.

- [ ] **Step 1: Scrivi i test**
  - `'remove passa gli id futuri a removeDog e alla cancellazione in sospeso'`: dopo `remove('rex', ['f1'])` → `readPendingDogDeletions()` = `[{ id: 'rex', visitIds: ['f1'] }]`, segno locale con `storicoIds: ['rex']`, mock di `removeDog` chiamato con `('u', 'rex', undefined, ['f1'])`.
  - `'dalServer diventa vero solo con lo snapshot del server'`: snapshot dalla cache → `false`; snapshot dal server → `true`.
  - `'dropDog toglie solo le visite indicate'`: con visite `c1`, `d1`, `f1` in memoria, `dropDog(['f1'])` → restano `c1` e `d1`; `removeAppointment` chiamato solo per `f1`.

- [ ] **Step 2: Esegui** i due file di test → FAIL.

- [ ] **Step 3: Implementa** le interfacce. In `remove`: `rememberPendingDogDeletion(id, futureVisitIds)`, `rememberDeletion({ ids: [id], storicoIds: [id] })`, poi `removeDog(uid, id, sourceDocId, futureVisitIds)`.

- [ ] **Step 4: Esegui** i test → PASS; `npx tsc --noEmit` pulito per questi file.

- [ ] **Step 5: Commit** `fix(C1): l'eliminazione del cane porta con sé solo le visite future`

### Task 4: Scheda cane — conferma con il numero di visite future

**Files:**
- Modify: `src/pages/DogPage.tsx` (`confirmRemove` ~1256, dialogo di conferma eliminazione), `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`
- Test: `src/pages/DogPage.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`api.remove(id, futureVisitIds)`, `visits.dropDog(visitIds)`); `futureScheduled(items, dogId, now)` già in `DogPage.tsx:164`.
- Produces: chiavi `delCaneFuture` («Le {{n}} visite future verranno cancellate.» / «The {{n}} upcoming visits will be deleted.» / «Las {{n}} visitas futuras se eliminarán.»), `delCaneFuturaUna` («La visita futura verrà cancellata.» / «The upcoming visit will be deleted.» / «La visita futura se eliminará.»), `delCaneStorico` («Lo storico e gli incassi restano.» / «History and earnings are kept.» / «El historial y los ingresos se mantienen.»).

- [ ] **Step 1: Scrivi i test**
  - `'la conferma di eliminazione dice quante visite future spariscono'`: cane con 2 visite future, 1 completata, 1 da chiudere → il dialogo contiene «Le 2 visite future verranno cancellate.» e «Lo storico e gli incassi restano.»; dopo Conferma, `remove` riceve esattamente i 2 id futuri e `dropDog` gli stessi.
  - `'senza visite future la conferma dice solo che lo storico resta'`: niente frase sulle future.

- [ ] **Step 2: Esegui** `npx vitest run src/pages/DogPage.test.tsx` → FAIL.

- [ ] **Step 3: Implementa:** gli id futuri si calcolano una volta all'apertura della conferma (`futureScheduled(visits.appointments, dog.id, new Date()).map((item) => item.id)`) e gli stessi id vanno a `api.remove` e `visits.dropDog`.

- [ ] **Step 4: Esegui** il test → PASS.

- [ ] **Step 5: Commit** `fix(C1): la conferma di eliminazione del cane dice cosa sparisce e cosa resta`

### Task 5: Via la pulizia automatica all'avvio

**Files:**
- Modify: `src/app/providers.tsx` (righe ~45-74: `dropMissing`, `firstAppointmentIds`, `swept`, effetto con `setTimeout`), `src/hooks/useAppointments.ts` (`dropMissing` ~370-379)
- Test: `src/hooks/useAppointments.personal.test.tsx` (il test che usa `dropMissing` va tolto), nuovo `src/app/providers.test.tsx`

**Interfaces:**
- Consumes: niente dei task precedenti.
- Produces: `useAppointments` non espone più `dropMissing`.

- [ ] **Step 1: Scrivi il test** `'all avvio con la lista cani vuota nessuna visita viene cancellata'`: renderizza `MonthlyReminderForAccount` (o il provider che lo contiene) con `useDogs` finto `{ dogs: [], settled: true }` e `useAppointments` con 3 visite future, avanza i timer di 5 s → `removeAppointment` mai chiamato. Togli il test di `dropMissing` in `useAppointments.personal.test.tsx`.

- [ ] **Step 2: Esegui** `npx vitest run src/app/providers.test.tsx` → FAIL (oggi la pulizia cancella).

- [ ] **Step 3: Implementa:** elimina l'effetto di pulizia e i ref che servono solo a lui da `providers.tsx`; elimina `dropMissing` da `useAppointments.ts`.

- [ ] **Step 4: Esegui** `npx vitest run src/app src/hooks` → PASS.

- [ ] **Step 5: Commit** `fix(C1): Groomly non cancella più visite all'avvio`

### Task 6: Visite di cani eliminati — «Cane eliminato» solo con i cani dal server, e «da chiudere» chiudibili

**Files:**
- Create: `src/lib/nomeCaneVisita.ts`
- Modify: `src/pages/HomePage.tsx` (~625-656), `src/components/domain/AppointmentRow.tsx:49`, `src/components/calendar/WeekRows.tsx:178`, `src/pages/CalendarPage.tsx:422`, `src/pages/AppointmentPage.tsx:495`, `src/pages/AppointmentForm.tsx:412`, `src/lib/earnings.ts:120-121` e i suoi chiamanti, `src/i18n/it.ts`/`en.ts`/`es.ts` (`rigaCaneAssente`)
- Test: `src/lib/nomeCaneVisita.test.ts`, `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`useDogs(uid).dalServer`).
- Produces:
  - `nomeCaneVisita(dog: Dog | undefined, ospite: string, dalServer: boolean, frasi: { rigaCaneAssente: string; rigaCaneNeutro: string }): string` — nome del cane, altrimenti `ospite`, altrimenti `dalServer ? rigaCaneAssente : rigaCaneNeutro`.
  - `rigaCaneAssente` = «Cane eliminato» / «Deleted dog» / «Perro eliminado»; nuova `rigaCaneNeutro` = «Cane» / «Dog» / «Perro».
  - `dogName(dogs, dogId, nomeAssente = 'Cane')` in `earnings.ts`; i chiamanti in pagina passano `nomeCaneVisita(undefined, '', dalServer, frasi)`.

- [ ] **Step 1: Scrivi i test**
  - `nomeCaneVisita.test.ts`: con cane → nome; senza cane, `ospite` «Ada» → «Ada»; senza cane e senza ospite, `dalServer` vero → «Cane eliminato», falso → «Cane».
  - `HomePage.test.tsx` `'una da chiudere di un cane eliminato si chiude come le altre'`: visita `programmato` di ieri con `dogId` assente, `dalServer: true` → si vedono «Cane eliminato», Completato, Non venuto e Disdetto; Completato apre il foglio di chiusura.
  - `'mentre i cani caricano non si vede Cane eliminato né Rimuovi dalla lista'`: stessa visita, `dalServer: false` → niente «Cane eliminato», niente «Rimuovi dalla lista», pulsanti di chiusura presenti.

- [ ] **Step 2: Esegui** i due test → FAIL.

- [ ] **Step 3: Implementa:** in `HomePage.tsx` i pulsanti di chiusura si mostrano anche senza cane (aria-label con il nome da `nomeCaneVisita`); `homeSchedaAssente` e «Rimuovi dalla lista» solo con cane assente e `dalServer`, come azione secondaria. Gli altri file usano `nomeCaneVisita` al posto di `dog?.name ?? (ospite || frasi.rigaCaneAssente)`.

- [ ] **Step 4: Esegui** `npx vitest run src/lib/nomeCaneVisita.test.ts src/pages/HomePage.test.tsx` → PASS; poi la suite intera `npx vitest run` → solo il fallimento noto di `driveInvio.test.ts`, se ancora presente; `npm run build` → pulito.

- [ ] **Step 5: Commit** `fix(C1): le visite di cani eliminati restano visibili e chiudibili`

### Task 7: Verifica nel browser con `qa-my-app:verify` e chiusura nell'audit

**Files:**
- Modify: `docs/AUDIT-QA-2026-11-01.md` (voci C1, A4 e Media 33: «— risolto» con data e commit)

- [ ] **Step 1:** Emulatori staccati (`powershell Start-Process`, vedi memoria `test-apk-emulatore-android`), seed `npx vite-node scripts/test360/seed-audit.ts`, app `vite --mode emu`.
- [ ] **Step 2:** Esegui `/qa-my-app:verify` sullo scope di questo lavoro, con i criteri della spec («Come si verifica che è chiuso»): login con cani in ritardo → conteggio visite invariato; eliminazione cane con 2 future, 1 completata, 1 da chiudere → restano completata e da chiudere (chiudibile in home), spariscono le 2 future, incassi invariati, secondo browser uguale; caricamento senza «Cane eliminato»/«Rimuovi»; numero giusto nella conferma.
- [ ] **Step 3:** Solo se tutti i criteri passano: segna C1, A4 e la voce Media 33 come risolte nell'audit; commit `docs: C1 e A4 verificati e chiusi`.
