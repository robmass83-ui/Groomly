# T069-impostazioni-destructive-esci-as-titolare: Destructive — Esci

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Esci opens confirm dialog; Resta cancels |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`

## Test data
- None to type. Dialog title `Uscire da Groomly?`, buttons `Resta`, `Esci`, `Chiudi`.

## Steps

### TC-01: Happy path — Esci dall'account (conferma)
1. Sign in as `titolare`, navigate to `/impostazioni`.
2. Click **`Esci`** in the ACCOUNT section.
3. Assert: dialog `Uscire da Groomly?` with buttons `Resta` and `Esci`.
4. Click **`Esci`** in the dialog.
5. Assert: the session ends and the app redirects to `/login` showing heading `Entra`.
6. Navigate to `/impostazioni`. Assert: redirect to `/login` (no data visible).
7. Navigate back. Assert: no authenticated screen is reachable.

### TC-02: Annulla con Resta
1. Sign in again as `titolare`, open `/impostazioni`, click **`Esci`**.
2. Click **`Resta`**. Assert: dialog closes, still on `/impostazioni`, session active (reload keeps `Impostazioni`).
3. Click **`Esci`** again then `Chiudi` (or Escape). Assert: dialog closes, session active.

### TC-03: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Esci` (row) | click | dialog `Uscire da Groomly?` opens |
| `Resta` | click | no state change |
| `Chiudi` | click | no state change |
| `Esci` (dialog) | click | signed out, `/login` |

## Assertions
- [ ] Dialog text is exactly `Uscire da Groomly?`.
- [ ] Cancel paths keep the session.
- [ ] Confirm path ends the session.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog opened
- Final state after sign-out

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
