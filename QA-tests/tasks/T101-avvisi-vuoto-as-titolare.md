# T101-avvisi-vuoto-as-titolare: Avvisi — stato vuoto e navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni/avvisi` |
| Source | `src/pages/AvvisiSistemaPage.tsx` |
| Flow | View empty state "Nessuna notifica" |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Seed: no system notices published

## Test data
- None to type (read-only page).

## Steps

### TC-01: Happy path — Visualizzare la pagina Avvisi
1. Sign in as `titolare`. Navigate to `/impostazioni`, click row **`Avvisi`**.
2. Assert: URL `/impostazioni/avvisi`, heading `Avvisi` visible.
3. Assert: empty state text `Nessuna notifica` with its description line.
4. Assert: no compose (write notice) icon and no `Elimina avviso` button are rendered.
5. Click **`Indietro`**. Assert: URL `/impostazioni`.
6. Reload `/impostazioni/avvisi`. Assert: same empty state.

### TC-02: Tab bar
| Button | Action taken | Expected result |
|---|---|---|
| `Home` | click | `/` |
| `Animali` | click | `/animali` |
| `Agenda` | click | `/calendario` |
| `Mensili` | click | `/mensili` |
| `Listino` | click | `/listino` |
| `Impostazioni` | click | `/impostazioni` |
| `Aggiungi` (FAB) | click | opens new-appointment flow |

## Assertions
- [ ] Heading `Avvisi` and `Nessuna notifica` visible.
- [ ] No operator controls for a normal titolare.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
