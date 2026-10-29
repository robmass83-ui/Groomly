# Lista d’attesa

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

Data: 29 ottobre 2026.

Quando una settimana non ha orari, la persona si mette in lista dal sito delle prenotazioni. Se si libera un posto, la mail arriva a tutti, senza precedenze. Il primo che conferma, e il cui trattamento ci sta, prende quell’ora. La toelettatrice vede solo la conferma. L’interruttore acceso o spento, e il posto della riga in home, sono già decisi in `2026-10-29-servizi-pro-semplici-design.md`.

## Perché

Oggi la lista la aggiunge il salone su un cane già in archivio. Alla disdetta parte una mail, la prima che esce chiude le altre, e il cliente prenota dal link come una richiesta che il salone deve ancora approvare. La toelettatrice vuole il contrario: ci si iscrive dal sito quando la settimana è piena, tutti ricevono l’avviso, chi conferma entra in agenda al posto del cane disdetto, e lei vede l’avviso.

## Obiettivi

- Un interruttore. Spento, la lista non esiste da nessuna parte.
- Sul sito, il pulsante compare su una settimana senza orari, anche se il resto del mese ha posto.
- Chi si iscrive durante una prenotazione non riscrive i dati già messi. Il trattamento resta ed è visibile.
- Nessuna precedenza. La mail del posto libero arriva a tutti.
- Confermare scrive subito l’appuntamento. Gli altri, se cliccano, vedono che è occupato e scelgono se restare in lista.
- Dal più si vede la lista e si registra qualcuno a mano.
- In Animali, Archivio in alto diventa In attesa. L’archivio resta in Impostazioni.

## Non obiettivi

- Una coda in home con Ferma e Invia.
- Il salone che approva di nuovo dopo la conferma del cliente.
- Razza e foto obbligatorie per iscriversi.
- WhatsApp.
- Cambiare le prenotazioni online quando gli orari ci sono: quelle restano una richiesta da approvare, come oggi.

## Anti-obiettivi

- Una fila con il primo che ha più diritto degli altri.
- Iscrivere gente quando la settimana ha ancora orari.
- Mostrare la lista in home prima che qualcuno abbia confermato.
- Tenere il vecchio invio che chiude le altre mail appena parte la prima.

## Vincoli

Il sito pubblico è quello già in `hosting/s`, passi Animale, Giorno, Orario, Dati. L’orizzonte prenotabile resta 42 giorni. Gli orari sono Europe/Rome. La durata del trattamento è quella già usata dal sito per taglia e servizio. Le mail usano lo stesso canale delle altre mail al cliente, lingue italiano, inglese e spagnolo. Titolare, socio e collaboratore vedono la lista e possono aggiungere e togliere. Solo titolare e socio muovono l’interruttore. Colori dai token, icone Lucide stroke 2.

## Approcci

1. Piano suo, dopo le cose piccole. Scelto. Il sito, la mail a tutti e la conferma che scrive l’agenda non stanno nel piano degli interruttori.
2. Insieme alle cose piccole. Scartato.
3. Tenere il vecchio modello, una sola mail e il salone che approva. Scartato: è il contrario di quello chiesto.

## Acceso e spento

Spento: niente pulsante sul sito, niente voce nel più, niente linguetta In attesa, niente mail, niente riga in home. In Animali torna la linguetta Archivio, com’è oggi.

Acceso: valgono le sezioni sotto. Il vecchio percorso, una mail sola e la richiesta da approvare, non si usa.

## Quando compare sul sito

Una settimana è il lunedì-domenica, ora di Roma, dentro i 42 giorni. È piena quando, per l’animale, la taglia e il trattamento già scelti, non resta nessun orario di partenza.

Il pulsante «Lista d’attesa» sta su quella settimana, nel passo del calendario. Le settimane che hanno orari restano prenotabili come oggi. Basta una settimana piena, o due. Non serve che tutto il mese sia pieno.

Il pulsante non chiede un giorno. Chi entra in lista riceve ogni posto che si libera dopo, non solo i buchi di quella settimana.

## Cosa si chiede

Se la persona sta già prenotando, non si rifanno animale, taglia e trattamento. Si chiedono solo le caselle ancora vuote fra: il tuo nome, cellulare, email, nome dell’animale. Razza e foto non si chiedono. Serve il consenso privacy, lo stesso dell’invio di una prenotazione: senza, non si iscrive.

Il trattamento scelto si salva con la riga. Si vede in In attesa e nella conferma in home. L’appuntamento, se nasce, nasce con quel trattamento.

## La mail, a tutti

Si libera un’ora quando una visita programmata diventa disdetta, viene spostata, o viene tolta, e l’ora di inizio è ancora nel futuro, dentro i 42 giorni. La mail parte e il posto si può confermare.

Se l’ora è già passata e si segna non venuto, non parte nulla. Quell’ora è persa e non vale per la lista. Lo stesso se la disdetta, lo spostamento o la cancellazione arrivano dopo l’inizio: l’ora non è più davanti, quindi non si offre. Completare una visita non libera il posto.

Ogni persona in lista con un’email valida riceve la stessa mail. Nessuno passa davanti. Dieci persone, dieci mail. Due ore liberate, due mail ciascuna. Un nuovo tentativo non rimanda la stessa mail alla stessa persona per la stessa ora.

