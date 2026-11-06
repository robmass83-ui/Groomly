# T137-pro-piano-non-attivo-as-titolare-go: Funzioni Plus — titolare free

| Field | Value |
|---|---|
| Route | `/impostazioni/pro` |
| Source | `src/pages/ProPage.tsx` |
| Flow | View plan state "Non attivo" |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare-go`

## Test data
- None to type.

## Steps

### TC-01: Happy path — Vedere lo stato del piano
1. Sign in as `titolare-go`. Navigate to `/impostazioni/pro`.
2. Assert: heading `Funzioni Plus`; row `Piano Plus` shows `Non attivo` with hint `Accendi il piano per invitare un socio o un collaboratore...`.
3. Assert: no `Invita` row, no `Revoca`.
4. Click **`Indietro`**. Assert: URL `/impostazioni`.

### TC-02: Tab bar
| Button | Action taken | Expected result |
|---|---|---|
| `Home` | click | `/` |
| `Listino` | click | `/listino` |
| `Altro` | click | `/altro` |
| `Aggiungi` (FAB) | click | new-appointment flow |

## Assertions
- [ ] Plan state `Non attivo`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
