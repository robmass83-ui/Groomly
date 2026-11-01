# T175-incassi-statistiche-anonimo-redirect: Statistiche — accesso anonimo

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx` |
| Flow | Unauthenticated access is redirected |
| Requires auth | yes |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 5 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- No session (clear storage / signed out)

## Test data
- None.

## Steps

### TC-01: Negative — anonimo
1. Open a fresh session with no stored auth.
2. Navigate to `/incassi/statistiche`.
3. Assert: redirect to `/login`; heading `Entra` visible with fields `Email` and `Password`.
4. Assert: no card values (`Euro l’ora`, `Previsione`, `In ritardo`) are in the DOM.

### TC-02: Ritorno dopo login
1. Sign in as `titolare` from that screen.
2. Assert: redirect to `/` (or back to `/incassi/statistiche`; record which). Navigate to `/incassi/statistiche` and assert heading `Statistiche`.

## Assertions
- [ ] Anonymous users never see statistics.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except expected denials.

## Screenshots required
- Redirect to login
- Final state after login

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
