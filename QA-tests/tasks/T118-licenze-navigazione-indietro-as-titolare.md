# T118-licenze-navigazione-indietro-as-titolare: Licenze - navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni/licenze` |
| Source | `src/pages/LicenzePage.tsx` |
| Flow | Tornare a Legale; barra di navigazione |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
| Link | Destinazione |
|---|---|
| Indietro | `/impostazioni/legale` |
| Home | `/` |
| Animali | `/animali` |
| Agenda | `/calendario` |
| Mensili | `/mensili` |
| Listino | `/listino` |
| Impostazioni | `/impostazioni` |

## Steps

### TC-01: Happy path - Indietro porta a Legale
1. Sign in as titolare. Navigate to `/impostazioni/legale`, trovare la voce licenze e aprirla (oppure navigate direttamente a `/impostazioni/licenze`).
2. Click **Indietro**.
3. Assert: URL is `/impostazioni/legale`; la pagina Legale è visibile.

### TC-02: Barra di navigazione
1. Per ogni riga di Test data da Home a Impostazioni: navigate to `/impostazioni/licenze`, click il link, assert l'URL atteso.

### TC-03: Negative & edge cases
- Navigate to `/impostazioni/licenze`, ricaricare, usare il back del browser. Assert: torna alla pagina precedente senza errori.
- Sign out e navigate to `/impostazioni/licenze` da anonimo. Assert: redirect al login, nessun contenuto della pagina.

## Assertions
- [ ] Indietro porta a `/impostazioni/legale`.
- [ ] Tutti i link di navigazione portano alla rotta attesa.
- [ ] Anonimo reindirizzato al login.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Pagina Legale dopo Indietro
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
