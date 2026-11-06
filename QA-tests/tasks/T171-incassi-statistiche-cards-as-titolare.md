# T171-incassi-statistiche-cards-as-titolare: Statistiche — schede «€ all’ora», «Previsione del mese», «Clienti in ritardo»

| Field | Value |
|---|---|
| Route | `/incassi/statistiche` |
| Source | `src/pages/StatistichePage.tsx`, `src/components/piano/SchedeStatistiche.tsx` |
| Flow | View stats cards (€ all’ora, Previsione del mese, Clienti in ritardo) |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Seed with at least one completed visit (otherwise «€ all’ora» shows `—`). Values shift with the date: assert the format, not the seed numbers. «Previsione del mese» covers only the current calendar month (completed visits of the month + visits still in programma in the month × (1 − share of no-shows over all history)).

## Test data
- Each card has three lines: label, value, subtitle.
  - `€ all’ora` · `<euro amount, e.g. € 31>` · `visite completate`
  - `Previsione del mese` · `<euro amount>` · `<current month name, e.g. Novembre>`
  - `Clienti in ritardo` · `<n>` · `oltre il loro ritmo abituale`

## Steps

### TC-01: Happy path — Vedere le statistiche
1. Sign in as `titolare`. Navigate to `/incassi/report`, then tap the «Statistiche» row (same row style and arrow as the other rows of Report) or navigate to `/incassi/statistiche`.
2. Assert: heading `Statistiche` visible.
3. Assert: three cards with labels `€ all’ora`, `Previsione del mese`, `Clienti in ritardo`.
4. Assert: the values of the first two contain `€` (formatted amount), the third is an integer. No `NaN`, `undefined` or empty values.
5. Assert: subtitles `visite completate`, the current month name (in the app language), `oltre il loro ritmo abituale`.
6. Reload. Assert: identical values.
7. Click **`Indietro`**. Assert: URL `/incassi/report`.

### TC-02: Nascondi importi
1. Go to `/incassi`, tap the eye button `Nascondi importi` (it becomes `Mostra importi`).
2. Open `/incassi/statistiche`. Assert: the two euro cards show `•••`; no euro digits anywhere in the cards (no `\d €` / `€ \d`); `Clienti in ritardo` still shows its number.
3. Turn `Mostra importi` back on in `/incassi`. Assert: amounts visible again in Statistiche.

### TC-03: Coerenza con i dati
1. Navigate to `/incassi?periodo=mese`. Assert: `Previsione del mese` is not smaller than the «Incassato» total of the current month (record both numbers).

### TC-04: Tab bar
| Button | Action taken | Expected result |
|---|---|---|
| `Aggiungi` (FAB) | click | `/appuntamenti/nuovo` |
| `Home` | click | `/` |
| `Agenda` | click | `/calendario` |
| `Altro` | click | `/altro` |

## Assertions
- [ ] Heading and three cards visible (label, value, subtitle), euro amounts with `€`.
- [ ] With `Nascondi importi` on: `•••` and no euro digits.
- [ ] Readable at 320, 360 and 390 px without horizontal scroll.
- [ ] `Indietro` goes to `/incassi/report`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx).

## Screenshots required
- Page initial load
- With Nascondi importi on
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
