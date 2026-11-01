# T060-chiusure-id-solo-lettura-as-collaboratore: Collaboratore in sola lettura

| Field | Value |
|---|---|
| Route | `/chiusure/:id` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Collaboratore: solo lettura |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore`
- Esiste una chiusura "Sola lettura {runId}" il 2027-07-10

## Test data
- `Data = "2027-07-10"`, `Motivo = "Sola lettura {runId}"`

## Steps

### TC-01: Visualizzazione chiusura esistente
1. Sign in as `collaboratore`.
2. Navigate to `/calendario?data=2027-07-10` e apri la chiusura (oppure dalla banda chiusura in Home "Apri chiusura Sola lettura {runId}").
3. Assert: titolo "Chiusura del salone"; Motivo "Sola lettura {runId}" visibile e disabilitato; Data disabilitata.
4. Assert: **Salva** e **Riapri** non sono presenti; **Chiudi** è presente.
5. Click **Chiudi**. Assert: si torna alla pagina precedente, chiusura invariata.

### TC-02: Nessuna creazione
1. Prova ad aprire una nuova chiusura (**+** > **Chiusura**).
2. Assert: il form è disabilitato oppure la voce non è disponibile; registra l'esito osservato. Nessun record creato.

## Assertions
- [ ] Form disabilitato, nessun Salva/Riapri.
- [ ] Chiusura invariata dopo l'accesso.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Sheet in sola lettura
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
