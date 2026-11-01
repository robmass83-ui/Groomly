# T027-appuntamento-servizi-nota-orario-whatsapp-as-titolare: Appuntamento - servizi, nota, spostamento orario, WhatsApp (visita ospite)

| Field | Value |
|---|---|
| Route | `/appuntamenti/:id` |
| Source | `src/pages/AppointmentPage.tsx` |
| Flow | Edit services, add note, shift time, WhatsApp |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T027 Fido"` (annota `salonId`).

## Test data
- Visita ospite `qat027fido-ospite` («Ospite QA T027 Fido»); visita cane futura `qat027fido-futura1`.
- `Nota = "Pelo annodato"`, servizio extra `Unghie`, messaggio `"Ciao, a domani!"`.

## Steps

### TC-01: Happy path - modifica della visita futura (servizi, nota, orario)
1. Apri `/appuntamenti/qat027fido-futura1`. Assert: nome «QA T027 Fido», data tra ~3 giorni.
2. Premi il chip **`Unghie`**. Assert: il Totale sale di 5 euro (20 → 25).
3. Premi **`Aggiungi nota`**, scrivi «Pelo annodato», **`Salva`**. Assert: la nota è mostrata.
4. Premi **`Posticipa +15`**, poi **`Anticipa -15`**. Assert: l'orario torna al valore iniziale.
5. Ricarica. Assert: servizio Unghie e nota persistono.
6. **Messaggi pronti**: dialog «Messaggi WhatsApp», scegli **English** e **Conferma**, sostituisci il testo con «Ciao, a domani!», assert pulsante **`Apri WhatsApp`** attivo (non cliccare).

### TC-02: Visita ospite - il nome non è «Cane eliminato» (AC6)
1. Apri `/appuntamenti/qat027fido-ospite`. Assert: titolo con «Ospite QA T027 Fido»; in nessun punto compare «Cane eliminato»; **Apri scheda** assente o disabilitato (nessuna scheda cane).
2. Premi **`Aggiungi nota`**, «Nota ospite QA», **Salva**: nota mostrata.
3. `check-c1.cjs <salonId> "QA T027 Fido"`: la visita ospite esiste ancora (`qat027fido-ospite` = programmato).

## Assertions
- [ ] Totale ricalcolato al toggle servizi.
- [ ] Nota e orario persistono.
- [ ] Ospite col suo nome, mai «Cane eliminato».
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Foglio futura, foglio ospite, dialog WhatsApp

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-6 | AC6 Una visita da chiudere di un ospite (prenotazione online senza scheda cane) mostra il nome dell'ospite, mai «Cane eliminato», in Home e in Incassi | TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
