# T013-animali-id-modal-contatto-campo-as-titolare: Modal - Contatto e Campo

| Field | Value |
|---|---|
| Route | `/animali/:id` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Aggiungere contatto extra, nota, campo personalizzato |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.
- Fixture: `node QA-tests/.qa-catalog/fixture-c1.cjs <email del ruolo titolare> "QA T013 Fido"` (annota `salonId`; `qat013fido-dog`).

## Test data
- Contatto: `Nome contatto = "Anna Bianchi"`, `Telefono contatto = "+39 320 1112233"`, `Ruolo = primo chip`.
- Campo: `Etichetta campo = "Veterinario"`, `Valore campo = "Dr. Verdi"`.
- Invalidi/vuoti: contatto con nome e telefono vuoti; campo con etichetta vuota.

## Steps

### TC-01: Happy path - aggiungere contatto e campo, poi Salva
1. `check-c1.cjs`: N0.
2. Apri `/animali/qat013fido-dog`, **`Modifica`**.
3. Premi **`Aggiungi numero`** (dialog «Contatto»). Assert: dialog visibile, focus sul primo input.
4. Premi **Chiudi**. Assert: dialog chiuso, nessun contatto aggiunto.
5. Riapri, compila Nome e Telefono contatto, scegli il ruolo, premi **`Aggiungi contatto`**. Assert: «Anna Bianchi» e «+39 320 1112233» compaiono tra i contatti.
6. Apri **`Campi`** → **Aggiungi** (dialog «Campo»), compila Etichetta «Veterinario» e Valore «Dr. Verdi», premi **`Aggiungi`**. Assert: riga «Veterinario: Dr. Verdi».
7. Premi **`Salva`**, ricarica. Assert: contatto e campo persistono.
8. `check-c1.cjs`: `visiteNelSalone` = N0.

### TC-02: Modal - validazione
- Nel dialog «Contatto» premi **Aggiungi contatto** con campi vuoti: nessun contatto vuoto aggiunto (o errore visibile); stesso per «Campo» con etichetta vuota.
- **`Togli`** su contatto e campo in modifica: spariscono dalla scheda; dopo **Salva** non ci sono più.

## Assertions
- [ ] Dialog si chiudono con Chiudi senza cambiare stato.
- [ ] Contatto e campo salvati e persistenti.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Dialog Contatto, dialog Campo, scheda finale

## Acceptance criteria
| # | Acceptance criterion | Covered by |
|---|---|---|
| AC-1 | AC1 Dopo il login (e dopo aver aspettato 15 s) il numero di visite del salone nel cloud è invariato: nessuna visita cancellata da sola | TC-01 |

## Pass criteria
All TCs above pass AND no unexpected console/network errors, AND every acceptance criterion listed is verified.
