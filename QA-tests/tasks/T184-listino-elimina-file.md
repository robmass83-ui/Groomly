# T184-listino-elimina-file: Destructive - Elimina file listino

| Field | Value |
|---|---|
| Route | `/listino` |
| Source | `src/pages/ListinoPage.tsx` |
| Flow | Delete uploaded file via confirm dialog |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Storage emulator running
- Fixture: `listino.pdf`

## Test data
- `file = listino.pdf`

## Steps

### TC-01: Setup
1. Sign in as titolare. Navigate to `/listino`. If no file listed, upload `listino.pdf` via **Aggiungi il tuo listino prezzi**. Assert row appears.

### TC-02: Destructive - annulla
1. Click **Elimina listino.pdf**.
2. Assert: confirm dialog "Elimina?" with **Annulla** and **Elimina**.
3. Click **Annulla**. Assert: dialog closes; the row remains.

### TC-03: Destructive - conferma
1. Click **Elimina listino.pdf**, then **Elimina** in the dialog.
2. Assert: dialog closes; row gone; "Nessun file" shown again.
3. Reload. Assert: still "Nessun file".

## Assertions
- [ ] Cancel keeps data; confirm deletes and persists.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Confirm dialog
- Final empty state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
