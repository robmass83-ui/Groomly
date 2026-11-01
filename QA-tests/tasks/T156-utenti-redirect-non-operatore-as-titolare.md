# T156-utenti-redirect-non-operatore-as-titolare: Utenti - redirect per non operatore

| Field | Value |
|---|---|
| Route | `/impostazioni/utenti` |
| Source | `src/pages/UsersPage.tsx` |
| Flow | Non operatore reindirizzato a /impostazioni |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare (non operatore). Nota: la UI operatore non è testabile, manca un account operatore nelle credenziali QA.

## Test data
- Nessun input.

## Steps

### TC-01: Redirect
1. Sign in as titolare. Navigate to `/impostazioni/utenti`.
2. Assert: URL finale è `/impostazioni` e non `/impostazioni/utenti`.
3. Assert: nessun elemento della UI operatore visibile (`Toelettature`, `Suggerimenti`, `Esporta`, `Elimina toelettatura`).
4. Clicca **Indietro** del browser. Assert: non si riapre `/impostazioni/utenti` (redirect con replace; si esce dalla sessione di navigazione precedente).

### TC-02: Query string
1. Navigate to `/impostazioni/utenti?zona=saloni`. Assert: URL finale `/impostazioni`.
2. Navigate to `/impostazioni/utenti?zona=salone&id=inesistente`. Assert: URL finale `/impostazioni`.

## Assertions
- [ ] Un titolare non operatore atterra su /impostazioni
- [ ] URL finale non è /impostazioni/utenti
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Pagina di destinazione dopo il redirect

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
