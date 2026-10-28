# Testi di mail e WhatsApp

Data: 28 ottobre 2026.

Le frasi che il salone manda al cliente, e quelle che Groomly manda a chi usa l’account, passano al tono del documento «Groomly — testi in tre lingue». Italiano, inglese e spagnolo cambiano insieme. I testi restano dove sono già: le mail in `src/i18n/emailHtml.ts`, i WhatsApp in `src/lib/messaggiManuali.ts`, le pagine del sito nel file della prenotazione pubblica e nella pagina di risposta al link.

Il mittente delle mail resta Groomly, `noreply@groomlyapp.it`.

## Fuori da questo lavoro

- Nessuna pagina nuova. I pulsanti che oggi aprono la pagina di accesso si tolgono. Giorno, ora e dettagli stanno nella frase.
- «Richiesta scaduta» e «Appuntamento disdetto» cambiano testo e non si accendono. Non nasce un invio nuovo.
- Il richiamo automatico resta in sviluppo. Cambia solo la frase WhatsApp, che il salone invia a mano.
- La tessera fedeltà non manda messaggi.
- Non si torna ai template Brevo. L’HTML lo scrive l’app.

## Segnaposto

I nomi tra virgolette sono gli stessi nelle tre lingue. Il testo intorno cambia.

| Segnaposto | Valore |
| --- | --- |
| "nome tolettatura" | `business.salonName`. Se è vuoto, il soggetto della frase è «il salone», «the salon» o «la peluquería». Dopo una preposizione l’italiano si contrae: «del salone», «al salone», «dal salone». Inglese e spagnolo restano «the salon» e «la peluquería» anche dopo of, at, from, de, a, en. In quella frase non si scrive Groomly. |
| "nome cliente" | Sulla richiesta, il nome di chi ha scritto. Sulle mail Pro, il nome del contatto nella scheda. |
| "nome cane" | Il nome dell’animale. |
| "servizio" | Il servizio, solo nei WhatsApp. |
| "giorno e ora" | Un istante, nella lingua del salone. Italiano: «martedì 4 novembre alle 10:30». Inglese: «Tuesday 4 November at 10:30». Spagnolo: «martes 4 de noviembre a las 10:30». |
| "giorno e fascia oraria" | Giorno, ora di inizio e ora di fine, come già calcolato per conferma e proposta. |
| "giorno e ora chiesti" | Il giorno e l’ora che il cliente aveva chiesto. |
| "ora limite" | L’ora entro cui rispondere, già preceduta da «le», «las» o niente in inglese. |
| "email cliente" | Nella mail della password è l’email dell’account. Nella pagina «richiesta inviata» è l’email di chi ha scritto. |
| "ruolo" | Socio / Collaboratore, Partner / Team member, Socio / Colaborador. |

Sotto il paragrafo delle mail al cliente, e sotto il riepilogo quando c’è, compare la riga "nome tolettatura" · "nome cane", solo con i valori veri. Se il nome del salone manca, la riga mostra solo il cane. Se manca il cane, solo il salone. Se mancano entrambi, la riga non c’è. Le mail dell’account non hanno questa riga.

Se "nome cliente" manca, il saluto è «Ciao,» «Hi,» o «Hola,», senza spazio prima della virgola.

Se in un oggetto c’è il nome del cane e quel nome manca, resta solo la cornice: «Appuntamento confermato», «Un nuovo orario», «Ci vediamo presto!», «È pronto», «Buon compleanno!», «Com’è andata?», «Si è liberato un posto», «Appuntamento disdetto». In inglese: «Appointment confirmed», «A new time», «See you soon!», «Ready for pick-up», «Happy birthday!», «How did it go?», «A slot has opened up», «Appointment cancelled». In spagnolo: «Cita confirmada», «Un nuevo horario», «¡Nos vemos pronto!», «Ya está listo», «¡Feliz cumpleaños!», «¿Qué tal fue?», «Se ha liberado un hueco», «Cita cancelada». L’invito senza nome del salone ha oggetto «Sei invitato su Groomly», «You’re invited to Groomly», «Te invitan a Groomly».

## Dati che partono con la mail

"nome cliente" e "nome cane" sono due campi. Oggi un solo campo `nome` porta a volte l’uno e a volte l’altro.

