# T085-account-as-collaboratore: Gestisci account come collaboratore

| Field | Value |
|---|---|
| Route | `/impostazioni/account` |
| Source | `src/pages/AccountPage.tsx` |
| Flow | Collaboratore: sezione toelettatura nascosta, toggle disabilitati, nessun cambio logo |
| Requires auth | yes |
| Required role | collaboratore |
| Destructive | no |
| Estimated steps | 16 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as collaboratore

## Test data
- `titolare = "Collab QA {runId}"` (nome mostrato nella riga Nome, se modificabile)
- `shortNew = "abc"`

## Steps

### TC-01: Happy path - il collaboratore vede il proprio account
1. Sign in as collaboratore. Navigate to `/impostazioni/account`.
2. Assert: titolo "Gestisci account Groomly", email e riquadri Info personali, Sicurezza, Privacy e dati.
3. Click **Info personali**. Assert: nome del membro visibile; NON è presente **Modifica dati toelettatura**.
4. Assert: NON è presente **Cambia logo**.
5. Se **Nome del titolare** è presente e modificabile, fill il nome = `Collab QA {runId}`, click **Salva**; assert nome aggiornato dopo reload; ripristinare.

### TC-02: Sicurezza
1. Click **Sicurezza**. Click **Password**, fill Nuova password = `abc`, click **Salva**. Assert: toast "Minimo 8 caratteri".
2. Chiudere il dialog.

### TC-03: Privacy
1. Click **Privacy e dati**. Assert: il toggle "Email promozionali" è disabilitato; **Scarica i miei dati** è disponibile; la riga "Statistiche d’uso e crash" non compare: è solo del titolare, sul telefono.
2. Click un toggle. Assert: lo stato non cambia.

### TC-04: Negative & edge cases
- Navigate to `/impostazioni/account?scheda=personali&modifica=toelettatura`. Assert: il dialog "Toelettatura" NON si apre.
- Navigate to `/impostazioni/account/elimina`. Assert: comportamento coerente con T088 (nessun crash).

## Assertions
- [ ] Sezione toelettatura e cambio logo assenti.
- [ ] Toggle privacy disabilitati.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Scheda Info personali
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
