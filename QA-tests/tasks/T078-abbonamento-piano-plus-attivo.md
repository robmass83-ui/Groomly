# T078-abbonamento-piano-plus-attivo: Abbonamento - Plus attivo e link prenotazione

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento/plus` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Active plan feature blocks; copy booking link |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (plus36)

## Test data
- Species toggles: `Cani`, `Gatti`, `Altro`

## Steps

### TC-01: Happy path - pagina Plus attiva
1. Sign in as titolare. Navigate to `/impostazioni/abbonamento/plus`.
2. Assert: "Attivo" and "SERVIZIO PLUS" visible; service list shows Promemoria, Cane pronto, Auguri, Tessera fedelta, Lista d attesa, Recensione Google.
3. Click each **Informazioni su <servizio>** button. Assert: an info panel opens for each.
4. Assert: booking link section with **Copia** and **Condividi**.
5. Click **Copia**. Assert: confirmation feedback (toast or label change) appears.
6. Click **Condividi**. Assert: share action triggers (share sheet or fallback) with no error.

### TC-02: Accetta prenotazioni per
1. Toggle **Gatti**. Assert: its state changes (pressed).
2. Toggle it back. Assert: original state restored. Reload and assert the state persists.

### TC-03: Known emulator issue
- Observe the POST to `pubblicaSalone` returns 500 in the emulator; record it as expected and not a failure of the page. Assert the page still renders.

## Assertions
- [ ] Attivo and SERVIZIO PLUS visible.
- [ ] Copy and share buttons respond.
- [ ] No console errors other than the known `pubblicaSalone` 500.

## Screenshots required
- Page initial load
- After Copia

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
