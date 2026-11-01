# T192-listino-prezzi-validazione-as-titolare: Aggiorna prezzi - validazione input

| Field | Value |
|---|---|
| Route | `/listino/prezzi` |
| Source | `src/pages/PriceSheetPricesPage.tsx` |
| Flow | Modificare un singolo prezzo (valori invalidi) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare; `Prezzo Bagno Yorkshire` = 28 in scheda Piccola

## Test data
- `negativo = "-5"`, `testo = "abc"`, `virgola = "30,5"`, `uguale = "28"`, `vuoto = ""`

## Steps

### TC-01: Form validation - `griglia-prezzi`
Per ogni valore scrivi nel campo `Prezzo Bagno Yorkshire` ed esci dal campo.

| Valore | Esito atteso |
|---|---|
| `-5` | ignorato: resta 28, 0 modifiche, **`Salva`** disabilitato |
| `abc` | ignorato: resta il valore precedente, 0 modifiche |
| `30,5` | accettato: diventa `30,50`, 1 modifica, **`Salva`** abilitato |
| `28` (dopo 30,5) | uguale all'originale: la modifica è rimossa, 0 modifiche |
| `` (vuoto) | annotare il comportamento reale (valore precedente mantenuto o ripristino) |

### TC-02: Salva con 0 modifiche
1. Assert: **`Salva`** disabilitato quando il contatore è 0; un click non produce toast.

## Assertions
- [ ] Prezzo negativo ignorato
- [ ] Testo non numerico ignorato
- [ ] Valore uguale all'originale rimuove la modifica
- [ ] Nessun dato salvato
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Ogni caso invalido
- Stato 30,50 con barrato

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
