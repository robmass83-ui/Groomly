# Richieste di prenotazione in app

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

Data: 27 ottobre 2026.

Una richiesta inviata da groomlyapp.it arriva sulla home del salone. La toelettatura accetta l’orario chiesto, propone un altro orario, oppure rifiuta. L’accettazione crea l’appuntamento e, se serve, il profilo. La proposta tiene il nuovo orario solo per il tempo della risposta. Le schermate usano i token di `src/theme/tokens.css`, le card e i pulsanti già dell’app.

Oggi la richiesta si salva in `salons/{id}/richieste` con stato `nuova`, ma la home non la mostra. `RiquadroRichieste` non è montato. `listenRichiesteNuove` restituisce solo id, nome della persona e token. `gestisciPrenotazione` cambia lo stato e non crea né l’appuntamento né il profilo.

## Fuori da questo lavoro

- Il listino, gli orari del salone e quali specie si accettano. Restano come sono.
- La durata pubblica resta 60 minuti, con inizi all’ora.
- L’avviso Pro in home e la card «Accetta {{nome}}» non si riusano. La riga nuova è quella descritta sotto.
- Non si promette una mail se l’invio non è riuscito.

## Chi agisce

Titolare, socio e collaboratore del salone vedono le richieste in home e possono accettare, proporre o rifiutare. Il cliente non entra nell’app: conferma o rifiuta da un link nella mail.

## Home

Sopra l’agenda di oggi, una card sola con una riga per richiesta ancora `nuova`. Altezza circa 48 pixel, testo 13 e 12, niente foto e poco vuoto.

Prima riga: «Mario chiede per Rex». Seconda: «mer 28 ott · 17:00 · Cane». A destra il chevron. Il tocco apre il riquadro. Specie e nome animale vengono dalla richiesta. Se manca il nome dell’animale si usa «l’animale».

La riga sparisce quando la richiesta non è più `nuova`.

## Riquadro al centro

Si apre sopra la home, al centro, chiudibile con la X.

Titolo: Richiesta. Testo: «Mario Rossi chiede un appuntamento per Rex». Poi giorno e fascia, per esempio «mercoledì 28 ottobre · 17:00–18:00». Sotto: specie, razza, taglia, telefono, email. Le foto, se ci sono, sono miniature da 56 pixel. La prima è il ritratto del profilo nuovo.

Se a quell’ora c’è già una visita definitiva, una riga lo dice. Accetta resta attivo e scrive comunque l’appuntamento: le richieste in attesa non occupano il posto, quindi due clienti possono aver chiesto la stessa ora e decide il salone.

Sezione Animale. Una voce «Nuovo profilo». Le altre sono gli animali con lo stesso telefono oppure la stessa email, confrontati sulle cifre del telefono e sull’email in minuscolo. Il nome non sceglie da solo. Un deceduto non compare. Uno in archivio compare con la scritta Archivio. Manca una scelta: Accetta e Proponi restano spenti. Il rifiuto no. L’animale in archivio torna tra gli attivi solo quando l’appuntamento diventa definitivo. Se la proposta scade o viene rifiutata, resta in archivio.

Tre azioni:

- Accetta. Vale l’orario chiesto.
- Proponi un altro orario. Nello stesso riquadro compaiono giorno e ora, solo tra i posti liberi. Non apre un’altra pagina.
- Rifiuta.

## Accetta

Nasce un appuntamento definitivo, stato `programmato`, sull’orario chiesto, durata un’ora. Occupa l’agenda e il sito come le altre visite.

Animale già scelto: `dogId` è il suo. Profilo nuovo: nasce subito, con nome, specie, razza, taglia, telefono, email, nome del proprietario e la prima foto. Le altre foto vanno in galleria. `clientType` è `occasionale`. Il campo `daRevisionare` è vero. La richiesta diventa `accettata`.

La mail al cliente è la conferma, senza Conferma e senza Rifiuta. Se la mail non parte, l’appuntamento resta e la toelettatura vede che l’email non è partita.

## Proponi

Nasce un appuntamento provvisorio sull’orario proposto. In agenda, nel giorno e nella settimana, ha lo sfondo ambra `--warn-s`, il testo «Da confermare» e l’ora limite, per esempio «entro le 18:00». Il nome è quello del profilo collegato, oppure il nome scritto nella richiesta se il profilo è ancora da creare.

L’animale già scelto è collegato subito. Il profilo nuovo non nasce. Sulla richiesta restano la scelta «nuovo» e i dati per crearlo dopo.

Quel posto è occupato sul sito e in agenda fino a `scadeIl`. Le altre richieste `nuova` non occupano nulla. Proponi offre solo orari liberi in quel momento.

