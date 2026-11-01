# T149-suggerimenti-as-titolare-go: Suggerimenti - invio come titolare-go

| Field | Value |
|---|---|
| Route | `/impostazioni/suggerimenti` |
| Source | `src/pages/SuggerimentiPage.tsx` |
| Flow | Send suggestion as free owner |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go

## Test data
- `testo = "Manca la possibilita di duplicare un appuntamento."`

## Steps

### TC-01: Happy path
1. Sign in as titolare-go. Open `/impostazioni/suggerimenti`.
2. Click **Manca una funzione**. Fill textarea with `testo`. Click **Invia**.
3. Assert: "Grazie" dialog, then **Chiudi** closes it.

### TC-02: Validazione
1. Open **Si puo fare meglio**, type `corto`, click **Invia**. Assert: "Scrivi almeno 10 caratteri.".

## Assertions
- [ ] No console errors.

## Screenshots required
- Thanks dialog

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
