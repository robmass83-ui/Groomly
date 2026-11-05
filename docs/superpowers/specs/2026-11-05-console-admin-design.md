# Console Admin e sito admin — design

Data: 5 novembre 2026 · Ramo: `claude/beta-b2-admin-5395f1` (nome esatto da `git branch --show-current`) · Base: `main` `91036c6f` (1.1.192) · Fonte: `docs/ADMIN-CONSOLE-PIANO.md`, fasi E e G, punti di F che riguardano queste pagine, §6–§8. Blocco 3 di 4.

## Perché

La Console oggi è una sola pagina a tab (`AdminManagerPage`, circa 450 righe) in una cornice minima, pensata per il telefono. Roberto vuole lavorare anche dal PC, su `admin.groomlyapp.it`, e rispondere ai saloni senza passare dall'email personale. Dopo il blocco 1 la hotmail è solo admin: la Console è tutto ciò che vede.

## Obiettivi

- Console con rotte vere: Panoramica, Saloni, Scheda salone, Beta, Assistenza, Comunicazioni, Piani, Registro, Sistema.
- Risposta al salone da Assistenza e comunicazioni mirate, con email separate fra servizio e promozionali.
- Sito web `admin.groomlyapp.it` che monta solo login e Console, con sessione che finisce alla chiusura del browser e fuori dai motori di ricerca.
- I vecchi link continuano a funzionare.

## Fuori da questo lavoro

`/admin/metriche`, Analytics, Crashlytics, statistica notturna (Fase H) e testi di Privacy, Termini e DPA: blocco 4. Conversazioni fra admin e salone. Notifiche push per le risposte. Deploy, APK e merge senza il via di Roberto.

## Da non fare mai

- Scrivere o cancellare i dati di I Pelosetti (`salons/{uid di Laura}` e `salon/shared`), né nei test né nelle migrazioni. Il seed non li tocca.
- Mostrare nella scheda salone nomi, telefoni o qualunque dato dei clienti finali: il DPA fa di Groomly il responsabile del trattamento. Solo numeri aggregati.
- Mandare email promozionali fuori da `inviaPromo` (`functions/src/promo/inviaPromo.ts`).
- Cambiare `hosting/` o le sue rewrite. Accendere Plus o Salon.
- `--force` nei deploy.

## Com'è il codice oggi (verificato)

