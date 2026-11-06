# T226-prodotto-nuovo-crea-as-titolare: Nuovo prodotto - creazione

| Field | Value |
|---|---|
| Route | `/altro/magazzino/nuovo` |
| Source | `src/pages/ProdottoPage.tsx` |
| Flow | Compilare e salvare un prodotto |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Prodotto `Shampoo Neutro`, categoria `Shampoo`, quantità `1,5`, unità `Litri`, ditta `Iv San`, codice `SH1`.

## Steps

### TC-01: Happy path
1. Sign in as titolare. Navigate to `/altro/magazzino/nuovo`.
2. Compila tutti i campi con i dati di prova. Click **Salva prodotto**.
3. Assert: URL `/altro/magazzino`, riga `Shampoo Neutro` con `Iv San · SH1` e `1,5 L`.
4. Reload. Assert: la riga resta.

### TC-02: Proposta della ditta
1. Navigate to `/altro/magazzino/nuovo`. Scrivi `iv` in `Fornitore / ditta`.
2. Assert: compare la proposta `Iv San`. Click sulla proposta. Assert: il campo vale `Iv San`.

### TC-03: Solo il nome
1. Compila solo `Prodotto` con `Guanti`, categoria `Altro`. Click **Salva prodotto**.
2. Assert: riga `Guanti` senza misura e senza ditta.

## Assertions
- [ ] La virgola decimale si accetta
- [ ] I campi facoltativi vuoti non danno errore
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
