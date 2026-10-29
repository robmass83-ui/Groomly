# Security Review: Groomly

Revisione statica del repository al 28 ottobre 2026. Nessun file dell’app è stato modificato. Non è stato eseguito un test dinamico contro il progetto Firebase in produzione.

### Summary

- **Findings**: 4 (0 Critical, 1 High, 3 Medium)
- **Risk Level**: High
- **Confidence**: High sulle quattro segnalazioni. Il resto è o un controllo che regge, o un punto da verificare prima di trattarlo come falla.

L’isolamento tra saloni, in `firestore.rules`, è il controllo più solido del progetto. Il problema sfruttabile da chiunque, senza account, sta nelle Cloud Functions della prenotazione pubblica: `inviaRichiesta` scrive nell’agenda del salone senza limite e, se nella richiesta mancano giorno e ora, salta anche il controllo del posto libero.

---

### Ambito

Controllati, nel codice e nelle regole, i cinque punti chiesti:

| Area | Dove |
| --- | --- |
| Accesso e login | `src/data/firebase/client.ts`, `src/hooks/useSession.tsx`, `src/lib/password.ts`, `hosting/azione/index.html`, `sendPasswordResetEmail` / `sendVerificationEmail` |
| Chi vede e modifica i dati di chi | `firestore.rules`, `src/lib/salonPath.ts`, inviti e ruoli in `functions/src/index.ts` |
| Database | `firestore.rules`, letture e scritture Admin SDK nelle Functions |
| Chiavi e segreti | sorgenti, `functions/.env.example`, `.env.test`, `.gitignore`, `defineSecret('BREVO_API_KEY')` |
| Input degli utenti | pagina pubblica, callable, HTML delle email, logo pubblico |

Guide usate per il giudizio: autenticazione, autorizzazione, injection, XSS, CSRF, segreti, API e i pattern JavaScript/React. Una segnalazione entra nel rapporto solo se l’input è controllato da chi attacca e il percorso è davvero raggiungibile.

---

### Findings

#### [VULN-001] Scrittura illimitata di prenotazioni, senza accesso (High)

- **File**: `functions/src/index.ts` (callable `inviaRichiesta`, circa righe 589–608), `functions/src/piano/inviaRichiesta.ts` (righe 27–67), `src/lib/prenotazione.ts` (`intervalloRichiesta`, righe 44–67), `functions/src/piano/postiLiberi.ts` (`preparaRichiestaPer`, righe 96–116)
- **Gravità**: High
- **Confidence**: High

**Problema**

`inviaRichiesta` e `preparaRichiesta` sono callable pubbliche (`invoker: 'public'`) e non leggono `request.auth`. App Check è spento (`APP_CHECK_ATTIVO = false` in `src/lib/appCheck.ts`, e `APP_CHECK_ENABLED` è `false` anche in `android/app/build.gradle`). La pagina `hosting/s/pagina.js` pubblica il `salonId` dentro il JSON `#profilo`.

Il limite antispam (2 richieste aperte per telefono, 20 per salone) vive solo in `preparaRichiestaPer`. `inviaRichiestaPer` non lo chiama. Nome, telefono ed email non hanno un tetto di lunghezza sul server. Le foto sì: al massimo 3, circa 120 KB l’una (`src/lib/fotoRichiesta.ts`).

In più, il posto libero si controlla solo se arrivano sia `giorno` sia `ora`. Chi manda soltanto `inizio` e `fine` passa da quest’altro ramo e il controllo non parte:

```44:67:src/lib/prenotazione.ts
export function intervalloRichiesta(input: {
  giorno?: string
  ora?: string
  inizio?: string
  fine?: string
}): { inizio: Date; fine: Date; giorno: string; ora: string } | null {
  if (input.giorno && input.ora && /^\d{4}-\d{2}-\d{2}$/.test(input.giorno) && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.ora)) {
    const inizio = istanteRoma(input.giorno, input.ora)
    return {
      inizio,
      fine: new Date(inizio.getTime() + DURATA_PUBBLICA_MIN * 60 * 1000),
      giorno: input.giorno,
      ora: input.ora,
    }
  }
  if (!input.inizio) return null
  // ... giorno e ora restano vuoti: il controllo del posto non scatta
}
```

