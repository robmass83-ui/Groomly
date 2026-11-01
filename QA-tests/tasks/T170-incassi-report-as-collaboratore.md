# T170-incassi-report-as-collaboratore: Incassi e report - collaboratore

| Field | Value |
|---|---|
| Route | `/incassi/report` |
| Source | `src/pages/EarningsReportPage.tsx` |
| Flow | Switch period; open Mancati |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T170 Fido"` (annota `salonId`).

## Test data
- Cane `QA T170 Fido`; ospite «Ospite QA T170 Fido».

## Steps

### TC-01: Happy path - report come collaboratore (AC1, AC6)
1. `check-c1.cjs`: N0.
2. In Home premi **`Non venuto Ospite QA T170 Fido`**: la riga esce; nel cloud `qat170fido-ospite` è non venuto.
3. Apri `/incassi/report`. Assert: preset «Questo mese» premuto; KPI visibili (o importi coerenti con i permessi del ruolo).
4. Premi **`Mancati`**. Assert: la riga dell'ospite mostra «Ospite QA T170 Fido», mai «Cane eliminato».
5. Premi **`Anno`** e **Anno precedente**: i dati cambiano senza errori.
6. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0.

### TC-02: Permessi
- Se il ruolo non può esportare, **Esporta** non invia nulla (paywall/blocco), nessun errore in console.

## Assertions
- [ ] Il collaboratore legge il report.
- [ ] Ospite col suo nome in Mancati.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Report, sheet Mancati

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login e 15 s il numero di visite nel cloud è invariato | TC-01 |
| AC-6 | AC6 L'ospite mostra il suo nome, mai «Cane eliminato», in Home e in Incassi/Report | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
