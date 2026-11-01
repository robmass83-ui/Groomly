# T047-benvenuto-validazione-sede-prezzi-fiscale-as-titolare: Form validation - passi sede, listino, fiscale

| Field | Value |
|---|---|
| Route | `/benvenuto` |
| Source | `src/pages/TourPage.tsx` |
| Flow | Validazione dei passi del tour |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 22 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: tour avviato con il passo logo già completato (il tour si riprende dal passo "Dove sei e quando ti trovano aperto?")
- Stato del tour azzerabile dal runner dopo il test

## Test data
- Sede: `indirizzo = "Via Roma 1, Napoli"`, `emptyIndirizzo = ""`
- Prezzi: `validPrice = "30"`, `badPrice = "abc"`
- Fiscale: `badIva = "123"`, `badCf = "abc"`, `validIva = "12345678901"`, `validCf = "RSSMRA80A01H501U"`

## Steps

### TC-01: Happy path - sede e fiscale validi
1. Sign in as titolare. Navigate to `/benvenuto`. Assert: si apre il passo sede.
2. Fill Indirizzo = `Via Roma 1, Napoli`, impostare orari Dalle `09:00` / Alle `13:00` e Aperto.
3. Click **Fatto, avanti**. Assert: overlay festa e passo prezzi.
4. Fill tutti i prezzi = `30`, click **Avanti: i tempi**, fill tutti i minuti = `60`, **Fatto, avanti**, **Avanti** nel backup.
5. Nel passo fiscale fill Partita IVA = `12345678901`, click **Fatto, avanti**. Assert: schermata finale con **Entra in Groomly**.

### TC-02: Form validation - `passo-sede`
| Field | Empty value | Invalid | Expected |
|---|---|---|---|
| Indirizzo | `""` | n/a | l'avanzamento è bloccato, messaggio di indirizzo/orari richiesti, il passo resta |
| Orari | nessun giorno compilato | n/a | l'avanzamento è bloccato |

Assert: con Indirizzo vuoto, click **Fatto, avanti** non cambia passo.

### TC-03: Form validation - `passo-listino`
1. Nel passo prezzi lasciare un campo vuoto, click **Avanti: i tempi**. Assert: il passo non avanza.
2. Fill un prezzo = `abc`. Assert: errore di cifra non valida, nessun avanzamento.
3. Ripetere nel passo tempi con `abc`.

### TC-04: Form validation - `passo-fiscale`
| Field | Value | Expected error |
|---|---|---|
| Partita IVA | `123` | "11 cifre, senza IT" |
| Codice fiscale | `abc` | "16 lettere o numeri" |
| Entrambi vuoti | `""` | nessun avanzamento (serve almeno uno dei due scritto bene) |

1. Fill IVA = `123`, click **Fatto, avanti**. Assert: "11 cifre, senza IT", il passo resta.
2. Svuotare IVA, fill Codice fiscale = `abc`, **Fatto, avanti**. Assert: "16 lettere o numeri".
3. Fill Codice fiscale = `RSSMRA80A01H501U`, IVA vuota, **Fatto, avanti**. Assert: avanza alla schermata finale.

### TC-05: Negative & edge cases
- IVA con prefisso `IT12345678901`. Assert: errore "11 cifre, senza IT" oppure il prefisso viene rimosso; nessun crash.
- Codice fiscale minuscolo `rssmra80a01h501u`. Assert: accettato come maiuscolo o errore coerente.

## Assertions
- [ ] I messaggi "11 cifre, senza IT" e "16 lettere o numeri" compaiono esatti.
- [ ] I passi non avanzano con dati non validi.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni stato di errore di validazione
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
