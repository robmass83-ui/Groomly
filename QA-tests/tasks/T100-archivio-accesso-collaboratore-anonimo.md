# T100-archivio-accesso-collaboratore-anonimo: Archivio - accessi non consentiti

| Field | Value |
|---|---|
| Route | `/impostazioni/archivio` |
| Source | `src/pages/ArchivePage.tsx` |
| Flow | Access control (rolesAllowed: titolare, titolare-go) |
| Requires auth | yes |
| Required role | anonymous |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Nessuna sessione attiva per TC-01; sessione collaboratore per TC-02

## Test data
- Nessun input.

## Steps

### TC-01: Anonimo
1. Con sessione chiusa, navigate to `/impostazioni/archivio`.
2. Assert: redirect alla schermata di accesso/login; nessun elenco cani visibile.

### TC-02: Collaboratore
1. Sign in as collaboratore. Navigate to `/impostazioni/archivio`.
2. Assert: la pagina non mostra l'elenco con Ripristina (redirect o accesso negato). Annota il comportamento esatto osservato.
3. Assert: nessun dato dei cani archiviati e esposto.

## Assertions
- [ ] Anonimo non vede l'archivio.
- [ ] Collaboratore non puo ripristinare cani.
- [ ] No console errors in DevTools at any step (esclusi redirect attesi).
- [ ] No failed network requests (no 4xx/5xx) except dove atteso.

## Screenshots required
- Redirect anonimo
- Esito collaboratore

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
