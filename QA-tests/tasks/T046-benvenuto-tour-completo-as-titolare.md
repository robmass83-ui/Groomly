# T046-benvenuto-tour-completo-as-titolare: Tour di benvenuto completo

| Field | Value |
|---|---|
| Route | `/benvenuto` |
| Source | `src/pages/TourPage.tsx` |
| Flow | Tour completo: benvenuto, logo, sede, prezzi, tempi, backup, fiscale, fine |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 34 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: salone con tour NON iniziato (nessun passo completato né saltato nelle settings); se già avviato, il runner azzera lo stato del tour nelle settings dell'emulatore prima del test
- File immagine di prova `QA-tests/fixtures/logo.png` (PNG valido)

## Test data
- `logo = QA-tests/fixtures/logo.png`
- `indirizzo = "Via Roma 1, Napoli"`, orari Lun-Ven `Dalle = 09:00`, `Alle = 13:00`
- prezzi: ogni campo `<servizio> <taglia>` = `30`; tempi: ogni campo = `60`
- `iva = "12345678901"`

## Steps

### TC-01: Happy path - completare tutto il tour
1. Sign in as titolare. Navigate to `/benvenuto`.
2. Assert: schermata di benvenuto con pulsanti **Iniziamo** e **Lo facciamo dopo**.
3. Click **Iniziamo**. Assert: passo "Il tuo logo" con indicatore "PREPARIAMO IL SALONE · 1 DI 4".
4. Assert: **Fatto, avanti** è disabilitato (nessun logo).
5. Click **Scegli un’immagine** e caricare `logo.png`. Assert: anteprima del logo e **Fatto, avanti** abilitato.
6. Click **Fatto, avanti**. Assert: overlay "festa" visibile, poi passo "Dove sei e quando ti trovano aperto?".
7. Fill Indirizzo = `Via Roma 1, Napoli`; impostare Aperto con Dalle `09:00` / Alle `13:00` per Lun-Ven. Click **Fatto, avanti**.
8. Assert: overlay festa, poi passo prezzi. Fill ogni prezzo Bagno/Taglio/Bagno+taglio/Stripping x piccola/media/grande = `30`. Click **Avanti: i tempi**.
9. Assert: passo tempi. Fill ogni minuto = `60`. Click **Fatto, avanti**.
10. Assert: passo backup Drive con **Collega Google Drive** e **Avanti**. Click **Avanti** (non collegare Drive).
11. Assert: passo fiscale. Fill Partita IVA = `12345678901`. Click **Fatto, avanti**.
12. Assert: schermata finale con pulsante **Entra in Groomly**. Click **Entra in Groomly**.
13. Assert: URL is `/`.
14. Navigate to `/impostazioni/account`. Assert: logo, indirizzo e Partita IVA `12345678901` impostati nei dati toelettatura.
15. Navigate to `/listino`. Assert: i prezzi `30` sono presenti.

### TC-02: Ripresa del tour
1. Con tour avviato (almeno il logo completato), navigate to `/benvenuto`.
2. Assert: nessuna schermata di benvenuto; si apre al primo passo mancante con contatore "n DI m" coerente.

### TC-03: Tour già completato
1. Dopo TC-01, navigate to `/benvenuto`.
2. Assert: nessun crash; viene mostrata la schermata finale o avviene il redirect a `/` senza errori console.

### TC-04: Negative & edge cases
- Passo logo: caricare un file non immagine (`QA-tests/fixtures/doc.txt`). Assert: rifiutato o toast d'errore, **Fatto, avanti** resta disabilitato.
- Passo prezzi: vedere T047 per le validazioni.

## Assertions
- [ ] **Fatto, avanti** disabilitato senza logo.
- [ ] Ogni passo completato mostra l'overlay festa e avanza.
- [ ] I dati inseriti persistono (indirizzo, IVA, prezzi).
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni passo del tour
- Overlay festa
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