```44:47:functions/src/piano/inviaRichiesta.ts
  if (quando.giorno && quando.ora) {
    const liberi = await postiLiberiPer(input.salonId, quando.giorno, 60)
    if (!liberi.orari.includes(quando.ora)) throw new HttpsError('failed-precondition', 'Orario non disponibile')
  }
```

Ogni scrittura riceve un `token` casuale. In home il salone mostra le richieste `nuova` che hanno un token e una data futura (`listenRichiesteNuove` in `src/data/firebase/client.ts`).

**Come si sfrutta**

Chiunque, senza account, legge il `salonId` dalla pagina pubblica del salone (compare se le prenotazioni online sono accese) e chiama la function. Con `esca` vuota, una email qualsiasi, una razza e una specie accettata dal salone, e con `inizio`/`fine` nel futuro, ottiene una riga vera nella raccolta `salons/{salonId}/richieste`. Può ripeterlo senza tetto. Può metterci nome, telefono ed email di una terza persona, e fino a tre foto. Il salone le vede in home e può chiamare o scrivere a quei contatti. Ogni documento può avvicinarsi al megabyte di Firestore. Il campo `consenso` inviato dalla pagina non è letto dal server.

`preparaRichiesta` è lo stesso tipo di scrittura, con il tetto di 20 documenti `nuova` per salone. Quei segnaposto non hanno token, quindi non compaiono in home, ma entrano nel conteggio delle richieste aperte e portano `scadeIl`.

Oggi `index.ts` chiama `inviaRichiestaPer` senza passare la chiave Brevo, quindi questa function non spedisce email. Se un giorno le si passa la chiave senza un tetto, la stessa chiamata diventa un invio di posta verso un indirizzo scelto da fuori, a nome del salone.

**Correzione proposta**

1. Obbligare giorno e ora di Roma, e rifiutare la richiesta se quell’orario non è in `postiLiberiPer`. Togliere il ramo che accetta solo `inizio`/`fine` dalla pagina pubblica.
2. Applicare `decisioneAntispam` (o un tetto più stretto) anche a `inviaRichiesta`, contando le `nuova` già presenti. Aggiungere un limite per indirizzo IP o per email, non solo per telefono.
3. Limitare nome, telefono ed email (per esempio 80, 20 e 320 caratteri) e rifiutare date fuori da un orizzonte, lo stesso delle 42 giorni di `ORIZZONTE_GIORNI`.
4. Accendere App Check sul client e `enforceAppCheck: true` su queste callable. Da solo non basta: la function va comunque limitata, perché un token App Check si può ottenere dal sito pubblico.
5. Tenere `preparaRichiesta` spenta verso l’esterno se la pagina non la usa più.

#### [VULN-002] Il link in email conferma o rifiuta la visita con una GET (Medium)

- **File**: `functions/src/piano/rispondiRichiesta.ts` (righe 39–86), `functions/src/piano/gestisciPrenotazione.ts` (`linkRisposta`, righe 32–33), `functions/src/index.ts` (callable `rispondiRichiesta`, circa riga 634)
- **Gravità**: Medium
- **Confidence**: High

**Problema**

Il link di conferma e di rifiuto è una URL con `salonId`, `id`, `token` e `azione`. La function, su `GET`, applica il piano e può confermare o rifiutare l’appuntamento e mandare un’altra email. Il commento nel file dice che le anteprime di posta fanno `HEAD` e che quelle non devono cambiare nulla. Molti filtri (Safe Links, gateway aziendali) seguono il link con `GET` prima che la persona lo tocchi.

Il token è `randomBytes(16)` (128 bit), quindi non si indovina. Il problema è che la URL stessa è il segreto e che leggerla cambia i dati.

**Come si sfrutta**

Il programma di posta del cliente, o un antivirus che preleva i link, apre la URL. La visita risulta confermata o rifiutata senza un gesto della persona. La stessa URL, se finisce in un log o in un referrer, basta a chi la possiede per ripetere l’azione finché lo stato lo consente. Non serve un account Groomly.

**Correzione proposta**

La `GET` deve solo mostrare una pagina con un pulsante. La modifica del documento deve avvenire su `POST`, con lo stesso token. Rispondere `200` senza scrivere anche alle `GET` dei scanner. Tenere il token fuori dai log applicativi.

