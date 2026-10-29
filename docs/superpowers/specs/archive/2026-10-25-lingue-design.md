# Groomly — Italiano, inglese e spagnolo

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-25
Stato: aggiornata la sera del 25 ottobre 2026 con `docs/prompt-cursor-lingue-revisione.md`. Si scrive il piano e si esegue senza un’altra conferma (decisione D1). `mostraPiani` e `abbonamentiAttivi` restano spenti. Nessun dato del salone vero di Laura.

## Obiettivo

Groomly si usa in italiano, inglese britannico e spagnolo di Spagna. Chi apre l’app fuori dall’Italia trova la propria lingua su ogni schermata, popup, toast, errore, notifica, email, pagina legale e pagina pubblica. I dati scritti dal salone restano come sono stati inseriti. I prezzi restano in euro. Partita IVA e codice fiscale restano campi facoltativi, con l’etichetta tradotta.

## Decisioni chiuse

| # | Decisione |
|---|---|
| D1 | La lingua della persona vale per le sue schermate, i popup, i toast, gli errori, le notifiche sul telefono, i report Incassi (PDF ed Excel per il commercialista) e le email del suo account (verifica e reset). Il listino stampato o condiviso non usa questa lingua: vedi D2. |
| D2 | La lingua dei clienti vale per promemoria, email di prenotazione, messaggio WhatsApp rivolto al cliente (anche «Invia tutti» e i messaggi aperti a mano), tessera fedeltà, lista d’attesa, richiesta di recensione Google, listino prezzi stampato o condiviso (PDF e JPEG), pagina pubblica del salone (passi servizio, orario, dati, inviata e stato) e scheda cane per il cliente (`hosting/c`). I testi del salone inseriti in quelle pagine sono escapati. |
| D3 | Al primo avvio, se la persona non ha ancora una lingua salvata, si usa la lingua del telefono: italiano, inglese o spagnolo. Ogni altra lingua del telefono diventa inglese. |
| D4 | Il selettore sta solo in Impostazioni, dopo l’accesso. Prima del login le schermate seguono la lingua del telefono. |
| D5 | Le lingue sono tre codici: `it`, `en` (inglese britannico), `es` (spagnolo di Spagna). |
| D6 | Un solo vocabolario nel repository, in tre file con le stesse chiavi. L’app, le Cloud Functions, le email e le pagine pubbliche lo leggono. Quando il codice spedisce le email, Brevo riceve oggetto e HTML composti dal codice, con logo, colori, titoli grandi e pulsante come i modelli attuali. Finché quel codice non è in produzione, il modello Brevo 5 (inviti) resta la spedizione attiva. I modelli 3–12 non si spengono in questo lavoro: quando il codice manda tutte le email da solo, la voce «template Brevo 3–12 da spegnere» va in `docs/DA-FARE-ROBERTO.md`. |
| D7 | Solo la lingua. Nessuna nuova valuta. Nessun campo fiscale diverso per paese. |
| D8 | L’inglese è britannico: settimana da lunedì, data «25 October 2026», numeri `€1,234.56`. Lo spagnolo è quello di Spagna: settimana da lunedì, data «25 de octubre de 2026», numeri `1.234,56 €`. L’italiano resta com’è oggi, settimana da lunedì inclusa. |
| D9 | Il testo italiano che fa fede è quello attuale del 25 ottobre 2026: termini versione 1.1, privacy e accordo sul trattamento dei dati senza l’indirizzo di casa (resta Quartu Sant’Elena (CA)), più elimina account. Le traduzioni partono da questi testi. Non esiste una «versione 2». |
| D10 | La pagina di sviluppo `/dev/kit` resta in italiano. |

## Lingua della persona e lingua dei clienti

La lingua della persona è il campo `lingua` di `accounts/{uid}`. I valori ammessi sono `it`, `en`, `es`. Le regole Firestore permettono già a ciascuno di aggiornare il proprio account senza cambiare ruolo né salone. Una copia sta nelle impostazioni locali del telefono, così le schermate funzionano senza rete.

