# T193-listino-prezzi-massa-annulla-as-titolare: Destructive - Aggiorna prezzi, operazioni di massa e Annulla tutto

| Field | Value |
|---|---|
| Route | `/listino/prezzi` |
| Source | `src/pages/PriceSheetPricesPage.tsx` |
| Flow | Operazione di massa; Annullare tutto con conferma; Uscire con modifiche non salvate |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes (annulla modifiche non salvate) |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare; scheda Piccola senza modifiche pendenti

## Test data
- Nessun input testuale; si usano i pulsanti `+5%`, `+10%`, `+1 €`, `−1 €`, `Arrotonda`.

## Steps

### TC-01: Happy path - Operazione di massa e Salva
1. Sign in as titolare. Navigate to `/listino/prezzi`.
2. Clicca **`+10%`**. Assert: contatore "14 prezzi modificati" nella scheda Piccola; prezzi originali barrati.
3. Clicca **`Annulla tutto`**. Assert: dialogo `Annullare le modifiche?` con **`Conferma`** e **`Annulla`**.

### TC-02: Modal - `annulla-modifiche`
1. Clicca **`Annulla`**. Assert: dialogo chiuso, contatore ancora 14.
2. Clicca **`Annulla tutto`** e **`Conferma`**. Assert: contatore azzerato, nessun prezzo barrato, **`Salva`** disabilitato.

### TC-03: Altre operazioni di massa
1. Clicca **`+5%`**. Assert: contatore > 0. **`Annulla tutto`** → **`Conferma`**.
2. Clicca **`+1 €`**, assert un prezzo è aumentato di 1 €. Clicca **`−1 €`**, assert torna al valore originale (modifiche rimosse).
3. Clicca **`Arrotonda`**. Assert: i prezzi modificati risultano arrotondati (interi). Annulla tutto con conferma.

### TC-04: Modal - `esci`
1. Clicca **`+5%`**. Clicca **`Indietro`**. Assert: dialogo `Esci` con avviso modifiche perse.
2. Clicca **`Annulla`**. Assert: resti su `/listino/prezzi` con modifiche mantenute.
3. Clicca **`Indietro`** e **`Conferma`**. Assert: URL `/listino`.
4. Ritorna a `/listino/prezzi`. Assert: nessuna modifica salvata, contatore 0.

### TC-05: Indietro senza modifiche
1. Clicca **`Indietro`** a contatore 0. Assert: nessun dialogo, URL `/listino`.

## Assertions
- [ ] Dopo +10% il contatore mostra "14 prezzi modificati"
- [ ] Annulla tutto apre il dialogo e Conferma azzera il contatore
- [ ] Uscita con modifiche richiede conferma e le scarta
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialogo `Annullare le modifiche?`
- Dialogo `Esci`
- Stato con 14 prezzi modificati

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