Testo: si è liberato un posto in quella data a quell’ora. Controlla il calendario della toelettatura per la disponibilità. Affrettati, prima di perdere questa possibilità. Il pulsante è «Controlla il calendario».

Il pulsante è un link personale, non l’indirizzo generico del salone. Apre il calendario di quel giorno e sa chi ha cliccato, così si può controllare il suo trattamento. Chi non apre la mail resta in lista.

## Il posto c’è ancora

Il posto è libero se quell’ora non è stata presa e se la durata del suo trattamento ci sta prima del cane dopo. La durata è quella del trattamento e della taglia, come sul sito.

Se è libero, la pagina dice: «Il posto è ancora libero. Vuoi confermare?» Conferma o Rifiuta.

Conferma scrive subito la visita, senza un secondo sì della toelettatrice. Ora e giorno sono quelli della mail. Durata e trattamento sono quelli della persona. Lo stato è programmato. La persona esce dalla lista.

Se in salone c’è già un cane con la stessa email e lo stesso nome, la visita è sua. Altrimenti si creano il cliente e il cane con i dati lasciati, e la visita è loro.

Rifiuta, con il posto ancora libero, non prenota. La persona resta in lista, senza un’altra domanda. Il posto resta per gli altri.

Due conferme insieme: la prima che trova il posto ancora libero e ci sta lo prende. L’altra vede la pagina del posto occupato.

## Il posto è già preso

Se clicca e l’ora è occupata, o il suo trattamento non ci sta, la pagina dice: «Il posto è già stato occupato.» Poi: «Vuoi restare in lista d’attesa per un possibile prossimo buco?» Sì, resto: resta in lista. No: esce, e non riceve le mail dopo.

La stessa pagina vale se il trattamento non ci sta. Per lei il posto non è libero.

## In home

Non c’è un elenco di mail in partenza. Dopo una conferma, una riga stretta, una sola linea: «{cane}, {trattamento}, ha confermato e verrà al posto di {cane disdetto}, che ha disdetto.» Sta sotto gli auguri e sopra i promemoria, nel posto lasciato dall’altro documento. Se gli auguri non ci sono, sta comunque sopra i promemoria e sotto gli appuntamenti o sotto i cani da completare. Resta fino a mezzanotte di quel giorno. Non ha pulsanti.

## Il più, e In attesa

Nel più, la finestra «Cosa vuoi fare?» guadagna «Lista d’attesa» solo se l’interruttore è acceso. Apre l’elenco e il modo di registrare chi è lì di persona.

Per registrare servono nome, cellulare, email, nome dell’animale, animale, taglia e trattamento. Il trattamento lo sceglie la toelettatrice. Senza trattamento la riga non si salva: serve per la durata e per scriverlo in agenda. Si può togliere una persona dall’elenco. Esce anche chi ha confermato un posto, e chi ha risposto No al posto già preso.

In Animali le linguette in alto perdono Archivio e guadagnano In attesa. Mostra lo stesso elenco: nome del cane e trattamento. L’archivio degli animali resta in Impostazioni. Il sottotitolo della pagina, acceso il servizio, conta gli attivi e chi è in attesa.

## La i

In Strumenti, la i di questo servizio dice: «Quando una settimana non ha orari, sul sito ci si può mettere in lista. Se si libera un posto la mail arriva a tutti. Il primo che conferma, e il cui trattamento ci sta, entra in agenda. Tu vedi solo la conferma. Dal più puoi vedere la lista e aggiungere chi è lì con te.»

## Chiamate mie

- Settimana uguale lunedì-domenica. Il pulsante sta sulla settimana piena, non su un banner del mese intero.
- Chi entra in lista sente ogni buco dei 42 giorni, non solo quella settimana.
- Razza e foto restano fuori. Il consenso privacy resta, perché si salvano nome, telefono ed email.
- La disdetta prima dell’ora avvisa la lista. Il non venuto a ora già passata non avvisa: l’ora è persa. Una disdetta, uno spostamento o una cancellazione dopo l’inizio seguono la stessa regola, perché l’ora non è più davanti.
- Se il trattamento non ci sta, si usa la stessa pagina del posto occupato, con la domanda se restare.
- Chi non apre la mail resta in lista. Chi rifiuta un posto ancora libero resta, senza domanda.
- Email e nome del cane già in salone riusano quel cane. Altrimenti si crea la scheda.
- La riga in home non si chiude a mano: esce a mezzanotte.
- Interruttore spento: torna la linguetta Archivio. Acceso, al suo posto c’è In attesa.
- Animale e taglia, nella registrazione a mano, si chiedono. Senza, non si sa se il trattamento ci sta.

## Prove

Prima le prove, poi la pagina. In particolare: il pulsante solo sulla settimana senza orari, i dati già compilati che non si rifanno, il trattamento visibile, la mail a tutte le persone in lista e non una seconda volta, la disdetta prima dell’ora che avvisa, il non venuto a ora passata che non avvisa, il link personale, la conferma che scrive la visita e toglie dalla lista, la seconda conferma che trova il posto occupato, il trattamento troppo lungo, Rifiuta che lascia in lista, No che fa uscire, la riga in home nel posto giusto, il più e la linguetta solo da acceso, l’archivio che torna da spento, il collaboratore che aggiunge e non muove l’interruttore.
