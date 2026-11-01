# T018-attesa-destructive-togli-as-titolare: Destructive - Togli iscritto

| Field | Value |
|---|---|
| Route | `/animali/attesa` |
| Source | `src/pages/AttesaPage.tsx` |
| Flow | Togliere un iscritto (destructive) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare (Plus)
- Nessun dato condiviso richiesto: il task crea il proprio iscritto

## Test data
- `nome = "Togli QA"`, `phone = "3331112222"`, `email = "qa+togli@example.test"`, `nomeCane = "Rimosso QA"`, `specie = "Cane"`, `taglia = "Media"`, `servizio = "Bagno"`

## Steps

### TC-01: Destructive - Togli
1. Sign in as titolare. Navigate to `/animali/attesa`.
2. Compila il form `attesa-aggiungi` con i valori di `Test data` e clicca **`Salva`**. Assert: riga `Rimosso QA` presente. Annota N.
3. Clicca **`Togli`** nella riga `Rimosso QA`.
4. Se compare una conferma: clicca il suo pulsante di annullamento. Assert: la riga `Rimosso QA` è ancora presente, sottotitolo "N in attesa". Se non compare conferma, annota che la rimozione è immediata e prosegui al passo 6.
5. Clicca di nuovo **`Togli`** sulla riga e conferma.
6. Assert: la riga `Rimosso QA` scompare, il sottotitolo mostra "N-1 in attesa".
7. Ricarica la pagina. Assert: `Rimosso QA` non è presente.

### TC-02: Lista vuota
1. Rimuovi con **`Togli`** tutti gli iscritti creati dal test fino a lista vuota (solo quelli di test `QA`).
2. Assert (se la lista è vuota): testo `Nessuno in lista.` e sottotitolo "0 in attesa"; nessun pulsante **`Togli`** visibile.

## Assertions
- [ ] Una **`Togli`** per riga, assente a lista vuota
- [ ] Sottotitolo coerente dopo la rimozione
- [ ] Rimozione persistente dopo reload
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Riga presente prima di Togli
- Eventuale conferma
- Final state dopo la rimozione

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
