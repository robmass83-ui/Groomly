# Audit di Groomly

Resoconto del 28 ottobre 2026, sul codice della versione `1.1.123`. Nessun file dell’app è stato modificato per questa lettura. Non è stato fatto un giro sull’app in produzione né sul progetto Firebase live: ogni voce qui sotto è un percorso che il sorgente attuale esegue, con la condizione che lo fa partire e il risultato a cui arriva.

`docs/archive/SECURITY-AUDIT.md`, scritto lo stesso giorno, non va più usato come elenco aperto. Nel codice di adesso sono già chiusi: la prenotazione pubblica senza giorno e ora, la conferma della visita con una semplice apertura del link, il controllo operatore senza email verificata, il suggerimento senza tetto e con email scelta dal client, la scansione di tutti gli account dentro `prendiPushTelefono`, e l’APK di aggiornamento da un host qualsiasi. Quelle correzioni non sono ripetute qui come problemi.

## Come è ordinato

| Priorità | Significato |
| --- | --- |
| Critica | In uso normale il sito vende un orario già occupato in agenda. |
| Alta | Soldi, privacy, email dopo un rifiuto, o un piano pagato che non si accende. Succede nel percorso che il salone usa davvero. |
| Media | Succede per un ruolo preciso, dopo un errore, o con un abuso delimitato. Il dato o la schermata restano sbagliati finché qualcuno non interviene. |
| Bassa | Succede solo fuori dal fuso italiano, oppure è un job che non fa nulla mentre un altro job fa il lavoro. |

In fondo c’è l’ordine in cui conviene chiuderli, e l’elenco di ciò che è stato letto e regge.

---

## Critica

### 1. Le visite fissate in app non occupano il sito — chiuso

La visita fissata nell’app ora salva la fine, calcolata dai servizi. Una visita già in archivio senza fine occupa lo stesso l’ora: il sito la ricava dai servizi. Una fine già scritta e più lunga dei servizi (prenotazione online) non viene accorciata se non si cambia la durata; se si sposta solo l’inizio, quella durata resta. Gli impegni personali e le disdette non occupano il sito.

**Cosa non funzionava.** Un appuntamento creato o modificato dall’app non toglieva quell’ora dalla pagina pubblica.

**Quando succede.** Ogni visita normale. Il salvataggio scrive `start` e l’elenco `services`. Il campo `end` viene scritto solo se l’appuntamento lo ha già, e il flusso di creazione non lo imposta.

**Perché.** La pagina pubblica considera occupata una visita solo se il documento ha sia `start` sia `end`. Se manca `end`, la visita viene scartata. Il commento nel file dice che le visite dell’app hanno già `end`: non è vero per quelle nate dal form.

**Dove finisce.** Il cliente online vede l’ora libera e può inviare una richiesta sullo stesso orario di un cane già in agenda. Il salone si ritrova due impegni sovrapposti: uno già fissato in app, uno appena arrivato dal sito. Le chiusure del salone e le proposte con visita provvisoria, quelle sì, hanno le date giuste e bloccano il giorno o l’ora.

**Dove sta.** `src/lib/firebaseMap.ts` (`appointmentToDoc`, `end` solo se già presente), `src/data/local/appointments.ts` (`appointmentFromWrite` non assegna `end`), `functions/src/piano/postiLiberi.ts` (`voce` e `appuntamentoOccupato`).

---

## Alta

### 2. Due clienti prenotano la stessa ora, e Accetta le conferma tutte e due — chiuso

Una richiesta ancora «nuova» tiene l’ora sul sito, anche se non ha scadenza e anche se le manca la fine ma ha la durata. Accetta controlla che l’ora sia libera e non conta la richiesta che si sta confermando. La scrittura della richiesta e della visita rilegge gli impegni nella stessa transazione: la seconda chiamata, se l’ora è stata presa nel frattempo, non crea un’altra visita. In scheda, se c’è già una visita o un’altra richiesta sulla stessa ora, compare l’avviso e Accetta resta spento. Proponi un altro orario e Rifiuta restano disponibili. Una proposta, un rifiuto e una disdetta non tengono l’ora da soli.

**Cosa non funzionava.** Una richiesta ancora «nuova» non teneva l’ora. Accettarla non controllava se l’ora era libera e la scheda lasciava Accetta acceso.

