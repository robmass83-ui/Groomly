# T213-mensili-as-collaboratore: Mensili come collaboratore

| Field | Value |
|---|---|
| Route | `/mensili` |
| Source | `src/pages/MonthlyPage.tsx` |
| Flow | Cambiare mese; filtrare |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore
- Seed: cani con ritorno mensile

## Test data
- Mesi: nov, dic; filtri: Tutti, Da fissare, Fissati

## Steps

### TC-01: Happy path
1. Sign in as collaboratore. Navigate to `/mensili`.
2. Assert: titolo **Mensili**, contatore `booked/total` e almeno un gruppo con dati seed.
3. Click **dic**, poi **nov**. Assert: il contenuto si aggiorna senza errori.
4. Click **Da fissare**, **Fissati**, **Tutti**. Assert: i gruppi visibili cambiano coerentemente con il filtro.
5. Click `<cane> (scheda)`. Assert: URL `/animali/:id`.

## Assertions
- [ ] Pagina raggiungibile e funzionante per il collaboratore.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
