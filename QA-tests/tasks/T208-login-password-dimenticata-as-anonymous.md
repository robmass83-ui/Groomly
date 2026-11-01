# T208-login-password-dimenticata-as-anonymous: Password dimenticata

| Field | Value |
|---|---|
| Route | `/login` |
| Source | `src/pages/LoginPage.tsx` |
| Flow | Password dimenticata with valid email shows generic reset message |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Anonymous (no session)

## Test data
- `validEmail` = `"plus36@test.groomly"`
- `unknownEmail` = `"nessuno.qa@test.groomly"`
- `badEmail` = `"abc"`, `emptyRequired` = `""`

## Steps

### TC-01: Happy path — Richiesta reset
1. Navigate to `/login`. Fill `Email` = `plus36@test.groomly`.
2. Click **`Password dimenticata`**.
3. Assert: a status message (role=status) with a generic confirmation text appears (record the exact text) and a **`Torna`** button is shown.
4. Click **`Torna`**. Assert: the login form (`Entra`) is displayed again.

### TC-02: Form validation — email per il reset
1. Reload `/login`, leave `Email` empty, click **`Password dimenticata`**. Assert: error "Inserisci un’email valida"; no status message.
2. Fill `abc`, click it again. Assert: same error.

### TC-03: Negative & edge cases
- Fill `nessuno.qa@test.groomly` (unknown), click **`Password dimenticata`**. Assert: the same generic confirmation as TC-01 (no account enumeration).
- Click `Password dimenticata` twice quickly. Assert: no crash, no duplicate error.

## Assertions
- [ ] Email is validated before the reset is sent.
- [ ] The confirmation is identical for known and unknown emails.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except explicitly expected.

## Screenshots required
- Page initial load
- Each validation error state
- Reset confirmation

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
