# T042-appuntamento-personale-validazione: Appuntamento personale - validazione

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Form validation - personal-appointment |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `emptyTitle = ""`
- `title60 = 60 x "a"`
- `title61 = 61 x "a"`
- `inizio = "10:00"`, `fineBad = "09:00"`, `fineOk = "11:00"`

## Steps

### TC-01: Form validation - `personal-appointment`
1. Sign in as titolare. Open `/appuntamenti/personale/nuovo`.

| Field | Input | Click | Expected |
|---|---|---|---|
| Titolo | empty, inizio `10:00` | **Salva** | error "Scrivi un titolo."; dialog stays open |
| Titolo | spaces only `"   "` | **Salva** | error "Scrivi un titolo." |
| Titolo | `title61` | **Salva** | error "Scrivi un titolo."; no record created |
| Titolo | `title60`, inizio `10:00` | **Salva** | accepted, dialog closes |
| Ora di fine | `fineBad` with inizio `10:00`, valid title | **Salva** | error "L'ora di fine e dopo l'inizio."; stays on page |
| Ora di fine | `fineOk` with inizio `10:00` | **Salva** | accepted |
| Ora di inizio | empty, valid title | **Salva** | nothing happens (silent no-op); dialog stays open; no record created |

2. After each rejected case, assert the dialog is still open and no new agenda entry exists.

### TC-02: Negative & edge cases
- Fill "Titolo" with 61 chars: assert the input accepts all 61 (no maxlength attribute).
- Fill "Ora di fine" equal to "Ora di inizio": assert the end error appears.

## Assertions
- [ ] Error texts match exactly.
- [ ] Rejected submissions create no data.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Each validation error state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
