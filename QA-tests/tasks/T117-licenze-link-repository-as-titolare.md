# T117-licenze-link-repository-as-titolare: Licenze - link ai repository

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

### TC-01: Happy path - i link puntano ai repository
1. Sign in as titolare. Navigate to `/impostazioni/licenze`.
2. Per ogni riga della tabella Test data, assert che il link della libreria ha l'`href` indicato.
3. Assert: i link esterni si aprono in una nuova scheda (`target="_blank"`) con `rel` contenente `noopener`.
4. Click sul link React. Assert: si apre una nuova scheda con URL che inizia con `https://github.com/facebook/react`; chiuderla.
5. Assert: la scheda originale è ancora su `/impostazioni/licenze`.

### TC-02: Negative & edge cases
- Navigazione da tastiera: Tab raggiunge ogni link e Invio lo attiva. Assert: focus visibile su ogni link.
- Assert: nessun link ha `href` vuoto o `#`.

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
