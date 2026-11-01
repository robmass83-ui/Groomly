# T164-incassi-nascondi-importi-as-titolare: Nascondi e mostra importi

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Nascondere/mostrare importi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T164 Fido"` (annota `salonId`).

## Test data
- Visita chiusa `qat164fido-chiusa` 20 euro (~10 giorni fa); periodo mese contenente quella data.

## Steps

### TC-01: Happy path - toggle importi (AC2)
1. `check-c1.cjs`: I0.
2. Apri `/incassi?periodo=mese&data=<10 giorni fa>`. Annota INCASSATO = M0.
3. Premi **`Nascondi importi`**. Assert: `aria-pressed=true`, il totale e gli importi della riga sono mascherati, il pulsante diventa **Mostra importi**.
4. Ricarica. Assert: importi ancora nascosti (persistono in `settings.ui.hideAmounts`).
5. Elimina il cane `qat164fido-dog` (Menu → Elimina definitivamente → **Elimina**), torna su Incassi e premi **`Mostra importi`**. Assert: INCASSATO = M0 invariato; la riga mostra «Cane eliminato» 20 euro.
6. `check-c1.cjs`: `incassatoTotale` = I0.

### TC-02: Edge
- Con importi nascosti, la pressione lunga sul totale li mostra temporaneamente.

## Assertions
- [ ] Mascheramento e persistenza dopo reload.
- [ ] Incassato invariato dopo eliminazione cane.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Importi nascosti / mostrati

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 L'incassato totale non cambia dopo l'eliminazione del cane | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
