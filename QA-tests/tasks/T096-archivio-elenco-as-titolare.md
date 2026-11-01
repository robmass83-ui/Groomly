# T096-archivio-elenco-as-titolare: Archivio - elenco cani archiviati

| Field | Value |
|---|---|
| Route | `/impostazioni/archivio` |
| Source | `src/pages/ArchivePage.tsx` |
| Flow | View archived dogs (non_in_cura/deceduto) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 2 cani archiviati (es. Bella e Kratos II, "Non piu in cura")

## Test data
- Cani attesi: `Bella`, `Kratos II`

## Steps

### TC-01: Happy path - Vedere l'elenco
1. Sign in as titolare. Navigate to `/impostazioni/archivio`.
2. Assert: titolo "Archivio" e sottotitolo "2 in archivio".
3. Assert: righe per Bella e Kratos II, ciascuna con "Razza - eta - proprietario" e stato "Non piu in cura".
4. Assert: ogni riga ha un pulsante **Ripristina**.

### TC-02: Navigazione
1. Click **Indietro**. Assert: URL `/impostazioni`.
2. Browser forward. Assert: torni su Archivio con lo stesso elenco.

### TC-03: Edge cases
- Nessun filtro, ordinamento o paginazione presenti.
- Un cane attivo (es. Pippo) non compare in elenco.

## Assertions
- [ ] Il sottotitolo coincide col numero di righe.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
