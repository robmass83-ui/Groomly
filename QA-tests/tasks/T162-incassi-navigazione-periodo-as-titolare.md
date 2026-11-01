# T162-incassi-navigazione-periodo-as-titolare: Incassi - precedente, successivo, Oggi, righe

| Field | Value |
|---|---|
| Route | `/incassi` |
| Source | `src/pages/EarningsPage.tsx` |
| Flow | Periodo precedente/successivo e Oggi; aprire un appuntamento dalla riga |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T162 Fido"` (annota `salonId`).

## Test data
- Visita ospite `qat162fido-ospite` («Ospite QA T162 Fido», da chiudere, ieri); visita chiusa a ~10 giorni fa.

## Steps

### TC-01: Happy path - navigazione e riga ospite (AC6)
1. Apri `/incassi?periodo=settimana`. Assert: **Periodo successivo** disabilitato e **Oggi** assente nel periodo corrente.
2. Se compare il link **`Chiudi ›`** (visite da chiudere), premilo: URL `/#da-chiudere`, la Home mostra «Ospite QA T162 Fido» (mai «Cane eliminato»). Torna con **Indietro**.
3. Premi **`Periodo precedente`** fino al periodo con la visita chiusa (~10 giorni fa). Assert: **Oggi** ora visibile, la riga «QA T162 Fido» c'è.
4. Premi la riga: si apre `/appuntamenti/qat162fido-chiusa`; torna indietro.
5. Premi **Oggi**: torna al periodo corrente.
6. Passa a **Mese**, poi premi una riga giorno: passa alla vista **Giorno**.

### TC-02: Edge
- Swipe orizzontale sul grafico cambia periodo.
- `/incassi?periodo=giorno&data=2099-01-01`: nessun crash, valori a zero e testo di vuoto.

## Assertions
- [ ] Navigazione periodo coerente.
- [ ] L'ospite compare col suo nome, mai «Cane eliminato».
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Periodo corrente, precedente, riga aperta

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-6 | AC6 Una visita da chiudere di un ospite mostra il nome dell'ospite, mai «Cane eliminato», in Home (via Chiudi ›) e in Incassi | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
