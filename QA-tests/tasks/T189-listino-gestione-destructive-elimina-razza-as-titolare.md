# T189-listino-gestione-destructive-elimina-razza-as-titolare: Destructive - Elimina razza

| Field | Value |
|---|---|
| Route | `/listino/gestione` |
| Source | `src/pages/PriceSheetManagePage.tsx` |
| Flow | Eliminare una razza (con conferma); Togli servizio |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: nessuna dipendenza; la razza `Elimina QA {runId}` viene creata dal test (NON eliminare razze del seed)

## Test data
- `breedName = "Elimina QA {runId}"`, `taglia = "Grande"`, voce `Bagno`, Tipo `fisso`, Prezzo `20`, voce `Tosatura`, Tipo `fisso`, Prezzo `30`

## Steps

### TC-01: Happy path - creare ed eliminare la razza
1. Sign in as titolare. Navigate to `/listino/gestione`. Annotare il contatore Grande.
2. Click **Razza**, Nome = `Elimina QA {runId}`, Taglia **Grande**, aggiungere Bagno (fisso, `20`) e Tosatura (fisso, `30`), click **Salva**. Assert: la razza è in lista, contatore +1.
3. Click il cestino **Elimina razza** della razza. Assert: dialog "Eliminare questa razza?" con testo "La razza sparisce dal listino. Potrai aggiungerla di nuovo dopo." e pulsanti **Elimina** e **Annulla**.
4. Click **Annulla**. Assert: dialog chiuso, la razza è ancora in lista, contatore invariato.
5. Riaprire il dialog e click **Elimina**.
6. Assert: la razza sparisce dalla lista; il contatore Grande torna al valore annotato.
7. Reload. Assert: la razza non compare. Navigate to `/listino`; assert: la razza non è nel foglio.

### TC-02: Togli servizio
1. Creare di nuovo una razza con due voci. Aprirla e click **Togli servizio (×)** su Tosatura.
2. Assert: la voce sparisce dallo sheet. Click **Salva**; assert: la razza mostra solo Bagno. Reload; persiste.
3. Eliminare la razza di test.

### TC-03: Elimina dallo sheet
1. Aprire una razza di test e click **Elimina razza** dentro lo sheet. Assert: dialog "Eliminare questa razza?". Click **Annulla**; assert: razza intatta. Poi **Elimina**; assert: razza rimossa.

### TC-04: Negative & edge cases
- Eliminare tutte le razze di test e verificare che il contatore finale coincide con quello iniziale.
- Dopo l'eliminazione, aggiungere di nuovo una razza con lo stesso nome. Assert: possibile ("Potrai aggiungerla di nuovo dopo"); poi eliminarla.

## Assertions
- [ ] Annulla non elimina.
- [ ] Elimina rimuove la razza in gestione e in `/listino`.
- [ ] Nessuna razza del seed è stata toccata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Dialog "Eliminare questa razza?"
- Final state after delete

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
