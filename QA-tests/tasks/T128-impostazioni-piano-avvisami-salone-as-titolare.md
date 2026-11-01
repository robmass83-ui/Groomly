# T128-impostazioni-piano-avvisami-salone-as-titolare: Avvisami per il Salone

| Field | Value |
|---|---|
| Route | `/impostazioni/piano` |
| Source | `src/pages/PianoPagine.tsx` |
| Flow | Chiedere avviso per Salone |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`, piano Salone non attivo, interesse "team" non ancora registrato

## Test data
- Nessun input.

## Steps

### TC-01: Registra interesse
1. Sign in as `titolare`, navigate to `/impostazioni/piano`.
2. Nella sezione SERVIZIO SALONE assert: "Si sblocca con Salone" e **Avvisami per il Salone**.
3. Click **Avvisami per il Salone**.
4. Assert: appare conferma (toast o cambio di stato del pulsante) che l'interesse è registrato.
5. Reload. Assert: lo stato registrato persiste (pulsante cambiato o disabilitato).

### TC-02: Doppio click
1. Se il pulsante è ancora attivo, click di nuovo. Assert: nessun errore né duplicazione; registra l'esito.

### TC-03: Con Salone attivo (se disponibile un account con Salone)
1. Assert: "Collaboratori" è un link a `/impostazioni/pro`. Click. Assert: URL `/impostazioni/pro`.

## Assertions
- [ ] Interesse Salone registrato con feedback visibile.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Prima del click
- Dopo il click
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
