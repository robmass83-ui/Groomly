# T202-listino-vedi-immagine-as-titolare: Listino - visualizzare un listino immagine

| Field | Value |
|---|---|
| Route | `/listino/vedi` |
| Source | `src/pages/PriceViewPage.tsx` |
| Flow | View image price list with pinch zoom |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: almeno 1 file immagine (PNG/JPG) nel listino; se manca, caricalo prima da `/listino` con il flusso di caricamento (vedi T183) usando `QA-tests/fixtures/listino.png` se esiste, altrimenti un'immagine locale qualsiasi

## Test data
- `file` = immagine di listino caricata

## Steps

### TC-01: Happy path - Vedere l'immagine
1. Sign in as titolare. Navigate to `/listino`, apri il listino immagine (o navigate a `/listino/vedi`).
2. Assert: intestazione "Listino"; l'immagine e visibile in un riquadro (frame) con dimensioni non nulle.
3. Assert: non compare "Nessun file" ne un pulsante **Apri**.

### TC-02: Zoom e pan
1. Con emulazione touch o rotella+ctrl, esegui zoom sul riquadro immagine.
2. Assert: l'immagine si ingrandisce; trascina per spostarla (pan) e resta nel riquadro.
3. Assert: nessun scroll della pagina sottostante durante pan/zoom.

### TC-03: Selezione file da storico
1. Se esistono piu file, navigate a `/listino/vedi?id=<id file vecchio>`.
2. Assert: viene mostrato quel file e non quello piu recente.

### TC-04: Edge cases
- Click **Indietro**: URL `/listino`.
- File immagine corrotto/non leggibile: viene mostrato un testo di errore e non un riquadro vuoto; annota il testo.

## Assertions
- [ ] L'immagine e renderizzata.
- [ ] Zoom/pan funzionano.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Immagine a zoom 1x
- Immagine ingrandita

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
