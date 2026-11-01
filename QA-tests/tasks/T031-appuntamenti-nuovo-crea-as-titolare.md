# T031-appuntamenti-nuovo-crea-as-titolare: Nuovo appuntamento - creazione completa

| Field | Value |
|---|---|
| Route | `/appuntamenti/nuovo` |
| Source | `src/pages/AppointmentPage.tsx` (+`AppointmentForm.tsx`) |
| Flow | Search dog, pick one, choose service, day/time, Salva |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T031 Fido"` (annota `salonId`).

## Test data
- Cerca cane: `QA T031 Fido`; servizio `Bagno` (30m, 20 euro); giorno `Domani`; ora `16:00` (o primo slot abilitato).

## Steps

### TC-01: Happy path - crea l'appuntamento (AC1)
1. `check-c1.cjs <salonId> "QA T031 Fido"`: N0.
2. Sign in as titolare osservando la Home dai primi istanti, poi premi **`Nuovo appuntamento`**. Assert: foglio «Nuovo appuntamento» con Cane, Servizi, Quando; «Salva» disabilitato; nella lista dei cani suggeriti e in Home mai «Cane eliminato» (AC4).
3. In «Cerca cane» scrivi `QA T031 Fido` e scegli il cane dai risultati.
4. Premi il servizio **`Bagno`**. Assert: riepilogo «<ora> -> <ora+30m> - 30m - 20 euro».
5. Premi **`Domani`** (Giorno = domani) e scegli lo slot 16:00.
6. Premi **`Salva`**.
7. Assert: il foglio si chiude; in `/calendario` (giorno di domani) compare «QA T031 Fido» alle 16:00.
8. `check-c1.cjs`. Assert: `visiteNelSalone` = N0 + 1; le 4 visite originali del cane invariate (nessuna cancellata dall'aggiunta).
9. Attendi 15 s, ripeti: ancora N0 + 1.

### TC-02: Negative & edge
- «Cerca cane» con `zzzz`: solo **+ Nuovo cane**.
- Slot passati di oggi disabilitati.
- Chiudi con modifiche non salvate: prompt «Chiudi senza salvare?».

## Assertions
- [ ] Appuntamento creato e visibile in agenda.
- [ ] Nessuna visita preesistente cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Foglio vuoto, compilato, agenda finale, esito check

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01 (solo +1 per la nuova) |
| AC-4 | AC4 Nei primi istanti dopo il login la Home non mostra «Cane eliminato» né «Rimuovi dalla lista» | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
