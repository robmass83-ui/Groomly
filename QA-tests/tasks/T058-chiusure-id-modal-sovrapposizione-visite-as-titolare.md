# T058-chiusure-id-modal-sovrapposizione-visite-as-titolare: Modal — sovrapposizione e visite-esistenti

| Field | Value |
|---|---|
| Route | `/chiusure/:id` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Sovrapposizione con altra chiusura; chiusura su giorni con visite |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Esiste una chiusura "Base {runId}" il 2027-05-10 (creala come setup con la procedura di T056)
- Esiste ≥ 1 visita il 2027-05-20 e nessuna chiusura quel giorno

## Test data
- `Motivo sovrapposto = "Doppia {runId}"`, `Data sovrapposta = "2027-05-10"`
- `Motivo visite = "Con visite {runId}"`, `Data con visita = "2027-05-20"`

## Steps

### TC-01: Modal — sovrapposizione
1. Sign in as `titolare`, apri `/chiusure/nuovo` da Home con **+** > **Chiusura**.
2. Fill Motivo = "Doppia {runId}", Data = "2027-05-10", click **Salva**.
3. Assert: dialog con testo "Questo giorno è già chiuso (Base {runId}). Modifica quella chiusura." e pulsanti **Indietro** e **Apri**.
4. Click **Indietro**. Assert: dialog chiuso, form ancora compilato, nessuna chiusura duplicata.
5. Click **Salva** di nuovo, poi **Apri**. Assert: si apre la chiusura esistente `/chiusure/<uuid>` con Motivo "Base {runId}".
6. Variante periodo: nuova chiusura, **Un periodo**, Dal "2027-05-09", Al "2027-05-11", click **Salva**. Assert: dialog "Questi giorni sono già chiusi (...)".

### TC-02: Modal — visite-esistenti
1. Apri `/chiusure/nuovo`, Motivo = "Con visite {runId}", Data = "2027-05-20", click **Salva**.
2. Assert: dialog "In questi giorni c'è già 1 visita. La chiusura non le toglie." (o "ci sono già N visite") con **Indietro** e **Salva**.
3. Click **Indietro**. Assert: nessuna chiusura creata il 2027-05-20.
4. Click **Salva** e nel dialog **Salva**.
5. Assert: sheet chiuso; il 2027-05-20 è chiuso in Agenda e la visita esistente è ancora presente.

### TC-03: Modifica chiusura esistente
1. Apri la chiusura "Con visite {runId}" da Agenda. Cambia Motivo in "Modificata {runId}", click **Salva**.
2. Assert: nessun dialog di sovrapposizione (non confligge con se stessa); Agenda mostra "Modificata {runId}".

## Assertions
- [ ] Dialog sovrapposizione con Indietro/Apri e testo esatto.
- [ ] Dialog visite-esistenti con Indietro/Salva; le visite restano.
- [ ] Modificare una chiusura non genera sovrapposizione con sé stessa.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog sovrapposizione
- Dialog visite-esistenti
- Final state in Agenda

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
