# Groomly — Collaboratori nel piano Pro

Data: 2026-10-24
Stato: accettata il 2026-10-24. Il piano si esegue e alla fine si pubblica.

Il titolare di un salone con Pro acceso invita per email un socio o un collaboratore. Il socio ha gli stessi privilegi del titolare. Il collaboratore lavora su cani e appuntamenti di tutto il salone e vede solo i propri incassi. Laura resta com’è: Pro spento, nessun invito, nessun «Chi lo fa».

## Decisioni chiuse

1. Pro si accende a mano, solo da un operatore (`isOperator`: Laura e Roberto). Il titolare non se lo accende. Il canone si riscuote fuori dall’app. La carta non entra in questo lavoro.
2. Il tetto è 3 posti. Un posto è un socio attivo, un collaboratore attivo, o un invito ancora aperto e non scaduto. Il titolare non occupa un posto.
3. L’invito è un’email, dura 7 giorni, si usa una volta, ed è legato a un solo salone. Il ruolo si sceglie prima dell’invio: `socio` o `collaboratore`.
4. Il salone `shared` di Laura non ha l’interruttore. Pro lì è sempre spento. Laura e Roberto non possono accettare un invito.
5. Spegnere Pro toglie subito l’accesso a soci e collaboratori. Cani e appuntamenti restano. Il titolare continua da solo. Riaccendere Pro fa rientrare le persone non revocate.
6. Il collaboratore vede il calendario di tutti e tutti i cani. Crea e modifica le schede. Non archivia, non segna deceduto, non elimina.
7. «Chi lo fa» compare solo se Pro è acceso e c’è almeno un socio o un collaboratore attivo. Si assegna a titolare, socio o collaboratore. La sovrapposizione, in quel caso, è per persona. Gli appuntamenti senza persona restano del titolare.
8. Su un appuntamento già completato, solo titolare e socio cambiano la persona. La cifra degli incassi segue la persona assegnata, non chi ha premuto Completato.
9. Il collaboratore, in Incassi, nel report, nell’export e nella riga in Impostazioni, vede solo gli appuntamenti la cui persona è lui. Sulla scheda del cane lo storico mostra la cifra della visita.
10. Il collaboratore in Impostazioni tiene Tema, Notifiche, la versione e Esci, più Incassi filtrati. Non vede Funzioni Pro, la modifica dell’attività, il backup, Servizi e durate, i tag del salone, l’archivio animali, la gestione del listino.
11. Questa specifica, da sola, non alza `APP_VERSION`. La pubblicazione avviene a implementazione finita, con i test verdi, e alza la patch rispetto alla versione allora installata. All’accettazione la versione è `1.1.80`.

## Fuori da questo lavoro

- Addebito con carta, rinnovo automatico, scontrino.
- Un ruolo veterinario, una scheda veterinario, un permesso veterinario.
- Copiare i dati del salone nel salone personale di chi viene revocato.
- Nascondere il titolo di un appuntamento personale agli altri del salone.
- Cambiare il titolare del salone. Il titolare resta l’account il cui `uid` è il `salonId`.

## Approcci scartati

- Codice a voce al posto dell’email. Si gira in chat e non sceglie il ruolo in un passaggio solo.
- Ogni collaboratore tiene il proprio salone e legge anche quello del titolare. Cani e visite vivono già in un solo salone.
- Accendere Pro dal telefono del titolare. Il piano è a pagamento e l’interruttore deve restare all’operatore.
- Negare al collaboratore la lettura delle visite altrui. Il calendario intero e lo storico del cane hanno bisogno di quei documenti. Il totale di salone non è un documento a parte: si filtra nei calcoli degli incassi.

## 1. Ruoli e documenti

`AccountRole` in `src/lib/salonPath.ts` diventa `'titolare' | 'socio' | 'collaboratore'`. Un account nuovo resta `titolare` del proprio `uid`. Il client non può cambiare `salonId`, `role` o `legacy`: la regola su `accounts/{uid}` resta quella di oggi. Li cambiano solo le Cloud Functions, con l’Admin SDK.

`LocalAccount` in `src/data/local/auth.ts` guadagna `role?: AccountRole`. `watchAuth` lo copia dal documento account. Se manca, è `titolare`.

Pro sta in `salons/{salonId}/pro/main`:

- `enabled`: booleano
- `seats`: sempre `3`
- `updatedAt`: stringa ISO

Il client non lo scrive. Lo legge chi può usare il salone, e l’operatore.

Le persone stanno in `salons/{salonId}/members/{uid}`:

- `uid`, `email`, `role` (`titolare` | `socio` | `collaboratore`)
- `firstName`, `lastName`
- `status`: `attivo` | `revocato`

Il client non le scrive. Le legge chi può usare il salone. All’accensione di Pro la funzione crea il membro titolare se manca, copiando nome ed email dall’account il cui `salonId` è quel salone e il cui `role` è `titolare`.

Gli inviti stanno in `invites/{token}`. Il token è 32 byte esadecimali. Il client non li legge e non li scrive.

