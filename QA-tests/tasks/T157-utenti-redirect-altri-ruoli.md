# T157-utenti-redirect-altri-ruoli: Utenti - redirect per titolare-go, collaboratore, anonimo

| Field | Value |
|---|---|
| Route | `/impostazioni/utenti` |
| Source | `src/app/router.tsx` |
| Flow | Non operatore reindirizzato a /impostazioni |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Utenti disponibili: collaboratore, titolare-go; anonimo

## Test data
- Nessun input.

## Steps

### TC-01: Collaboratore
1. Sign in as collaboratore. Navigate to `/impostazioni/utenti`.
2. Assert: URL finale `/`; nessuna UI operatore.

### TC-02: Titolare-go
1. Sign out; sign in as titolare-go. Navigate to `/impostazioni/utenti`.
2. Assert: URL finale `/`; nessuna UI operatore.

### TC-03: Anonimo
1. Sign out. Navigate to `/impostazioni/utenti`.
2. Assert: reindirizzo alla schermata di accesso; nessun dato di saloni visibile.

## Assertions
- [ ] Nessun ruolo non operatore vede la pagina
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except redirect.

## Screenshots required
- Landing dopo redirect per ciascun ruolo

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
