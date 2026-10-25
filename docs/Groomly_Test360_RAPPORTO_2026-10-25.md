# Groomly — Rapporto del test 360° (25 ottobre 2026)

> Versione provata: **1.1.92 → 1.1.93** (ramo `pro-collaboratori`, commit `b6087dd` e poi `f8630c3`).
> Dove: **emulatori Firebase** (Auth, Firestore, Functions) su progetto finto `demo-groomly`, app vera aperta in Chromium (telefono 390×844, ora di Roma, italiano), clic veri con Playwright, più di 300 schermate.
> **Il Firebase vero non è stato toccato.** Il salone di Laura e quello di Troddioni non sono stati letti né scritti. Alla fine gli emulatori sono stati spenti e tutti i dati di prova sono spariti, perché erano solo in memoria.

---

## 1. Cosa è stato creato per il test

| Cosa | Quantità |
|---|---|
| Saloni | 20 + 1 copia finta della struttura di Laura ("iPelosetti (FINTO)", con Roberto finto socio con `accessWithoutPro`) |
| Cani | 1.118 (da 50 a 60 per salone, un salone con 130, uno vuoto) |
| Appuntamenti | 14.934: 6 mesi di storico, mese in corso e mese prossimo, da 4 a 8 al giorno, con completati, non venuti, disdetti, "da chiudere", personali e sovrapposizioni volute |
| Chiusure | 1 per salone |
| Saloni Pro | 5 (13–17), con 1–3 tra soci e collaboratori, appuntamenti assegnati alle persone |
| Casi limite | salone vuoto (18), nomi lunghissimi con emoji e note di 600 caratteri (19), salone grande (20), email non confermata (11), cani senza telefono, gatti, deceduti e archiviati |
| Account | 30 (titolari, soci, collaboratori, operatore) + 1 registrazione nuova fatta dall'app |

## 2. Cosa è stato provato

- **Test automatici esistenti**: 1.490 su 1.490 verdi, ma durano 11 minuti e alcuni chiamano internet (vedi F10).
- **Regole Firestore vere** (non solo il testo): 28 prove con utenti diversi. 25 come atteso, **3 falle**.
- **Tutte le pagine** per titolare Base, titolare Pro, collaboratore, socio, operatore, salone vuoto, salone strano, salone grande, tema scuro.
- **Azioni**: nuovo appuntamento (ricerca cane, servizi, giorno, ora, domanda "cane mensile"), Completato con prezzo diverso, Non venuto, Disdetto con "Chi disdice?" e Annulla, nuovo cane, chiusura in un giorno con visite, ricerca per telefono, export incassi, backup ZIP, registrazione nuova, conferma email, Funzioni Pro (invito, ruoli, revoca), Utenti (interruttore Pro), Pro spento con collaboratore dentro, lavoro offline e ritorno online, tempi di caricamento.

## 3. Cosa funziona bene ✅

- Home, Agenda (giorno/settimana/mese), Animali, Mensili, Listino (anche stampa A4/A3, PDF/JPEG), Incassi e Report, Servizi, Archivio, Notifiche, Aggiornamenti: si aprono tutte e i conti tornano.
- Completato / Non venuto / Disdetto + **Annulla** ripristinano davvero l'appuntamento.
- Chiusura su un giorno con visite: avvisa "In questi giorni ci sono già 5 visite. La chiusura non le toglie." ✔
- Ricerca per numero di telefono ✔. Nuovo cane ✔. Backup ZIP ✔.
- Collaboratore: non vede Servizi, Archivio, Pro né Backup; le pagine vietate lo rimandano a Impostazioni; vede solo i propri incassi ✔. Le regole gli impediscono di eliminare cani, segnarli deceduti, scrivere le impostazioni e cambiare la persona su una visita completata ✔.
- Regole: un salone non legge né scrive i dati di un altro; nessuno si accende Pro da solo, si aggiunge membri o sposta il proprio account ✔.
- Email non confermata → schermata "Conferma l'email" ✔. Registrazione nuova ✔.
- Tema scuro corretto. Nomi lunghissimi ed emoji non rompono le pagine.
- Riapertura con cache: dati in circa 2 secondi.

## 4. Falle trovate (in ordine di gravità)

### 🔴 Critiche — da correggere subito, prima del piano abbonamenti