- `salonId`, `email`, `role` (`socio` | `collaboratore`)
- `createdAt`, `expiresAt` (creazione più 7 giorni), entrambe ISO
- `status`: `aperto` | `usato` | `revocato`
- `usedBy`: uid, solo se `usato`

## 2. Chi entra nei dati

Una persona usa il salone se il suo account ha `salonId` uguale a quel salone e vale una di queste:

- è `titolare`;
- è `socio` o `collaboratore` e `pro/main.enabled` è `true`.

L’operatore continua a leggere `shared` e l’elenco saloni come oggi. `shared` non ha `pro/main` e la funzione che accende Pro rifiuta `salonId === 'shared'`.

Il collaboratore, sul salone:

- crea un cane e lo aggiorna se `status` resta `attivo`;
- non cancella un cane e non scrive `status` `non_in_cura` o `deceduto`;
- crea e aggiorna appuntamenti e appuntamenti personali;
- su un appuntamento con `status` `completato` non cambia `assigneeUid`;
- non scrive servizi, chiusure, impostazioni, listino, file di backup.

Titolare e socio, con l’accesso di sopra, scrivono tutto quello che oggi scrive `owns`. Il titolare lo fa anche con Pro spento.

## 3. Posti, invito, revoca

Logica pura in `src/lib/salonAccess.ts`, usata dai test e dalle funzioni. Costanti: `PRO_SEAT_LIMIT = 3`, `INVITE_DAYS = 7`.

`usedSeats` conta i membri con `status === 'attivo'` e ruolo `socio` o `collaboratore`, più gli inviti `aperto` con `expiresAt` nel futuro. Un invito `usato`, `revocato` o scaduto non conta.

Funzioni callable, region `europe-west1`, stesso stile di `sendVerificationEmail`. I messaggi di errore sono esatti:

| Funzione | Rifiuto | Messaggio |
| --- | --- | --- |
| `setSalonPro({ salonId, enabled })` | non operatore | `Accesso negato` |
| `setSalonPro` | `salonId` è `shared` o vuoto | `Accesso negato` |
| `createInvite({ email, role })` | Pro spento o assente | `Pro non è attivo` |
| `createInvite` | il chiamante non è titolare o socio di quel salone | `Accesso negato` |
| `createInvite` | email non valida | `Inserisci un’email valida` |
| `createInvite` | ruolo diverso da `socio` o `collaboratore` | `Accesso negato` |
| `createInvite` | posti esauriti | `Posti esauriti` |
| `createInvite` | email già membro attivo, oppure Laura o Roberto | `Questa email è già nel salone` |
| `acceptInvite({ token })` | token assente, revocato, usato, di un altro salone spento | `Invito non valido` |
| `acceptInvite` | `expiresAt` nel passato | `Invito scaduto` |
| `acceptInvite` | l’email dell’account non è quella dell’invito | `Invito non valido` |
| `acceptInvite` | l’account non è titolare del proprio `uid`, o quel salone ha già un cane o un appuntamento | `Questo account ha già un salone` |
| `acceptInvite` | i soci e collaboratori attivi sono già 3 | `Posti esauriti` |
| `revokeMember({ uid })` | bersaglio è il titolare (`uid === salonId`) | `Non puoi revocare il titolare` |
| `revokeMember` e `changeMemberRole({ uid, role })` | il chiamante non è titolare o socio con Pro acceso | `Accesso negato` |
| `changeMemberRole` | il bersaglio è il titolare, o il ruolo nuovo non è `socio` o `collaboratore` | `Accesso negato` |

`createInvite` rifiuta anche se i posti sono finiti contando gli inviti aperti. Scrive l’invito e manda l’email nello stesso successo: se Brevo rifiuta, l’invito non resta. Il template Brevo è il numero `5`, parametri `link`, `salonName`, `roleLabel` (`Socio` o `Collaboratore`). Il link è `https://groomly-3128b.web.app/invito/{token}`. Creare il template nel pannello Brevo è un passo manuale di chi gestisce la posta: il codice invia il template `5`.

`acceptInvite` in una transazione: invita ancora valido, posti dei soli membri attivi sotto 3, poi `status: usato`, `usedBy`, membro `attivo`, e sull’account `salonId` del salone e `role` dell’invito. Il salone personale vuoto resta com’è e non si legge più.

`revokeMember` mette il membro a `revocato`, e riporta l’account a `salonId` uguale al suo `uid` e `role` `titolare`. Non copia cani né visite.

`changeMemberRole` aggiorna il membro e l’account. Non cambia i posti: socio e collaboratore contano entrambi.

`setSalonPro(false)` scrive solo `enabled: false`. Non revoca i membri.

## 4. Appuntamenti

`Appointment` e `AppointmentWrite` guadagnano `assigneeUid?: string`. In locale è una stringa. Su Firestore è una stringa. Un personale senza il campo, in scrittura nuova, riceve l’uid di chi lo crea.

`assigneeOf(appointment, ownerUid)` torna `assigneeUid` se c’è, altrimenti `ownerUid`. Per un salone normale `ownerUid` è il `salonId`.

