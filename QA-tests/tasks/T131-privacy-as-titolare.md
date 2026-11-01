# T131-privacy-as-titolare: Privacy e termini - lettura e ritorno

| Field | Value |
|---|---|
| Route | `/impostazioni/privacy` |
| Source | `src/pages/PrivacyPage.tsx` |
| Flow | Read privacy text, Go back to settings |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- Testo atteso: `Groomly tratta l account. I dati dei clienti restano del salone.`

## Steps

### TC-01: Happy path - Leggere la privacy
1. Sign in as titolare. Navigate to `/impostazioni/privacy`.
2. Assert: intestazione "Privacy e termini".
3. Assert: il testo "Groomly tratta l account. I dati dei clienti restano del salone." e visibile.
4. Assert: nessun campo di input o form nella pagina.

### TC-02: Indietro
1. Click **Indietro**.
2. Assert: URL `/impostazioni`.

### TC-03: Edge cases
- Reload su `/impostazioni/privacy`: la pagina si ricarica con lo stesso contenuto, senza redirect.
- Da `/impostazioni` apri la voce Privacy tramite la UI: arrivi alla stessa pagina.

## Assertions
- [ ] Titolo e testo esatti visibili.
- [ ] Indietro riporta a `/impostazioni`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
