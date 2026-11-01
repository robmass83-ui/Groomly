# T028-appuntamento-destructive-elimina-disdici-nonvenuto-as-titolare: Destructive - Elimina, Disdici, Non venuto

| Field | Value |
|---|---|
| Route | `/appuntamenti/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Mark no-show, cancel, delete appointment (confirm) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 26 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T028 Fido"` (annota `salonId`).

## Test data
- `qat028fido-dachiudere` (da chiudere), `qat028fido-futura1`, `qat028fido-futura2`, `qat028fido-ospite`.

## Steps

### TC-01: Happy path - Non venuto sulla visita da chiudere del cane eliminato (AC3)
1. `check-c1.cjs <salonId> "QA T028 Fido"`: N0.
2. Elimina il cane: `/animali/qat028fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`**.
3. Apri `/appuntamenti/qat028fido-dachiudere` (nome «Cane eliminato»). Premi **`Non venuto`**. Assert: toast con **Annulla**, stato «Non venuto».
4. `check-c1.cjs`: `qat028fido-dachiudere` = non venuto.
5. Premi **Annulla** nel toast: stato torna «Da chiudere» e nel cloud `programmato`; poi premi di nuovo **Non venuto** e lascia scadere il toast.

### TC-02: Disdici (AC3)
1. Apri `/appuntamenti/qat028fido-ospite`, premi **`Disdici`**. Assert: dialog «Chi disdice?» con **Cliente** e **Salone**. Chiudilo senza scegliere: nessun cambio di stato.
2. Riapri, premi **`Cliente`**: stato disdetto; `check-c1.cjs` mostra `qat028fido-ospite` disdetto.

### TC-03: Elimina (esplicito) - cancella solo quella visita
1. Con una nuova fixture «QA T028 Fido B» (cane vivo): apri `/appuntamenti/qat028fidob-futura1`, **Altre azioni** → **`Elimina`**. Assert: dialog «Eliminare questo appuntamento?» con «Sparisce anche dallo storico.», **Tieni**, **Elimina**.
2. **`Tieni`**: dialog chiuso, visita ancora presente.
3. Riapri e premi **`Elimina`**: il foglio si chiude; `check-c1.cjs`: `qat028fidob-futura1` assente, `visiteNelSalone` scende esattamente di 1, le altre 3 visite del cane restano.

## Assertions
- [ ] Non venuto / Disdici salvano lo stato nel cloud.
- [ ] Elimina cancella solo la visita scelta, con conferma.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Toast Non venuto, dialog Chi disdice, dialog Eliminare, esiti check

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 Dopo l'eliminazione la visita da chiudere compare in Home come «Cane eliminato» e si chiude con Completato/Non venuto/Disdetto, salvando lo stato nel cloud | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