#### [VULN-003] Un utente qualsiasi fa leggere tutti gli account e può staccare un dispositivo (Medium)

- **File**: `functions/src/index.ts` (`prendiPushTelefono`, righe 216–249), `functions/src/sendPush.ts` (`dispositiviDaRilasciare`, righe 103–114)
- **Gravità**: Medium
- **Confidence**: High
- **Accesso richiesto**: un account Groomly qualsiasi. La registrazione è aperta.

**Problema**

A ogni chiamata la function, con l’Admin SDK, legge l’intera raccolta `accounts` e, per ciascun account, i dispositivi con quel token. Poi cancella i documenti il cui token coincide con quello inviato nel body, anche se appartengono a un altro uid. Non c’è un tetto di chiamate. Le regole Firestore, da sole, non lascerebbero leggere i dispositivi altrui: qui il bypass è il codice della function.

**Come si sfrutta**

Un account appena creato può richiamare la function in ciclo. Ogni giro rilegge tutti gli account e i dispositivi: il costo Firestore cresce con il numero di saloni, e la function può andare in timeout. Se chi attacca conosce già il token FCM di un telefono (lo ha visto su quel dispositivo, in un log, o perché lo stesso apparecchio era passato dal suo account), la chiamata con `tieni: false` cancella la registrazione push di quell’altro account. Il token non viene restituito dalla function, quindi da sola non ruba i token.

**Correzione proposta**

Cercare il token con una collection group query indicizzata sul campo `token`, non con un giro su tutti gli account. Cancellare solo i dispositivi dello stesso uid, salvo il caso esplicito «questo telefono cambia account», e solo dopo aver verificato che il token è quello appena registrato da questo uid. Mettere un limite per uid (poche chiamate al minuto).

#### [VULN-004] Ogni suggerimento spedisce un’email, senza tetto (Medium)

- **File**: `firestore.rules` (raccolta `suggerimenti`, righe 278–288), `functions/src/index.ts` (`mailSuggerimento`, righe 994–1014)
- **Gravità**: Medium
- **Confidence**: High
- **Accesso richiesto**: un account qualsiasi.

**Problema**

Le regole accettano la creazione se l’utente è entrato, il `uid` è il suo, il testo è tra 10 e 2000 caratteri e la categoria è nell’elenco. Non c’è un conteggio per utente. A ogni documento creato, `mailSuggerimento` manda un’email a `info@groomlyapp.it` tramite Brevo. Il testo nell’HTML è escapato (`testoMail`), quindi non è un XSS nella posta.

**Come si sfrutta**

Un account crea decine o centinaia di suggerimenti. Ogni creazione consuma un invio Brevo e riempie la casella `info@`. Se il piano Brevo ha un tetto giornaliero condiviso con conferme e promemoria dei saloni, quelle email dei clienti restano in coda o non partono. Il `email` nel documento è scelto dal client: nelle regole non deve coincidere con l’email dell’accesso, quindi la lettera può indicare un indirizzo falso. È una seccatura per chi legge i suggerimenti, non un accesso ai dati dei saloni.

**Correzione proposta**

Contare i suggerimenti per uid (per esempio 5 al giorno) nelle regole, con un documento contatore scritto solo dalla function, oppure rifiutare in `mailSuggerimento` oltre una soglia e non chiamare Brevo. Impostare `email` dal token di accesso, non dal body. La categoria è già in un elenco chiuso: tenerla così.

---

### Needs Verification

Punti in cui il codice è debole, ma da qui non si può dire che oggi siano sfruttabili.

#### [VERIFY-001] L’operatore nelle Functions non esige l’email verificata

- **File**: `src/lib/salonPath.ts` (`isOperator`, righe 39–41), `functions/src/piano/impostaPianoManuale.ts`, `functions/src/piano/impostaFunzione.ts`, `functions/src/index.ts` (`setSalonPro`, `impostaPianoManuale`, `impostaFunzione`). Le regole, invece, in `isOperator()` esigono `request.auth.token.email_verified == true` oppure il claim `admin`.
- **Domanda**: gli account Auth di `laura.masala@tiscali.it` e `masala.roberto@hotmail.it` esistono già?

