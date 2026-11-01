# T112-legale-documenti-esterni: Legale - documenti esterni

| Field | Value |
|---|---|
| Route | `/impostazioni/legale` |
| Source | `src/pages/LegalePage.tsx` |
| Flow | Open each legal document (external) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- External hosts may be blocked: intercept `window.open`/navigation and check the target URL instead of loading it

## Test data
- Privacy policy: `https://groomlyapp.it/privacy/?lang=it`
- Termini di servizio: `https://groomlyapp.it/termini/`
- Trattamento dati: `https://groomlyapp.it/dpa/`
- Come eliminare l'account: `https://groomlyapp.it/elimina-account/`

## Steps

### TC-01: Happy path - aprire ogni documento
1. Sign in as titolare. Navigate to `/impostazioni/legale`.
2. Click **Privacy policy**. Assert: an external open is requested to the Privacy URL (with `lang=it`); the app page itself stays at `/impostazioni/legale`.
3. Repeat for **Termini di servizio**, **Trattamento dati**, **Come eliminare l'account** with their URLs.

## Assertions
- [ ] Each button targets the expected URL.
- [ ] The in-app page does not navigate away.
- [ ] No console errors.

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
