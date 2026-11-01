# T006-animali-search-tabs: Animali - ricerca e tab stato

| Field | Value |
|---|---|
| Route | `/animali` |
| Source | `src/pages/DogsPage.tsx` |
| Flow | Search dogs; switch tab Attivi/Mensili/Occasionali/Nuovi |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173` (Firebase emulator, fake data)
- Signed in as titolare
- Seed: at least 1 animal named "Bella"; at least 1 archived animal; header reads "N attivi · M in archivio"

## Test data
- `query = "Bella"`
- `noMatch = "zzzzqq"`
- `partialBreed` = first 3 letters of a breed present in the list

## Steps

### TC-01: Happy path - cercare un animale per nome
1. Sign in as titolare. Navigate to `/animali`.
2. Assert: header "Animali" with subtitle matching "N attivi · M in archivio"; tab **Attivi** selected; chip **Tutti** pressed.
3. Fill the field "Cerca" (placeholder "Nome, proprietario o razza") with `Bella`.
4. Assert: the list shows only rows whose name, owner or breed contains "Bella"; at least one row "Bella" is visible.
5. Clear the field. Assert: the full list returns.
6. Fill "Cerca" with a breed fragment (`partialBreed`). Assert: rows shown match by breed.

### TC-02: Ricerca senza risultati
1. Fill "Cerca" with `zzzzqq`.
2. Assert: empty state shows button **Aggiungi un animale**; no dog rows.
3. Click **Aggiungi un animale**. Assert: URL is `/animali/nuovo`.

### TC-03: Tab stato
1. Navigate to `/animali`. Read the counts N on tabs **Attivi**, **Mensili**, **Occasionali**, **Nuovi**.
2. Click each tab in turn. Assert: the tab is selected and the number of rows equals the count on its label.
3. Assert: the Attivi count equals the "N attivi" figure in the subtitle.
4. If tab **In attesa** exists, click it and assert URL is `/animali/attesa`; otherwise assert it is absent.

### TC-04: Negative & edge cases
- Navigate to `/animali?tab=archivio`. Assert: redirect to `/impostazioni/archivio`.
- Search with leading/trailing spaces `"  Bella  "`. Assert: same result as `Bella`.
- Scroll the list, open a dog, go back. Assert: scroll position restored (sessionStorage key `groomly.dogs-list-scroll`).

## Assertions
- [ ] Subtitle counts match tab counts.
- [ ] Tab Attivi selected and chip Tutti pressed by default.
- [ ] No-match query shows "Aggiungi un animale".
- [ ] No console errors at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Search result for "Bella"
- Empty state
- Each tab

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
