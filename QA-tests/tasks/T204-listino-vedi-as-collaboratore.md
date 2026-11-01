# T204-listino-vedi-as-collaboratore: Listino - vista collaboratore

| Field | Value |
|---|---|
| Route | `/listino/vedi` |
| Source | `src/pages/PriceViewPage.tsx` |
| Flow | Empty state / View price list |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore

## Test data
- Nessun input.

## Steps

### TC-01: Happy path
1. Sign in as collaboratore. Navigate to `/listino/vedi`.
2. Assert: intestazione "Listino" (nessun redirect). Se non c'e file: testo "Nessun file"; altrimenti immagine o nome PDF con **Apri**.
3. Click **Indietro**. Assert: URL `/listino`.

## Assertions
- [ ] Il collaboratore raggiunge la pagina.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
