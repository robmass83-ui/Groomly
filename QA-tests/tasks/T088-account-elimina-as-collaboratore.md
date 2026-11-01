# T088-account-elimina-as-collaboratore: Elimina account - collaboratore e anonimo

| Field | Value |
|---|---|
| Route | `/impostazioni/account/elimina` |
| Source | `src/pages/EliminaAccountPage.tsx` |
| Flow | Avviso membro; accesso anonimo |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | yes (mai completare l'eliminazione) |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as collaboratore

## Test data
- Nessun input testuale; password del ruolo risolta dal runner.

## Steps

### TC-01: Wizard come membro
1. Sign in as collaboratore. Navigate to `/impostazioni/account/elimina`.
2. Assert: passo 0 con elenco dati e **`Continua`**.
3. Clicca **`Continua`** fino al passo avviso. Assert: compare l'avviso per membro (testo diverso da quello del titolare) e non l'avviso di eliminazione del salone.
4. Prosegui fino al passo password. Assert: **`Continua`** disabilitato con campo vuoto. Non completare.
5. Clicca **`Indietro`**. Assert: URL `/impostazioni/account?scheda=privacy`.

### TC-02: Anonimo
1. Sign out. Navigate to `/impostazioni/account/elimina`. Assert: reindirizzo alla schermata di accesso.

## Assertions
- [ ] Avviso membro mostrato al collaboratore
- [ ] Nessun account eliminato
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Passo avviso membro

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
