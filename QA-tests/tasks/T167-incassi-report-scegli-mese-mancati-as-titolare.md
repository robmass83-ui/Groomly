# T167-incassi-report-scegli-mese-mancati-as-titolare: Incassi e report - Scegli il mese e Mancati (ospite e cane eliminato)

| Field | Value |
|---|---|
| Route | `/incassi/report` |
| Source | `src/pages/EarningsReportPage.tsx` |
| Flow | Pick a month; open Mancati |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T167 Fido"` (annota `salonId`).

## Test data
- Ospite `qat167fido-ospite` (Bagno 20 euro, ieri); da chiudere `qat167fido-dachiudere` (20 euro, ieri). Mese `Ott`/`Nov` 2026.

## Steps

### TC-01: Happy path - Mancati con ospite e cane eliminato (AC6, AC3)
1. Elimina il cane `/animali/qat167fido-dog` (Menu → Elimina definitivamente → **Elimina**).
2. In Home premi **`Disdetto Ospite QA T167 Fido`** → **`Cliente`**, poi **`Non venuto Cane eliminato`**.
3. `check-c1.cjs <salonId> "QA T167 Fido"`: ospite disdetto, da chiudere non venuto (salvati nel cloud).
4. Apri `/incassi/report`, scegli il periodo che include ieri (**Questo mese** o **Scegli...** → mese).
5. Premi **`Mancati`**. Assert: sheet «Mancati» con due righe: «Ospite QA T167 Fido» (mai «Cane eliminato») e «Cane eliminato», con quando, motivo, importo 20 ciascuna; totale 40 euro in più rispetto al valore iniziale.

### TC-02: Scegli il mese
1. Premi **`Scegli...`**: dialog «Scegli il mese». Assert: mesi futuri disabilitati; i mesi con incassi mostrano il totale in euro.
2. **Anno precedente** / **Anno successivo**: l'anno cambia. Scegli **Ott**: il report mostra Ottobre.

## Assertions
- [ ] Mancati elenca l'ospite col suo nome.
- [ ] Le visite del cane eliminato restano e sono «Cane eliminato».
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Dialog Scegli il mese, sheet Mancati

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 La visita da chiudere del cane eliminato si chiude (Non venuto) e lo stato è salvato nel cloud | TC-01 |
| AC-6 | AC6 L'ospite mostra il suo nome, mai «Cane eliminato», in Home e in Incassi/Report | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
