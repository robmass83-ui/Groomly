# Audit 360 — 26 ottobre 2026

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Rapporto di ciò che è stato aperto, cliccato e letto. La specifica sta in `docs/superpowers/specs/2026-10-26-audit-360-design.md`. Il piano di ripristino sta in `docs/superpowers/plans/2026-10-26-audit-360.md`. Questo file è l’inventario. I task 2, 3, 4 e 5 del piano non sono ancora stati scritti nel codice.

## Come è stato fatto il giro

Un solo test, `scripts/audit360.test.tsx`, lanciato con `vitest.audit.config.ts`. Non entra in `npm test`.

- Venti identificativi. Ognuno ha un cane (`CaneSalone0` … `CaneSalone19`), un appuntamento e il nome salone `Toelettatura N`. L’ingresso è il salone 7.
- Trenta indirizzi, in italiano, inglese e spagnolo: novanta aperture. Nessuna ha lanciato un’eccezione React.
- Poi, come farebbe una toelettatura: Strumenti (Prova Pro, dodici righe Pro, tre interruttori), Promemoria e messaggi dalle Impostazioni in inglese, Suggerimenti, foglio Backup.
- Lettura di `PaywallSheet`, `usePiano`, `PianoPagine`, `SystemBack`, `DriveAuthPlugin.java`, `SettingsPage` e `firestore.rules`.

Non è stato creato nessun account sul progetto vero `groomly-3128b`. L’emulatore Firestore non era acceso: le regole sono state lette e confrontate con i test già scritti in `src/lib/firestoreRules.emulator.test.ts`, senza rilanciarli. Il telefono di Laura non è stato usato in questo giro: il collegamento Drive silenzioso è dimostrato dal codice Android, non da un tap su un dispositivo.

Durante il giro il client Firebase ha provato a parlare con la rete e ha ricevuto `INVALID_ARGUMENT` (ambiente di test, non il salone vero). I cani letti in Animali sono quelli locali.

## Isolamento dei venti saloni

In Animali, entrando come salone 7, lo schermo contiene `CaneSalone7`. Non contiene gli altri diciannove cani e non contiene `Toelettatura 0` … `Toelettatura 6` né `Toelettatura 8` … `Toelettatura 19`.

Le chiavi locali sono `groomly.users.{uid}.dogs` e le sorelle per appuntamenti e impostazioni. `listDogs` del salone 7 restituisce solo il suo cane; `listDogs('salon-0')` e `listDogs('salon-19')` restituiscono i loro.

Sul cloud la stessa separazione è nelle regole: `canUse(salonId)` è vero solo se `accounts/{uid}.salonId` è quel `salonId`. Un titolare nuovo nasce con `salonId` uguale al proprio uid (`registerOwner` scrive `salons/{uid}`, e il test di client vieta `salon/shared`). Un titolare non può leggere `accounts` di un altro: la lettura è il proprio uid, oppure un operatore con email verificata o con claim `admin`. I cani di `salons/{altro}` non hanno una regola di lettura per chi ha un `salonId` diverso.

Cose da tenere presenti, senza un buco tra saloni cloud:

- L’elenco Utenti (`/impostazioni/utenti`) per un’email che non è operatore torna a Impostazioni. Nel giro, con `audit@salone.it`, il titolo rimasto è Settings. L’operatore, invece, legge i nomi dei saloni: è il pannello di Laura e Roberto, e le regole glielo consentono. I cani degli altri saloni da quella pagina non si leggono.
- Due saloni sullo stesso telefono condividono il token di Google Drive. È il punto sotto, nella sezione Drive. I cani restano separati; la copia su Drive no.
- `salon/shared` esiste ancora per i dati vecchi. Un account nuovo non ci scrive.

## Quello che si apre e risponde

Queste schermate, in inglese, hanno un titolo e non sono andate in errore. Tra parentesi il titolo visto.

