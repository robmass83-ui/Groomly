# T044-appuntamento-personale-chiudi-data: Modal - Appuntamento personale chiudi e data preimpostata

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Modal coverage - open, preset date, close without saving |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `data = "2026-11-05"`
- `titolo = "Non salvare QA {runId}"`

## Steps

### TC-01: Happy path - dialog e data da query
1. Sign in as titolare. Navigate to `/appuntamenti/personale/nuovo?data=2026-11-05`.
2. Assert: dialog "Appuntamento personale" with 4 inputs (Titolo, Data, Ora di inizio, Ora di fine); "Data" = `2026-11-05`.
3. Fill Titolo `Non salvare QA {runId}`, inizio `10:00`. Click **Chiudi**.
4. Assert: dialog closes, redirected to `/` (opened directly).
5. Open `/calendario` on 2026-11-05. Assert: no entry "Non salvare QA {runId}".

### TC-02: Salva con data modificata
1. Open `/appuntamenti/personale/nuovo`. Change "Data" to `2026-11-06`, Titolo `Data cambiata QA {runId}`, inizio `08:00`. Click **Salva**.
2. Assert: entry appears on 2026-11-06 and not today.

### TC-03: Edge
- Open the dialog without query param. Assert Data equals today's date.
- Open with `?data=non-valida`. Assert: no crash; Data falls back to a valid date or empty without console error.

## Assertions
- [ ] Chiudi saves nothing.
- [ ] Date preset works.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Dialog opened with preset date
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
