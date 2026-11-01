# T021-animali-nuovo-crea-as-titolare: Crea un cane con i dati essenziali

| Field | Value |
|---|---|
| Route | `/animali/nuovo` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Creare un cane con nome, proprietario, telefono |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture (per il controllo cloud del salone): `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T021 Fido"` (annota `salonId`).

## Test data
- `Nome = "QA T021 Nuovo"`, `Razza = "Barboncino"`, `Taglia = Media`, `Proprietario = "Mario Rossi"`, `Telefono = "3331234567"`, `Carattere = Bravo`, `Avviso critico = "Allergico allo shampoo"`.

## Steps

### TC-01: Happy path - Crea il cane (AC1)
1. `check-c1.cjs <salonId> "QA T021 Fido"`: N0.
2. Apri `/animali/nuovo`. Assert: titolo «Nuovo cane», sezioni IDENTITÀ, CONTATTI, CARATTERE.
3. Compila Nome, Razza, Taglia, Proprietario, Telefono, Carattere, Avviso critico coi valori sopra.
4. Premi **`Salva`**.
5. Assert: redirect a `/animali/<id>`, scheda «QA T021 Nuovo» con razza e proprietario; toast con **Annulla**.
6. Apri `/animali`. Assert: «QA T021 Nuovo» in elenco, nessun «Cane eliminato» nell'elenco.
7. Attendi 15 s. `check-c1.cjs`. Assert: `visiteNelSalone` = N0 (creare un cane non cancella né crea visite); il cane fixture esiste ancora.

### TC-02: Annulla dal toast
- Crea un secondo cane «QA T021 Nuovo 2», premi **Annulla** nel toast: il cane sparisce da `/animali`; `visiteNelSalone` resta N0.

## Assertions
- [ ] Redirect e toast dopo Salva.
- [ ] Cane persistito dopo reload.
- [ ] Nessuna visita toccata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Form compilato, scheda dopo Salva, toast, esito check

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01, TC-02 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
