# T222-magazzino-cerca-filtri-as-titolare: Magazzino - ricerca, filtri e tasto +

| Field | Value |
|---|---|
| Route | `/altro/magazzino` |
| Source | `src/pages/MagazzinoPage.tsx` |
| Flow | Cercare e filtrare i prodotti |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Prodotti: `Shampoo Neutro` (Shampoo, 1 L, ditta `Iv San`, codice `SH1`), `Balsamo Seta` (Balsami, 500 ml, ditta `Iv San`).

## Steps

### TC-01: Elenco
1. Sign in as titolare. Navigate to `/altro/magazzino`.
2. Assert: sottotitolo `2 prodotti`; righe con nome, `ditta · codice` e misura `1 L`, `500 ml`.

### TC-02: Ricerca
1. Scrivi `sh1` in `Cerca per nome, ditta o codice`. Assert: solo `Shampoo Neutro`.
2. Scrivi `zzz`. Assert: `Nessun prodotto trovato`. Svuota il campo.

### TC-03: Filtri
1. Click `Balsami`. Assert: solo `Balsamo Seta`, il filtro ha `aria-pressed=true`.
2. Click `Profumi`. Assert: `Nessun prodotto trovato`. Click `Tutti`. Assert: due righe.

### TC-04: Tasto +
1. Click `Aggiungi prodotto`. Assert: URL `/altro/magazzino/nuovo`.
2. Torna indietro e scorri in fondo. Assert: l'ultima riga non resta sotto il tasto +.

## Assertions
- [ ] Ricerca per codice e per ditta
- [ ] Il conteggio non cambia con i filtri
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
