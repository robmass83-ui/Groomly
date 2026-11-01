# T081-account-titolare-toelettatura-orari-as-titolare: Gestisci account - titolare, toelettatura, orari

| Field | Value |
|---|---|
| Route | `/impostazioni/account` |
| Source | `src/pages/AccountPage.tsx` |
| Flow | Cambiare titolare; modificare dati toelettatura; cambiare orari |
| Requires auth | yes |
| Required role | titolare |
| Destructive | no |
| Estimated steps | 28 |

## Preconditions
- App running at `http://127.0.0.1:5173`
- Signed in as titolare
- Seed: salone con dati toelettatura compilati; il runner annota i valori originali e li ripristina al termine

## Test data
- `titolare = "Valentina Piras"`
- `ragioneSociale = "Pet Spa QA"`, `salonName = "Pet Spa QA"`, `vatNumber = "12345678901"`, `taxCode = "RSSMRA80A01H501U"`, `phone = "079 109053"`, `address = "Via Roma 36, Napoli"`
- orari: Lunedì `Dalle = 09:00`, `Alle = 13:00`

## Steps

### TC-01: Happy path - cambiare titolare e dati toelettatura
1. Sign in as titolare. Navigate to `/impostazioni/account`.
2. Assert: header "Gestisci account Groomly", nome salone, email, logo/iniziale e tre riquadri/schede (Info personali, Sicurezza, Privacy e dati).
3. Click **Info personali**. Assert: URL contiene `?scheda=personali`.
4. Annotare i valori attuali di titolare e toelettatura.
5. Click **Nome del titolare**. Assert: dialog "Titolare" con campo Titolare.
6. Fill Titolare = `Valentina Piras`. Click **Salva**.
7. Assert: dialog chiuso; la riga mostra "Valentina Piras".
8. Click **Modifica dati toelettatura**. Assert: dialog "Toelettatura" con hint "Basta la partita IVA oppure il codice fiscale.".
9. Fill Ragione sociale = `Pet Spa QA`, Nome toelettatura = `Pet Spa QA`, Partita IVA = `12345678901`, Codice fiscale = `RSSMRA80A01H501U`, Telefono = `079 109053`, Indirizzo = `Via Roma 36, Napoli`.
10. Click **Salva**.
11. Assert: dialog chiuso; le 6 righe mostrano i nuovi valori.
12. Reload. Assert: i valori persistono. Ripristinare i valori originali (stesso flusso) e verificare.

### TC-02: Modal coverage - `orari`
1. Click **Orari di apertura**. Assert: dialog "Orari di apertura" con Dalle/Alle e Aperto/Chiuso per giorno e **Copia su tutti**.
2. Impostare Lunedì Aperto, Dalle = `09:00`, Alle = `13:00`. Assert: nessun pulsante Salva; la modifica è salvata subito (autosave).
3. Click **Copia su tutti**. Assert: tutti i giorni aperti mostrano `09:00`-`13:00`.
4. Chiudere il dialog, reload, riaprire. Assert: gli orari persistono. Ripristinare gli orari originali.

### TC-03: Arrivo diretto con ?modifica=toelettatura
1. Navigate to `/impostazioni/account?scheda=personali&modifica=toelettatura`.
2. Assert: il dialog "Toelettatura" si apre direttamente.
3. Chiudere il dialog. Assert: nessun dato modificato.

### TC-04: Navigazione
- Click **Indietro** dentro una scheda. Assert: torna alla home account; click **Indietro** dalla home account. Assert: URL is `/impostazioni`.
- Verificare link **Legale** (`/impostazioni/legale`) e **Info su Groomly** (`/impostazioni/info`).

### TC-05: Negative & edge cases
- Svuotare Titolare e **Salva**. Assert: nessun crash; il valore vuoto è accettato o mostra errore coerente; ripristinare.
- Aprire il dialog Toelettatura, modificare un campo e chiudere senza **Salva**. Assert: la modifica non persiste.

## Assertions
- [ ] I valori salvati persistono dopo reload.
- [ ] Gli orari si salvano all'istante.
- [ ] Il dialog Toelettatura si apre con `?modifica=toelettatura`.
- [ ] No console errors in DevTools at any step.
- [ ] No failed network requests (no 4xx/5xx) except where explicitly expected.

## Screenshots required
- Page initial load
- Ogni dialog aperto
- Final state after the happy path

## Pass criteria
All TCs above pass AND no unexpected console/network errors.
