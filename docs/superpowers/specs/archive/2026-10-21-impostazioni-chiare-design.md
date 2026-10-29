# Groomly — impostazioni chiare

Data: 2026-10-21
Stato: archiviata il 22 ottobre 2026, già nell'app. Piano: `docs/superpowers/plans/archive/2026-10-21-impostazioni-chiare.md`.

Impostazioni resta l’elenco. Attività, Aspetto, Dati e backup, Servizi e durate, Esci e la linguetta Archivio dentro Animali non cambiano comportamento. Le push non si costruiscono in questo giro.

## Decisioni chiuse

1. «Campi scheda» si toglie. Sulla scheda i nomi sono fissi, anche se in memoria ne era stato salvato un altro.
2. «Tag caratteristiche» diventa «Tag dei cani» e contiene solo i tag. Strumenti e prodotti escono dall’interfaccia. In visita si usano i suggerimenti già usati, anche se in memoria c’è un elenco salvato.
3. «Archivio animali» apre una pagina con solo i cani archiviati. La linguetta Archivio in Animali resta.
4. Il promemoria mensile sta in una pagina Notifiche. L’interruttore comanda solo la notifica sul telefono. Il riquadro in Home resta anche a interruttore spento. I giorni di anticipo valgono per la notifica e per Home. L’orario vale solo per la notifica.
5. In fondo a Impostazioni si vede solo «Groomly» e il numero di versione. Al tocco si apre lo storico delle release pubblicate.
6. L’avviso di aggiornamento parte da solo all’apertura, al ritorno nell’app e ogni minuto finché l’app è in primo piano. Dentro l’app c’è il foglio. Sul telefono c’è la notifica. A processo chiuso non arriva nulla.
7. Le push, e le altre notifiche da aggiungere nella pagina Notifiche, sono il lavoro successivo. In questa modifica non c’è una riga che le annuncia.

## Mappa

| Voce in Impostazioni | Destinazione | Sottotitolo della riga |
|---|---|---|
| Campi scheda | eliminata | |
| Servizi e durate | `/impostazioni/servizi`, come oggi | come oggi |
| Tag dei cani | foglio sopra Impostazioni | `Nessuno da proporre`, `1 da proporre sulla scheda`, oppure `N da proporre sulla scheda` |
| Archivio animali | `/impostazioni/archivio` | `N in archivio`, compreso `0 in archivio` |
| Notifiche | `/impostazioni/notifiche` | `Promemoria mensile alle HH:mm` se acceso, altrimenti `Promemoria mensile spento` |
| Groomly e versione | `/impostazioni/aggiornamenti` | nessuno |

Spariscono la sezione «Promemoria mensili», la sezione «App» e la riga «Controlla aggiornamenti». Le note scritte sotto la versione spariscono. `APP_NOTES` si toglie da `src/lib/appVersion.ts` perché non ha più lettori.

Le tre pagine usano `Header` con `backTo="/impostazioni"`, come Servizi e durate. `NavLink` di Impostazioni non riceve `end`: `/impostazioni/archivio`, `/impostazioni/notifiche` e `/impostazioni/aggiornamenti` lasciano selezionato Impostazioni. Non sono fogli: `isSheetPath` non le include.

Nessun colore esadecimale nuovo. Testo e fondi usano i token già in tema. Ogni controllo nuovo ha area di tocco di almeno 44 px di altezza. Il testo va a capo, senza puntini.

## Nomi fissi sulla scheda

`DogPage` non legge `settings.fieldLabels`. Le righe della scheda usano, in quest’ordine, queste etichette:

- Specie
- Razza
- Sesso
- Peso
- Taglia
- Cliente
- Durata media

Non si aggiunge una riga Età. Il sottotitolo della scheda resta `identityLine`, che già unisce razza ed età, e non passa da `fieldLabels`. Il campo `fieldLabels` nel documento impostazioni resta, così backup e sync non cambiano forma. Nessuna migrazione lo riscrive. Nessuna schermata lo modifica più. `setFieldLabel` può restare nel modulo dati, ma l’interfaccia non lo chiama.

## Tag dei cani

Il foglio ha titolo «Tag dei cani». Sopra la casella, questa frase intera:

«Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.»

Sotto: casella con etichetta visibile «Tag», pulsante «Aggiungi» (`aria-label` «Aggiungi tag»), poi i tag salvati, ognuno con «Togli {tag}». Una stringa vuota o di soli spazi non si aggiunge. Un doppione non si aggiunge. Togliere un tag toglie solo `tagSuggestions`.

`toolSuggestions` e `productSuggestions` restano nel documento e nel backup. Nessuna schermata li mostra o li scrive. `AppointmentPage` non li legge. Gli strumenti proposti sono sempre `Tosatrice`, `Shampoo`, `Profumo` più gli strumenti già presenti negli appuntamenti, senza duplicati. I prodotti proposti sono sempre quelli già presenti negli appuntamenti, senza duplicati.

