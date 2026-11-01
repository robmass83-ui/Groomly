# T048-benvenuto-salta-rimanda-as-titolare: Tour - Salta e Lo facciamo dopo

| Field | Value |
|---|---|
| Route | `/benvenuto` |
| Source | `src/pages/TourPage.tsx` |
| Flow | Saltare un passo; Rimandare con "Lo facciamo dopo" |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: tour NON iniziato (azzerato dal runner prima di ogni TC)

## Test data
- Nessun campo compilato in questo task.

## Steps

### TC-01: Happy path - rimandare il tour
1. Sign in as titolare. Navigate to `/benvenuto`.
2. Assert: schermata di benvenuto con **Iniziamo** e **Lo facciamo dopo**.
3. Click **Lo facciamo dopo**.
4. Assert: URL is `/`; la Home è visibile.
5. Navigate to `/benvenuto`. Assert: nessun crash (schermata di benvenuto o ripresa) e nessun errore console.

### TC-02: Saltare i passi
1. Azzerare il tour. Navigate to `/benvenuto`, click **Iniziamo**. Assert: passo "Il tuo logo" "1 DI 4".
2. Click **Salta**. Assert: passo "Dove sei e quando ti trovano aperto?" (2 DI 4).
3. Click **Salta**. Assert: passo prezzi.
4. Click **Salta** fino al passo fiscale e poi di nuovo **Salta**. Assert: schermata finale con **Entra in Groomly**.
5. Click **Entra in Groomly**. Assert: URL is `/`.

### TC-03: Persistenza dei passi saltati
1. Dopo TC-02, navigate to `/benvenuto`.
2. Assert: nessun dato è stato scritto per i passi saltati (es. `/impostazioni/account` non mostra logo né IVA nuovi); il tour riparte dal primo passo mancante o mostra la schermata finale, senza errori.

### TC-04: Negative & edge cases
- Durante un passo, ricaricare la pagina. Assert: il tour riprende dal passo corrente/primo mancante senza perdere i passi già completati.
- Click ripetuto e rapido su **Salta**. Assert: nessun passo viene scavalcato in modo errato e nessun errore console.

## Assertions
- [ ] **Salta** avanza al passo seguente.
- [ ] **Lo facciamo dopo** porta a `/`.
- [ ] **Entra in Groomly** porta a `/`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni passo saltato
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