1. `avvisiSistema` è globale: un solo testo, nessun destinatario. La lettura si segna con `accounts/{uid}.avvisiLettiFino`. Scrittura solo da function (`pubblicaAvvisoSistema`, con riconferma e limite di 10 l'ora).
2. Gli stati dei suggerimenti («visto», «interessante») stanno in `localStorage` (`revisioneSuggerimenti.ts`). I feedback visti pure.
3. `suggerimenti/{id}` ha `uid, salonId, email, categoria, testo, lingua, versione, creato`; le regole negano update e delete. `betaFeedback` ha `salonId, uid, piano, creatoIl` e le risposte. Le «segnalazioni» non esistono come fonte: sono i suggerimenti con categoria `bug`.
4. `contatoriAdmin` manda per salone solo `ultimoAccesso`. Conteggi, versione app e lingua non ci sono. La versione app è in `accounts/{uid}/devices` (`appVersion`).
5. Mittente Brevo unico `noreply@groomlyapp.it`. `service@groomlyapp.it` del piano non esiste.
6. `inviaPromo` controlla `emailPromo.attivo`, aggiunge il link «Disiscriviti» e l'header `List-Unsubscribe`, ed è già indicata come strada per le Comunicazioni.
7. `adminLog`, `conRegistro`, `controllaAccessoRecente`, `useRiconferma`, `RiconfermaPassword` esistono già e si riusano.
8. `providers.tsx` e `router.tsx` importano staticamente salone e plugin. `CodaSuggerimenti` e `FeedbackAdmin` importano `Capacitor` e `shareFile`. `useSession` ha import dinamici di `@capacitor/local-notifications`.
9. `getAuth` in `client.ts` usa la persistenza predefinita. `PhoneShell` limita la larghezza a 640 px.

## Approcci considerati

- **Rotte vere e sito con ingresso proprio (scelto da Roberto).** `AdminManagerPage` si divide in pagine sottili; dati comuni in un provider del layout; rotte admin in un file proprio, usato dall'app e da un ingresso web dedicato. Lavoro più grande, ma è l'unico che tiene davvero il salone e i plugin fuori dal sito.
- *Pagina unica che legge la rotta.* Più veloce, ma il file cresce fino a non essere gestibile con Assistenza e Comunicazioni. Scartato.
- *Un solo ingresso con un interruttore `VITE_ENTRY`.* Meno file, ma ogni nuova pagina del salone rischia di finire nel sito senza che nessuno se ne accorga. Scartato.

## Decisioni di Roberto

| Tema | Decisione |
|---|---|
| Risposta in Assistenza | Risposta singola: il salone la legge e, per continuare, scrive a `info@groomlyapp.it` |
| Chi vede la risposta | Solo chi ha scritto. Se quell'account non esiste più, la risposta non parte e la Console lo dice |
| Email in Comunicazioni | Tipo scelto a ogni invio. «Promozionale» preselezionata; «Servizio» va scelta apposta e mostra un promemoria; prima dell'invio si vede quante persone la ricevono |
| Lingue delle comunicazioni | Italiano obbligatorio, altre lingue facoltative; chi ha una lingua senza testo riceve l'italiano e l'anteprima dice quanti sono |
| Limite email | Conteggio condiviso col tetto giornaliero, con blocco a metà del margine rimasto; il dato si vede nella Console |
| Metriche | Nessuna voce nel menu finché non funzionano; i numeri restano in Panoramica |
| Telefono | Barra in basso: Panoramica, Saloni, Assistenza, Beta, Altro |
| PC (≥ 900 px) | Menu fisso a sinistra, tabelle larghe, barra antracite «Groomly Admin» con Esci |

## Struttura

- `src/app/adminRoutes.tsx`: elenco delle rotte `/admin/*`, usato da `router.tsx` e dall'ingresso web.
- `src/components/admin/AdminLayout.tsx` sostituisce `AdminFrame`: barra, menu laterale, barra in basso, pagina «Altro» con Comunicazioni, Piani, Registro, Sistema. Niente `PhoneShell`; sotto i 900 px la colonna è come nell'app. Chiaro e scuro dai token esistenti.
- `src/components/admin/AdminDati.tsx`: provider con directory saloni, inviti, feedback, suggerimenti, contatori, config e righe calcolate. La logica si sposta da `AdminManagerPage`, non si riscrive. Le azioni di piano (`useAzioniPiano`) e i dialoghi di invito restano condivisi fra Saloni, Beta e Scheda.
- `src/pages/admin/*`: una pagina sottile per rotta. `AdminManagerPage.tsx` sparisce; i suoi test si spostano sulle nuove pagine, senza perdere casi.
- I componenti di `src/components/admin/*` e `src/lib/adminManager.ts` si spostano o si adattano, non si riscrivono.

## Rotte

| Rotta | Contenuto |
|---|---|
| `/admin` | Panoramica come oggi: KPI, «Da fare oggi», +30 gg. In più i nuovi saloni degli ultimi 7 giorni. Il tour si sposta in Sistema |
| `/admin/saloni` | Lista, ricerca, filtri, selezione multipla, inviti. Su PC tabella con colonne Salone, Titolare, Piano, Beta, Ultimo accesso, Città |
| `/admin/saloni/:salonId` | Scheda salone: quella attuale più i conteggi. Viste `?vista=storico`, `?vista=feedback` |
| `/admin/beta` | Inviti per stato, `?stato=` |
| `/admin/assistenza` | Casella unica, dettaglio in `/admin/assistenza/:id` |
| `/admin/comunicazioni` | Nuovo avviso, storico, Annuncio pagamenti |
| `/admin/piani` | `PianiPagamenti` invariato, senza Annuncio se si sposta |
| `/admin/registro` | Storico `adminLog`, dal più recente, a pagine, filtri per azione e salone |
| `/admin/sistema` | Versione app e versione pubblicata (`https://groomlyapp.it/release.json`), tour, link rapidi a Firebase, Play Console, Brevo, RevenueCat. Crashlytics e Analytics si aggiungono nel blocco 4 |

`/admin/avvisi` rimanda a `/admin/comunicazioni`. `AvvisiSistemaPage` torna una pagina solo del salone: perde `AdminFrame` e il modulo di scrittura, che passa a Comunicazioni.

### Vecchi link

`percorsoAdmin.ts` traduce tutti i parametri, con test tabellare:

| Vecchio | Nuovo |
|---|---|
| `/impostazioni/admin-manager`, `/impostazioni/utenti`, `/admin` con `tab` o `zona` | rotta corrispondente |
| `?tab=saloni&id=X&vista=storico` | `/admin/saloni/X?vista=storico` |
| `?tab=beta&stato=invitato` | `/admin/beta?stato=invitato` |
| `?tab=beta&id=X` | `/admin/saloni/X` |
| `?tab=feedback` | `/admin/assistenza?fonte=feedback` |
| `?tab=suggerimenti&cat=bug` | `/admin/assistenza?fonte=suggerimenti&cat=bug` |
| `?tab=piani` | `/admin/piani` |

## Scheda salone: dati aggregati

Nuova callable `schedaSaloneAdmin({ salonId })`, solo admin, sola lettura: conteggi con `count()` di cani, appuntamenti totali e degli ultimi 30 giorni, persone attive; versione app più recente fra i dispositivi; lingua del titolare. Risponde solo con numeri e queste due stringhe; un test verifica che nella risposta non ci siano altri campi. Se il salone è VIP la lettura è permessa, perché non scrive nulla.

## Assistenza

**Dati.** Nuova raccolta `assistenza/{fonte}_{idOrigine}`, scritta solo dalle functions, letta solo dall'admin:

```
{ fonte: 'suggerimento' | 'feedback', idOrigine, salonId, uid, stato: 'nuovo' | 'in-corso' | 'risolto',
  risposte: [{ testo, quando, email: 'inviata' | 'non_inviata' | null }], aggiornato }
```

Il documento nasce alla prima azione. La Console unisce `suggerimenti`, `betaFeedback` e `assistenza`.

**Stato di partenza.** `config/globale.assistenzaDal` fissa la data di taglio, scritta dalla prima apertura di Assistenza con una callable, una volta sola. Una richiesta senza documento vale «risolto» se è più vecchia del taglio e «nuovo» se è più recente, senza scrivere nulla. Aprire il dettaglio non cambia stato: cambia solo con un'azione esplicita.

**Numeri.** Il numerino di Assistenza conta le richieste «nuovo». `daFareOggi` conta le stesse, al posto dei feedback non visti e dei suggerimenti da vedere; i «feedback visti» in `localStorage` spariscono.

**Callable.**

- `impostaStatoAssistenza({ fonte, id, stato })`.
- `rispondiAssistenza({ fonte, id, testo, anchEmail })`: legge `uid` dall'origine; se `accounts/{uid}` non esiste risponde `autore_assente` e non scrive nulla. Altrimenti scrive l'avviso a quell'account, aggiunge la risposta, porta lo stato a «risolto» (l'admin può cambiarlo). Con `anchEmail` manda un'email di **servizio** in risposta alla richiesta: mittente `noreply@`, `replyTo` `info@groomlyapp.it`, senza «Disiscriviti». Se l'email fallisce la risposta resta valida e la Console lo dice.
- Risposte rapide: `assistenzaModelli/{id}` con `{ titolo, testo }`, callable per creare ed eliminare. Riempiono il campo; il testo si può sempre cambiare.

