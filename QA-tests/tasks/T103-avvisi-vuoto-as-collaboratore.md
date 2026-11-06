# T103-avvisi-vuoto-as-collaboratore: Avvisi — stato vuoto come collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/avvisi` |
| Source | `src/pages/AvvisiSistemaPage.tsx` |
| Flow | View empty state "Nessuna notifica" |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 7 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore` with the plan active
- Seed: no system notices

## Test data
- None to type.

## Steps

### TC-01: Happy path — Visualizzare Avvisi
1. Sign in as `collaboratore`. Navigate to `/impostazioni/avvisi`.
2. Assert: heading `Avvisi`, text `Nessuna notifica` and description.
3. Assert: no compose icon, no `Elimina avviso`.
4. Click **`Indietro`**. Assert: URL `/impostazioni`.

### TC-02: Tab bar
1. Click `Home`, `Animali`, `Agenda`, `Mensili`, `Listino`, `Altro` in sequence.
2. Assert: URLs `/`, `/animali`, `/calendario`, `/mensili`, `/listino`, `/altro`.

## Assertions
- [ ] Page accessible to collaboratore with active plan.
- [ ] No operator controls.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