La mail ha Conferma e Rifiuta e il tempo esatto. Il conto parte solo se la mail è partita. Se non parte, non si crea l’appuntamento provvisorio, la richiesta resta `nuova` in home e il riquadro dice «Email non inviata».

## Tempi

Il tempo si misura da quando la mail della proposta parte, in Europe/Rome, e non supera l’inizio dell’appuntamento.

| Distanza dell’appuntamento | Tempo per rispondere |
| --- | --- |
| Stesso giorno di calendario | 15 minuti |
| Il giorno di calendario successivo | 1 ora |
| Inizio tra più di 48 ore | 24 ore |
| Né il giorno dopo né oltre le 48 ore | 1 ora |

Se il tempo residuo fino all’inizio è più corto, la mail dice quell’ora. Se l’inizio è già passato, quell’orario non si può proporre.

## Il cliente risponde

I link usano il token già sulla richiesta. Si usano una volta. Non chiedono login.

Conferma: l’appuntamento diventa definitivo. Se la scelta era un profilo nuovo, nasce allora con `daRevisionare` e va in Nuovi. La richiesta diventa `accettata`. La pagina dice «Appuntamento confermato» con salone, animale, giorno e ora.

Rifiuto, oppure silenzio fino a `scadeIl`: l’appuntamento provvisorio esce dall’agenda. Il posto torna libero subito, anche prima della pulizia. Non nasce un profilo nuovo. Un animale già collegato resta com’era, senza quella visita. La richiesta diventa `rifiutata` o `scaduta`. Al cliente arriva una mail breve: il posto è stato liberato. La pagina dice «Posto liberato».

Un link già usato o aperto dopo la scadenza mostra «Posto liberato» e non cambia altro.

## Rifiuta dalla home

Nessun appuntamento e nessun profilo. La richiesta diventa `rifiutata`. La mail dice che il salone non può accettare, senza pulsanti.

## Scheda Nuovi

In Animali, dopo Occasionali e prima di Archivio: Attivi, Mensili, Occasionali, Nuovi, Archivio.

Nuovi mostra gli animali attivi con `daRevisionare`. Il numero è un bollino blu sul tab, non il conteggio grigio degli altri tab. In Attivi, Mensili e Occasionali questi animali non compaiono.

La riga ha foto o iniziale, nome, razza, proprietario e «da rivedere». Aprire la scheda, completare i dati e salvare toglie `daRevisionare`. L’animale esce da Nuovi e segue le schede normali: in Attivi e, finché è occasionale, anche in Occasionali.

## Sito

Dopo l’invio il riquadro non usa il verde di una conferma. Il testo, con il nome del salone e l’email scritta dal cliente:

«Richiesta inviata a CANESPA. Non è ancora una prenotazione.

L’esito arriva a mario@email.it. Controlla quella casella, anche nello spam.

Se il salone conferma il giorno e l’orario che hai chiesto, quella mail è la conferma.

Se propone un altro orario, nella mail trovi Conferma e Rifiuta e il tempo che hai per rispondere. Se non confermi né rifiuti entro quel tempo, il posto viene liberato.»

Le lingue inglese e spagnolo dicono la stessa cosa.

## Pulizia

`postiLiberi` ignora un provvisorio il cui `scadeIl` è passato, così il sito lo libera all’istante. Un lavoro ogni cinque minuti segna `scaduta`, toglie l’appuntamento e manda la mail di posto liberato una volta sola.

## Prove

- Una richiesta `nuova` compare in home con proprietario, animale, giorno, ora e specie, senza foto. Il tocco apre il riquadro con foto e contatti.
- Due richieste per la stessa ora restano entrambe accettabili. Accetta ne scrive una in agenda anche se l’altra è ancora in home.
- Accetta con profilo nuovo crea l’appuntamento definitivo e l’animale solo in Nuovi. Il salvataggio della scheda lo porta in Attivi.
- Accetta con un animale già presente non crea un secondo profilo. Con uno in archivio lo riporta attivo. Un deceduto non è in lista.
- Proponi su un orario libero crea il provvisorio ambra, occupa il posto e non crea il profilo. Allo scadere il posto torna libero e il profilo nuovo non esiste.
- La mail della proposta contiene Conferma, Rifiuta e il tempo: 15 minuti lo stesso giorno, 1 ora il giorno dopo, 24 ore oltre le 48 ore, 1 ora nel caso in mezzo, mai oltre l’inizio.
- Conferma dal link rende definitivo l’appuntamento e, se serviva, crea il profilo in Nuovi. Un secondo tocco non duplica.
- Rifiuto dal link e rifiuto dalla home non lasciano appuntamento né profilo nuovo.
- Se la mail della proposta non parte, la richiesta resta in home e non c’è un provvisorio.
- Il messaggio sul sito non dice che la prenotazione è già confermata.
