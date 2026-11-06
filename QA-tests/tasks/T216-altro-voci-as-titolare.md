# T216-altro-voci-as-titolare: Altro - voci e navigazione

| Field | Value |
|---|---|
| Route | `/altro` |
| Source | `src/pages/AltroPage.tsx` |
| Flow | Aprire Altro dalla barra e seguire le voci |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Nessun input.

## Steps

### TC-01: Happy path
1. Sign in as titolare. Navigate to `/`. Click `Altro` in the bottom bar.
2. Assert: URL `/altro`, titolo `Altro`, voce `Magazzino` con il dettaglio `Shampoo, balsami e profumi del salone.`.
3. Click `Magazzino`. Assert: URL `/altro/magazzino`. Click **Indietro**. Assert: URL `/altro`.

### TC-02: Proposta di una funzione
1. Click `Manca qualcosa? Proponilo`. Assert: URL `/impostazioni/suggerimenti`.
2. Click **Indietro**. Assert: URL `/altro`, non `/impostazioni`.

### TC-03: Negative & edge cases
1. A 320 px di larghezza. Assert: nessun testo tagliato, nessuno scorrimento orizzontale.

## Assertions
- [ ] La voce Altro della barra è attiva su `/altro`
- [ ] Da Suggerimenti si torna ad Altro
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
