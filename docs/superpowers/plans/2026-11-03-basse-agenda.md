# Basse «Agenda» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere le sei basse «Agenda» dell'audit: un solo controllo d'orario per modulo e −15/+15, avvisi su chiusura e giorno chiuso, «Mancati» solo fino a oggi, freccia del Report, ultima ora del calendario.

**Architecture:** Un modulo puro `src/lib/controlloOrario.ts` (più due funzioni in `src/lib/orari.ts`) decide sovrapposizioni e sforamento della chiusura; `AppointmentForm.tsx` e `shiftStart` in `AppointmentPage.tsx` lo usano. Le altre correzioni restano nei loro file (`earnings.ts`, `EarningsReportPage.tsx`, `calendarLayout.ts`/`CalendarPage.tsx`).

**Tech Stack:** React + TypeScript, Vitest + Testing Library, date-fns, i18n in `src/i18n/{it,en,es}.ts`.

**Spec:** `docs/superpowers/specs/2026-11-03-basse-agenda-design.md`

## Global Constraints

- Solo app (APK): niente functions, regole Firestore o hosting.
- Griglia degli orari invariata: `START_TIMES` 08:00–19:00 a passi di 15 minuti (`src/lib/appointments.ts`).
- Gli impegni personali restano esclusi dal controllo di sovrapposizione delle visite; occupano solo le visite `programmato` (come oggi nel modulo).
- Orari del salone considerati solo quando oggi vengono passati al modulo (`orariAperti` in `AppointmentPage.tsx:735`: piano con `prenotazioni` e orari compilati). Su Go nessun comportamento nuovo per i punti 2 e 3.
- Testi nuovi in it/en/es con chiavi nuove; nessun letterale italiano nel codice (test `src/i18n/frasiFisse.test.ts`). Testi italiani fissati: «Finisce dopo la chiusura delle {{ora}}», «Il salone è chiuso questo giorno», pulsante «Sposta comunque».
- Test di `src/` con `npx vitest run <file>`; la suite intera con `--exclude '.claude/**'`. Fallimento noto non correlato: `src/lib/driveInvio.test.ts`.

## Review Focus

- Visita che finisce esattamente all'orario di chiusura (12:00 + 60 min con fascia fino alle 13:00 → nessun avviso; fine 13:00 = chiusura, non sforamento). Test in Task 1.
- Orari con due fasce (9–13 / 15–19): l'avviso usa la chiusura della fascia in cui la visita **inizia** («13:00»), non quella di fine giornata. Test in Task 1.
- Salone con più persone: lo spostamento ±15 conta solo le visite della stessa persona assegnata alla visita spostata (`assigneeOf(item, ownerUid)`), non quelle dei colleghi. Test in Task 3.
- La visita spostata non deve sovrapporsi a se stessa (va esclusa per `id`). Test in Task 1 e Task 3.
- Disdetta del cliente **di oggi** conta già nei Mancati (il giorno è arrivato); quella di domani no. Test in Task 4.

---

### Task 1: Controllo d'orario condiviso

**Files:**
- Create: `src/lib/controlloOrario.ts`
- Modify: `src/lib/orari.ts` (aggiunte in fondo)
- Modify: `src/lib/appointments.ts` (aggiunta vicino a `isStartTime`)
- Test: `src/lib/controlloOrario.test.ts`, `src/lib/orari.test.ts`, `src/lib/appointments.test.ts` (crearlo se manca; se esiste un test di `appointments.ts` con altro nome, aggiungere lì)