Sulle mail della richiesta il nome del cliente è quello salvato sulla richiesta e il cane è `richiesta.cane`. Il nome del salone è già letto dal profilo. Conferma e proposta hanno già la fascia oraria, l’orario chiesto e l’ora limite.

Sulle mail Pro il nome del cliente si copia da `contact.name` quando la riga della coda nasce, e si aggiorna se la riga viene ricostruita. Il promemoria conserva l’inizio della visita, in formato ISO, e lo aggiorna se l’appuntamento si sposta. L’orario si formatta al momento dell’invio, nella lingua dei clienti del salone. Una riga vecchia, senza questi campi, parte lo stesso: saluto senza nome e promemoria senza data. Non serve una migrazione.

Il nome del salone nelle mail Pro arriva dal profilo anche quando manca l’email dell’account. Oggi quel nome passa solo insieme al rispondi-a.

Il rispondi-a delle cinque mail della richiesta è lo stesso delle mail Pro: l’email di `accounts/{salonId}`, con il nome del salone. Se quell’email non è valida, la mail parte senza rispondi-a.

Quando il rispondi-a manca, non si promette una risposta. Si toglie la nota «Hai una domanda? Rispondi a questa email, arriva direttamente al salone» e le frasi equivalenti in inglese e spagnolo. Nella recensione si toglie il periodo che invita a rispondere alla mail. Nella disdetta, che non parte, il testo intero resta pronto; la stessa regola vale se un giorno la si invia.

Sotto «Richiesta ricevuta» resta il riepilogo già in uso: cliente, animale, servizi, giorno, durata, prezzo indicativo, telefono del salone e la riga sui prezzi.

## Se un invio fallisce

Non cambia il comportamento di oggi. La richiesta dal sito resta registrata anche se la mail non esce. La proposta di un altro orario non si salva se la mail non parte. Conferma, rifiuto e posto liberato restano scritti anche se la mail fallisce dopo.

## Pulsanti

Restano solo i pulsanti che hanno già un indirizzo vero.

| Mail | Pulsante |
| --- | --- |
| Proposta di orario | Confermo e Non posso. Inglese: Confirm e I can't make it. Spagnolo: Confirmo e No puedo. |
| Recensione | Lascia una recensione. Leave a review. Dejar una reseña. Apre il link Google. |
| Posto libero | Prenota il posto. Book this slot. Reservar el hueco. Apre la pagina del salone su quel giorno e quell’ora. |
| Conferma email | Conferma l’email. Confirm email. Confirmar el correo. |
| Password | Reimposta la password. Reset password. Restablecer la contraseña. |
| Invito | Accetta l’invito. Accept invitation. Aceptar la invitación. |

Non hanno pulsante: richiesta ricevuta, appuntamento confermato, richiesta non accettata, posto liberato, promemoria, cane pronto, auguri, richiesta scaduta, appuntamento disdetto, account eliminato.

Il link in fondo alle mail Pro è «Non voglio più ricevere queste email», «I don't want to receive these emails any more», «No quiero recibir más estos correos». La nota vecchia «Puoi rispondere a questa email: arriva al salone» su queste mail si toglie.

## WhatsApp

Il messaggio finisce con il saluto. Non si aggiunge «Fatto con Groomly», «Made with Groomly» o «Hecho con Groomly».

Se mancano servizio o orario, quelle parti cadono. Non resta una parentesi vuota, una virgola doppia o una virgola prima del punto. Esempio, promemoria senza servizio e senza orario: «Ciao Giulia, ti ricordiamo l’appuntamento di Rex. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!» Lo stesso taglio vale per conferma e richiamo, in tutte e tre le lingue. «Cane pronto» e «Auguri» non hanno servizio né orario.

### Italiano

| Messaggio | Testo |
| --- | --- |
| Promemoria | Ciao "nome cliente", ti ricordiamo l’appuntamento di "nome cane" per "servizio", "giorno e ora". Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto! |
| Conferma | Ciao "nome cliente", ci confermi l’appuntamento di "nome cane" ("servizio") "giorno e ora"? Basta una risposta qui. Grazie! |
| Cane pronto | Ciao "nome cliente", "nome cane" è pronto e ti aspetta. Puoi passare a prenderlo, a tra poco! |
| Richiamo | Ciao "nome cliente", è passato un po’ di tempo: è il momento giusto per riportare "nome cane" per "servizio", "giorno e ora". Scrivici qui per fissare. A presto! |
| Auguri | Ciao "nome cliente", tanti auguri a "nome cane" da tutti noi! Speriamo di vedervi presto. |

