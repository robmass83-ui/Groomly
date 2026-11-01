# T194-listino-prezzi-as-titolare-go: Aggiorna prezzi - titolare piano gratuito e accesso collaboratore

| Field | Value |
|---|---|
| Route | `/listino/prezzi` |
| Source | `src/pages/PriceSheetPricesPage.tsx` |
| Flow | Modificare e salvare un prezzo; accesso per ruolo |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare-go; collaboratore e anonimo disponibili per TC-02/TC-03

## Test data
- `prezzoNuovo = "45"`, voce `Prezzo Bagno Yorkshire` in scheda Piccola

## Steps

### TC-01: Happy path - Modificare e salvare
1. Sign in as titolare-go. Navigate to `/listino/prezzi`.
2. Assert: titolo `Aggiorna prezzi`, **`Salva`** disabilitato.
3. Imposta `Prezzo Bagno Yorkshire` = `45` ed esci dal campo. Assert: contatore 1, barrato originale.
4. Clicca **`Salva`**. Assert: toast "prezzi salvati", contatore azzerato.
5. Ricarica. Assert: valore `45` persistito. Ripristina il valore originale e salva.

### TC-02: Collaboratore
1. Sign out; sign in as collaboratore. Navigate to `/listino/prezzi`.
2. Assert: la pagina non è accessibile (reindirizzo o schermata StaffSettings); nessun campo prezzo modificabile.

### TC-03: Anonimo
1. Sign out. Navigate to `/listino/prezzi`. Assert: reindirizzo alla schermata di accesso.

## Assertions
- [ ] Salva disabilitato con 0 modifiche
- [ ] Collaboratore non accede (StaffSettings)
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except redirect.

## Screenshots required
- Page initial load
- Toast dopo Salva
- Vista collaboratore

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
