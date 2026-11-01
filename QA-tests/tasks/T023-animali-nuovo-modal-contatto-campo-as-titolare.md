# T023-animali-nuovo-modal-contatto-campo-as-titolare: Modal - contatto, campo, foto-profilo

| Field | Value |
|---|---|
| Route | `/animali/nuovo` |
| Source | `src/pages/DogPage.tsx` |
| Flow | Aggiungere contatto extra e campo personalizzato |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`; signed in as `titolare`.

## Test data
- Base: `Nome = "QA T023 Nuovo"`, `Proprietario = "Mario Rossi"`, `Telefono = "3331234567"`.
- Contatto: `Nome contatto = "Anna Bianchi"`, `Telefono contatto = "3201112233"`. Campo: `Etichetta = "Veterinario"`, `Valore = "Dr. Verdi"`.

## Steps

### TC-01: Happy path - cane con contatto e campo
1. Apri `/animali/nuovo`, compila i campi base.
2. Premi **`Altri dettagli`**, poi **`Aggiungi numero`**: dialog «Contatto». Compila e premi **`Aggiungi`**. Assert: «Anna Bianchi» compare nell'elenco contatti.
3. Premi **`Campi`**: dialog «Campo». Compila e premi **`Aggiungi`**. Assert: «Veterinario: Dr. Verdi».
4. Premi **`Aggiungi nota`** e scrivi «Nota QA T023».
5. Premi **`Salva`**. Assert: redirect a `/animali/<id>`, la scheda mostra contatto, campo e nota; persistono dopo reload.

### TC-02: Modal coverage
1. Apri «Contatto»: Assert: focus sul primo input; **`Chiudi`** chiude senza aggiungere nulla.
2. «Contatto» con campi vuoti → **Aggiungi**: non viene aggiunta una riga vuota.
3. «Campo» con Etichetta vuota → **Aggiungi**: non viene aggiunto il campo.
4. **`Foto del cane`**: si apre il selettore/dialog «Foto profilo»; **Chiudi** non cambia nulla.

## Assertions
- [ ] Dialog apribili e chiudibili senza effetti.
- [ ] Dati dei dialog salvati con la scheda.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Dialog Contatto, dialog Campo, scheda salvata

## Acceptance criteria
Nessun criterio C1 verificabile in questo task (regressione sui dialog).

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