`loginEmail` prende `token.email` e basta. In Firebase quell’email c’è nel token anche prima della verifica. `cambiaEmailAccesso` usa `verifyBeforeUpdateEmail`, quindi un utente già registrato non diventa operatore cambiando email. Il percorso che resta è: quell’indirizzo non ha un utente Auth, qualcuno lo registra, e prima ancora di aprire la mail di verifica chiama `impostaPianoManuale` o `impostaFunzione` e assegna piani e funzioni a qualunque salone.

Finché quei due utenti Auth esistono, questo non è sfruttabile. La correzione è piccola e vale comunque: nelle Functions, `isOperator` deve leggere `email_verified === true` (o il claim `admin`) dallo stesso token, come già fanno le regole. `eliminaAccount` blocca la cancellazione di Laura usando l’email nel documento `accounts`, non quella di Auth: allineare anche quel controllo al token, così un campo `email` scritto dal client non decide chi è protetto.

#### [VERIFY-002] L’APK dell’aggiornamento può arrivare da un host qualsiasi, purché sia https

- **File**: `src/lib/appRelease.ts` (`releaseFromDocument`, righe 113–118, e `releaseFromGithub`), `src/app/UpdateNotice.tsx` (`AppInstaller.downloadAndInstall({ url: offer.url })` e `Browser.open`)
- **Domanda**: l’installatore Android rifiuta un APK firmato con un’altra chiave quando l’app è già installata?

`release.json` è un file pubblicato da chi gestisce l’hosting, non un input del cliente. Se quel file o la release GitHub venissero sostituiti, l’app scaricherebbe qualunque URL `https://`. Android, in un aggiornamento, impone la stessa firma: un APK firmato da un altro non sostituisce l’app già installata. Una prima installazione, invece, si fida dell’URL. Conviene accettare solo host noti (`groomlyapp.it`, `groomly-3128b.web.app`, `github.com`, `objects.githubusercontent.com`) e solo path che finiscono in `.apk`.

La variante GitHub resta firmata con la chiave debug, come da regola di pubblicazione. La chiave non è nel repository. Chi ha il keystore debug di questa macchina può firmare un APK che Android accetta come aggiornamento della variante GitHub. Il keystore va tenuto fuori dai backup e, quando Laura è avvisata, la variante pubblica va firmata con la chiave di rilascio.

---

### Chi può vedere e modificare che cosa

Questo è il modello che le regole applicano davvero. Il client non può cambiarlo: su `accounts/{uid}` un utente aggiorna solo il proprio documento, e `salonId`, `role` e `legacy` devono restare quelli già scritti. Li cambiano solo le Functions (invito, revoca, uscita).

| Chi | Vede | Modifica |
| --- | --- | --- |
| Nessun accesso | Pagina pubblica del salone (nome, telefono, indirizzo; P. IVA e codice fiscale solo se il salone ha acceso `mostraDatiFiscali`). Orari liberi, non i nomi dei clienti. Scheda cane solo con token da 32 byte, e solo nome e specie (`schedaCliente`). | Prenotazioni come in VULN-001. Conferma o rifiuto e silenzio email solo con il token del link. |
| Utente entrato, sul proprio uid | Il proprio `accounts/{uid}`, preferenze push, dispositivi, tutto `users/{uid}/**`, `config/**` in sola lettura. | Il proprio account (tranne salone, ruolo, legacy), i propri suggerimenti in creazione, i propri dispositivi. |
| Titolare | Cani, visite, file, impostazioni, servizi, chiusure, coda e richieste del suo `salonId`, se `canUse` è vero. Per il titolare `canUse` non dipende dal piano Pro. | Scrittura su quelle raccolte. `pro`, `members` e `invites` sono in sola lettura per il client: li scrivono le Functions. |
| Socio | Come il titolare, se il Pro è acceso oppure il suo documento membro ha `accessWithoutPro`. | Come il titolare (`ownerRank`). |
| Collaboratore | Le stesse raccolte del salone, con Pro acceso o `accessWithoutPro`. Vede quindi i clienti, le visite, le foto e le richieste di tutto il salone. | Crea cani solo `attivo`. Aggiorna un cane attivo senza cambiarne lo stato. Non cancella cani né visite. Crea visite. Su una visita già `completato` non può cambiare `total`, `paymentMethod`, `actualDurationMin`, `status`, `assigneeUid`. Può caricare e togliere foto di cani e visite. Non scrive impostazioni, servizi, chiusure. Sulla coda può cambiare solo `stato` e `motivo`. |
| Operatore (email verificata nelle regole, oppure claim `admin`) | Qualunque `accounts/{uid}`, le impostazioni e il Pro di qualunque salone, il salone `shared`, i suggerimenti. Le regole non gli danno i cani e le visite degli altri saloni. | Dal client, niente su quei dati: le scritture sono `false`. Piani e funzioni passano dalle callable, che oggi controllano solo l’email (VERIFY-001). |