| Indirizzo | Titolo visto in inglese |
| --- | --- |
| `/` | Home (senza h1; la barra c’è) |
| `/animali` | Dogs |
| `/animali/nuovo` | New dog, con ritorno ai cani |
| `/calendario` | October 2026 |
| `/mensili` | Monthly |
| `/incassi` | Earnings |
| `/incassi/report` | Earnings and report |
| `/listino` | Price list |
| `/listino/vedi` | Price list |
| `/listino/prezzi` | Update prices |
| `/listino/gestione` | Manage price list |
| `/listino/stampa` | Print and share |
| `/impostazioni` | Settings |
| `/impostazioni/account` | Manage Groomly account |
| `/impostazioni/legale` | Legal, con Indietro |
| `/impostazioni/licenze` | Open-source licenses |
| `/impostazioni/info` | About Groomly |
| `/impostazioni/servizi` | Services and durations |
| `/impostazioni/archivio` | Archive |
| `/impostazioni/notifiche` | Notifications |
| `/impostazioni/aggiornamenti` | Updates |
| `/impostazioni/account/elimina` | Delete account |
| `/impostazioni/strumenti` | Tools, con Indietro |
| `/impostazioni/pro` | Pro features (pagina collaboratori, non il pagamento) |

La barra in basso in inglese dice Home, Pets, Diary, Monthly, Price list, Settings.

Su Strumenti gli interruttori rispondono:

- Messaggi WhatsApp: acceso, al tocco diventa spento.
- Affidabilità: spento, al tocco diventa acceso.
- Note vocali: spento, al tocco diventa acceso.
- WhatsApp automatico: resta la scritta «Da sviluppare», senza interruttore. Va lasciato così.

Il foglio Backup si apre. In inglese il pulsante di chiusura è Close. Dentro ci sono Salva ora, il backup automatico, Giorno / Settimana / Mese, Collega Google Drive, Registro Excel, ZIP senza foto, Completo con foto, Copia veloce, Ripristina da un file. Sul web «Collega» non aggancia un account: il plugin web risponde che Drive funziona sul telefono. È il comportamento giusto del browser.

## Quello che non arriva in fondo

### 1. Prova Pro e ogni riga «Si sblocca con Pro»

Tocco provato, in italiano, su Strumenti: Prova Pro gratis per 30 giorni, Promemoria, Cane pronto, Richiamo, Auguri, Pagella, Tessera fedeltà, Prenotazioni online, Lista d’attesa, Recensione Google, Statistiche, Email, Copie delle foto.

Ogni tocco crea nel documento un dialogo chiamato «Abbonamenti in arrivo». Quel dialogo:

- non ha `position: fixed`;
- sta fuori dal guscio del telefono (`data-testid="phone-shell"`);
- è un blocco di testo in coda alla pagina, con Avvisami, un secondo «Prova Pro gratis» e Chiudi.

Sullo schermo del telefono, che è alto quanto il guscio, quel blocco resta sotto la pagina. Il tocco sembra non fare nulla. È lo stesso sintomo dello screenshot: «Prova Pro gratis» non apre un foglio.

Il pulsante grande sulla scheda Piano Pro non avvia i 30 giorni. Chiama `apriPaywall('pagella')`. L’avvio vero (`callAvviaProva`) sta nel bottone interno del foglio, quello che non si vede.

In più, da quel momento nel documento esiste un elemento `role="dialog"`. Il tasto indietro di Android, in `SystemBack`, se vede un dialogo sceglie «chiudi il foglio» e si ferma. `dismissTopOverlay` non trova un pulsante Chiudi con `aria-label="Chiudi"` (il pulsante ha solo il testo) e non clicca i pulsanti del foglio, perché non sono figli diretti del contenitore. Il gesto indietro non torna a Impostazioni e non chiude il foglio. L’app resta ferma sulla pagina. È il «clicco Promemoria e non va indietro». In questo giro non c’è stato un telefono su cui vedere un crash nativo: il blocco del tasto indietro è nel codice, ed è sufficiente a far sembrare l’app inchiodata.

Se la funzione fosse già inclusa nel piano, il tocco sulla riga aprirebbe un altro dialogo con la sola frase «Inclusa nel piano» e l’introduzione delle funzioni Pro. Non apre la pagina della funzione.

### 2. Promemoria e messaggi, Il tuo piano, Privacy

`/impostazioni/messaggi` (la riga «Promemoria e messaggi» delle Impostazioni) disegna solo un titolo. In inglese il titolo è «Messages to clients». Non c’è il guscio, non c’è la barra, non c’è Indietro. Stessa forma per:

- `/impostazioni/piano` — «Your plan» / «Il tuo piano»
- `/impostazioni/privacy` — «Privacy and terms»

