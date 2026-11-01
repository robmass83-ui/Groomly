# T033-appuntamenti-nuovo-modal-nuovo-cane-as-titolare: Modal - nuovo-cane (creazione cane inline)

| Field | Value |
|---|---|
| Route | `/appuntamenti/nuovo` |
| Source | `src/pages/AppointmentPage.tsx` (+`AppointmentForm.tsx`) |
| Flow | + Nuovo cane inline creation from search text |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T033 Fido"` (annota `salonId`).

## Test data
- Nuovo cane inline: nome `QA T033 Inline`, specie `Cane`, taglia `Media`; servizio `Bagno`; giorno `Oggi`/`Domani`.

## Steps

### TC-01: Happy path - cane inline e appuntamento (AC1)
1. `check-c1.cjs`: N0.
2. Apri `/appuntamenti/nuovo`, scrivi `QA T033 Inline` in «Cerca cane». Assert: appare **+ Nuovo cane**.
3. Premi **`+ Nuovo cane`**, scegli **Cane** e **Media**, conferma. Assert: il cane è selezionato.
4. Scegli **Bagno**, **Domani**, uno slot, **`Salva`**.
5. Assert: appuntamento in agenda domani per «QA T033 Inline»; in `/animali` il cane esiste.
6. `check-c1.cjs`: `visiteNelSalone` = N0 + 1; le 4 visite del cane fixture invariate.

### TC-02: Modal coverage
1. Apri il form «Nuovo cane» e chiudilo/annullalo: nessun cane creato.
2. Prova a confermare con nome vuoto: nessun cane creato / errore visibile.
3. Chiudi il foglio con dati inseriti: prompt «Chiudi senza salvare?» con **Resta** / **Chiudi senza salvare**; **Resta** mantiene i dati.

## Assertions
- [ ] Cane inline creato e usato nell'appuntamento.
- [ ] Nessuna visita esistente cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Form nuovo cane, prompt discard, agenda finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Il numero di visite del salone nel cloud è invariato salvo l'unica nuova creata: nessuna visita cancellata da sola | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
