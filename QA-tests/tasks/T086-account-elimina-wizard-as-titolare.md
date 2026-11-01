# T086-account-elimina-wizard-as-titolare: Elimina account - wizard fino al passo password

| Field | Value |
|---|---|
| Route | `/impostazioni/account/elimina` |
| Source | `src/pages/EliminaAccountPage.tsx` |
| Flow | Percorrere i passi del wizard |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes (l'eliminazione finale NON va eseguita) |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare (account non protetto, senza abbonamento Play)

## Test data
- Nessun input fino al passo 4; la password è quella del ruolo titolare (risolta dal runner, mai scritta qui).

## Steps

### TC-01: Happy path - Percorrere il wizard senza eliminare
1. Sign in as titolare. Navigate to `/impostazioni/account/elimina`.
2. Assert (passo 0): titolo `Elimina account`, elenco dei dati eliminati, pulsante **`Continua`**; footer con `info@groomlyapp.it`.
3. Clicca **`Continua`**. Assert (passo 1): invito a salvare una copia, pulsante **`Salva su…`**.
4. Clicca **`Continua`**. Assert (passo 2 o 3): se il piano Play non è attivo il passo Play non compare; compare l'avviso per il titolare.
5. Clicca **`Continua`** fino al passo password. Assert: campo `Password attuale` visibile, **`Continua`** disabilitato con campo vuoto.
6. Digita la password corretta del ruolo e clicca **`Continua`**. Assert (passo 5): campo `Parola di conferma`, pulsante **`Conferma elimina`** disabilitato.
7. NON cliccare **`Conferma elimina`**.

### TC-02: Uscita
1. Clicca **`Indietro`**. Assert: URL `/impostazioni/account?scheda=privacy`.
2. Torna a `/impostazioni/account/elimina` e verifica che il wizard riparta dal passo 0.

### TC-03: Backup dal passo 1
1. Al passo 1 clicca **`Salva su…`**. Assert: navigazione a `/impostazioni` con il flusso di backup aperto (openBackup).

## Assertions
- [ ] Passo 0 mostra elenco dati eliminati e Continua
- [ ] Passo 1 offre "Salva su…"
- [ ] Passo 4: Continua disabilitato con password vuota
- [ ] Footer mostra info@groomlyapp.it
- [ ] Nessun account eliminato
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Ogni passo del wizard
- Final state (passo 5 con bottone disabilitato)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
