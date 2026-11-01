# T176-invito-anonimo: Invito aperto da utente non autenticato

| Field | Value |
|---|---|
| Route | `/invito/:token` |
| Source | `src/pages/InvitePage.tsx` |
| Flow | Anonimo: vede pulsante Entra |
| Requires auth | no |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Nessuna sessione attiva (anonymous)

## Test data
- `fakeToken = "token-finto-qa-0001"`

## Steps

### TC-01: Happy path - Anonimo vede Entra
1. Navigate to `/invito/token-finto-qa-0001` senza sessione.
2. Assert: titolo **Invito** visibile e link/bottone **Entra**.
3. Assert: nessuna chiamata a `acceptInvite` (nessuna richiesta POST a `.../acceptInvite`) e nessun errore in console.
4. Click **Entra**. Assert: URL `/login`.

### TC-02: Negative & edge cases
- Token vuoto o con caratteri speciali `/invito/%20%3Cscript%3E`: la pagina mostra Invito con Entra, senza crash.
- Reload su `/invito/token-finto-qa-0001`: stesso stato.

## Assertions
- [ ] Titolo Invito e link Entra per anonimo.
- [ ] Entra porta a `/login`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Pagina `/login` dopo il click

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
