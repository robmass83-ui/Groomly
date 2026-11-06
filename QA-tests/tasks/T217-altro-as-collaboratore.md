# T217-altro-as-collaboratore: Altro - accesso per ruolo

| Field | Value |
|---|---|
| Route | `/altro` |
| Source | `src/pages/AltroPage.tsx` |
| Flow | Stesse voci per collaboratore e piano Go; anonimo fuori |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Task scritto dal codice il 6/11/2026, senza analisi in browser: se un'etichetta non torna, annotalo come evidenza.

## Test data
- Nessun input.

## Steps

### TC-01: Collaboratore
1. Sign in as collaboratore. Navigate to `/altro`.
2. Assert: voci `Magazzino` e `Manca qualcosa? Proponilo` visibili.

### TC-02: Titolare-go
1. Sign out; sign in as titolare-go. Navigate to `/altro`.
2. Assert: stesse voci, nessun blocco di piano.

### TC-03: Anonimo
1. Sign out. Navigate to `/altro`.
2. Assert: reindirizzo alla schermata di accesso.

## Assertions
- [ ] Anonimo non vede la pagina
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stato finale di ogni TC

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