Una risposta inviata non si modifica e non si cancella. Il testo sta sotto la lingua dell'autore, mostrata all'admin: la risposta è una sola, nella lingua che l'admin sceglie di usare.

**Interfaccia.** Filtri per fonte, categoria, stato, salone. Esportazione PDF ed Excel da `esportaSuggerimenti`, estesa ai feedback. `CodaSuggerimenti` e `FeedbackAdmin` si adattano; la stella «interessante» e i segni locali spariscono, sostituiti dagli stati del server.

## Canale degli avvisi per account

`accounts/{uid}/avvisi/{id}`: `{ tipo, titolo, testo, traduzioni?, creato, origine: 'assistenza' | 'comunicazione' }`. Regole: lettura solo dell'account, scrittura `false`. Client: `useAvvisiSistema` unisce avvisi globali e dell'account; ordine, evidenza, «letto» e numerino restano quelli di oggi, con `avvisiLettiFino`. Il titolo delle risposte è una frase fissa tradotta nella lingua dell'account.

**Cancellazione.** La pulizia dell'account (`pulisciPersona`) cancella questa sottoraccolta, i documenti `assistenza` e i `betaFeedback` di quell'uid, e toglie l'uid da `comunicazioni.uids`. `eliminaSalone` fa lo stesso per `salonId`, così non restano le richieste dei collaboratori. Oggi `betaFeedback` non si cancella mai: questa pulizia chiude il buco. I saloni eliminati in passato hanno lasciato i loro feedback: si elencano con un conteggio per Roberto, non si cancellano da soli.

