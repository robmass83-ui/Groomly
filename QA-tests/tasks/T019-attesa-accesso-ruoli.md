# T019-attesa-accesso-ruoli: Lista d'attesa - accesso per piano e ruolo

| Field | Value |
|---|---|
| Route | `/animali/attesa` |
| Source | `src/pages/AttesaPage.tsx` |
| Flow | Feature flag plan:listaAttesa; Tornare ad Animali |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Utenti: titolare-go (free, senza Plus), collaboratore (di un salone Plus), titolare (Plus)

## Test data
- Nessun input; solo navigazione.

## Steps

### TC-01: Senza piano Plus
1. Sign in as titolare-go. Navigate to `/animali/attesa`.
2. Assert: URL finale è `/animali` (redirect), il form `Aggiungi chi è qui` non è visibile.

### TC-02: Collaboratore
1. Sign out; sign in as collaboratore. Navigate to `/animali/attesa`.
2. Assert: la pagina `Lista d’attesa` si apre (se il salone è Plus) con form e tabella visibili; in caso di redirect a `/animali` annotalo come evidenza.

### TC-03: Titolare Plus e navigazione
1. Sign out; sign in as titolare. Navigate to `/animali/attesa`.
2. Assert: titolo `Lista d’attesa` visibile.
3. Clicca **`Indietro`**. Assert: URL è `/animali`.
4. Torna alla pagina e clicca ciascun link della barra: `Home` (`/`), `Animali` (`/animali`), `Agenda` (`/calendario`), `Mensili` (`/mensili`), `Listino` (`/listino`), `Altro` (`/altro`). Assert: URL corrispondente per ognuno.

### TC-04: Anonimo
1. Sign out. Navigate to `/animali/attesa`.
2. Assert: l'utente è reindirizzato alla schermata di accesso, nessun dato mostrato.

## Assertions
- [ ] Senza Plus la rotta reindirizza a `/animali`
- [ ] Anonimo non vede la lista
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except redirect.

## Screenshots required
- Landing dopo redirect (titolare-go)
- Pagina come titolare

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
