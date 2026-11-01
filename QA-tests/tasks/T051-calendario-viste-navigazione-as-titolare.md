# T051-calendario-viste-navigazione-as-titolare: Agenda - viste, navigazione e visite di un cane eliminato

| Field | Value |
|---|---|
| Route | `/calendario` |
| Source | `src/pages/CalendarPage.tsx` |
| Flow | Cambiare vista; navigare giorni; aprire un appuntamento |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 24 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T051 Fido"` (annota `salonId`).

## Test data
- Visite del cane: chiusa (~10 giorni fa), da chiudere (~26 ore fa), future a +3 e +9 giorni circa.
- Vista: `Giorno`, `Settimana`, `Mese`.

## Steps

### TC-01: Happy path - cane eliminato, agenda coerente (AC2)
1. `check-c1.cjs <salonId> "QA T051 Fido"`: N0.
2. Apri `/calendario`. Assert: intestazione mese/anno corrente; vista **Giorno** attiva.
3. Vai a **Mese**, poi a **Giorno** del giorno +3 (usa **Giorno successivo** o i chip **Seleziona <giorno>**). Assert: è presente `Apri QA T051 Fido` (visita futura 1).
4. Elimina il cane: `/animali/qat051fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`**.
5. Torna a `/calendario` sul giorno +3 e su +9. Assert: nessun appuntamento «QA T051 Fido» (le 2 future sono sparite).
6. Vai al giorno della visita da chiudere (ieri). Assert: la visita resta nell'agenda come «Cane eliminato» e si apre con `Apri Cane eliminato`.
7. Vai a ~10 giorni fa. Assert: la visita chiusa resta visibile come «Cane eliminato».
8. `check-c1.cjs`: `qat051fido-chiusa` e `qat051fido-dachiudere` presenti; futura1/2 assenti; `visiteNelSalone` = N0 - 2.

### TC-02: Viste e navigazione
| Controllo | Azione | Risultato atteso |
|---|---|---|
| Settimana | click | «Settimana NN» e riepilogo cani |
| Mese | click | griglia a 7 colonne Lun..Dom con conteggi |
| Oggi | click | torna alla data odierna |
| Giorno precedente/successivo | click | la data cambia di 1 giorno |
| Giorno vuoto | naviga | «0 cani · 0m stimate» |

## Assertions
- [ ] Le visite chiuse/da chiudere del cane eliminato restano in agenda.
- [ ] Le future spariscono.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Agenda giorno +3 prima/dopo, giorno con «Cane eliminato», viste Settimana/Mese

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 Eliminando un cane con 1 visita chiusa, 1 da chiudere e 2 future: nel cloud restano la chiusa e la da chiudere, spariscono solo le 2 future | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
