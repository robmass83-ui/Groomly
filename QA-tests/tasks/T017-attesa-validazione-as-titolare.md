# T017-attesa-validazione-as-titolare: Lista d'attesa - validazione form

| Field | Value |
|---|---|
| Route | `/animali/attesa` |
| Source | `src/pages/AttesaPage.tsx` |
| Flow | Submit vuoto mostra alert |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare (Plus)
- Almeno un servizio principale attivo

## Test data
- `blank = "   "` (solo spazi)
- `validNome = "Anna Verdi QA"`, `validPhone = "3330000001"`, `validEmail = "qa+val@example.test"`, `validCane = "Luna QA"`, `servizio = "Bagno"`
- `badEmailFormat = "not-an-email"` (il form non controlla il formato)

## Steps

### TC-01: Form validation - `attesa-aggiungi`
Il form ha `noValidate`; l'errore è un unico alert `Compila tutti i campi e scegli un trattamento.` Per ogni riga: parti da form vuoto, compila come indicato, clicca **`Salva`**.

| Caso | Compilazione | Esito atteso |
|---|---|---|
| Tutto vuoto | nessun campo | alert `Compila tutti i campi e scegli un trattamento.` (role=alert), nessuna riga aggiunta |
| Nome solo spazi | `Nome di chi aspetta` = `   `, resto valido | stesso alert |
| Telefono vuoto | `Telefono` = "" , resto valido | stesso alert |
| Email vuota | `Email` = "", resto valido | stesso alert |
| Nome cane vuoto | `Nome del cane` = "", resto valido | stesso alert |
| Trattamento non scelto | tutto valido, `Trattamento` vuoto | stesso alert |
| Email senza formato | `Email` = `not-an-email`, resto valido | nessun alert, iscritto salvato (nessun controllo di formato) |

### TC-02: Conteggio invariato dopo errori
1. Annota "N in attesa" prima dei casi con errore.
2. Dopo i casi con alert, assert: sottotitolo ancora "N in attesa" e righe invariate.

### TC-03: Alert scompare dopo salvataggio valido
1. Dopo un alert, compila tutto con i valori validi e clicca **`Salva`**.
2. Assert: l'alert non è più visibile e la riga `Luna QA` / `Bagno` compare.

## Assertions
- [ ] Submit vuoto mostra "Compila tutti i campi e scegli un trattamento."
- [ ] Nessun dato salvato nei casi invalidi
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Ogni stato di errore (almeno submit vuoto e trattamento mancante)
- Final state dopo il salvataggio valido

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
