# T004-home-oggi-as-collaboratore: Home (Oggi) come collaboratore

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx` |
| Flow | Vedere gli appuntamenti di oggi |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`.
- Sign in as `collaboratore` (stesso salone del titolare).
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T004 Fido"` (annota `salonId`).

## Test data
- `nomeCane = "QA T004 Fido"`, ospite «Ospite QA T004 Fido».

## Steps

### TC-01: Happy path - Home e chiusura visita ospite (AC1, AC4, AC6)
1. `check-c1.cjs <salonId> "QA T004 Fido"`: annota N0.
2. Sign in as collaboratore osservando la Home dal primo istante. Assert: mai «Cane eliminato» né «Rimuovi dalla lista» durante il caricamento.
3. Attendi 15 s. `check-c1.cjs`. Assert: `visiteNelSalone` = N0.
4. Assert: DA CHIUDERE mostra «Ospite QA T004 Fido», non «Cane eliminato».
5. Premi **`Completato Ospite QA T004 Fido`**. Assert: la riga esce da DA CHIUDERE; nel cloud `qat004fido-ospite` = `completato`.
6. Assert: tile Mensili e link Incassi di oggi visibili; **Nuovo appuntamento** apre il foglio.

### TC-02: Negative & edge
- Collaboratore non vede voci riservate al titolare in Impostazioni (link visibile ma pagina limitata): nessun errore in console.

## Assertions
- [ ] Conteggio visite nel cloud invariato dopo login + 15 s.
- [ ] Nessun «Cane eliminato» durante il caricamento.
- [ ] Ospite col suo nome.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Home primo istante, Home a regime, esito `check-c1.cjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01 |
| AC-4 | AC4 Nei primi istanti dopo il login, mentre i dati caricano, la Home non mostra «Cane eliminato» né «Rimuovi dalla lista» | TC-01 |
| AC-6 | AC6 Una visita da chiudere di un ospite (prenotazione online senza scheda cane) mostra il nome dell'ospite, mai «Cane eliminato», in Home e in Incassi | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
