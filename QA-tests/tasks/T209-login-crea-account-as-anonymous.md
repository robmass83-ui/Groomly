# T209-login-crea-account-as-anonymous: Crea account — registrazione completa

| Field | Value |
|---|---|
| Route | `/login` |
| Source | `src/pages/LoginPage.tsx` |
| Flow | Switch to Crea account and register |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173` with Auth emulator
- Anonymous (no session)
- Email `nuovo.qa.{runId}@test.groomly` does not exist

## Test data
- `firstName` = `"Mario"`
- `lastName` = `"Rossi"`
- `email` = `"nuovo.qa.{runId}@test.groomly"`
- `password` = `"QaPass-{runId}1!"` (8+ characters, generated for this run only)
- `salonName` = `"Salone QA {runId}"`
- `vatNumber` = `"12345678903"`
- `accettaTermini` = checked
- taken email: `"plus36@test.groomly"`

## Steps

### TC-01: Happy path — Crea un account
1. Navigate to `/login`. Click **`Non hai un account? Crea account`**.
2. Assert: form shows `Nome`, `Cognome`, `Email`, `Password`, `Nome della toelettatura`, `Partita IVA`, checkbox `Accetto privacy, termini e accordo dati`, button **`Crea account`**.
3. Fill every field with its `Test data` value and check `Accetto privacy, termini e accordo dati`.
4. Click **`Crea account`**.
5. Assert: the account is created and the app leaves the form: either the confirm-email view (`Ho confermato` / `Invia di nuovo` / `Esci`) or redirect to `/` showing the new salone `Salone QA {runId}`; record which.
6. Reload. Assert: the session persists in the same view.
7. Click `Esci` (or sign out from Impostazioni). Assert: back at `/login`.

### TC-02: Email già registrata
1. Open Crea account, fill all fields validly but `email` = `plus36@test.groomly`.
2. Click **`Crea account`**.
3. Assert: an error states the email is already in use and the button **`Entra con questa email`** appears.
4. Click it. Assert: mode switches to `Entra` with the email prefilled.

### TC-03: Cambio modalità
1. In Crea account click **`Hai già un account? Entra`**. Assert: heading `Entra`, fields reduced to Email and Password.
2. Click `Non hai un account? Crea account`. Assert: the create form is shown with empty fields.

## Assertions
- [ ] New account is created and the session is established.
- [ ] Email already in use is reported without creating a duplicate.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except the expected email-exists response.

## Screenshots required
- Create form
- Taken-email state
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