La lingua dei clienti è il campo `linguaClienti` nelle impostazioni del salone. Se manca, o se il valore non è uno dei tre codici, i clienti restano in italiano.

Regole di scrittura:

- Account già esistente senza `lingua`: al primo avvio dopo l’aggiornamento si salva la lingua del telefono sull’account e in locale. `linguaClienti` non si tocca. Il salone già in uso non cambia lingua verso i clienti da solo.
- Account nuovo: alla creazione, se chi si registra è il titolare, si scrivono sia `lingua` sia `linguaClienti`, entrambe dalla lingua del telefono. Chi entra con un invito, al primo avvio, salva solo la propria `lingua` e non scrive `linguaClienti`.
- Cambio della propria lingua in Impostazioni: aggiorna subito lo schermo e la copia locale, poi `accounts/{uid}.lingua`. Non aggiorna `linguaClienti`.
- «Lingua dei clienti» è una voce a parte in Impostazioni (Italiano / English / Español, scritte così in tutte le lingue). La vede e la modifica solo il titolare. Alla creazione di un account titolare il valore iniziale di `linguaClienti` è uguale alla sua `lingua`. Chi entra con un invito non la vede e non la scrive.
- Salone condiviso `shared`: `linguaClienti` la modifica solo il titolare già autorizzato dalle regole esistenti. La specifica non nomina persone. La lingua di ogni persona vale per le sue schermate e per le email del suo account.
- Se la scrittura di `lingua` o di `linguaClienti` fallisce, lo schermo resta sulla lingua appena scelta, compare il toast di salvataggio non riuscito tradotto, e al prossimo avvio con rete si riprova solo la scrittura che non è arrivata. Email e pagina pubblica restano sull’ultima `linguaClienti` che il server ha salvato.

In Impostazioni le voci sono Italiano, English, Español, scritte così in tutte le lingue dell’interfaccia.

Prima del login, accesso, pagina di invito e reset password mostrano la lingua del telefono. Non c’è un selettore su quelle schermate.

Il reset password parte prima del login. Il server usa `lingua` se l’account ce l’ha. Se manca, usa la lingua inviata dal telefono insieme alla richiesta. Un valore diverso da `it`, `en` o `es` si scarta e l’email esce in inglese.

L’invito al team esce nella lingua di chi invita, perché la persona invitata non ha ancora un account. Le etichette sono Socio / Collaboratore in italiano, Partner / Team member in inglese, Socio / Colaborador in spagnolo. La pagina `/invito/:token` sul telefono, prima del login, resta nella lingua del telefono anche se l’email era in un’altra lingua.

Verifica dell’account: la persona è già dentro, quindi l’email usa la sua `lingua`. Se non è ancora stata scritta, l’app la scrive dalla lingua del telefono prima di chiedere l’invio.

## Vocabolario e schermate

I file sono `src/i18n/it.ts`, `src/i18n/en.ts` e `src/i18n/es.ts`. L’italiano è l’elenco di riferimento. Se una chiave manca in inglese o in spagnolo, il progetto non compila. Le frasi già presenti in `src/i18n/it.ts` entrano nello stesso elenco. Una funzione `t(lingua, chiave, valori)` sostituisce i segnaposto `{{nome}}` e gli altri. Un valore mancante diventa una stringa vuota: a schermo non compare `{{nome}}`.

Quando la frase cambia col numero, il modulo `src/i18n/format.ts` sceglie la forma con `Intl.PluralRules` della lingua (`it`, `en-GB`, `es`). Non si usa la regola fissa «1 = singolare».

Le schermate chiedono la lingua al contesto dell’app: lingua salvata della persona se è dentro, lingua del telefono se è fuori. Ogni scritta visibile passa dal vocabolario: titoli, pulsanti, menu, dialoghi, toast, schede vuote, errori, notifiche, intestazioni e titoli di PDF ed Excel, nome del file esportato. Il marchio Groomly resta Groomly. Restano invariati anche i nomi propri dei servizi: Firebase, Google, Brevo.

I nomi dei campi cane hanno una traduzione di base: Specie, Razza, Sesso, Età, Peso, Taglia, Cliente, Durata media. Se il valore salvato nel salone è ancora esattamente quella stringa italiana, a schermo si vede la traduzione della lingua scelta. Se il salone ha scritto un altro testo, si vede quel testo.

