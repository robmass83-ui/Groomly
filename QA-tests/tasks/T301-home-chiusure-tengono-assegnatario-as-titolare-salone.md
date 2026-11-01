# T301-home-chiusure-tengono-assegnatario-as-titolare-salone: Home - Completato, Non venuto e Disdetto tengono chi fa la visita

| Field | Value |
|---|---|
| Route | `/` |
| Source | `src/pages/HomePage.tsx` |
| Flow | Chiudere da «Da chiudere» tre visite assegnate al collaboratore |
| Requires auth | yes |
| Required role | titolare-salone |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173` (emulatori demo-groomly).
- Signed in as `titolare-salone` (salone55, Salone con collaboratore staff55a).
- Fixture: `node QA-tests/.qa-catalog/fixture-c2.cjs salone55@test.groomly staff55a@test.groomly "QA T301 Fido"` (annota `salonId`, `assigneeUid`).

## Test data
- `nomeCane = "QA T301 Fido"`; visite `qat301fido-completato`, `qat301fido-nonvenuto`, `qat301fido-disdetto` (tutte assegnate a staff55a, kind `pelosetto`).

## Steps

### TC-01: Happy path - Completato dalla Home (AC1)
1. Sign in as titolare-salone, apri `/`.
2. In DA CHIUDERE trova la riga di «QA T301 Fido» relativa a `qat301fido-completato` (la più vecchia, 30 h fa) e premi **`Completato`**.
3. Esegui `check-c2.cjs <salonId> "QA T301 Fido"`. Assert: `qat301fido-completato` ha `status` = `completato`, `assigneeUid` = assigneeUid della fixture, `kind` = `pelosetto`, `chiusoIl` non nullo.

### TC-02: Non venuto (AC3)
1. Sulla riga di `qat301fido-nonvenuto` usa l'azione **`Non venuto`** (dalla riga o dalla scheda visita se la Home non la offre).
2. `check-c2.cjs`. Assert: `status` = `non_venuto`, `assigneeUid` invariato, `kind` = `pelosetto`.

### TC-03: Disdetto (AC4)
1. Sulla riga di `qat301fido-disdetto` usa **`Disdetto`** (scegli un motivo se richiesto).
2. `check-c2.cjs`. Assert: `status` = `disdetto`, `assigneeUid` invariato, `kind` = `pelosetto`.

### TC-04: Negative & edge
- Ricarica `/` e attendi 15 s, poi riesegui `check-c2.cjs`: i campi sono ancora presenti (nessuna riscrittura successiva li toglie).

## Assertions
- [ ] Dopo ogni chiusura `assigneeUid` e `kind` restano nel cloud; per Completato c'è `chiusoIl`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Home con le visite di «QA T301 Fido» in DA CHIUDERE
- Home dopo le tre chiusure
- Esito `check-c2.cjs` finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Una visita assegnata al collaboratore chiusa con «Completato» dalla Home: nel cloud restano assigneeUid (= collaboratore) e kind, e c'è chiusoIl | TC-01, TC-04 |
| AC-3 | AC3 Una visita assegnata al collaboratore chiusa con «Non venuto»: nel cloud restano assigneeUid e kind | TC-02, TC-04 |
| AC-4 | AC4 Una visita assegnata al collaboratore chiusa con «Disdetto»: nel cloud restano assigneeUid e kind | TC-03, TC-04 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
