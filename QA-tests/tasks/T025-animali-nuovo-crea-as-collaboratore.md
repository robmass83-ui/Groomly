# T025-animali-nuovo-crea-as-collaboratore: Il collaboratore crea un cane

| Field | Value |
|---|---|
| Route | `/animali/nuovo` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Collaboratore può creare un cane |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 12 |

## Preconditions
- App running at `http://127.0.0.1:5173`; Sign in as `collaboratore`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo collaboratore> "QA T025 Fido"` (annota `salonId`).

## Test data
- `Nome = "QA T025 Nuovo"`, `Proprietario = "Luisa Verdi"`, `Telefono = "3339876543"`, `Taglia = Piccola`.

## Steps

### TC-01: Happy path - creazione come collaboratore (AC1)
1. `check-c1.cjs <salonId> "QA T025 Fido"`: N0.
2. Apri `/animali/nuovo`, compila i campi di Test data, premi **`Salva`**.
3. Assert: redirect a `/animali/<id>`, scheda «QA T025 Nuovo»; toast con **Annulla**.
4. Apri `/animali`: il cane è in elenco.
5. Attendi 15 s, `check-c1.cjs`: `visiteNelSalone` = N0, le 4 visite del cane fixture invariate.

### TC-02: Validazione
- **Salva** vuoto: «Il nome è obbligatorio», «Il proprietario è obbligatorio», «Il telefono è obbligatorio».

## Assertions
- [ ] Il collaboratore crea il cane.
- [ ] Nessuna visita cancellata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Form compilato, scheda salvata

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
