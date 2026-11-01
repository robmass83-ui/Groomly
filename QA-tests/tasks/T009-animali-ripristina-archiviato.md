# T009-animali-ripristina-archiviato: Animali - ripristino animale archiviato

| Field | Value |
|---|---|
| Route | `/animali` |
| Source | `src/pages/DogsPage.tsx` |
| Flow | Restore archived dog |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: at least 1 archived animal (subtitle shows "M in archivio", M >= 1)

## Test data
- `archivedDog` = name of an archived animal (found in `/impostazioni/archivio`)

## Steps

### TC-01: Happy path - ripristinare
1. Sign in as titolare. Navigate to `/animali`; note N attivi and M in archivio.
2. Locate a row carrying button **Ripristina** (archived rows; use search for `archivedDog` if needed).
3. Click **Ripristina**.
4. Assert: the row no longer shows **Ripristina**; subtitle becomes "N+1 attivi · M-1 in archivio".
5. Reload the page. Assert: counts persist and the animal appears in tab **Attivi**.

### TC-02: Archivio redirect
1. Navigate to `/animali?tab=archivio`. Assert: redirect to `/impostazioni/archivio`.

## Assertions
- [ ] Counts in header update after restore.
- [ ] Restore persists after reload.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Before restore
- After restore

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
