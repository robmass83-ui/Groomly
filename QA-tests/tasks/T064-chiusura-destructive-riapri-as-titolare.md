# T064-chiusura-destructive-riapri-as-titolare: Destructive - Riapri

| Field | Value |
|---|---|
| Route | `/chiusure/:id` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Reopen existing closure (destructive) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: una chiusura creata dal task T061 o da seed, motivo `Ferie QA da riaprire`

## Test data
- `motivoNuovo = "Ferie QA modificate"`

## Steps

### TC-01: Happy path - Modificare una chiusura esistente
1. Sign in as titolare. Dal Calendario click sul giorno chiuso per aprire `/chiusure/<id>`.
2. Assert: sheet con Motivo precompilato e pulsanti **Salva** e **Riapri**.
3. Cambia Motivo in `Ferie QA modificate`, click **Salva**.
4. Assert: sheet chiusa; il Calendario mostra il nuovo motivo. Reload: persiste.

### TC-02: Destructive - Riapri, Annulla
1. Riapri `/chiusure/<id>`, click **Riapri**.
2. Assert: dialog "Riaprire il salone?" con **Annulla** e **Riapri**.
3. Click **Annulla**. Assert: dialog chiuso, chiusura ancora presente.

### TC-03: Destructive - Riapri, conferma
1. Click **Riapri**, poi **Riapri** nel dialog.
2. Assert: sheet chiusa; il giorno non risulta piu chiuso nel Calendario.
3. Reload. Assert: la chiusura non c'e piu.

### TC-04: Edge cases
- Navigate to `/chiusure/id-inesistente-xyz`: nessun crash; annota il comportamento (redirect o sheet vuota).

## Assertions
- [ ] Annulla non modifica nulla.
- [ ] Riapri rimuove la chiusura in modo persistente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Sheet chiusura esistente
- Dialog Riaprire il salone?
- Calendario dopo la riapertura

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
