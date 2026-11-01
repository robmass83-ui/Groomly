# T094-aggiornamenti-as-collaboratore: Aggiornamenti come collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/aggiornamenti` |
| Source | `src/pages/ReleaseHistoryPage.tsx` |
| Flow | Caricare storico release da GitHub |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`, build APK
- Signed in as role `collaboratore`

## Test data
- Nessun input.

## Steps

### TC-01: Render
1. Sign in as `collaboratore`, navigate to `/impostazioni/aggiornamenti`.
2. Assert: la pagina è accessibile (rolesAllowed include collaboratore): titolo "Aggiornamenti", sottotitolo "Versione installata <versione>". Se avviene un redirect a `/impostazioni`, registra la discrepanza.
3. Assert: "Lo storico non si carica" e **Riprova**.
4. Click **Riprova**. Assert: stato di errore, nessun crash.
5. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Accesso consentito al collaboratore.
- [ ] Console: solo ERR_FAILED di GitHub ammessi.
- [ ] Nessuna richiesta 4xx/5xx oltre GitHub bloccato.

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
