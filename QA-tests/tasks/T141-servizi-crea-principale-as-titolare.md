# T141-servizi-crea-principale-as-titolare: Aggiungere un servizio principale con 3 taglie

| Field | Value |
|---|---|
| Route | `/impostazioni/servizi` |
| Source | `src/pages/ServicesPage.tsx` |
| Flow | Aggiungere servizio principale con 3 taglie |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: 4 servizi PRINCIPALI e 5 EXTRA

## Test data
- `name = "Pulizia orecchie QA {runId}"`
- Durata piccola = `30`, Prezzo piccola = `20,50`
- Durata media = `45`, Prezzo media = `28`
- Durata grande = `60`, Prezzo grande = `38`
- Attivo = acceso

## Steps

### TC-01: Happy path - Creare un servizio principale
1. Sign in as titolare. Navigate to `/impostazioni/servizi`.
2. Assert: titolo **Servizi e durate**; gruppi PRINCIPALI (4) ed EXTRA (5).
3. Click **Aggiungi servizio**. Assert: dialog **Nuovo servizio** con Nome, selettore Principale/Extra, Durata e Prezzo per tre taglie, Attivo.
4. Assert: **Principale** e selezionato.
5. Fill **Nome**, Durata e Prezzo di piccola, media, grande con i valori di Test data; **Attivo** acceso.
6. Click **Salva**.
7. Assert: il dialog si chiude e `Pulizia orecchie QA {runId}` compare nel gruppo PRINCIPALI (ora 5 voci), con interruttore attivo.
8. Reload. Assert: il servizio e ancora presente.
9. Apri il servizio con **Apri Pulizia orecchie QA {runId}**. Assert: Nome, durate e prezzi (20,50 / 28 / 38) corrispondono.

### TC-02: Prezzo con virgola e decimali
1. Crea `Decimali QA {runId}` con durate 10/20/30 e prezzi `0`, `9,9`, `12.50` (se il punto non e accettato, assert l'errore "Prezzo ≥ 0, al massimo due decimali").
2. Assert: prezzo `0` e `9,9` accettati.

## Assertions
- [ ] Nuovo servizio visibile in PRINCIPALI e persistente.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Dialog Nuovo servizio aperto
- Final state dopo il salvataggio

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