### English

| Message | Text |
| --- | --- |
| Reminder | Hi "nome cliente", just a reminder of "nome cane"'s appointment for "servizio", "giorno e ora". If anything comes up, let us know here. Looking forward to seeing you! |
| Confirmation | Hi "nome cliente", could you confirm "nome cane"'s appointment ("servizio") "giorno e ora"? Just reply here. Thank you! |
| Ready for pick-up | Hi "nome cliente", "nome cane" is all done and waiting for you. You can come and pick them up, see you soon! |
| Rebooking | Hi "nome cliente", it's been a little while: it's a good time to bring "nome cane" back for "servizio", "giorno e ora". Message us here to book. See you soon! |
| Birthday | Hi "nome cliente", happy birthday to "nome cane" from all of us! We hope to see you both soon. |

### Español

| Mensaje | Texto |
| --- | --- |
| Recordatorio | Hola "nome cliente", te recordamos la cita de "nome cane" para "servizio", "giorno e ora". Si te surge algún imprevisto, avísanos por aquí. ¡Te esperamos, hasta pronto! |
| Confirmación | Hola "nome cliente", ¿nos confirmas la cita de "nome cane" ("servizio") "giorno e ora"? Basta con responder aquí. ¡Gracias! |
| Listo para recoger | Hola "nome cliente", hemos terminado con "nome cane" y ya te está esperando. Puedes pasar a recogerlo, ¡hasta ahora! |
| Nueva cita | Hola "nome cliente", ya ha pasado un tiempo: es un buen momento para volver a traer a "nome cane" para "servizio", "giorno e ora". Escríbenos por aquí para reservar. ¡Hasta pronto! |
| Cumpleaños | Hola "nome cliente", ¡feliz cumpleaños a "nome cane" de parte de todos nosotros! Esperamos veros pronto. |

## Email della richiesta

Le frasi formali di oggi, quelle con «Si prega di arrivare puntuali» e «non è possibile effettuare il trattamento», si sostituiscono con queste.

La nota delle prime quattro, se il rispondi-a c’è: «Hai una domanda? Rispondi a questa email, arriva direttamente al salone.» Inglese: «Any questions? Just reply to this email and it will go straight to the salon.» Spagnolo: «¿Tienes alguna pregunta? Responde a este correo y llegará directamente a la peluquería.»

La nota di «Posto liberato» è sempre: «Puoi inviare una nuova richiesta dalla pagina del salone.» Inglese: «You can send a new request from the salon's page.» Spagnolo: «Puedes enviar una nueva solicitud desde la página de la peluquería.»

### Italiano

| Email | Oggetto | Testo |
| --- | --- | --- |
| Richiesta ricevuta | Abbiamo ricevuto la tua richiesta | Ciao "nome cliente", grazie per aver scelto "nome tolettatura". La richiesta per "nome cane" è arrivata: ti scriviamo appena il salone risponde. |
| Appuntamento confermato | Appuntamento confermato per "nome cane" | Ciao "nome cliente", buone notizie: "nome tolettatura" ha confermato l’appuntamento di "nome cane", "giorno e fascia oraria". Ti aspettiamo! Se hai un imprevisto, avvisa il salone il prima possibile: così il posto può andare a qualcun altro. |
| Proposta di orario | Un nuovo orario per "nome cane" | Ciao "nome cliente", grazie per la richiesta. L’orario che avevi chiesto ("giorno e ora chiesti") purtroppo non è disponibile, ma "nome tolettatura" può accogliere "nome cane" "giorno e fascia oraria". Ti chiediamo di rispondere entro "ora limite": dopo, il posto verrà liberato. |
| Richiesta non accettata | Aggiornamento sulla tua richiesta | Ciao "nome cliente", ci dispiace: questa volta "nome tolettatura" non riesce ad accogliere la richiesta per "nome cane". Puoi inviarne una nuova per un altro giorno, sarà un piacere ricevervi. |
| Posto liberato | Il posto è stato liberato | Ciao "nome cliente", l’orario proposto per "nome cane" non è più riservato. Se vuoi fissare un altro appuntamento, invia una nuova richiesta a "nome tolettatura": ti aspettiamo. |

