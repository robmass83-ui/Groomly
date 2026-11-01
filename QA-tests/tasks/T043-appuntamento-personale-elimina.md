# T043-appuntamento-personale-elimina: Destructive - Elimina appuntamento personale

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/:id` (edit of `/appuntamenti/personale/nuovo`) |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Edit existing personal appointment and delete via confirm dialog |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Created in this task via `/appuntamenti/personale/nuovo`

## Test data
- `titolo = "Da eliminare QA {runId}"`, `titoloModificato = "Modificato QA {runId}"`
- `data = "2026-11-03"`, `inizio = "09:00"`, `fine = "09:30"`

## Steps

### TC-01: Happy path - modificare
1. Sign in as titolare. Open `/appuntamenti/personale/nuovo?data=2026-11-03`.
2. Fill Titolo `Da eliminare QA {runId}`, inizio `09:00`, fine `09:30`. Click **Salva**. Assert dialog closes.
3. In `/calendario` on 2026-11-03 open the new entry.
4. Assert: dialog "Appuntamento personale" shows saved values and an **Elimina** button.
5. Change Titolo to `Modificato QA {runId}`. Click **Salva**. Assert: dialog closes, agenda shows the new title.

### TC-02: Destructive - Elimina (annulla)
1. Reopen the entry. Click **Elimina**.
2. Assert: confirm dialog shows the title, date and time of the entry, with **Annulla** and **Elimina**.
3. Click **Annulla**. Assert: confirm closes, entry still in agenda.

### TC-03: Destructive - Elimina (conferma)
1. Reopen the entry. Click **Elimina**, then **Elimina** in the confirm dialog.
2. Assert: dialogs close; the entry is gone from the agenda for 2026-11-03. Reload: still gone.

### TC-04: Chiudi
1. Open `/appuntamenti/personale/nuovo` directly, click **Chiudi**. Assert: redirect to `/`.

## Assertions
- [ ] Elimina absent on /nuovo, present when editing.
- [ ] Cancel leaves data untouched; confirm removes it.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Edit dialog
- Confirm dialog
- Agenda after delete

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