I servizi creati da `src/data/seed/services.ts` (per esempio «Bagno + taglio», «Antiparassitario») nascono nella lingua del telefono del titolare quando si registra. Per i saloni già esistenti: se il nome del servizio è ancora esattamente quello italiano predefinito, a schermo e sul listino si mostra la traduzione; se il salone l’ha cambiato, si mostra il suo testo.

Stesso criterio per le etichette con chiave di codice: `SPECIES_LABEL`, `SEX_LABEL`, `SIZE_LABEL`, `TEMPERAMENT_LABEL` in `src/lib/dogList.ts`, le label delle icone in `src/assets/icons/icons.ts`, le intestazioni in `earningsPdf.ts`, `earningsXlsx.ts` ed `earningsExport.ts`. Entrano nel vocabolario. Il valore scritto dal salone, se non è più la stringa predefinita, resta com’è.

Date, euro, ordinamento dei nomi e plurali passano da un solo modulo, `src/i18n/format.ts` (date-fns con locale `it`, `enGB`, `es`, `Intl.Collator`, `Intl.PluralRules`). Le Cloud Functions usano lo stesso modulo o una copia condivisa. Le chiavi di macchina (giorno `en-CA`, fuso `Europe/Rome`, spareggio per `id`) restano com’è: non sono una lingua dello schermo (decisione D30).

L’ordinamento alfabetico dei nomi usa la lingua dello schermo (`it`, `en-GB`, `es`) tramite `src/i18n/format.ts`, al posto del confronto fisso `it`.

Date ed euro visibili seguono la lingua dello schermo, dallo stesso modulo.

| Lingua | Settimana | Data di esempio | Euro |
|---|---|---|---|
| Italiano | lunedì | come oggi, per esempio «Domenica 25 ottobre» | come oggi: `€ 1.234,56` |
| Inglese | lunedì | 25 October 2026 | `€1,234.56` |
| Spagnolo | lunedì | 25 de octubre de 2026 | `1.234,56 €` |

Il messaggio WhatsApp che il salone apre verso il cliente usa `linguaClienti`, anche se a tenere il telefono è un collaboratore con un’altra lingua.

Nomi di cani, note, voci di listino, ragione sociale, nome del salone, telefono, indirizzo e ogni altro testo inserito dal salone non si traducono.

## Email

Il testo delle email sta nel vocabolario. Una funzione pura restituisce oggetto e HTML per una lingua e un tipo. L’HTML riporta il modello attuale: logo, colori, titoli grandi e pulsante. Il server, quando spedisce da solo, consegna quel risultato a Brevo, con mittente `noreply@groomlyapp.it`. Finché la funzione di invito in produzione usa ancora il modello 5, quel modello resta acceso. Non si spengono i modelli 3–12 da qui. I link delle email di verifica e di reset puntano a `https://groomlyapp.it/azione` e portano la lingua nel `continueUrl` (`lang=it`, `lang=en` o `lang=es`). Nome del salone, nome del cane, indirizzo email e link restano i dati ricevuti. Le date dentro l’email seguono la lingua di quell’email. Ogni testo del salone inserito nell’HTML è escapato: `<` e `&` restano testo.

| Email | Lingua |
|---|---|
| Verifica account | lingua della persona |
| Reset password | lingua salvata sull’account, altrimenti lingua del telefono valida, altrimenti inglese |
| Invito al team | lingua di chi invita |
| Ricevuta della richiesta | lingua dei clienti |
| Conferma | lingua dei clienti |
| Proposta di orario | lingua dei clienti |
| Rifiuto | lingua dei clienti |
| Scadenza | lingua dei clienti |
| Disdetta | lingua dei clienti |
| Promemoria | lingua dei clienti |

## Pagine legali e pagine pubbliche

