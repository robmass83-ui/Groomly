# T114-legale-as-titolare-go: Legale - come titolare-go

| Field | Value |
|---|---|
| Route | `/impostazioni/legale` |
| Source | `src/pages/LegalePage.tsx` |
| Flow | Page renders for free owner |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go

## Test data
- none

## Steps

### TC-01: Happy path
1. Sign in as titolare-go. Navigate to `/impostazioni/legale`.
2. Assert: the 5 entries are visible.
3. Click **Licenze open source**. Assert: URL `/impostazioni/licenze`.
4. Return and click **Indietro**. Assert: URL `/impostazioni/account`.

## Assertions
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
