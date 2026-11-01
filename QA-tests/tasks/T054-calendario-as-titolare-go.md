# T054-calendario-as-titolare-go: Agenda - titolare piano gratuito

| Field | Value |
|---|---|
| Route | `/calendario` |
| Source | `src/pages/CalendarPage.tsx` |
| Flow | Cambiare vista; navigare giorni |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `titolare-go` (free owner).
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare-go> "QA T054 Fido"` (annota `salonId`).

## Test data
- Cane `QA T054 Fido`, vista `Settimana`.

## Steps

### TC-01: Happy path - agenda piano gratuito (AC1)
1. `check-c1.cjs`: N0.
2. Apri `/calendario`. Assert: intestazione mese/anno, viste **Giorno / Settimana / Mese** disponibili.
3. Vai al giorno +3: `Apri QA T054 Fido`; aprilo e verifica il foglio; chiudilo.
4. **Settimana** → «Settimana NN» e riepilogo; **Mese** → griglia con conteggi; **Oggi** torna a oggi.
5. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0.

### TC-02: Negative
- Slot vuoto → form `/appuntamenti/nuovo` precompilato; **Chiudi** senza salvare.

## Assertions
- [ ] Agenda utilizzabile col piano gratuito.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Giorno, Settimana, Mese

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
