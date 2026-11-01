# T084-account-destructive-esci-altri-dispositivi-as-titolare: Destructive - Esci da tutti gli altri dispositivi

| Field | Value |
|---|---|
| Route | `/impostazioni/account` |
| Source | `src/pages/AccountPage.tsx` |
| Flow | Revoca sessioni degli altri dispositivi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (una sola sessione di test)
- In emulatore la callable di revoca può rispondere con errore INTERNAL: in tal caso il toast d'errore è il risultato atteso e va registrato

## Test data
- Nessun campo compilato.

## Steps

### TC-01: Happy path - revocare le altre sessioni
1. Sign in as titolare. Navigate to `/impostazioni/account?scheda=sicurezza`.
2. Assert: pulsante **Esci da tutti gli altri dispositivi** visibile e abilitato.
3. Click **Esci da tutti gli altri dispositivi**.
4. Assert: compare un toast di esito (successo di revoca oppure errore esplicito in emulatore); la sessione corrente resta attiva (la pagina non va al login).
5. Reload. Assert: l'utente è ancora autenticato e vede `/impostazioni/account`.

### TC-02: Doppio click
1. Click due volte rapidamente sul pulsante. Assert: nessun crash, un solo esito visibile o esiti coerenti, nessun errore console non gestito.

### TC-03: Negative & edge cases
- Con rete offline (DevTools offline) click sul pulsante. Assert: toast d'errore; nessun logout locale.
- Verificare che altre azioni della scheda (Password, Cambia email) restano utilizzabili dopo l'esito.

## Assertions
- [ ] Il click produce un toast di esito.
- [ ] La sessione corrente non viene terminata.
- [ ] No console errors in DevTools at any step (salvo errore atteso offline).
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected (callable in emulatore, offline).

## Screenshots required
- Page initial load
- Toast di esito
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
