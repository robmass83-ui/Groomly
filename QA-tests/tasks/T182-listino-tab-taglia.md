# T182-listino-tab-taglia: Listino - salto tra sezioni per taglia

| Field | Value |
|---|---|
| Route | `/listino` |
| Source | `src/pages/ListinoPage.tsx` |
| Flow | Jump between size sections |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 8 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- Tabs: `Piccola`, `Media`, `Grande`, `Extra`, `Info`

## Steps

### TC-01: Happy path
1. Sign in as titolare. Navigate to `/listino`.
2. Assert: **Piccola** pressed by default.
3. Click **Media**. Assert: pressed, and the matching section scrolls into view.
4. Repeat for **Grande**, **Extra**, **Info**.
5. Click **Piccola**. Assert: scrolls back to top section and Piccola is pressed.

## Assertions
- [ ] Exactly one tab pressed at a time.
- [ ] No console errors.

## Screenshots required
- Each tab active

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
