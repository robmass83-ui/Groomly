# T035-appuntamenti-nuovo-crea-as-collaboratore: Nuovo appuntamento - creazione come collaboratore

| Field | Value |
|---|---|
| Route | `/appuntamenti/nuovo` |
| Source | `src/pages/AppointmentPage.tsx` (+`AppointmentForm.tsx`) |
| Flow | Search dog, pick service, day/time, Salva |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T035 Fido"` (annota `salonId`).

## Test data
- Cane `QA T035 Fido`, servizio `Bagno + taglio` (1h, 35 euro), giorno `+30 gg`, primo slot abilitato.

## Steps

### TC-01: Happy path - crea l'appuntamento (AC1, AC4)
1. `check-c1.cjs`: N0.
2. Sign in as collaboratore osservando la Home dall'inizio. Assert: mai «Cane eliminato» / «Rimuovi dalla lista» in caricamento.
3. Apri `/appuntamenti/nuovo`, cerca `QA T035 Fido`, selezionalo, **`Bagno + taglio`**, **`+30 gg`**, slot, **`Salva`**.
4. Assert: riepilogo «1h - 35 euro» prima del salvataggio; foglio chiuso dopo; in `/calendario` il giorno scelto mostra il cane.
5. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0 + 1, 4 visite originali invariate.

### TC-02: Validazione
- **Salva** disabilitato senza cane e servizio; «Scegli un cane» / «Scegli un servizio».

## Assertions
- [ ] Il collaboratore crea l'appuntamento.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Foglio compilato, agenda finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) nessuna visita del salone è cancellata da sola | TC-01 |
| AC-4 | AC4 Nei primi istanti dopo il login la Home non mostra «Cane eliminato» né «Rimuovi dalla lista» | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
