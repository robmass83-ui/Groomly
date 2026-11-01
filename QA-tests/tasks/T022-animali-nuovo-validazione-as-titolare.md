# T022-animali-nuovo-validazione-as-titolare: Form validation - scheda-cane-nuovo

| Field | Value |
|---|---|
| Route | `/animali/nuovo` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Salvare vuoto: compaiono 3 errori |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Nessuna fixture necessaria.

## Test data
- Validi: `Nome = "QA T022 Nuovo"`, `Proprietario = "Mario Rossi"`, `Telefono = "3331234567"`.
- Invalidi: `Nome = ""`, `Proprietario = ""`, `Telefono = ""`, `Nome80 = 80 × "a"`.

## Steps

### TC-01: Happy path - dopo gli errori, salvataggio valido
1. Apri `/animali/nuovo`, premi **`Salva`** vuoto (vedi TC-02).
2. Compila Nome, Proprietario, Telefono con i validi, premi **`Salva`**.
3. Assert: redirect a `/animali/<id>`, scheda «QA T022 Nuovo»; in `/animali` il cane è presente.

### TC-02: Form validation - `scheda-cane-nuovo`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| Nome | "Il nome è obbligatorio" | n/a | nessun maxLength HTML: 80 caratteri accettati |
| Proprietario | "Il proprietario è obbligatorio" | n/a | n/a |
| Telefono | "Il telefono è obbligatorio" | n/a | n/a |

1. Premi **Salva** vuoto: Assert: i 3 errori sono visibili contemporaneamente e i campi hanno `aria-invalid=true`; l'URL resta `/animali/nuovo`.
2. Compila solo il Nome: restano gli errori di Proprietario e Telefono; scompare quello del Nome.
3. Inserisci `Nome80`: nessun errore sul Nome.

### TC-03: Negative & edge
- Nome di soli spazi: «Il nome è obbligatorio» (trim).
- Altri dettagli: Anno `abcd` e Peso `abc` → controllare il messaggio mostrato e che non si crei un cane incoerente.

## Assertions
- [ ] I tre messaggi esatti sono visibili al Salva vuoto.
- [ ] Nessun cane creato con errori.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Salva vuoto con 3 errori, stato finale

## Acceptance criteria
Nessun criterio C1 verificabile in questo task (regressione sul form).

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