**Interfaces:**
- Produces:
  - `orari.ts`: `chiusuraSuperata(orari: OrariSettimana | undefined, inizio: Date, fine: Date): string | null` — `null` se orari non compilati, se l'inizio non cade in una fascia (quel caso lo gestisce già `proponibile`), o se `fine` ≤ fine della fascia che contiene l'inizio (confronto in minuti dal giorno di inizio; una fine il giorno dopo conta come sforamento). Altrimenti l'ora di fine di quella fascia, «HH:MM».
  - `orari.ts`: `prossimoGiornoAperto(orari: OrariSettimana | undefined, da: Date): Date` — `da` stesso se orari non compilati o se il giorno di `da` ha fasce; altrimenti il primo dei 6 giorni seguenti con fasce (stessa ora del giorno di `da`, via `addDays`); se nessuno, `da`.
  - `orari.ts`: `primaApertura(orari: OrariSettimana | undefined, giorno: Date): string | null` — il `da` della prima fascia del giorno, o `null`.
  - `appointments.ts`: `spostamentoInGriglia(inizio: Date, minuti: number): boolean` — `true` se i minuti del giorno di `inizio + minuti` sono ≥ 8·60 e ≤ 19·60, **oppure** se lo spostamento avvicina alla griglia una visita già fuori (es. 19:45 con −15 → `true`; 19:45 con +15 → `false`; 08:00 con −15 → `false`; 19:00 con +15 → `false`).
  - `controlloOrario.ts`:
    ```ts
    export type PersonaControllo = { uid: string; ownerUid: string }
    export function visiteCheOccupano(visite: Appointment[], giorno: Date, opzioni: { ignoraId?: string; persona?: PersonaControllo }): Appointment[]
    export function sovrapposte(inizio: Date, fine: Date, occupanti: Appointment[]): Appointment[]
    export type EsitoOrario = { sovrapposte: Appointment[]; chiudeAlle: string | null; fuoriOrario: boolean }
    export function controlloOrario(input: { inizio: Date; fine: Date; visite: Appointment[]; ignoraId?: string; persona?: PersonaControllo; orari?: OrariSettimana }): EsitoOrario
    ```
    `visiteCheOccupano` = la regola di `AppointmentForm.tsx:414-415` spostata qui (`appointmentKind !== 'personale'`, `status === STATO_PROGRAMMATO`, stesso giorno locale con `onLocalDay`, esclusa `ignoraId`, e se c'è `persona` solo `assigneeOf(item, persona.ownerUid) === persona.uid`). `sovrapposte` usa `rangesOverlap` con `fineVisita(item)` e ordina per inizio, poi `id` (come `AppointmentForm.tsx:422-426`). `fuoriOrario` = orari compilati e `!proponibile(orari, inizio, clock(inizio))`.

- [ ] **Step 1: Scrivere i test che falliscono**

  In `orari.test.ts` con `ORARI = { 1: [{da:'09:00',a:'13:00'},{da:'15:00',a:'19:00'}], 2: [...stesso], 3:…, 4:…, 5:…, 6:[{da:'09:00',a:'13:00'}] }` (domenica `0` assente):
  - `chiusuraSuperata(ORARI, lun 12:00, lun 13:00)` → `null`
  - `chiusuraSuperata(ORARI, lun 12:45, lun 14:45)` → `'13:00'`
  - `chiusuraSuperata(ORARI, lun 18:30, lun 19:30)` → `'19:00'`
  - `chiusuraSuperata(ORARI, lun 14:00, lun 15:30)` → `null` (inizio fuori fascia)
  - `chiusuraSuperata(undefined, lun 12:45, lun 14:45)` → `null`
  - `prossimoGiornoAperto(ORARI, dom 2026-11-08 10:00)` → lun 2026-11-09; con un martedì → lo stesso martedì; con `{}` → la stessa data.
  - `primaApertura(ORARI, lun)` → `'09:00'`; domenica → `null`.

  In `appointments.test.ts`: i quattro casi di `spostamentoInGriglia` scritti sopra, più 18:45 +15 → `true`.

  In `controlloOrario.test.ts`: due visite `programmato` lun 10:00–11:00 (`A`, assegnata a `u1`) e 10:30–11:30 (`B`, assegnata a `u2`), una `disdetto` 10:00, un impegno personale 10:00:
  - `controlloOrario({ inizio: 10:15, fine: 10:45, visite, orari: undefined })` → `sovrapposte` = `[A, B]`, `chiudeAlle: null`, `fuoriOrario: false`
  - con `persona: { uid: 'u1', ownerUid: 'own' }` → `[A]`
  - con `ignoraId: A.id` → `[B]`
  - `inizio: 12:45, fine: 14:45, orari: ORARI` → `chiudeAlle: '13:00'`, `fuoriOrario: false`
  - `inizio: 13:30, fine: 14:00, orari: ORARI` → `fuoriOrario: true`
  - `inizio: 11:30, fine: 12:00` → `sovrapposte` vuoto (fine di B = inizio, nessuna sovrapposizione)

- [ ] **Step 2: Lanciare i test e vederli fallire**

  Run: `npx vitest run src/lib/controlloOrario.test.ts src/lib/orari.test.ts src/lib/appointments.test.ts`
  Expected: FAIL (funzioni non esportate)

- [ ] **Step 3: Implementare le funzioni nelle posizioni e con le firme di Interfaces**

- [ ] **Step 4: Rilanciare i test**

  Run: come Step 2. Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/controlloOrario.ts src/lib/controlloOrario.test.ts src/lib/orari.ts src/lib/orari.test.ts src/lib/appointments.ts src/lib/appointments.test.ts
  git commit -m "feat(agenda): controllo d'orario condiviso"
  ```

### Task 2: Il modulo usa il controllo, avvisa chiusura e giorno chiuso

**Files:**
- Modify: `src/pages/AppointmentForm.tsx:414-430` (sostituire con `visiteCheOccupano`/`sovrapposte`), `:820-875` (righe d'avviso)
- Modify: `src/pages/AppointmentPage.tsx:1299-1305` (giorno di partenza del nuovo appuntamento)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `visiteCheOccupano`, `sovrapposte`, `chiusuraSuperata`, `prossimoGiornoAperto`, `primaApertura` (Task 1); `giornoChiuso`, `orariCompilati` da `orari.ts`.
- Produces: chiavi i18n `formFinisceDopo` (it «Finisce dopo la chiusura delle {{ora}}», en «Ends after closing time ({{ora}})», es «Termina después del cierre de las {{ora}}») e `formGiornoChiuso` (it «Il salone è chiuso questo giorno», en «The salon is closed on this day», es «El salón está cerrado este día»).

- [ ] **Step 1: Scrivere i test che falliscono** (in `AppointmentPage.test.tsx`, seguendo come quel file monta la pagina con piano che comprende `prenotazioni` e `settings.orari` = `ORARI` del Task 1)
  - `nuovo appuntamento con un servizio di 120 min, giorno lunedì, ora 12:45 → si vede «Finisce dopo la chiusura delle 13:00» e «Salva» è attivo`
  - `stesso caso alle 11:00 → nessun avviso di chiusura`
  - `/appuntamenti/nuovo?data=<una domenica> → si vede «Il salone è chiuso questo giorno»`
  - `/appuntamenti/nuovo senza data, con l'orologio finto su domenica 2026-11-08 10:00 → il campo giorno vale 2026-11-09 e l'ora scelta è 09:00`
  - `stesso caso senza orari (Go) → il giorno resta 2026-11-08`
  - Gli esistenti sui posti occupati e «Si sovrappone a …» restano verdi (regressione dello spostamento della logica).

- [ ] **Step 2: Lanciare e vederli fallire**

  Run: `npx vitest run src/pages/AppointmentPage.test.tsx`
  Expected: i nuovi FAIL, gli altri PASS

- [ ] **Step 3: Implementare**
  - `dayVisits`/`sameDay` → `visiteCheOccupano(appointments, parseDayParam(day, new Date()), { ignoraId: ignoreId, persona: showWho ? { uid: personUid, ownerUid } : undefined })`; `busy` e `clashes` usano `sovrapposte`. Testo e dialogo dell'overlap invariati.
  - Sotto l'avviso di sovrapposizione, con lo stesso stile `role="alert"`, la riga `formFinisceDopo` quando `startsAt && endsAt && chiusuraSuperata(orari, startsAt, endsAt)`. Non blocca il salvataggio e non apre dialoghi.
  - Sotto le scorciatoie dei giorni, riga `formGiornoChiuso` (stile `--tx3`, `TYPE.meta`) quando `dayValid && orariCompilati(orari) && giornoChiuso(orari[giorno.getDay()])`.
  - In `AppointmentPage.tsx` nuovo appuntamento: solo se `day === null && !fromNext` e `orariAperti`: giorno = `localDayKey(prossimoGiornoAperto(orariAperti, now))`; se è cambiato rispetto a oggi, l'ora iniziale = `primaApertura(...)` se `isStartTime`, altrimenti `''` (non `orarioProposto(now)`, che vale per oggi). Con `?data=` o `?ora=` nulla cambia.
  - Chiavi i18n nelle tre lingue.

- [ ] **Step 4: Rilanciare**

  Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/i18n`
  Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/AppointmentForm.tsx src/pages/AppointmentPage.tsx src/pages/AppointmentPage.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
  git commit -m "feat(agenda): avvisi di chiusura e giorno chiuso nel modulo"
  ```

### Task 3: −15 / +15 controllano come il modulo

**Files:**
- Modify: `src/pages/AppointmentPage.tsx` (`shiftStart` ~1025, `ClosurePending`, `confirmClosure` ~1151, i pulsanti ~519/538 e le props del componente che li disegna ~366/394)
- Modify: `src/i18n/it.ts`, `en.ts`, `es.ts`
- Test: `src/pages/AppointmentPage.test.tsx`

**Interfaces:**
- Consumes: `controlloOrario`, `PersonaControllo` (Task 1), `spostamentoInGriglia` (Task 1), `pickerMembers` (`src/lib/salonRoster.ts`) e `assigneeOf` (`src/lib/salonAccess.ts`) come in `AppointmentForm.tsx`, testo `formSovrappone` e `formFinisceDopo` (Task 2).
- Produces: chiavi `appSpostaComunque` (it «Sposta comunque», en «Move anyway», es «Mover igualmente») e `appFuoriOrario` (it «Fuori dall'orario del salone», en «Outside salon hours», es «Fuera del horario del salón»).

- [ ] **Step 1: Scrivere i test che falliscono**
  - `visita alle 19:00: «+15» è disattivato, «−15» attivo`
  - `visita alle 08:00: «−15» disattivato`
  - `visita salvata alle 19:45 (dato vecchio): «+15» disattivato, «−15» attivo`
  - `visita 10:00–11:00 e un'altra alle 11:00 dello stesso giorno: «+15» apre il dialogo con «Si sovrappone a …»; «Annulla» lascia l'inizio a 10:00; «Sposta comunque» lo porta a 10:15 e mostra il toast «Spostato…» con Annulla`
  - `con orari 9–13/15–19, visita 12:00–13:00, «+15» apre il dialogo con «Finisce dopo la chiusura delle 13:00»`
  - `nel Salone con due persone, la visita accanto è di un collega: «+15» sposta subito senza dialogo`
  - `giorno di ferie: resta il dialogo «Salone chiuso» di oggi, e dopo «Salva lo stesso» si passa al controllo d'orario` (le due conferme sono indipendenti)

- [ ] **Step 2: Lanciare e vederli fallire**

  Run: `npx vitest run src/pages/AppointmentPage.test.tsx`
  Expected: i nuovi FAIL

- [ ] **Step 3: Implementare**
  - Pulsanti: `disabled={!spostamentoInGriglia(appointment.start, ±15)}` passato dal genitore come due booleani nuovi delle props.
  - `shiftStart(appointment, minutes, superati: { chiusura?: boolean; orario?: boolean } = {})`: dopo il controllo ferie (se non `superati.chiusura`), `controlloOrario({ inizio: next, fine: next + durata, visite: appointments, ignoraId: appointment.id, persona, orari: orariAperti })` con durata = `fineVisita(appointment) − appointment.start` (la durata non cambia) e `persona` = `{ uid: assigneeOf(appointment, ownerUid), ownerUid }` solo se `pickerMembers(access).length > 0`. Se ci sono sovrapposte, `chiudeAlle` o `fuoriOrario`, e non `superati.orario`, aprire un dialogo «Orario già occupato» (titolo `formOccupato`) con le righe applicabili (`formSovrappone`, `formFinisceDopo`, `appFuoriOrario`) e i pulsanti `homeAnnulla` / `appSpostaComunque`. Il ripristino dal toast («Annulla») non fa il controllo d'orario.
  - Dialogo nuovo accanto a quello delle ferie in `withRhythm`; stato separato da `closureAsk`. Il ramo `shift` di `confirmClosure` richiama `shiftStart(..., { chiusura: true })`.

- [ ] **Step 4: Rilanciare**

  Run: `npx vitest run src/pages/AppointmentPage.test.tsx src/i18n`
  Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/AppointmentPage.tsx src/pages/AppointmentPage.test.tsx src/i18n/it.ts src/i18n/en.ts src/i18n/es.ts
  git commit -m "fix(agenda): -15/+15 con lo stesso controllo del modulo"
  ```

### Task 4: «Mancati» fino a oggi e freccia del Report

**Files:**
- Modify: `src/lib/earnings.ts:20-26` (`classify`)
- Modify: `src/pages/EarningsReportPage.tsx:204`, `src/pages/SettingsPage.tsx:868`
- Test: `src/lib/earnings.test.ts`, `src/pages/EarningsReportPage.test.tsx`

**Interfaces:**
- Produces: `classify` con firma invariata; `non_venuto` e `disdetto` con `cancelReason === 'cliente'` danno `'perso'` solo se `startOfLocalDay(a.start) <= startOfLocalDay(now)`, altrimenti `'escluso'`.

- [ ] **Step 1: Scrivere i test che falliscono**
  - `earnings.test.ts`: `classify(disdetta cliente domani, now) === 'escluso'`; `classify(disdetta cliente oggi alle 18:00, now alle 9:00) === 'perso'`; `reportOf` del mese con una disdetta cliente futura → `mancati` vuoto e importo mancato 0.
  - `EarningsReportPage.test.tsx`: la freccia indietro porta a `/incassi` aprendo `/incassi/report` senza stato; porta a `/impostazioni` se la pagina è aperta con `state: { da: 'impostazioni' }`.

- [ ] **Step 2: Lanciare e vederli fallire**

  Run: `npx vitest run src/lib/earnings.test.ts src/pages/EarningsReportPage.test.tsx`
  Expected: i nuovi FAIL

- [ ] **Step 3: Implementare**
  - `classify` come in Interfaces. Aggiornare i test esistenti che contavano disdette future come perse solo se lo richiedono, spiegandolo nel report.
  - `EarningsReportPage`: `backTo={location.state?.da === 'impostazioni' ? '/impostazioni' : '/incassi'}` (`useLocation`). `SettingsPage.tsx:868`: il `Link` passa `state={{ da: 'impostazioni' }}`. Nota: lo stato della cronologia resta con la ricarica nella stessa scheda (si torna a Impostazioni); un link aperto da zero torna a Incassi. Accettato come scelta di Claude.

- [ ] **Step 4: Rilanciare**

  Run: `npx vitest run src/lib/earnings.test.ts src/lib/earningsExport.test.ts src/lib/registroModello.test.ts src/lib/earningsLingua.test.ts src/pages/EarningsReportPage.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/earnings.ts src/lib/earnings.test.ts src/pages/EarningsReportPage.tsx src/pages/EarningsReportPage.test.tsx src/pages/SettingsPage.tsx
  git commit -m "fix(incassi): mancati solo fino a oggi; freccia del report torna da dove si arriva"
  ```

### Task 5: Ultima ora del calendario

Causa (letta nel codice): nella colonna delle ore (`CalendarPage.tsx:1192-1209`) l'etichetta di un'ora vuota sta a metà della sua fascia (`segment.top + segment.height / 2`), quella di chiusura invece sul bordo (`top: laid.height`). Tra «18:00» e «19:00» restano così 18 px contro i 36 delle altre ore, e l'etichetta finale esce dall'altezza della colonna e viene tagliata.

**Files:**
- Modify: `src/lib/calendarLayout.ts` (funzione nuova)
- Modify: `src/pages/CalendarPage.tsx:1192-1209`
- Test: `src/lib/calendarLayout.test.ts`, `src/pages/CalendarPage.test.tsx`

**Interfaces:**
- Produces: `calendarLayout.ts`: `topEtichettaChiusura(segments: DaySegment[], height: number): number` — se l'ultimo segmento è `empty`: `height + ultimo.height / 2` (stessa distanza fra etichette delle altre ore); se è un `group` o non ci sono segmenti: `height` (le tacche dei gruppi stanno sul bordo superiore).

- [ ] **Step 1: Scrivere i test che falliscono**
  - `calendarLayout.test.ts`: con `daySegments([], 8, 19)`, `topEtichettaChiusura` − top dell'etichetta delle 18 (`top + height/2` dell'ultimo vuoto) === `EMPTY_HOUR_PX`; con una visita 18:00–19:00 come ultimo gruppo → `height`.
  - `CalendarPage.test.tsx`: vista Giorno vuota, l'etichetta «19:00» ha `top` uguale a `topEtichettaChiusura(...)` e la colonna delle ore è alta almeno quel valore più l'altezza di una riga d'etichetta (nessun ritaglio).

- [ ] **Step 2: Lanciare e vederli fallire**

  Run: `npx vitest run src/lib/calendarLayout.test.ts src/pages/CalendarPage.test.tsx`
  Expected: i nuovi FAIL

- [ ] **Step 3: Implementare**
  - `topEtichettaChiusura` come in Interfaces; in `CalendarPage` l'etichetta di chiusura usa quel `top` con lo stesso `translateY(-50%)` delle etichette vuote quando l'ultimo segmento è vuoto; la colonna delle ore e lo spazio sotto la griglia crescono quanto serve perché l'etichetta resti intera (anche su desktop). Le visite e la linea «adesso» non si spostano.

- [ ] **Step 4: Rilanciare**

  Run: come Step 2. Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/calendarLayout.ts src/lib/calendarLayout.test.ts src/pages/CalendarPage.tsx src/pages/CalendarPage.test.tsx
  git commit -m "fix(calendario): ultima ora alta come le altre e 19:00 intera"
  ```

### Task 6: Verifica sull'emulatore

Eseguita dopo la revisione finale del ramo, da un agente sul modello più capace.

**Files:**
- Create: `QA-tests/.qa-catalog/verify-basse-agenda.cjs` (sul modello di `verify-validazioni-browser.cjs` / `verify-agenda-incassi.cjs`: account creati con firebase-admin con `legacy: false`, filtro `--solo=`, screenshot in `QA-tests/results/basse-agenda/`, cancellazione degli account alla fine salvo `--keep`)

- [ ] **Step 1: Scrivere lo script con questi casi, a 320/360/390 px**
  - S1 Go: visita 10:00–11:00 e un'altra alle 11:00 → «+15» apre «Orario già occupato»; «Sposta comunque» → Firestore `start` 10:15.
  - S2 Go: visita alle 19:00 → «+15» disattivato; «Modifica» ha 19:00 scelto.
  - S3 Plus con orari 9–13/15–19: nuovo appuntamento di 120 min alle 12:45 → riga «Finisce dopo la chiusura delle 13:00», salvataggio riuscito.
  - S4 Plus con orari, orologio della pagina su domenica: nuovo appuntamento senza data → giorno lunedì, ora 09:00; con `?data=` domenica → «Il salone è chiuso questo giorno».
  - S5 Go: disdetta del cliente fra 10 giorni nel mese → il Report non la conta in «Mancati».
  - S6 Incassi → Report → freccia → `/incassi`; Impostazioni → Report → freccia → `/impostazioni`.
  - S7 Calendario, Giorno vuoto, 390 px e 1280 px: distanza fra le etichette «18:00» e «19:00» uguale a quella fra «17:00» e «18:00» (±1 px), «19:00» interamente visibile dopo lo scorrimento in fondo (misurato con `getBoundingClientRect`).

- [ ] **Step 2: Lanciarlo con emulatori e Vite accesi (sezione «Ambiente di test» di `PROGRESS.md`)**

  Run: `node QA-tests/.qa-catalog/verify-basse-agenda.cjs`
  Expected: `7/7` e screenshot salvati

- [ ] **Step 3: Commit**

  ```bash
  git add QA-tests/.qa-catalog/verify-basse-agenda.cjs
  git commit -m "test(agenda): verifica basse Agenda sull'emulatore"
  ```
