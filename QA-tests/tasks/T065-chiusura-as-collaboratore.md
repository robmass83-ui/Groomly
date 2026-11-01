# T065-chiusura-as-collaboratore: Chiusura - sola lettura per collaboratore

| Field | Value |
|---|---|
| Route | `/chiusure/nuovo` |
| Source | `src/pages/ClosurePage.tsx` |
| Flow | Collaboratore read-only |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore
- Seed: almeno 1 chiusura esistente

## Test data
- `data = "2026-12-15"`

## Steps

### TC-01: Nuova chiusura in sola lettura
1. Sign in as collaboratore. Navigate to `/chiusure/nuovo?data=2026-12-15`.
2. Assert: la sheet "Chiusura del salone" si apre.
3. Assert: i campi (Motivo, Durata, Data) sono disabilitati e il pulsante **Salva** non e presente.
4. Prova a digitare in Motivo. Assert: il campo non accetta input.
5. Click **Chiudi**. Assert: ritorno al Calendario, nessuna chiusura creata.

### TC-02: Chiusura esistente
1. Dal Calendario apri una chiusura esistente `/chiusure/<id>`.
2. Assert: i dati sono visibili, campi disabilitati, nessun **Salva**.
3. Assert: il pulsante **Riapri** non e utilizzabile (assente o disabilitato). Annota quale dei due.

## Assertions
- [ ] Collaboratore raggiunge la sheet ma non puo modificare.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Sheet disabilitata
- Chiusura esistente come collaboratore

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
