# Notifiche push

## Scelte

Queste decisioni sono chiuse. Non sono domande aperte.

- Le push stanno nella pagina Notifiche già aperta da Impostazioni. Non si aggiunge una seconda voce di menu e non si cambia la forma di `SettingsMain`.
- Le preferenze sono dell’account, non del salone condiviso. Laura e Roberto le scelgono ognuno per sé. Il documento `salon/shared/settings/main` non riceve campi push.
- Il riquadro «Da chiudere» in Home resta com’è: un’ora dopo la fine, con `CLOSE_AFTER_MS`. I minuti della push non lo spostano. Il promemoria mensile resta quello già in pagina.
- L’invio è Firebase Cloud Messaging, da una funzione pianificata. Non è una notifica locale programmata al salvataggio dell’appuntamento: quella non parte se il telefono non ha aperto Groomly, e non raggiunge l’altro telefono.
- La funzione gira ogni 5 minuti, regione `europe-west1`. Se il deploy della funzione pianificata fallisce perché il progetto non è su Blaze, ci si ferma e lo si dice. Non si sostituisce con un allarme locale.
- `google-services.json` non si inventa. Si scarica dal progetto `groomly-3128b` per l’app Android `it.groomly.app`. Se il comando non lo ottiene, la pagina e la funzione restano, il telefono non registra il token, e in pagina compare la frase di indisponibilità. Non si committa una chiave privata di service account.

La ricerca UX su «impostazioni notifiche» non ha restituito una scheda utilizzabile. La pagina segue quindi le regole già usate in Notifiche e la tabella di priorità: etichetta visibile oltre all’`aria-label`, testo di aiuto accanto al controllo, altezza almeno 44 px, niente ellissi sul testo, nessun colore esadecimale nuovo.

## Pagina

Seconda scheda, sotto «Promemoria mensili», titolo «Notifiche push».

Frase fissa: «Arrivano sul telefono, anche con Groomly chiusa. Non spostano i riquadri in Home.»

Interruttore con etichetta visibile «Notifiche push». Spento di default. Sul telefono Android, accenderlo chiede il permesso di notifica se non è già `granted`. Se viene rifiutato, l’interruttore torna spento e compare «Per riceverle, consenti le notifiche a Groomly.» Nel browser accenderlo salva solo la preferenza: non chiede un permesso e non registra un token. Sotto i tipi, nel browser: «Da questo browser non partono.»

Con l’interruttore spento, i controlli sotto restano visibili, disabilitati, e tengono il valore già scelto. Accendendolo di nuovo, quelle scelte tornano attive. Se il documento preferenze non esiste ancora, i due tipi partono accesi.

Tipi, etichetta visibile e testo sotto:

- «Aggiornamenti». Testo: «Sul telefono: «È pronta la versione 1.2.0».»
- «Da completare». Testo: «Sul telefono: «C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento».»

Campo «Minuti dopo la fine», intero da 0 a 1440, default 60. Lo 0 è valido e vuol dire alla fine dell’appuntamento. Una stringa non numerica non cambia l’ultimo valore valido. Testo sotto: «Vale solo per questa push. In Home, Da chiudere resta un’ora dopo la fine.»

Salvataggio a ogni cambiamento, come il promemoria mensile. Se il salvataggio fallisce, il toast già esistente «Salvataggio non riuscito».

In Impostazioni la riga Notifiche legge `accounts/{uid}/push/prefs`, non `SettingsMain`. Tiene il dettaglio del mensile e aggiunge lo stato push, con lo spazio e il punto mediano:

- mensile acceso: `Promemoria mensile alle HH:mm · Push spente` oppure `Promemoria mensile alle HH:mm · Push attive`
- mensile spento: `Promemoria mensile spento · Push spente` oppure `Promemoria mensile spento · Push attive`

`HH:mm` è `monthlyReminder.time`.

## Dati

`accounts/{uid}/push/prefs`, scrivibile solo dal titolare di `uid`:

```
enabled: boolean
updates: boolean
complete: boolean
completeAfterMin: number
updatedAt: string
```

Documento assente equivale a `enabled: false`, `updates: true`, `complete: true`, `completeAfterMin: 60`. Un tipo nuovo, aggiunto in seguito, ha la chiave booleana assente e vale `false`: chi ha già le push non riceve un tipo nuovo finché non lo accende.

`accounts/{uid}/devices/{deviceId}`:

```
token: string
platform: 'android'
appVersion: string
updatedAt: string
```

`deviceId` è un id creato una volta sul telefono e tenuto in locale. Il token si scrive solo con permesso concesso, piattaforma Android e `enabled` true. Spegnere l’interruttore cancella il token di quel dispositivo e lascia le preferenze. `appVersion` è `APP_VERSION`, aggiornata a ogni avvio nativo.

