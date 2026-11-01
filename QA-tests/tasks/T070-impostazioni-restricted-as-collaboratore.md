# T070-impostazioni-restricted-as-collaboratore: Impostazioni — vista collaboratore (StaffLock)

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Collaboratore view has restricted rows (StaffLock) |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as role `collaboratore` (staff of the Plus salone, access active)

## Test data
- Rows to compare against the titolare view (T066): `Abbonamento`, `Servizi e durate`, `Archivio animali`, `Notifiche`, `Avvisi`, `Gestisci account Groomly`, `Backup e ripristino`, `Tema`, `Lingua`, `Esci`.

## Steps

### TC-01: Happy path — Rendering ristretto
1. Sign in as `collaboratore`, navigate to `/impostazioni`.
2. Assert: heading `Impostazioni` visible; no redirect.
3. Assert: owner-only rows (e.g. `Abbonamento`, `Gestisci account Groomly`, `Backup e ripristino`) are hidden or show a lock marker (StaffLock). Record which are locked and assert that the set is identical across two reloads.
4. Click a locked row. Assert: it does not navigate to the owner-only sub-page (URL stays `/impostazioni` or shows a lock message).
5. Click `Tema` and choose `Chiaro`. Assert: it works and the row shows `Chiaro`; restore `Auto`.
6. Click `Lingua` and open it. Assert: `Italiano`, `English`, `Español` listed; close with `Chiudi`.

### TC-02: Accesso diretto alle rotte proprietario
1. Navigate directly to `/impostazioni/abbonamento` and `/impostazioni/account`.
2. Assert: each shows a lock/redirect result and no owner data is exposed.

### TC-03: Esci
1. Click **`Esci`**, assert dialog `Uscire da Groomly?`; click **`Resta`**. Assert: still signed in.

## Assertions
- [ ] Locked rows cannot be opened by the collaboratore.
- [ ] Theme and language remain available.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except explicit denials.

## Screenshots required
- Page initial load
- Locked-row state
- Final state

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
