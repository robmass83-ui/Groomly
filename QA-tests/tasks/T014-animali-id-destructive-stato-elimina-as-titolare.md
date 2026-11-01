# T014-animali-id-destructive-stato-elimina-as-titolare: Destructive - Elimina definitivamente (cancella solo le visite future)

| Field | Value |
|---|---|
| Route | `/animali/:id` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Eliminare la scheda (richiede conferma); archiviare |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 30 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`. Un secondo browser/profilo (browser B) per lo stesso salone, loggato come `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T014 Fido"` (annota `salonId`; `qat014fido-dog`).

## Test data
- `nomeCane = "QA T014 Fido"`; visite: chiusa `qat014fido-chiusa` (20 euro), da chiudere `qat014fido-dachiudere`, future `qat014fido-futura1`, `qat014fido-futura2`.

## Steps

### TC-01: Happy path - Elimina definitivamente con conferma reale (AC2, AC5, AC7)
1. `check-c1.cjs <salonId> "QA T014 Fido"`. Annota N0 (`visiteNelSalone`), I0 (`incassatoTotale`). Assert: 4 visite del cane, 1 completato, 3 programmato.
2. Apri `/animali/qat014fido-dog`. Premi **`Menu`**. Assert: dialog «Scheda» con **Non più in cura**, **Deceduto**, **Elimina definitivamente**.
3. Premi **`Elimina definitivamente`**. Assert: dialog «Elimina scheda» con **Elimina** e **Annulla** e i testi «Le 2 visite future verranno cancellate.» e «Lo storico e gli incassi restano.» (nessun altro numero di visite).
4. Premi **`Annulla`**. Assert: dialog chiuso, cane ancora presente; `check-c1.cjs` = stato iniziale.
5. Riapri Menu → Elimina definitivamente, premi **`Elimina`**. Assert: redirect a `/animali`, «QA T014 Fido» non è in elenco.
6. `check-c1.cjs`. Assert: `caneEsiste` = false; `qat014fido-chiusa` = completato e `qat014fido-dachiudere` = programmato ancora presenti; `qat014fido-futura1` e `futura2` assenti; `visiteNelSalone` = N0 - 2; `incassatoTotale` = I0.
7. Apri `/`. Assert: la visita da chiudere compare in DA CHIUDERE come «Cane eliminato».
8. Apri `/incassi?periodo=mese` e nell'elenco trova la visita chiusa (~10 giorni fa, può essere nel mese precedente: usa **Periodo precedente**). Assert: riga «Cane eliminato» con 20 euro.
9. Nel browser B (già aperto sul salone) apri `/incassi/report` o `/incassi` sullo stesso periodo e apri la riga della visita chiusa. Assert: la visita è visibile come «Cane eliminato», scheda visita aperta senza errori.

### TC-02: Archiviazione (Non più in cura / Deceduto)
- Con una nuova fixture «QA T014 Fido B»: **Menu → Non più in cura**: il dialog mostra il conteggio dei futuri con **Archivia e disdici** / **Archivia solo**; scegli **Archivia solo** e verifica nel cloud che le 4 visite esistono ancora; ripristina dall'elenco archiviato.
- **Menu → Deceduto → Conferma**: stato deceduto, visite chiuse restano.

### TC-03: Negative & edge
- Cane senza visite future (dopo che sono state tutte chiuse/cancellate): il dialog di eliminazione non mostra «verranno cancellate».
- Doppio clic su **Elimina**: una sola eliminazione, nessun errore.

## Assertions
- [ ] Dialog di conferma riporta i testi esatti.
- [ ] Nel cloud spariscono solo le 2 future; chiusa e da chiudere restano.
- [ ] Incassato totale invariato.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Menu, dialog Elimina scheda, Home con «Cane eliminato», Incassi con riga «Cane eliminato», browser B, esiti `check-c1.cjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 Eliminando un cane con 1 visita chiusa, 1 da chiudere e 2 future: nel cloud restano la chiusa e la da chiudere, spariscono solo le 2 future; l'incassato totale non cambia | TC-01 |
| AC-3 | AC3 (parte Home) la visita da chiudere compare come «Cane eliminato» | TC-01 |
| AC-5 | AC5 La conferma di eliminazione del cane dice «Le 2 visite future verranno cancellate.» e «Lo storico e gli incassi restano.» | TC-01 |
| AC-7 | AC7 La visita chiusa del cane eliminato resta visibile (come «Cane eliminato») negli Incassi/Report e aprendola da un secondo browser dello stesso salone | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