**Quando succedeva.** Due persone sceglievano lo stesso giorno e la stessa ora sulla pagina pubblica, oppure il salone accettava una richiesta su un orario che nel frattempo era stato occupato. Il tetto antispam (2 richieste aperte per telefono, 2 per email, 20 per salone) non c’entra con l’orario: conta i documenti, non gli slot.

**Perché.** `orariLiberi` riceveva le richieste e non le usava. Verso il calendario pubblico passavano solo le richieste con `scadeIl`, cioè le proposte, non le «nuova». All’accettazione `orarioLibero` veniva calcolato solo per «Proponi un altro orario». `applicaPiano` creava la visita senza guardare le altre, e il controllo «ora libera, poi scrivi» non era nella stessa transazione.

**Dove finiva.** Nascevano due visite `programmato` allo stesso orario.

**Dove sta.** `src/lib/disponibilita.ts` (`orariLiberi`), `functions/src/piano/postiLiberi.ts` (`richiestaOccupata`), `functions/src/piano/gestisciPrenotazione.ts`, `functions/src/piano/inviaRichiesta.ts`, `src/lib/pianoRichiesta.ts`, `src/components/piano/RiquadroRichiesta.tsx`.

### 3. La visita nata dal sito dura un’ora e costa zero, anche se il cliente ha chiesto altro — chiuso

La visita creata da Accetta o da una proposta copia i servizi scelti online: nome, minuti e prezzo. Se la richiesta non ha voci leggibili, resta la riga «Toelettatura» a 0 €. Quando il cliente conferma una proposta che ha ancora quella riga, e la richiesta ha i servizi veri, la visita li riceve. Una visita già salvata con la fine più lunga dei servizi occupa quella fine in agenda, nel form e nel conteggio dei minuti: «da chiudere» scatta un’ora dopo quella fine, non un’ora dopo i 60 minuti della riga. Il prezzo di una visita già accettata prima di questa correzione resta 0, perché sul documento della visita non era stato scritto.

**Cosa non funzionava.** Servizi, prezzi e durata scelti online non finivano sulla visita.

**Quando succedeva.** Il salone accettava una richiesta, o il cliente confermava una proposta. La richiesta in Firestore aveva `voci`, `totaleIndicativo` e `durataMin`. `leggiRichiesta` teneva la durata e ignorava voci e totale. La visita veniva scritta con una riga fissa: «Toelettatura», 60 minuti, prezzo 0. `start` e `end` rispettavano già la durata vera.

**Dove finiva.** In scheda il salone vedeva «Toelettatura» a 0 €. In agenda e nel form la durata era la somma dei servizi, quindi un’ora. «Da chiudere» scattava un’ora dopo quei 60 minuti.

**Dove sta.** `src/lib/pianoRichiesta.ts` (`vociSalvate`, `serviziDellaRichiesta`), `functions/src/piano/gestisciPrenotazione.ts`, `src/lib/appointments.ts` (`fineVisita`, `minutiInGriglia`), `src/pages/CalendarPage.tsx`, `src/pages/AppointmentForm.tsx`.

### 4. «Usa premio» non vale se la visita si chiude dalla home — chiuso

Chiudere la visita, da home o dalla scheda, con «Usa premio» già premuto per quel cane, azzera il totale, scrive «Premio fedeltà» e toglie solo il segno di quel cane. Senza il segno, con la fedeltà spenta o senza completare, prezzo e segno restano. Il pulsante sulla tessera resta visibile quando i timbri segnati sono almeno 10.

**Cosa non funzionava.** Il premio fedeltà si applicava solo chiudendo dalla scheda dell’appuntamento.

**Quando succedeva.** Sulla scheda del cane si preme «Usa premio». Quello scrive `premiInAttesa` per quel cane e non cambia ancora la visita. Poi la visita si chiudeva dal riquadro in home, che è il gesto abituale a fine giornata.

**Perché.** `AppointmentPage` vedeva il premio, metteva il totale a 0, scriveva la nota «Premio fedeltà» e toglieva il segno. `HomePage.finishClose` salvava il prezzo del dialogo e non leggeva `premiInAttesa`.

