# T142-servizi-crea-extra-as-titolare: Aggiungere un servizio extra a prezzo unico

| Field | Value |
|---|---|
| Route | `/impostazioni/servizi` |
| Source | `src/pages/ServicesPage.tsx` |
| Flow | Aggiungere servizio extra |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 10 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 5 servizi EXTRA

## Test data
- `name = "SPA QA {runId}"`, Durata = `15`, Prezzo = `5`, Attivo = acceso

## Steps

### TC-01: Happy path - Creare un extra
1. Sign in as titolare. Navigate to `/impostazioni/servizi`.
2. Click **Aggiungi servizio**. Assert: dialog **Nuovo servizio**.
3. Fill **Nome** = `SPA QA {runId}`. Click **Extra**.
4. Assert: restano Nome, Durata e Prezzo (campo unico), non ci sono i campi per taglia.
5. Assert: il Nome compilato e mantenuto. Fill **Durata** = `15`, **Prezzo** = `5`.
6. Click **Salva**.
7. Assert: dialog chiuso; `SPA QA {runId}` compare nel gruppo EXTRA (ora 6 voci).
8. Reload. Assert: il servizio persiste.

### TC-02: Cambio tipo
1. Apri **Aggiungi servizio**, click **Extra** poi **Principale**. Assert: tornano i campi per tre taglie. Click **Chiudi**.
2. Apri **Apri SPA QA {runId}** (modifica). Assert: il selettore Principale/Extra non e disponibile (solo in creazione).

## Assertions
- [ ] Extra creato nel gruppo EXTRA e persistente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Dialog con Extra selezionato
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