`systemBackChoice` su questi indirizzi, se il WebView non ha una voce di storia, restituisce `exit` e l’app si chiude. È il secondo modo in cui «non va indietro».

### 3. Suggerimenti

`/impostazioni/suggerimenti` in inglese si intitola Tips. Il testo visto è la guida breve, le novità e il link Notifiche. Aree di testo: zero. Nessuna categoria. Nessun invio. Nessun grazie. Nessuna mail a `info@groomlyapp.it`. Nessun elenco per l’operatore.

La forma decisa nella specifica: sei categorie (bug, critica, miglioramento, funzione che manca, testo o lingua, altro), testo da 10 a 2000 caratteri, finestra di grazie, documento `suggerimenti/{id}` scrivibile solo in creazione dal proprio salone e leggibile solo dall’operatore, mail a `info@groomlyapp.it` che se fallisce non cancella la nota.

### 4. Google Drive

Sul web il giro vede «Collega Google Drive» e resta scollegato. Sul telefono il codice fa un’altra cosa.

`DriveAuthPlugin.collega()` chiama `authorize()`. Se Google ha già un token e non c’è un `PendingIntent`, il metodo segna il salone collegato subito, senza mostrare l’account. `leggi()`, chiamato a ogni apertura di Impostazioni, fa lo stesso se la preferenza `driveScollegato` è falsa: un account Groomly nuovo, sullo stesso telefono di uno già collegato, risulta collegato senza un sì.

Quella preferenza è un solo booleano in `SharedPreferences` (`groomly` / `driveScollegato`), uguale per tutti i saloni del telefono. Scollegare un salone scollega il telefono. Collegare il secondo salone riusa il Google del primo.

Quando risulta collegato, l’interfaccia mette due pulsanti a tutta larghezza, uno sotto l’altro: Scollega (dettaglio fisso «Google Drive collegato») e Invia su Drive. Scollega non sta a destra sulla riga dell’email.

### 5. Lingua inglese e spagnola

Il foglio Backup, aperto in inglese, mostra ancora in italiano:

- Copia aggiornata
- Salva ora
- JSON sul telefono e copia sul cloud
- Automatico (la riga piccola dice «Automatic backup off», il titolo no)
- Frequenza, e l’etichetta del gruppo «Frequenza del backup»
- Solo Wi-Fi
- Solo in carica
- Un file da tenere
- ZIP senza foto
- Completo con foto
- Copia veloce
- Se qualcosa va storto
- Ripristina da un file
- Sostituisce i dati di questo salone
- Unisci aggiunge e aggiorna, senza cancellare
- Collega Google Drive, Non collegato, Invia su Drive, Google Drive collegato, Registro Excel, Ripristina da Drive, Copie su Drive

Listino, in inglese e in spagnolo, mostra «Taglia piccola», «Taglia media», «Taglia grande» e «su valutazione». Le traduzioni ci sono in `src/i18n/listino.ts` (`Small size`, `on assessment`, `Talla pequeña`, `bajo valoración`): la pagina disegnata in questo giro non le ha usate. In gestione listino compare anche la parola «Impostazioni».

Altre scritte fisse, lette nel sorgente, che restano italiane con qualsiasi lingua:

- `PriceSheetManagePage`: Intestazione e logo, PNG o JPG · meglio con sfondo trasparente, Colore del foglio, Nome, indirizzo e telefono partono da Impostazioni › Attività, Sezioni del foglio, Servizi e prezzi, Sposta giù
- `ProPage`: «Il socio ha il pieno controllo del salone…» e «Ruolo dell’invito»
- `UsersPage`: Elenco non disponibile, Nessuna toelettatura
- `ExportSheet`: Salvato in Documenti/Groomly, e la frase sull’appuntamento non chiuso
- `UpdateNotice`: È pronta la versione …
- `DriveInvioAuto`: Backup inviato su Google Drive
- `providers` e `useSession`: Salvataggio non riuscito, Connessione assente

### 6. Funzioni Pro: il lucchetto non porta alla funzione

Anche togliendo il foglio invisibile, diverse voci non hanno un percorso fino al risultato. Home passa alle prenotazioni un elenco sempre vuoto (`richieste={[]}`) e alla lista d’attesa `posti={0}`. Le copie cloud in Impostazioni ricevono `bucket={null}`, quindi con il piano acceso la riga dice che le copie non ci sono. `/incassi/statistiche` con il piano base rimanda al report (nel giro il titolo è «Earnings and report»): la pagina statistiche esiste, ma la riga in Strumenti non la apre.

