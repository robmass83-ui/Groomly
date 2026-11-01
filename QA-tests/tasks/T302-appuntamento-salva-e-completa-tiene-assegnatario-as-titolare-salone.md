# T302-appuntamento-salva-e-completa-tiene-assegnatario-as-titolare-salone: Scheda visita - «Salva e completa» tiene chi fa la visita

| Field | Value |
|---|---|
| Route | `/appuntamento/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Completare con «Salva e completa» una visita assegnata al collaboratore |
| Requires auth | yes |
| Required role | titolare-salone |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Signed in as `titolare-salone`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c2.cjs salone55@test.groomly staff55a@test.groomly "QA T302 Fido"`.

## Test data
- Visita `qat302fido-salvacompleta`; totale 37, primo metodo di pagamento disponibile.

## Steps

### TC-01: Happy path - Salva e completa (AC2)
1. Sign in as titolare-salone, apri la scheda della visita `qat302fido-salvacompleta` (Home → DA CHIUDERE → tocca la riga, oppure l'URL della scheda visita con quell'id).
2. Compila i campi di chiusura (totale 37, metodo di pagamento) e premi **`Salva e completa`**.
3. `check-c2.cjs <salonId> "QA T302 Fido"`. Assert: `status` = `completato`, `assigneeUid` = collaboratore della fixture, `kind` = `pelosetto`, `chiusoIl` non nullo, `total` = 37.

### TC-02: Negative & edge
- Ricarica la scheda dopo il salvataggio: risulta completata, e dopo 15 s nel cloud i campi sono invariati.

## Assertions
- [ ] «Salva e completa» lascia `assigneeUid` e `kind` e scrive `chiusoIl`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Scheda visita prima di «Salva e completa»
- Scheda dopo il salvataggio
- Esito `check-c2.cjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 Una visita assegnata al collaboratore chiusa con «Salva e completa» dalla scheda visita: nel cloud restano assigneeUid e kind, e c'è chiusoIl | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
