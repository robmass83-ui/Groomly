# T152-team-piano-non-attivo-as-titolare: Team - piano Salone non attivo

| Field | Value |
|---|---|
| Route | `/impostazioni/team` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Con pro/main.enabled false compare "Non attivo" senza elenco né invito |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare con piano Salone (es. `salone48@test.groomly`) e `pro/main.enabled = false` nel seed
- Il piano si accende solo da operatore: non tentare di attivarlo

## Test data
- Nessun campo compilato.

## Steps

### TC-01: Happy path - stato "Non attivo"
1. Sign in as titolare (account Salone con pro disabilitato). Navigate to `/impostazioni/team`.
2. Assert: URL resta `/impostazioni/team`; titolo "Team".
3. Assert: compare la card "Piano Plus" con stato "Non attivo".
4. Assert: NON sono presenti l'elenco membri né **Invita una persona**.

### TC-02: Navigazione
1. Click **Indietro**. Assert: URL is `/impostazioni`.
2. Verificare i link Home (`/`), Animali (`/animali`), Agenda (`/calendario`), Mensili (`/mensili`), Listino (`/listino`), Altro (`/altro`).

### TC-03: Negative & edge cases
- Assert: il toggle del piano non è visibile al titolare (solo operatore).
- Reload. Assert: lo stato "Non attivo" resta; nessun errore console.
- Per account non operatore: nessun pulsante per accendere il piano.

## Assertions
- [ ] "Non attivo" visibile senza elenco né invito.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
