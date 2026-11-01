# T030-appuntamento-as-collaboratore: Appuntamento - accesso collaboratore

| Field | Value |
|---|---|
| Route | `/appuntamenti/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Collaboratore can reach the page and close a visit |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T030 Fido"` (annota `salonId`).

## Test data
- Visita ospite `qat030fido-ospite`; visita cane `qat030fido-dachiudere`; `Prezzo = "20"`, `Pagamento = POS`.

## Steps

### TC-01: Happy path - il collaboratore completa una visita (AC3, AC6)
1. `check-c1.cjs <salonId> "QA T030 Fido"`: N0.
2. Apri `/appuntamenti/qat030fido-ospite`. Assert: nome «Ospite QA T030 Fido», mai «Cane eliminato».
3. **Completato** → **POS** → **`Salva e completa`**. Assert: stato «Completato».
4. `check-c1.cjs`: `qat030fido-ospite` completato; `visiteNelSalone` = N0.
5. Apri `/appuntamenti/qat030fido-dachiudere`, **Non venuto**: stato non venuto nel cloud.

### TC-02: Permessi
- Assert: le azioni consentite al collaboratore (Completato, Non venuto, Aggiungi nota) funzionano; **Apri scheda** del cane vivo apre `/animali/qat030fido-dog`.

## Assertions
- [ ] Collaboratore raggiunge la pagina e chiude visite.
- [ ] Stato salvato nel cloud.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Foglio ospite, stato finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 La visita da chiudere si chiude con Completato/Non venuto/Disdetto salvando lo stato nel cloud | TC-01 |
| AC-6 | AC6 Una visita da chiudere di un ospite mostra il nome dell'ospite, mai «Cane eliminato» | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
