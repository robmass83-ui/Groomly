# T306-titolare-socio-incassi-come-prima: Titolare e socio vedono gli incassi come prima; testo della pagina Team

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx`, `src/app/SoloIncassi.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/ProPage.tsx` |
| Flow | Titolare e socio: chip incassi, pagine incassi, scorciatoia; titolare: pagina Team |
| Requires auth | yes |
| Required role | titolare-salone, socio-salone |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).

## Test data
- Nessun dato da creare.

## Steps

### TC-01: Titolare (AC4)
1. Sign in as titolare-salone, apri `/`. Assert: c'è il riquadro «Incassi di oggi» e porta a `/incassi`.
2. Apri `/incassi`, `/incassi/report`, `/incassi/statistiche`. Assert: ogni pagina si apre (nessun ritorno in Home) e mostra importi o il loro stato vuoto.
3. Apri `/impostazioni`. Assert: c'è la scorciatoia Incassi verso `/incassi/report`.

### TC-02: Socio (AC4)
1. Sign in as socio-salone, ripeti i passi di TC-01. Assert: stessi risultati.

### TC-03: Testo pagina Team (AC6)
1. Come titolare-salone apri la pagina Team (`/impostazioni/team`). Assert: la spiegazione dei ruoli dice che il collaboratore «non vede gli incassi» e non più «vede solo i propri incassi».

## Assertions
- [ ] Titolare e socio vedono gli incassi come prima.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Home del titolare con il riquadro incassi
- Pagina incassi del socio
- Pagina Team con il testo dei ruoli

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-4 | AC4 Titolare e socio: riquadro «Incassi di oggi» in Home, pagine Incassi/Report/Statistiche e scorciatoia in Impostazioni ci sono come prima | TC-01, TC-02 |
| AC-6 | AC6 La pagina Team del titolare dice che il collaboratore «non vede gli incassi» | TC-03 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
