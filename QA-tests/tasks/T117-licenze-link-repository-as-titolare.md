# T117-licenze-link-repository-as-titolare: Licenze — le righe sono testo, senza link

| Field | Value |
|---|---|
| Route | `/impostazioni/licenze` |
| Source | `src/pages/LicenzePage.tsx` |
| Flow | Aprire il repository di una libreria |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Non è richiesto accesso a Internet: si verifica solo l'attributo `href` e `target`

## Test data
| Libreria | href atteso |
|---|---|
| React | `https://github.com/facebook/react` |
| Capacitor | `https://github.com/ionic-team/capacitor` |
| Firebase | `https://github.com/firebase/firebase-js-sdk` |
| Lucide | `https://github.com/lucide-icons/lucide` |

## Steps

### TC-01: Happy path - niente link
1. Sign in as titolare. Navigate to `/impostazioni/licenze`.
2. Assert: le righe dell’elenco non sono link (nessun `<a>` nella lista): l’elenco completo ha sostituito le quattro voci con il repository.
3. Assert: la pagina resta su `/impostazioni/licenze` toccando una riga.

### TC-02: Negative & edge cases
- Assert: nome e versione lunghi vanno a capo senza uscire a 360 px.

## Assertions
- [ ] Quattro link con href corretto.
- [ ] Link esterni in nuova scheda con noopener.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
