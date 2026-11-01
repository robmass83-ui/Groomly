# T308-impegno-o-promemoria: Nel modulo si sceglie Impegno o Promemoria; l'interruttore solo nel Salone

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx`, `src/components/domain/PersonalAppointment.tsx`, `src/pages/HomePage.tsx` |
| Flow | Creare un impegno e un promemoria da Home/agenda; controllare l'interruttore nel Salone e fuori |
| Requires auth | yes |
| Required role | titolare-salone, titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Il modulo dell'impegno personale si apre dal pulsante «+» / agenda (cerca la voce per un impegno personale) o dall'URL della pagina personale nuova (trova la rotta in `src/app/router.tsx`).

## Test data
- Impegno «QA T308 Dentista» oggi 23:00–23:30 (orario tardo per non disturbare); promemoria «QA T308 Chiamare fornitore» oggi 22:30.

## Steps

### TC-01: Salone — scelta e interruttore (AC1, AC2)
1. Sign in as titolare-salone, apri il modulo nuovo impegno personale.
2. Assert: in alto la scelta «Impegno» / «Promemoria» con Impegno selezionato e la frase «L’impegno toglie l’orario dalle prenotazioni online. Il promemoria resta solo in agenda.»; c'è l'interruttore «Blocca l’orario per le prenotazioni online» acceso.
3. Scrivi il titolo «QA T308 Dentista», ora 23:00, senza fine → salva. Assert: errore sull'ora di fine, non si salva.
4. Metti fine 23:30 → salva. Assert: salvato; compare in Home/agenda come impegno.

### TC-02: Promemoria (AC3)
1. Apri di nuovo il modulo, scegli «Promemoria». Assert: l'ora di fine sparisce, l'interruttore sparisce.
2. Titolo «QA T308 Chiamare fornitore», ora 22:30 → salva.
3. Assert: in Home (se oggi) o in agenda il promemoria si distingue dall'impegno (icona diversa e/o scritta «Promemoria»). Screenshot di entrambi.
4. Con firebase-admin leggi i due documenti in `salons/<salonId>/appointments` (filtra `title` che inizia con «QA T308»): il promemoria ha `promemoria: true`; l'impegno ha `plannedEnd` e nessun `promemoria`/`bloccaOnline`.

### TC-03: Fuori dal Salone niente interruttore (AC4)
1. Sign in as titolare (Plus), apri il modulo nuovo impegno personale.
2. Assert: c'è la scelta Impegno/Promemoria ma NON l'interruttore «Blocca l’orario…».

## Assertions
- [ ] Scelta presente, fine obbligatoria per l'impegno, interruttore solo nel Salone, promemoria riconoscibile.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Modulo nel Salone (scelta + interruttore)
- Errore fine mancante
- Home/agenda con impegno e promemoria
- Modulo fuori dal Salone

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Nel modulo c'è la scelta Impegno/Promemoria (Impegno di partenza) con la spiegazione | TC-01 |
| AC-2 | AC2 L'impegno non si salva senza ora di fine; nel Salone c'è l'interruttore acceso | TC-01 |
| AC-3 | AC3 Il promemoria si salva senza fine, con promemoria true, e si distingue in Home/agenda | TC-02 |
| AC-4 | AC4 Fuori dal Salone l'interruttore non compare | TC-03 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