**Dove finiva.** Il cliente pagava il prezzo pieno. La nota premio non c’era, quindi `ricalcolaFedelta` contava un timbro in più invece di un premio usato. Il segno `premiInAttesa` restava: la prossima chiusura fatta dalla scheda poteva azzerare un’altra visita, non quella che doveva essere il premio.

**Dove sta.** `src/lib/fedelta.ts` (`applicaPremioInChiusura`), `src/pages/HomePage.tsx` (`finishClose`), `src/pages/AppointmentPage.tsx` (`saveCloseOf`), `src/pages/DogPage.tsx` (pulsante che accende `premiInAttesa`).

### 5. Il collaboratore vede gli incassi di tutto il salone

**Cosa non funziona.** La frase del prodotto dice che il collaboratore vede solo i propri incassi. Due schermate non la rispettano.

**Quando succede.** Un collaboratore apre la home, oppure da Incassi apre Statistiche. Le pagine `/incassi` e `/incassi/report` filtrano con `visibleAppointments`. La home e le statistiche no.

**Dove finisce.** Il riquadro «incassi di oggi» in home è la somma del salone. Aprendolo, la pagina incassi mostra solo le sue visite: i due numeri non tornano. In Statistiche, euro all’ora, previsione e clienti in ritardo comprendono le visite degli altri. Il link Statistiche sta nel report, che il collaboratore può aprire.

**Dove sta.** `src/i18n/it.ts` (`proRuoloDettaglio`), `src/pages/HomePage.tsx` (`earnedOn(appointments, …)`), `src/pages/StatistichePage.tsx`, `src/pages/EarningsPage.tsx` e `src/pages/EarningsReportPage.tsx` (qui il filtro c’è), `src/lib/salonAccess.ts` (`visibleAppointments`).

### 6. Un salvataggio vecchio delle impostazioni cancella quello più nuovo

**Cosa non funziona.** Due telefoni che salvano le impostazioni del salone: vince l’ultimo arrivo, anche se è una copia più vecchia.

**Quando succede.** Il telefono A ha in memoria orari, listino, coda email o fedeltà. Il telefono B salva dopo. Il telefono A, ancora con la copia precedente, salva di nuovo (un toggle, un orario, la coda). `updatedAt` di A è precedente a quello già in cloud.

**Perché.** Cani e visite, prima di scrivere, guardano `updatedAt` e non sovrascrivono un documento più nuovo. `putSettings` fa il contrario: scrive subito `settings/main` e, se la copia è vecchia, salta solo la pulizia dei file del listino. Il documento è già stato sostituito.

**Dove finisce.** Orari, servizi email, premi in attesa, listino e nome del salone tornano alla versione vecchia. L’altro telefono li vede cambiare senza che nessuno li abbia rimessi a mano.

**Dove sta.** `src/data/firebase/client.ts` (`putSettings` contro `saveWithMedia` / `isStaleWrite`).

### 7. Cambiando account, la home mostra ancora i numeri del salone precedente

**Cosa non funziona.** Uscendo e rientrando con un altro account, la lista del giorno si nasconde, i riquadri no.

**Quando succede.** Sulla stessa apertura dell’app, logout e login di un altro salone, oppure cambio utente senza chiudere il processo. `useAppointments` e `useDogs` riempiono lo stato una volta sola. Al cambio di `uid` partono i listener nuovi e `synced` torna falso, ma l’elenco in memoria non viene svuotato. `useClosures` invece ricarica subito: gli altri hook no. `useSettings` abbassa `ready` e lascia le impostazioni precedenti finché non arriva Firestore.

**Dove finisce.** La lista dice «Carico l'agenda…». Il riquadro di oggi continua a mostrare quanti appuntamenti e quanti minuti c’erano nell’altro salone. L’incasso di oggi si nasconde solo se è 0: se l’altro salone aveva già incassato, il nuovo accesso vede quella cifra finché non arriva lo snapshot. È il caso del telefono condiviso in salone.

**Dove sta.** `src/hooks/useAppointments.ts`, `src/hooks/useDogs.ts`, `src/hooks/useSettings.tsx`, `src/pages/HomePage.tsx` (lista condizionata da `attesaSalone`, riquadri no), `src/lib/finestraAgenda.ts` (`mostraIncassoZero`).

### 8. «Non voglio più queste email» non ferma un invio già fallito

