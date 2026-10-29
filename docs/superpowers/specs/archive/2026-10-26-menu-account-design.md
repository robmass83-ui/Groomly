# Menu Impostazioni e Gestisci account Groomly

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-26. Decisioni prese in autonomia, come chiesto: si implementa questa spec senza un secondo giro di domande.

## Problema

Impostazioni mette nello stesso elenco attività, aspetto, backup, servizi, tag, archivio, notifiche, legale, metriche, elimina account, piano e uscita. Si riorganizza con la logica del menu account di Uber (profilo, scorciatoie, card, gruppi, poi una scheda account a tab), con i colori, i font e i componenti già di Groomly. Nessuna voce si duplica come funzione nuova e nessuna si perde: si sposta.

## Decisioni

1. Hub su `/impostazioni`. Account su `/impostazioni/account?scheda=home|personali|sicurezza|privacy`. Indietro torna all’hub. I passi della card progresso aprono la schermata giusta, anche con `scheda=sicurezza`.
2. Il dialogo Backup, il foglio Attività, tema, lingua e tag restano quelli di oggi. Cambiano solo la porta d’ingresso.
3. «Scarica i miei dati» riapre il dialogo Backup (export completo, ZIP, Drive). Non esiste un secondo motore di export.
4. L’invito a una collega è il flag `MOSTRA_INVITO_COLLEGA = false`. Il componente c’è, in pagina non si vede.
5. Il piano in chip è Base, Pro, Salone o VIP. VIP è il piano omaggio senza scadenza già riconosciuto da `eVip`.
6. L’abbonamento Google Play attivo non blocca più l’eliminazione. La schermata avvisa che l’account non disdice il rinnovo e linka gli abbonamenti Play (`it.groomly.app`).
7. Account protetto, rifiutato anche dal server: email di Laura, `salonId === shared`, oppure titolare di un piano VIP. Niente doppio pulsante: il flusso si ferma e indica info@groomlyapp.it. I test non usano quell’account.
8. «Esci dagli altri dispositivi» revoca i refresh token Firebase e rinnova il token di questo dispositivo. Senza nuvola il pulsante non finge di averlo fatto.
9. Google si collega con `linkWithPopup` solo se Firebase è acceso. Il telefono di recupero è un campo del profilo, non un SMS di verifica.
10. Le email promozionali sono un interruttore nuovo (`emailPromo`, spento di default). Promemoria e email di servizio restano quelli già in Notifiche e non si spengono da qui.
11. L’anello «Completa il tuo salone» ha cinque passi: logo del listino, indirizzo e orari insieme, almeno un servizio attivo, primo backup, email verificata. A 5/5 la card non c’è. Senza Firebase l’email risulta già verificata, come nel resto dell’app.
12. «Questo mese» conta i cani distinti con una toelettatura completata nel mese. La card apre Incassi e report. La scorciatoia Incassi apre `/incassi`.
13. Nelle pagine legali l’indirizzo resta solo «Quartu Sant’Elena (CA)». Non si riscrive il testo legale.
14. Family, Simple mode, regali, guida, Uber for Business, gruppi salvati, ads e location sharing non entrano.

## Da → a