`salon/shared` (cani, visite, file) è in sola lettura per chi può usare quel salone e per l’operatore. Il client non lo scrive.

Raccolte negate al client, e quindi solo Admin SDK: `invites`, `pushDeliveries`, `emailRateLimits`, `pubblici`, `schede`, `rcEventi`. `richieste` non è nell’elenco `salonKindWritable`, quindi il client non le scrive; le scrivono le Functions. È per questo che VULN-001 non è una falla delle regole, è una falla delle Functions.

Un socio o un collaboratore il cui Pro è scaduto, e che non ha `accessWithoutPro`, non passa da `canUse`: non legge cani e visite. Legge ancora impostazioni e Pro del salone finché `accounts.salonId` punta a quel salone (`accountSalonIs`). Alla revoca, la function rimette `salonId` all’uid della persona e il ruolo a `titolare`, e quel passaggio si chiude.

---

### Controlli che reggono

Verificati e non segnalati.

**Accesso.** Login ed errori di password usano lo stesso messaggio, «Email o password non corretti». Il reset password risponde `{ ok: true }` anche se l’indirizzo non esiste, e ha un tetto di 3 invii in 15 minuti per indirizzo (`functions/src/rateLimit.ts`). Il link di reset e di verifica passa da `buildActionLink`, che tiene solo `mode`, `oobCode` e `lang` e forza l’host `groomlyapp.it`. La pagina `hosting/azione/index.html` scrive nel DOM con `textContent` e `replaceChildren`. L’unico `innerHTML` è l’icona dell’occhio, una stringa fissa. Il cambio email passa da `verifyBeforeUpdateEmail` dopo aver ridigitato la password. Il cambio password ridigita la password attuale. `esciAltriDispositivi` revoca i refresh token solo dell’uid chiamante.

**Regole.** Default deny. Niente lettura di un salone altrui dal client. Il ruolo non si auto-promuove. I file foto del collaboratore devono avere `kind == 'foto'` e `owner` che inizia con `dog:` o `appointment:`. I pezzi di file hanno un tetto (716800 e 614400 byte). Il thumb, se c’è, sta sotto i 25000 byte. I suggerimenti non si aggiornano né si cancellano dal client.

**Segreti.** `BREVO_API_KEY` è un secret di Firebase (`defineSecret`), non una costante. `functions/.env.example` dice di impostarlo con `firebase functions:secrets:set`. `.env.local` è in `.gitignore`. `.env.test` ha le chiavi Firebase vuote. `.env.emu` ha solo `demo-key`. La chiave web Firebase arriva da `import.meta.env` ed è la chiave pubblica del client: va limitata per package Android, dominio e API nella console Google, ma non è una password. Nel sorgente non ci sono chiavi private, service account né token Brevo. Il webhook RevenueCat (`functions/src/piano/rcWebhook.ts`) rifiuta se manca la chiave API o se l’header `authorization` non è identico al valore atteso; con il segreto vuoto non scrive. Oggi quella function memorizza solo l’id dell’evento, non cambia il piano.

**Input e HTML.** React non usa `dangerouslySetInnerHTML` nel sorgente dell’app. La pagina pubblica escapa nome, indirizzo e telefono (`src/lib/paginaPubblica.ts`) e il logo pubblico accetta solo data URL `png|jpeg|webp|gif` (`src/lib/logoPubblico.ts`). Le email escapano nome e URL (`src/i18n/emailHtml.ts`). `mailSuggerimento` escapa categoria, email e testo. `schedaCliente` restituisce solo nome e specie, e il token deve essere 64 caratteri esadecimali (32 byte). Il silenzio email richiede un token emesso con `randomBytes(16)` e scritto sulla riga di coda. Gli inviti usano un token di 64 caratteri esadecimali e l’email di chi accetta deve essere quella del token di accesso.

