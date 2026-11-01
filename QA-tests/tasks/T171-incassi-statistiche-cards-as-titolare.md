# T171-incassi-statistiche-cards-as-titolare: Statistiche — card Euro l'ora, Previsione, In ritardo

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx` |
| Flow | View stats cards (Euro l’ora, Previsione, In ritardo) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Seed: Euro l’ora 31, Previsione 14838, In ritardo 0 (values may shift with the date; assert numeric format and compare to seed when the seed is unchanged)

## Test data
- Expected cards: `Euro l’ora: <n>`, `Previsione: <n>`, `In ritardo: <n>`

## Steps

### TC-01: Happy path — Vedere le statistiche
1. Sign in as `titolare`. Navigate to `/incassi/report`, then open the Statistiche entry (or navigate to `/incassi/statistiche`).
2. Assert: heading `Statistiche` visible.
3. Assert: three cards render with numeric values: `Euro l’ora` (seed 31), `Previsione` (seed 14838), `In ritardo` (seed 0). No `NaN`, `undefined` or empty values.
4. Reload. Assert: identical values.
5. Click **`Indietro`**. Assert: URL `/incassi/report`.

### TC-02: Coerenza con i dati
1. Navigate to `/incassi?periodo=giorno` and `/incassi/report`. Assert: pages render without error and `Previsione` is not smaller than the total shown for already-registered revenue in the forecast period (record both numbers).

### TC-03: Tab bar
| Button | Action taken | Expected result |
|---|---|---|
| `Aggiungi` (FAB) | click | `/appuntamenti/nuovo` |
| `Home` | click | `/` |
| `Agenda` | click | `/calendario` |
| `Impostazioni` | click | `/impostazioni` |

## Assertions
- [ ] Heading and three cards visible with numeric values.
- [ ] `Indietro` goes to `/incassi/report`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
