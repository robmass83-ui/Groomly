# T183-listino-carica-file: Listino - carica e rinomina file

| Field | Value |
|---|---|
| Route | `/listino` |
| Source | `src/pages/ListinoPage.tsx` |
| Flow | Upload a price-list PDF and see it listed; rename |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Storage emulator running; empty file list ("Nessun file")
- Fixture: small PDF `listino.pdf` (< FILE_MAX_BYTES) and a file larger than FILE_MAX_BYTES `grande.pdf`

## Test data
- `file = listino.pdf`
- `newName = "Listino 2026.pdf"`
- `emptyName = ""`
- `tooBig = grande.pdf`

## Steps

### TC-01: Happy path - upload
1. Sign in as titolare. Navigate to `/listino`. Assert "Nessun file".
2. Click **Aggiungi il tuo listino prezzi** and choose `listino.pdf` in the file chooser (accept pdf, image/*).
3. Assert: "Nessun file" disappears; a row `listino.pdf` appears with **Rinomina listino.pdf** and **Elimina listino.pdf** and a link to `/listino/vedi?id=`.
4. Reload. Assert: the file is still listed.

### TC-02: Rinomina
1. Click **Rinomina listino.pdf**. Assert: inline field "Nome di listino.pdf".
2. Fill `Listino 2026.pdf`, press Enter. Assert: row shows the new name; reload keeps it.
3. Rinomina again, fill `emptyName`, press Enter. Assert: name unchanged (empty ignored).
4. Rinomina, type another name, press Escape. Assert: name unchanged.
5. Rinomina, type `Blur QA {runId}`, click elsewhere. Assert: name committed.

### TC-03: Negative
- Upload `tooBig`: assert an error toast about size and no new row.
- Upload an unusable image (corrupt .jpg): assert a toast and no new row.

## Assertions
- [ ] Uploaded file listed and persisted.
- [ ] Rename Enter/Escape/blur behave as above.
- [ ] No console errors other than expected rejections.

## Screenshots required
- Empty state
- File listed
- Rename input
- Error toast

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
