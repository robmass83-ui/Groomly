# T057-chiusure-id-periodo-validazione-as-titolare: Chiusura per periodo e validazione date

| Field | Value |
|---|---|
| Route | `/chiusure/:id` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Creare chiusura per periodo; Al < Dal -> errore |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Nessuna chiusura né visita dal 2027-04-10 al 2027-04-12
- Sheet aperto da Home con "+" > Chiusura

## Test data
- `Motivo = "Corso {runId}"`
- `Dal = "2027-04-10"`, `Al = "2027-04-12"`
- `AlPrecedente = "2027-04-09"`

## Steps

### TC-01: Happy path — Crea chiusura per periodo
1. Sign in as `titolare`, navigate to `/`, click **+** > **Chiusura**.
2. Fill **Motivo** = "Corso {runId}".
3. Fill **Data** = "2027-04-10", poi click **Un periodo**.
4. Assert: compaiono **Dal** e **Al** con il valore "2027-04-10".
5. Fill **Dal** = "2027-04-10", **Al** = "2027-04-12".
6. Click **`Salva`**.
7. Assert: sheet chiuso; in Agenda i giorni 10, 11 e 12 aprile 2027 risultano chiusi con motivo "Corso {runId}".
8. Apri la chiusura. Assert: modo "Un periodo" con Dal 2027-04-10 e Al 2027-04-12 precompilati.

### TC-02: Form validation — chiusura
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Motivo | "Scrivi un motivo." | n/a | 45 caratteri: "Scrivi un motivo." |
| Al | n/a | Al < Dal: "La fine del periodo è il giorno di inizio o un giorno dopo." | n/a |

1. Apri nuova chiusura, modo "Un periodo", Motivo valido, Dal = "2027-04-10", Al = `AlPrecedente`, click **Salva**.
2. Assert: errore "La fine del periodo è il giorno di inizio o un giorno dopo."; nessuna chiusura creata.
3. Correggi Al = "2027-04-10" (uguale a Dal). Assert: salvataggio consentito.

### TC-03: Cambio modo
1. Apri nuova chiusura, click **Un periodo**, poi **Questo giorno**.
2. Assert: torna il solo campo **Data**, Dal/Al scompaiono.

## Assertions
- [ ] Passando a "Un periodo" compaiono Dal e Al con il valore del giorno.
- [ ] Errore di fine periodo con testo esatto.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Modo Un periodo
- Errore Al < Dal
- Final state in Agenda

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
