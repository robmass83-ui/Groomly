# T146-suggerimenti-invio: Suggerimenti - invio di una nota

| Field | Value |
|---|---|
| Route | `/impostazioni/suggerimenti` |
| Source | `src/pages/SuggerimentiPage.tsx` |
| Flow | Open a category and send a valid suggestion |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Functions emulator running (callable `inviaSuggerimento`); without it the error "Invio non riuscito. La nota non e partita." is expected

## Test data
- `testo = "La schermata animali e lenta quando filtro per razza."`

## Steps

### TC-01: Happy path - inviare
1. Sign in as titolare. Navigate to `/impostazioni/suggerimenti`.
2. Assert: 4 type rows (Qualcosa non funziona, E scomodo, Si puo fare meglio, Manca una funzione) and 1 accordion row "Una parte dell'app".
3. Click **Qualcosa non funziona**. Assert: dialog with that category title, textarea "Scrivi qui", counter "0 / 2000".
4. Fill the textarea with `testo`. Assert counter shows the character count / 2000.
5. Click **Invia**.
6. Assert: dialog "Grazie" appears with **Chiudi**. Click **Chiudi**; dialog closes.

### TC-02: Errore di invio
1. If the callable is unavailable, repeat the send and assert the message "Invio non riuscito. La nota non e partita." and the dialog stays open with the text kept.

## Assertions
- [ ] Thanks dialog after successful send.
- [ ] No console errors other than expected callable failure.
- [ ] No unexpected failed network requests.

## Screenshots required
- Page initial load
- Category dialog
- Thanks dialog

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
