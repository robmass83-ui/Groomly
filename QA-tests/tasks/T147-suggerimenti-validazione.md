# T147-suggerimenti-validazione: Form validation - suggerimento

| Field | Value |
|---|---|
| Route | `/impostazioni/suggerimenti` |
| Source | `src/pages/SuggerimentiPage.tsx` |
| Flow | Send under 10 chars; max length |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare

## Test data
- `empty = ""`
- `short = "corto"`
- `spaces = 12 x " "`
- `exact10 = "1234567890"`
- `long2100 = 2100 x "a"`

## Steps

### TC-01: Validazione testo
1. Sign in as titolare. Open `/impostazioni/suggerimenti`, click **E scomodo**.

| Input | Click | Expected |
|---|---|---|
| `empty` | **Invia** | "Scrivi almeno 10 caratteri." in dialog, no send |
| `short` | **Invia** | "Scrivi almeno 10 caratteri." |
| `spaces` | **Invia** | "Scrivi almeno 10 caratteri." (trimmed) |
| `exact10` | **Invia** | accepted; "Grazie" dialog (or send failure message if callable down) |
| `long2100` | type | textarea caps at 2000 chars, counter "2000 / 2000" |

2. After each rejected case, assert the dialog stays open and no thanks dialog appears.

### TC-02: Chiudi
1. Open a category, type `short`, click **Chiudi**. Reopen the same category. Assert: dialog opens (record whether text is kept or cleared; no error).

## Assertions
- [ ] Error text matches exactly.
- [ ] No console errors.

## Screenshots required
- Each validation error state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
