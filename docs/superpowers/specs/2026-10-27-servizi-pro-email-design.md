# Servizi Pro via email

Data: 27 ottobre 2026.

La specifica chiude i servizi Pro che si possono finire senza WhatsApp Business e senza un bucket foto. Gli invii al cliente passano da una sola coda email. Le schermate usano i token già in `src/theme/tokens.css`, le card, i chip, i pulsanti e le icone Lucide dell’app. Non si introduce una palette nuova.

## Fuori da questo lavoro

- Prenotazioni online. Restano come sono.
- Statistiche. Restano in Incassi e report.
- Copie delle foto. Restano spente finché non esiste un bucket.
- Pagella. Si toglie dall’elenco Pro e sparisce il pulsante vuoto in home.
- Richiami e WhatsApp automatico. Restano in elenco con la scritta In sviluppo. Non hanno interruttore, non creano righe, non mandano nulla.
- `mostraPiani` e `abbonamentiAttivi` non si accendono.

## Chi può fare che cosa

Titolare e socio cambiano gli interruttori e le scelte Automatico o Manuale. Il collaboratore no.

Titolare, socio e collaboratore vedono la coda in home e possono premere Ferma e Invia.

I servizi compaiono solo se il salone ha accesso Pro o Salone. Un servizio spento sparisce: niente mail, niente riquadro, niente pulsante. I dati restano e tornano quando lo si riaccende. Il tasto WhatsApp manuale della scheda non dipende da questi interruttori.

## Servizi

All’accensione un servizio email parte in Manuale. Non esce nessuna mail finché non si preme Invia, oppure finché non si passa ad Automatico.

| Servizio | Acceso | Automatico | Manuale |
| --- | --- | --- | --- |
| Promemoria | una riga per visita | parte all’ora scelta, il giorno prima, due giorni prima o tre. Default: il giorno prima alle 18 | resta in coda |
| Cane pronto | nasce quando la visita è segnata completata | parte 15 minuti dopo, se non la si ferma | resta in coda |
| Auguri | il giorno del compleanno, se ci sono giorno e mese | all’ora scelta. Default: le 9. Una volta all’anno per cane | resta in coda |
| Recensione | a visita completata, se il link Google è salvato e le regole sotto passano | parte 15 minuti dopo | resta in coda |
| Lista d’attesa | la aggiunge il salone, su un cane già in archivio, con un giorno oppure Mattina o Pomeriggio | alla disdetta, se il buco ci sta, parte 15 minuti dopo | resta in coda |
| Tessera fedeltà | dieci segni, poi Usa premio | non manda email | non manda email |

Senza email sulla scheda la riga si vede e dice perché. Non parte.

La push «Orario scaduto» avvisa solo chi usa l’app, all’ora di fine in agenda, se la visita è ancora programmata. Non crea la mail al cliente. Titolo: Orario scaduto. Testo: «{cane} doveva finire alle {ora}. Apri la visita.» Il tocco apre quella visita. È una notifica locale, sullo stesso meccanismo delle altre notifiche del telefono. Gli orari sono quelli di Europe/Rome.

### Promemoria

Una mail per visita. Se l’appuntamento si sposta, la riga non ancora partita si annulla e ne entra una con la data nuova. Una riga fermata sulla data vecchia non blocca la data nuova.

In Automatico la riga è visibile in home il giorno in cui deve partire, dall’inizio di quel giorno. In Manuale compare lo stesso giorno e resta finché non si preme Invia o Ferma.

### Cane pronto

L’email non usa l’orologio dell’agenda. Nasce alla chiusura completata. Se entro 15 minuti la visita viene riaperta e la mail non è partita, la riga si toglie. Lo stesso vale per la recensione di quella visita.

### Auguri

Senza giorno e mese di nascita non c’è riga. L’anno dopo può rinascere.

### Recensione

Non entra in coda se a quel cane è già stata chiesta nell’ultimo anno, se quel giorno c’è una nota di problema sulla visita, o se oggi il salone ha già cinque righe recensione, contando anche le fermate. Una riga chiusa perché la visita è stata riaperta non conta. Il testo è quello già in app: «Se ti è piaciuto il lavoro, una recensione su Google ci aiuta. Grazie.» Più il link.

### Lista d’attesa

Il cliente non si iscrive dalla pagina pubblica. Sulla scheda del cane, con il servizio acceso, c’è Metti in lista. Lo possono premere titolare, socio e collaboratore. Il foglio chiede il giorno, oppure Mattina o Pomeriggio. Chi è già in lista ha Togli.

Alla disdetta, ogni cane in lista il cui giorno o la cui fascia contiene il buco, e la cui durata ci sta, riceve una riga. La prima mail che parte davvero è l’unica offerta: le altre righe della stessa disdetta si chiudono e non partono. La mail non crea l’appuntamento. Il posto si fissa quando il salone lo scrive in agenda, come oggi. Se il buco nel frattempo non c’è più, la riga si chiude e non parte.

L’elenco di chi aspetta sta nel foglio del servizio, in Controlli avanzati.

### Email sulla scheda

Il campo Email sta nella card dei contatti quando almeno uno tra promemoria, cane pronto, auguri, recensione e lista d’attesa è acceso. Etichetta: Email. Aiuto: «Qui arrivano promemoria e avvisi.» Vuoto significa manca l’email. È valido se, tagliati gli spazi, contiene una chiocciola e un punto dopo la chiocciola. Altrimenti l’errore sta sotto il campo.

### Tessera

Il conto resta quello già in codice: dieci visite chiuse fanno un premio, Usa premio azzera la chiusura successiva e scrive «Premio fedeltà». In scheda si vedono dieci segni: quelli fatti pieni, colore `--pri`, gli altri solo bordo. A dieci compare Usa premio, pulsante pieno. Servizio spento: la fila non si vede, i timbri restano.

