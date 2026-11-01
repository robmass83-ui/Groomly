# T052-calendario-slot-nuovo-appuntamento-as-titolare: Agenda - slot vuoto e nuovo appuntamento

| Field | Value |
|---|---|
| Route | `/calendario` |
| Source | `src/pages/CalendarPage.tsx` |
| Flow | Toccare uno slot vuoto per creare un appuntamento |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T052 Fido"` (annota `salonId`).

## Test data
- Giorno `Giorno successivo` rispetto a oggi, slot `Nuovo <giorno> alle 11:00`; cane `QA T052 Fido`; servizio `Stripping`.

## Steps

### TC-01: Happy path - crea un appuntamento dallo slot (AC1)
1. `check-c1.cjs`: N0.
2. Apri `/calendario`, **Giorno successivo**. Premi lo slot **`Nuovo <giorno> alle 11:00`**.
3. Assert: URL `/appuntamenti/nuovo?data=<domani>&ora=11:00`, giorno e ora 11:00 precompilati.
4. Cerca `QA T052 Fido`, selezionalo, scegli **Stripping**, premi **`Salva`**.
5. Assert: torna all'agenda, alle 11:00 compare `Apri QA T052 Fido`.
6. Apri quell'appuntamento: foglio con «Stripping» e data corretta.
7. `check-c1.cjs`: `visiteNelSalone` = N0 + 1; 4 visite originali invariate.

### TC-02: Negative & edge
- Slot fuori orario (18:00): apre comunque il form con ora 18:00.
- **Chiudi** il form dallo slot senza salvare: agenda invariata.
- FAB **Aggiungi**: apre il menu aggiunta globale.

## Assertions
- [ ] Slot precompila data e ora.
- [ ] Appuntamento creato e visibile.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Agenda con slot, form precompilato, agenda finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Nessuna visita del salone è cancellata da sola (solo +1 per quella creata) | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
