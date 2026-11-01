# T049-benvenuto-as-titolare-go: Tour di benvenuto come titolare free

| Field | Value |
|---|---|
| Route | `/benvenuto` |
| Source | `src/pages/TourPage.tsx` |
| Flow | Tour per titolare del piano free |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go
- Seed: tour NON iniziato per il salone del titolare-go

## Test data
- `logo = QA-tests/fixtures/logo.png`
- `indirizzo = "Via Garibaldi 2, Torino"`

## Steps

### TC-01: Happy path - primi passi del tour
1. Sign in as titolare-go. Navigate to `/benvenuto`.
2. Assert: schermata di benvenuto con **Iniziamo** e **Lo facciamo dopo**.
3. Click **Iniziamo**. Assert: passo "Il tuo logo"; **Fatto, avanti** disabilitato.
4. Click **Scegli un’immagine** e caricare `logo.png`. Click **Fatto, avanti**.
5. Assert: overlay festa e passo "Dove sei e quando ti trovano aperto?".
6. Fill Indirizzo = `Via Garibaldi 2, Torino`, impostare orari Dalle `09:00` / Alle `13:00`. Click **Fatto, avanti**.
7. Assert: passo prezzi visibile.

### TC-02: Rimandare e uscire
1. Click **Salta** fino alla schermata finale, click **Entra in Groomly**. Assert: URL is `/`.

### TC-03: Validazione fiscale
1. Nel passo fiscale fill Partita IVA = `123`. Click **Fatto, avanti**. Assert: "11 cifre, senza IT".

### TC-04: Negative & edge cases
- Assert: nessun passo mostra funzioni riservate al piano Plus o richieste di upgrade inattese; se compare un limite, il testo è esplicito.
- Caricare un file non immagine al passo logo. Assert: rifiutato, **Fatto, avanti** resta disabilitato.

## Assertions
- [ ] Il tour è accessibile al titolare-go e porta a `/`.
- [ ] Le validazioni sono identiche a quelle del titolare.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Passo logo e passo sede
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
