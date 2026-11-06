# Console Admin — come si usa

La Console Admin prende il posto dell'Admin Manager. La vede solo chi ha il claim `admin`, cioè la hotmail di Roberto, che entra direttamente in `/admin`, senza salone.

Si apre in due modi, con lo stesso login:

- **Dall'app.** Stesse pagine, con la barra in basso: Panoramica, Saloni, Assistenza, Beta, Altro.
- **Dal PC, su `admin.groomlyapp.it`.** Menu fisso a sinistra e tabelle larghe. Non ci si registra, la sessione finisce quando si chiude il browser e sul PC non resta nessun dato. Chi non ha il claim vede «Accesso riservato».

| Rotta | Cosa c'è |
|---|---|
| `/admin` | Panoramica: numeri, Da fare oggi, +30 gg, Email oggi |
| `/admin/saloni` | Elenco, ricerca, filtri, selezione multipla, inviti |
| `/admin/saloni/:salonId` | Scheda del salone: piano, azioni, storico, feedback, numeri aggregati |
| `/admin/beta` | Inviti per stato |
| `/admin/assistenza` | Suggerimenti e feedback, con stato e risposta |
| `/admin/comunicazioni` | Avvisi e email ai saloni, Annuncio pagamenti |
| `/admin/piani` | Interruttori, offerta early adopter, RevenueCat, accensione |
| `/admin/registro` | Tutte le azioni fatte dalla Console |
| `/admin/sistema` | Versioni, Email oggi, tour, collegamenti |

Le Metriche arrivano col blocco successivo: fino ad allora non c'è la voce e i numeri stanno in Panoramica. I vecchi link (`/impostazioni/admin-manager`, `/impostazioni/utenti`, `/admin?tab=…`) portano alla pagina giusta.

## Passaggio degli accessi

I Pelosetti sta in `salons/{uid di Laura}`. Lo script `scripts/imposta-admin.ts` sposta solo chi ci entra: non tocca cani, appuntamenti o incassi. Senza `--esegui` non scrive nulla. Serve `GOOGLE_APPLICATION_CREDENTIALS` verso un service account fuori dal repo.

1. `node --experimental-strip-types scripts/imposta-admin.ts controlla`, poi `claim on masala.roberto@hotmail.it --esegui`, poi di nuovo `controlla`.
2. Deploy delle functions (`FUNCTIONS_DISCOVERY_TIMEOUT=60`, senza `--force`), poi delle regole.
3. Nuova APK.
4. `collega` per leggere cosa farebbe, poi `collega --esegui`: elimina l'eventuale salone di prova di robmass83 e lo fa socio di I Pelosetti.
5. Accesso con robmass83: deve aprire I Pelosetti. Poi con la hotmail: deve aprire `/admin`. Poi Laura aggiorna l'APK e controlla il suo salone.
6. `stacca --esegui`: toglie alla hotmail account e riga socio. Si rifiuta se robmass83 non è ancora entrato.

## Sicurezza

Ogni azione finisce in `adminLog`, che scrivono solo le functions e che si legge in **Registro**, senza testi né email. Elimina salone, Accendi e Spegni pagamenti e l'invio a tutti chiedono di nuovo la password se l'ultimo accesso ha più di 15 minuti. Le comunicazioni hanno un limite di 10 all'ora, le risposte di 30.

La scheda del salone mostra solo numeri aggregati: mai nomi o telefoni dei clienti finali. Quando si cancella un account o un salone si cancellano anche i suoi feedback beta, lo storico di Assistenza e il suo uid nelle comunicazioni.

## Sito `admin.groomlyapp.it`

Una volta sola, a mano:

1. Firebase Hosting: crea il sito `groomly-admin`.
2. Collega il dominio `admin.groomlyapp.it` con i record DNS su Hostinger.
3. Firebase Auth: aggiungi `admin.groomlyapp.it` ai domini autorizzati.
4. App Check: registra il sito, quando App Check viene acceso.

Per pubblicare, da `D:\Groomly` dove c'è `.env.local`:

```bash
npm run deploy:admin
```

`build:admin` controlla da solo che nel sito non siano finiti plugin nativi o pagine del salone. Da ora il sito pubblico si pubblica con `firebase deploy --only hosting:pubblico`: senza il nome del target Firebase cercherebbe anche `dist-admin`.

