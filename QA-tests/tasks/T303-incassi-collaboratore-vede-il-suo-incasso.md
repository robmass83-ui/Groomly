# T303-incassi-collaboratore-vede-il-suo-incasso: Incassi - la visita del collaboratore chiusa dal titolare va al collaboratore

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Il titolare chiude una visita del collaboratore; il collaboratore la vede nei suoi Incassi |
| Requires auth | yes |
| Required role | titolare-salone, collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Fixture: `node QA-tests/.qa-catalog/fixture-c2.cjs salone55@test.groomly staff55a@test.groomly "QA T303 Fido"`.

## Test data
- Visita `qat303fido-completato` (37 €, di ieri) assegnata a staff55a.

## Steps

### TC-01: Happy path (AC5)
1. Come `collaboratore` (staff55a) apri `/incassi` sul periodo che contiene ieri: annota l'incassato I0.
2. Esci; come `titolare-salone` apri `/` e chiudi `qat303fido-completato` con **`Completato`** (37 €). `check-c2.cjs` conferma `assigneeUid` = staff55a.
3. Esci; come `collaboratore` riapri `/incassi` sullo stesso periodo. Assert: l'incassato è I0 + 37 e/o compare la visita di «QA T303 Fido».
4. Come `titolare-salone` apri `/incassi` (e il report per collaboratore, se esiste). Assert: dove gli incassi sono divisi per persona, i 37 € di «QA T303 Fido» sono sotto staff55a e non sotto il titolare.

### TC-02: Negative & edge
- Il collaboratore vede solo le proprie visite: nessuna visita non assegnata a lui compare nei suoi Incassi.

## Assertions
- [ ] L'incasso va al collaboratore, non al titolare.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Incassi del collaboratore prima e dopo
- Incassi/report del titolare con la divisione per persona

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-5 | AC5 L'incasso di una visita del collaboratore chiusa dal titolare compare negli Incassi del collaboratore e non è attribuito al titolare | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
