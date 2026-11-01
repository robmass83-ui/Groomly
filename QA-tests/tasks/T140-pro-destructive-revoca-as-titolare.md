# T140-pro-destructive-revoca-as-titolare: Destructive — Revoca membro

| Field | Value |
|---|---|
| Route | `/impostazioni/pro` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Operator revokes member |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` with the plan ENABLED and at least 1 member or pending invite listed (seed variant; otherwise report skipped)
- Emulator note: callable `revokeMember` may return `INTERNAL`; assert a visible error instead of a removal and mark the confirm path as blocked by the emulator.

## Test data
- `member` = the first member row listed (record its name/email at step 2)

## Steps

### TC-01: Destructive — Revoca (annulla)
1. Sign in as `titolare`, navigate to `/impostazioni/pro`.
2. Record the first member row.
3. Click **`Revoca <member>`**. Assert: a confirmation prompt names the member.
4. Cancel the prompt. Assert: the member is still listed; reload keeps it.

### TC-02: Destructive — Revoca (conferma)
1. Click **`Revoca <member>`** again and confirm.
2. Assert: the member row disappears and a confirmation appears (record exact text); if the emulator returns `INTERNAL`, assert a visible error and the member still listed.
3. Reload. Assert: the member stays removed (when step 2 succeeded).

### TC-03: Button coverage
| Button | Action taken | Expected result |
|---|---|---|
| `Revoca <member>` | click → cancel | no state change |
| `Revoca <member>` | click → confirm | row removed |
| `Invita` | click | dialog `Invita` opens |

## Assertions
- [ ] Cancel preserves the member.
- [ ] Confirm removes the member (or shows a visible emulator error).
- [ ] No console errors in DevTools at any step (INTERNAL callable errors expected only where noted).
- [ ] No failed network requests (no 4xx/5xx) except explicitly expected.

## Screenshots required
- Confirm prompt
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
