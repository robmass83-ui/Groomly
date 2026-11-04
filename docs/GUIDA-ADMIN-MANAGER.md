# Admin Manager — come si usa

L'Admin Manager prende il posto di «Utenti Groomly». Lo vedono solo gli operatori.
Si apre da **Impostazioni → Admin Manager**. Il vecchio indirizzo `/impostazioni/utenti` porta qui.
In alto ci sono sei tab: **Panoramica · Saloni · Beta · Feedback · Suggerimenti · Piani**.

## La beta è pronta da usare

Dopo il deploy di functions e regole e dopo la nuova APK puoi invitare i saloni.
Per gli abbonamenti non serve niente: restano spenti finché non li accendi tu dal tab Piani.

## Invitare saloni alla beta

1. Apri il tab **Saloni**. Cerca un salone per nome, titolare o città, oppure usa i filtri: Avvisami Plus o Salon, piano, stato beta, attivi o inattivi.
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
  - La lista **Da fare oggi** raccoglie inviti in scadenza, beta che finiscono, nuovi feedback e suggerimenti da vedere.
  - Il pulsante **+30 gg** allunga una beta al volo.
- **Beta.** Elenca gli inviti divisi per stato: invitati, in beta, rifiutati, scaduti, revocati.
- **Dettaglio salone.** Si apre toccando un salone. Mostra il piano effettivo e il **perché**: VIP, Play, prova, beta, manuale o Go. Sotto, la scadenza e tre viste: **Azioni**, **Storico**, **Feedback**.
  - **Estendi** allunga la beta di 15, 30 o 60 giorni, o del numero che vuoi.
  - **Revoca** riporta il salone a Go subito. I dati restano e il salone riceve un avviso.
  - **Early adopter** è l'interruttore per il prezzo di favore al lancio. Si accende da solo quando il salone accetta.
  - Restano i pulsanti di prima: **Attiva Plus**, **Attiva Salon**, **Regala 30 giorni**, **Torna a Go** ed **Elimina toelettatura**, che chiede di scrivere ELIMINA.

## Leggere i feedback

Il tab **Feedback** ha:
- il filtro per piano e la ricerca per salone;
- il voto medio e la risposta a «Pagheresti?», con quanto al mese;
- quanto è utile ogni funzione;
- **Esporta**, in PDF o Excel come i Suggerimenti.

Toccando un feedback si apre il salone.

Il titolare manda il feedback da Abbonamento → «Invia feedback beta». Gli arriva un promemoria dopo circa 7 giorni e a 7 giorni dalla fine. A fine beta gli chiediamo «Vorresti continuare a pagamento?».

## Suggerimenti

È la coda di prima, invariata. Ora è un tab.

## Piani e pagamenti

- **Durante la beta** ci sono tre interruttori:
  - **Mostra i piani**: le vetrine di Plus e Salon compaiono nell'app;
  - **Prova gratis self-service**: spenta, perché la prova si regala solo dall'admin;
  - **Prezzi durante la beta**: spento, quindi le vetrine dicono «In arrivo · Avvisami» senza prezzo.
- **Offerta early adopter**: il testo dell'offerta in it/en/es. Una lingua vuota usa l'italiano.
- **RevenueCat**: la chiave pubblica SDK (`goog_…`) e l'ID offering (`groomly_standard`).
- **Annuncio pagamenti**: avvisa tutti nell'app e manda un'email a ex beta ed early adopter. Gli abbonamenti si possono accendere solo 15 giorni dopo.
- **Pannello di accensione**: in alto, con un semaforo ✅/❌ su cinque voci:
  - chiave SDK;
  - offering completo;
  - webhook attivo;
  - annuncio fatto da almeno 15 giorni;
  - la tua conferma «ho Partita IVA e profilo pagamenti».

  Con tutto verde, doppia conferma e **ACCENDI**. **Spegni** rimette tutto come in beta: chi ha già pagato tiene il piano fino alla scadenza.

L'ordine dei passi esterni (RevenueCat, Play Console, Partita IVA) è in `docs/legal/PRIMA-DEI-PAGAMENTI.md`.
