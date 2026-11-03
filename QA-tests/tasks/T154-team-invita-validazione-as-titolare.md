# T154-team-invita-validazione-as-titolare: Form validation - invita

| Field | Value |
|---|---|
| Route | `/impostazioni/team` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Validazione del dialog Invita |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 18 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare con piano Salone attivo (`pro/main.enabled = true`)
- Seed per TC-03: un membro con email nota `membro@example.test` già nel salone
- Seed per TC-04: salone con posti esauriti (3 membri, oppure posti = membri)

## Test data
- `emptyEmail = ""`, `badEmail = "non-una-email"`
- `existingEmail = "membro@example.test"` (già nel salone)
- `validEmail = "nuovo.collab+{runId}@example.test"`

## Steps

### TC-01: Happy path - email valida accettata
1. Sign in as titolare. Navigate to `/impostazioni/team`. Click **Invita una persona**.
2. Fill Email = `nuovo.collab+{runId}@example.test`, ruolo **Collaboratore**. Click **Invia**.
3. Assert: nessun errore di validazione; toast "Invito spedito a nuovo.collab+{runId}@example.test" (o errore emulatore).

### TC-02: Form validation - `invita`
| Field | Value | Expected error |
|---|---|---|
| Email | `""` | "Inserisci un’email valida" |
| Email | `non-una-email` | "Inserisci un’email valida" |
| Email | `membro@example.test` (già nel salone) | "Questa email è già nel salone" |
| Email | email di un indirizzo condiviso non invitabile | "Questa email non si può invitare" |

Per ogni riga: click **Invia**, assert il messaggio nel dialog, il dialog resta aperto, nessun invito creato.

### TC-03: Posti esauriti
1. Con salone a posti esauriti, aprire il dialog (o assert il pulsante bloccato), fill Email valida, click **Invia**.
2. Assert: messaggio "Posti esauriti"; nessun invito creato.

### TC-04: Piano non attivo
1. Con `pro/main.enabled = false`, assert che **Invita una persona** non è disponibile; se invocato, "Pro non è attivo".

### TC-05: Negative & edge cases
- Email con spazi `  nuovo@example.test  `. Assert: spazi ignorati (invito a `nuovo@example.test`) oppure errore coerente.
- Email maiuscola `NUOVO@EXAMPLE.TEST`. Assert: trattata come valida e non duplicata.

## Assertions
- [ ] Messaggi "Inserisci un’email valida", "Questa email è già nel salone", "Questa email non si può invitare", "Posti esauriti" esatti.
- [ ] Il dialog resta aperto in caso di errore.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni stato di errore di validazione
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
