# T008-animali-apri-scheda: Animali - apertura scheda e aggiunta

| Field | Value |
|---|---|
| Route | `/animali` |
| Source | `src/pages/DogsPage.tsx` |
| Flow | Open dog detail from row; empty-state CTA |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: at least 1 active animal named "Bella"

## Test data
- `rowName = "Bella"`

## Steps

### TC-01: Happy path - aprire la scheda di un animale
1. Sign in as titolare. Navigate to `/animali`.
2. Click the row button **Apri Bella**.
3. Assert: URL matches `/animali/<id>`; the page shows the name "Bella".
4. Navigate back. Assert: URL is `/animali`, list visible again.

### TC-02: Riga - contenuti
1. Assert: each row shows avatar, name (with monthly/senior flag when applicable), breed/age/owner, next appointment, temperament.

### TC-03: CTA aggiungi
1. Fill "Cerca" with `zzzzqq`. Click **Aggiungi un animale**.
2. Assert: URL is `/animali/nuovo`.

### TC-04: Negative & edge cases
- Navigate to `/animali/id-inesistente-000`. Assert: no crash; a not-found/empty state or redirect to `/animali` is shown and no unhandled console error.

## Assertions
- [ ] Row opens correct detail.
- [ ] Back returns to list.
- [ ] No console errors.
- [ ] No failed network requests except where expected.

## Screenshots required
- Page initial load
- Detail page
- Empty state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
