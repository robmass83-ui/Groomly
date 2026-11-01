# T034-appuntamenti-nuovo-fissa-prossimo-chiudi-as-titolare: Fissa anche il prossimo + Modal discard

| Field | Value |
|---|---|
| Route | `/appuntamenti/nuovo` |
| Source | `src/pages/AppointmentPage.tsx` (+`AppointmentForm.tsx`) |
| Flow | Fissa anche il prossimo books follow-up; close with unsaved changes |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T034 Fido"` (annota `salonId`).

## Test data
- Cane `QA T034 Fido`, servizio `Taglio / tosatura`, giorno `+7 gg`, primo slot abilitato, toggle **`Fissa anche il prossimo`** attivo.

## Steps

### TC-01: Happy path - appuntamento con follow-up
1. `check-c1.cjs`: N0.
2. Apri `/appuntamenti/nuovo`, scegli il cane, **Taglio / tosatura**, **+7 gg**, uno slot.
3. Attiva **`Fissa anche il prossimo`**. Assert: il toggle risulta attivo (pressed).
4. Premi **`Salva`**. Assert: il foglio si chiude; in `/calendario` ci sono due appuntamenti per il cane (data scelta e quella successiva).
5. `check-c1.cjs`: `visiteNelSalone` >= N0 + 2; le 4 visite originali con stati invariati (AC1).

### TC-02: Modal discard
1. Apri `/appuntamenti/nuovo`, scegli un cane, premi **`Chiudi`**. Assert: «Chiudi senza salvare?».
2. **`Resta`**: foglio ancora aperto con il cane scelto.
3. **Chiudi** di nuovo → **`Chiudi senza salvare`**: foglio chiuso, nessun appuntamento creato.
4. Con il foglio non modificato, **Chiudi** chiude senza prompt.

## Assertions
- [ ] Follow-up creato.
- [ ] Discard senza effetti collaterali.
- [ ] Nessuna visita preesistente cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Toggle attivo, prompt discard, agenda finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Nessuna visita preesistente del salone è cancellata da sola (solo aggiunte) | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
