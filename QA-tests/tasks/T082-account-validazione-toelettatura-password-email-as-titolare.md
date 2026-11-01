# T082-account-validazione-toelettatura-password-email-as-titolare: Form validation - toelettatura, password, email

| Field | Value |
|---|---|
| Route | `/impostazioni/account` |
| Source | `src/pages/AccountPage.tsx` |
| Flow | Validazione IVA/CF; cambio password/email con reautenticazione |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 26 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Il runner risolve la password dell'account dalla mappa credenziali locale (mai scritta nel task); in emulatore le operazioni auth possono fallire per limiti dell'emulatore
- Nessun valore invalido viene confermato

## Test data
- Toelettatura: `badIva = "123"`, `badCf = "abc"`, `validIva = "12345678901"`, `validCf = "RSSMRA80A01H501U"`, `emptyIvaCf = ""`
- Password: `current = (password account del ruolo titolare)`, `shortNew = "abc"`, `validNew = "NuovaPass123!"`, `wrongCurrent = "SbagliataQA1!"`
- Email: `badEmail = "senza-chiocciola"`, `validEmail = "nuova+{runId}@example.test"`

## Steps

### TC-01: Happy path - IVA e CF validi
1. Sign in as titolare. Navigate to `/impostazioni/account?scheda=personali`.
2. Click **Modifica dati toelettatura**. Fill Partita IVA = `12345678901`, Codice fiscale = `RSSMRA80A01H501U`.
3. Click **Salva**. Assert: dialog chiuso; IVA e CF mostrati nelle righe; nessun errore.
4. Ripristinare i valori originali.

### TC-02: Form validation - `toelettatura`
| Field | Value | Expected error |
|---|---|---|
| Partita IVA | `123` | "11 cifre, senza IT" |
| Partita IVA | `IT12345678901` | prefisso IT rimosso e accettato, oppure "11 cifre, senza IT" |
| Codice fiscale | `abc` | "16 lettere o numeri" |
| Codice fiscale | `rssmra80a01h501u` | convertito in maiuscolo e accettato |
| IVA e CF | entrambi vuoti | accettato (IVA e CF vuoti ammessi) |

Per ogni riga con errore: click **Salva**, assert il messaggio, il dialog resta aperto, nulla è salvato.

### TC-03: Modal coverage - `password`
1. Click **Sicurezza** (`?scheda=sicurezza`). Click **Password**. Assert: dialog "Password" con Password attuale e Nuova password.
2. Fill Password attuale = (password titolare), Nuova password = `abc`. Click **Salva**. Assert: toast "Minimo 8 caratteri".
3. Fill Password attuale = `SbagliataQA1!`, Nuova password = `NuovaPass123!`. Click **Salva**. Assert: toast d'errore di password attuale errata; la password non cambia.
4. Chiudere il dialog con Annulla/Chiudi. Assert: nessuna modifica.
5. NON salvare una nuova password valida (evitare di cambiare la credenziale del runner).

### TC-04: Modal coverage - `email`
1. Click **Cambia email**. Assert: dialog "Cambia email" con Nuova email e Password attuale.
2. Fill Nuova email = `senza-chiocciola`, click **Salva**. Assert: toast "Inserisci un’email valida".
3. Fill Nuova email = `nuova+{runId}@example.test` e Password attuale = `SbagliataQA1!`. Click **Salva**. Assert: toast d'errore di reautenticazione; l'email dell'account non cambia.
4. Chiudere il dialog.

### TC-05: Negative & edge cases
- Click **Verifica email** (se email non verificata). Assert: toast di conferma invio; se già "Verificata" il pulsante non è presente.
- Password attuale vuota con Nuova password valida. Assert: errore, nessun cambio.

## Assertions
- [ ] "11 cifre, senza IT" e "16 lettere o numeri" esatti.
- [ ] Toast "Minimo 8 caratteri" e "Inserisci un’email valida" esatti.
- [ ] Nessuna credenziale reale viene cambiata.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected (reautenticazione fallita).

## Screenshots required
- Page initial load
- Ogni errore di validazione
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
