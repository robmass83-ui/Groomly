# T168-incassi-report-export-as-titolare: Incassi e report - Esporta per il commercialista

| Field | Value |
|---|---|
| Route | `/incassi/report` |
| Source | `src/pages/EarningsReportPage.tsx` |
| Flow | Open export sheet |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare` (plus36).
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T168 Fido"` (annota `salonId`).

## Test data
- `Periodo = Anno`, `Formato = Excel`, `Cosa includere = Riepilogo + Dettaglio appuntamenti`.
- Elimina prima il cane `qat168fido-dog` per avere una visita chiusa di un cane eliminato.

## Steps

### TC-01: Happy path - esporta con il cane eliminato (AC2)
1. `check-c1.cjs <salonId> "QA T168 Fido"`: I0.
2. Elimina il cane (`/animali/qat168fido-dog` → Menu → Elimina definitivamente → **Elimina**).
3. Apri `/incassi/report`, premi **`Esporta`**. Assert: sheet «Esporta per il commercialista» con Periodo (Mese/Anno/Da... a...), Formato (PDF/Excel), toggle Riepilogo, Dettaglio appuntamenti, Tipo di pagamento, Dati dell'attività, Mancati incassi.
4. Scegli **Anno**, **Excel**, attiva Riepilogo e Dettaglio appuntamenti, premi **`Salva`**. Assert: parte il download del file (o conferma di salvataggio) senza errore.
5. Se il file è ispezionabile, assert: il totale incassato = I0 e la visita chiusa compare come «Cane eliminato».
6. Riapri **Esporta** e premi **`Invia al commercialista`**: assert comparsa dell'esito (conferma o richiesta di destinatario), senza crash.
7. `check-c1.cjs`: `incassatoTotale` = I0.

### TC-02: Edge
- Periodo **Da... a...** con date invertite: errore o blocco visibile.
- Disattiva tutti i toggle: l'export avverte o è bloccato.

## Assertions
- [ ] Sheet export con tutti i campi.
- [ ] Esportazione eseguita senza errori.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Sheet export compilato, esito

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-2 | AC2 L'incassato totale non cambia dopo l'eliminazione del cane (verificato anche nell'export) | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
