# T024-animali-nuovo-prezzi-personalizzati-as-titolare: Prezzi personalizzati per servizio

| Field | Value |
|---|---|
| Route | `/animali/nuovo` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Impostare prezzi/durate personalizzate |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.

## Test data
- Base: `Nome = "QA T024 Nuovo"`, `Proprietario = "Mario Rossi"`, `Telefono = "3331234567"`.
- `Prezzo Bagno = "25"`, `Durata Bagno (min) = "40"`, `Prezzo Taglio = "30"`.
- Invalidi: `Prezzo Bagno = "abc"`, `Durata Bagno = "-5"`.

## Steps

### TC-01: Happy path - prezzi personalizzati salvati
1. Apri `/animali/nuovo`, compila i campi base.
2. Espandi **`Prezzi personalizzati`**. Assert: per ogni servizio un campo prezzo (placeholder dal listino, es. «20 (da listino)» per Bagno) e un campo durata (placeholder «30» per Bagno).
3. Compila Prezzo Bagno 25, Durata Bagno 40, Prezzo Taglio 30. Premi **`Salva`**.
4. Assert: redirect a `/animali/<id>`; nei prezzi della scheda Bagno = 25 € / 40 min, Taglio = 30 €.
5. Ricarica: valori persistiti.

### TC-02: Validazione
- Prezzo Bagno `abc` → **Salva** → errore di prezzo visibile (quoteError) e nessun redirect.
- Durata `-5` → errore o valore rifiutato, nessun cane salvato con durata negativa.

## Assertions
- [ ] Placeholder dal listino visibili.
- [ ] Prezzi/durate persistono.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Sezione prezzi compilata, errore, scheda finale

## Acceptance criteria
Nessun criterio C1 verificabile in questo task (regressione sui prezzi).

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