**Cosa non funziona.** Il link di silenzio blocca il cane e ferma le righe ancora `in_coda`. Una riga `non_inviata` resta inviabile.

**Quando succede.** Brevo ha già rifiutato un promemoria, un «è pronto», un augurio, una recensione o un posto libero. La riga è `non_inviata` con motivo `posta`. Il cliente apre il link «non voglio più ricevere queste email». Il cane prende `emailBloccata: true`. Al giro dopo, il cane risulta inattivo e le righe `in_coda` si chiudono. `non_inviata` non è tra quelle. `righeDelGiro` la rimette `in_coda` e `inviaCoda` la spedisce.

**Dove finisce.** Il cliente riceve comunque il messaggio che aveva rifiutato, appena la posta torna disponibile. Il test del silenzio fissa questo comportamento: la riga `non_inviata` non viene riscritta.

**Dove sta.** `src/lib/codaEmail.ts` (`bloccaCane`), `functions/src/piano/silenzioEmail.ts`, `src/lib/righeServizio.ts` (`chiudiCaniInattivi`, solo `in_coda`), `functions/src/piano/inviaCoda.ts` (`righeDelGiro`).

### 9. Un pagamento Play non accende e non spegne il piano

**Cosa non funziona.** Il webhook RevenueCat registra che l’evento è arrivato e non tocca il piano del salone.

**Quando succede.** RevenueCat chiama il webhook con la chiave giusta e un evento nuovo. La function risponde 200 e scrive solo `rcEventi/{id}` con la data. Non chiama `scriviPiano` e non legge l’abbonamento.

**Dove finisce.** Chi paga, rinnova o disdice da Play resta con il piano che aveva prima, finché un operatore non lo cambia a mano da Utenti. Prenotazioni online, coda e le altre funzioni legate al piano non seguono il pagamento.

**Dove sta.** `functions/src/piano/rcWebhook.ts`, `functions/src/piano/rcWebhookHttp.ts`.

---

## Media

### 10. Trecento email al giorno per tutti i saloni insieme

**Cosa non funziona.** Il tetto di 300 invii non è per salone.

**Quando succede.** Ogni giro della coda legge `sistema/postaGiorno` e somma gli invii di tutti i saloni nello stesso contatore. L’ordine dei saloni è quello di `listDocuments`.

**Dove finisce.** Quando la somma arriva a 300, i saloni ancora da elaborare quel giorno non partono: le righe restano in coda o `non_inviata` fino al giorno dopo, anche se quel salone non ha mandato nulla. Con un solo salone il tetto è largo. Con più saloni attivi, uno che manda tante mail di servizio ferma gli altri.

**Dove sta.** `src/lib/promemoriaEmail.ts` (`TETTO_EMAIL_GIORNO`), `functions/src/piano/giraCoda.ts` (`emailOggi`, il ciclo sui saloni), `functions/src/piano/inviaCoda.ts`.

### 11. Un orario disdetto, saltato o già chiuso non si può rifissare dal form

**Cosa non funziona.** Nel form di una visita nuova, gli orari di partenza già usati da una visita dello stesso giorno sono disabilitati, qualunque sia lo stato.

**Quando succede.** Quel giorno c’è una visita `disdetto`, `non_venuto` o `completato` che copre lo slot. Il filtro toglie solo gli impegni personali, non gli stati chiusi. Il pulsante ha `disabled` se lo slot è preso.

**Dove finisce.** Il salone non può scegliere di nuovo quell’ora. Deve spostare o cancellare la visita vecchia, anche se il cane non è venuto o la visita è già chiusa e l’ora è libera.

**Dove sta.** `src/pages/AppointmentForm.tsx` (`dayVisits`, `busy`, pulsanti ora).

### 12. I servizi di una visita già chiusa si possono ancora cambiare

**Cosa non funziona.** «Correggi chiusura» è il percorso previsto per totale, tempo e nota. I chip dei servizi restano attivi anche con stato `completato`.

**Quando succede.** Si apre la scheda di una visita chiusa e si toglie o si aggiunge un servizio. `saveServices` riscrive `services`. Le regole Firestore impediscono al collaboratore di cambiare `total`, metodo, durata effettiva, stato e assegnatario; i servizi non sono in quell’elenco, quindi passano. Se in chiusura il prezzo era uguale al preventivo, `total` resta vuoto e l’incasso è la somma dei servizi.

