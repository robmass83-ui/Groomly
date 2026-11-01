# T102-avvisi-vuoto-as-titolare-go: Avvisi — stato vuoto come titolare free

| Field | Value |
|---|---|
| Route | `/impostazioni/avvisi` |
| Source | `src/pages/AvvisiSistemaPage.tsx` |
| Flow | View empty state "Nessuna notifica" |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare-go` (free owner)
- Seed: no system notices

## Test data
- None to type.

## Steps

### TC-01: Happy path — Visualizzare Avvisi
1. Sign in as `titolare-go`. Navigate to `/impostazioni/avvisi`.
2. Assert: no redirect; heading `Avvisi` visible.
3. Assert: `Nessuna notifica` with description.
4. Assert: no compose icon and no `Elimina avviso`.
5. Click **`Indietro`**. Assert: URL `/impostazioni`.

### TC-02: Negative & edge cases
- Reload the page. Assert: same state, no flash of an error.
- Assert: the `Aggiungi` FAB is the only action control besides `Indietro`.

## Assertions
- [ ] Empty state visible, no operator controls.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
