# T188-listino-gestione-razza-validazione-as-titolare: Form validation - razza

| Field | Value |
|---|---|
| Route | `/listino/gestione` |
| Source | `src/pages/PriceSheetManagePage.tsx` |
| Flow | Validazione dello sheet Nuova razza |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Nessuna razza invalida viene salvata; alla fine il contatore razze è invariato

## Test data
- `validName = "Validazione QA {runId}"`, `emptyName = ""`
- `serviceName = "Bagno"`, `emptyServiceName = ""`
- `validPrice = "35"`, `negativePrice = "-5"`, `textPrice = "abc"`

## Steps

### TC-01: Happy path - razza valida si salva
1. Sign in as titolare. Navigate to `/listino/gestione`. Annotare i contatori.
2. Click **Razza**. Fill Nome sul listino = `Validazione QA {runId}`, Taglia **Media**.
3. Click **Bagno**, Tipo **fisso**, Prezzo = `35`. Click **Salva**.
4. Assert: sheet chiuso e la razza compare nella taglia Media; contatore +1.
5. Eliminare la razza (vedi T189) per il cleanup.

### TC-02: Form validation - `razza`
| Field | Value | Expected |
|---|---|---|
| Nome sul listino | `""` (con almeno una voce) | toast "Scrivi il nome della razza"; lo sheet resta aperto |
| Nome servizio n | `""` | toast "Il listino non è stato salvato. Controlla nomi e prezzi."; lo sheet resta aperto |
| Prezzo | `-5` | non accettato: toast d'errore o valore rifiutato; nulla salvato |
| Prezzo | `abc` | non accettato: toast d'errore o valore rifiutato; nulla salvato |
| Voci | nessuna voce di prezzo | comportamento coerente: errore o razza senza voci; nessun crash |

Per ogni riga: aprire **Razza**, impostare il valore, click **Salva**, assert l'esito, poi **Chiudi**. Assert alla fine: il contatore razze è quello annotato.

### TC-03: Modal coverage - `razza`
1. Click **Razza**. Assert: sheet "Nuova razza" visibile.
2. Click **Chiudi**. Assert: sheet chiuso, nessuna razza aggiunta.
3. Riaprire una razza esistente, svuotare il Nome sul listino, **Salva**. Assert: "Scrivi il nome della razza" e la razza mantiene il nome originale dopo **Chiudi** e reload.

### TC-04: Negative & edge cases
- Nome con spazi soli `"   "`. Assert: trattato come vuoto, "Scrivi il nome della razza".
- Nome di 120 × "a". Assert: nessun crash, nome salvato o rifiutato in modo coerente (poi eliminare).
- Nome duplicato di una razza esistente nella stessa taglia. Assert: comportamento coerente, nessun errore console.

## Assertions
- [ ] "Scrivi il nome della razza" e "Il listino non è stato salvato. Controlla nomi e prezzi." esatti.
- [ ] Nessun dato invalido salvato.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni stato di errore di validazione
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
