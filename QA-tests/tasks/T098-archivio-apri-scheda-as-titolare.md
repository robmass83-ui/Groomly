# T098-archivio-apri-scheda-as-titolare: Archivio - aprire la scheda di un cane

| Field | Value |
|---|---|
| Route | `/impostazioni/archivio` |
| Source | `src/pages/ArchivePage.tsx` |
| Flow | Open dog sheet |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 2 cani archiviati (Bella, Kratos II)

## Test data
- `cane = "Kratos II"`

## Steps

### TC-01: Happy path - Apri scheda
1. Sign in as titolare. Navigate to `/impostazioni/archivio`.
2. Click la riga **Apri Kratos II**.
3. Assert: URL `/animali/<id>` e la scheda mostra il nome Kratos II e lo stato non piu in cura.
4. Back del browser. Assert: ritorno ad Archivio con "2 in archivio" invariato.

### TC-02: Apri non ripristina
1. Dopo il TC-01 assert che Kratos II e ancora nell'elenco archivio (Apri non muta dati).

### TC-03: Edge cases
- Click su **Ripristina** non apre la scheda (il click non propaga alla riga): resta su `/impostazioni/archivio`. Ripristina poi riarchivia se possibile, oppure esegui questo caso per ultimo.

## Assertions
- [ ] La riga apre `/animali/:id` del cane corretto.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Scheda cane aperta da Archivio

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
