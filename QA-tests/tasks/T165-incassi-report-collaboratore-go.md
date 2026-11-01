# T165-incassi-report-collaboratore-go: Incassi - collaboratore e titolare-go

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Accesso per ruolo; link al Report |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`, poi ripeti con `titolare-go`.
- Fixture per ciascun ruolo: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo> "QA T165 Fido"` (collaboratore) e `"QA T165 Fido Go"` (titolare-go); annota `salonId`.

## Test data
- Cani `QA T165 Fido` e `QA T165 Fido Go`; periodo `Settimana`.

## Steps

### TC-01: Happy path - collaboratore (AC1, AC6)
1. `check-c1.cjs <salonId> "QA T165 Fido"`: N0.
2. Sign in as collaboratore, apri `/incassi?periodo=settimana`. Assert: titolo «Incassi»; il pulsante **Nascondi importi** non è presente.
3. Se c'è **Chiudi ›**, premilo: in Home l'ospite è «Ospite QA T165 Fido», mai «Cane eliminato».
4. Premi **`Report ed esportazione ›`**: URL `/incassi/report`.
5. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0.

### TC-02: titolare-go
1. Sign in as titolare-go, apri `/incassi`. Assert: pagina renderizzata con KPI; **Report ed esportazione ›** apre il report.
2. `check-c1.cjs <salonId> "QA T165 Fido Go"`: visite invariate dopo 15 s.

## Assertions
- [ ] Il collaboratore non vede Nascondi importi.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Incassi collaboratore, Incassi titolare-go

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login e 15 s il numero di visite nel cloud è invariato | TC-01, TC-02 |
| AC-6 | AC6 L'ospite mostra il suo nome, mai «Cane eliminato» | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
