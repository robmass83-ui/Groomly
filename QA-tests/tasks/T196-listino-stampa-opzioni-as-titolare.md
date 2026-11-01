# T196-listino-stampa-opzioni-as-titolare: Opzioni del foglio listino

| Field | Value |
|---|---|
| Route | `/listino/stampa` |
| Source | `src/pages/PriceSheetExportPage.tsx` |
| Flow | Cambiare formato, tipo file, "a partire da"; persistenza |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Listino con almeno un servizio con prezzo

## Test data
- `formato = "A3"`, `tipoFile = "JPEG (immagine)"`, `aPartireDa = true`
- Valori iniziali: A4, PDF, "a partire da" disattivo (annotarli)

## Steps

### TC-01: Rendering
1. Sign in as `titolare`, navigate to `/listino/stampa`.
2. Assert: titolo "Stampa e condividi", sottotitolo "Il foglio è sempre uguale al listino cartaceo".
3. Assert: anteprima con intestazione del salone e prezzi; opzioni A4/A3, PDF/JPEG (immagine), Lingua del listino, switch "Scrivi "a partire da" sui prezzi"; pulsanti **Stampa**, **Scarica**, **Condividi**.

### TC-02: Formato
1. Click **A3**. Assert: **A3** selezionato, la didascalia di adattamento si aggiorna, l'anteprima si rigenera.
2. Click **A4**. Assert: didascalia di adattamento A4.

### TC-03: Tipo file
1. Click **JPEG (immagine)**. Assert: selezionato.
2. Click **PDF**. Assert: selezionato.

### TC-04: "A partire da"
1. Attiva lo switch **Scrivi "a partire da" sui prezzi**. Assert: l'anteprima mostra "a partire da" sui prezzi.
2. Disattivalo. Assert: scompare dall'anteprima.

### TC-05: Persistenza
1. Imposta A3, JPEG (immagine), "a partire da" attivo.
2. Reload. Assert: le tre scelte sono mantenute (salvate nelle impostazioni del salone).
3. Ripristina i valori iniziali.

### TC-06: Indietro
1. Click **Indietro**. Assert: URL `/listino`.

## Assertions
- [ ] Le opzioni cambiano stato e anteprima.
- [ ] Le scelte persistono dopo reload.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Opzioni modificate
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
