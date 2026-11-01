# T116-licenze-elenco-as-titolare: Licenze open source - elenco

| Field | Value |
|---|---|
| Route | `/impostazioni/licenze` |
| Source | `src/pages/LicenzePage.tsx` |
| Flow | Leggere l'elenco delle librerie open source |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- Librerie attese: React MIT, Capacitor MIT, Firebase Apache-2.0, Lucide ISC.

## Steps

### TC-01: Happy path - la pagina mostra le licenze
1. Sign in as titolare. Navigate to `/impostazioni/licenze`.
2. Assert: titolo "Licenze open source" e testo che inizia con "Groomly usa librerie open source".
3. Assert: tabella con colonne Libreria e Licenza e quattro righe: React / MIT, Capacitor / MIT, Firebase / Apache-2.0, Lucide / ISC.
4. Assert: nessun form, nessun pulsante di azione.

### TC-02: Persistenza
1. Reload. Assert: lo stesso elenco di quattro righe.

### TC-03: Negative & edge cases
- Ridimensionare la finestra a 360 px di larghezza. Assert: le righe restano leggibili, nessun testo tagliato.
- Navigate to `/impostazioni/licenze/` (slash finale). Assert: nessun crash, pagina mostrata o redirect coerente.

## Assertions
- [ ] Le quattro librerie con la licenza corretta sono visibili.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
