# T066-impostazioni-render-navigazione-as-titolare: Impostazioni — rendering e navigazione

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Navigate to each settings sub-page via rows |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare` (Plus owner, seed salone "Pet Spa Napoli 36", trial Plus)

## Test data
- Rows and expected targets:
  - `Suggerimenti` → `/impostazioni/suggerimenti`
  - `Incassi e report` → `/incassi/report`
  - `Avvisi` → `/impostazioni/avvisi`
  - `Abbonamento` → `/impostazioni/abbonamento`
  - `Listino prezzi` → `/listino`
  - `Servizi e durate` → `/impostazioni/servizi`
  - `Archivio animali` → `/impostazioni/archivio`
  - `Notifiche` → `/impostazioni/notifiche`
  - `Gestisci account Groomly` → `/impostazioni/account`
  - `Groomly 1.1.166, storico aggiornamenti` → `/impostazioni/aggiornamenti`

## Steps

### TC-01: Happy path — Rendering della pagina
1. Sign in as `titolare`. Navigate to `/impostazioni`.
2. Assert: heading `Impostazioni` visible; the four sections `SALONE`, `FUNZIONI`, `APP`, `ACCOUNT` are rendered.
3. Assert: salone name `Pet Spa Napoli 36` is shown.
4. Assert: completeness card `Completa il tuo salone` shows a progress (seed: 3/6) with chips `Logo`, `Backup impostato`, `Partita IVA o codice fiscale`.
5. Assert: row `Abbonamento` shows the trial hint (seed: `Prova Plus, ancora 10 giorni`).
6. Assert: `Tema` row shows `Auto`, `Lingua` row shows `Italiano`.

### TC-02: Navigazione verso ogni sotto-pagina
For each row in `Test data`:
1. From `/impostazioni`, click the row.
2. Assert: the URL equals the target and the target heading is visible.
3. Click `Indietro` (or browser back). Assert: `/impostazioni` is shown again.

### TC-03: Chip di completezza
| Button | Action taken | Expected result |
|---|---|---|
| `Logo` | click | goes to `/impostazioni/account?scheda=personali` |
| `Backup impostato` | click | modal `Backup` opens |
| `Partita IVA o codice fiscale` | click | goes to `/impostazioni/account?scheda=personali` and the `Dati del salone` dialog opens |
| `Gestisci account Groomly` | click | goes to `/impostazioni/account` |
| `Aggiungi` (tab bar FAB) | click | opens the new-appointment flow |

### TC-04: Tab bar
1. Click each of `Home`, `Animali`, `Agenda`, `Mensili`, `Listino`, `Impostazioni` in the bottom bar.
2. Assert: URLs `/`, `/animali`, `/calendario`, `/mensili`, `/listino`, `/impostazioni` respectively.

## Assertions
- [ ] Heading and 4 sections visible.
- [ ] Every row navigates to the expected sub-route.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Completeness card
- Final state after the navigation loop

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
