# T221-magazzino-vuoto-primo-prodotto-as-titolare: Magazzino - elenco vuoto e primo prodotto

| Field | Value |
|---|---|
| Route | `/altro/magazzino` |
| Source | `src/pages/MagazzinoPage.tsx` |
| Flow | Elenco vuoto e ingresso al modulo |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 4 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Salone senza prodotti.

## Steps

### TC-01: Stato vuoto
1. Sign in as titolare. Navigate to `/altro/magazzino`.
2. Assert: `Nessun prodotto`, nessuna ricerca, nessun filtro, nessun tasto +.
3. Click `Aggiungi il primo prodotto`. Assert: URL `/altro/magazzino/nuovo`, titolo `Nuovo prodotto`.

### TC-02: Negative & edge cases
1. Click **Indietro**. Assert: URL `/altro/magazzino`, nessun prodotto creato.

## Assertions
- [ ] Lo stato vuoto non mostra ricerca e filtri
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
