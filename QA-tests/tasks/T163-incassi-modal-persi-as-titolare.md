# T163-incassi-modal-persi-as-titolare: Modal - persi (ospite e cane eliminato)

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Aprire lo sheet Persi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T163 Fido"` (annota `salonId`).

## Test data
- Ospite `qat163fido-ospite` («Ospite QA T163 Fido», Bagno 20 euro); visita da chiudere del cane `qat163fido-dachiudere` (20 euro).

## Steps

### TC-01: Happy path - Non venuto e voce nei Persi (AC6, AC3)
1. `check-c1.cjs <salonId> "QA T163 Fido"`: N0.
2. Elimina il cane: `/animali/qat163fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`**.
3. Apri `/`. Premi **`Non venuto Ospite QA T163 Fido`** e **`Non venuto Cane eliminato`**. Assert: entrambe escono da DA CHIUDERE.
4. `check-c1.cjs`: le due visite sono «non venuto» nel cloud.
5. Apri `/incassi?periodo=settimana`. Assert: il KPI **Persi** mostra € 40 (non 0) e il pulsante è attivo.
6. Premi **`Persi € 40`**. Assert: sheet «Persi» con due righe — «Ospite QA T163 Fido» (mai «Cane eliminato») e «Cane eliminato» — con motivo «non venuto», importo 20 ciascuna, e la nota «Contano i non venuti e i disdetti dal cliente. I disdetti dal salone no.»
7. Premi **Chiudi**: sheet chiuso.

### TC-02: Edge
- Con importo Persi 0 il pulsante è disabilitato.
- Disdetto dal **Salone** non compare nei Persi.

## Assertions
- [ ] Persi lista l'ospite col suo nome.
- [ ] Il cane eliminato appare come «Cane eliminato».
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Sheet Persi, Home prima/dopo

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 La visita da chiudere del cane eliminato compare in Home come «Cane eliminato» e si chiude (Non venuto) salvando nel cloud | TC-01 |
| AC-6 | AC6 L'ospite mostra il suo nome, mai «Cane eliminato», in Home e in Incassi | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