| Voce in Strumenti | Sul piano base | Se il piano la include |
| --- | --- | --- |
| Promemoria | Foglio invisibile | Dialogo «inclusa». Gli avvisi in home esistono a parte (`RiquadroAvvisi`). |
| Cane pronto | Foglio invisibile | Dialogo «inclusa». Il testo WhatsApp del tipo «pronto» c’è nel foglio del cane, se i messaggi sono accesi. |
| Richiamo | Foglio invisibile | Dialogo «inclusa». Stesso foglio messaggi, tipo richiamo. |
| Auguri | Foglio invisibile | Dialogo «inclusa». `CompleanniAvviso` vive nei provider, la riga non lo apre. |
| Pagella | Foglio invisibile | In home compare il blocco manuale solo se la funzione è visibile. La riga non ci porta. |
| Tessera fedeltà | Foglio invisibile | Sulla scheda cane, se è accesa anche l’impostazione del salone. |
| Prenotazioni online | Foglio invisibile | In home una sezione con zero richieste. Il pulsante pubblica pagina sta nel foglio Attività. |
| Lista d’attesa | Foglio invisibile | In home «posti liberi: 0», numero scritto nel codice. |
| Recensione Google | Foglio invisibile | Un campo link nel foglio Attività. |
| Statistiche | Foglio invisibile. L’URL diretto torna al report. | La pagina c’è (`StatistichePage`) e la riga non la apre. |
| Email | Foglio invisibile | Dialogo «inclusa». |
| Copie delle foto | Foglio invisibile | Con `bucket` nullo: «Copie non disponibili». |
| WhatsApp automatico | «Da sviluppare» | Resta così. Non è un guasto. |

### 7. Il più (+) sopra le righe

Nello screenshot il pulsante + sta sopra Richiamo. `ShellFrame` lo mostra anche su Strumenti (`showFab` è vero). Le righe, scorrendo, gli passano sotto. Un tocco destinato alla riga può finire sul più.

## Sicurezza, in sintesi

| Controllo | Esito |
| --- | --- |
| Venti saloni locali, un solo ingresso | Il salone 7 vede solo il proprio cane |
| Regola `canUse` | Lettura e scrittura di cani, appuntamenti, file e impostazioni solo sul proprio `salonId` |
| Account nuovo | `salonId` = uid, niente scrittura su `salon/shared` |
| `/impostazioni/utenti` da un titolare normale | Torna a Impostazioni |
| Backup in `users/{uid}` | Il test dell’emulatore già vieta a un altro utente il backup di Laura. Non rilanciato oggi |
| Collaboratore senza piano | Il test dell’emulatore gli vieta i cani del salone. Non rilanciato oggi |
| Drive sullo stesso telefono | Il token Google è del telefono, non del salone. Un secondo account può spedire il backup sull’account Google del primo, senza una nuova domanda |
| Suggerimenti | La raccolta non esiste: non c’è ancora un punto in cui un salone possa leggere le note di un altro |

## Ordine consigliato per rimettere a posto

È l’ordine del piano, ed è quello che sblocca i tap dello screenshot prima del modulo nuovo.

1. Foglio Pro vero (copre lo schermo, si chiude, il tasto indietro del telefono lo chiude e non esce dall’app). Prova Pro deve arrivare a `callAvviaProva` oppure dire, nel foglio, che gli abbonamenti sono in arrivo.
2. Promemoria e messaggi, Il tuo piano e Privacy dentro il guscio, con Indietro. Il tasto indietro di Android da `/impostazioni/...` torna al padre anche se il WebView non ha storia.
3. Drive per salone, domanda se il token c’è già, Scollega a destra sulla riga dell’email, testi del backup nel catalogo delle lingue.
4. Modulo Suggerimenti come nella specifica, con mail a `info@groomlyapp.it` e lettura solo operatore.
5. Il resto della lingua (listino, gestione listino, pagina Pro, Utenti) e, una voce alla volta, il percorso delle funzioni Pro che oggi si fermano al dialogo «inclusa» o a un elenco vuoto.