**Dove finisce.** L’incasso del giorno e lo storico cambiano senza passare da «Correggi chiusura». La durata in agenda, che dipende dai servizi, cambia anche per una visita già fatta. Se invece in chiusura era stato scritto un `total` diverso dal preventivo, il numero in incassi resta quello, ma l’elenco servizi in scheda no: scheda e incasso non descrivono più la stessa visita.

**Dove sta.** `src/pages/AppointmentPage.tsx` (`toggleService`, `saveServices`, `done` non li blocca), `src/lib/closeVisit.ts` (`total` nullo se il prezzo non cambia), `firestore.rules` (`completedFieldsHeld`).

### 13. Il collaboratore crea una chiusura che esiste solo sul suo telefono

**Cosa non funziona.** Il menu «+» offre «Chiusura» anche al collaboratore. Firestore accetta la scrittura di `closures` solo a titolare e socio.

**Quando succede.** Il collaboratore compila la chiusura e salva. Il telefono la scrive in locale e la tiene nella sessione anche se lo snapshot cloud non la contiene. La chiamata cloud viene rifiutata. Il foglio non si chiude, perché l’errore arriva dopo la scrittura locale.

**Dove finisce.** Su quel telefono il giorno risulta chiuso. Sugli altri telefoni, in agenda condivisa e sulla pagina pubblica il giorno è aperto. I clienti possono prenotare un giorno che il collaboratore crede chiuso.

**Dove sta.** `src/pages/ShellFrame.tsx` (`newClosure` senza controllo del ruolo), `src/hooks/useClosures.ts` (`save`), `firestore.rules` (`ownerRank` su `closures`).

### 14. Alcuni salvataggi del collaboratore sembrano riusciti e non restano

**Cosa non funziona.** L’interfaccia aggiorna subito e `save` delle impostazioni risponde subito `true`. Il rifiuto di Firestore arriva dopo, con un avviso generico, e al prossimo snapshot i valori tornano quelli del salone.

**Quando succede.** Il collaboratore, in Account → Privacy, accende promozioni o metriche, oppure salva il telefono di recupero. Gli stessi campi sono il documento `settings/main` di tutto il salone, e le regole lo fanno scrivere solo a titolare e socio. Lo stesso schema vale per `/listino/stampa`: prezzi e gestione del listino sono nascosti al collaboratore, la stampa no, e salva comunque `priceSheet` dentro le impostazioni.

**Dove finisce.** Il toggle resta acceso finché i dati non si riallineano. Poi si rispegne. Il collaboratore ha visto un successo. Il telefono di recupero che credeva di aver salvato non c’è.

**Dove sta.** `src/hooks/useSettings.tsx` (`save`), `src/pages/AccountPage.tsx` (toggle privacy e telefono di recupero; la sezione toelettatura è già nascosta), `src/app/router.tsx` (`/listino/stampa` senza `StaffSettings`), `src/pages/PriceSheetExportPage.tsx`, `firestore.rules` (scrittura `settings`).

### 15. Cancellare un cane può lasciare le visite in Firestore

**Cosa non funziona.** Se la cancellazione delle visite fallisce a metà, l’errore viene ignorato.

**Quando succede.** Il cane viene tolto, il segno di cancellazione è già scritto, poi `deleteDoc` sulle visite va in errore (rete, permesso, timeout). Il `catch` è vuoto.

**Dove finisce.** In app il cane non torna, perché il segno di cancellazione lo nasconde, e le visite collegate spariscono dalla lista per lo stesso segno. In Firestore i documenti visita restano. Il backup completo legge tutte le visite della raccolta e non applica quel filtro: lo ZIP contiene visite di un cane che in app non esiste più. Un ripristino da quel backup le riporta in vista, con il nome cane assente negli incassi.

**Dove sta.** `src/data/firebase/client.ts` (`removeDog`), `src/data/firebase/backupCollect.ts`.

### 16. Il consenso della prenotazione online non resta da nessuna parte

**Cosa non funziona.** La casella privacy blocca l’invio nella pagina, e il server non la legge né la salva.

**Quando succede.** Il cliente spunta la casella. La pagina manda sempre `consenso: true` dopo quel controllo. `inviaRichiesta` scrive nome, telefono, email, animale e servizi, e non il consenso. Una chiamata diretta alla function, senza pagina, crea la stessa richiesta senza alcuna casella.

