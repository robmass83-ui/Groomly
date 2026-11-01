# T304-backup-ripristino-tengono-assegnatario-as-titolare-salone: Backup e ripristino tengono chi fa la visita

| Field | Value |
|---|---|
| Route | `/impostazioni` |
| Source | `src/pages/SettingsPage.tsx` |
| Flow | Creare un backup, controllarne il contenuto, ripristinarlo |
| Requires auth | yes |
| Required role | titolare-salone |
| Destructive | yes (ripristino sul salone di prova dell'emulatore) |
| Estimated steps | 14 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly, MAI dati veri).
- Fixture: `node QA-tests/.qa-catalog/fixture-c2.cjs salone55@test.groomly staff55a@test.groomly "QA T304 Fido"`.

## Test data
- Visita `qat304fido-completato` chiusa con Completato prima del backup.

## Steps

### TC-01: Happy path - backup (AC6)
1. Come `titolare-salone` apri `/` e chiudi `qat304fido-completato` con **`Completato`**; `check-c2.cjs` conferma `assigneeUid`.
2. Apri `/impostazioni`, sezione backup, e crea/scarica un backup (ZIP) nella cartella del task.
3. Apri lo ZIP da Node e leggi il JSON dei dati. Assert: `qat304fido-completato` ha `assigneeUid` = collaboratore, `kind` = `pelosetto`, `chiusoIl` presente; `qat304fido-nonvenuto` (ancora da chiudere) ha `assigneeUid`.

### TC-02: Ripristino (AC6)
1. Ripristina quel backup dall'app (Impostazioni → ripristino → scegli lo ZIP → conferma).
2. `check-c2.cjs <salonId> "QA T304 Fido"`. Assert: le visite esistono ancora con `assigneeUid` = collaboratore e `kind`; la completata ha `chiusoIl`.
- Se il ripristino dall'interfaccia non è praticabile (es. richiede Google Drive), segna il TC come BLOCKED spiegando il motivo; il TC-01 resta valido.

## Assertions
- [ ] Il backup contiene l'assegnatario; il ripristino lo conserva.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Schermata backup
- Estratto del JSON del backup con la visita
- Esito `check-c2.cjs` dopo il ripristino

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-6 | AC6 Backup e ripristino conservano l'assegnatario: il JSON del backup ha assigneeUid sulla visita e dopo il ripristino il cloud ha ancora assigneeUid | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
