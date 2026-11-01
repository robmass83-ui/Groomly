# T113-legale-licenze: Legale - licenze open source

| Field | Value |
|---|---|
| Route | `/impostazioni/legale` |
| Source | `src/pages/LegalePage.tsx` |
| Flow | Open Licenze open source in-app |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- none

## Steps

### TC-01: Happy path
1. Sign in as titolare. Navigate to `/impostazioni/legale`.
2. Click **Licenze open source**.
3. Assert: URL `/impostazioni/licenze`, page renders a list of licenses without error.
4. Navigate back. Assert: URL `/impostazioni/legale`.

## Assertions
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Licenze page

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
