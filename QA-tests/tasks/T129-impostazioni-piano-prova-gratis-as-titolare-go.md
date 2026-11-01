# T129-impostazioni-piano-prova-gratis-as-titolare-go: Piano Base, Prova gratis

| Field | Value |
|---|---|
| Route | `/impostazioni/piano` |
| Source | `src/pages/PianoPagine.tsx` |
| Flow | Avviare prova gratuita (Base) |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare-go` (piano Base), prova Plus non ancora avviata

## Test data
- Nessun input.

## Steps

### TC-01: Render piano Base
1. Sign in as `titolare-go`, navigate to `/impostazioni/piano`.
2. Assert: titolo "Piano" e sezioni PROFILO BASE, SERVIZIO BASE, SERVIZIO PLUS, SERVIZIO SALONE.
3. Assert: compaiono pulsanti **Prova gratis** oppure **In arrivo** per le funzioni Plus; la sezione prenotazioni online con link non è mostrata attiva.

### TC-02: Prova gratis
1. Click **Prova gratis**.
2. Assert: la prova parte (sezioni Plus sbloccate, il pulsante sparisce) oppure si apre il paywall se non disponibile (**In arrivo**). Registra l'esito.
3. Reload. Assert: stato persistito.

### TC-03: Avvisami per il Salone
1. Click **Avvisami per il Salone**. Assert: feedback visibile di interesse registrato.

### TC-04: Navigazione
1. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Il piano Base vede Prova gratis / In arrivo.
- [ ] Esito della prova coerente dopo reload.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Dopo Prova gratis
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
