# T097-archivio-ripristina-as-titolare: Archivio - ripristinare un cane

| Field | Value |
|---|---|
| Route | `/impostazioni/archivio` |
| Source | `src/pages/ArchivePage.tsx` |
| Flow | Restore dog, Empty state arcVuoto |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 2 cani archiviati (Bella, Kratos II)

## Test data
- `caneDaRipristinare = "Bella"`

## Steps

### TC-01: Happy path - Ripristina
1. Sign in as titolare. Navigate to `/impostazioni/archivio`. Assert: "2 in archivio".
2. Click **Ripristina** sulla riga di Bella.
3. Assert: la riga di Bella sparisce (la mutazione e immediata, nessuna conferma) e il sottotitolo diventa "1 in archivio".
4. Navigate to `/animali`. Assert: Bella compare tra i cani attivi.
5. Reload `/impostazioni/archivio`. Assert: Bella non e in archivio.

### TC-02: Empty state
1. Click **Ripristina** su Kratos II.
2. Assert: compare lo stato vuoto (testo arcVuoto) e nessuna riga.
3. Reload. Assert: lo stato vuoto persiste.

### TC-03: Ripristino e riarchiviazione (pulizia)
1. Da `/animali` apri la scheda di Bella e Kratos II e riportali a "Non piu in cura" per ripristinare il seed, se la UI lo permette. Annota se non e possibile.

## Assertions
- [ ] Ripristina rimuove la riga e rende il cane attivo.
- [ ] Stato vuoto mostrato quando non ci sono archiviati.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Elenco iniziale
- Dopo Ripristina
- Stato vuoto

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