## La beta è pronta da usare

Dopo il deploy di functions e regole e dopo la nuova APK puoi invitare i saloni.
Per gli abbonamenti non serve niente: restano spenti finché non li accendi tu da Piani.

## Invitare saloni alla beta

1. Apri **Saloni**. Cerca un salone per nome, titolare o città, oppure usa i filtri: Avvisami Plus o Salon, piano, stato beta, attivi o inattivi.
   - **Avvisami Plus / Avvisami Salon** mostrano chi ha toccato Avvisami sulla vetrina del piano o su una funzione di quel piano. Insieme a «Mai invitati» trovi subito a chi offrire la prova.
2. Per sceglierne più di uno tieni premuto su un salone, oppure tocca **Seleziona**. «Tutti» seleziona i saloni filtrati.
3. Nella barra scura in basso tocca **Beta Plus** o **Beta Salon**.
4. Nel dialogo scegli:
   - il piano;
   - la durata: 30, 60 o 90 giorni, oppure «Altro», da 1 a 365;
   - un messaggio facoltativo.

   Poi tocca **Invia N inviti**.
5. L'esito dice quanti inviti sono partiti e quali saloni sono stati saltati, con il motivo:
   - VIP;
   - già invitato;
   - piano attivo;
   - non trovato.

Per un solo salone puoi anche aprirne il dettaglio e toccare **Invita alla beta Plus/Salon**.

Cosa succede dopo:
- Il titolare riceve un avviso nell'app, la card in Home e un'email.
- Il piano si accende **solo quando il titolare accetta**.
- Un invito senza risposta scade dopo 14 giorni. Se serve, lo rifai.

## Seguire la beta

- **Panoramica.** Mostra il riquadro Beta (invitati, in beta, quanti pagherebbero), i saloni attivi a 7 e 30 giorni, i piani e le fonti, gli «Avvisami».
  - La lista **Da fare oggi** raccoglie inviti in scadenza, beta che finiscono, richieste da leggere e saloni nuovi della settimana.
  - Il pulsante **+30 gg** allunga una beta al volo.
- **Beta.** Elenca gli inviti divisi per stato: invitati, in beta, rifiutati, scaduti, revocati.
- **Dettaglio salone.** Si apre toccando un salone. Mostra il piano effettivo e il **perché**: VIP, Play, prova, beta, manuale o Go. Sotto, la scadenza e tre viste: **Azioni**, **Storico**, **Feedback**. In **Azioni** ci sono anche i numeri: animali, appuntamenti, persone, versione app e lingua.
  - **Estendi** allunga la beta di 15, 30 o 60 giorni, o del numero che vuoi.
  - **Revoca** riporta il salone a Go subito. I dati restano e il salone riceve un avviso.
  - **Early adopter** è l'interruttore per il prezzo di favore al lancio. Si accende da solo quando il salone accetta.
  - Restano i pulsanti di prima: **Attiva Plus**, **Attiva Salon**, **Regala 30 giorni**, **Torna a Go** ed **Elimina toelettatura**, che chiede di scrivere ELIMINA.

## Assistenza

Una casella sola con suggerimenti e feedback beta. Le segnalazioni sono i suggerimenti con categoria «Qualcosa non funziona».

- **Stato.** Nuove, In corso, Risolte. Aprire una richiesta non cambia lo stato: lo cambi tu. Le richieste arrivate prima del primo accesso alla nuova Console valgono Risolte.
- **Filtri.** Stato, fonte, categoria, salone. **Esporta** salva in PDF o Excel ciò che vedi.
- **Rispondere.** Apri la richiesta, scrivi o scegli una risposta rapida, tocca **Invia la risposta**.
  - La risposta arriva **solo a chi ha scritto**, negli Avvisi di sistema dell'app, con sotto la frase «In caso di ulteriori informazioni e chiarimenti contattaci via mail: `info@groomlyapp.it`». Non è una conversazione.
  - Con **Invia anche via email** parte anche un'email di servizio, senza «Disiscriviti». Mittente `noreply@`, le risposte vanno a `info@`.
  - Se l'account non esiste più la risposta non parte e la Console lo dice.
  - Una risposta inviata non si modifica. La richiesta passa a Risolte, ma puoi riaprirla.
