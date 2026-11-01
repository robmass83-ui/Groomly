# T166-incassi-report-periodo-as-titolare: Incassi e report - periodo, KPI e classifica con cane eliminato

| Field | Value |
|---|---|
| Route | `/incassi/report` |
| Source | `src/pages/EarningsReportPage.tsx` |
| Flow | Switch period Questo mese/Anno/Scegli; open top dog |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T166 Fido"` (annota `salonId`).

## Test data
- Visita chiusa `qat166fido-chiusa`: 20 euro, POS, 22 ottobre 2026 circa (Anno 2026).

## Steps

### TC-01: Happy path - classifica con cane eliminato (AC7, AC2)
1. `check-c1.cjs <salonId> "QA T166 Fido"`: I0.
2. Apri `/incassi/report`, premi **`Anno`**. Assert: preset «Anno» premuto; KPI Incassato, Appuntamenti, Media a cane, Guadagno allora, POS, Contanti; tabelle «per servizio» (Bagno) e «clienti top» con «QA T166 Fido». Annota Incassato = A0.
3. Elimina il cane: `/animali/qat166fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`**.
4. Riapri `/incassi/report` → **Anno**. Assert: Incassato = A0 (invariato); nella classifica la riga ora è «Cane eliminato» con 20 euro.
5. Premi la riga «Cane eliminato». Assert: nessuna scheda cane vuota si apre (la riga non è un link a una scheda vuota; restano nel report o si apre un messaggio) e nessun errore.
6. `check-c1.cjs`: `incassatoTotale` = I0.

### TC-02: Periodi
| Controllo | Azione | Risultato atteso |
|---|---|---|
| Questo mese | default | preset premuto |
| Anno | click | KPI dell'anno |
| Anno precedente / successivo | click | l'anno cambia; successivo disabilitato nell'anno corrente |
| Statistiche | click | `/incassi/statistiche` |
| Indietro | click | `/impostazioni` |

## Assertions
- [ ] Incassato dell'anno invariato dopo eliminazione.
- [ ] «Cane eliminato» in classifica senza scheda vuota.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Report Anno prima/dopo l'eliminazione

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 L'incassato totale non cambia dopo l'eliminazione del cane | TC-01 |
| AC-7 | AC7 La visita chiusa del cane eliminato resta visibile (come «Cane eliminato») nel Report | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
