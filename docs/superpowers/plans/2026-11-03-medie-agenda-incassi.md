# Medie «Agenda e incassi» (18-22) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visite oltre la mezzanotte visibili, visite chiuse rimettibili in programma, persona della visita e filtro per persona col Salone, Statistiche leggibili e fumetto del grafico Incassi leggibile.

**Architecture:** Solo app. Logica pura in `src/lib/*` (calendario, previsione, posizione del fumetto, filtro persona) con test di unità; pagine e componenti la usano. Nessun cambio a regole o functions.

**Tech Stack:** React + TypeScript + Vite, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-medie-agenda-incassi-design.md`

## Global Constraints
- Testi in it/en/es (`src/i18n/it.ts`, `en.ts`, `es.ts`); ogni chiave nuova in tutti e tre; nessun testo italiano fisso nei componenti (aria-label compresi).
- Nessun cambio a `firestore.rules` né a `functions/`.
- Importi sempre con `euro(lingua, …)`; con `settings.ui.hideAmounts` acceso nessuna cifra in euro visibile (come in Incassi).
- Tutto leggibile a 320, 360 e 390 px senza scorrimento orizzontale.
- Test dalla radice: `npx vitest run <file>` (alcuni test di pagina girano solo con `--config vitest.slow.config.ts`: usare quello che fa girare il file); typecheck `npx tsc --noEmit`. Fallimento noto non correlato: `src/lib/driveInvio.test.ts`; ignorare `.claude/**`. Gli 8 fallimenti già noti con `vitest.slow.config.ts` in `DogsPage.test.tsx` e `appointments.test.tsx` non vanno inseguiti.
- Commit con la riga `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **I campi tolti riaprendo devono sparire anche su Firestore:** «Rimetti in programma» su una completata deve togliere `total`, `paymentMethod`, `actualDurationMin`, `chiusoIl`, `adjustmentNote` dal documento in cloud, non solo dalla copia in memoria (la scrittura cloud passa da `appointmentsToLocalMap`/`saveAppointment`: verificare che riscriva il documento intero o usi `deleteField`). Test nel Task 2 sul percorso cloud (mock di `saveAppointment` che riceve l'appuntamento senza quei campi).
2. **Visita che finisce esattamente a mezzanotte (fine 00:00 del giorno dopo):** nessun pezzo vuoto il giorno dopo; griglia del giorno d'inizio fino alle 24. Test nel Task 1.
3. **Visita che dura oltre due giorni o con fine non valida:** niente cicli infiniti né griglie oltre 24; il giorno d'inizio arriva a 24, i giorni seguenti mostrano la parte di quel giorno. Test nel Task 1 (visita 22:00 → 01:00 di due giorni dopo).
4. **Filtro su una persona tolta dal salone:** scelta ricordata ma persona non più attiva → torna «Tutti». Test nel Task 3.
5. **Fumetto sulla prima e sull'ultima barra a 320 px:** non esce dai bordi del grafico. Test nel Task 5 con la funzione di posizione.

---

### Task 1: Visite oltre la mezzanotte nel calendario

**Files:**
- Modify: `src/lib/calendarView.ts` (`gridBounds` ~143, `daySummary` ~69 se serve), `src/lib/calendarLayout.ts` (`daySegments` ~179), `src/pages/CalendarPage.tsx` (dove si scelgono le visite del giorno e si costruiscono gli `spans`/`items`, ~252 e ~790; vista Settimana in `src/components/calendar/WeekRows.tsx` se costruisce i giorni a parte)
- Test: `src/lib/calendarView.test.ts`, `src/lib/calendarLayout.test.ts`, `src/pages/CalendarPage.test.tsx`

**Interfaces:**
- Produces: `export function pezzoDelGiorno(start: Date, end: Date, giorno: Date): { start: Date; end: Date; continua: boolean; prosegue: boolean } | null` in `src/lib/calendarView.ts` — la parte della visita che cade nel giorno `giorno` (ritagliata a 00:00 e 24:00 locali); `continua` = iniziata in un giorno precedente, `prosegue` = finisce in un giorno seguente; `null` se non tocca il giorno (fine esattamente alle 00:00 del giorno → `null`).
- `gridBounds` tratta una fine in un giorno successivo all'inizio come 24 (endHour massimo 24).

- [ ] **Step 1: Test che falliscono:**
  - `pezzoDelGiorno(30/11 19:00, 01/12 00:25, 30/11)` → `{ start 19:00, end 01/12 00:00, continua: false, prosegue: true }`; con giorno 01/12 → `{ start 01/12 00:00, end 00:25, continua: true, prosegue: false }`; fine 01/12 00:00 con giorno 01/12 → `null`; visita 22:00 del 30/11 → 01:00 del 02/12 con giorno 01/12 → giorno intero con `continua` e `prosegue` veri.
  - `gridBounds([{ start: 30/11 19:00, end: 01/12 00:25 }])` → `endHour: 24`.
  - `daySegments` con un elemento 19:00-24:00 e `endHour 24` → un gruppo che lo contiene.
  - `CalendarPage` vista Giorno: il 30/11 compare il blocco della visita; il 01/12 compare il blocco 00:00-00:25; l'intestazione del 01/12 non conta la visita (0 cani).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare: per ogni giorno mostrato si usa `pezzoDelGiorno` per scegliere le visite e le loro ore; il tocco su un pezzo apre la visita come oggi; `daySummary` del giorno conta solo le visite che iniziano quel giorno.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `fix(calendario): le visite oltre la mezzanotte si vedono nei due giorni`

### Task 2: «Rimetti in programma»

**Files:**
- Modify: `src/data/local/appointments.ts` (`setAppointmentStatus` ~480), `src/hooks/useAppointments.ts` (`setStatus` ~304), `src/pages/AppointmentPage.tsx` (Sheet `menu` ~672, conferma), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/data/local/appointments.test.ts`, `src/hooks/useAppointments.test.ts*` (se esiste; altrimenti nel test della pagina), `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- `setAppointmentStatus(uid, id, 'programmato')` da una visita `completato` toglie anche `total`, `paymentMethod`, `actualDurationMin`, `adjustmentNote` (oggi toglie già `chiusoIl` e `cancelReason`). Gli altri passaggi di stato non cambiano.
- Chiavi nuove (it): `appRimettiProgramma: 'Rimetti in programma'`, `appRimettiDomanda: 'Rimettere la visita in programma?'`, `appRimettiIncasso: 'L’incasso registrato verrà tolto.'`, `appRimettiConferma: 'Rimetti in programma'`.
- Voce nel menu: visibile se lo stato è `completato`, `disdetto` o `non_venuto`; per `completato` solo se il ruolo non è `collaboratore`. Conferma in un `Sheet` come quella di eliminazione (`appEliminaDomanda`), con `appRimettiIncasso` solo per una completata; «Conferma» → `setStatus(id, 'programmato')`; errore → `toast.show(frasi.authSalvataggio, 'plain')`.

- [ ] **Step 1: Test che falliscono:**
  - `setAppointmentStatus` da completata con `total 50, paymentMethod 'contanti', actualDurationMin 60, adjustmentNote 'x', chiusoIl` → salvata senza questi campi, con servizi, note, foto, `assigneeUid` e orario invariati; da disdetta con `cancelReason` → senza `cancelReason`.
  - percorso cloud (`useAppointments` non locale): la funzione che scrive su Firestore riceve l'appuntamento senza quei campi e il documento scritto non li contiene (controllare come `appointmentsToLocalMap`/`saveAppointment` scrivono: se usano `set` con merge, aggiungere la rimozione esplicita con `deleteField()` nel livello cloud).
  - `AppointmentPage`: visita completata aperta dal titolare → «Altre azioni» mostra «Rimetti in programma»; conferma con «L’incasso registrato verrà tolto.» → `setStatus(id, 'programmato')`; aperta dal collaboratore → voce assente; disdetta aperta dal collaboratore → voce presente, conferma senza la frase sull'incasso; visita in programma → voce assente.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(visita): rimetti in programma una visita chiusa, disdetta o non venuta`

### Task 3: Persona della visita e filtro persona (Salone)

**Files:**
- Create: `src/lib/filtroPersona.ts`, `src/hooks/usePersoneSalone.ts`, `src/components/team/FiltroPersona.tsx`
- Modify: `src/pages/CalendarPage.tsx` (blocchi Giorno, `src/components/calendar/WeekRows.tsx` per la Settimana, filtro in testa), `src/pages/EarningsPage.tsx` (filtro e totali/grafico), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/lib/filtroPersona.test.ts`, `src/components/team/FiltroPersona.test.tsx`, `src/pages/CalendarPage.test.tsx`, `src/pages/EarningsPage.test.tsx`

**Interfaces:**
- Consumes: `watchSalonAccess` (`client.ts`), `pickerMembers(access)` e `rosterLabel` (`src/lib/salonRoster.ts`), `assigneeOf(appointment, ownerUid)` (`src/lib/salonAccess.ts`).
- Produces:
  - `iniziali(nome: string): string` — prime lettere di nome e cognome in maiuscolo (max 2; «Anna» → «A»; vuoto → «»).
  - `filtraPerPersona<T extends { assigneeUid?: string | null }>(items: T[], persona: string | null, ownerUid: string): T[]` — `null` = tutti; altrimenti `assigneeOf(item, ownerUid) === persona`.
  - `leggiFiltroPersona(salonId: string): string | null` / `ricordaFiltroPersona(salonId: string, persona: string | null): void` — `localStorage` chiave `groomly.filtroPersona.<salonId>`, letture e scritture in try/catch.
  - `usePersoneSalone(): { persone: SalonMember[]; attivo: boolean }` — ascolta `watchSalonAccess(account.salonId)`; `attivo` = Salone acceso e `pickerMembers(access).length > 0`; vuoto fuori da Firebase o per il collaboratore.
  - `FiltroPersona({ persone, valore, onCambia }: { persone: SalonMember[]; valore: string | null; onCambia: (uid: string | null) => void })` — fila di chip «Tutti» + un chip per persona (`rosterLabel`), stile dei chip di ruolo; scorre in orizzontale dentro sé stessa se non ci sta (la pagina no).
- Chiavi nuove (it): `filtroTutti: 'Tutti'`, `filtroPersona: 'Filtra per persona'` (aria-label del gruppo), `visitaDi: 'Visita di {{nome}}'` (aria-label delle iniziali).
- Comportamento: con `attivo` e ruolo titolare o socio, Calendario e Incassi mostrano `FiltroPersona` e filtrano con `filtraPerPersona`; la scelta si ricorda con `ricordaFiltroPersona(salonId, …)` e, se la persona ricordata non è in `persone`, vale «Tutti». Con `attivo` (qualunque ruolo) i blocchi delle viste Giorno e Settimana mostrano una pastiglia con `iniziali(rosterLabel(persona))` della persona assegnata; vista Mese invariata. Senza Salone tutto come oggi.

- [ ] **Step 1: Test che falliscono:** `iniziali('Anna Rossi')` → `'AR'`, `iniziali('Anna')` → `'A'`, `iniziali('  ')` → `''`; `filtraPerPersona` con persona null → tutte, con uid → solo le sue, visita senza `assigneeUid` conta per il titolare; `leggiFiltroPersona` con `localStorage` che lancia → `null`; Calendario con Salone attivo e due persone: chip «Tutti», «Anna Rossi», «Teo Bianchi»; tocco su «Anna Rossi» → solo le visite di Anna; ricaricando la scelta resta; persona ricordata non più presente → «Tutti»; blocco della visita con «AR»; collaboratore → nessun filtro; senza Salone → nessun filtro né iniziali; Incassi: con «Anna Rossi» scelto il totale è solo delle sue visite.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(salone): iniziali della persona sulle visite e filtro per persona in Calendario e Incassi`

### Task 4: Pagina Statistiche

**Files:**
- Modify: `src/lib/statistiche.ts` (`previsione` ~28), `src/components/piano/SchedeStatistiche.tsx`, `src/pages/StatistichePage.tsx`, `src/pages/EarningsReportPage.tsx` (link ~204), `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/lib/statistiche.test.ts`, `src/components/piano/SchedeStatistiche.test.tsx`, `src/pages/StatistichePage.test.tsx`, `src/pages/EarningsReportPage.test.tsx`

**Interfaces:**
- `previsione(visite: readonly VisitaStat[], periodo: { inizio: Date; fine: Date }): number` — tasso di non venuti su tutte le visite chiuse (come oggi); incassato = completate con `start` nel periodo; programmati = in programma con `start` nel periodo; ritorna `incassato + programmati × (1 − tasso)`. `inizio` incluso, `fine` escluso.
- `SchedeStatistiche({ mostra, euro, atteso, ritardo, nascondi, mese }: { mostra: boolean; euro: number | null; atteso: number; ritardo: number; nascondi: boolean; mese: string })` — tre schede (stile delle schede di Incassi: cercare il componente scheda usato in `EarningsPage` e riusarlo); con `nascondi` le due in euro mostrano `•••`.
- Chiavi (it): `euroOra` → «€ all'ora» (cambiare il valore se oggi è «Euro l'ora»), `euroOraSotto: 'visite completate'`, `previsioneMese: 'Previsione del mese'`, `previsioneSotto: '{{mese}}'`, `inRitardo` resta «Clienti in ritardo» (aggiornare se diverso), `inRitardoSotto: 'oltre il loro ritmo abituale'`.
- `StatistichePage` passa il periodo del mese in corso (locale), `nascondi = settings.ui.hideAmounts`, `mese` = nome del mese nella lingua dell'app.
- Il link «Statistiche» in `EarningsReportPage` diventa una riga come le altre righe di quella pagina (stesso componente e freccia).

- [ ] **Step 1: Test che falliscono:** `previsione` con una completata da 50 € a ottobre, una completata da 30 € a novembre, due programmate da 40 € a novembre, tasso 0 → periodo novembre → 110; con 1 non venuto su 4 chiuse → 30 + 80 × 0,75 = 90; `SchedeStatistiche` con `euro 31.4` → testo con «€» (formattato da `euro`), con `nascondi` → «•••» e nessuna cifra in euro; `StatistichePage` con `hideAmounts` acceso → «•••»; Report → «Statistiche» è un elemento con il ruolo e lo stile delle altre righe (stesso test id/struttura delle righe vicine).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Commit** `feat(statistiche): schede con euro, previsione del mese e Nascondi importi`

### Task 5: Fumetto del grafico Incassi

**Files:**
- Create: `src/lib/posizioneFumetto.ts`
- Modify: `src/components/*/EarningsChart.tsx` (fumetto ~98-112)
- Test: `src/lib/posizioneFumetto.test.ts`, test del grafico esistente

**Interfaces:**
- `posizioneFumetto(input: { centroBarra: number; larghezzaFumetto: number; larghezzaGrafico: number; margine?: number }): number` — `left` in px del fumetto dentro il grafico: centrato su `centroBarra`, poi limitato a `[margine, larghezzaGrafico − larghezzaFumetto − margine]` (margine predefinito 4); se il fumetto è più largo del grafico → `margine`.
- Nel grafico il fumetto non è più dentro il pulsante della barra (largo quanto la barra): è un unico elemento posizionato rispetto all'area del grafico, larghezza `max-content` con `max-width: 100%`, al massimo due righe, senza `overflowWrap: 'anywhere'` (parole intere), `left` da `posizioneFumetto` (misurando con `ref` + `ResizeObserver` o `getBoundingClientRect` dopo il render), `bottom` sopra la barra ma dentro l'area del grafico, così non copre il totale sopra il grafico. `role="status"` e testi (`bucket.title`, `tipText`) invariati.

- [ ] **Step 1: Test che falliscono:** `posizioneFumetto({ centroBarra: 10, larghezzaFumetto: 120, larghezzaGrafico: 300 })` → 4; centro 290 → 176; centro 150 → 90; fumetto 400 su grafico 300 → 4; nel test del grafico: selezionando una barra il fumetto è un solo elemento `role="status"` con titolo e testo e non è figlio del pulsante della barra.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** run → PASS; poi suite intera `npx vitest run --exclude '.claude/**'`.
- [ ] **Step 5: Commit** `fix(incassi): fumetto del grafico leggibile e dentro i bordi`

### Task 6: Verifica sull'emulatore e audit

**Files:**
- Create: `QA-tests/.qa-catalog/verify-agenda-incassi.cjs`
- Modify: `docs/AUDIT-QA-2026-11-01.md` (18-22 «risolto»), `PROGRESS.md`

Browser (Playwright, app in modo emu, dati creati con firebase-admin come `verify-team-ruoli.cjs`), a 320/360/390 px con misura delle righe:
- visita 19:00 → 00:25: blocco il giorno d'inizio fino in fondo alla griglia e pezzo 00:00-00:25 il giorno dopo (Giorno e Settimana); intestazione del giorno dopo senza la visita.
- «Rimetti in programma» da titolare su una completata: documento Firestore senza `total`/`paymentMethod`/`actualDurationMin`/`chiusoIl`/`adjustmentNote` e `status: 'programmato'`; da collaboratore su una disdetta: `status: 'programmato'`, senza `cancelReason`.
- Salone con due collaboratori: iniziali sui blocchi; filtro in Calendario e Incassi; la scelta resta dopo una ricarica.
- Statistiche: tre schede con «€», «Previsione del mese» del mese in corso; con «Nascondi importi» acceso «•••».
- Grafico: fumetto sulla prima, una centrale e l'ultima barra a 320 px dentro i bordi, parole intere, totale non coperto.

- [ ] **Step 1:** Ambiente come in PROGRESS.
- [ ] **Step 2:** `node QA-tests/.qa-catalog/verify-agenda-incassi.cjs` → tutto OK; screenshot in `QA-tests/results/agenda-incassi/`.
- [ ] **Step 3:** Audit e PROGRESS; commit `docs: Agenda e incassi 18-22 risolti e verificati`.
