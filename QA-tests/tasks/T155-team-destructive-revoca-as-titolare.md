# T155-team-destructive-revoca-as-titolare: Destructive - Revoca membro

| Field | Value |
|---|---|
| Route | `/impostazioni/team` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Revocare un membro |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare con piano Salone attivo
- Seed: membro dedicato `QA Membro {runId}` (collaboratore) creato per il test; NON revocare membri del seed principale
- La revoca è immediata e senza conferma: il test la esegue solo sul membro dedicato
- In emulatore la callable `revokeMember` può dare INTERNAL: registrare il toast d'errore come limite dell'emulatore

## Test data
- `memberName = "QA Membro {runId}"`

## Steps

### TC-01: Happy path - revocare il membro dedicato
1. Sign in as titolare. Navigate to `/impostazioni/team`.
2. Assert: nell'elenco compare "QA Membro {runId}" con chip Ruolo "Collaboratore" e il contatore "n di m posti".
3. Annotare il numero di posti usati.
4. Click **Revoca QA Membro {runId}**.
5. Assert: nessun dialog di conferma (revoca immediata); "QA Membro {runId}" scompare dall'elenco e i posti usati diminuiscono di 1 (oppure toast d'errore emulatore).
6. Reload. Assert: il membro non compare.

### TC-02: Effetto sul membro revocato
1. Sign out, tentare l'accesso come il membro revocato. Assert: accesso al salone negato/sospeso.

### TC-03: Negative & edge cases
- Assert: il titolare non ha un pulsante **Revoca** su sé stesso.
- Doppio click su **Revoca**. Assert: nessun errore console non gestito, una sola revoca.

## Assertions
- [ ] Il membro revocato scompare dall'elenco e libera un posto.
- [ ] Nessun altro membro è stato modificato.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected (callable emulatore).

## Screenshots required
- Page initial load
- Elenco prima e dopo la revoca
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
