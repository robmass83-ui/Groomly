# T002-home-chiudi-visita-as-titolare: Home - chiudere con "Completato" la visita da chiudere di un cane eliminato

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx` |
| Flow | Chiudere una visita da "Da chiudere" come completata |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`.
- Signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T002 Fido"` (annota `salonId`).

## Test data
- `nomeCane = "QA T002 Fido"`; id visite: `qat002fido-chiusa`, `qat002fido-dachiudere`, `qat002fido-futura1`, `qat002fido-futura2`.
- Chiusura: Completato con valori predefiniti.

## Steps

### TC-01: Happy path - chiudere la visita da chiudere del cane eliminato (AC3)
1. Esegui `check-c1.cjs <salonId> "QA T002 Fido"`; annota `incassatoTotale` = I0.
2. Sign in as titolare, apri `/animali`, cerca «QA T002 Fido» e aprilo.
3. Premi **`Menu`** → **`Elimina definitivamente`** → nel dialog «Elimina scheda» premi **`Elimina`** (conferma reale). Assert: si torna alla lista e il cane non c'è più.
4. Apri `/`. Assert: in DA CHIUDERE c'è una riga con nome «Cane eliminato» (visita del cane eliminato) e una riga «Ospite QA T002 Fido».
5. Sulla riga «Cane eliminato» premi **`Completato Cane eliminato`**.
6. Assert: la riga esce da DA CHIUDERE e compare conferma di chiusura (toast o riga sparita); il contatore DA CHIUDERE scende di 1.
7. Esegui `check-c1.cjs`. Assert: `qat002fido-dachiudere` = `completato`; `qat002fido-chiusa` = `completato`; futura1 e futura2 non esistono più; `incassatoTotale` >= I0 (aumenta solo del totale della visita chiusa).
8. Ricarica `/`. Assert: la riga non riappare in DA CHIUDERE.

### TC-02: Negative & edge
- Ricarica `/` subito dopo il completamento: nessuna riga «Cane eliminato» residua per quella visita.
- Prova a premere due volte rapidamente **Completato**: la visita resta `completato`, nessun doppio incasso (`incassatoTotale` aumenta una sola volta).

## Assertions
- [ ] La visita da chiudere del cane eliminato compare in Home come «Cane eliminato».
- [ ] Dopo «Completato» lo stato nel cloud è `completato`.
- [ ] Le visite chiuse restano; le future sono sparite.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Dialog «Elimina scheda»
- Home con «Cane eliminato» in DA CHIUDERE
- Home dopo il completamento
- Esito `check-c1.cjs`

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-3 | AC3 Dopo l'eliminazione la visita da chiudere compare in Home come «Cane eliminato» e si chiude con Completato/Non venuto/Disdetto, salvando lo stato nel cloud | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
