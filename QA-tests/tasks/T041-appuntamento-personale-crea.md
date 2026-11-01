# T041-appuntamento-personale-crea: Appuntamento personale - creazione

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Create personal appointment with title and start (and end) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `titolo = "Pausa pranzo QA {runId}"`
- `data = "2026-11-02"`
- `inizio = "10:00"`
- `fine = "11:00"`

## Steps

### TC-01: Happy path - creare con inizio e fine
1. Sign in as titolare. Navigate to `/appuntamenti/personale/nuovo?data=2026-11-02`.
2. Assert: dialog "Appuntamento personale" is visible; field "Data" is preset to `2026-11-02`; no **Elimina** button.
3. Fill "Titolo" with `Pausa pranzo QA {runId}`.
4. Fill "Ora di inizio" with `10:00` and "Ora di fine" with `11:00`.
5. Click **Salva**.
6. Assert: the dialog closes.
7. Navigate to `/calendario`, go to 2026-11-02. Assert: an entry "Pausa pranzo QA {runId}" 10:00-11:00 is present.

### TC-02: Creazione senza ora di fine
1. Open `/appuntamenti/personale/nuovo`. Assert: "Data" defaults to today (2026-11-01); hint "Se non la sai, lasciala vuota." appears for the end time.
2. Fill "Titolo" `Senza fine QA {runId}`, "Ora di inizio" `14:00`, leave "Ora di fine" empty. Click **Salva**.
3. Assert: dialog closes and the entry appears in the agenda for today at 14:00.

## Assertions
- [ ] Date defaults to today.
- [ ] Successful save closes the sheet.
- [ ] Entry visible in agenda after save and after reload.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Dialog opened
- Filled form
- Agenda after save

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
