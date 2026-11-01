# T186-listino-gestione-intestazione-autosave-as-titolare: Gestione listino - intestazione e testi (autosave)

| Field | Value |
|---|---|
| Route | `/listino/gestione` |
| Source | `src/pages/PriceSheetManagePage.tsx` |
| Flow | Cambiare logo, descrizione, colore; modificare note taglia, testi, avviso, saluto |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 26 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Ogni modifica è salvata subito (autosave): il runner annota i valori originali di ogni campo e li ripristina al termine
- File `QA-tests/fixtures/logo.png` (PNG con sfondo trasparente) e `QA-tests/fixtures/doc.txt`

## Test data
- `logo = QA-tests/fixtures/logo.png`, `badLogo = QA-tests/fixtures/doc.txt`
- `descrizione = "Servizio di toelettatura QA"`
- `colore = "#3A5BA0"`
- `noteTaglia.Piccola = "Tosatura a partire da 55 €"`
- `info.intro = "I prezzi sono indicativi"`, `info.punti = "nodi\nfeltri"`, `info.chiusura = "Grazie per la pazienza"`
- `avviso.titolo = "Niente cani infestati"`, `avviso.punti = "pulci\nzecche"`
- `saluto = "Grazie per la fiducia!"`

## Steps

### TC-01: Happy path - modificare intestazione e testi
1. Sign in as titolare. Navigate to `/listino/gestione`.
2. Assert: titolo "Gestione listino", sottotitolo "Intestazione, razze, sezioni e testi"; contatori razze per taglia coerenti con gli elenchi.
3. Annotare i valori attuali.
4. Click **Carica logo** (o **Cambia logo**) e caricare `logo.png`. Assert: anteprima del logo; compare **Rimuovi logo**.
5. Fill Descrizione = `Servizio di toelettatura QA`.
6. Click il colore `#3A5BA0`. Assert: il colore risulta selezionato e l'anteprima del foglio cambia.
7. Fill Nota sotto la taglia (Piccola) = `Tosatura a partire da 55 €`.
8. Fill Informazioni importanti · frase iniziale = `I prezzi sono indicativi`; Punti elenco = `nodi` Invio `feltri`; Frase finale = `Grazie per la pazienza`.
9. Fill Avviso · titolo = `Niente cani infestati`; Avviso · punti = `pulci` Invio `zecche`.
10. Fill Saluto finale = `Grazie per la fiducia!`. Fare blur (click fuori) su ogni textarea. Assert: le righe vuote dei punti elenco sono ripulite.
11. Reload. Assert: tutti i valori inseriti sono ancora presenti (autosave).
12. Navigate to `/listino`. Assert: il foglio mostra descrizione, nota taglia e saluto inseriti.
13. Ripristinare i valori originali annotati allo step 3 (rimuovere il logo con **Rimuovi logo** se non c'era).

### TC-02: Rimuovi logo
1. Con logo presente, click **Rimuovi logo**. Assert: il logo sparisce subito e il pulsante torna **Carica logo**. Reload; assert persistenza.

### TC-03: Colore
1. Click ciascuno dei 5 colori `#B8285E`, `#3A5BA0`, `#15905B`, `#B4561E`, `#1D1A1B`. Assert: uno solo è selezionato alla volta. Ripristinare il colore originale.

### TC-04: Link Info personali
1. Click il link "Nome, indirizzo e telefono partono da Gestisci account › Info personali". Assert: URL is `/impostazioni/account?scheda=personali&modifica=toelettatura` e il dialog "Toelettatura" è aperto.

### TC-05: Negative & edge cases
- Caricare `doc.txt` come logo. Assert: toast d'errore, il logo precedente resta.
- Descrizione molto lunga (300 × "a"). Assert: nessun crash, il valore si salva o è troncato in modo coerente.
- Click **Indietro**. Assert: URL is `/listino`.

## Assertions
- [ ] Ogni modifica persiste dopo reload senza pulsante Salva.
- [ ] I valori originali sono stati ripristinati.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Stato con tutti i testi compilati
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