Chi non aggiorna l'APK non vede questi avvisi. La Console lo ricorda con una riga sotto la casella «anche via email». Con versioni vecchie gli avvisi globali continuano a funzionare, perché `titolo` e `testo` restano in italiano.

## Comunicazioni

**Modulo.** Tipo avviso, destinatari (tutti, o i filtri di Saloni), una scheda per lingua con italiano obbligatorio, «Invia anche via email» con tipo Promozionale o Servizio, anteprima nella lingua scelta.

**`anteprimaComunicazione`**, callable di sola lettura: quanti account ricevono l'avviso, quante email partiranno, quanti riceveranno l'italiano al posto della loro lingua, quanti esclusi per mancanza di consenso, quante email restano oggi.

**Destinatari.** Una sola funzione di selezione, usata da anteprima e invio. I Pelosetti riceve avvisi ed email di servizio; le promozionali solo col consenso, come tutti. Gli account con `salonId: 'shared'` non si perdono per strada: `salonIdValido` qui non si usa. I saloni di test restano sempre esclusi.

**Limite delle email.** Il tetto di Brevo è di 300 email al giorno (`TETTO_EMAIL_GIORNO`) e vale anche per i promemoria dei saloni ai clienti, contati nel documento `POSTA_GIORNO` di `giraCoda.ts`. Le email di Comunicazioni e Assistenza entrano nello stesso contatore, in transazione, come fa `contaInvii`.

- L'invio con email si blocca, lato server, se supererebbe metà del margine rimasto nel giorno. L'avviso nell'app non ha limiti e può partire da solo.
- Roberto vede il dato in tre punti: «Email oggi: 120 su 300» in Panoramica e in Sistema, e nell'anteprima con «ne restano N, ne puoi mandare M». Se l'invio è bloccato, l'anteprima lo dice e il bottone è spento.
- `comunicazioni/{id}/invii/{uid}` segna ogni email partita. Una comunicazione interrotta mostra «Inviate 40 su 90» e il bottone «Riprendi», che manda solo a chi manca: niente doppioni.

**`inviaComunicazione`**, con `adminLog` e limite di 10 l'ora in comune con gli avvisi; riconferma password quando i destinatari sono «tutti»:

- Tutti: un documento in `avvisiSistema` con `titolo`, `testo` in italiano e `traduzioni: { en: { titolo, testo }, … }`.
- Filtro: un documento per account in `accounts/{uid}/avvisi`.
- Storico in `comunicazioni/{id}`: testi, filtro, tipo email, conteggi, `uids`. Solo admin. Eliminare una comunicazione toglie l'avviso a tutti i destinatari; le email inviate restano inviate.
- Email promozionale: `inviaPromo` per ogni titolare; salta chi non ha il consenso. Email di servizio: `postBrevoHtml`, senza «Disiscriviti», ai titolari. Oggetto e testo nella lingua dell'account, con il modello grafico di `postaHtml`.

Promemoria sotto «Servizio»: solo ciò che serve a usare il servizio, come manutenzione, sicurezza e modifiche importanti. Niente offerte.

L'Annuncio pagamenti esistente si sposta qui così com'è, con la stessa function.

## Sito `admin.groomlyapp.it`

- `firebase.json`: `hosting` diventa un elenco. Target `pubblico`: blocco attuale identico, con tutte le rewrite e gli header. Target `admin`: `dist-admin`, rewrite `**` verso la pagina dell'app, header `X-Robots-Tag: noindex, nofollow`. `.firebaserc` con i target. Un test confronta il blocco `pubblico` con quello di oggi.
- `npm run build:admin` e `npm run deploy:admin` (`firebase deploy --only hosting:admin`). `dist-admin` in `.gitignore`. Da ora `firebase deploy --only hosting` cercherebbe anche `dist-admin`: guida e memoria dicono di usare `hosting:pubblico`.
- Ingresso `src/main.admin.tsx` con pagina HTML propria e `<meta name="robots" content="noindex">`: monta `SessionProvider`, lingua, toast e rotte admin. Nessun provider del salone.
- Login web `AdminLoginPage`: email e password, recupero password, niente registrazione. Un account senza claim vede «Accesso riservato» ed Esci.
- Con `VITE_ENTRY=admin`: `browserSessionPersistence` e cache Firestore in memoria, così sul PC non resta nulla.
- Plugin: nel bundle nessun plugin nativo. Gli import dinamici si proteggono con `Capacitor.isNativePlatform()` e, dove non basta, con un alias Vite su uno stub. Un controllo dopo la build cerca in `dist-admin` i nomi dei plugin e fallisce se ne trova.
- Esportazioni sul web: `downloadAnchor`. In app: `shareFiles`, caricato solo se nativo.

