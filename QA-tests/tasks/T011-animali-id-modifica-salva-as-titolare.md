# T011-animali-id-modifica-salva-as-titolare: Scheda animale - modifica e salvataggio senza perdere visite

| Field | Value |
|---|---|
| Route | `/animali/:id` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Modificare dati cane e salvare |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T011 Fido"` (annota `salonId`, `dogId` = `qat011fido-dog`).

## Test data
- `name = "QA T011 Fido Rosso"`, `breed = "Meticcio Test"`, `size = "Media"`, `owner = "Mario Rossi"`, `phone = "+39 333 1234567"`, `alert = "Allergico allo shampoo X"`, `weight = "12,5"`, `birthYear = "2019"`.

## Steps

### TC-01: Happy path - Modifica e Salva (AC1)
1. `check-c1.cjs <salonId> "QA T011 Fido"`: annota N0 (`visiteNelSalone`) e le 4 visite del cane.
2. Apri `/animali/qat011fido-dog`. Assert: intestazione «Scheda» e nome «QA T011 Fido»; lo Storico mostra la visita chiusa.
3. Premi **`Modifica`**.
4. Compila tutti i campi di `dog-edit` coi valori di Test data (Nome, Razza, Taglia Media, Proprietario, Telefono, Avviso critico; in «Altri dettagli» Peso e Anno di nascita).
5. Premi **`Salva`**.
6. Assert: si esce dalla modifica, la scheda mostra «QA T011 Fido Rosso», «Meticcio Test», «Media», avviso «Allergico allo shampoo X»; nessun errore inline.
7. Ricarica. Assert: i dati sono persistiti.
8. `check-c1.cjs <salonId> "QA T011 Fido"` (il nome nuovo non cambia gli id): Assert: `visiteNelSalone` = N0, le 4 visite del cane con stati invariati (la modifica del nome non cancella visite), `caneEsiste` = true.

### TC-02: Negative & edge
- Premi **Modifica**, cambia il Nome, esci con «Torna agli animali» senza **Salva**: al rientro il nome è quello vecchio.
- Apri `/animali/id-inesistente`: pagina senza crash, nessuna visita toccata (N0 invariato).

## Assertions
- [ ] Dati salvati e persistiti dopo reload.
- [ ] Nessuna visita cancellata dal salvataggio.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Scheda iniziale, scheda in modifica compilata, scheda dopo Salva

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
