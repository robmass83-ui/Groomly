# T029-appuntamento-validazione-completa-visita-as-titolare: Form validation - completa-visita

| Field | Value |
|---|---|
| Route | `/appuntamenti/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Complete visit with price/duration/payment |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T029 Fido"` (annota `salonId`).

## Test data
- Visita `qat029fido-dachiudere`. Validi: `Prezzo = "35"`, `Ore = "1"`, `Minuti = "30"`, `Pagamento = POS`.
- Invalidi: `Prezzo = "abc"`, `Prezzo = ""`, `Ore = "-1"`, `Minuti = "99"`.

## Steps

### TC-01: Happy path - dopo gli errori, completamento valido (AC3)
1. Apri `/appuntamenti/qat029fido-dachiudere`, **Completato**.
2. Esegui TC-02, poi inserisci i valori validi, scegli **POS**, premi **`Salva e completa`**.
3. Assert: stato «Completato», totale 35; `check-c1.cjs <salonId> "QA T029 Fido"`: `qat029fido-dachiudere` = `completato`.

### TC-02: Form validation - `completa-visita`
Con il dialog «Completare» aperto, imposta il valore e premi **Salva e completa**:

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Prezzo | rifiutato, il dialog resta aperto | `abc` → rifiutato | n/a |
| Ore | rifiutato (intero ≥ 0) | `-1` → rifiutato | n/a |
| Minuti | rifiutato (0-59) | `99` → rifiutato | n/a |

Assert per ogni caso: dialog aperto, messaggio/evidenziazione visibile sul campo, nel cloud la visita è ancora `programmato`.

### TC-03: Negative & edge
- Salone chiuso nel giorno: se compare «Salone chiuso» con **Indietro** / **Salva lo stesso**, **Indietro** non salva.

## Assertions
- [ ] Valori non validi non chiudono la visita.
- [ ] Valori validi la chiudono e salvano nel cloud.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Ogni errore, stato finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 Dopo l'eliminazione la visita da chiudere compare in Home come «Cane eliminato» e si chiude con Completato/Non venuto/Disdetto, salvando lo stato nel cloud (qui: chiusura con Completato e salvataggio nel cloud) | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
