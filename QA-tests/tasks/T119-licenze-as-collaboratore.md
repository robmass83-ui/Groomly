# T119-licenze-as-collaboratore: Licenze open source come collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/licenze` |
| Source | `src/pages/LicenzePage.tsx` |
| Flow | Leggere l'elenco e tornare a Legale |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore

## Test data
- Librerie attese: React MIT, Capacitor MIT, Firebase Apache-2.0, Lucide ISC.

## Steps

### TC-01: Happy path - il collaboratore legge le licenze
1. Sign in as collaboratore. Navigate to `/impostazioni/licenze`.
2. Assert: URL resta `/impostazioni/licenze` (nessun redirect).
3. Assert: titolo "Licenze open source" e le quattro righe React MIT, Capacitor MIT, Firebase Apache-2.0, Lucide ISC.
4. Click **Indietro**. Assert: URL is `/impostazioni/legale`.

### TC-02: Negative & edge cases
- Assert: il link React ha href `https://github.com/facebook/react`.
- Reload su `/impostazioni/licenze`. Assert: stessa pagina, nessun redirect.

## Assertions
- [ ] Pagina accessibile al collaboratore.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