**Dove finisce.** Nel documento della richiesta non c’è la prova che quella persona abbia accettato l’informativa. In caso di contestazione il salone non può mostrare un consenso registrato per quella prenotazione.

**Dove sta.** `hosting/s/pagina.js` (controllo e campo `consenso`), `functions/src/piano/inviaRichiesta.ts` (`ref.set`).

### 17. Spegnere una funzione da Utenti non ferma le email

**Cosa non funziona.** L’interruttore dell’operatore e l’interruttore del salone non sono lo stesso dato.

**Quando succede.** Da Utenti si mette `promemoriaAuto` (o un’altra funzione) su spento. Quella scrittura aggiorna `pro/main.funzioni`. La coda, ogni minuto, guarda solo `settings/main.serviziEmail`. Se lì il modo è ancora manuale o automatico, le righe partono.

**Dove finisce.** L’operatore vede la funzione spenta. I clienti continuano a ricevere promemoria, «è pronto», auguri, recensioni o posti liberi finché il salone non spegne lo stesso servizio in Strumenti.

**Dove sta.** `functions/src/piano/impostaFunzione.ts`, `functions/src/piano/giraCoda.ts` (`serviziAccesi`).

### 18. Venti richieste finte chiudono le prenotazioni a tutti

**Cosa non funziona.** Il tetto di 20 richieste «nuova» è del salone, non di chi le manda. App Check è spento (`APP_CHECK_ATTIVO = false`), quindi la function pubblica non distingue l’app dal resto.

**Quando succede.** Qualcuno, senza account, legge il salone dalla pagina pubblica e invia 20 richieste con email e telefoni diversi, anche su ore diverse: sulla stessa ora la seconda viene rifiutata perché la prima «nuova» la occupa. Alla ventunesima, anche un cliente vero riceve «Troppe richieste».

**Dove finisce.** La home del salone si riempie di richieste false. La pagina pubblica smette di accettare prenotazioni finché il salone non le rifiuta o non le accetta. Non è un accesso ai dati degli altri saloni: è un blocco della prenotazione di quel salone.

**Dove sta.** `src/lib/disponibilita.ts` (`decisioneAntispam`), `src/lib/prenotazione.ts` (`ingressoRichiestaPubblica`), `src/lib/appCheck.ts`.

### 19. Con la lingua inglese o spagnola restano frasi italiane

**Cosa non funziona.** I cataloghi `it` / `en` / `es` hanno le stesse chiavi. Alcune schermate non le usano.

**Quando succede.** La lingua dell’app è English o Español. L’accesso di un socio o di un collaboratore è sospeso, oppure un backup in Impostazioni riesce o fallisce.

**Dove finisce.** Si legge «Carico l'agenda…», «Il tuo accesso a … è sospeso», «Esci», «Ripristinato», «Copia non riuscita», «File non valido», «Ripristino incompleto, riprova». Il resto dell’app è nella lingua scelta.

**Dove sta.** `src/components/AccessoSospeso.tsx`, `src/pages/SettingsPage.tsx` (toast del backup).

### 20. Sul salone condiviso, chi non è Laura vede «Salvataggio non riuscito» senza aver salvato

**Cosa non funziona.** All’avvio dei listener, se il salone corrente è `shared` e l’email non è quella di Laura, il client scrive `salon/shared/members/{uid}`.

**Quando succede.** Quell’account apre l’agenda. `listenDogs` e gli altri ascolti chiamano `ensureShared`. Le regole hanno `allow write: if false` su quei membri. La scrittura fallisce e il `catch` mostra l’avviso di salvataggio.

**Dove finisce.** Compare «Salvataggio non riuscito» all’apertura, senza un salvataggio dell’utente. Il membro non viene registrato da quel percorso.

**Dove sta.** `src/data/firebase/client.ts` (`markSharedMember`, `ensureShared`, `listenDogs`), `firestore.rules` (`salon/shared/members`).

### 21. Conoscere il token delle notifiche stacca il telefono di un altro account

**Cosa non funziona.** `prendiPushTelefono`, con un account qualsiasi, cerca quel token su tutti i dispositivi e, se `tieni` è vero, cancella la registrazione degli altri account che hanno lo stesso token.

