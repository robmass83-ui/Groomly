# T104-avvisi-operatore-negativo-as-titolare: Avvisi — controlli riservati all'operatore (negative)

| Field | Value |
|---|---|
| Route | `/impostazioni/avvisi` |
| Source | `src/pages/AvvisiSistemaPage.tsx` |
| Flow | Operator: write notice, validation of empty title, publish, delete with confirm (not reachable by test roles) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` (not an operator account)

## Test data
- Operator-only form `scrivi-avviso` data (only used if an operator account is available in the credential map; otherwise TC-02 is skipped and reported as skipped):
  - `tipo` = `Aggiornamento` (others: `Importante`, `Manutenzione`, `Novità`)
  - `titolo` = `"Manutenzione notturna"`; invalid `"   "`
  - `testo` = `"Servizio fermo alle 2"`

## Steps

### TC-01: Controlli operatore assenti
1. Sign in as `titolare`, navigate to `/impostazioni/avvisi`.
2. Assert: no compose icon, no dialog `Scrivi un avviso`, no button `Pubblica a tutti i saloni`, no `Elimina avviso`.
3. Search the DOM for the text `Scrivi un avviso`. Assert: absent.
4. Assert: the empty state `Nessuna notifica` is shown.

### TC-02: Avvisi solo dalla Console
1. Gli avvisi si scrivono e si tolgono dalla Console admin (pagina Comunicazioni), non più da qui: su `/impostazioni/avvisi` nessun account vede controlli di scrittura.

### TC-03: Negative
- Direct navigation as `titolare` never exposes the compose form.

## Assertions
- [ ] Non-operator never sees operator controls.
- [ ] (Operator run) empty title yields `Scrivi un titolo`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- (Operator run) compose dialog, validation error, final state

## Pass criteria
All TCs above pass (TC-02 may be reported as skipped when no operator account exists) AND no unexpected console/network errors.
