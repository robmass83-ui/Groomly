# T150-suggerimenti-navigazione: Suggerimenti - rendering e navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni/suggerimenti` |
| Source | `src/pages/SuggerimentiPage.tsx` |
| Flow | Page renders; back; offline send |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `testo = "Prova invio offline QA {runId}"`

## Steps

### TC-01: Rendering
1. Navigate to `/impostazioni/suggerimenti`. Assert: title "Suggerimenti"; 4 type rows + accordion.
2. Click **Indietro**. Assert: URL `/impostazioni`.

### TC-02: Negative - invio senza rete
1. Open **Qualcosa non funziona**, fill `testo`, set the browser offline, click **Invia**.
2. Assert: message "Invio non riuscito. La nota non e partita." appears; no "Grazie" dialog; text remains.
3. Restore network.

## Assertions
- [ ] Failure message displayed offline.
- [ ] No unhandled console errors.

## Screenshots required
- Page initial load
- Error state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
