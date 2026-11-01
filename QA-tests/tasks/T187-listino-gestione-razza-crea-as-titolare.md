# T187-listino-gestione-razza-crea-as-titolare: Modal - Nuova razza e modifica

| Field | Value |
|---|---|
| Route | `/listino/gestione` |
| Source | `src/pages/PriceSheetManagePage.tsx` |
| Flow | Aggiungere una razza con voci di prezzo; modificare, duplicare, spostare |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 30 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: razze nelle tre taglie (7/11/10 nel seed)
- La razza `Barboncino toy {runId}` creata nel test viene eliminata alla fine (TC-05)

## Test data
- `breedName = "Barboncino toy {runId}"`, `taglia = "Piccola"`
- voce 1: `nome = "Bagno"`, `tipo = "fisso"`, `prezzo = "35"`
- voce 2: `nome = "Tosatura"`, `tipo = "da"`, `prezzo = "45"`
- modifica: `breedNameEdit = "Barboncino toy {runId} B"`, `prezzoEdit = "40"`

## Steps

### TC-01: Happy path - creare una razza
1. Sign in as titolare. Navigate to `/listino/gestione`. Annotare il contatore razze della taglia Piccola.
2. Click **Razza**. Assert: sheet "Nuova razza" con Nome sul listino, segmented Piccola/Media/Grande, catalogo servizi (Bagno, Bagno + tosatura, Bagno + sistemazione, Pelo corto, Pelo lungo, Tosatura, + Personalizzato).
3. Fill Nome sul listino = `Barboncino toy {runId}`; selezionare Taglia **Piccola**.
4. Click **Bagno** dal catalogo. Assert: compare una voce "Bagno". Impostare Tipo = **fisso**, Prezzo = `35`.
5. Click **Tosatura**. Impostare Tipo = **da**, Prezzo = `45`.
6. Click **Salva**.
7. Assert: sheet chiuso; la taglia Piccola mostra "Barboncino toy {runId}" con le voci Bagno 35 e Tosatura da 45; il contatore Piccola è aumentato di 1.
8. Reload. Assert: la razza è ancora presente.
9. Navigate to `/listino`. Assert: la razza appare nel foglio con i prezzi inseriti.

### TC-02: Modifica razza
1. Su `/listino/gestione` click **Barboncino toy {runId}**. Assert: sheet "Modifica razza" precompilato.
2. Cambiare Nome in `Barboncino toy {runId} B` e il prezzo di Bagno in `40`. Click **Salva**.
3. Assert: lista aggiornata con nuovo nome e prezzo 40. Reload; assert persistenza.

### TC-03: Tipo valutaz.
1. Aprire la razza, impostare Tipo di Bagno = **valutaz.**. Assert: il campo Prezzo è nascosto. Click **Salva**; assert: la voce mostra "valutaz." senza prezzo.
2. Ripristinare Tipo = **fisso**, Prezzo = `40`, **Salva**.

### TC-04: Duplica, Cambia icona, Sposta
1. Aprire la razza e click **Duplica**. Assert: compare una copia della razza (nome con copia) nella lista; il contatore aumenta di 1.
2. Aprire la razza e click **Cambia icona**; selezionare un'icona. Assert: l'icona aggiornata è mostrata nella riga. **Salva**.
3. Click **Sposta su** sulla razza. Assert: sale di una posizione; il primo **Sposta su** e l'ultimo **Sposta giù** sono disabilitati.
4. Chiudere con **Chiudi** uno sheet aperto dopo aver cambiato un nome. Assert: la modifica non è salvata.

### TC-05: Cleanup
1. Eliminare le razze create (originale e copia) con il cestino > **Elimina** (vedi T189). Assert: il contatore Piccola torna al valore annotato.

## Assertions
- [ ] La razza creata compare in gestione e in `/listino` e persiste dopo reload.
- [ ] Modifica, duplicazione e spostamento si riflettono nella lista.
- [ ] I dati di test sono stati rimossi.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Sheet Nuova razza aperto
- Sheet Modifica razza
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
