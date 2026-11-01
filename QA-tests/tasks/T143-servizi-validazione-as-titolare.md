# T143-servizi-validazione-as-titolare: Form validation - servizio-principale e servizio-extra

| Field | Value |
|---|---|
| Route | `/impostazioni/servizi` |
| Source | `src/pages/ServicesPage.tsx` |
| Flow | Validazione dei form del dialog Nuovo servizio |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- Valido: `name = "Validazione QA {runId}"`, durate `30/45/60`, prezzi `20,50/28/38`
- Invalidi: durata `0`, `1.5`, `""`; prezzo `abc`, `-1`, `12,345`, `""`; nome `""`

## Steps

### TC-01: Form validation - servizio-principale
1. Sign in as titolare. Navigate to `/impostazioni/servizi`, click **Aggiungi servizio**.
2. Con tutti i campi vuoti click **Salva**. Assert: il dialog resta aperto e compaiono 7 errori (Nome, 3 durate, 3 prezzi): "Il nome è obbligatorio", "Minuti interi, minimo 1", "Prezzo ≥ 0, al massimo due decimali".
3. Per ogni riga della tabella parti da un form valido, cambia solo il campo indicato e click **Salva**:

| Campo | Valore | Errore atteso |
|---|---|---|
| Nome | `""` | "Il nome è obbligatorio" |
| Durata piccola | `0` | "Minuti interi, minimo 1" |
| Durata media | `1.5` | "Minuti interi, minimo 1" |
| Durata grande | `""` | "Minuti interi, minimo 1" |
| Prezzo piccola | `abc` | "Prezzo ≥ 0, al massimo due decimali" |
| Prezzo media | `-1` | "Prezzo ≥ 0, al massimo due decimali" |
| Prezzo grande | `12,345` | "Prezzo ≥ 0, al massimo due decimali" |

4. Assert: in nessun caso il servizio e stato creato (la lista resta di 4 PRINCIPALI).

### TC-02: Form validation - servizio-extra
1. Nel dialog click **Extra**, con campi vuoti click **Salva**. Assert: errori su Nome, Durata, Prezzo.
2. Valori: Nome `""`, Durata `0`, Prezzo `x`. Assert: stessi messaggi di TC-01.
3. Assert: nessun extra creato (restano 5 EXTRA).

### TC-03: Negative & edge cases
- Dopo gli errori correggi i campi e **Salva**: l'errore sparisce, il servizio viene creato; eliminalo poi (vedi T145).
- Click **Chiudi** con dati inseriti: nessun servizio creato.
- Nome di soli spazi `"   "`: "Il nome è obbligatorio".

## Assertions
- [ ] 7 errori nel form principale vuoto.
- [ ] Messaggi esatti per nome, durata, prezzo.
- [ ] Nessun salvataggio con dati invalidi.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Ogni stato di errore (principale vuoto, extra vuoto)

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
