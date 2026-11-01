# T071-abbonamento-piani-as-titolare: Abbonamento - i tre piani (Plus)

| Field | Value |
|---|---|
| Route | `/impostazioni/abbonamento` |
| Source | `src/pages/AbbonamentoPage.tsx` |
| Flow | Vedere i tre piani; aprire il dettaglio di un piano |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare (piano Plus attivo)

## Test data
- Piani: `go`, `plus`, `salone`

## Steps

### TC-01: Happy path - Vedere i piani
1. Sign in as titolare. Navigate to `/impostazioni/abbonamento`.
2. Assert: titolo **Abbonamento**; tre schede: Groomly Go, Groomly Plus, Groomly Salone "19,99 € al mese".
3. Assert: la scheda Groomly Plus mostra **Attivo**; Go e Salone mostrano il loro stato/prezzo (non Attivo).
4. Click la scheda Groomly Go. Assert: URL `/impostazioni/abbonamento/go`. Torna indietro.
5. Click la scheda Groomly Plus. Assert: URL `/impostazioni/abbonamento/plus`. Torna indietro.
6. Click la scheda Groomly Salone. Assert: URL `/impostazioni/abbonamento/salone`. Torna indietro.
7. Click **Indietro**. Assert: URL `/impostazioni`.

### TC-02: Negative & edge cases
- Ricarica `/impostazioni/abbonamento`: lo stato Attivo resta sulla scheda Plus.
- Click **Aggiungi (FAB)**: assert che si apre il menu di aggiunta senza errori.

## Assertions
- [ ] Tre schede visibili con link a `/impostazioni/abbonamento/:piano`.
- [ ] Solo il piano attivo mostra "Attivo", gli altri il prezzo.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Un dettaglio piano

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
