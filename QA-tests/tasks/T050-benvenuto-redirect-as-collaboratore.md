# T050-benvenuto-redirect-as-collaboratore: Tour non accessibile al collaboratore

| Field | Value |
|---|---|
| Route | `/benvenuto` |
| Source | `src/pages/TourPage.tsx` |
| Flow | Collaboratore reindirizzato a /impostazioni |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore
- Per TC-03: nessuna sessione attiva

## Test data
- Nessun campo compilato.

## Steps

### TC-01: Happy path - il redirect avviene
1. Sign in as collaboratore. Navigate to `/benvenuto`.
2. Assert: URL is `/impostazioni`.
3. Assert: la pagina Impostazioni è visibile e non compare nessun passo del tour (né **Iniziamo** né **Salta**).

### TC-02: Nessuna modifica di stato
1. Navigate to `/benvenuto` di nuovo e ricaricare. Assert: URL resta `/impostazioni`; nessun dato del salone è cambiato.

### TC-03: Negative & edge cases
- Sign out e navigate to `/benvenuto` da anonimo. Assert: redirect alla pagina di accesso (login), nessun contenuto del tour.
- Assert: nessun errore console non gestito durante il redirect.

## Assertions
- [ ] Collaboratore reindirizzato a `/impostazioni`.
- [ ] Anonimo reindirizzato al login.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Pagina di arrivo dopo il redirect
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
