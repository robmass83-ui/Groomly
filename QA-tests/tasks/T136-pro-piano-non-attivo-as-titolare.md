# T136-pro-piano-non-attivo-as-titolare: Funzioni Plus — piano non attivo

| Field | Value |
|---|---|
| Route | `/impostazioni/pro` |
| Source | `src/pages/ProPage.tsx` |
| Flow | View plan state "Non attivo" |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`; team plan not enabled
- Note: if the account is a team-plan owner the route redirects to `/impostazioni/team`; record it and assert the redirect.

## Test data
- None to type.

## Steps

### TC-01: Happy path — Vedere lo stato del piano
1. Sign in as `titolare`. Navigate to `/impostazioni/pro`.
2. Assert: heading `Funzioni Plus` visible.
3. Assert: row `Piano Plus` shows `Non attivo` with the hint `Accendi il piano per invitare un socio o un collaboratore...`.
4. Assert: no `Invita` row and no `Revoca` button (plan off).
5. Assert: the `Piano Plus` toggle (role=switch) is absent for a plain titolare (operator-only).
6. Click **`Indietro`**. Assert: URL `/impostazioni`.

### TC-02: Negative & edge cases
- Reload `/impostazioni/pro`. Assert: same state.
- Navigate to `/impostazioni/team`. Assert: record the result (redirect or page), no console error.

## Assertions
- [ ] `Piano Plus` = `Non attivo`.
- [ ] No invite controls with plan off.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
