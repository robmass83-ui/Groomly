# T093-aggiornamenti-as-titolare-go: Aggiornamenti come titolare free

| Field | Value |
|---|---|
| Route | `/impostazioni/aggiornamenti` |
| Source | `src/pages/ReleaseHistoryPage.tsx` |
| Flow | Caricare storico release da GitHub |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`, build APK
- Signed in as role `titolare-go`

## Test data
- Nessun input.

## Steps

### TC-01: Render
1. Sign in as `titolare-go`, navigate to `/impostazioni/aggiornamenti`.
2. Assert: titolo "Aggiornamenti", sottotitolo "Versione installata <versione>".
3. Assert: "Lo storico non si carica" e **Riprova** (GitHub bloccato).
4. Click **Riprova**. Assert: stato di errore ricompare, nessun crash.
5. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] La pagina non è limitata dal piano.
- [ ] Console: solo ERR_FAILED di GitHub ammessi.
- [ ] Nessuna richiesta 4xx/5xx oltre GitHub bloccato.

## Screenshots required
- Page initial load
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