`showAssigneePicker(proEnabled, members)` è vero solo se `proEnabled` e c’è almeno un membro attivo `socio` o `collaboratore`.

`overlapLabel` resta com’è quando il selettore è nascosto: confronta tutti gli appuntamenti del salone. Quando il selettore è visibile, confronta solo quelli con lo stesso `assigneeOf`. Due persone diverse alla stessa ora non generano l’avviso. La stessa persona sì. Il testo dell’avviso non cambia.

Nel form, la riga si chiama `Chi lo fa`. È un gruppo di pulsanti, uno per membro attivo, etichetta nome e cognome, altrimenti l’email. `aria-pressed` sul selezionato. Il valore iniziale è l’uid di chi sta prenotando, se è nell’elenco, altrimenti il titolare. In modifica si mostra la persona già salvata. Il salvataggio scrive `assigneeUid`.

Con il selettore nascosto il form non scrive `assigneeUid` e non mostra la riga. È il caso di Laura.

## 5. Incassi

`visibleAppointments(appointments, viewer)` in `src/lib/salonAccess.ts`:

- se `viewer.role` non è `collaboratore`, torna l’elenco intero;
- se è `collaboratore`, tiene gli appuntamenti con `assigneeOf(item, viewer.ownerUid) === viewer.uid`.

Incassi, report, export e la cifra nella riga «Incassi e report» usano questo elenco. Lo storico sulla scheda del cane no: mostra la cifra di ogni visita, di chiunque sia.

## 6. Schermate

**Funzioni Pro.** Voce in Impostazioni, sotto Attività, visibile a titolare e socio. Il collaboratore non la vede. Apre `/impostazioni/pro`.

- Pro spento, o salone `shared`: titolo «Funzioni Pro», testo «Non attivo». Nessun campo email, nessun Invita.
- Pro acceso: «N di 3 posti», elenco con nome, email e ruolo, «Revoca» sui soci e collaboratori, cambio ruolo fra Socio e Collaboratore, e «Invita».
- Invita chiede «Email» e la scelta «Socio» o «Collaboratore». «Invia» con posti esauriti non chiama la funzione se il conteggio locale è già 3. Gli errori della funzione si leggono sotto il campo. Successo: «Invito spedito a » più l’email.

**Utenti.** Sulla pagina operatore, ogni salone che non è `shared` ha «Attiva Pro» o «Spegni Pro». `shared` non ha il pulsante. Il pulsante chiama `setSalonPro`.

**Impostazioni del collaboratore.** Resta la riga Incassi, con il suo totale. Spariscono la ragione sociale, «Modifica attività», Backup, Annulla ripristino, Servizi e durate, Tag dei cani, Archivio animali. Restano Tema, Notifiche, la versione, Esci. Il collaboratore non scrive `salons/{salonId}/settings/main`. Il tema è già sul telefono e resta lì. In Notifiche le push sono le sue, su `accounts/{uid}/push`. Il promemoria mensile è del salone: i controlli si vedono e sono disabilitati. «Nascondi importi» non compare. Le route `/impostazioni/servizi`, `/impostazioni/archivio`, `/impostazioni/pro`, `/listino/gestione` e `/listino/prezzi` per un collaboratore tornano a `/impostazioni`.

**Scheda cane.** Per un collaboratore non si vedono «Non più in cura», «Deceduto» e «Elimina definitivamente». Creare e modificare resta.

**Accettazione.** La route `/invito/:token` è fuori dal salone. Chiede di entrare o registrarsi con l’email invitata, poi chiama `acceptInvite`. Token già usato o scaduto: «Invito non valido» o «Invito scaduto», senza scrivere l’account. Dopo il successo si apre la home del salone.

## 7. Errori

La funzione che fallisce non lascia un invito aperto se l’email non è partita. Un invito scaduto resta `aperto` nel documento ma non conta e non si accetta. La revoca è immediata: la regola legge `pro/main` e il ruolo sull’account, non una cache. Se il documento Pro manca, Pro è spento.

## 8. Test

- `src/lib/salonAccess.test.ts`: posti, selettore, persona dell’appuntamento, filtro incassi, scadenza a 7 giorni.
- `src/lib/appointments.test.ts`: sovrapposizione per persona solo quando il selettore è visibile; senza selettore il comportamento di oggi.
- `src/lib/firestoreRules.test.ts`: il client non scrive `pro/main`, `members` e `invites`; il collaboratore non cancella un cane e non cambia `assigneeUid` su un completato; `shared` non è toccato dalle regole nuove dell’operatore.
- Test della logica invitabile estratta, senza chiamare Brevo: posti esauriti, email già dentro, account che ha già un salone, revoca del titolare rifiutata.
- Pagine: Laura vede «Non attivo» e il form appuntamento senza «Chi lo fa». Il collaboratore non vede Backup, Archivio né «Nascondi importi». In Notifiche il promemoria mensile è disabilitato. Incassi del collaboratore non sommano una visita assegnata a un altro.
