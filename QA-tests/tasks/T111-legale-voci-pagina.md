# T111-legale-voci-pagina: Legale - elenco voci e navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni/legale` |
| Source | `src/pages/LegalePage.tsx` |
| Flow | Page lists 5 entries; back navigation |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- none

## Steps

### TC-01: Happy path - elenco
1. Sign in as titolare. Navigate to `/impostazioni/legale`.
2. Assert: title "Legale"; 5 entries: Privacy policy, Termini di servizio, Trattamento dati, Licenze open source, Come eliminare l'account.
3. Click **Indietro**. Assert: URL `/impostazioni/account`.

### TC-02: Edge
- Reload on `/impostazioni/legale`. Assert: still 5 entries.

## Assertions
- [ ] 5 entries present.
- [ ] Indietro goes to `/impostazioni/account`.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
