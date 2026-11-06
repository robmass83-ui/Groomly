# T120-licenze-as-titolare-go: Licenze open source come titolare free

| Field | Value |
|---|---|
| Route | `/impostazioni/licenze` |
| Source | `src/pages/LicenzePage.tsx` |
| Flow | Leggere l'elenco e tornare a Legale |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go

## Test data
- Elenco completo generato: ogni riga mostra nome, versione e licenza; fra le righe ci sono react, @capacitor/core, firebase e lucide-react.

## Steps

### TC-01: Happy path - il titolare free legge le licenze
1. Sign in as titolare-go. Navigate to `/impostazioni/licenze`.
2. Assert: titolo "Licenze open source" e il testo "Groomly usa librerie open source".
3. Assert: lo stesso elenco completo visto dal titolare.
4. Click **Indietro**. Assert: URL is `/impostazioni/legale`.

### TC-02: Negative & edge cases
- Assert: nessuna richiesta di upgrade o blocco di piano nella pagina.
- Assert: le righe non sono link.

## Assertions
- [ ] Pagina accessibile al piano free senza redirect.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
