# Servizi Pro, le cose piccole

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

Data: 29 ottobre 2026.

La toelettatrice accende i servizi Pro con un interruttore, legge cosa fanno da una i, e in home vede solo le righe che le chiedono qualcosa. Promemoria, auguri, cane pronto e recensione cambiano schermata e orario. La lista d’attesa, il sito e la corsa al posto sono un altro documento: `2026-10-29-lista-attesa-design.md`.

## Perché

Oggi Strumenti apre un foglio con le scritte Spento, Manuale e Automatico. In home, sopra la ricerca, una card «In partenza» mette insieme promemoria, cane pronto, auguri, recensione e lista, con Ferma e Invia. La toelettatrice vuole gli appuntamenti del giorno in cima, le mail che partono da sole senza una coda, e una riga stretta solo dove deve decidere lei.

## Obiettivi

- In Strumenti, interruttore acceso o spento al posto delle scritte, e una i per ogni servizio Pro.
- La stessa i al posto dei pulsanti informazione già messi a mano su notifiche e frequenza del backup.
- Email, statistiche e copie delle foto escono dall’elenco Pro. Il lavoro dietro resta acceso.
- Home: appuntamenti del giorno, subito sotto i cani da completare se ci sono, poi gli auguri, poi lo spazio per la conferma della lista, promemoria sempre in fondo.
- Cane pronto è l’unico con Manuale o Automatico. In home non compare.
- La recensione è solo automatica, a fine giornata, e in home non compare.

## Non obiettivi

- Iscrizione dal sito, mail a tutti, conferma del posto, linguetta In attesa, registrazione a mano. Stanno nell’altro documento.
- Cambiare la tessera, i richiami, le prenotazioni online, WhatsApp.
- Spegnere l’email in scheda, la pagina Statistiche o le copie nel backup.
- Una palette nuova.

## Anti-obiettivi

- Il promemoria sopra gli appuntamenti, o fra gli appuntamenti e i cani da completare.
- Cane pronto o recensione visibili in home.
- Le scritte Spento, Manuale e Automatico come unico comando.

## Vincoli

Colori solo dai token in `src/theme/tokens.css`. Icone Lucide, stroke 2. Testi in italiano, inglese e spagnolo. Orari in Europe/Rome. Titolare e socio cambiano gli interruttori. Il collaboratore li vede e non li cambia. Un servizio spento non manda mail e non mostra righe. I dati restano e tornano quando lo si riaccende.

## Approcci

1. Un piano per queste schermate e per queste mail, e la lista d’attesa da sola. Scelto. Le mail di qui esistono già: si spostano e si cambiano gli orari. La lista è un flusso nuovo.
2. Tre piani, con Strumenti staccato da home e dalle mail. Scartato: le cose piccole restano spezzate.
3. Tutto in un piano, lista compresa. Scartato: il sito e la corsa al posto si perdono in mezzo alle righe.

## Strumenti

L’elenco Pro resta in Impostazioni, Strumenti. Ogni riga è: icona, nome, i, interruttore. L’interruttore è il `Toggle` già in app. Non c’è un tasto Salva.

| Servizio | Acceso |
| --- | --- |
| Promemoria | solo automatico. Sotto la riga, se acceso: il giorno prima, due o tre, e l’ora. Default: il giorno prima alle 18:00 |
| Cane pronto | all’accensione chiede Manuale o Automatico. Poi la parola resta accanto all’interruttore. Si può cambiare ripremendo la parola |
| Auguri | solo acceso o spento. La scelta sta in home, non qui |
| Recensione | solo acceso o spento. Sotto, se acceso: a fine giornata. Il link Google resta il campo già in app |
| Lista d’attesa | solo acceso o spento. Cosa fa l’acceso è l’altro documento |
| Tessera fedeltà | solo acceso o spento, come oggi |

Richiami resta la riga In sviluppo, senza interruttore. Prenotazioni online resta dov’è.

Email del cliente, Statistiche e Copie delle foto non sono più righe di Strumenti, né voci di una vetrina che le presenta come servizi da accendere. Restano dove già lavorano: l’email nel contatto del cane, le statistiche in Incassi, le copie nel backup. Il concederle dall’elenco operatore non si toglie: se si toglie, il lavoro dietro si spegne.

Un valore salvato Manuale su promemoria, auguri o recensione diventa Automatico. Su cane pronto, Manuale resta Manuale.

### La i

Un solo componente, `Info`. Si usa in Strumenti, al posto del pulsante sulle notifiche, e al posto del pulsante sulla frequenza del backup.

È il componente del pulsante, non una palette nuova. I token ci sono già, a tre strati: i valori in `tokens.css`, gli alias `--tx3`, `--card`, `--line`, `--tx2`, e qui il componente.

| | Normale | Premuto | Dialogo |
| --- | --- | --- | --- |
| Icona | Lucide `Info`, 16 px, stroke 2, colore `var(--tx3)` | la stessa | — |
| Tasto | 36×44, fondo trasparente, raggio 8, senza bordo | fondo `var(--pri-s)` per 150 ms | — |
| Finestra | — | — | il `Dialog` già in app, titolo il nome del servizio, testo `var(--tx2)`, poi Ho capito |

Il nome accessibile è «Informazioni su {nome}». Chiaro e scuro usano gli stessi token. Con movimento ridotto il fondo compare subito.

Testi della i:

- Promemoria. «Manda da solo un promemoria alla proprietaria prima dell’appuntamento. In home, in fondo, una riga stretta: pallino rosso se deve ancora partire, spunta verde se è partito. Il cestino annulla quello che non è ancora partito.»
- Cane pronto. «Quando segni la visita completata, la proprietaria può ricevere la mail che il cane è pronto. Automatico: parte da sola. Manuale: te lo chiede in quel momento. In home non compare.»
- Auguri. «Il giorno del compleanno, in home, compare una riga. Puoi inviare gli auguri o cestinare. Non parte da sola.»
- Recensione. «Se la visita è completata, a fine giornata parte una mail con il link di Google. Non parte se quel giorno c’è una nota di problema, se a quel cane è già stata chiesta nell’ultimo anno, o se oggi ce ne sono già cinque. In home non compare.»
- Lista d’attesa. Il testo è quello del documento della lista.
- Tessera. «Dieci visite chiuse fanno un premio. In scheda si vedono i segni e, a dieci, Usa premio.»
- Notifiche e frequenza del backup. Restano i testi già in app. Cambia solo il componente.

## Home

Sopra la giornata restano la ricerca e le richieste delle prenotazioni online, dove sono adesso. La card «In partenza» esce.

Poi, dall’alto:

1. Gli appuntamenti di oggi.
2. Subito sotto, i cani da completare, se ce ne sono.
3. Gli auguri, una riga per cane, se è il loro compleanno e il servizio è acceso.
4. La conferma della lista d’attesa, se l’altro documento ne ha una. Questo piano le lascia il posto e non le disegna.
5. I promemoria, sempre ultimi.

Se non ci sono cani da completare, gli auguri e i promemoria salgono sotto gli appuntamenti. Se non ci sono auguri, i promemoria restano comunque sotto tutto il resto di questo blocco.

La riga è una sola linea, orizzontale, padding verticale 4. Non è una card con ritratto. Sì e cestino hanno un’area di tocco di almeno 44, senza andare a capo. Il colore è sempre accompagnato dalla parola, per chi non vede il colore.

### Promemoria

Una riga per visita che deve partire quel giorno, o che quel giorno è partita. Nome del cane, data e ora di invio, la parola Promemoria, poi lo stato. Pallino rosso `--bad` se è ancora da mandare. Spunta verde `--ok` se è partita. Il cestino c’è solo finché non è partita: annulla, e quella riga non rinasce. Parte da solo all’ora scelta, anche a telefono spento. La riga inviata resta in home fino a mezzanotte di quel giorno, poi esce.

### Auguri

Il giorno del compleanno, da mezzanotte a mezzanotte, ora di Roma, se ci sono giorno e mese. Testo: «È il compleanno di {cane}. Inviare gli auguri?» Sì manda la mail subito. Il cestino non manda, e quell’anno non ripropone. Se nessuno apre l’app quel giorno, la mail non parte il giorno dopo. Spento: nessuna riga e nessuna mail.

### Cane pronto

In home non c’è riga. Automatico: la mail parte quando si preme Completato, senza i quindici minuti di oggi. Manuale: il popup già in app chiede se avvisare la proprietaria. No non manda. Sì manda subito. Se la visita viene riaperta prima che la mail sia partita, non parte.

### Recensione

In home non c’è riga. Non c’è il modo Manuale. Se era salvato Manuale, vale Automatico. Parte alle 20, ora di Roma, del giorno in cui la visita è stata completata. Se il completamento è dopo le 20, parte alle 9 del mattino dopo. Solo se la visita è ancora completata a quell’ora. Restano le regole di adesso: niente mail se quel giorno c’è una nota di problema, niente se a quel cane è già stata chiesta nell’ultimo anno, niente oltre cinque quel giorno. Se la visita viene riaperta prima dell’ora, la mail non parte.

## Fuori da questo piano, di proposito

La coda «In partenza» non mostra più nemmeno la lista d’attesa. Il vecchio invio «la prima mail chiude le altre e il salone approva» si spegne qui, così non restano due sistemi. L’interruttore Lista d’attesa salva acceso o spento. Finché l’altro piano non c’è, acceso non iscrive nessuno e non manda mail.

## Chiamate mie

- Anticipo e ora del promemoria restano modificabili. Non era stato chiesto di toglierli, e il default mostrato era il giorno prima alle 18:00.
- La riga del promemoria inviato esce a mezzanotte. Il cestino non c’è più dopo l’invio.
- Gli auguri non recuperano il giorno dopo. Il cestino vale per quell’anno.
- La i usa il dialogo già in app. Non si inventa un fumetto nuovo.
- Email, statistiche e copie si tolgono dalla vista della toelettatrice, non dal concederle nell’elenco operatore.
- Fra i due piani, la lista accesa non usa il vecchio invio.
- Cane pronto automatico parte al Completato, non quindici minuti dopo.
- La recensione non ha un annullo in home. Si ferma solo riaprendo la visita prima dell’ora.

## Prove

Prima le prove, poi la schermata. In particolare: l’ordine in home con e senza cani da completare, il promemoria ultimo, il cestino solo se non è partito, gli auguri che partono solo con Sì, il cane pronto assente da home, la recensione alle 20 e alle 9 del giorno dopo, il tetto di cinque e l’anno, le tre voci tolte dall’elenco e ancora raggiungibili dove lavorano, la i unica su Strumenti, notifiche e backup, il collaboratore che non muove l’interruttore, chiaro e scuro.
