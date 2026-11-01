# T105-avvisi-accesso-sospeso-as-collaboratore: Avvisi — muro di accesso sospeso (piano spento)

| Field | Value |
|---|---|
| Route | `/impostazioni/avvisi` |
| Source | `src/pages/AvvisiSistemaPage.tsx` |
| Flow | Collaboratore with plan off sees suspended-access wall |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no (Esci ends the session) |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore` of a salone whose Plus/team plan is OFF (seed variant; if the seed has the plan on, report skipped)

## Test data
- Expected title pattern: `Il tuo accesso a <nome salone> è sospeso`

## Steps

### TC-01: Happy path — Muro di accesso sospeso
1. Sign in as `collaboratore` (plan-off variant). Navigate to `/impostazioni/avvisi`.
2. Assert: title `Il tuo accesso a <nome salone> è sospeso` is visible.
3. Assert: the only action is the button **`Esci`**; no `Avvisi` content, no tab bar navigation to data.
4. Navigate to `/` and `/animali`. Assert: the same wall is shown.
5. Click **`Esci`**. Assert: redirect to `/login` with heading `Entra`.

### TC-02: Negative
- After sign-out navigate to `/impostazioni/avvisi`. Assert: redirect to `/login`.

## Assertions
- [ ] Suspended wall title matches the pattern.
- [ ] Only `Esci` is offered.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except expected denials.

## Screenshots required
- Wall state
- Final state after Esci

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
