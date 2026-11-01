# T151-team-redirect-piani-e-ruoli: Team - redirect per piano e ruolo

| Field | Value |
|---|---|
| Route | `/impostazioni/team` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Senza piano Salone la rotta reindirizza a /impostazioni/pro; collaboratore reindirizzato a /impostazioni |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Seed: account titolare con piano Plus (es. `plus36`), titolare-go con piano free, collaboratore dello stesso salone
- Credenziali risolte dal runner per ruolo (mai scritte nel task)

## Test data
- Rotta `/impostazioni/team`; destinazioni attese: `/impostazioni/pro` e `/impostazioni`.

## Steps

### TC-01: Happy path - titolare con piano Plus
1. Sign in as titolare (piano Plus). Navigate to `/impostazioni/team`.
2. Assert: URL is `/impostazioni/pro`.
3. Assert: titolo "Funzioni Plus" visibile e nessun elenco membri né pulsante **Invita nuovo collaboratore**.

### TC-02: Titolare free
1. Sign out. Sign in as titolare-go. Navigate to `/impostazioni/team`.
2. Assert: URL is `/impostazioni/pro`; nessun elenco membri.

### TC-03: Collaboratore
1. Sign out. Sign in as collaboratore. Navigate to `/impostazioni/team`.
2. Assert: URL is `/impostazioni`.

### TC-04: Anonimo
1. Sign out. Navigate to `/impostazioni/team`.
2. Assert: redirect al login, nessun contenuto del team.

### TC-05: Negative & edge cases
- Reload su `/impostazioni/pro` dopo il redirect. Assert: resta su `/impostazioni/pro`, nessun loop di redirect.
- Back del browser dopo il redirect. Assert: nessun loop; si torna alla pagina precedente.

## Assertions
- [ ] Piano Plus e free: redirect a `/impostazioni/pro`.
- [ ] Collaboratore: redirect a `/impostazioni`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Pagina di arrivo di ogni redirect

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
