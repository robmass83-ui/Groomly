# T231-prodotto-modifica-elimina-as-titolare: Scheda prodotto - modifica ed eliminazione

| Field | Value |
|---|---|
| Route | `/altro/magazzino/:id` |
| Source | `src/pages/ProdottoPage.tsx` |
| Flow | Modificare ed eliminare un prodotto |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Prodotto esistente `Shampoo Neutro`.

## Steps

### TC-01: Modifica
1. Sign in as titolare. Navigate to `/altro/magazzino`, click `Shampoo Neutro`.
2. Assert: titolo `Scheda prodotto`, campi precompilati.
3. Cambia `Prodotto` in `Shampoo Delicato`, click **Salva prodotto**. Assert: URL `/altro/magazzino`, riga aggiornata.

### TC-02: Eliminazione
1. Apri `Shampoo Delicato`, click **Elimina prodotto**. Assert: dialog `Eliminare Shampoo Delicato? Non si può annullare.`.
2. Click **Annulla**. Assert: il prodotto resta.
3. Click **Elimina prodotto**, poi **Elimina**. Assert: URL `/altro/magazzino`, la riga non c'è.

### TC-03: Id sconosciuto
1. Navigate to `/altro/magazzino/id-che-non-c-e`. Assert: URL finale `/altro/magazzino`.

## Assertions
- [ ] Annulla non cancella
- [ ] Dopo Elimina il prodotto non torna con un reload
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
