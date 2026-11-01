# T010-animali-as-titolare-go: Animali - rendering come titolare-go

| Field | Value |
|---|---|
| Route | `/animali` |
| Source | `src/pages/DogsPage.tsx` |
| Flow | Page renders and core interactions as free owner |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go
- Seed: at least 1 animal named "Bella"

## Test data
- `query = "Bella"`

## Steps

### TC-01: Happy path - lista e ricerca
1. Sign in as titolare-go. Navigate to `/animali`.
2. Assert: header "Animali", subtitle "N attivi · M in archivio", tab **Attivi** selected, chip **Tutti** pressed.
3. Fill "Cerca" with `Bella`. Assert: row **Apri Bella** is visible.
4. Click **Apri Bella**. Assert: URL matches `/animali/<id>`.

### TC-02: Tab tolti per piano
1. Back on `/animali`, assert tab **In attesa** is absent (waiting-list service is not on for the free plan).

### TC-03: Ordina
1. Click **Ordina**. Assert: two options; click **Chiudi**, sheet closes.

## Assertions
- [ ] List renders for the free owner.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
