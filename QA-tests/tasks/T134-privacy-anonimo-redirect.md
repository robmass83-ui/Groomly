# T134-privacy-anonimo-redirect: Privacy e termini - utente non autenticato

| Field | Value |
|---|---|
| Route | `/impostazioni/privacy` |
| Source | `src/pages/PrivacyPage.tsx` |
| Flow | Accesso senza sessione |
| Requires auth | yes |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 4 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Nessuna sessione attiva (storage pulito)

## Test data
- Nessun input.

## Steps

### TC-01: Redirect
1. Navigate to `/impostazioni/privacy` da anonimo.
2. Assert: viene mostrata la schermata di accesso (redirect al login) e il testo "Groomly tratta l account" non e visibile.
3. Dopo il sign in come titolare, assert che l'app porta su una pagina valida (annota se torna a Privacy o alla Home).

## Assertions
- [ ] Contenuto protetto non visibile da anonimo.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Schermata dopo redirect

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
