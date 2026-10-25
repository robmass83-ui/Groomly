# Groomly — cosa resta da fare (documento unico)

Scritto il 25/10/2026 sera da Claude, dopo aver riletto: tutti i piani in `docs/superpowers/plans/`, le specifiche in `docs/superpowers/specs/`, `docs/PROGRESSO-PIANO.md`, `docs/DA-FARE-ROBERTO.md`, `docs/DECISIONI-AUTOMATICHE.md`, i rapporti del test 360, `docs/Groomly_Abbonamenti_PIANO.md`, `docs/Groomly_Controlli_Avanzati_PIANO.md`, `docs/Groomly_Backup_PIANO.md`, `docs/legal/PRIMA-DEI-PAGAMENTI.md`, i rami non uniti e lo stato online.

Questo documento **sostituisce** `docs/prompt-cursor-prossimi-passi.md` (le sue fasi A sono chiuse, B e C sono qui sotto).

---

## 0. Istruzioni per Cursor

1. Fai **un solo `/brainstorm`** su tutto il documento, scegliendo da solo le opzioni consigliate (annotale in `docs/DECISIONI-AUTOMATICHE.md`). Poi **un solo piano** in `docs/superpowers/plans/2026-10-26-chiusura-prima-di-play.md` che copra le sezioni 2 e 3, nell'ordine della sezione 5. Poi esegui il piano fino in fondo.
2. Prima di scrivere il piano **verifica sul codice** ogni voce: se una cosa risulta già fatta, scrivilo con la prova (file, test o commit) e non rifarla.
3. Test prima di ogni modifica, un commit per task, registro `docs/PROGRESSO-PIANO.md` aggiornato dopo ogni task, `npm test` e `npm run build` verdi. Se il contesto si riempie: aggiorna il registro, commit, continua.
4. Regole che valgono sempre:
   - **R1**: con i flag spenti, l'app di chi la usa oggi non cambia (a parte la lingua, che per un telefono italiano resta italiano).
   - `mostraPiani` e `abbonamentiAttivi` restano **spenti**.
   - **Mai** leggere o scrivere i dati reali del salone di Laura, `salon/shared` o Troddioni. Prove solo su `demo-groomly`.
   - Deploy di regole solo dopo la prova sull'emulatore con i salvataggi della versione installata (oggi 1.1.94); annota ruleset nuovo e vecchio.
   - APK GitHub con la **firma debug di oggi** (Laura aggiorna senza reinstallare). La chiave nuova solo per l'AAB `play`.
   - **Nessuna release GitHub pubblicata da te**: prepari tutto e ti fermi.
5. Hai finito solo quando ogni voce delle sezioni 2 e 3 è «fatto» o «bloccato da Roberto» con il motivo.

---

## 1. Stato di oggi (già fatto, non rifare)

- App installata: **1.1.94** (tag `v1.1.94`, commit `75490b2`), firma debug. `main` è avanti (fino a `4808f13`) con correzioni e metà lingue.
- Online: Functions su Node 22 (cleanup artifact 1 giorno), regole e indici nuovi (ruleset `b349498c…`, ritorno `312ca6bd…` poi `89cb4014…`), hosting con privacy / termini 1.1 / DPA / elimina account senza indirizzo di casa, APK su `groomlyapp.it/groomly.apk` con GitHub come riserva.
- Laura: omaggio Salone senza scadenza sul suo `pro/main`.
- Varianti `github` e `play`; AAB `play` firmato con la chiave nuova (keystore fuori dal repo); target/compile SDK 36.
- App Check pronto e spento. Template Brevo 5 attivo, 6–12 esistono. `info@groomlyapp.it` attiva.
- Scheda Google Play in bozza: manca solo la sezione screenshot (la carica Claude).
- Piani vecchi (18–24 ottobre: interfaccia comoda, impostazioni chiare, notifiche push, personale e chiusure, backup completo/raccoglitore/zip, cancellazione e note, registro Excel, ripristino zip/foto/sicurezza, Drive, note appuntamento, allineamento Laura, pro-collaboratori) e piano `2026-10-25-groomly-piani-completo` (37/37): **fatti nel codice**, ma le caselle `- [ ]` nei file non sono mai state spuntate (vedi 2.6).

