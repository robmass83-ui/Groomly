# T161-incassi-periodi-kpi-as-titolare: Incassi - periodi, KPI e incassato invariato dopo eliminazione cane

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Cambiare periodo giorno/settimana/mese; leggere i KPI |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 24 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T161 Fido"` (annota `salonId`).

## Test data
- Visita chiusa `qat161fido-chiusa`: 20 euro, POS, ~10 giorni fa (22 ottobre 2026 circa).

## Steps

### TC-01: Happy path - elimina il cane e verifica l'incassato (AC2, AC7)
1. `check-c1.cjs <salonId> "QA T161 Fido"`: I0 (`incassatoTotale`).
2. Apri `/incassi?periodo=mese&data=<data di 10 giorni fa>`. Assert: titolo «Incassi», sottotitolo «Solo appuntamenti completati», KPI POS, Contanti, Appuntamenti, Media a cane, Persi; nell'elenco la riga con «QA T161 Fido» e 20 euro. Annota INCASSATO = M0.
3. Elimina il cane: `/animali/qat161fido-dog` → **Menu** → **Elimina definitivamente** → **`Elimina`**.
4. Riapri lo stesso periodo di `/incassi`. Assert: INCASSATO = M0 (invariato); la riga ora si chiama «Cane eliminato» con 20 euro.
5. Premi la riga: si apre `/appuntamenti/qat161fido-chiusa` con «Cane eliminato», stato Completato.
6. `check-c1.cjs`: `incassatoTotale` = I0, `qat161fido-chiusa` completato.

### TC-02: Periodi e KPI
| Controllo | Azione | Risultato atteso |
|---|---|---|
| Giorno / Settimana / Mese | click | `?periodo` cambia, totali ricalcolati |
| Settimana corrente | osserva | INCASSATO e pill «vs sett. scorsa» |
| Periodo successivo | nel periodo corrente | disabilitato |
| Chiudi › | se ci sono visite da chiudere | porta a `/#da-chiudere` |
| Barra del grafico | click | evidenzia la riga |

## Assertions
- [ ] Incassato invariato dopo eliminazione del cane.
- [ ] Visita chiusa visibile come «Cane eliminato».
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Incassi prima/dopo l'eliminazione, esito check

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 L'incassato totale non cambia dopo l'eliminazione (restano la chiusa e la da chiudere) | TC-01 |
| AC-7 | AC7 La visita chiusa del cane eliminato resta visibile (come «Cane eliminato») negli Incassi | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
