# T037-appuntamento-personale-validazione-as-titolare: Form validation - personale

| Field | Value |
|---|---|
| Route | `/appuntamenti/personale/nuovo` |
| Source | `src/pages/PersonalAppointmentPage.tsx` |
| Flow | Validazione del form |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `emptyTitle = ""`
- `spaces = "   "`
- `title60 = 60 x "a"`
- `title61 = 61 x "a"`
- `validTitle = "Validazione QA {runId}"`
- `startTime = "10:00"`, `badEnd = "09:00"`, `sameEnd = "10:00"`

## Steps

### TC-01: Form validation - personale
Su `/appuntamenti/personale/nuovo`, compila i campi indicati e click **Salva**:

| Caso | Titolo | Inizio | Fine | Errore atteso |
|---|---|---|---|---|
| Titolo vuoto | `""` | 10:00 | vuota | "Scrivi un titolo." |
| Titolo solo spazi | `"   "` | 10:00 | vuota | "Scrivi un titolo." |
| Titolo 61 caratteri | `title61` | 10:00 | vuota | errore sul titolo (limite 1-60), nessun salvataggio |
| Titolo 60 caratteri | `title60` | 10:00 | vuota | nessun errore, salvato |
| Inizio vuoto | `validTitle` | vuoto | vuota | salvataggio bloccato (ora di inizio necessaria) |
| Fine prima dell'inizio | `validTitle` | 10:00 | `09:00` | "L'ora di fine è dopo l'inizio." |
| Fine uguale all'inizio | `validTitle` | 10:00 | `10:00` | "L'ora di fine è dopo l'inizio." |

Per ogni caso di errore assert che lo sheet resta aperto e non e stato creato alcun appuntamento (controlla l'agenda al termine). Elimina l'appuntamento del caso 60 caratteri al termine, se l'app lo permette (vedi T038).

### TC-02: Negative & edge cases
- Dopo un errore, correggi il campo e **Salva**: l'errore sparisce e il salvataggio riesce.
- Id inesistente: navigate to `/appuntamenti/personale/id-inesistente-qa`. Assert: il form e vuoto e senza bottone **Elimina**.

## Assertions
- [ ] "Scrivi un titolo." per titolo vuoto o di soli spazi.
- [ ] "L'ora di fine è dopo l'inizio." per fine <= inizio.
- [ ] Limite 60 caratteri applicato solo da validazione (il DOM non ha maxlength).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Ogni stato di errore di validazione

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
