# Groomly — Verifica del lavoro di Cursor (25/10/2026, mattina)

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

> Provato: `main` locale al commit **`f60df42`** (non ancora caricato su GitHub: `origin/main` è fermo a `8ea3fc4`, 1.1.80).
> Dove: emulatori Firebase `demo-groomly`, 20 saloni finti (1.118 cani, circa 15.000 appuntamenti) + copia finta del salone di Laura, app vera nel browser. Firebase vero mai toccato. Emulatori spenti e svuotati alla fine.

## 1. A che punto è il piano

Il piano unico (`docs/superpowers/plans/2026-10-25-groomly-piani-completo.md`) ha **circa 30 task**. Cursor ha fatto:

| Task | Stato |
|---|---|
| 0 Nota per Roberto | ✅ `docs/DA-FARE-ROBERTO.md` |
| 1 Un solo ramo (pro-collaboratori + scheda nido in `main`) | ✅ (manca il **push** di `main` su GitHub) |
| 2 Regole F1, F3, F4, M12 | ✅ verificato |
| 3 Kit 360° nel progetto + emulatori nell'app | ❌ non fatto (l'app non si collega agli emulatori con il flag) |
| 4 Offline F2 | ✅ verificato |
| 5 Usabilità | 🟡 quasi: F5 **non funziona davvero** (vedi sotto); M11 e M13 aperti |
| 6 Test senza rete e più veloci | ❌ non fatto (43 chiamate a internet, 7 min 49 s) |
| 7 Test 360° iniziale | ❌ non fatto |
| 8 `piano.ts` | ✅ (solo logica e test, nessuna schermata) |
| 9–28+ paywall, prova, Team, export, copie cloud, Invia tutti, email, orari, statistiche, recensioni, fedeltà, account/privacy, pagina salone, prenotazioni online, lista d'attesa, scheda cliente, controlli avanzati, test 360° finale, rapporto finale | ❌ **non iniziati** |

**In sintesi: è fatta la Fase 0 (quasi tutta) più il modulo dei piani. Mancano circa 20 task.**

## 2. Risultati della verifica

### Regole Firestore sull'emulatore: 28/28 ✅
- F1 ✅ nessuno legge più `users/{uid}` di un altro (i vecchi dati di Laura sono protetti)
- F3 ✅ il titolare non scrive raccolte inventate (`crediti`)
- F4 ✅ il collaboratore non cambia importo né persona di una visita completata
- Isolamento tra saloni, `pro`, `members`, account, `accessWithoutPro` di Roberto, operatore: tutto ✅

### App nel browser

| # | Correzione | Esito |
|---|---|---|
| F2 | Cane creato offline → online → salvato su Firebase | ✅ |
| F5 | Collaboratore con piano spento | ❌ **resta per sempre su "Carico l'agenda…"** con un errore `permission-denied` in console. La schermata "accesso sospeso" non compare mai, perché il collaboratore con piano spento **non può leggere** `pro/main` (regola `canUse`) e quindi l'app non sa che è sospeso. Con i mock dei test unitari funziona, con le regole vere no. |
| F8 | "Carico l'agenda…" invece di "Nessun appuntamento / € 0" | ✅ (restano visibili "0 · 0m" e "0/0 Mensili" mentre carica: meglio nasconderli o mettere "…") |
| M1 | Prezzo diverso → "Scrivi perché il prezzo è diverso" | ✅ |
| M2 | Il collaboratore non vede "Aggiungi partita IVA" | ✅ |
| M4 | Inviti: "Inserisci un'email valida", "Invio non riuscito. Riprova." (senza [500]), "Questa email non si può invitare" per le email riservate, "Questa email è già nel salone" per un membro | ✅ |
| M8 | Registrazione: il nome finisce in `salonName` | ✅ |
| M9 | Il socio non vede "Revoca" su sé stesso | ✅ |
| M11 | Pulsante + sopra le liste | 🟡 accettabile |
| — | Giro di tutte le pagine (titolare, collaboratore, operatore) | ✅ nessuna regressione |

### Test automatici: **non sono tutti verdi** ❌
`npm test` su `f60df42`: **1.515 verdi, 9 rossi**, 7 min 49 s, 43 tentativi di andare su internet.
- **5 rossi dipendono dall'ora del giorno**: dopo il fix M7 ("dopo le 9 il nuovo appuntamento parte dal prossimo orario libero") i test di `AppointmentPage.test.tsx` e `appointments.test.tsx` passano solo se lanciati prima delle 9. Vanno resi indipendenti dall'orologio (`vi.setSystemTime`).
- `firebaseConfig.test.ts`: cerca nel testo delle regole la riga vecchia `kind != 'files'`, che con l'elenco chiuso non esiste più.
- `SettingsPage.test.tsx`: "Il Cane Felice" compare due volte (`salonName` e `name` uguali dopo il fix M8).
- `client.test.ts`: "una lettura fallita del segno non svuota il filtro".
- `appointments.test.tsx`: "Chi lo fa…".

## 3. Da fare subito (prima di continuare il piano)
1. **F5 vero**: la sospensione si deve poter leggere anche senza accesso al salone. Per esempio un campo `accessoSospeso` sull'account scritto dal server quando il piano si spegne, oppure la regola che permette a un membro di leggere sempre `salons/{id}/pro/main`. Test sull'emulatore con le regole vere.
2. **I 9 test rossi** (orologio fisso nei test, testo regole aggiornato, duplicato del nome).
3. **Push** di `main` su GitHub (oggi GitHub ha ancora la 1.1.80 su `main`).
4. **Task 3 e 6** (kit 360° ed emulatori nell'app; test senza rete), che servono per il test finale.
5. Poi riprendere **dal task 7** fino alla fine.
