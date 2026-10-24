# Groomly — Il salone di Laura sul percorso degli altri

Data: 2026-10-24
Stato: accettata il 2026-10-24. Il piano di questo passaggio si esegue. Il secondo passaggio, dopo il controllo di Laura, non fa parte di quel piano.

L’app è una sola. I saloni nuovi stanno sotto `salons/{id}`. Il salone di Laura sta ancora sotto `salon/shared`, con un secondo blocco di regole, una copia dal vecchio `users/{uid}` e le notifiche che leggono solo quel ramo. Questo lavoro lo porta sul percorso degli altri, senza perdere cani, appuntamenti, foto, listino, chiusure e segni di cancellazione. Il codice speciale si toglie dopo, quando Laura ha controllato i dati sull’app nuova.

Il lavoro parte dal ramo dove il piano Pro è già pubblicato (`pro-collaboratori`), non dal `main` fermo a prima di Pro. Qui il ruolo socio esiste e la pagina «Utenti» ha il pulsante a tutta larghezza.

## Decisioni chiuse

1. La copia è sul server, con l’Admin SDK. Gli id dei documenti non cambiano. Una foto è `file:{id}`: lo stesso id di file resta appeso al cane, alla visita e al listino.
2. Laura (`laura.masala@tiscali.it`) è titolare di `salons/{suo uid}`. Roberto (`masala.roberto@hotmail.it`) è socio di quello stesso salone, con gli stessi privilegi del socio. Il suo accesso non dipende da Pro. Un altro socio o collaboratore, con Pro spento, esce.
3. Pro su quel salone si accende nel passaggio. Roberto occupa un posto, come ogni socio.
4. `legacy` diventa falso solo se, in quel momento, Firebase ha già l’email confermata. Altrimenti resta vero: con `legacy` falso e email non confermata l’app si ferma su «Controlla la tua email». Questo lavoro non aggiunge un obbligo di conferma più avanti.
5. Le due email restano operatore. La pagina «Utenti» la vedono solo loro. Il VIP, con privilegi diversi da questi, non entra in questo lavoro.
6. Si cancellano gli altri saloni, i loro account e i loro accessi (email e password). Restano tre accessi: Laura, Roberto, e `robmass83@gmail.com` (toelettatura Troddioni). Il salone di Troddioni non si sposta e non si cancella.
7. `salon/shared` dopo la copia non si scrive e non si cancella. Si toglie solo nel secondo passaggio, dopo il controllo di Laura.
8. I nomi «Laura Masala» e «Salone di Laura» usati nel disegno del menu sono solo il filo del disegno. In app la riga mostra il nome vero del titolare e il nome attività vero.

## Fuori da questo lavoro

- Un marchio VIP e privilegi diversi da quelli già decisi qui.
- Carta, canone, rinnovo.
- Cambiare il titolare: resta l’account il cui uid è il `salonId`.
- Obbligare Laura o Roberto a confermare l’email in un secondo momento.
- Cancellare `users/{uid}` di Laura, di Roberto o di Troddioni. Quelli dei saloni cancellati sì.

## 1. Cosa si copia, cosa resta, cosa si cancella

L’origine è ogni documento sotto `salon/shared`, sottoraccolte comprese: cani, appuntamenti, servizi, chiusure, `settings/main`, file con `full` e `chunks`, `meta/deleted-dogs`, `deletedDogs`, `members`, `pro/main`, ogni `meta/restored-…`, e qualunque altra raccolta che c’è lì. Non si usa un elenco fisso di nomi: si copia ogni percorso.

La destinazione è `salons/{uid di Laura}`, l’uid dell’accesso `laura.masala@tiscali.it`. Se lì c’è già un cane, un appuntamento o un file, la copia si ferma e non sovrascrive.

Tre accessi restano, email e password comprese:

| Email | Dopo il passaggio |
| --- | --- |
| `laura.masala@tiscali.it` | Titolare di `salons/{suo uid}` |
| `masala.roberto@hotmail.it` | Socio di quel salone. Non ha un salone suo |
| `robmass83@gmail.com` | Titolare di Troddioni, salone lasciato dov’è |

Il nome Troddioni si legge in `settings/main` del salone di quell’account, campo `business.name`. Spazi ai bordi e maiuscole non contano. L’impronta della cancellazione è lo SHA-256 esadecimale, in minuscolo, delle uid da cancellare ordinate e unite da un a capo. Non include i tre accessi da tenere. Se il nome non è Troddioni, o se quell’account non ha un `salonId` suo (vuoto, `shared`, o uguale all’uid di Laura), la cancellazione non parte.

