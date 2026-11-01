# T059-chiusure-id-destructive-riapri-as-titolare: Destructive — Riapri

| Field | Value |
|---|---|
| Route | `/chiusure/:id` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Riapri (elimina) con conferma |
| Requires auth | yes |
| Required role | titolare |
| Destructive | yes |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Esistono due chiusure create come setup: giorno singolo "Giorno {runId}" il 2027-06-10 e periodo "Periodo {runId}" dal 2027-06-15 al 2027-06-17

## Test data
- `Giorno = "2027-06-10"`, `Periodo = 2027-06-15 / 2027-06-17`

## Steps

### TC-01: Riapri giorno singolo — annulla
1. Sign in as `titolare`, apri la chiusura del 2027-06-10 da `/calendario?data=2027-06-10`.
2. Click **Riapri**.
3. Assert: dialog con "Riaprire toglie la chiusura di questo giorno." e pulsanti **Annulla** e **Riapri**.
4. Click **Annulla**. Assert: dialog chiuso, chiusura ancora presente in Agenda.

### TC-02: Riapri giorno singolo — conferma
1. Riapri la chiusura, click **Riapri**, poi **Riapri** nel dialog.
2. Assert: sheet chiuso; il 2027-06-10 non è più chiuso in Agenda.
3. Reload. Assert: il giorno resta aperto.

### TC-03: Riapri periodo
1. Apri la chiusura del periodo, click **Riapri**.
2. Assert: testo "Riaprire toglie la chiusura da tutti i giorni, dal 15 al 17..." con le date del periodo.
3. Click **Annulla**: chiusura presente. Click **Riapri** poi **Riapri**: tutti e tre i giorni tornano aperti.

### TC-04: Nuova chiusura non ha Riapri
1. Apri `/chiusure/nuovo` da Home. Assert: **Riapri** assente; **Salva** e **Chiudi** presenti.

## Assertions
- [ ] Dialog di conferma con Annulla/Riapri e testo corretto per giorno e periodo.
- [ ] Annulla non cambia nulla; conferma rimuove la chiusura in modo persistente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog Riapri (giorno e periodo)
- Agenda dopo la riapertura

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
