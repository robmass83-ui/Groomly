# T232-prodotto-id-as-collaboratore: Scheda prodotto - collaboratore

| Field | Value |
|---|---|
| Route | `/altro/magazzino/:id` |
| Source | `src/pages/ProdottoPage.tsx` |
| Flow | Il collaboratore modifica ma non elimina |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 4 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Prodotto esistente `Balsamo Seta`.

## Steps

### TC-01: Modifica sì, elimina no
1. Sign in as collaboratore. Navigate to `/altro/magazzino`, click `Balsamo Seta`.
2. Assert: nessun pulsante `Elimina prodotto`.
3. Cambia `Codice prodotto` in `BS2`, click **Salva prodotto**. Assert: la riga mostra `BS2`.

### TC-02: Negative
1. Sign out. Navigate to `/altro/magazzino`. Assert: reindirizzo alla schermata di accesso.

## Assertions
- [ ] Il collaboratore non ha il pulsante Elimina prodotto
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
