# T138-pro-accesso-sospeso-as-collaboratore: Funzioni Plus — collaboratore bloccato

| Field | Value |
|---|---|
| Route | `/impostazioni/pro` |
| Source | `src/pages/ProPage.tsx` |
| Flow | collaboratore is blocked by suspended-access wall (guard ProOTeam/StaffSettings) |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore`

## Test data
- Expected title pattern: `Il tuo accesso a <nome salone> è sospeso`

## Steps

### TC-01: Happy path — Collaboratore non accede a Funzioni Plus
1. Sign in as `collaboratore`. Navigate to `/impostazioni/pro`.
2. Assert: heading `Funzioni Plus` is NOT shown; the wall `Il tuo accesso a <nome salone> è sospeso` (or the StaffSettings lock) appears and the only action is **`Esci`**.
3. Assert: no `Piano Plus` row, no `Invita`, no `Revoca`.
4. Click **`Esci`**. Assert: redirect to `/login`.

### TC-02: Negative
- After sign-out navigate to `/impostazioni/pro`. Assert: redirect to `/login`.

## Assertions
- [ ] No plan data exposed to the collaboratore.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except expected denials.

## Screenshots required
- Wall state
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
