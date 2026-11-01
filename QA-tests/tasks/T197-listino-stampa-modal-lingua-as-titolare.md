# T197-listino-stampa-modal-lingua-as-titolare: Modal — lingua

| Field | Value |
|---|---|
| Route | `/listino/stampa` |
| Source | `src/pages/PriceSheetExportPage.tsx` |
| Flow | Cambiare lingua del foglio |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`, lingua iniziale Italiano

## Test data
- `lingua = "English"`, poi `"Español"`, poi `"Italiano"`

## Steps

### TC-01: Apri e chiudi
1. Sign in as `titolare`, navigate to `/listino/stampa`.
2. Click **Lingua del listino**.
3. Assert: dialog "Lingua del listino" con radio Italiano, English, Español; "Italiano" ha `aria-checked=true`.
4. Click **Chiudi**. Assert: dialog chiuso, lingua invariata.

### TC-02: Cambia lingua
1. Riapri, seleziona **English**.
2. Assert: il dialog si chiude (o resta con English `aria-checked=true`, poi **Chiudi**); l'anteprima mostra le etichette in inglese.
3. Riapri, seleziona **Español**. Assert: anteprima in spagnolo.
4. Reload. Assert: la lingua scelta è persistita.
5. Riapri, seleziona **Italiano**. Assert: anteprima in italiano.

## Assertions
- [ ] Dialog con 3 opzioni, quella corrente `aria-checked`.
- [ ] Anteprima aggiornata alla lingua scelta.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog aperto
- Anteprima per ogni lingua
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
