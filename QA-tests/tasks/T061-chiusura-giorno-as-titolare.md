# T061-chiusura-giorno-as-titolare: Chiusura del salone - chiudere un giorno

| Field | Value |
|---|---|
| Route | `/chiusure/nuovo` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Close one day with a reason |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: nessuna chiusura esistente il 2026-12-10 e nessun appuntamento quel giorno

## Test data
- `motivo = "Ferie QA {runId}"`
- `data = "2026-12-10"` (via `?data=2026-12-10`)

## Steps

### TC-01: Happy path - Chiudere un giorno
1. Sign in as titolare. Navigate to `/chiusure/nuovo?data=2026-12-10`.
2. Assert: titolo "Chiusura del salone"; sheet sopra il Calendario; modo "Questo giorno" selezionato; campo Data = `2026-12-10`.
3. Scrivi in Motivo `Ferie QA {runId}`.
4. Click **Salva**.
5. Assert: la sheet si chiude, torni al Calendario, il 10 dicembre 2026 risulta segnato come chiuso con il motivo.
6. Reload. Assert: la chiusura e ancora presente.

### TC-02: Preselezione data
1. Navigate to `/chiusure/nuovo` senza query. Assert: Data = oggi.
2. Click **Chiudi**. Assert: ritorno al Calendario, nessuna chiusura creata.

### TC-03: Cambio modo mantiene le date
1. Navigate to `/chiusure/nuovo?data=2026-12-11`.
2. Click **Un periodo**. Assert: compaiono i campi Dal e Al, con Dal = `2026-12-11`.
3. Click **Questo giorno**. Assert: Data = `2026-12-11`.

## Assertions
- [ ] Chiusura giornaliera creata e persistente.
- [ ] Cambio modo non perde le date.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Sheet iniziale
- Form compilato
- Calendario con giorno chiuso

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
