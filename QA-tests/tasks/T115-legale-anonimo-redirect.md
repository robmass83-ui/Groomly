# T115-legale-anonimo-redirect: Legale - accesso anonimo

| Field | Value |
|---|---|
| Route | `/impostazioni/legale` |
| Source | `src/pages/LegalePage.tsx` |
| Flow | Unauthenticated access |
| Requires auth | yes |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 4 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Not signed in (clear storage)

## Test data
- none

## Steps

### TC-01: Negative - non autenticato
1. With no session, navigate to `/impostazioni/legale`.
2. Assert: the legal page content is not shown; the login screen (or a redirect to it) appears.
3. Assert: no unhandled console errors.

## Assertions
- [ ] Protected content hidden when anonymous.

## Screenshots required
- Resulting screen

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