### English

| Email | Subject | Text |
| --- | --- | --- |
| Request received | We've received your request | Hi "nome cliente", thank you for choosing "nome tolettatura". Your request for "nome cane" has arrived: we'll let you know as soon as the salon replies. |
| Appointment confirmed | Appointment confirmed for "nome cane" | Hi "nome cliente", good news: "nome tolettatura" has confirmed "nome cane"'s appointment, "giorno e fascia oraria". We look forward to seeing you! If anything comes up, please let the salon know as soon as possible so the slot can go to someone else. |
| New time proposed | A new time for "nome cane" | Hi "nome cliente", thank you for your request. Unfortunately the time you asked for ("giorno e ora chiesti") isn't available, but "nome tolettatura" can see "nome cane" "giorno e fascia oraria". Please reply by "ora limite": after that, the slot will be released. |
| Request declined | An update on your request | Hi "nome cliente", we're sorry: this time "nome tolettatura" isn't able to accept the request for "nome cane". You're welcome to send a new one for another day, it would be a pleasure to see you. |
| Slot released | The slot has been released | Hi "nome cliente", the proposed time for "nome cane" is no longer held. If you'd like to book another appointment, just send a new request to "nome tolettatura": we look forward to seeing you. |

### Español

| Correo | Asunto | Texto |
| --- | --- | --- |
| Solicitud recibida | Hemos recibido tu solicitud | Hola "nome cliente", gracias por elegir "nome tolettatura". Tu solicitud para "nome cane" ha llegado: te escribiremos en cuanto la peluquería responda. |
| Cita confirmada | Cita confirmada para "nome cane" | Hola "nome cliente", buenas noticias: "nome tolettatura" ha confirmado la cita de "nome cane", "giorno e fascia oraria". ¡Te esperamos! Si te surge algún imprevisto, avisa a la peluquería lo antes posible: así el hueco podrá ser para otra persona. |
| Propuesta de horario | Un nuevo horario para "nome cane" | Hola "nome cliente", gracias por tu solicitud. Lamentablemente el horario que pediste ("giorno e ora chiesti") no está disponible, pero "nome tolettatura" puede atender a "nome cane" "giorno e fascia oraria". Te pedimos que respondas antes de "ora limite": después, el hueco quedará libre. |
| Solicitud no aceptada | Novedades sobre tu solicitud | Hola "nome cliente", lo sentimos: esta vez "nome tolettatura" no puede aceptar la solicitud para "nome cane". Puedes enviar una nueva para otro día, será un placer recibiros. |
| Hueco liberado | El hueco ha quedado libre | Hola "nome cliente", el horario propuesto para "nome cane" ya no está reservado. Si quieres pedir otra cita, envía una nueva solicitud a "nome tolettatura": te esperamos. |

## Pagine del sito

La pagina dopo Confermo, dopo Non posso e il link non valido usano la lingua dei clienti del salone, la stessa della mail. Oggi quelle pagine sono solo in italiano.

| Pagina | Italiano | English | Español |
| --- | --- | --- | --- |
| Dopo Confermo | Appuntamento confermato. Grazie! L’appuntamento di "nome cane" da "nome tolettatura" è confermato per "giorno e ora". Ti aspettiamo. | Appointment confirmed. Thank you! "nome cane"'s appointment at "nome tolettatura" is confirmed for "giorno e ora". We look forward to seeing you. | Cita confirmada. ¡Gracias! La cita de "nome cane" en "nome tolettatura" está confirmada para "giorno e ora". Te esperamos. |
| Dopo Non posso | Posto liberato. Va bene, il posto è stato liberato. Se vuoi un altro orario, puoi inviare una nuova richiesta al salone quando vuoi. | Slot released. No problem, the slot has been released. If you'd like a different time, you can send a new request to the salon whenever you like. | Hueco liberado. De acuerdo, el hueco ha quedado libre. Si quieres otro horario, puedes enviar una nueva solicitud a la peluquería cuando quieras. |
| Link non valido | Link non più valido. Potrebbe essere scaduto o già stato usato. Per qualsiasi cosa, contatta direttamente il salone. | This link is no longer valid. It may have expired or already been used. For anything else, please contact the salon directly. | Este enlace ya no es válido. Puede que haya caducado o que ya se haya usado. Para cualquier cosa, contacta directamente con la peluquería. |

