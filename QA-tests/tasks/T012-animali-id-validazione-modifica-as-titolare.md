# T012-animali-id-validazione-modifica-as-titolare: Form validation - dog-edit

| Field | Value |
|---|---|
| Route | `/animali/:id` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Validare nome/telefono/anno/peso/frequenza vuoti o errati |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T012 Fido"` (annota `salonId`; `dogId` = `qat012fido-dog`).

## Test data
- Validi: `name = "QA T012 Fido"`, `phone = "+39 333 1234567"`, `birthYear = "2019"`, `weight = "12,5"`, `recurrenceWeeks = "8"`.
- Invalidi: `emptyName = ""`, `emptyPhone = ""`, `birthYear = "abcd"`, `weight = "abc"`, `birthDay = "45"`, `birthMonth = "13"`, `badEmail = "non-una-email"`, `recurrenceWeeks = "99"`, `prezzo = "12.345"`, `durata = "0"`.

## Steps

### TC-01: Happy path - correzione degli errori e salvataggio valido
1. `check-c1.cjs`: annota N0.
2. Apri `/animali/qat012fido-dog`, premi **`Modifica`**, compila Nome, Telefono, Anno, Peso coi valori validi.
3. Premi **`Salva`**. Assert: salvataggio riuscito, la scheda mostra i valori; `check-c1.cjs` dà `visiteNelSalone` = N0.

### TC-02: Form validation - `dog-edit`
In **Modifica** lascia/inserisci il valore e premi **`Salva`** (gli errori compaiono dopo il primo submit):

| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Nome | "Il nome è obbligatorio" | n/a | n/a |
| Telefono | "Il telefono è obbligatorio" | n/a | n/a |
| Email contatto | n/a | `non-una-email` → "Inserisci un’email valida" | n/a |
| Anno di nascita | n/a | `abcd` → "Anno di 4 cifre, non nel futuro" | max 4 caratteri |
| Peso | n/a | `abc` → "Peso non valido" | n/a |
| Compleanno Giorno/Mese | n/a | `45` / `13` → "Giorno o mese non validi" | max 2 |
| Frequenza (settimane) | n/a | `99` → "Da 1 a 52 settimane" | max 2 |
| Prezzo servizio | n/a | `12.345` → "Prezzo ≥ 0, al massimo due decimali" | n/a |
| Durata servizio | n/a | `0` → "Minuti interi, minimo 1" | n/a |

Assert: dopo ogni errore la scheda resta in modifica e nel cloud nulla cambia (N0).

### TC-03: Negative & edge
- Nome di soli spazi: errore «Il nome è obbligatorio».
- Anno nel futuro (`2999`): errore anno.

## Assertions
- [ ] Ogni messaggio d'errore sopra è visibile e testuale identico.
- [ ] Nessun salvataggio con errori; conteggio visite invariato.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Ogni stato di errore, stato finale dopo il salvataggio valido

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
