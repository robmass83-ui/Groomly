# T148-suggerimenti-accordion-aree: Suggerimenti - parte dell'app

| Field | Value |
|---|---|
| Route | `/impostazioni/suggerimenti` |
| Source | `src/pages/SuggerimentiPage.tsx` |
| Flow | Expand "Una parte dell'app" and pick a category |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `testo = "Nel listino vorrei ordinare i servizi a mano."`
- Areas: Agenda, orari o appuntamenti; Schede degli animali; Listino, servizi o prezzi; Incassi, report o export; Account, backup o accesso; Una scritta o una lingua; Altro

## Steps

### TC-01: Happy path - area
1. Sign in as titolare. Open `/impostazioni/suggerimenti`.
2. Click **Una parte dell'app**. Assert: accordion reveals the area categories (6 per analysis: verify the list against the labels above and record any differing count).
3. Click **Listino, servizi o prezzi**. Assert: dialog titled with that category opens.
4. Fill `testo`, click **Invia**. Assert: "Grazie" dialog; click **Chiudi**.

### TC-02: Ogni area apre il dialog
1. For each area label, click it, assert the dialog opens with textarea "Scrivi qui", then click **Chiudi**.

### TC-03: Accordion
1. Click **Una parte dell'app** again. Assert: it collapses.

## Assertions
- [ ] Every area opens the dialog.
- [ ] No console errors.

## Screenshots required
- Accordion expanded
- Dialog opened

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
