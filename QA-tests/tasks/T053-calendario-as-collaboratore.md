# T053-calendario-as-collaboratore: Agenda - vista collaboratore

| Field | Value |
|---|---|
| Route | `/calendario` |
| Source | `src/pages/CalendarPage.tsx` |
| Flow | Cambiare vista; aprire un appuntamento |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T053 Fido"` (annota `salonId`).

## Test data
- Ospite «Ospite QA T053 Fido» (ieri, da chiudere); cane `QA T053 Fido` con visita da chiudere ieri.

## Steps

### TC-01: Happy path - il collaboratore legge e apre le visite (AC6, AC1)
1. `check-c1.cjs`: N0.
2. Apri `/calendario`, vai al giorno di ieri con **Giorno precedente**.
3. Assert: compaiono `Apri QA T053 Fido` e `Apri Ospite QA T053 Fido`; l'ospite non è mai «Cane eliminato».
4. Premi `Apri Ospite QA T053 Fido`. Assert: foglio `/appuntamenti/qat053fido-ospite` con nome ospite; **Completato** → **Nessuna modifica** → chiude; stato `completato` nel cloud.
5. Cambia in **Settimana** e **Mese**: le viste rendono senza errori.
6. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0.

### TC-02: Slot vuoto
- Slot **Nuovo <giorno> alle 09:00** apre `/appuntamenti/nuovo?data=...&ora=09:00`; **Chiudi** torna all'agenda.

## Assertions
- [ ] Il collaboratore vede e apre le visite.
- [ ] Ospite col suo nome.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Agenda di ieri, foglio ospite

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Visite del salone invariate dopo login + 15 s | TC-01 |
| AC-6 | AC6 L'ospite mostra il suo nome, mai «Cane eliminato» | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
