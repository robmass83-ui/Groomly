# T130-impostazioni-piano-accesso-collaboratore: Collaboratore non raggiunge il Piano

| Field | Value |
|---|---|
| Route | `/impostazioni/piano` |
| Source | `src/pages/PianoPagine.tsx` |
| Flow | Collaboratore non raggiunge la pagina (StaffSettings) |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore`

## Test data
- Nessun input.

## Steps

### TC-01: Accesso negato
1. Sign in as `collaboratore`.
2. Navigate to `/impostazioni/piano`.
3. Assert: la vetrina Piano non è mostrata (nessuna sezione SERVIZIO PLUS, nessun pulsante Prova gratis / Avvisami per il Salone); viene reso StaffSettings oppure un redirect a `/impostazioni`.
4. Navigate to `/impostazioni`. Assert: nessun accesso alla voce Piano.

### TC-02: Anonimo
1. Esci, apri `/impostazioni/piano` da anonimo. Assert: redirect alla schermata di accesso.

## Assertions
- [ ] Il collaboratore non vede mai il contenuto Piano.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Esito accesso collaboratore
- Esito accesso anonimo

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