Il titolo della pagina è la prima frase, fino al punto. Il resto è il testo.

Sulla pagina di prenotazione, dopo l’invio:

- Italiano: Grazie, richiesta inviata a "nome tolettatura". Non è ancora una prenotazione: la risposta arriverà a "email cliente" (dai un’occhiata anche allo spam). Se il salone conferma il giorno e l’ora che hai chiesto, quella email vale come conferma. Se propone un altro orario, troverai i pulsanti per accettare o rifiutare e il tempo per rispondere: senza risposta, il posto verrà liberato.
- English: Thank you, your request has been sent to "nome tolettatura". This isn't a booking yet: the reply will arrive at "email cliente" (please check your spam folder too). If the salon confirms the day and time you asked for, that email is your confirmation. If they suggest a different time, you'll find buttons to accept or decline and the deadline to reply: without a reply, the slot will be released.
- Español: Gracias, tu solicitud se ha enviado a "nome tolettatura". Todavía no es una reserva: la respuesta llegará a "email cliente" (revisa también la carpeta de spam). Si la peluquería confirma el día y la hora que pediste, ese correo es la confirmación. Si propone otro horario, encontrarás los botones para aceptar o rechazar y el plazo para responder: si no respondes, el hueco quedará libre.

Sopra il pulsante di invio:

- Italiano: Questa è una richiesta, non ancora una prenotazione: il salone la valuterà e ti risponderà via email.
- English: This is a request, not a booking yet: the salon will review it and reply by email.
- Español: Esto es una solicitud, todavía no una reserva: la peluquería la revisará y te responderá por correo.

`hosting/salone/inviata.html` dice, nelle tre lingue che ha già, la stessa frase della richiesta inviata.

## Email del piano Pro

Il promemoria non rimanda a una pagina. Il giorno e l’ora sono nella frase. Se l’inizio della visita manca, si toglie «, "giorno e ora"» in italiano e in spagnolo, e « on "giorno e ora"» in inglese.

### Italiano

| Email | Oggetto | Testo |
| --- | --- | --- |
| Promemoria | Ci vediamo presto, "nome cane"! | Ciao "nome cliente", "nome tolettatura" ti ricorda il prossimo appuntamento di "nome cane", "giorno e ora". Se non riesci a venire, avvisa il salone, così il posto può andare a qualcun altro. A presto! |
| Cane pronto | "nome cane" è pronto! | Ciao "nome cliente", abbiamo finito: "nome cane" è pronto per tornare a casa e puoi passare a prenderlo. Grazie per averlo affidato a "nome tolettatura". |
| Auguri | Buon compleanno, "nome cane"! | Ciao "nome cliente", oggi è un giorno speciale: tutto lo staff di "nome tolettatura" fa tanti auguri a "nome cane". Speriamo di rivedervi presto. |
| Recensione | Com’è andata con "nome cane"? | Ciao "nome cliente", grazie per aver scelto "nome tolettatura". Se sei soddisfatto, una recensione su Google ci aiuta tanto e richiede un minuto. Se invece qualcosa non ti ha convinto, rispondi a questa email: ci teniamo a saperlo. |
| Posto libero | Si è liberato un posto per "nome cane" | Ciao "nome cliente", buone notizie: da "nome tolettatura" si è liberato un posto in un orario che fa per "nome cane". Se ti va, tocca il pulsante per prenotarlo: i posti liberi vanno via in fretta. |

### English

