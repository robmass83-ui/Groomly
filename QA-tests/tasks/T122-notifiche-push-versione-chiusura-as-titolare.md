# T122-notifiche-push-versione-chiusura-as-titolare: Notifiche - Nuova versione e Appuntamenti da chiudere

| Field | Value |
|---|---|
| Route | `/impostazioni/notifiche` |
| Source | `src/pages/NotificationsPage.tsx` |
| Flow | Attivare push nuova versione; attivare push appuntamenti da chiudere e regolare minuti |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as titolare con `Nuova versione` off e `Appuntamenti da chiudere` off (default)

## Test data
- `minutiTarget = 90` (da 60: se lo step è di 15 min, 2 click di `Più minuti`; annotare lo step reale)
- `minutiMin = 0`, `minutiMax = 1440`

## Steps

### TC-01: Happy path - Appuntamenti da chiudere
1. Sign in as titolare. Navigate to `/impostazioni/notifiche`.
2. Assert: `Appuntamenti da chiudere` off; **`Meno minuti`** e **`Più minuti`** disabilitati; valore predefinito 60 min dopo.
3. Clicca lo switch **`Appuntamenti da chiudere`**. Assert: switch on; i due stepper abilitati.
4. Clicca **`Più minuti`** finché il valore è 90. Assert: valore 90.
5. Se i permessi push sono negati o non disponibili, assert: messaggio di avviso visibile e annotarlo.
6. Ricarica. Assert: switch on e valore 90 persistiti.

### TC-02: Limiti stepper
1. Clicca **`Meno minuti`** fino al minimo. Assert: il valore non scende sotto 0.
2. Clicca **`Più minuti`** fino al massimo. Assert: il valore non supera 1440.
3. Riporta il valore a 60.

### TC-03: Nuova versione
1. Clicca lo switch **`Nuova versione`**. Assert: switch on (o avviso permessi negati).
2. Ricarica. Assert: stato persistito. Disattiva lo switch e assert off.

### TC-04: Disattivare Appuntamenti da chiudere
1. Clicca lo switch **`Appuntamenti da chiudere`** (off). Assert: stepper di nuovo disabilitati.

### TC-05: Popup info
1. Clicca **`Informazioni su Nuova versione`** e **`Informazioni su Appuntamenti da chiudere`**. Assert: ogni popup si apre con testo esplicativo, e si chiude senza cambiare gli switch.

## Assertions
- [ ] Stepper minuti disabilitato con "Appuntamenti da chiudere" off
- [ ] Limiti 0 e 1440 rispettati
- [ ] I valori persistono dopo reload
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Stepper disabilitati
- Stepper abilitati con 90
- Popup info

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
