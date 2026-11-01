# T203-listino-vedi-pdf-as-titolare: Listino - visualizzare un listino PDF

| Field | Value |
|---|---|
| Route | `/listino/vedi` |
| Source | `src/pages/PriceViewPage.tsx` |
| Flow | Open PDF price list |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: il file di listino piu recente (o quello indicato da `?id`) e un PDF; se manca, caricalo da `/listino` (vedi T183)

## Test data
- `file` = PDF di listino (es. `listino.pdf`)

## Steps

### TC-01: Happy path - Aprire il PDF
1. Sign in as titolare. Navigate to `/listino/vedi` (o `?id=<id del PDF>`).
2. Assert: intestazione "Listino", il nome del file PDF e il pulsante **Apri** sono visibili; nessun riquadro immagine.
3. Click **Apri**.
4. Assert: il PDF si apre (nuova scheda o visualizzatore) senza errore; annota l'URL aperto.
5. Torna alla scheda dell'app. Assert: la pagina e invariata.

### TC-02: Indietro
1. Click **Indietro**. Assert: URL `/listino`.

### TC-03: Edge cases
- Popup bloccato: se l'apertura e bloccata, compare un messaggio o nessun crash; annota.
- PDF non leggibile: compare un testo di errore invece di **Apri**.

## Assertions
- [ ] Nome file e Apri visibili per un PDF.
- [ ] Apri apre il documento.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) salvo il file esterno annotato.

## Screenshots required
- Vista PDF con Apri
- Documento aperto

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