**Webhook e CORS.** `Access-Control-Allow-Origin: *` in `firebase.json` sta sull’hosting statico (pagina, `release.json`, APK pubblico). Non apre Firestore. Le callable non prendono un URL dal client per fare richieste server-side: `githubVersion` chiama un indirizzo fisso di GitHub.

---

### Note basse, non conteggiate come falle

Sono difese da stringere. Non le ho messe tra i finding perché l’impatto diretto è piccolo o il controllo vero sta altrove.

- **Password di almeno 8 caratteri**, in `AccountPage.tsx` e in `hosting/azione/index.html`, senza controllo sulle password già finite nei breach. Con Firebase Auth la password di produzione non sta nell’hash locale. Otto caratteri restano corti per un account che vede i dati dei clienti. Ha senso un minimo più alto e il controllo di Firebase sulle password compromesse.
- **Hash locale PBKDF2-SHA256 a 100.000 giri** (`src/lib/password.ts`). Serve alla modalità solo-telefono e alla prima creazione dell’account cloud se il telefono ricorda ancora la password. L’hash resta in `localStorage` se quel percorso è stato usato. Sul dispositivo, 100.000 giri sono pochi rispetto alle 600.000 indicate per PBKDF2. Dopo il passaggio al cloud conviene cancellare `passwordHash` e `salt` dal telefono.
- **Registrazione**: `auth/email-already-in-use` diventa «Questa email ha già un account». Dice se l’indirizzo è già iscritto. Il login, invece, non lo dice.
- **`android:allowBackup="true"`** in `android/app/src/main/AndroidManifest.xml`. Il backup di Android può includere la cache locale del WebView (clienti, visite, eventuale hash). `android:allowBackup="false"`, o un backup con regole che escludono quella cache, riduce la copia sulla nuvola Google del telefono.
- **`users/{uid}/{document=**}`** è ancora leggibile e scrivibile dal proprietario, senza schema. Non attraversa gli account. Se i dati vivi stanno sotto `salons/`, questa raccolta è un residuo: va svuotata e chiusa, così un client vecchio non continua a scriverci.
- **`config/{docId}`** è leggibile da qualunque utente entrato. Va bene finché contiene solo flag di prodotto. Non metterci quote, chiavi o elenchi di saloni.
- **`accounts/{uid}` in update** non ha un elenco di campi. Oltre a `salonId`, `role` e `legacy`, il client può scrivere altro, compreso un `email` diverso da quello di Auth. Le Functions che autorizzano usano il token, con l’eccezione di Laura in `eliminaAccount` (VERIFY-001). Un `keys().hasOnly([...])` chiude la porta.
- **Confronto del webhook RevenueCat** con `!==`. Per un segreto lungo il tempo di confronto non è il rischio principale. `timingSafeEqual` è la forma giusta quando il webhook inizierà a cambiare i piani.
- **`postiLiberi`**, pubblica, a ogni chiamata legge tutte le visite, le richieste e le chiusure del salone e restituisce solo gli orari liberi. L’orizzonte è già tagliato a 42 giorni. Il dato in uscita è quello della pagina di prenotazione. Senza App Check e senza un tetto, la stessa chiamata è un moltiplicatore di letture Firestore. Il tetto di VULN-001 copre anche questa.

---

### Ordine di correzione

1. VULN-001: giorno e ora obbligatori, tetto antispam anche su `inviaRichiesta`, lunghezze massime, App Check enforced.
2. VULN-002: la GET mostra la pagina, il POST conferma.
3. VERIFY-001: `email_verified` (o claim `admin`) nelle Functions operatore, e Laura letta dal token Auth.
4. VULN-003: niente scansione di tutti gli account; cancellare solo i dispositivi di chi chiama.
5. VULN-004: tetto sui suggerimenti e email presa dal token.
6. Poi le note basse, partendo dall’hash locale da dimenticare e da `allowBackup`.
