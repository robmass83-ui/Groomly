# T169-incassi-report-as-titolare-go: Incassi e report - piano gratuito (paywall export)

| Field | Value |
|---|---|
| Route | `/incassi/report` |
| Source | `src/pages/EarningsReportPage.tsx` |
| Flow | Open export (paywall on free plan) |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `titolare-go`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare-go> "QA T169 Fido"` (annota `salonId`).

## Test data
- Cane `QA T169 Fido`; periodo `Anno`.

## Steps

### TC-01: Happy path - report e paywall (AC1)
1. `check-c1.cjs`: N0.
2. Apri `/incassi/report`. Assert: preset «Questo mese» premuto, KPI visibili.
3. Premi **`Anno`**: i KPI cambiano; premi **`Esporta`**. Assert: compare il paywall invece del foglio di esportazione (nessun download).
4. Chiudi il paywall e premi **`Mancati`**: sheet «Mancati» si apre e si chiude.
5. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0.

## Assertions
- [ ] Export bloccato dal paywall.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Report, paywall

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
