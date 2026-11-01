# T016-attesa-aggiungi-as-titolare: Lista d'attesa - aggiungere un iscritto

| Field | Value |
|---|---|
| Route | `/animali/attesa` |
| Source | `src/pages/AttesaPage.tsx` |
| Flow | Aggiungere iscritto manuale con tutti i campi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare (Plus owner, flag `plan:listaAttesa` attivo)
- Almeno un servizio principale attivo (Bagno, Taglio / tosatura, Bagno + taglio, Stripping)

## Test data
- `nome = "Mario Rossi QA"`
- `phone = "3331234567"`
- `email = "qa+attesa@example.test"`
- `nomeCane = "Fido QA"`
- `specie = "Gatto"`
- `taglia = "Grande"`
- `servizioId = "Bagno"`

## Steps

### TC-01: Happy path - Aggiungere un iscritto in lista d'attesa
1. Sign in as titolare. Navigate to `/animali/attesa`.
2. Assert: titolo `Lista d’attesa` visibile; il sottotitolo mostra "N in attesa" coerente con le righe della tabella `lista-attesa` (se 0, testo `Nessuno in lista.`).
3. Annota N (numero iniziale).
4. Nel form `attesa-aggiungi` compila `Nome di chi aspetta` = `Mario Rossi QA`.
5. Compila `Telefono` = `3331234567`.
6. Compila `Email` = `qa+attesa@example.test`.
7. Compila `Nome del cane` = `Fido QA`.
8. Seleziona `Specie` = `Gatto`.
9. Seleziona `Taglia` = `Grande`.
10. Nel select `Trattamento` scegli `Bagno`.
11. Clicca **`Salva`**.
12. Assert: nella tabella `lista-attesa` compare una riga con `Fido QA` e `Bagno`; il sottotitolo mostra "N+1 in attesa".
13. Assert: i campi testo (`Nome di chi aspetta`, `Telefono`, `Email`, `Nome del cane`) sono vuoti dopo il salvataggio.
14. Ricarica la pagina. Assert: la riga `Fido QA` / `Bagno` è ancora presente.

### TC-02: Cambiare specie e taglia
1. Verifica i default: `Specie` = `Cane`, `Taglia` = `Media`, `Trattamento` = vuoto ("Scegli un trattamento").
2. Seleziona `Gatto`: assert solo `Gatto` risulta selezionato. Seleziona `Altro`: assert solo `Altro` selezionato. Seleziona `Cane`.
3. Seleziona `Piccola`, poi `Grande`, poi `Media`: assert una sola opzione selezionata alla volta.
4. Apri il select `Trattamento`: assert elenca solo `Bagno`, `Taglio / tosatura`, `Bagno + taglio`, `Stripping` (solo servizi principali attivi) oltre alla voce vuota.

### TC-03: Navigazione
1. Clicca **`Indietro`**. Assert: URL è `/animali`.
2. Torna a `/animali/attesa`. Assert: la pagina si rende senza errori.

## Assertions
- [ ] Sottotitolo "N in attesa" coerente con la lista
- [ ] Dopo il salvataggio i campi testo si svuotano e l'iscritto appare
- [ ] Il select elenca solo servizi principali attivi
- [ ] No console errors in DevTools at any step (ignorare il warning React Router v7_startTransition).
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Form compilato prima di Salva
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
