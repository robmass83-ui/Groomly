# T045-appuntamento-personale-as-titolare-go: Appuntamento personale - creazione come titolare-go

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Create personal appointment as free owner |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go

## Test data
- `titolo = "Visita fornitore QA {runId}"`
- `data = "2026-11-04"`, `inizio = "15:00"`, `fine = "16:00"`

## Steps

### TC-01: Happy path - creare
1. Sign in as titolare-go. Navigate to `/appuntamenti/personale/nuovo?data=2026-11-04`.
2. Fill Titolo, Ora di inizio `15:00`, Ora di fine `16:00`.
3. Click **Salva**.
4. Assert: dialog closes; `/calendario` on 2026-11-04 shows "Visita fornitore QA {runId}" 15:00-16:00.

### TC-02: Validazione
1. Reopen the dialog, leave Titolo empty, click **Salva**. Assert: "Scrivi un titolo.".
2. Fill Titolo, inizio `10:00`, fine `09:00`. Click **Salva**. Assert: "L'ora di fine e dopo l'inizio.".

## Assertions
- [ ] Same behaviour as titolare.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