Privacy, termini, accordo sul trattamento dei dati, elimina account e la pagina `groomlyapp.it/azione` escono dal vocabolario. L’indirizzo aperto dall’app porta `?lang=` della persona. Se il parametro manca o non è `it`, `en` o `es`, la pagina usa la lingua del browser con la stessa regola del telefono: italiano, inglese, spagnolo, e inglese per ogni altra lingua. Su queste pagine c’è la riga Italiano · English · Español, perché si aprono nel browser, fuori da Impostazioni. I link fra queste pagine conservano la lingua scelta.

In cima alle quattro pagine legali tradotte si dice che sono la traduzione dei testi italiani attuali del 25 ottobre 2026 (termini 1.1; privacy e accordo senza indirizzo di casa) e che, se un periodo non coincide, vale il testo italiano. La struttura dei capitoli resta quella dei file attuali in `docs/legal/`. Tradurre queste pagine le rende leggibili fuori dall’Italia. Non sostituisce il parere di un avvocato sul lancio in un altro paese, e non cambia la legge e il foro scritti nel testo italiano.

La pagina pubblica del salone e i passi della prenotazione (servizio, orario, dati, inviata, stato) escono dal vocabolario in `linguaClienti`. Nome, telefono e indirizzo restano quelli del titolare. Anche lì i testi del salone sono escapati.

Le regole di sicurezza in `firestore.rules` restano codice. Non hanno frasi da tradurre. Le regole che la persona legge sono i termini, la privacy, l’accordo e i messaggi di errore.

## Errori e salvataggio

Le funzioni dell’app e del server che oggi restituiscono una frase italiana (`Nome già preso`, `Scegli un cane`, `Inserisci un’email valida`, `Invio non riuscito`, e le altre dello stesso tipo) restituiscono un codice stabile. La schermata lo traduce nella lingua della persona. La pagina nel browser lo traduce nella lingua di quella pagina. Se per un codice manca la frase nella lingua richiesta, l’ordine è: lingua richiesta, poi inglese, poi italiano. Il nome del codice non arriva mai a schermo.

Un `lingua` o `linguaClienti` diverso da `it`, `en`, `es` conta come assente. Per la persona, assente significa lingua del telefono e, se quella non è fra le tre, inglese. Per i clienti, assente significa italiano.

Se la scrittura sul server del cambio lingua fallisce, lo schermo resta sulla lingua appena scelta, compare il toast di salvataggio non riuscito tradotto, e al prossimo avvio con rete si riprova la scrittura che non è arrivata (`lingua` della persona, oppure `linguaClienti` se a fallire è stata la voce del titolare). Email e pagina pubblica restano sull’ultima `linguaClienti` che il server ha salvato.

Limiti di invio, attese, errori di Brevo e validazioni di prezzo e orario tengono lo stesso comportamento di oggi. Cambia la lingua della frase.

Il normalizzatore del telefono resta quello italiano, con il prefisso 39. Non fa parte di questo lavoro.

## Test

`npm test` deve passare. I test italiani già presenti restano verdi: il salone di oggi non cambia comportamento, a parte la lingua quando la si sceglie.

Vocabolario e regole:

- Stesse chiavi in `it`, `en`, `es`, frasi non vuote, stessi segnaposto.
- Telefono italiano, inglese, spagnolo e francese: il francese diventa inglese.
- Valore di lingua illeggibile trattato come assente.
- `linguaClienti` assente: i clienti restano in italiano.
- Un collaboratore che cambia la propria lingua non scrive `linguaClienti` e non vede «Lingua dei clienti».
- Nel salone condiviso solo il titolare autorizzato dalle regole esistenti scrive `linguaClienti`. Nessun nome di persona nel test.
- Un account nuovo titolare scrive `lingua` e `linguaClienti` dalla lingua del telefono, con lo stesso valore iniziale.
- Un account già esistente, al primo avvio, scrive solo `lingua`.
- Cambiare la propria lingua non cambia `linguaClienti`. La voce «Lingua dei clienti» la cambia solo il titolare.
- I servizi nuovi nascono nella lingua del telefono del titolare. Un nome ancora uguale al predefinito italiano si traduce a schermo e sul listino; un nome cambiato dal salone resta il suo.
- Il listino PDF/JPEG usa `linguaClienti`. Il report Incassi, il PDF e l’Excel usano la lingua della persona.
- Date ed euro per le tre lingue, con l’italiano uguale al formato attuale. I plurali passano da `Intl.PluralRules`.
- Ogni codice di errore ha la frase nelle tre lingue. Se manca nella lingua richiesta, si usa l’inglese; se manca anche l’inglese, l’italiano.

