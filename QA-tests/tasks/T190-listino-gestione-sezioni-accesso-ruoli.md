# T190-listino-gestione-sezioni-accesso-ruoli: Gestione listino - sezioni e accesso per ruolo

| Field | Value |
|---|---|
| Route | `/listino/gestione` |
| Source | `src/pages/PriceSheetManagePage.tsx` |
| Flow | Riordinare e nascondere le sezioni del foglio; collaboratore reindirizzato |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 26 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (poi titolare-go e collaboratore per TC-04 e TC-05)
- Ogni modifica è salvata subito: il runner annota ordine e visibilità iniziali delle sezioni e li ripristina al termine

## Test data
- Sezioni: Taglia piccola, Taglia media, Taglia grande, Bagno + tosatura, Servizi extra, Informazioni importanti, Avviso pulci e zecche, Compresi nel bagno, Saluto finale.

## Steps

### TC-01: Happy path - nascondere e mostrare una sezione
1. Sign in as titolare. Navigate to `/listino/gestione`.
2. Annotare l'ordine e la visibilità delle sezioni.
3. Click **Nascondi Saluto finale**.
4. Assert: il pulsante diventa **Mostra Saluto finale** e il nome della sezione è attenuato.
5. Reload. Assert: la sezione resta nascosta.
6. Navigate to `/listino`. Assert: "Saluto finale" non compare nel foglio.
7. Tornare a `/listino/gestione`, click **Mostra Saluto finale**. Assert: pulsante torna **Nascondi**, nome non attenuato; `/listino` mostra di nuovo il saluto.

### TC-02: Riordinare le sezioni
1. Click **Sposta giù** sulla prima sezione. Assert: la sezione scende di una posizione.
2. Click **Sposta su** sulla stessa sezione. Assert: torna in prima posizione.
3. Assert: il primo **Sposta su** e l'ultimo **Sposta giù** sono disabilitati.
4. Spostare "Servizi extra" di una posizione, reload, assert persistenza; navigate to `/listino` e assert nuovo ordine; ripristinare.

### TC-03: Nascondere tutte le sezioni taglia
1. Nascondere Taglia piccola. Assert: il contatore e l'elenco razze di gestione restano accessibili; `/listino` non mostra più quella taglia. Ripristinare con **Mostra**.

### TC-04: Titolare free
1. Sign out. Sign in as titolare-go. Navigate to `/listino/gestione`.
2. Assert: la pagina "Gestione listino" è accessibile (rolesAllowed include titolare-go); **Nascondi Saluto finale** funziona e viene ripristinato.

### TC-05: Collaboratore e anonimo
1. Sign out. Sign in as collaboratore. Navigate to `/listino/gestione`.
2. Assert: URL is `/impostazioni`.
3. Sign out. Navigate to `/listino/gestione`. Assert: redirect al login.

## Assertions
- [ ] Nascondi/Mostra cambia etichetta e attenua il nome.
- [ ] I limiti Sposta su/giù sono disabilitati ai bordi.
- [ ] Ordine e visibilità persistono e si riflettono in `/listino`.
- [ ] Collaboratore reindirizzato a `/impostazioni`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Sezione nascosta
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
