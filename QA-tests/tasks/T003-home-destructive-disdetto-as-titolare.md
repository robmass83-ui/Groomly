# T003-home-destructive-disdetto-as-titolare: Destructive - Disdetto / Non venuto in Home e ospite col suo nome

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx` |
| Flow | Chiudere una visita come disdetta / non venuto |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`.
- Signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T003 Fido"` (annota `salonId`).

## Test data
- `nomeCane = "QA T003 Fido"`, ospite = «Ospite QA T003 Fido» (id `qat003fido-ospite`), visita da chiudere del cane `qat003fido-dachiudere`.
- Chi disdice: `Cliente`.

## Steps

### TC-01: Happy path - Disdetto con scelta «Cliente» sulla visita dell'ospite (AC6)
1. Sign in as titolare, apri `/`.
2. Assert: in DA CHIUDERE la riga ospite mostra «Ospite QA T003 Fido» e mai «Cane eliminato».
3. Premi **`Disdetto Ospite QA T003 Fido`**. Assert: modale «Chi disdice?» con **`Cliente`**, **`Salone`**, **`Indietro`**.
4. Premi **`Indietro`**. Assert: modale chiusa, la riga è ancora in DA CHIUDERE.
5. Riapri e premi **`Cliente`**. Assert: la riga esce da DA CHIUDERE.
6. Esegui `check-c1.cjs <salonId> "QA T003 Fido"`. Assert: `qat003fido-ospite` esiste con stato disdetto (non `programmato`).

### TC-02: Non venuto sulla visita da chiudere del cane eliminato (AC3)
1. Apri `/animali/qat003fido-dog`, **`Menu`** → **`Elimina definitivamente`** → **`Elimina`**.
2. Apri `/`. Assert: compare una riga «Cane eliminato».
3. Premi **`Non venuto Cane eliminato`**. Assert: la riga esce da DA CHIUDERE.
4. `check-c1.cjs`. Assert: `qat003fido-dachiudere` = non venuto (non `programmato`), `qat003fido-chiusa` = `completato`.

### TC-03: Disdetto «Salone» (percorso alternativo)
- Con una nuova fixture «QA T003 Fido B»: **Disdetto** → **`Salone`** → la riga esce e nel cloud lo stato è disdetto dal salone.

## Assertions
- [ ] «Chi disdice?» mostra Cliente/Salone/Indietro; Indietro non cambia nulla.
- [ ] L'ospite non è mai chiamato «Cane eliminato».
- [ ] Lo stato scelto è salvato nel cloud.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Modale «Chi disdice?»
- Home con ospite e «Cane eliminato»
- Esiti `check-c1.cjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 Dopo l'eliminazione la visita da chiudere compare in Home come «Cane eliminato» e si chiude con Completato/Non venuto/Disdetto, salvando lo stato nel cloud | TC-02, TC-03 |
| AC-6 | AC6 Una visita da chiudere di un ospite (prenotazione online senza scheda cane) mostra il nome dell'ospite, mai «Cane eliminato», in Home e in Incassi | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
