# T132-privacy-as-titolare-go: Privacy e termini - titolare Go

| Field | Value |
|---|---|
| Route | `/impostazioni/privacy` |
| Source | `src/pages/PrivacyPage.tsx` |
| Flow | Read privacy text, Go back to settings |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 6 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go

## Test data
- Testo atteso: `Groomly tratta l account. I dati dei clienti restano del salone.`

## Steps

### TC-01: Happy path
1. Sign in as titolare-go. Navigate to `/impostazioni/privacy`.
2. Assert: intestazione "Privacy e termini" e testo "Groomly tratta l account. I dati dei clienti restano del salone." visibili, nessun paywall.
3. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Contenuto identico a quello del titolare.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
