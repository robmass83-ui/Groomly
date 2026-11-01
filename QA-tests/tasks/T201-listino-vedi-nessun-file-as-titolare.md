# T201-listino-vedi-nessun-file-as-titolare: Listino - vista senza file

| Field | Value |
|---|---|
| Route | `/listino/vedi` |
| Source | `src/pages/PriceViewPage.tsx` |
| Flow | Empty state Nessun file |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: account senza alcun file di listino caricato

## Test data
- Nessun input.

## Steps

### TC-01: Happy path - Stato vuoto
1. Sign in as titolare. Navigate to `/listino/vedi`.
2. Assert: intestazione "Listino" e testo "Nessun file".
3. Assert: nessun pulsante **Apri** e nessuna immagine.

### TC-02: Indietro
1. Click **Indietro**. Assert: URL `/listino`.

### TC-03: Edge cases
- `/listino/vedi?id=id-inesistente-xyz`: mostra "Nessun file" o un testo di errore; nessun crash.
- Reload su `/listino/vedi`: stesso risultato.

## Assertions
- [ ] "Nessun file" visibile quando non c'e file.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato "Nessun file"

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