| # | Falla | Prova | Correzione |
|---|---|---|---|
| **F1** | **Qualunque utente registrato può leggere `users/{uid}` di chiunque**, cioè i vecchi dati e i backup di Laura in produzione. Regola: `match /users/{uid}/{document=**} { allow read: if request.auth != null; }` | Il titolare del salone 1 legge `users/{uid di Laura}/backups/...` → **permesso** | `allow read: if request.auth != null && request.auth.uid == uid;` (operatore solo se serve). **Pubblicare subito le regole**, è una modifica di una riga. |
| **F2** | **Un cane creato offline si perde.** Si vede nella scheda, ma non arriva mai su Firebase e dopo una ricarica la scheda dice "Cane assente". Causa: `saveDog` → `saveWithMedia` legge prima il documento (`readDoc`) e `cloudDeletion()` dal server; offline queste letture falliscono e la scrittura non parte. In un negozio con poco segnale significa perdere dati. | Offline → nuovo cane → online per 40 s + ricarica → 0 documenti | Scrivere **prima** in Firestore (che ha la coda offline) e fare i controlli dopo, oppure leggere dalla cache (`getDocFromCache`) con fallback. Stessa verifica per appuntamenti, Completato, chiusure e foto. Test dedicato con l'emulatore. |
| **F3** | Il titolare può scrivere **qualunque raccolta nuova** nel suo salone (es. `salons/{id}/crediti/main`). Oggi è innocuo, ma con il piano abbonamenti potrebbe regalarsi crediti, piano o copie. | Scrittura di `crediti/main` → **permesso** | Regola generica solo per un **elenco chiuso** di raccolte (`dogs`, `appointments`, `services`, `closures`, `settings`, `meta`, `deletedDogs`, …). Tutto il resto negato. |
| **F4** | Il **collaboratore può cambiare l'importo** (e il pagamento) di una visita **già completata**, quindi gli incassi del salone. | Collaboratore 13 → `total: 1` su un completato → **permesso** | Sul completato il collaboratore non può cambiare `total`, `paymentMethod`, `actualDurationMin`, `status`, `assigneeUid` (oppure: niente update su completato). |

### 🟠 Alte

