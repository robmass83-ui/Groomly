# T185-listino-as-titolare-go: Listino - rendering e upload come titolare-go

| Field | Value |
|---|---|
| Route | `/listino` |
| Source | `src/pages/ListinoPage.tsx` |
| Flow | Page renders and file list as free owner |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go
- Fixture: `listino.pdf`

## Test data
- `file = listino.pdf`

## Steps

### TC-01: Happy path
1. Sign in as titolare-go. Navigate to `/listino`.
2. Assert: header "Listino prezzi", the 3 sections, table with 4 columns, **Piccola** pressed.
3. Click **Aggiungi il tuo listino prezzi**, choose `listino.pdf`. Assert: row `listino.pdf` appears.
4. Click **Elimina listino.pdf**, then **Elimina**. Assert: row removed (cleanup).

### TC-02: Navigazione
1. Click **Gestione listino**. Assert: URL `/listino/gestione`. Go back.
2. Click **Modifica**. Assert: URL `/impostazioni/servizi`.

## Assertions
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