**Quando succede.** Chi chiama è entrato (la registrazione è aperta) e conosce già il token FCM: lo ha visto su quel telefono, in un log, o perché l’apparecchio era passato dal suo account. C’è un tetto di 8 chiamate al minuto per utente. Con `tieni` falso gli altri account non vengono toccati: il comportamento vecchio, che li cancellava comunque, non c’è più.

**Dove finisce.** Il telefono della vittima smette di ricevere le push di Groomly finché l’app non registra di nuovo il token. La function non restituisce i token, quindi da sola non li elenca.

**Dove sta.** `functions/src/index.ts` (`prendiPushTelefono`), `functions/src/sendPush.ts` (`dispositiviDaRilasciare`), `functions/src/rateLimit.ts`.

### 22. Il backup di Android può copiare l’agenda locale

**Cosa non funziona.** L’app Android ha `android:allowBackup="true"`.

**Quando succede.** Il telefono ha il backup Google attivo. La cache del WebView, dove stanno clienti, visite e, se è stato usato il percorso solo-telefono, l’hash della password, entra nel backup dell’account Google di quel telefono.

**Dove finisce.** Una copia dei dati del salone resta fuori dal telefono, legata all’account Google, anche dopo la disinstallazione, finché quel backup non viene escluso o cancellato.

**Dove sta.** `android/app/src/main/AndroidManifest.xml`.

---

## Bassa

### 23. L’ora proposta nel form segue il fuso del telefono

**Cosa non funziona.** «Adesso» nel form visita usa ore e minuti del dispositivo. La pagina pubblica e i promemoria usano `Europe/Rome`.

**Quando succede.** Il telefono non è sul fuso di Roma. Prima delle 9 resta l’apertura; dopo, il quarto d’ora proposto è quello locale.

**Dove finisce.** Il primo slot proposto non è l’ora del salone. Una visita salvata così finisce in agenda all’ora del telefono, non all’ora che il sito considera.

**Dove sta.** `src/lib/appointments.ts` (`orarioProposto`). `combineDayTime` costruisce la data nel fuso del telefono: lo stesso scarto vale per ogni ora scelta sul form se il dispositivo non è in Italia.

### 24. Il job delle 18 non manda i promemoria

**Cosa non funziona.** Lo scheduler `promemoriaEmail` chiama l’invio con un elenco vuoto e senza chiave Brevo. Senza chiave la function esce subito con `non_inviata`.

**Quando succede.** Ogni giorno alle 18, ora di Roma. Non è un secondo invio: non spedisce nulla.

**Dove finisce.** I promemoria veri dipendono solo da `invioCoda` e da `serviziEmail`. Se ci si aspetta che il job delle 18 sia il promemoria, quel canale è muto. I clienti li ricevono lo stesso, dal giro della coda, finché il servizio è acceso.

**Dove sta.** `functions/src/index.ts` (`promemoriaEmail`), `functions/src/piano/promemoriaEmail.ts`.

### 25. Le push di chiusura leggono tutti gli account ogni cinque minuti

**Cosa non funziona.** Il job `sendPush` elenca ogni documento `accounts`, poi per ciascuno preferenze, dispositivi e appuntamenti.

**Quando succede.** Ogni 5 minuti. Con pochi saloni il giro entra nel tempo della function. Quando gli account diventano abbastanza da far scadere il job, il giro fallisce per intero.

**Dove finisce.** Nessun salone riceve, in quel giro, la push «chiudi la visita» né il promemoria dell’impegno personale. Non è un guasto misurato sulla base attuale: è il punto in cui il job smette, perché non c’è un paginamento.

**Dove sta.** `functions/src/index.ts` (`sendPush`, `accountIds`).

---

## Ordine in cui chiuderli

1. Punti 1, 2, 3 e 4 chiusi.
2. Punti 5 e 7: i numeri del collaboratore e quelli del salone precedente.
3. Punto 6: non scrivere impostazioni più vecchie di quelle già in cloud.
4. Punto 8: il silenzio deve chiudere anche `non_inviata`.
5. Punto 9, quando il pagamento Play è il modo in cui un salone diventa Pro.
6. Poi i punti medi, partendo da chiusure e salvataggi del collaboratore (13 e 14), dal form che non rifissa un orario liberato (11) e dalle visite orfane (15).

