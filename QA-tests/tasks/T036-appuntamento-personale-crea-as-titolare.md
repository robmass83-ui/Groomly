# T036-appuntamento-personale-crea-as-titolare: Creare un appuntamento personale

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Creare un appuntamento personale |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Nessun appuntamento personale nel seed

## Test data
- `title = "Dentista QA {runId}"`
- `day = "2026-11-05"`
- `startTime = "10:00"`
- `endTime = "11:00"`

## Steps

### TC-01: Happy path - Creare un appuntamento personale
1. Sign in as titolare.
2. Navigate to `/appuntamenti/personale/nuovo`.
3. Assert: il form e vuoto, non c'e il bottone **Elimina**.
4. Fill **Titolo** = `Dentista QA {runId}`, **Data** = `2026-11-05`, **Ora di inizio** = `10:00`, **Ora di fine** = `11:00`.
5. Click **Salva**.
6. Assert: lo sheet si chiude e si torna alla pagina di sfondo.
7. Navigate to `/calendario?data=2026-11-05`. Assert: e visibile `Dentista QA {runId}` dalle 10:00 alle 11:00.
8. Reload. Assert: l'appuntamento e ancora presente.

### TC-02: Chiudi
1. Navigate to `/appuntamenti/personale/nuovo`, scrivi un titolo, click **Chiudi**.
2. Assert: ritorno alla pagina di sfondo e nessun appuntamento creato.

### TC-03: Campo fine opzionale
1. Apri `/appuntamenti/personale/nuovo`, Titolo = `Solo inizio QA {runId}`, Ora di inizio = `14:00`, Ora di fine vuota.
2. Click **Salva**. Assert: salvato senza errori e visibile in agenda alle 14:00.

## Assertions
- [ ] Il nuovo appuntamento compare in agenda e persiste dopo reload.
- [ ] Il bottone Elimina e assente in creazione.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Form compilato
- Final state in agenda

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
