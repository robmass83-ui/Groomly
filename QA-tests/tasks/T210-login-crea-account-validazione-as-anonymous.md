# T210-login-crea-account-validazione-as-anonymous: Form validation — login-create

| Field | Value |
|---|---|
| Route | `/login` |
| Source | `src/pages/LoginPage.tsx` |
| Flow | Crea account validations, terms checkbox, bad VAT |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Anonymous (no session)

## Test data
- valid base: `firstName` = `"Mario"`, `lastName` = `"Rossi"`, `email` = `"valida.qa@test.groomly"`, `password` = `"QaPass-12345!"`, `salonName` = `"Salone QA"`, `vatNumber` = `""`, terms checked
- `emptyRequired` = `""`
- `badEmail` = `"abc"`
- `shortPassword` = `"short"`
- `badVat` = `"123"`; `vatWithIT` = `"IT12345678903"`

## Steps

### TC-01: Form validation — `login-create`
Open `/login`, click **`Non hai un account? Crea account`**. Submit empty with **`Crea account`**, then assert all six errors at once: "Il nome è obbligatorio", "Il cognome è obbligatorio", "Inserisci un’email valida", "Minimo 8 caratteri", "Il nome della toelettatura è obbligatorio", "Accetta privacy e termini". Then for each field start from the valid base and break only that field:

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| `firstName` | "Il nome è obbligatorio" | n/a | n/a |
| `lastName` | "Il cognome è obbligatorio" | n/a | n/a |
| `email` | "Inserisci un’email valida" | `abc` → email error | n/a |
| `password` | "Minimo 8 caratteri" | `short` → "Minimo 8 caratteri" | n/a |
| `salonName` | "Il nome della toelettatura è obbligatorio" | n/a | n/a |
| `vatNumber` | none (optional) | `123` and `IT12345678903` → "11 cifre, senza IT" | n/a |
| `accettaTermini` | "Accetta privacy e termini" (unchecked) | n/a | n/a |

### TC-02: Happy path control — Dati validi senza Partita IVA
1. Fill the valid base with a unique email `valida.qa.{runId}@test.groomly` and `vatNumber` empty.
2. Click **`Crea account`**. Assert: no field error is displayed and the account creation proceeds (confirm-email view or Home).
3. Sign out.

### TC-03: Negative & edge cases
- Uppercase email `Valida.QA@Test.Groomly` is lowercased on submit (the stored/displayed email is lowercase).
- Toggle `Mostra password` in create mode. Assert: type switches password→text.
- Errors clear after the field is corrected.

## Assertions
- [ ] All six empty-submit errors appear with exact text.
- [ ] Bad VAT shows "11 cifre, senza IT" and blocks submit.
- [ ] No account is created in invalid cases (the Auth emulator has no new user).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Create form initial load
- Each validation error state
- Final state after TC-02

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
