# T207-login-validazione-credenziali-as-anonymous: Form validation — login-enter

| Field | Value |
|---|---|
| Route | `/login` |
| Source | `src/pages/LoginPage.tsx` |
| Flow | Empty/invalid login shows zod errors; wrong password |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Anonymous (no session)
- Seed: account `plus36@test.groomly`

## Test data
- `emptyRequired` = `""`
- `badEmail` = `"abc"`
- `shortPassword` = `"short"`
- `validEmail` = `"plus36@test.groomly"`
- `wrongPassword` = `"Sbagliata999!"`

## Steps

### TC-01: Form validation — `login-enter`
Navigate to `/login`, then for each row submit with **`Entra`** and assert the visible error.

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| `email` | "Inserisci un’email valida" | `abc` → "Inserisci un’email valida" | n/a |
| `password` | "Minimo 8 caratteri" | `short` → "Minimo 8 caratteri" | n/a |

1. Submit with both fields empty. Assert: both errors "Inserisci un’email valida" and "Minimo 8 caratteri" shown; URL stays `/login`.
2. Fill `email` = `abc`, `password` = `short`; submit. Assert: both errors shown.
3. Fill `email` = `plus36@test.groomly`, `password` = `short`; submit. Assert: only "Minimo 8 caratteri".

### TC-02: Credenziali errate
1. Fill `email` = `plus36@test.groomly`, `password` = `Sbagliata999!`; click **`Entra`**.
2. Assert: an alert (role=alert) reads `Email o password non corretti`; URL stays `/login`.
3. Assert: the network log shows the Auth emulator `signInWithPassword` request answered 400 (expected); no other 4xx/5xx.
4. Fix the credentials with the `titolare` password from the credential map and submit. Assert: redirect to `/` (the error clears).

### TC-03: Negative & edge cases
- Email with surrounding spaces `" plus36@test.groomly "` is trimmed and accepted (valid password → login works).
- Unknown email `nessuno@test.groomly` with valid-format password: assert the same generic message `Email o password non corretti` (no account enumeration).

## Assertions
- [ ] Zod messages match exactly.
- [ ] Wrong credentials show the alert and do not authenticate.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except the expected 400 on wrong password.

## Screenshots required
- Page initial load
- Each validation error state
- Wrong credentials alert

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
