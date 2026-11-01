# T062-chiusura-periodo-validazione-as-titolare: Chiusura - periodo e Form validation chiusura

| Field | Value |
|---|---|
| Route | `/chiusure/nuovo` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Close a period, Empty reason shows error, Inverted range shows error |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: nessuna chiusura ne appuntamento dal 2027-01-05 al 2027-01-08

## Test data
- `motivo = "Vacanza QA {runId}"`
- `dal = "2027-01-05"`, `al = "2027-01-08"`
- `motivoVuoto = ""`, `motivoSpazi = "   "`
- `alInvertito = "2027-01-01"` (precedente a Dal)

## Steps

### TC-01: Happy path - Chiudere un periodo
1. Sign in as titolare. Navigate to `/chiusure/nuovo`.
2. Click **Un periodo**. Assert: campi Dal e Al visibili.
3. Imposta Dal = `2027-01-05`, Al = `2027-01-08`.
4. Scrivi Motivo `Vacanza QA {runId}`.
5. Click **Salva**.
6. Assert: sheet chiusa; nel Calendario i giorni dal 5 all'8 gennaio 2027 risultano chiusi con il motivo.
7. Reload. Assert: la chiusura persiste.

### TC-02: Form validation - chiusura

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Motivo | "Scrivi un motivo." (con `""` e con `"   "`) | n/a | `200 x "a"`: salvataggio ok o limite esplicito, nessun crash |
| Al | n/a | `2027-01-01` con Dal `2027-01-05`: "La fine del periodo e il giorno di inizio o un giorno dopo." | n/a |

1. Modo "Questo giorno", Motivo vuoto, click **Salva**. Assert: errore "Scrivi un motivo." e nessuna chiusura creata.
2. Motivo `   ` (solo spazi), click **Salva**. Assert: stesso errore.
3. Modo "Un periodo", Motivo `Test`, Dal `2027-01-05`, Al `2027-01-01`, click **Salva**. Assert: errore "La fine del periodo e il giorno di inizio o un giorno dopo." e nessuna chiusura creata.
4. Correggi Al = `2027-01-05` (stesso giorno di Dal). Assert: l'errore sparisce e **Salva** crea la chiusura.

### TC-03: Edge cases
- Dal = Al (periodo di un giorno): accettato.
- Doppio click su **Salva**: una sola chiusura creata.

## Assertions
- [ ] "Scrivi un motivo." appare con motivo vuoto o solo spazi.
- [ ] Errore periodo invertito appare con testo esatto.
- [ ] Periodo valido salvato e persistente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Errore motivo
- Errore periodo
- Calendario con periodo chiuso

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