---

## 2. Lavori di codice (Cursor)

### 2.1 Lingue — finire il piano `docs/superpowers/plans/2026-10-25-lingue.md`
Fatti (registro, sezione «B. Lingue»): cataloghi it/en/es, `format.ts`, ripiego errori, lingua dei clienti, servizi predefiniti tradotti, selettore in Impostazioni, HTML delle 10 email, stringhe Android.
Da fare:
- **Tutte le schermate** dal vocabolario, compresi popup, toast, schede vuote, PDF/Excel e nomi dei file esportati. Test che fallisce se in `src/pages` o `src/components` resta una frase italiana fissa visibile all'utente.
- **Pagine pubbliche e legali** con `?lang=` e la riga Italiano · English · Español: privacy, termini, DPA, elimina account, `/azione`, pagina del salone e i 5 passi di prenotazione, `/c` (scheda cane per il cliente in lingua dei clienti). Le traduzioni partono dal testo italiano attuale e dichiarano che fa fede l'italiano.
- **Listino** stampato/condiviso in lingua dei clienti; **report** Incassi in lingua della persona.
- **Notifiche push** del server: `sendPush` legge la lingua dell'account.
- **Email spedite dal codice** con l'HTML già pronto, in tutte le funzioni (verifica, reset, inviti, prenotazioni, promemoria). Solo quando lo fanno tutte: aggiungi in `DA-FARE-ROBERTO` «spegnere template Brevo 3–12» (non spegnerli tu; il 5 resta acceso finché l'invito non parte dal codice in produzione).
- **Testi della scheda Google Play** in italiano, inglese e spagnolo (titolo, descrizione breve ≤ 80 caratteri, descrizione lunga ≤ 4000) in `docs/play/scheda-{it,en,es}.md`, coerenti con le funzioni reali (niente funzioni Pro come se fossero attive). Li carica Claude.

### 2.2 Difetti aperti
- **Collaboratore: «Salvataggio non riuscito» sulla scheda del cane** (test 360 di stasera). Trova la scrittura negata e falla non partire per chi non ha il permesso. Test prima.
- **F8 — Home lenta al primo avvio**: 4,0 s (chiaro), 6,2 s (scuro), socio 4,9 s. Obiettivo **< 3 s** dal login al primo dato sul salone del test, chiaro e scuro. Misura cosa aspetta (splash, account, pro, cani) e togli le attese inutili. Rimisura e scrivi i numeri.
- **Scuro più lento del chiaro** (6,2 vs 4,0 s): capisci perché.
- **M6 — Agenda settimana**: proposta del test 360 di mostrare per giorno il conteggio «N cani · tempo» invece della sola griglia oraria. Decidi con il brainstorm (scelta consigliata), senza cambiare la vista giorno.
- **M3**: con `mostraPiani` acceso, «Funzioni Pro» del titolare base deve avere un'azione (prova / Avvisami). Verifica che sia già chiuso dal task 9; se no, chiudilo.
- **Kit test 360**: selettori aggiornati ma riesegui tutti i giri e correggi quelli che falliscono.

### 2.3 Rami e cartelle rimaste
- **`scheda-nido`** (`f6b2e16`, «release 1.1.88, la scheda del cane è un nido compatto»): **non è in `main`** e `DogPage.tsx` non contiene «nido». Confronta con la scheda attuale e scrivi nel registro se quel layout è stato superato da proposito o perso. Se è perso, **non** unirlo da solo: descrivi la differenza a Roberto (bloccato da Roberto).
- **`feat/firma-privacy`** (`1511599`): superato dal lavoro di firma e hosting di oggi? Verificalo e, se sì, segnalo come superato.
- Pulizia worktree: `git config core.longpaths true`, poi `git worktree prune` e rimozione delle cartelle dei worktree già contenuti in `main`. Non cancellare rami con lavoro non presente in `main`.

