# T227-prodotto-nuovo-validazione-as-titolare: Nuovo prodotto - validazione

| Field | Value |
|---|---|
| Route | `/altro/magazzino/nuovo` |
| Source | `src/pages/ProdottoPage.tsx` |
| Flow | Errori sotto i campi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Quantità non valide: `0`, `-2`, `abc`. Nome di soli spazi.

## Steps

### TC-01: Nome mancante
1. Sign in as titolare. Navigate to `/altro/magazzino/nuovo`. Scrivi `   ` in `Prodotto`. Click **Salva prodotto**.
2. Assert: errore `Scrivi il nome del prodotto`, URL invariato.

### TC-02: Quantità
1. Scrivi `Shampoo` in `Prodotto`. Per ogni quantità non valida, scrivila e click **Salva prodotto**.
2. Assert: errore `Scrivi un numero maggiore di zero`, URL invariato.
3. Svuota `Quantità`, click **Salva prodotto**. Assert: si salva.

### TC-03: Limiti
1. Assert: `Prodotto`, `Fornitore / ditta` e `Codice prodotto` non accettano più di 120 caratteri.

## Assertions
- [ ] Nessun prodotto scritto finché ci sono errori
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
