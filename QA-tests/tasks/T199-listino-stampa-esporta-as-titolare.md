# T199-listino-stampa-esporta-as-titolare: Stampa, Scarica, Condividi

| Field | Value |
|---|---|
| Route | `/listino/stampa` |
| Source | `src/pages/PriceSheetExportPage.tsx` |
| Flow | Stampare/Scaricare/Condividere; errore export |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173` (web, Scarica usa un download anchor)
- Signed in as role `titolare`

## Test data
- Combinazioni: `PDF + A4`, `JPEG (immagine) + A3`

## Steps

### TC-01: Scarica PDF
1. Sign in as `titolare`, navigate to `/listino/stampa`. Seleziona **PDF** e **A4**.
2. Click **Scarica**.
3. Assert: durante la generazione **Stampa**, **Scarica**, **Condividi** sono disabilitati (busy); poi parte il download di un file `.pdf` non vuoto.
4. Assert: i pulsanti tornano abilitati.

### TC-02: Scarica JPEG
1. Seleziona **JPEG (immagine)** e **A3**, click **Scarica**.
2. Assert: download di un file immagine `.jpg`/`.jpeg` non vuoto.

### TC-03: Stampa
1. Click **Stampa**. Assert: viene generato il PDF e aperto (nuova scheda o finestra di stampa).

### TC-04: Condividi
1. Click **Condividi**. Assert: parte lo share nativo; se non supportato sul web, nessun crash e nessuna eccezione non gestita in console.

### TC-05: Errore export
1. Simula un errore di generazione (es. blocca la libreria PDF o fallisci il canvas) e click **Scarica**.
2. Assert: compare il toast di errore export (lisExportKo, testo come da app; registra il testo esatto) e i pulsanti tornano abilitati.

## Assertions
- [ ] Pulsanti disabilitati mentre busy.
- [ ] File scaricato nel formato scelto.
- [ ] Toast di errore su fallimento.
- [ ] No console errors in DevTools at any step (salvo l'errore simulato in TC-05).
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Pulsanti busy
- Toast errore
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
