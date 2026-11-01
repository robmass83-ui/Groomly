# T173-incassi-statistiche-as-collaboratore: Statistiche — visibilità del collaboratore

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx` |
| Flow | Collaboratore sees only visibleAppointments per spettatoreIncassi |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore`
- Seed: the titolare's values are Euro l’ora 31, Previsione 14838, In ritardo 0 (from T171)

## Test data
- Expected cards: `Euro l’ora`, `Previsione`, `In ritardo`

## Steps

### TC-01: Happy path — Statistiche filtrate
1. Sign in as `collaboratore`. Navigate to `/incassi/statistiche`.
2. Assert: heading `Statistiche` and three cards with numeric values (no `NaN`).
3. Assert: `Previsione` is less than or equal to the titolare's 14838 (the collaboratore sees only the appointments visible to them).
4. Reload. Assert: values unchanged.
5. Click **`Indietro`**. Assert: URL `/incassi/report` renders (or the lock view for the collaboratore; record which).

### TC-02: Negative
- Navigate to `/incassi/statistiche` after signing out. Assert: redirect to `/login`.

## Assertions
- [ ] Values never exceed the owner's values.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
