# T145-servizi-destructive-elimina-as-titolare: Destructive - Elimina servizio

| Field | Value |
|---|---|
| Route | `/impostazioni/servizi` |
| Source | `src/pages/ServicesPage.tsx` |
| Flow | Eliminare con conferma |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 5 EXTRA. Il test crea un proprio servizio da eliminare, senza toccare i dati seed

## Test data
- `name = "Da eliminare QA {runId}"`, tipo Extra, Durata = `10`, Prezzo = `3`

## Steps

### TC-01: Setup
1. Sign in as titolare. Navigate to `/impostazioni/servizi`.
2. Click **Aggiungi servizio**, **Extra**, Nome/Durata/Prezzo da Test data, **Salva**. Assert: compare in EXTRA.

### TC-02: Annulla
1. Click **Apri Da eliminare QA {runId}**, poi **Elimina servizio**.
2. Assert: dialog "Eliminare «Da eliminare QA {runId}»?" con testo "Sparisce da questa lista e dalle prenotazioni online. Gli appuntamenti già fissati restano come sono." e bottoni **Annulla**, **Elimina servizio**.
3. Click **Annulla**. Assert: dialog chiuso; il servizio e ancora in lista; reload conferma.

### TC-03: Confermare
1. Riapri il servizio, **Elimina servizio**, nel dialog di conferma click **Elimina servizio**.
2. Assert: il servizio sparisce dal gruppo EXTRA (torna a 5 voci).
3. Reload. Assert: il servizio non c'e.

### TC-04: Negative & edge cases
- Il bottone **Elimina servizio** compare solo nel dialog di modifica, mai in "Nuovo servizio".
- Se rimane un solo servizio in totale, **Elimina servizio** non e disponibile (verifica solo se riproducibile senza toccare il seed; altrimenti annota come non verificabile).
- Gli appuntamenti esistenti che usavano il servizio restano invariati.

## Assertions
- [ ] Annulla non rimuove il servizio.
- [ ] Conferma rimuove il servizio in modo persistente.
- [ ] Testo di conferma esatto.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog di conferma eliminazione
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