| Email | Subject | Text |
| --- | --- | --- |
| Reminder | See you soon, "nome cane"! | Hi "nome cliente", "nome tolettatura" would like to remind you of "nome cane"'s next appointment on "giorno e ora". If you can't make it, please let the salon know so the slot can go to someone else. See you soon! |
| Ready for pick-up | "nome cane" is ready! | Hi "nome cliente", we're all done: "nome cane" is ready to go home and you can come and pick them up. Thank you for trusting "nome tolettatura". |
| Birthday | Happy birthday, "nome cane"! | Hi "nome cliente", today is a special day: everyone at "nome tolettatura" wishes "nome cane" a very happy birthday. We hope to see you both again soon. |
| Review | How did it go with "nome cane"? | Hi "nome cliente", thank you for choosing "nome tolettatura". If you're happy with our work, a Google review helps us a lot and only takes a minute. If something wasn't quite right, just reply to this email: we'd really like to know. |
| Slot available | A slot has opened up for "nome cane" | Hi "nome cliente", good news: a slot has opened up at "nome tolettatura" at a time that suits "nome cane". If you'd like it, tap the button to book: free slots go quickly. |

### Español

| Correo | Asunto | Texto |
| --- | --- | --- |
| Recordatorio | ¡Nos vemos pronto, "nome cane"! | Hola "nome cliente", "nome tolettatura" te recuerda la próxima cita de "nome cane", "giorno e ora". Si no puedes venir, avisa a la peluquería para que el hueco pueda ser para otra persona. ¡Hasta pronto! |
| Listo para recoger | ¡"nome cane" ya está listo! | Hola "nome cliente", hemos terminado: "nome cane" ya puede volver a casa y puedes pasar a recogerlo. Gracias por confiar en "nome tolettatura". |
| Cumpleaños | ¡Feliz cumpleaños, "nome cane"! | Hola "nome cliente", hoy es un día especial: todo el equipo de "nome tolettatura" le desea un muy feliz cumpleaños a "nome cane". Esperamos volver a veros pronto. |
| Reseña | ¿Qué tal le fue a "nome cane"? | Hola "nome cliente", gracias por elegir "nome tolettatura". Si estás contento con nuestro trabajo, una reseña en Google nos ayuda mucho y solo lleva un minuto. Si algo no te convenció, responde a este correo: nos importa saberlo. |
| Hueco disponible | Se ha liberado un hueco para "nome cane" | Hola "nome cliente", buenas noticias: en "nome tolettatura" se ha liberado un hueco en un horario que le viene bien a "nome cane". Si te interesa, toca el botón para reservarlo: los huecos libres vuelan. |

## Testi pronti e non inviati

Si aggiornano le frasi. Non si aggiunge la chiamata che le spedisce.

| Email | Oggetto | Testo |
| --- | --- | --- |
| Richiesta scaduta | La tua richiesta è scaduta | Ciao "nome cliente", ci dispiace: la richiesta per "nome cane" a "nome tolettatura" è scaduta perché il salone non è riuscito a rispondere in tempo. Puoi inviarne una nuova quando vuoi. |
| Appuntamento disdetto | Appuntamento di "nome cane" disdetto | Ciao "nome cliente", l’appuntamento di "nome cane" da "nome tolettatura" è stato disdetto. Quando vuoi fissarne un altro, invia una nuova richiesta o rispondi a questa email. A presto. |

Inglese. Oggetti: «Your request has expired», «"nome cane"'s appointment cancelled». Testi: «Hi "nome cliente", we're sorry: the request for "nome cane" to "nome tolettatura" has expired because the salon wasn't able to reply in time. You can send a new one whenever you like.» e «Hi "nome cliente", "nome cane"'s appointment at "nome tolettatura" has been cancelled. Whenever you'd like to book another, send a new request or reply to this email. See you soon.»

Spagnolo. Oggetti: «Tu solicitud ha caducado», «Cita de "nome cane" cancelada». Testi: «Hola "nome cliente", lo sentimos: la solicitud para "nome cane" a "nome tolettatura" ha caducado porque la peluquería no pudo responder a tiempo. Puedes enviar una nueva cuando quieras.» e «Hola "nome cliente", la cita de "nome cane" en "nome tolettatura" ha sido cancelada. Cuando quieras pedir otra, envía una nueva solicitud o responde a este correo. Hasta pronto.»

## Email dell’account

La nota vecchia sotto conferma email e invito si toglie: il documento non la ha. Nella password l’avviso «se non sei stato tu» sta nel corpo.

