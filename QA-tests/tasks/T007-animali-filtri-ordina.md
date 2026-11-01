# T007-animali-filtri-ordina: Animali - chip filtro e ordinamento

| Field | Value |
|---|---|
| Route | `/animali` |
| Source | `src/pages/DogsPage.tsx` |
| Flow | Apply filter chips; sort alphabetical vs next appointment |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: at least 1 biting dog (Mordaci), 1 senior dog (Anziani), 1 dog with an upcoming appointment, 1 cat (Gatti)

## Test data
- Chips: `Tutti`, `Mordaci`, `Anziani`, `In agenda`, `Gatti`
- Sort options: `Alfabetico`, `Per prossimo appuntamento`

## Steps

### TC-01: Happy path - filtrare con i chip
1. Sign in as titolare. Navigate to `/animali`.
2. Assert: chip **Tutti** pressed.
3. Click **Mordaci**. Assert: chip pressed; every row shows the biting temperament marker; Tutti no longer pressed.
4. Click **Anziani**. Assert: every row has the senior flag.
5. Click **In agenda**. Assert: every row has a "Prossimo appuntamento" value.
6. Click **Gatti**. Assert: only cats listed.
7. If chip **Altri** exists click it and assert only other-species animals; otherwise assert it is absent.
8. Click **Tutti**. Assert: full list restored.

### TC-02: Modal - ordina
1. Click **Ordina**. Assert: sheet "Ordina" opens with 2 options (**Alfabetico** pressed by default, **Per prossimo appuntamento**) and **Chiudi**.
2. Click **Chiudi**. Assert: sheet closed, order unchanged.
3. Reopen, click **Per prossimo appuntamento**. Assert: rows with an appointment come first, in ascending date order.
4. Reopen, click **Alfabetico**. Assert: rows are in alphabetical order by name.

### TC-03: Filtri combinati
1. Select chip **Mordaci**, then type `zzzzqq` in "Cerca". Assert: empty state "Aggiungi un animale".
2. Clear search, click **Tutti**. Assert: list restored.

## Assertions
- [ ] Exactly one chip pressed at a time.
- [ ] Sort sheet shows 2 options, Alfabetico pressed by default.
- [ ] No console errors.
- [ ] No failed network requests.

## Screenshots required
- Each chip active
- Sort sheet open
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
