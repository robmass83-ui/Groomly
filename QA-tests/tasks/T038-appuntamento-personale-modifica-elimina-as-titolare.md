# T038-appuntamento-personale-modifica-elimina-as-titolare: Modificare ed eliminare un appuntamento personale

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/:id` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Modificare titolo/orari; eliminare con conferma |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Il seed non ha appuntamenti personali: TC-01 ne crea uno

## Test data
- `title = "Modifica QA {runId}"`, `day = "2026-11-06"`, `startTime = "09:00"`, `endTime = "09:30"`
- `newTitle = "Modificato QA {runId}"`, `newStart = "15:00"`, `newEnd = "16:00"`

## Steps

### TC-01: Setup - creare
1. Sign in as titolare. Navigate to `/appuntamenti/personale/nuovo`.
2. Fill Titolo, Data, Ora di inizio, Ora di fine con i valori di Test data. Click **Salva**.
3. Navigate to `/calendario?data=2026-11-06` e apri l'appuntamento `Modifica QA {runId}`.
4. Assert: il form `/appuntamenti/personale/:id` e precompilato con i valori e mostra **Elimina**.

### TC-02: Happy path - Modificare
1. Cambia Titolo = `newTitle`, Ora di inizio = `15:00`, Ora di fine = `16:00`. Click **Salva**.
2. Assert: ritorno alla pagina di sfondo; in agenda del 2026-11-06 compare `newTitle` alle 15:00-16:00 e il vecchio titolo non c'e.
3. Reload. Assert: la modifica persiste.

### TC-03: Destructive - Elimina
1. Riapri l'appuntamento. Click **Elimina**.
2. Assert: dialog con titolo "Eliminare Modificato QA {runId} del 06/11/2026 alle 15:00?" (titolo, data e ora dell'appuntamento) e bottoni **Annulla** ed **Elimina**.
3. Click **Annulla**. Assert: dialog chiuso, appuntamento ancora in agenda.
4. Click **Elimina**, poi **Elimina** nel dialog.
5. Assert: ritorno alla pagina di sfondo e l'appuntamento non e piu in agenda; reload conferma.
6. Navigate to l'URL `/appuntamenti/personale/:id` eliminato. Assert: form vuoto e senza **Elimina**.

### TC-04: Negative & edge cases
- Click **Chiudi** dopo aver modificato un campo senza salvare: nessuna modifica persistita.

## Assertions
- [ ] Modifica persistente dopo reload.
- [ ] Dialog di eliminazione con Annulla / Elimina e testo corretto.
- [ ] Annulla non cambia lo stato; Elimina rimuove l'appuntamento.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Form di modifica
- Dialog di conferma eliminazione
- Final state dopo l'eliminazione

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
