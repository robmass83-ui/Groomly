# T172-incassi-statistiche-as-titolare-go: Statistiche — titolare free

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx` |
| Flow | View stats cards |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare-go`

## Test data
- Expected cards: `Euro l’ora`, `Previsione`, `In ritardo`

## Steps

### TC-01: Happy path — Statistiche
1. Sign in as `titolare-go`. Navigate to `/incassi/statistiche`.
2. Assert: either heading `Statistiche` with three numeric cards, or a plan-gating message/redirect; record which and assert it is consistent after a reload.
3. If rendered, assert no `NaN`/`undefined` in the cards.
4. Click **`Indietro`**. Assert: URL `/incassi/report`.

### TC-02: Negative
- With zero data the cards show `0` and not blanks. Assert the format is numeric.

## Assertions
- [ ] Page renders or gates cleanly.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
