# T200-listino-stampa-as-collaboratore: Opzioni locali per il collaboratore

| Field | Value |
|---|---|
| Route | `/listino/stampa` |
| Source | `src/pages/PriceSheetExportPage.tsx` |
| Flow | Collaboratore: le scelte non vengono salvate nelle impostazioni |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore`
- Le impostazioni del salone hanno A4, PDF, Italiano, "a partire da" disattivo (verificabili come `titolare`)

## Test data
- `formato = "A3"`, `tipoFile = "JPEG (immagine)"`, `lingua = "English"`, `aPartireDa = true`

## Steps

### TC-01: Cambio locale
1. Sign in as `collaboratore`, navigate to `/listino/stampa`.
2. Assert: titolo "Stampa e condividi" e anteprima visibili.
3. Click **A3**, **JPEG (immagine)**, attiva "a partire da", apri **Lingua del listino** e scegli **English**.
4. Assert: anteprima aggiornata con le scelte.
5. Click **Scarica**. Assert: download del file immagine.

### TC-02: Non persistenza
1. Reload. Assert: le opzioni tornano ai valori delle impostazioni del salone (A4, PDF, Italiano, "a partire da" disattivo).
2. Esci, accedi come `titolare`, apri `/listino/stampa`. Assert: i valori del salone sono invariati.

### TC-03: Indietro
1. Click **Indietro**. Assert: URL `/listino`.

## Assertions
- [ ] Il collaboratore usa tutte le opzioni.
- [ ] Le scelte del collaboratore non modificano le impostazioni del salone.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Opzioni modificate
- Dopo reload
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
