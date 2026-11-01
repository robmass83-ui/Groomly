# T139-pro-modal-invita-as-titolare: Modal — invite (Invita socio o collaboratore)

| Field | Value |
|---|---|
| Route | `/impostazioni/pro` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Operator toggles plan, invites member |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` with the plan ENABLED (seed variant with plan on; the `Invita` row is visible). If the plan is off in this seed, report skipped and rely on T136.
- Emulator note: callables (`createInvite`) can return `INTERNAL`; in that case assert a visible error message and no crash, and mark the success assertion as blocked by the emulator.

## Test data
- `email` = `"nuovo.socio+{runId}@test.groomly"`
- `inviteRole` = `collaboratore` (other option: `socio`)
- invalid: `badEmail` = `"abc"`, `emptyRequired` = `""`, `duplicateEmail` = the email of an existing member of the seed

## Steps

### TC-01: Happy path — Invitare un collaboratore
1. Sign in as `titolare`, navigate to `/impostazioni/pro`.
2. Click row **`Invita`**. Assert: dialog titled `Invita` with field `Email` focused and segmented group `Ruolo` (`collaboratore`, `socio`).
3. Fill `Email` = `nuovo.socio+{runId}@test.groomly`, select `collaboratore`.
4. Click **`Invia`**.
5. Assert: dialog closes and the invited address appears in the pending-invites/members list; if the emulator returns `INTERNAL`, assert a visible error and the dialog behavior is graceful.
6. Reload. Assert: the invite is still listed (when step 5 succeeded).

### TC-02: Form validation — `invite`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| `email` | submit empty: visible email error, dialog stays open | `abc`: visible invalid-email error | n/a |
| `email` (duplicate) | n/a | existing member's email: error "already member/invited" | n/a |
| `inviteRole` | n/a (default selected) | n/a | n/a |

Record the exact message text for each and assert the dialog stays open and no invite is created.

### TC-03: Modal coverage
1. Open `Invita`, switch `Ruolo` to `socio`, assert selection, then close the dialog without sending. Assert: no invite created.
2. Reopen. Assert: fields are reset.

## Assertions
- [ ] Invalid email never creates an invite.
- [ ] Role selection is exclusive.
- [ ] No console errors in DevTools at any step (INTERNAL callable errors from the emulator are expected only in TC-01 step 5).
- [ ] No failed network requests (no 4xx/5xx) except explicitly expected.

## Screenshots required
- Page initial load
- Dialog opened
- Each validation error state
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
