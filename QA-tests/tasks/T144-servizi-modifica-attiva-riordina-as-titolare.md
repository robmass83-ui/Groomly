# T144-servizi-modifica-attiva-riordina-as-titolare: Modificare, attivare/disattivare e riordinare servizi

| Field | Value |
|---|---|
| Route | `/impostazioni/servizi` |
| Source | `src/pages/ServicesPage.tsx` |
| Flow | Modificare un servizio; attivare/disattivare; riordinare |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 4 PRINCIPALI e 5 EXTRA

## Test data
- `newName = "Rinominato QA {runId}"` applicato al primo servizio PRINCIPALE (annota il nome originale `origName`)
- Durata piccola = `35`, Prezzo piccola = `21,5`

## Steps

### TC-01: Happy path - Modificare un servizio
1. Sign in as titolare. Navigate to `/impostazioni/servizi`.
2. Click **Apri <origName>**. Assert: dialog **Modifica servizio** precompilato, con **Salva**, **Elimina servizio**, **Chiudi**, senza selettore Principale/Extra.
3. Cambia Nome = `newName`, Durata piccola = `35`, Prezzo piccola = `21,5`. Click **Salva**.
4. Assert: dialog chiuso; la lista mostra `newName`.
5. Reload. Assert: `newName` persiste; riapri e assert durata 35 e prezzo 21,5.
6. Ripristina il nome originale e salva.

### TC-02: Toggle attivo
1. Sul primo servizio click l'interruttore **Toggle attivo**. Assert: lo stato cambia (disattivato) e dopo reload persiste.
2. Riattiva lo stesso interruttore. Assert: stato di nuovo attivo.

### TC-03: Riordinare
1. Annota l'ordine dei PRINCIPALI. Su secondo servizio usa **Riordina** con ArrowUp.
2. Assert: il servizio sale di una posizione; reload conferma l'ordine.
3. Ripristina con ArrowDown e assert l'ordine originale.
4. Assert: il primo servizio non puo salire oltre e l'ultimo non puo scendere (nessun errore).

### TC-04: Negative & edge cases
- **Chiudi** dopo una modifica non salvata: nessun cambiamento persistito.
- Salva con Nome vuoto in modifica: "Il nome è obbligatorio".

## Assertions
- [ ] Modifica, toggle e ordine persistono dopo reload.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog Modifica servizio
- Lista dopo riordino

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