Prima di cancellare, lo script stampa l’elenco e un’impronta di quell’elenco, e non cancella. Cancella solo un lancio successivo che ripete quell’impronta, e solo se l’elenco è ancora quello. Per ogni altro accesso toglie, in quest’ordine, l’albero `salons/{suo salonId}`, il vecchio `users/{uid}`, gli inviti di quel salone, il documento `accounts/{uid}` (dispositivi compresi), poi l’utente di accesso. Toglie anche un `salons/{id}` che non ha account, se l’id non è l’uid di Laura e non è il salone di Troddioni. Un `salons/{uid di Roberto}`, se esiste e non è il salone di Laura, si cancella: il suo account e la sua password restano.

Non entrano mai in quell’elenco: `salon/shared`, `salons/{uid di Laura}`, il salone di Troddioni, i tre accessi, e i `users/{uid}` di quei tre. Un nome Troddioni che non torna non annulla la copia già fatta di Laura.

Il backup viene prima di ogni scrittura sui dati. È un archivio sul disco di chi lancia lo script, fuori dal repository e fuori da `hosting/`. Contiene l’albero di `salon/shared` e, a parte, gli alberi che l’elenco si prepara a cancellare. Non si committa.

## 2. Account, membro, Pro

Lo script scrive i due account. Il telefono non può cambiare `salonId`, `role` o `legacy`.

Laura: `salonId` è il suo uid, `role` è `titolare`. Nome, cognome ed email restano quelli già salvati. `legacy` è falso solo se l’email risulta già confermata; altrimenti resta vero.

Roberto: `salonId` è l’uid di Laura, `role` è `socio`. Stessa regola sul `legacy`.

In `salons/{uid di Laura}/members/{uid di Roberto}` lo script scrive `role: socio`, `status: attivo`, `accessWithoutPro: true`, più uid, email, nome e cognome. Laura, nello stesso elenco, è membro `titolare` attivo, senza quel campo. `accessWithoutPro` lo scrive solo il server. Il client non scrive `members`.

`salons/{uid di Laura}/pro/main` viene scritto con `enabled: true` e `seats: 3`. Roberto occupa un posto.

Chi può usare il salone:

- il titolare, con Pro acceso o spento;
- un socio o un collaboratore, solo se Pro è acceso;
- il membro il cui documento ha `accessWithoutPro` vero, anche se Pro è spento.

I privilegi seguono il ruolo. Da socio, Roberto scrive tutto quello che scrive il titolare. Se un giorno il ruolo diventa collaboratore, entra lo stesso con Pro spento, ma con i limiti del collaboratore. Spegnere Pro non revoca nessuno: gli altri soci e collaboratori smettono di leggere il salone, Roberto no. La revoca resta quella già prevista: se viene revocato, esce e il suo account torna titolare del suo uid, un salone vuoto.

L’invito per email non si usa per questo ingresso. Lo script scrive account e membro. Il rifiuto già previsto per queste due email, quando qualcuno le invita, resta.

## 3. Regole, app e notifiche

L’app di questo passaggio non riporta più Laura e Roberto su `shared`. All’ingresso legge `accounts/{uid}` e apre il `salonId` che trova. Se quel valore è ancora `shared`, apre `salon/shared`: il percorso c’è ancora, non viene più forzato. Dopo il puntamento, per loro due il valore è l’uid di Laura e aprono `salons/{uid}`.

La copia dal vecchio `users/{uid}` e il riversamento dei dati locali partono solo se il salone aperto è `shared`. Con il puntamento nuovo non partono. Quel codice resta fino al secondo passaggio.

Le regole, prima della copia:

- Un aggiornamento dell’account dal telefono può solo lasciare `salonId`, `role` e `legacy` come sono. Il permesso che rimetteva l’account su `shared` si toglie. Un’app vecchia ci riprova: la scrittura fallisce.
- Un account nuovo si crea solo come titolare del proprio uid, con `legacy` falso. Il ramo che creava `shared` si toglie.
- `salon/shared` si legge e non si scrive.
- Su `salons/{id}`, `canUse` accetta il titolare, il socio o il collaboratore con Pro acceso, e il membro con `accessWithoutPro`.

Se la copia fallisce prima del puntamento, le scritture su `salon/shared` si riaprono. Gli account non si sono mossi. Laura continua sul ramo di prima.

Le notifiche ogni 5 minuti, dopo il puntamento, non leggono `salon/shared`. Un telefono riceve solo gli appuntamenti del `salonId` del suo account. `shared`, vuoto, o un id che contiene `/`, non è una fonte. Il segno dei cani eliminati e il nome del cane si leggono in quello stesso salone. Laura e Roberto ricevono gli appuntamenti del salone di Laura. Troddioni riceve solo i suoi. Gli indici già definiti sulla raccolta `appointments` coprono `salons/{id}/appointments`: non se ne aggiunge uno.

Le funzioni delle notifiche si pubblicano subito dopo il puntamento. Se partissero prima, gli account direbbero ancora `shared` e i promemoria di Laura si fermerebbero.