## Archivio

Pagina titolo «Archivio». Sottotitolo «Nessuno in archivio» se il conteggio è 0, altrimenti «1 in archivio» o «N in archivio».

Elenco: cani con stato `non_in_cura` o `deceduto`, ordine alfabetico italiano, a parità di nome per id. Niente ricerca, linguette, filtri o ordinamento. Ogni riga mostra nome, sottotitolo come in Animali, e la scritta «Non più in cura» o «Deceduto». Il nome apre `/animali/{id}` con una navigazione normale: il tasto Indietro del telefono torna all’archivio. Sulla scheda non si aggiunge una freccia. A destra, «Ripristina» chiama lo stesso `restore` di Animali. Il cane esce dalla lista e la pagina resta Archivio. Se il salvataggio fallisce, vale il toast già emesso da quel salvataggio: «Salvataggio non riuscito».

Elenco vuoto: solo il testo «Nessun animale in archivio». Nessun pulsante per aggiungere un cane.

La linguetta Archivio di `/animali` e il suo indirizzo `/animali?tab=archivio` restano.

## Notifiche

Pagina titolo «Notifiche». Una scheda, titolo «Promemoria mensili».

Frase con i valori salvati. `time` è `HH:mm`. Se `daysBefore` è 1: «Alle {time} il telefono avvisa se un cliente mensile è in ritardo o va toelettato entro il giorno successivo.» Altrimenti: «Alle {time} il telefono avvisa se un cliente mensile è in ritardo o va toelettato entro i prossimi {daysBefore} giorni.» Subito dopo, nella stessa frase: «Per esempio: «2 mensili da programmare: Rex, Luna». Se apri la notifica, vai in Mensili.»

Seconda riga, calcolata con `reminderText(dueSoon(cani, appuntamenti, adesso, daysBefore))`. Se il testo c’è: «Adesso direbbe: {testo}». Se non c’è: «Adesso non parte nessuna notifica, perché non c’è un mensile in ritardo o in scadenza.» Questa riga si vede anche a interruttore spento.

Poi: «Il riquadro in Home resta anche con la notifica spenta.»

Interruttore con etichetta accessibile e visibile «Notifica sul telefono». Acceso, `monthlyReminder.enabled` è true e la notifica locale resta quella di oggi (`providers.tsx`): titolo «Promemoria mensili», corpo da `reminderText`, tap su `/mensili`, un solo avviso al prossimo orario. Spento, quella notifica si annulla. Il riquadro in Home e la pagina Mensili continuano a usare `daysBefore`.

Campi «Orario della notifica» (`type="time"`) e «Giorni di anticipo» (`type="number"`, `min="0"`). Sotto i giorni: «Vale per la notifica e per il riquadro in Home.» Si modificano anche a interruttore spento. Si salvano al cambiamento, senza pulsante Salva. Un valore dei giorni che non è una sequenza di cifre non si salva. `0` è valido.

Solo su telefono nativo, se il permesso notifiche non è `granted`, sotto l’interruttore: «Per riceverle, consenti le notifiche a Groomly.» Nel browser questa riga non c’è. Non si apre da soli la schermata di sistema.

I dati restano `{ enabled, time, daysBefore }`. Nessuna riga Push, nessun testo «prossimamente».

## Storico versioni

Il pulsante in fondo a Impostazioni mostra `Groomly ${APP_VERSION}` senza la lettera v. Nome accessibile: `Groomly ${APP_VERSION}, storico aggiornamenti`. Altezza minima 44. Non è un link esterno.

Pagina titolo «Aggiornamenti». Sottotitolo «Versione installata {APP_VERSION}». Durante il caricamento, sotto il sottotitolo, «Caricamento…». Il titolo non si sposta.

Richiesta: `GET https://api.github.com/repos/robmass83-ui/Groomly/releases?per_page=100`, `cache: 'no-store'`, header `Accept: application/vnd.github+json`. Si leggono solo gli oggetti con `draft` diverso da true e `prerelease` diverso da true, con `tag_name` interpretabile da `parseVersion` e `published_at` una data valida. Ordine: `published_at` decrescente, a parità la versione più alta. La prima pagina è quella richiesta. Se l’header `Link` contiene `rel="next"`, in fondo c’è il pulsante «Mostra le precedenti», che chiede quell’URL e accoda gli altri blocchi. Non si scarica l’APK da qui.

Ogni blocco: numero senza `v` iniziale, data con `format(date, 'd MMM yyyy', IT_DATE)`, poi le righe del corpo. Le righe si puliscono come `notesFromRelease` (si toglie il prefisso elenco, i titoli markdown e le righe vuote o che sono solo un URL) ma senza il limite di 6. Se non resta nessuna riga: «Nessuna nota per questa versione.» Il blocco la cui versione è uguale a `APP_VERSION` ha accanto la scritta «Installata», non solo un colore.

