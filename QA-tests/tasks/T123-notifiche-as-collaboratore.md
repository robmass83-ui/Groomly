# T123-notifiche-as-collaboratore: Notifiche - promemoria mensile bloccato

| Field | Value |
|---|---|
| Route | `/impostazioni/notifiche` |
| Source | `src/pages/NotificationsPage.tsx` |
| Flow | Collaboratore non può modificare il promemoria mensile |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 9 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Sign in as collaboratore

## Test data
- `orarioTentativo = "10:00"`

## Steps

### TC-01: Promemoria mensile bloccato
1. Sign in as collaboratore. Navigate to `/impostazioni/notifiche`.
2. Assert: titolo `Notifiche` visibile.
3. Assert: `Orario` disabilitato (monthlyLocked) e il valore non è modificabile con `10:00`.
4. Assert: gli stepper `Meno giorni`/`Più giorni` sono bloccati o non modificano il valore (annotare lo stato reale) e il valore resta quello precedente dopo reload.

### TC-02: Voci push modificabili
1. Clicca lo switch **`Nuova versione`**. Assert: cambia stato (o compare avviso permessi). Ripristina.
2. Clicca **`Indietro`**. Assert: URL `/impostazioni`.

## Assertions
- [ ] Collaboratore non può modificare il promemoria mensile
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load con Orario disabilitato

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