## Sicurezza (Fase F)

- `adminLog` per risposte, stati, modelli, comunicazioni, con `dettagli` senza testi e senza email.
- Riconferma password per comunicazione a tutti, in aggiunta a quelle già attive.
- Limiti: comunicazioni 10 l'ora, risposte 30 l'ora per admin, in `rateLimit.ts`.
- Regole nuove: `assistenza`, `assistenzaModelli`, `comunicazioni` lettura solo admin, scrittura `false`.

## Testi

Tutte le frasi nuove in it, en, es, fr, de, comprese quelle delle email e il titolo fisso delle risposte.

## Test

- `percorsoAdmin`: tabella dei vecchi link.
- `adminRoutes` e guardie: non admin → Home, non autenticato → login, sul web «Accesso riservato».
- Pagine: i casi di `AdminManagerPage.test.tsx` e `AdminManagerBeta.test.tsx` spostati.
- Functions: `rispondiAssistenza` (autore assente, email fallita, solo admin), `inviaComunicazione` (promozionale solo col consenso e con «Disiscriviti», servizio senza link, lingua mancante → italiano, riconferma su «tutti», limite), `schedaSaloneAdmin` (solo campi ammessi).
- Regole su emulatore: nuove raccolte; un account non legge gli avvisi di un altro.
- `useAvvisiSistema`: unione, lingua, «letto».
- `firebase.json`: blocco pubblico invariato. Controllo plugin su `dist-admin`.
- Interfaccia a 1280 px e 375 px, chiaro e scuro, nel browser su emulatori. `npm test`, `npm run test:rules`, `npm --prefix functions test`, e `test:360` se praticabile. I dati di prova si cancellano alla fine.

## Ordine di rilascio (ogni passo col via di Roberto)

1. Deploy functions (`FUNCTIONS_DISCOVERY_TIMEOUT=60`, da PowerShell, senza `--force`), regole e indici.
2. Sito Hosting, target, DNS, domini autorizzati, App Check; poi `build:admin` da `D:\Groomly`, dove c'è `.env.local`, e `deploy:admin`.
3. Nuova APK.

## Cose da fare a mano (Roberto)

Creare il sito `groomly-admin`; collegare `admin.groomlyapp.it` col DNS su Hostinger; aggiungerlo ai domini autorizzati di Auth; registrarlo in App Check.

## Scelte lasciate a chi implementa

Nomi interni, forma del provider, come dividere i test, stile delle tabelle, icone del menu, come Vite sceglie l'ingresso admin.

## Scelte mie, da controllare

Riassunte qui perché Roberto non le ha decise una a una:

- Mittente `noreply@` con risposte a `info@`, al posto di `service@`.
- Dopo una risposta lo stato passa a «risolto»; una risposta inviata non si cambia.
- L'email di risposta è di servizio, quindi senza «Disiscriviti».
- Gli avvisi filtrati vanno a tutti gli account dei saloni scelti; le email solo ai titolari.
- Per un filtro la riconferma password non serve; per «tutti» sì.
- Limite di 30 risposte l'ora.
- Spariscono la stella «interessante» e i segni locali.
- Il tour passa da Panoramica a Sistema.
- Login web senza registrazione.
- Cache Firestore in memoria sul web.
- Niente push per le risposte.
- Con l'account e col salone si cancellano anche feedback beta, storico di Assistenza e uid nelle comunicazioni.
- Le richieste precedenti al rilascio valgono «risolto»; dopo, lo stato cambia solo con un'azione.
- I Pelosetti riceve avvisi ed email di servizio, le promozionali solo col consenso; saloni di test sempre esclusi.
- Blocco a metà del margine rimasto, solo per le email; avviso nell'app sempre libero.
- «Email oggi» in Panoramica, in Sistema e nell'anteprima.
