# T206-login-entra-as-anonymous: Login — accesso con credenziali valide

| Field | Value |
|---|---|
| Route | `/login` |
| Source | `src/pages/LoginPage.tsx` |
| Flow | Login with valid credentials -> redirect to / |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Anonymous (no session)
- Seed: account of role `titolare` (email `plus36@test.groomly`); the password is resolved by the runner from the credential map for role `titolare` and is never written here

## Test data
- `email` = `"plus36@test.groomly"`
- `password` = the `titolare` password from the credential map
- `shortPassword` = `"short"`

## Steps

### TC-01: Happy path — Entra
1. Navigate to `/login`.
2. Assert: heading `Entra`, fields `Email` and `Password`, button **`Entra`**, buttons `Password dimenticata` and `Non hai un account? Crea account`.
3. Fill `Email` = `plus36@test.groomly` and `Password` with the `titolare` password.
4. Click **`Entra`**.
5. Assert: redirect to `/`; Home shows `OGGI`; the tab bar is visible.
6. Reload. Assert: session persists on `/`.
7. Navigate to `/login`. Assert: redirect back to `/` (authenticated users are redirected).

### TC-02: Mostra/Nascondi password
1. Sign out, navigate to `/login`, type `abcdefgh` in `Password`.
2. Assert: input type is `password`. Click **`Mostra password`**. Assert: type is `text` and the button label becomes `Nascondi password`.
3. Click it again. Assert: type is `password`.

### TC-03: Rendering
- Assert: autocomplete attributes `username` (Email) and `current-password` (Password); page title `Groomly - Entra`.

## Assertions
- [ ] Valid login lands on `/`.
- [ ] Authenticated visit to `/login` redirects to `/`.
- [ ] Password toggle switches the input type.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Final state after login

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
