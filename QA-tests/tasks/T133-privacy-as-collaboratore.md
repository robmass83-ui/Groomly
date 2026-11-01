# T133-privacy-as-collaboratore: Privacy e termini - collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/privacy` |
| Source | `src/pages/PrivacyPage.tsx` |
| Flow | Read privacy text, Go back to settings |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore

## Test data
- Testo atteso: `Groomly tratta l account. I dati dei clienti restano del salone.`

## Steps

### TC-01: Happy path
1. Sign in as collaboratore. Navigate to `/impostazioni/privacy`.
2. Assert: intestazione "Privacy e termini" e testo "Groomly tratta l account. I dati dei clienti restano del salone." visibili.
3. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Il collaboratore raggiunge la pagina.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
