# T309-ex-collaboratore-riparte-dal-suo-salone: Dopo l'eliminazione del titolare l'ex collaboratore riparte dal proprio salone

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/components/AccessoSospeso.tsx`, `src/data/firebase/client.ts` |
| Flow | Accesso di un ex collaboratore il cui titolare ha eliminato l'account |
| Requires auth | yes |
| Required role | ex-collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Il titolare salone56 ha già eliminato l'account (script `verify-a8-a9.cjs`).

## Test data
- Nessuno.

## Steps

### TC-01: Accesso dell'ex collaboratore (AC1)
1. Sign in as ex-collaboratore (staff56b).
2. Assert: non compare «Il titolare ha spento il piano» né un blocco senza uscita; si arriva alla Home (o al primo avvio) di un salone proprio, vuoto (nessun cane del vecchio salone).
3. Apri Impostazioni. Assert: l'account risulta titolare del proprio salone (nessun riferimento al salone eliminato «Salone attivo» di salone56).

### TC-02: Ricarica (AC1)
1. Ricarica la pagina dopo 10 s. Assert: stesso risultato, nessun messaggio di piano spento.

## Assertions
- [ ] L'ex collaboratore riparte dal proprio salone.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Prima schermata dopo l'accesso
- Impostazioni

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Un ex collaboratore del salone eliminato (staff56b) entra e non vede «Il titolare ha spento il piano»: parte come un salone nuovo, suo | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
