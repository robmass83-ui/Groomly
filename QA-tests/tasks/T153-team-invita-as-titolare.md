# T153-team-invita-as-titolare: Team - invitare un collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/team` |
| Source | `src/pages/ProPage.tsx` |
| Flow | Vedere elenco membri e posti usati; invitare un socio o collaboratore |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 20 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare con piano Salone e `pro/main.enabled = true` (seed dedicato), con almeno un posto libero
- In emulatore la callable `createInvite` può rispondere INTERNAL: in quel caso l'esito atteso è il toast d'errore e va registrato come limite dell'emulatore

## Test data
- `email = "nuovo.collab+{runId}@example.test"`, `role = "Collaboratore"`
- `emailSocio = "nuovo.socio+{runId}@example.test"`, `roleSocio = "Socio"`

## Steps

### TC-01: Happy path - invitare un collaboratore
1. Sign in as titolare. Navigate to `/impostazioni/team`.
2. Assert: titolo "Team", elenco membri con colonne Nome, Ruolo, Email e il contatore "n di m posti".
3. Click **Invita una persona**. Assert: dialog "Invita" con il testo "Il socio ha il pieno controllo del salone. Il collaboratore gestisce cani e appuntamenti e vede solo i propri incassi."
4. Fill Email = `nuovo.collab+{runId}@example.test`; selezionare **Collaboratore** (aria-pressed true).
5. Click **Invia**.
6. Assert: dialog chiuso e toast "Invito spedito a nuovo.collab+{runId}@example.test" (o toast d'errore dell'emulatore se la callable dà INTERNAL).
7. Se l'invito è riuscito: assert che il contatore dei posti riflette l'invito e che il nuovo invito/membro è nell'elenco.

### TC-02: Invitare un socio
1. Click **Invita una persona**. Fill Email = `nuovo.socio+{runId}@example.test`, selezionare **Socio**. Click **Invia**.
2. Assert: toast "Invito spedito a nuovo.socio+{runId}@example.test" (o errore emulatore), dialog chiuso.

### TC-03: Modal coverage - `invita`
1. Click **Invita una persona**, poi chiudere il dialog senza inviare. Assert: nessun invito creato, elenco invariato.
2. Riaprire. Assert: i pulsanti **Socio** e **Collaboratore** alternano aria-pressed.

### TC-04: Negative & edge cases
- Verifica persistenza: reload e assert che l'elenco membri è coerente con l'esito.
- Doppio click su **Invia**. Assert: viene creato al massimo un invito.

## Assertions
- [ ] Il dialog Invita mostra il testo descrittivo dei ruoli.
- [ ] Toast "Invito spedito a <email>" all'invio riuscito.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected (callable emulatore).

## Screenshots required
- Page initial load
- Dialog Invita aperto
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
