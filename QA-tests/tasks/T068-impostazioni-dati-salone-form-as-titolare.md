# T068-impostazioni-dati-salone-form-as-titolare: Dati del salone — Partita IVA e validazione

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Complete salone data (Partita IVA) via completeness chips |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`; Partita IVA not yet set (chip `Partita IVA o codice fiscale` present in completeness card)

## Test data
- `nomeToelettatura` = `"Pet Spa QA"`
- `ragioneSociale` = `"Pet Spa QA S.r.l."`
- `partitaIva` = `"12345678903"`
- `codiceFiscale` = `""`
- `telefono` = `"3331234567"`
- `indirizzo` = `""` (address autocomplete left empty)
- invalid: `badPartitaIva` = `"123"`; `partitaIvaConIT` = `"IT12345678903"`

## Steps

### TC-01: Happy path — Salvare i dati del salone
1. Sign in as `titolare`, navigate to `/impostazioni`.
2. Click chip **`Partita IVA o codice fiscale`**.
3. Assert: URL `/impostazioni/account?scheda=personali` and dialog `Dati del salone` visible with hint `Basta la partita IVA oppure il codice fiscale.`
4. Fill `Nome toelettatura` = `Pet Spa QA`, `Ragione sociale` = `Pet Spa QA S.r.l.`, `Partita IVA` = `12345678903`, `Telefono` = `3331234567`.
5. Click **`Salva`**.
6. Assert: dialog closes without error; the saved values appear on the account page.
7. Navigate to `/impostazioni`. Assert: the chip `Partita IVA o codice fiscale` is gone and the completeness count increased (seed 3/6 → 4/6); salone name shows `Pet Spa QA`.
8. Reload. Assert: data persists.
9. Restore the original salone name `Pet Spa Napoli 36` (cleanup).

### TC-02: Form validation — `dati-salone-dialog`
| Field | Empty value error | Pattern violation | Max-length overflow |
|---|---|---|---|
| `nomeToelettatura` | no error shown at the field (optional in analysis); assert `Salva` outcome | n/a | n/a |
| `partitaIva` | empty with `codiceFiscale` empty: assert the visible error or blocked save related to hint "Basta la partita IVA oppure il codice fiscale." | `123` → visible error about 11 cifre; `IT12345678903` → error | n/a |
| `codiceFiscale` | empty with valid partita IVA: save allowed | n/a | n/a |
| `telefono` | empty: save allowed | letters `abc` → record actual behavior (rejected or sanitized) | n/a |

After each invalid attempt assert the dialog stays open and nothing is saved.

### TC-03: Annulla
1. Open the dialog, type `Modificato` in `Nome toelettatura`, close the dialog without `Salva`.
2. Assert: salone name unchanged.

## Assertions
- [ ] Hint text visible in dialog.
- [ ] Invalid Partita IVA never persists.
- [ ] Completeness count updates after valid save.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Dialog opened
- Each validation error state
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