| Email | Oggetto | Testo | Pulsante |
| --- | --- | --- | --- |
| Conferma | Benvenuto su Groomly, conferma la tua email | Ciao e benvenuto! Manca solo un passaggio: tocca il pulsante per confermare il tuo indirizzo, poi torna all’app e inizia a lavorare. | Conferma l’email |
| Password | Reimposta la tua password | Ciao, abbiamo ricevuto una richiesta per reimpostare la password dell’account "email cliente". Tocca il pulsante per sceglierne una nuova. Se non sei stato tu, ignora pure questa email: la password resta quella di prima. | Reimposta la password |
| Invito | "nome tolettatura" ti invita su Groomly | Ciao! "nome tolettatura" ti ha invitato a far parte del team come "ruolo". Tocca il pulsante ed entra con questo stesso indirizzo email. Buon lavoro! | Accetta l’invito |
| Account eliminato | Il tuo account Groomly è stato eliminato | Ciao, ti confermiamo che l’account di "nome tolettatura" è stato eliminato, insieme ai dati del salone gestiti da Groomly. I file che avevi salvato sul telefono o sul tuo Google Drive restano tuoi. Grazie per aver lavorato con noi: se un giorno vorrai tornare, ti aspettiamo. Se non sei stato tu, scrivi subito a info@groomlyapp.it. | nessuno |

Inglese. Oggetti: «Welcome to Groomly, please confirm your email», «Reset your password», «"nome tolettatura" has invited you to Groomly», «Your Groomly account has been deleted». Testi: «Hi and welcome! Just one more step: tap the button to confirm your address, then go back to the app and get started.» «Hi, we received a request to reset the password for the account "email cliente". Tap the button to choose a new one. If this wasn't you, you can safely ignore this email: your password will stay the same.» «Hi! "nome tolettatura" has invited you to join the team as "ruolo". Tap the button and sign in with this same email address. Enjoy working together!» «Hi, this is to confirm that the "nome tolettatura" account has been deleted, together with the salon data managed by Groomly. Any files you saved on your phone or Google Drive remain yours. Thank you for working with us: if you ever want to come back, we'll be glad to have you. If this wasn't you, please write to info@groomlyapp.it straight away.»

Spagnolo. Oggetti: «Bienvenido a Groomly, confirma tu correo», «Restablece tu contraseña», «"nome tolettatura" te invita a Groomly», «Tu cuenta de Groomly ha sido eliminada». Testi: «¡Hola y bienvenido! Solo falta un paso: toca el botón para confirmar tu dirección, luego vuelve a la app y empieza a trabajar.» «Hola, hemos recibido una solicitud para restablecer la contraseña de la cuenta "email cliente". Toca el botón para elegir una nueva. Si no has sido tú, puedes ignorar este correo: tu contraseña seguirá siendo la misma.» «¡Hola! "nome tolettatura" te ha invitado a unirte al equipo como "ruolo". Toca el botón y entra con esta misma dirección de correo. ¡Buen trabajo!» «Hola, te confirmamos que la cuenta de "nome tolettatura" ha sido eliminada, junto con los datos de la peluquería gestionados por Groomly. Los archivos que guardaste en tu teléfono o en tu Google Drive siguen siendo tuyos. Gracias por trabajar con nosotros: si algún día quieres volver, te esperamos. Si no has sido tú, escribe cuanto antes a info@groomlyapp.it.»

L’eliminazione dell’account è la lettera separata, non il modello delle altre mail. Oggetto e corpo diventano questi. Resta il logo e l’indirizzo info@groomlyapp.it.

## Verifica

Le prove, in italiano, inglese e spagnolo, controllano:

- il testo pieno e il testo con nome del cliente, nome del salone, servizio, orario o data mancanti, senza buchi nella frase;
- gli oggetti con e senza nome del cane;
- l’assenza dei pulsanti tolti e la presenza di Confermo, Non posso, Prenota il posto, Lascia una recensione e dei pulsanti dell’account;
- la nota «rispondi al salone» solo quando il rispondi-a c’è, e il rispondi-a uguale all’email dell’account;
- il WhatsApp senza la riga «Fatto con Groomly»;
- una riga di coda vecchia, senza nome del cliente e senza inizio visita, che parte lo stesso;
- il riepilogo ancora presente sotto la richiesta ricevuta;
- le pagine dopo Confermo e Non posso nella lingua dei clienti del salone.