Email e pagine:

- Per ognuna delle dieci email, oggetto e corpo in `it`, `en`, `es`, con logo e pulsante nell’HTML.
- Link e nomi inseriti presenti. Un nome che contiene `<` resta testo.
- Verifica e reset usano la lingua della persona, con le eccezioni del reset descritte sopra.
- L’invito usa la lingua di chi invita e le etichette Partner / Team member e Socio / Colaborador.
- Le sette email ai clienti usano `linguaClienti`.
- Privacy, termini, accordo, elimina account, pagina azione, pagina del salone, i cinque passi di prenotazione e la scheda cane `hosting/c` esistono nelle tre lingue. I testi del salone sono escapati.
- Le pagine legali dichiarano che fa fede il testo italiano attuale (termini 1.1, privacy e accordo senza indirizzo di casa).
- Le notifiche push composte dal server (`sendPush`) leggono `lingua` dell’account e prendono titolo e testo dal vocabolario.
- `android/app/src/main/res/values-en` e `values-es` contengono il nome dei canali e i testi dei permessi. Il nome app resta Groomly. Le stesse stringhe stanno nel sorgente comune, quindi le varianti `github` e `play` le hanno entrambe.
- `?lang=fr` sulla pagina pubblica di Groomly ricade sulla lingua del browser e poi sull’inglese.

Schermate. In inglese, e di nuovo in spagnolo, si aprono e si controllano titolo, pulsanti, stato vuoto e testi fissi:

- Accesso, invito
- Home, animali, scheda cane
- Calendario, mensili
- Appuntamento, appuntamento personale, chiusura
- Incassi, report, statistiche
- Listino, vista, prezzi, gestione, stampa
- Impostazioni, servizi, archivio, Pro, piano, team, messaggi, strumenti, notifiche, aggiornamenti, utenti
- Privacy nell’app, elimina account

In Impostazioni, cambiare la propria lingua aggiorna subito lo schermo e scrive solo `lingua`. «Lingua dei clienti» scrive solo `linguaClienti`, ed è assente per socio e collaboratore. I dialoghi si aprono nelle tre lingue: esci, elimina account, attività, ripristino, paywall, proposta Pro, e i toast di salvataggio, copia ed esportazione. Un nome cane resta identico in inglese e in spagnolo. Un campo ancora chiamato «Razza» mostra la traduzione; un campo rinominato dal salone mostra il testo del salone. Un servizio ancora chiamato «Bagno + taglio» mostra la traduzione; uno rinominato mostra il testo del salone.

Un controllo finale percorre le schermate in inglese e fallisce se compare una frase del vocabolario italiano diversa dalla frase inglese. Groomly, Privacy, Email e i nomi propri dei servizi possono restare uguali.

Il lavoro di codice è concluso quando `npm test` passa con questi controlli. Il giro a mano, schermata per schermata sull’app avviata, viene dopo i test automatici.

## Fuori da questo lavoro

- Valute diverse dall’euro. Sterlina, dollaro e scelta della valuta.
- Campi fiscali per paese. NIF, CIF, tax ID al posto di partita IVA e codice fiscale.
- Lingue oltre italiano, inglese e spagnolo.
- Tradurre nomi, note, listino e gli altri testi del salone.
- Tradurre `/dev/kit`.
- Cambiare il normalizzatore telefonico italiano.
- Un selettore di lingua sulla schermata di accesso.
- Un parere legale nuovo, o una modifica a legge e foro.
- Tradurre il file `firestore.rules`.
- La scheda Play Store in inglese e in spagnolo. Si fa alla pubblicazione, non in questo codice. La voce sta in `docs/DA-FARE-ROBERTO.md`.
- Spegnere i modelli Brevo 3–12. Resta a chi pubblica, dopo che il codice spedisce l’HTML da solo.
