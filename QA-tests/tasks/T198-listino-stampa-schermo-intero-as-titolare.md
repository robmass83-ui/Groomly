# T198-listino-stampa-schermo-intero-as-titolare: Modal — anteprima a schermo intero

| Field | Value |
|---|---|
| Route | `/listino/stampa` |
| Source | `src/pages/PriceSheetExportPage.tsx` |
| Flow | Anteprima a schermo intero |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`

## Test data
- Nessun input.

## Steps

### TC-01: Apri e chiudi overlay
1. Sign in as `titolare`, navigate to `/listino/stampa`.
2. Click **Apri a schermo intero**.
3. Assert: overlay con l'anteprima del foglio e pulsante **Chiudi**.
4. Esegui pinch zoom (o ctrl+rotella) e pan. Assert: l'anteprima si ingrandisce e si sposta senza errori.
5. Click **Chiudi**. Assert: overlay chiuso, opzioni invariate.

### TC-02: Coerenza con opzioni
1. Attiva "a partire da", scegli **A3**, apri a schermo intero. Assert: l'overlay riflette le opzioni correnti.
2. Chiudi e ripristina i valori iniziali.

## Assertions
- [ ] Overlay si apre e si chiude correttamente.
- [ ] Zoom/pan non generano errori.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Overlay aperto
- Overlay ingrandito
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