## Coda

Ogni mail al cliente è un documento del salone, non uno stato solo sul telefono. Due telefoni vedono le stesse righe. Ferma su uno vale sull’altro.

Campi:

- `tipo`: `promemoria`, `pronto`, `auguri`, `recensione`, `attesa`
- `dogId`
- `appointmentId`, quando c’è
- `evento`: chiave unica. `promemoria:{idVisita}:{giornoVisita}`, `pronto:{idVisita}`, `auguri:{idCane}:{anno}`, `recensione:{idVisita}`, `attesa:{idDisdetta}:{idCane}`
- `parteIl`: momento di invio. Vuoto se è in Manuale
- `stato`: `in_coda`, `fermata`, `inviata`, `non_inviata`, `chiusa`
- `motivo`: testo breve quando non parte, per esempio manca l’email, posta, servizio spento

La stessa `evento` non crea due documenti. Il telefono scrive la riga quando l’evento succede nell’app. Un lavoro sul server, ogni minuto, fa le stesse creazioni anche a telefono spento o chiuso a metà: promemoria, auguri, cane pronto, recensione e posto libero, leggendo visite, cani e disdette già salvati. I quindici minuti del cane pronto e della recensione partono dall’ora di chiusura salvata sulla visita, non da quando il server se ne accorge. Il server manda le righe Automatico la cui ora è passata e che non sono fermate. Le righe Manuale non le manda.

Invia spedisce subito, senza aspettare il minuto. Il pulsante mostra «Invio…», poi il chip Inviata oppure l’errore sulla stessa riga.

Ferma porta la riga a `fermata`. Quell’evento non rinasce. Spegnere il servizio ferma le righe ancora in coda di quel tipo.

Una riga Automatica del giorno, in qualsiasi stato finale, resta in home fino a mezzanotte. Il giorno dopo esce dalla home e resta sul server. Una riga Manuale resta in home finché non si preme Invia o Ferma, anche dopo la mezzanotte.

Se la posta non risponde, lo stato è `non_inviata` e un giro successivo riprova. Se manca l’email, non riprova finché l’indirizzo non c’è in scheda: a quel punto la riga torna inviabile.

Rispondi-a è l’email del salone in Impostazioni, se c’è. Se non c’è, la mail parte lo stesso dal mittente Groomly. La lingua è quella già scelta per i messaggi di quel cliente. Se non è scelta, italiano.

In fondo a ogni mail c’è «Non scrivermi più». Apre una pagina pubblica, come le azioni già usate per il promemoria, e segna il cane. Da quel momento non entrano righe nuove e quelle non partite si fermano. Dalla scheda del cane si può riattivare.

Cane archiviato, non in cura o deceduto: niente righe nuove, quelle in coda si fermano.

Disdetta o non venuto: si annullano promemoria e cane pronto di quella visita, se non sono già partiti. La disdetta può aprire le righe di lista d’attesa.

## Schermate

Colori solo dai token. Icone Lucide, stroke 2, niente emoji. Card con `--card`, bordo `--line`, ombra `--sh-2`. Pulsanti alti 48, distanza 8 tra due pulsanti vicini. Il cambio di colore dura 150 ms. Con movimento ridotto è immediato. I pulsanti non cambiano misura quando cambia lo stato. Chiaro e scuro usano gli stessi token.

### Home

Sotto la data, prima della ricerca, la card «In partenza». Vuota: icona campanella e la frase «Niente in partenza». Con righe: in cima una frase intera per lo screen reader, per esempio «2 in partenza», non un numero nudo.

Riga, dall’alto: ritratto 36 px, nome in grassetto, chip che non va a capo, orario sotto, poi Ferma e Invia.

Chip:

- Promemoria, blu `--pri`
- È pronto, tè `--tea`
- Auguri, viola `--sen`
- Recensione, ambra `--warn`
- Posto libero, verde `--ok`
- Manca l’email, rosso `--bad`
- Inviata, verde
- Fermata, neutro
- Si riprova, ambra

Il colore è sempre accompagnato dalla parola.

Manca l’email: Invia è disattivato, al suo posto Aggiungi email, che apre la scheda sul campo. Ferma resta.

I riquadri provvisori di avvisi, pagella e lista con il numero vuoto escono di home. Le richieste delle prenotazioni online restano dove sono.

### Controlli avanzati

Ogni servizio è una riga: icona, nome, chip a destra con Spento, Manuale, Automatico o In sviluppo. In sviluppo non è un pulsante.

Il foglio di un servizio acceso ha due scelte alte 48, Manuale e Automatico. Quella attiva ha bordo e fondo blu. In Manuale il foglio finisce. In Automatico compaiono solo i campi di quel servizio:

- Promemoria: tre chip per l’anticipo e l’ora
- Auguri: l’ora
- Recensione: il campo Link recensioni Google, etichetta sempre visibile
- Cane pronto: nessun altro campo
- Lista d’attesa: l’elenco di chi aspetta
- Tessera: solo acceso o spento

Il chip della riga si aggiorna subito. Non c’è un tasto Salva.

Pagella non è in elenco, né in vetrina né nel foglio.

## Prove

Ogni regola qui sopra ha un test prima della schermata che la mostra. In particolare: una sola riga per evento, Ferma non rinasce, lo spostamento crea una riga nuova, senza email non si spedisce, la posta muta riprova, il servizio spento ferma la coda, la recensione rispetta anno, nota di problema e cinque al giorno, la lista chiude le altre righe quando la prima parte, la pagella non è in elenco, In sviluppo non è cliccabile, chiaro e scuro mostrano la parola sul chip.