Se la richiesta fallisce o non è JSON: «Lo storico non si carica» e il pulsante «Riprova», che rilancia dalla prima pagina. Il sottotitolo con la versione installata resta. Non si ricostruisce lo storico da `release.json`.

## Avviso di aggiornamento

`watchLatestRelease` controlla all’avvio, quando `document` torna `visible`, quando arriva l’evento finestra `groomlyResume`, quando Capacitor `App` segnala `appStateChange` con `isActive === true`, e ogni 60 secondi finché la pagina è viva. Due segnali ravvicinati non lanciano due richieste insieme: se una è in corso, l’altra aspetta che finisca e poi ne fa una. La richiesta resta `fetchLatestRelease`: GitHub `releases/latest`, e se manca `release.json`. Un fallimento non apre un foglio di errore.

Se la versione non è più nuova di `APP_VERSION`, non succede nulla. Se è più nuova e non è la versione appena rimandata, si apre il foglio.

Titolo del foglio: «Vuoi aggiornare adesso?». Testo: «È pronta la versione {version}.» Poi al massimo sei righe di note, quelle già prodotte da `notesFromRelease`. Pulsanti «Scarica» e «Più tardi». Scarica, la percentuale, il permesso di installazione e «Download non riuscito» restano il comportamento attuale di `UpdateNotice`. «Più tardi» chiude il foglio e ricorda la versione solo in memoria: la stessa versione non riapre il foglio finché il processo non riparte, oppure finché si tocca la notifica. Una versione ancora più nuova lo riapre.

Sul telefono nativo, insieme al foglio, una notifica locale per quella versione, una volta per processo: id 2, canale `aggiornamenti`, titolo «Aggiornamento disponibile», corpo «È pronta la versione {version}.» Toccandola si riapre il foglio anche se si era scelto «Più tardi». Il foglio non aspetta la notifica. Se il permesso non è `granted`, si chiede una volta per processo, non a ogni minuto. Se viene rifiutato, il foglio resta e non si richiede di nuovo fino al prossimo avvio. Nel browser non si programma la notifica.

La riga «Controlla aggiornamenti» non esiste più. Impostazioni non chiama `showUpdatePrompt` e non mostra il toast «Nessun aggiornamento» né «Controllo non riuscito». `registerUpdatePrompt` resta il modo in cui un controllo esterno può aprire il foglio, se qualche altro chiamante lo usa già.

## Errori

- Tag vuoto: nessun cambiamento.
- Giorni non numerici: l’ultimo numero valido resta salvato.
- Ripristino archivio fallito: toast esistente «Salvataggio non riuscito».
- Storico assente: «Lo storico non si carica» e «Riprova».
- Controllo aggiornamento assente: silenzio, nuovo tentativo al prossimo minuto o al ritorno nell’app.
- Permesso notifiche negato: foglio di aggiornamento visibile, riga di spiegazione nella pagina Notifiche, nessuna richiesta ripetuta nello stesso avvio.

## Prove

- Impostazioni non mostra «Campi scheda», «Promemoria mensili» come sezione, «Controlla aggiornamenti», né `APP_NOTES`.
- Il foglio tag ha la frase, solo la casella Tag, e non ha Strumenti né Prodotti.
- La scheda mostra «Specie» anche se `fieldLabels.species` salvato è «Tipo».
- Una visita con `toolSuggestions` e `productSuggestions` pieni propone comunque Tosatrice e i valori già usati negli appuntamenti, non solo l’elenco salvato.
- `/impostazioni/archivio` elenca solo gli archiviati, da vuoto dice «Nessun animale in archivio», Ripristina toglie il cane dalla lista, e Impostazioni è la voce corrente della barra.
- `/animali?tab=archivio` seleziona ancora la linguetta Archivio.
- La pagina Notifiche contiene orario, giorni, l’esempio Rex e Luna, e la riga «Adesso direbbe» o quella sul silenzio. Interruttore spento: `enabled` false e il riquadro in Home resta. I giorni cambiano il testo «scadono entro N gg» in Home.
- Il pulsante `Groomly ${APP_VERSION}` apre lo storico. Una release installata ha «Installata». Una risposta non valida mostra «Lo storico non si carica». Con `Link` `rel="next"` compare «Mostra le precedenti».
- Il foglio si intitola «Vuoi aggiornare adesso?». Al ritorno nell’app parte un controllo. La notifica si programma una volta per versione. «Più tardi» non riapre la stessa versione. Il tap sulla notifica la riapre.

## Dopo, fuori da questo piano

Pagina Notifiche, più avanti: notifiche push e gli altri avvisi. La prima push è «Aggiornamento disponibile» anche con Groomly chiusa, via Firebase Cloud Messaging, token del dispositivo e una funzione cloud. Non fa parte dei task di questa specifica. Nessuna riga vuota in Impostazioni la anticipa.
