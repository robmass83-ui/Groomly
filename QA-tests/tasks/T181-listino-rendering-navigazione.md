# T181-listino-rendering-navigazione: Listino - rendering e navigazione

| Field | Value |
|---|---|
| Route | `/listino` |
| Source | `src/pages/ListinoPage.tsx` |
| Flow | Navigate to Gestione / Aggiorna prezzi / Stampa; review price table |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: standard services with prices

## Test data
- none

## Steps

### TC-01: Happy path - rendering
1. Sign in as titolare. Navigate to `/listino`.
2. Assert: header "Listino prezzi" with subtitle "Aggiornato <data>".
3. Assert sections: LISTINO PER RAZZA, PREZZI E TEMPI STANDARD, SERVIZI AGGIUNTIVI.
4. Assert: table has 4 columns (Servizio, Piccola, Media, Grande).

### TC-02: Pulsanti di navigazione
| Button | Expected |
|---|---|
| **Gestione listino** | URL `/listino/gestione` |
| **Aggiorna prezzi** | URL `/listino/prezzi` |
| **Stampa e condividi** | URL `/listino/stampa` |
| **Gestisci** (link) | URL `/listino/gestione` |
| **Modifica** (link) | URL `/impostazioni/servizi` |

Return to `/listino` after each.

## Assertions
- [ ] Sections and table present.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