### 2.4 Pronta per Google Play (senza cambiare il modo di aggiornare oggi)
- AAB `play` ricostruito **dopo** le lingue, firmato con la chiave nuova, non caricato.
- La variante `play` non deve mostrare né «Aggiornamenti» né «Storico versioni» che rimandano a GitHub o all'APK; i link a privacy/termini/elimina account puntano a `groomlyapp.it` con `?lang=`.
- Controlla che la sicurezza dei dati dichiarata su Play (nome, email, ID utente, indirizzo, telefono, foto, file, ID dispositivo; niente condiviso; tutto cifrato) corrisponda al codice. Se il codice raccoglie altro (es. metriche col consenso), scrivilo in `DA-FARE-ROBERTO` perché Claude aggiorni la scheda.
- App Check resta spento.

### 2.5 Test finale e versione
- **Test 360 finale** sull'emulatore nelle **tre lingue** (telefono italiano, inglese, spagnolo): titolare chiaro/scuro, socio, collaboratore, collaboratore con piano spento, salone tipo Laura con omaggio, offline, una prenotazione dalla pagina pubblica, un'email per tipo (HTML generato). Rapporto: `docs/Groomly_Test360_RAPPORTO_LINGUE.md`.
- Deploy **functions e hosting** con controllo online; regole solo se cambiate.
- **1.1.95 pronta e non pubblicata**: variante `github`, firma debug, `APP_VERSION` e `versionCode`, APK su `groomlyapp.it/groomly.apk`, `release.json` aggiornato **solo quando Roberto pubblica** (prepara il file ma non caricarlo prima), AAB `play`. Fermati e dai a Roberto i passi per provarla su un telefono.

### 2.6 Ordine nei documenti
- Spunta le caselle dei piani vecchi che risultano fatti (con commit o test come prova) oppure aggiungi in cima a ogni piano «Eseguito — vedi commit …». Elenca nel registro ciò che risultasse **non** fatto.
- `docs/DA-FARE-ROBERTO.md` allineato a questo documento (sezione 3). Sposta in `docs/archive/` i prompt già usati (`prompt-cursor-*.md`) e le proposte di design già realizzate (`proposte-*.html`, `bozze/`), lasciando questo file come riferimento unico.

---

## 3. Cose di Roberto (non sono codice)

| # | Cosa | Quando |
|---|---|---|
| 1 | Copia di `%USERPROFILE%\.groomly\upload.jks` e `keystore.properties` in password manager + chiavetta | **subito** |
| 2 | Screenshot del Salone Demo (agenda, scheda cane con foto, lista, listino) in `D:\Groomly\Icon and logo\play-store\screenshot\` → li carica Claude | quando puoi |
| 3 | Provare la 1.1.95 su un telefono, poi pubblicarla (Claude ti guida) | quando Cursor dice «pronta» |
| 4 | Repository GitHub **privato**, dopo aver visto che l'aggiornamento 1.1.95 arriva dal sito | dopo il punto 3 |
| 5 | App Check in console (passi in `DA-FARE-ROBERTO`) | prima del test chiuso Play |
| 6 | Test chiuso Play: 12–15 tester per 14 giorni con l'AAB `play`; scheda in inglese e spagnolo | quando decidi di andare su Play |
| 7 | Spegnere template Brevo 3–12 | quando Cursor lo segnala |
| 8 | Pagamenti: partita IVA, profilo pagamenti, prodotti, RevenueCat, prove di acquisto, offerta fondatori (lista in `docs/legal/PRIMA-DEI-PAGAMENTI.md`) | solo quando accendi gli abbonamenti |
| 9 | Custom claim admin (`scripts/imposta-admin.ts`) | facoltativo |

---

## 4. Rimandato di proposito (non fare ora)

- WhatsApp automatico e crediti (Controlli avanzati S6 / piano abbonamenti §8): il canale automatico resta l'email.
- Play Billing con verifica server propria / RTDN: sostituito da RevenueCat, da attivare con i pagamenti.
- Foto spostate da Firestore a Firebase Storage (nota «futuro» del piano backup): progetto separato.
- Accensione di `mostraPiani` e `abbonamentiAttivi`.
- Parere legale per il lancio fuori dall'Italia.

---

## 5. Ordine consigliato

1. 2.2 difetti (collaboratore, home lenta) — piccoli e utili anche senza lingue.
2. 2.1 lingue fino in fondo.
3. 2.3 rami e worktree, 2.6 ordine nei documenti.
4. 2.4 prontezza Play.
5. 2.5 test 360 in tre lingue, deploy, 1.1.95 pronta → **fermati**.