`pushDeliveries/{id}` lo scrive solo la funzione. Il client non lo legge. L’id è `{deviceId}__{kind}__{subject}`. `kind` è `updates` o `complete`. `subject` è la versione, per gli aggiornamenti, o l’id appuntamento, per da completare. Caratteri diversi da lettere, cifre, `_` e `-` diventano `_`.

## Quando parte

Ogni 5 minuti la funzione legge gli account, le preferenze e i dispositivi con un token.

**Da completare.** Solo se `enabled` e `complete`. Appuntamenti in `salon/shared/appointments` con `status` `programmato`. La fine è `roundEnd` di `start` più la somma di `services[].durationMin`, calcolata sull’orologio `Europe/Rome`, la stessa formula di `src/lib/quote.ts`. Il server non usa il fuso UTC del processo. Home continua a usare l’orologio del telefono, come oggi: con il telefono su `Europe/Rome` le due scadenze coincidono. La push scatta quando `fine + completeAfterMin minuti` è nel passato e non più vecchia di 24 ore. Già consegnata a quel dispositivo: non si ripete. Al massimo 8 per dispositivo a ogni giro, le più vecchie prima; le altre restano per il giro dopo. Nome del cane da `salon/shared/dogs/{dogId}` campo `name`. Se manca: «C’è da completare un appuntamento: è passato il tempo dopo la fine dell’appuntamento.»

Titolo: «Da completare». Corpo, con il nome: «C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento.» Il nome è quello salvato, non si forza la maiuscola. Dati: `type=complete`, `appointmentId`, `url=/appuntamenti/{id}`.

**Aggiornamenti.** Solo se `enabled` e `updates`. Una lettura di `releases/latest` per giro, la stessa fonte già usata dall’app, con l’asset `groomly.apk`. Si manda se la versione è più nuova di `appVersion` del dispositivo e non è già stata consegnata a quel dispositivo. Titolo: «Aggiornamento disponibile». Corpo: «È pronta la versione {version}.» Dati: `type=update`, `version`.

Un token che FCM rifiuta come non registrato si toglie dal dispositivo.

Con Groomly aperta, la scheda «Da completare» in Home non cambia. Se arriva la push di un appuntamento mentre il processo è aperto, il telefono mostra comunque la notifica di sistema, canale `da-completare`, nome «Da completare». Il tap apre `/appuntamenti/{id}`.

Con il tipo Aggiornamenti acceso e il token registrato, `UpdateNotice` non programma la notifica locale id 2 per quella versione: la push è la notifica sul telefono. Il foglio «Vuoi aggiornare adesso?» resta, all’apertura e al ritorno nell’app. Se il token non c’è, la notifica locale id 2 resta com’è oggi. Un tap sulla push di aggiornamento apre Groomly; il foglio compare dal controllo già esistente. Non si scarica l’APK dal tap.

Nel browser non si registra il token e non si programma una push.

## Errori

- Permesso negato: interruttore spento, frase «Per riceverle, consenti le notifiche a Groomly.»
- Salvataggio preferenze fallito: «Salvataggio non riuscito».
- `google-services.json` assente o registrazione token fallita: «Le notifiche push non sono disponibili su questo telefono.» L’interruttore può restare acceso nelle preferenze; senza token non parte nulla.
- GitHub non risponde nel giro della funzione: quel giro non manda aggiornamenti e non segna la consegna. Il giro dopo riprova. Da completare di quel giro non dipende da GitHub.
- Appuntamento chiuso, cancellato o assente: nessuna push.

## Prove

- `completeAfterMin` a 15 non sposta «Da chiudere» in Home, che resta un’ora dopo la fine.
- Il promemoria mensile, spento o acceso, non cambia testo né orario per colpa della push.
- Preferenze assenti: nessuna push. `enabled` false: nessuna push. `complete` false: niente da completare, gli aggiornamenti possono partire. `updates` false: il contrario.
- Un appuntamento `completato` non genera «Da completare». Uno scaduto da più di 24 ore nemmeno. Uno già presente in `pushDeliveries` nemmeno.
- La fine usata dalla funzione coincide con `roundEnd` in `Europe/Rome`.
- I testi di titolo e corpo sono quelli di questa specifica, nome cane incluso.
- In pagina, interruttore spento: i due tipi e i minuti sono disabilitati. Acceso: si possono spegnere uno alla volta.
- La riga Impostazioni contiene «Push spente» o «Push attive».
- Con aggiornamenti push attivi e token presente, `LocalNotifications.schedule` non viene chiamato per l’id 2. Senza token, viene chiamato come oggi.
- Le regole negano al client lettura e scrittura di `pushDeliveries`, e negano a un altro uid la scrittura di `accounts/{uid}/push/prefs`.

## Dopo

Un tipo push nuovo è una chiave booleana in più, default false, un interruttore in più in questa scheda e un ramo in più nella funzione. Non fa parte di questo lavoro. Non si aggiunge una riga vuota per i tipi futuri.
