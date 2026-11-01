# T067-impostazioni-modal-tema-lingua-backup-as-titolare: Modal — tema, lingua, backup

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Change theme; change language; open Backup dialog |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no (the restore button inside Backup is only inspected, never confirmed) |
| Estimated steps | 28 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `titolare`
- Theme `Auto` and language `Italiano` at start

## Test data
- `tema` = `Scuro`, then `Chiaro`, then `Auto`
- `lingua` = `English`, then `Español`, then `Italiano`
- `orario` = `03:00`
- `frequenza` = `Settimana`

## Steps

### TC-01: Happy path — Cambiare il tema
1. Sign in as `titolare`, navigate to `/impostazioni`.
2. Click row `Tema`. Assert: dialog `Scegli il tema` with buttons `Chiaro`, `Scuro`, `Auto`, `Chiudi`.
3. Click **`Scuro`**. Assert: the app switches to the dark palette (document root carries the dark theme marker) and the `Tema` row shows `Scuro`.
4. Reload. Assert: the theme remains dark.
5. Repeat for `Chiaro` (light) and restore `Auto`. Assert the row value each time.
6. Open the dialog and click **`Chiudi`**. Assert: dialog closes and the value is unchanged.

### TC-02: Cambiare la lingua
1. Click row `Lingua`. Assert: dialog `Lingua` with `Italiano`, `English`, `Español`, `Chiudi`.
2. Click **`English`**. Assert: the page labels switch to English (heading no longer `Impostazioni`) and the row shows `English`.
3. Reload. Assert: language persists.
4. Select `Español`, assert Spanish labels; then restore **`Italiano`**. Assert: heading `Impostazioni` returns.

### TC-03: Modal — backup
1. Click row `Backup e ripristino`. Assert: dialog `Backup` is visible.
2. Assert: controls `Backup automatico giornaliero` (switch), `Informazioni sulla frequenza`, `Giorno` / `Settimana` / `Mese`, time input `Orario del backup automatico`, switches `Solo Wi-Fi` and `Solo in carica`, buttons `Collega Google Drive`, `Completo con foto`, `Ripristina da un file`, `Chiudi`.
3. Toggle `Backup automatico giornaliero` on. Click `Settimana`. Assert: `Settimana` selected. Set the time to `03:00`. Assert: value `03:00`.
4. Toggle `Solo Wi-Fi` and `Solo in carica`. Assert: each switch state flips.
5. Click **`Chiudi`**. Reopen the dialog. Assert: the choices (`Settimana`, `03:00`, switches) are kept.
6. Click `Ripristina da un file`: assert a file chooser / confirmation appears; cancel it without selecting a file. Assert: data unchanged (no data replaced).
7. Click `Informazioni sulla frequenza`. Assert: an explanatory text appears.

### TC-04: Negative & edge cases
- Backup `Collega Google Drive` in the emulator: assert a visible error or sign-in prompt, never a crash; no unhandled console error.
- Open `Tema` dialog and press Escape: dialog closes.

## Assertions
- [ ] Theme dialog lists exactly 3 options; language dialog lists it/en/es.
- [ ] Theme and language persist after reload.
- [ ] Backup preferences persist across close/reopen.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Each modal opened (tema, lingua, backup)
- Dark theme applied
- Final state after restoring defaults

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
