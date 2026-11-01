# T015-animali-id-as-collaboratore: Scheda animale come collaboratore

| Field | Value |
|---|---|
| Route | `/animali/:id` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Collaboratore: non può cambiare stato né eliminare |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T015 Fido"` (annota `salonId`; `qat015fido-dog`).

## Test data
- `phone = "+39 333 7654321"`, `alert = "Nota collaboratore QA"`.

## Steps

### TC-01: Happy path - il collaboratore modifica e salva (AC1)
1. `check-c1.cjs`: N0.
2. Apri `/animali/qat015fido-dog`. Assert: «Scheda» e «QA T015 Fido» visibili; pulsanti **Modifica**, **Fissa appuntamento**, **Messaggi pronti** presenti.
3. **Modifica**, imposta Telefono e Avviso critico coi valori di Test data, **Salva**. Assert: valori mostrati e persistiti dopo reload.
4. Attendi 15 s, `check-c1.cjs`. Assert: `visiteNelSalone` = N0, 4 visite del cane invariate.

### TC-02: Permessi
1. Assert: il pulsante **Menu** non c'è oppure non contiene **Elimina definitivamente**, **Non più in cura**, **Deceduto**.
2. Apri `/animali/qat015fido-dog` con URL diretto: nessun modo di eliminare il cane; `caneEsiste` resta true.
3. **Fissa appuntamento**: naviga a `/appuntamenti/nuovo?cane=qat015fido-dog`.

## Assertions
- [ ] Collaboratore salva modifiche ma non elimina/archivia.
- [ ] Conteggio visite invariato.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Scheda, scheda dopo Salva, assenza dell'eliminazione

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
