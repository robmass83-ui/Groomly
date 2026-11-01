# T099-archivio-as-titolare-go: Archivio - titolare Go (piano gratuito)

| Field | Value |
|---|---|
| Route | `/impostazioni/archivio` |
| Source | `src/pages/ArchivePage.tsx` |
| Flow | View archived dogs |
| Requires auth | yes |
| Required role | titolare-go |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare-go
- Seed: l'account titolare-go ha eventuali cani archiviati; se nessuno, si verifica lo stato vuoto

## Test data
- Nessun input.

## Steps

### TC-01: Happy path - Accesso e vista
1. Sign in as titolare-go. Navigate to `/impostazioni/archivio`.
2. Assert: titolo "Archivio", nessun redirect ne paywall.
3. Assert: se esistono archiviati, il sottotitolo "N in archivio" coincide con le righe e ogni riga ha **Ripristina**; altrimenti compare lo stato vuoto.

### TC-02: Ripristina (se presente una riga)
1. Click **Ripristina** sulla prima riga. Assert: la riga sparisce e il cane torna in `/animali`.

### TC-03: Navigazione
1. Click **Indietro**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Pagina raggiungibile da titolare-go.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
