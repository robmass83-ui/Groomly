# T056-chiusure-id-crea-giorno-as-titolare: Crea una chiusura di un giorno

| Field | Value |
|---|---|
| Route | `/chiusure/:id` (nuova: `/chiusure/nuovo`) |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Creare chiusura di un giorno |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Nessuna chiusura né visita il 2027-03-10
- La route è uno sheet: l'URL diretto rende Home senza dialog, quindi si apre da Home con "+" > Chiusura

## Test data
- `Motivo = "Ferie {runId}"`
- `Data = "2027-03-10"`

## Steps

### TC-01: Happy path — Crea chiusura di un giorno
1. Sign in as `titolare`.
2. Navigate to `/`. Click il pulsante **+** (Aggiungi), poi **Chiusura**.
3. Assert: URL `/chiusure/nuovo`; titolo "Chiusura del salone"; modo "Questo giorno" selezionato; campo **Data** visibile.
4. Fill **Motivo** = "Ferie {runId}" e **Data** = "2027-03-10".
5. Click **`Salva`**.
6. Assert: lo sheet si chiude senza dialog di avviso.
7. Navigate to `/calendario?data=2027-03-10`. Assert: il giorno risulta chiuso con motivo "Ferie {runId}".
8. Apri la chiusura dall'Agenda. Assert: URL `/chiusure/<uuid>`; Motivo precompilato "Ferie {runId}", Data "2027-03-10"; sono visibili **Salva** e **Riapri**.
9. Reload `/calendario?data=2027-03-10`. Assert: chiusura ancora presente.

### TC-02: Validazione motivo
1. Apri `/chiusure/nuovo`, lascia Motivo vuoto, Data = "2027-03-11", click **Salva**.
2. Assert: errore "Scrivi un motivo."; Motivo ha `aria-invalid=true`; lo sheet resta aperto.
3. Motivo = 40 × "a", click **Salva**. Assert: salvato (limite 40 incluso).
4. Apri nuova chiusura con Motivo = 45 × "a", Data = "2027-03-12", click **Salva**. Assert: errore "Scrivi un motivo." (messaggio fuorviante, annotare).
5. Motivo = "   " (spazi), click **Salva**. Assert: "Scrivi un motivo.".

### TC-03: Chiudi senza salvare
1. Apri `/chiusure/nuovo`, Motivo = "Non salvare", click **Chiudi**.
2. Assert: lo sheet si chiude e nessuna chiusura "Non salvare" esiste in Agenda.

### TC-04: URL diretto
1. Navigate direttamente a `/chiusure/nuovo`.
2. Assert: viene reso Home senza dialog.

## Assertions
- [ ] Titolo "Chiusura del salone".
- [ ] "Scrivi un motivo." su motivo vuoto/spazi/>40 con aria-invalid.
- [ ] Chiusura creata visibile in Agenda e persistente dopo reload.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Sheet iniziale
- Errore motivo
- Final state in Agenda

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