## 4. Pagina Utenti

La vedono solo le due email operatore. Gli altri tornano a Impostazioni.

Niente campo Cerca e niente pulsante a tutta larghezza. I pezzi sono quelli già nell’app: titolo di sezione, scheda, riga, interruttore. I colori sono i token, non una palette a parte.

Sotto l’intestazione «Utenti», una riga sola: la frase già restituita da `accountSummary`, poi « · », poi la frase già restituita da `salonSummary`. Dopo questo passaggio i conti veri sono tre account e due toelettature. Il disegno ne mostrava due e due solo come filo.

Poi il titolo di sezione **Servizio Pro**, maiuscolo, con la barra blu. Nessuna frase sotto.

Una scheda. Una riga per salone, non per account: Laura e Roberto sono due account dello stesso salone e non generano due interruttori. Il nome a sinistra è l’etichetta del titolare, l’account il cui uid è il `salonId`, con la stessa regola di oggi (nome e cognome, altrimenti l’email). Sotto, il nome attività. A destra la parola **Attivo** (colore `--ok`) se Pro è acceso, **Spento** (colore `--tx3`) se è spento, e l’interruttore già usato in Impostazioni: acceso `--ok` (`#127A4C`), spento `--line2` (`#D3DAE5`), pallino `--on-pri`. Il nome per il lettore di schermo è «Servizio Pro per » più il nome del titolare.

Il tocco chiama `setSalonPro` per quel `salonId`. Se la funzione rifiuta, sotto la riga compare «Accesso negato». Il salone il cui id è `shared` non ha riga.

## 5. Ordine

L’app e le funzioni si costruiscono prima, e non si pubblicano ancora. Finché gli account puntano a `shared`, l’app nuova apre ancora quel ramo.

1. Backup, come nel §1.
2. Pubblicazione delle sole regole del §3. `salon/shared` non si scrive più.
3. Copia, a blocchi. Un blocco che fallisce lascia gli account dov’erano. Poi il confronto: per ogni percorso di documento, origine e destinazione hanno gli stessi id. Un id in più o in meno ferma tutto, prima del puntamento. In quel caso le scritture su `shared` si riaprono.
4. Puntamento del §2: account, membri, `accessWithoutPro`, `pro/main` acceso. Da qui l’app vecchia non salva più su `shared`. I due telefoni vanno aggiornati con l’app di questo passaggio.
5. Pubblicazione dell’app e delle notifiche del §3. Chi apre l’app nuova mentre l’account dice ancora `shared` vede il salone fermo e non può salvare: è la finestra corta fra il punto 2 e il punto 4.
6. Elenco e, solo con l’impronta ristampata uguale, cancellazione del §1.

`salon/shared` resta leggibile. Il secondo passaggio non parte da solo. Si lancia a mano dopo che Laura, con l’app nuova, ha rivisto cani, agenda, schede, foto, listino e incassi. In quel passaggio si cancella l’albero `salon/shared` e dal codice escono: il ramo `salon/shared` in `salonCollection`, il blocco duplicato delle regole, la copia da `users/{uid}` all’apertura, il riversamento dei dati locali e lo scarto dei dati locali riservato a chi entra in `shared`. Le due email operatore restano.

La pubblicazione dell’app alza la patch rispetto alla versione allora installata sul ramo Pro. Questo file, da solo, non alza `APP_VERSION`.

## 6. Prove

Sul ramo Pro:

- La copia tiene gli stessi id, compresi i pezzi delle foto e i documenti `meta/restored-…` e `deleted-dogs`. Se la destinazione ha già un cane, un appuntamento o un file, non scrive. Se un id non coincide, non cambia gli account.
- Laura è titolare del suo uid. Roberto è socio di quell’uid, con `accessWithoutPro` vero. `legacy` è falso solo se l’email risulta confermata. `pro/main` è acceso, tre posti.
- La cancellazione non parte se il nome attività di `robmass83@gmail.com` non è Troddioni, e non parte se l’impronta non è quella dell’elenco appena stampato. Non entrano nell’elenco `salon/shared`, il salone di Laura, Troddioni e i tre accessi. Un altro accesso perde albero, `users/{uid}`, inviti, account ed email.
- Le regole: il telefono non rimette un account su `shared`; su `salon/shared` non si scrive; Roberto legge il salone con Pro spento; un altro socio, con Pro spento, no.
- L’ingresso di Laura e di Roberto non riscrive `shared`. Le notifiche di un telefono escono solo dal `salonId` del suo account.
- La pagina «Utenti»: niente Cerca, c’è «Servizio Pro», ci sono «Attivo» e «Spento», l’interruttore è quello dell’app, due account dello stesso salone fanno una riga sola, un non operatore torna a Impostazioni.