| Oggi | Dove finisce |
| --- | --- |
| Riepilogo attività, matita, Copia partita IVA, foglio Attività (ragione sociale, IVA, codice fiscale, telefono, indirizzo, orari, recensioni, pagina pubblica, tessera) | Intestazione (nome e chip) e riga Salone › Dati del salone. Stesso foglio. |
| Incassi e report, badge NUOVO, sparkline | Card del mese → `/incassi/report`. Scorciatoia Incassi → `/incassi`. Riga Funzioni › Incassi e report, stesso indirizzo del report, una sola volta in accessibilità: la card porta quel nome. |
| Funzioni Pro → `/impostazioni/pro` | Scorciatoia Piano, stesso href e lo stesso nome accessibile «Funzioni Pro» quando il piano non è in vetrina. |
| Team → `/impostazioni/team` | Salone › Collaboratori, solo se il piano ha il team. |
| Il tuo piano, PianoCard (prova Pro) | Visibili solo quando i piani sono in vetrina, come oggi. Riga Account › Abbonamento e la card prova restano. |
| Tema chiaro / scuro / auto | App › Aspetto. Il pulsante si chiama ancora Tema. |
| Lingua | App › Lingua. In Info personali la riga riapre lo stesso foglio. |
| Backup (automatico, frequenza, Wi-Fi, carica, Drive, Excel, ZIP, completo, copia veloce, ripristino, annulla) | Funzioni › Backup e ripristino. Stesso dialogo. Nascosto al collaboratore. |
| Servizi e durate | Salone › Servizi. |
| Tag dei cani | Salone › Tag. Stesso foglio. |
| Archivio animali | Salone › Archivio. |
| Notifiche e push | App › Notifiche. Scorciatoia Avvisi con pallino se la coda di domani ha voci. |
| Messaggi ai clienti | Funzioni › Promemoria e messaggi → `/impostazioni/messaggi`. |
| Strumenti | Funzioni › Controlli avanzati, nome accessibile «Strumenti». |
| Legale (Privacy, Termini, DPA, Come eliminare) | Info › Legale, poi la pagina con le quattro destinazioni più le licenze. |
| Metriche | Privacy e dati › Preferenze di comunicazione. |
| Elimina account (dialogo breve) | Privacy e dati › Elimina account, flusso a passi. Il dialogo breve esce. |
| Esci | Pulsante in fondo. |
| Versione e storico APK | Numero in fondo e Info su Groomly › Novità. |
| Primo dato (solo operatori) | Info su Groomly. |
| Utenti e campione email (solo operatori) | Gruppo Groomly in cima, invariato. |
| Privacy e termini / Elimina account dentro `SezionePiani` | Restano in quel componente di test. Non sono la pagina Impostazioni. |

Voci che il collaboratore non vedeva (Funzioni Pro, Backup, Servizi, Archivio, matita, Tag) restano nascoste.

## Gestisci account

Quattro tab: Home, Info personali, Sicurezza, Privacy e dati.

Home: logo o iniziale, nome, email, tre riquadri verso gli altri tab, card suggerimento (email non verificata, altrimenti telefono di recupero mancante).

Info personali: foto verso la gestione listino, nome titolare, nome salone, telefono, email con verificata / non verificata, lingua. Ogni riga apre un foglio con gli stessi controlli di validazione dell’attività (IVA e codice fiscale restano nel foglio Dati del salone).

Sicurezza: password (ri-autenticazione, minimo 8 caratteri), cambia email, verifica email, Google collega / scollega, attività di questo dispositivo, esci dagli altri.

Privacy e dati: Centro privacy (pagina Legale), preferenze (promo on/off, servizio spiegato e non spento qui, metriche), scarica i miei dati, elimina account in fondo senza colore d’allarme dominante.

## Elimina account

1. Elenco di ciò che si cancella.
2. Salva su… apre il backup. Si può proseguire.
3. Se l’abbonamento Play è attivo, avviso e link. Non è un blocco.
4. Titolare: i collaboratori perdono l’accesso. Collaboratore o socio: si cancella solo il suo account.
5. Password obbligatoria.
6. Testo uguale al nome del salone oppure `ELIMINA`. Pulsante fermo fino ad allora.
7. Cloud Function: Firestore del salone (se titolare) o solo del membro, file Storage sotto `users/{uid}/`, utente Auth. Poi email Brevo di conferma. Se l’email fallisce, l’account resta eliminato.
8. Pagina pubblica già su `groomlyapp.it/elimina-account`, contatto info@groomlyapp.it. Il percorso in-app nel testo diventa Impostazioni › Gestisci account Groomly › Privacy e dati.
9. Account protetto: niente passi, né in app né sul server.

## Legale e Info

Legale: privacy, termini, trattamento dati, licenze (nomi e link, non il testo integrale delle licenze altrui), come eliminare l’account.

Info: versione, novità, valuta l’app (scheda Play `it.groomly.app`), contattaci, sito.

## Fuori scope

Pagamenti nuovi, Family, regali, ads, condivisione posizione, verifica SMS, elenco città degli accessi passati (non c’è una fonte già in app: si mostra solo questo dispositivo).
