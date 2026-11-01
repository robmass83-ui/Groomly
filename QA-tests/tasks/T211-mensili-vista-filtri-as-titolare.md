# T211-mensili-vista-filtri-as-titolare: Mensili - cambio mese e filtri

| Field | Value |
|---|---|
| Route | `/mensili` |
| Source | `src/pages/MonthlyPage.tsx` |
| Flow | Cambiare mese; filtrare Tutti / Da fissare / Fissati |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: cani con ritorno mensile in stati IN RITARDO, IN SCADENZA, DA FISSARE, FISSATI

## Test data
- Mesi: corrente (nov) e successivo (dic)
- Filtri: Tutti, Da fissare, Fissati

## Steps

### TC-01: Happy path - Vedere il mese corrente
1. Sign in as titolare. Navigate to `/mensili`.
2. Assert: titolo **Mensili**; segmented mese con `nov` selezionato e `dic`.
3. Assert: contatore `booked/total` con barra di avanzamento coerente (booked <= total, ampiezza proporzionale).
4. Assert: gruppi IN RITARDO, IN SCADENZA, DA FISSARE, FISSATI con dati seed.

### TC-02: Cambio mese
1. Click **dic**. Assert: contatore e gruppi cambiano; `dic` selezionato.
2. Click **nov**. Assert: ritorno ai dati iniziali.

### TC-03: Filtri
1. Click **Da fissare**. Assert: sono visibili solo i gruppi da fissare, FISSATI nascosto.
2. Click **Fissati**. Assert: sono visibili solo i FISSATI; i gruppi da fissare nascosti.
3. Click **Tutti**. Assert: tutti i gruppi di nuovo visibili.
4. Seleziona un mese e filtro che non danno risultati (es. **Fissati** su `dic` se vuoto). Assert: messaggio di stato vuoto.

### TC-04: Negative & edge cases
- Reload: il mese corrente e il filtro Tutti sono i default.
- Click **Aggiungi (FAB)**: si apre il menu senza errori.

## Assertions
- [ ] Contatore e progressbar coerenti.
- [ ] Filtro Fissati nasconde i gruppi da fissare.
- [ ] Filtro senza risultati mostra il messaggio vuoto.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Ogni filtro
- Stato vuoto

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
