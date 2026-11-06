# T174-incassi-statistiche-navigazione-as-titolare: Statistiche — navigazione e FAB

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx` |
| Flow | Back to /incassi/report |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`

## Test data
- Tab bar targets: `Home` `/`, `Animali` `/animali`, `Agenda` `/calendario`, `Mensili` `/mensili`, `Listino` `/listino`, `Altro` `/altro`.

## Steps

### TC-01: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Indietro` | click | `/incassi/report` |
| `Aggiungi` (FAB) | click | `/appuntamenti/nuovo`, sheet `Nuovo appuntamento` opens |
| `Home` | click | `/` |
| `Animali` | click | `/animali` |
| `Agenda` | click | `/calendario` |
| `Mensili` | click | `/mensili` |
| `Listino` | click | `/listino` |
| `Altro` | click | `/altro` |

For each row: navigate to `/incassi/statistiche` first, perform the click, assert the destination heading.

### TC-02: Negative & edge cases
- Browser back from `/incassi/report` returns to `/incassi/statistiche` with the same card values.
- Add a query string `?x=1` to the route. Assert: page still renders.

## Assertions
- [ ] Every control navigates to the expected route.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
