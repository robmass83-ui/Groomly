# T121-notifiche-mensili-orario-as-titolare: Notifiche - promemoria Mensili in scadenza

| Field | Value |
|---|---|
| Route | `/impostazioni/notifiche` |
| Source | `src/pages/NotificationsPage.tsx` |
| Flow | Attivare/disattivare promemoria mensile; cambiare orario; cambiare giorni di anticipo |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare con impostazioni notifiche ai default (Mensili on, 7 giorni, 18:30)

## Test data
- `orario = "09:00"`
- `giorniAnticipo = 9` (da 7: due click su `Più giorni`)
- `giorniMin = 0`

## Steps

### TC-01: Happy path - Modificare il promemoria mensile
1. Sign in as titolare. Navigate to `/impostazioni/notifiche`.
2. Assert: titolo `Notifiche`; switch `Mensili in scadenza` attivo; `Orario` = `18:30`; 7 giorni prima.
3. Imposta `Orario` = `09:00`.
4. Clicca **`Più giorni`** due volte. Assert: valore 9 giorni prima.
5. Clicca **`Meno giorni`** fino a 0. Assert: il valore si ferma a 0 e **`Meno giorni`** non scende sotto 0. Poi clicca **`Più giorni`** fino a 9.
6. Ricarica la pagina. Assert: `Orario` = `09:00` e 9 giorni (persistenza).

### TC-02: Disattivare Mensili
1. Clicca lo switch **`Mensili in scadenza`** (off). Assert: `Orario` disabilitato.
2. Ricarica. Assert: switch ancora off. Riattiva lo switch. Assert: `Orario` di nuovo abilitato.

### TC-03: Ripristino
1. Reimposta `Orario` = `18:30` e giorni = 7 per lasciare i default.

### TC-04: Popup info
1. Clicca **`Informazioni su Mensili in scadenza`**. Assert: compare il popup informativo; chiudilo e assert che la pagina è inalterata.

## Assertions
- [ ] Default: 7 giorni prima, orario 18:30
- [ ] Orario disabilitato con Mensili off
- [ ] Il valore persiste dopo reload
- [ ] Minimo 0 giorni rispettato
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- Popup info aperto
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