- **Chi non ha aggiornato l'app** non vede la risposta: l'email gli arriva comunque.
- Con **Feedback beta** come fonte, sotto la lista c'è il riepilogo: voto medio, «Pagheresti?», utilità delle funzioni, esportazione completa.

Il titolare manda il feedback da Abbonamento → «Invia feedback beta». Gli arriva un promemoria dopo circa 7 giorni e a 7 giorni dalla fine.

## Comunicazioni

1. Scegli il tipo di avviso e i destinatari: **Tutti i saloni** o **Saloni scelti**, con gli stessi filtri di Saloni.
2. Scrivi in italiano, obbligatorio. Le altre lingue sono facoltative: chi ha una lingua senza testo riceve l'italiano.
3. **Invia anche via email**, se serve, scegliendo il tipo:
   - **Promozionale** (preselezionata): solo a chi ha dato il consenso, con il link «Disiscriviti».
   - **Di servizio**: a tutti i titolari, senza link. Solo ciò che serve a usare il servizio, come manutenzione, sicurezza e modifiche importanti. Mai offerte.
4. L'**Anteprima** dice quanti account ricevono l'avviso, quante email partono, chi riceve l'italiano, chi è escluso per mancanza di consenso e quante email restano oggi.

L'invio a tutti chiede di nuovo la password se l'ultimo accesso ha più di 15 minuti. I saloni di test restano sempre esclusi.

Nello **Storico** vedi ogni invio. **Riprendi** manda solo a chi manca, se un invio si è interrotto. **Elimina** toglie l'avviso dall'app, ma le email già partite restano partite.

### Il limite delle email

Brevo gratuito dà **300 email al giorno**, in comune con i promemoria che i saloni mandano ai clienti. La Console può usarne al massimo la **metà di quelle rimaste**, così i promemoria non si fermano. Il numero si vede in Panoramica, in Sistema e nell'Anteprima («Email oggi: 120 su 300»). Oltre il limite l'invio con email è bloccato; l'avviso nell'app può partire sempre.

## Metriche

In **Metriche** trovi i numeri calcolati di notte dal server: saloni, attivi, attivati, appuntamenti, «Avvisami» e la tabella di chi resta. Ci sono anche senza il consenso alle statistiche, perché sono solo totali.

- Il primo dato compare dopo la prima notte dalla pubblicazione delle functions.
- Sono esclusi I Pelosetti, i saloni VIP, gli admin e gli account di test.
- «Chi resta» è una stima dall'ultimo accesso. Le settimane troppo recenti mostrano un trattino.
- I crash non sono contati qui: il link porta a Crashlytics. Analytics mostra solo i saloni il cui titolare ha detto sì.

## Piani e pagamenti

- **Durante la beta** ci sono tre interruttori:
  - **Mostra i piani**: le vetrine di Plus e Salon compaiono nell'app;
  - **Prova gratis self-service**: spenta, perché la prova si regala solo dall'admin;
  - **Prezzi durante la beta**: spento, quindi le vetrine dicono «In arrivo · Avvisami» senza prezzo.
- **Offerta early adopter**: il testo dell'offerta in it/en/es. Una lingua vuota usa l'italiano.
- **RevenueCat**: la chiave pubblica SDK (`goog_…`) e l'ID offering (`groomly_standard`).
- **Annuncio pagamenti**: ora sta in Comunicazioni. Avvisa tutti nell'app e manda un'email a ex beta ed early adopter. Gli abbonamenti si possono accendere solo 15 giorni dopo.
- **Pannello di accensione**: in alto, con un semaforo ✅/❌ su cinque voci:
  - chiave SDK;
  - offering completo;
  - webhook attivo;
  - annuncio fatto da almeno 15 giorni;
  - la tua conferma «ho Partita IVA e profilo pagamenti».

  Con tutto verde, doppia conferma e **ACCENDI**. **Spegni** rimette tutto come in beta: chi ha già pagato tiene il piano fino alla scadenza.

L'ordine dei passi esterni (RevenueCat, Play Console, Partita IVA) è in `docs/legal/PRIMA-DEI-PAGAMENTI.md`.