---

## Cosa è stato letto e regge

Queste parti sono state seguite nel codice e non producono il risultato sbagliato che sembrava possibile.

**Agenda e orari.** Le chiusure, scritte dal titolare o dal socio, svuotano il giorno sulla pagina pubblica. Una proposta con visita provvisoria e `scadeIl` occupa l’ora finché non scade; dopo, l’ora torna. Il fuso `Europe/Rome` nella disponibilità pubblica, compreso il cambio ora, è coperto dai test. L’impegno personale non blocca gli slot né in app né sul sito: è la stessa regola nei due posti. In calendario le visite disdette e chiuse restano visibili, non spariscono per un filtro.

**Prenotazione pubblica, sul percorso di oggi.** Servono giorno e ora di Roma, dentro 42 giorni. Nome, telefono ed email hanno un tetto. Il posto viene rifiutato se `postiLiberi` non lo elenca. Oltre 2 richieste aperte per telefono, 2 per email o 20 per salone, la function rifiuta. L’esca del modulo non scrive. Il ramo che accettava solo `inizio` e `fine` non è quello chiamato da `inviaRichiesta`: senza giorno e ora la richiesta non entra. Questo è il punto in cui `SECURITY-AUDIT.md` non è più aggiornato.

**Conferma dal link in email.** La GET mostra la pagina con il pulsante. La modifica del documento è sulla POST. Un filtro di posta che apre il link non conferma e non rifiuta da solo.

**Email di servizio, a parte i punti 8, 10 e 17.** Il promemoria si chiude se la visita non è più `programmato`. L’orario di partenza automatica è calcolato a Roma. Le lingue it, en ed es delle email di prenotazione usano gli stessi template. Il link del posto libero punta a `groomlyapp.it/s/{slug}` con giorno e ora. I messaggi WhatsApp manuali non passano da Brevo.

**Soldi.** L’incasso di una visita usa il totale di chiusura se c’è, altrimenti la somma delle righe. Le disdette del salone non entrano negli incassi; il «non venuto» e la disdetta del cliente entrano tra i persi. N/A non entra in contanti o POS, e con N/A il prezzo in chiusura deve essere 0. Il listino in vista mostra i servizi attivi; le visite vecchie tengono nome e prezzo salvati sulla riga. Non esiste un campo acconto o sconto percentuale: non è un calcolo saltato, è una funzione assente.

**Fedeltà.** Un completamento con la nota «Premio fedeltà» non aggiunge un timbro e scala un premio. La stessa nota e lo stesso totale a zero si scrivono chiudendo da home o dalla scheda, se «Usa premio» è acceso per quel cane. Il punto 4 è chiuso.

**Archivio cane.** Archiviare senza disdire lascia le visite future, ed è una scelta esplicita della scheda. Archiviare e disdire le chiude. Il cane archiviato resta visibile in agenda.

**Accesso e ruoli.** Il ruolo non si cambia dal client. Un collaboratore non apre servizi, archivio, piano e team: quelle route rimandano alle impostazioni. Utenti è solo per l’operatore. L’invito rifiuta un’email diversa da quella dell’accesso. Cancellare l’account del titolare cancella il salone e stacca i membri. Login e reset password non dicono se l’email esiste; il reset ha un tetto. L’operatore nelle function deve avere l’email verificata, come nelle regole. I suggerimenti sono al massimo 5 al giorno per utente e l’email in posta è quella di Auth, non quella scritta nel documento.

**Aggiornamento APK.** L’indirizzo deve essere https, senza utente o porta nell’URL, e finire in `.apk`, solo da `groomlyapp.it`, `groomly-3128b.web.app` o dalla release GitHub del repository.

**Lingue.** Il test di parità delle chiavi it, en ed es non segnala chiavi mancanti. I testi italiani rimasti sono quelli del punto 19, scritti diretti nel componente.

**Cosa questo audit non ha fatto.** Non ha aperto l’app su un telefono, non ha chiamato le function di produzione e non ha misurato se il job push di oggi scade già. I punti sopra descrivono il comportamento del sorgente. Un giro sull’app confermerebbe i punti 1, 4, 5 e 7 nel gesto dell’utente; il codice che li produce è già quello citato.