| # | Falla | Correzione |
|---|---|---|
| **F5** | **Collaboratore con Pro spento**: entra e vede un salone **vuoto** ("Nessun appuntamento, € 0, 0/0") senza spiegazioni. Sembra che i dati siano spariti. | Schermata chiara: "Il tuo accesso a {salone} è sospeso: il titolare ha spento il piano. I dati non sono persi." + Esci. |
| **F6** | **Rami di git frammentati**: `main` è fermo a 1.1.80 con modifiche **non salvate** (DogPage, NextAppointment, Notifiche, PhoneShell, schedaEnter). Il ramo `scheda-nido` (1.1.88, "la scheda del cane è un nido compatto") **non è dentro** la 1.1.93. L'app installata (1.1.93) arriva da `pro-collaboratori`. Rischio concreto di perdere lavoro o di ripubblicare cose vecchie. | Prima di tutto: un solo ramo principale. Unire `pro-collaboratori` in `main`, decidere se `scheda-nido` e le modifiche non salvate su `main` entrano (probabilmente sì), poi chiudere i rami e i worktree vecchi. |
| **F7** | **Repository GitHub pubblico**: codice, regole ed email degli operatori leggibili da chiunque. | Rendere privato `robmass83-ui/Groomly`. Le release APK vanno in un repo pubblico separato (solo release) o su Firebase Hosting (`release.json` c'è già). |
| **F8** | **Avvio lento e "vuoto finto"**: al primo avvio la Home mostra "Nessun appuntamento · € 0 · 0/0" per 4–7 s (in locale, su un telefono di più) mentre carica. L'app carica **tutto lo storico** di appuntamenti a ogni avvio a freddo (870 per salone in 6 mesi). Con gli anni aumentano tempi e letture. | Scheletro di caricamento ("Carico l'agenda…") invece del falso vuoto. Caricare solo una finestra (es. ultimi 13 mesi + futuro) e lo storico vecchio a richiesta. |
| **F9** | I test delle regole (`firestoreRules.test.ts`) **leggono il testo** del file, non provano le regole: F1, F3 e F4 sono passati inosservati. | Test delle regole sull'emulatore (kit `test360-kit/scripts/rules.ts`). |
| **F10** | La suite di test dura **11 minuti** e alcuni test chiamano internet (`groomly-3128b.web.app`). | Bloccare la rete nei test (mock di `fetch`), separare i test lenti. |

### 🟡 Medie (usabilità)

| # | Problema | Correzione |
|---|---|---|
| M1 | **Completare con prezzo diverso**: i pulsanti si spengono finché non si scrive una nota, ma **nessun messaggio lo dice**. | Sotto "Nota": "Scrivi perché il prezzo è diverso" in arancione quando serve. |
| M2 | Il **collaboratore** vede "Aggiungi partita IVA o codice fiscale", ma non può farlo. | Notice solo per titolare e socio. |
| M3 | Titolare **Base** in "Funzioni Pro": "Accendi il piano…" **senza pulsante** (vicolo cieco). | Si risolve con la paywall del piano (§6). |
| M4 | Inviti: errore tecnico "**Invio non riuscito [500]**"; email non valida → fumetto del browser in inglese; "Questa email è già nel salone" per email che non sono nel salone. | Messaggi in italiano senza codici; validazione propria; testo corretto per le email riservate. |
| M5 | Si può fissare un appuntamento **di domenica o a salone chiuso**; la griglia degli orari non mostra quelli già occupati. | Orari di apertura (H0 del piano) + segno sugli orari occupati. |
| M6 | **Agenda settimana** illeggibile con 6–8 cani al giorno (etichette minuscole). | Mostrare "6 cani" per giorno con un tocco per aprire, oppure l'elenco. |
| M7 | Nuovo appuntamento di sera: propone "Oggi 09:00" (già passato). | Proporre il primo orario utile futuro. |
| M8 | Registrazione: "Nome della toelettatura" finisce in `business.name` (ragione sociale) e `salonName` resta vuoto. | Salvarlo in `salonName`. |
| M9 | Il **socio vede "Revoca" su sé stesso**. | Nascondere. |
| M10 | Il riquadro "Novità" della nuova versione compare **sopra la schermata di accesso** e blocca i tocchi. | Mostrarlo solo dopo l'accesso. |
| M11 | Il pulsante **+** copre le ultime righe (pulsanti di "Da chiudere", Archivio animali). | Spazio in fondo alle liste pari all'altezza di + e barra. |
| M12 | La regola `isOperator()` non chiede l'email confermata. | Aggiungere `request.auth.token.email_verified == true`, oppure passare al custom claim `admin` (piano B-3). |
| M13 | Se un membro elimina il proprio account, il suo `members/{uid}` resta "attivo" e **occupa un posto per sempre**. | Funzione che, all'eliminazione dell'account, segna il membro `revocato`. |

## 5. Tempi misurati (emulatore locale, quindi più veloce del telefono)

| Salone | Accesso → Home | Dati in Home (primo avvio) | Riapertura (cache) |
|---|---|---|---|
| 60 cani, 874 appuntamenti | 3,9 s | 7,0 s | 2,0 s |
| 130 cani, 712 appuntamenti | 3,5 s | 6,1–9,8 s | 2,1 s |

## 6. Cosa non si è potuto provare qui

- Push e promemoria ogni 5 minuti (`sendPush` richiede Pub/Sub), invio email Brevo (finto), Google Drive e fotocamera (servono il telefono).
- Il percorso reale di aggiornamento APK.

Si provano sul telefono, con la checklist del piano (§19.6).

## 7. Il kit per ripetere il test

In `docs/test360-kit/` (da portare in `scripts/test360/` e `tests/e2e/`):
- `firebase.emu.json`, `.env.emu`: emulatori e app collegata agli emulatori (`npx vite --mode emu`)
- `client-emulatori.patch`: collega l'app agli emulatori **solo** con `VITE_EMULATORS=1` (nel codice vero va resa compatibile con i mock dei test: oggi rompe 73 test di `client.test.ts`)
- `scripts/seed.ts` (20 saloni), `scripts/rules.ts` (28 prove sulle regole), `scripts/setpro.ts`
- `playwright/*.cjs`: giro di tutte le pagine, azioni del titolare, ruoli, invito, registrazione, offline, Pro, tempi
