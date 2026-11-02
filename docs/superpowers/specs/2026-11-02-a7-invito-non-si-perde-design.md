# A7 — Il link d'invito non si perde, e chi ha già un salone può unirsi a un altro

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A7. Specifica completa (lavoro medio: client + 3-4 funzioni del server).

## Perché
- **Il difetto (A7).** `src/pages/InvitePage.tsx` accetta l'invito solo se sei già dentro; da sloggato mostra «Entra» → `/login`. `LoginSwitch` (`src/app/router.tsx:~200`) e `LoginPage` mandano poi sempre a `/`: il token si perde, l'invito resta `aperto` e la persona finisce nella home di un salone suo vuoto. Stesso esito con «Crea account» (che passa anche dalla conferma email, `entryGate`).
- **Il limite voluto da Roberto da togliere.** `acceptInviteDecision` (`src/lib/salonAccess.ts:~123`) rifiuta con «Questo account ha già un salone» chi ha un salone personale con almeno un cane o un appuntamento. Caso reale: una toelettatrice chiude o lascia il suo salone e va a lavorare da un'altra persona: deve poterlo fare **senza perdere i suoi dati**.
- Oggi i dati restano già: accettare cambia solo `accounts/<uid>.salonId` e `role`; `salons/<uid>` non si tocca. Una revoca (`revokeMember`, `shouldRestoreAccount`) o l'eliminazione dell'account del titolare che l'ha invitata (A8) la riporta già a `salons/<uid>`.

## Decisioni di Roberto
1. Chi ha già un salone suo con dei dati **può accettare** un invito di un altro salone.
2. Prima di accettare vede un **avviso col nome del suo salone** («Hai già un account Groomly con il salone *<nome>*») e sceglie:
   - **Metti in pausa il mio salone** — prenotazioni online e lista d'attesa sospese;
   - **Lascia aperto il mio salone** — continua a funzionare come prima.
   In entrambi i casi i dati restano e lei entra nel salone che l'ha invitata.
3. Può **tornare da sola** al suo salone (pulsante «Torna al mio salone»), oltre ai casi che esistono già (revoca, eliminazione dell'account di chi l'ha invitata).
4. Quando torna, **la pausa si toglie da sola**: tutto torna com'era prima della pausa.
5. Pausa con la **strada A**: si spengono gli interruttori che esistono già, ricordando com'erano, e si rimettono uguali al ritorno.
6. Più saloni contemporaneamente per la stessa persona: **non ora** (verrà col piano Salone). Non chiuderci la porta.
7. Se l'operatore **elimina il salone** dove lavora una persona che ha un salone suo con dei dati, lei **non viene cancellata**: torna al suo salone, ma **la pausa resta** («in hold»). Le funzioni Plus sono sospese, non cancellate. Nell'app vede un **avviso** che il salone è in pausa, con la possibilità di riprendere.

## Obiettivi
1. **Il link non si perde.** Aprendo `/invito/<token>` da sloggati, il token si ricorda sul telefono (`localStorage`, chiave nuova, con la data di salvataggio). Dopo «Entra», «Crea account» e l'eventuale conferma dell'email, appena l'ingresso è `home` l'app va da sola su `/invito/<token>` e prosegue l'accettazione. Il token ricordato si toglie quando l'invito è accettato, quando il server risponde con un errore definitivo (`Invito non valido`, `Invito scaduto`, `Posti esauriti`), quando la persona esce (`logout`) o dopo 7 giorni (durata dell'invito, `INVITE_DAYS`).
2. **Registrarsi per un invito.** Se si arriva a «Crea account» dalla pagina d'invito, il modulo non chiede nome del salone, partita IVA e indirizzo (il salone personale vuoto si crea lo stesso, come oggi, con nome «Salone di <Nome>»), e l'email è precompilata con quella dell'invito se la pagina la conosce (vedi «Lasciato al builder»). Dopo la conferma dell'email l'invito si accetta da solo (punto 1). Niente giro di benvenuto (`/benvenuto`) per chi entra così.
3. **Avviso per chi ha già un salone.** Prima di chiamare `acceptInvite`, la pagina d'invito sa se il salone personale ha dati (cani o appuntamenti) e il suo nome. Se non ne ha → accetta subito come oggi, nessun avviso. Se ne ha → avviso col nome del salone e due pulsanti (pausa / lascia aperto) più «Annulla» (torna alla home, l'invito resta aperto e il token ricordato si toglie). Nell'avviso una riga: se ha un abbonamento attivo, si gestisce o si disdice dal Play Store; l'app non lo cambia.
4. **`acceptInvite` sul server** riceve la scelta (`salonePersonale: 'pausa' | 'aperto'`):
   - non rifiuta più chi ha dati nel salone personale; continua a rifiutare con «Questo account ha già un salone» chi **non** è titolare del proprio salone (cioè è già socio/collaboratore di un altro salone): deve prima tornare al suo;
   - se il salone personale ha dati e la scelta manca → errore (il client vecchio senza avviso non deve far entrare senza scelta; messaggio da definire, es. «Aggiorna l'app per accettare l'invito»);
   - con `pausa`, nella **stessa transazione**: in `salons/<uid>/settings/main` mette `prenotazioniOnline: false` e la lista d'attesa (`serviziEmail.attesa.modo`) a `spento`, e scrive un campo `pausa` con i valori di prima (`{ prenotazioniOnline, attesa, dal }`). Se `pausa` c'è già non lo sovrascrive.
5. **Tornare al proprio salone.** Nuova funzione `tornaAlMioSalone` (nome a scelta del builder): `members/<uid>` del salone attuale a `revocato` (come la revoca), `accounts/<uid>` a `{ salonId: uid, role: 'titolare' }`, pausa tolta (punto 6). Pulsante in Impostazioni, visibile solo a socio/collaboratore, con conferma («Lascerai il salone *<nome>*. Potrai rientrarci solo con un nuovo invito.»). Dopo, l'app ricarica l'account e apre la home del suo salone.
6. **Togliere la pausa al ritorno**: con `tornaAlMioSalone`, `revokeMember` ed `eliminaAccount` del titolare che l'aveva invitata (ramo membri di A8). Si cancella `pausa` e si rimettono `prenotazioniOnline` e `serviziEmail.attesa` ai valori salvati, **ma solo se sono ancora come li aveva messi la pausa** (spento): se nel frattempo un socio del suo salone li ha cambiati a mano, resta la scelta del socio (scelta di Claude). Una sola funzione comune lato server.
6b. **`eliminaSalone` dell'operatore** (`functions/src/piano/eliminaSalone.ts:~65-75`, oggi cancella account, `users` e utente Auth di tutti quelli con `salonId` = salone eliminato): per chi ha un salone personale **con dati** (cani o appuntamenti in `salons/<uid>`), invece di cancellarlo riporta `accounts/<uid>` a `{ salonId: uid, role: 'titolare' }` e **lascia `pausa` com'è** (non la toglie). Chi ha il salone personale vuoto viene cancellato come oggi.
6c. **Avviso «salone in pausa»**: quando una persona è nel proprio salone (titolare di `salons/<uid>`) e `settings/main.pausa` esiste, l'app mostra in Home un avviso fisso: «Il tuo salone è in pausa: prenotazioni online e lista d'attesa sono sospese. Le impostazioni sono conservate.» con il pulsante **Riprendi**. Riprendi chiama una funzione del server (`riprendiSalone`, nome a scelta) che usa la stessa funzione comune del punto 6. L'avviso lo vedono anche i soci del suo salone in pausa (possono riprendere anche loro, come titolari). Vale anche per un titolare che torna in qualunque altro modo con `pausa` ancora scritta (es. ritorno non andato a buon fine).
7. **I collaboratori/soci del suo salone** (scelta di Claude, Roberto non ha obiettato): con la pausa **restano dove sono** e non perdono nulla. La pausa ferma solo le prenotazioni online e la lista d'attesa.
8. **Pagina pubblica in pausa**: con `prenotazioniOnline: false` mostra già la pagina senza prenotazione, con contatti ed email; nessun testo nuovo.
9. **Test**:
   - `acceptInviteDecision`: chi ha dati nel salone personale passa con la scelta; senza scelta rifiuta; chi è già membro di un altro salone resta rifiutato.
   - `acceptInvite` con `pausa`: interruttori spenti, `pausa` coi valori di prima; con `aperto`: settings intatte.
   - ritorno (`tornaAlMioSalone`, `revokeMember`, `eliminaAccount` del titolare): account riportato, interruttori rimessi come prima, `pausa` sparito; senza `pausa` le settings non si toccano; interruttori cambiati da un socio durante la pausa → restano come li ha messi il socio.
   - `eliminaSalone`: membro con salone personale pieno → account riportato al suo salone, Auth intatto, `pausa` ancora presente; membro con salone vuoto → cancellato come oggi.
   - `riprendiSalone`: con `pausa` → valori rimessi e `pausa` tolta; senza → nulla; chi non è titolare/socio del salone → rifiutato.
   - client: avviso in Home solo con `pausa` presente; Riprendi lo fa sparire.
   - client: token ricordato e ripreso dopo login e dopo registrazione + conferma email; tolto su errore definitivo e su `logout`; avviso mostrato solo con salone pieno.
   - Verifica: script sulle funzioni compilate in emulatore (come `verify-a8-a9.cjs`) + `/qa-my-app:verify` nel browser (da sloggato → Entra → accetta; da sloggato → Crea account → conferma → accetta; titolare con salone pieno → pausa → pagina pubblica senza prenotazione → Torna al mio salone → prenotazioni di nuovo come prima).

## Non obiettivi
- Più saloni contemporaneamente per la stessa persona, o passare da un salone all'altro senza invito.
- Disdire o sospendere l'abbonamento a pagamento (si fa dal Play Store).
- Fermare i promemoria email ai clienti per gli appuntamenti già presi nel salone in pausa (restano attivi: gli appuntamenti ci sono).
- Spostare dati da un salone all'altro.

## Anti-obiettivi
- Perdere o cancellare dati del salone personale.
- Lasciare il salone in pausa per sempre dopo che è tornata.
- Accettare l'invito con un account la cui email non è quella invitata (resta «Invito non valido»).
- Una persona che è dentro due saloni insieme.

## Approcci (per la pausa)
- **A — interruttori esistenti, valori ricordati e rimessi (scelta).** La pagina pubblica, `postiLiberi`, `preparaRichiesta`/`inviaRichiesta`, `iscrivitiAttesa`, l'invio delle offerte leggono già `prenotazioniOnline` e `serviziEmail`: non si tocca nessuna di queste funzioni.
- B — nuovo stato «salone in pausa» controllato da ogni funzione: testo «Salone in pausa» sulla pagina pubblica e più pronto per i saloni multipli, ma 5-6 funzioni da toccare e il rischio di dimenticarne una. Rimandata a quando ci saranno i saloni multipli.

## Vincoli
- Mai toccare i dati veri di Laura: tutto in emulatore `demo-groomly`.
- Le regole Firestore non devono permettere al client di scrivere `pausa` in modo da ingannare il ritorno: lo scrive solo il server (o le regole lo bloccano). Il titolare può comunque cambiare `prenotazioniOnline` dalle impostazioni come oggi.
- `acceptInvite` resta una sola transazione: invito usato, membro scritto, account cambiato e pausa scritta insieme.

## Lasciato al builder
- Come la pagina d'invito sa «salone personale con dati» e il nome del salone prima di accettare: lettura diretta dal client (il proprio salone è leggibile) o una piccola callable. L'email dell'invito per precompilare la registrazione: solo se si ottiene senza esporre gli inviti a chi non è loggato; altrimenti campo vuoto.
- Forma della chiave in `localStorage` e dove si fa il rimando (`LoginSwitch`, `Guard` o un effetto in `SessionProvider`), purché funzioni anche dopo la schermata di conferma email.
- Come `registerOwner` riceve il nome salone «Salone di <Nome>» nel modo invito.
- Testo esatto di avviso, pulsanti e conferma (italiano, inglese, spagnolo come le altre frasi).
- Deploy: functions `acceptInvite`, `revokeMember`, `eliminaAccount`, `eliminaSalone`, le nuove `tornaAlMioSalone` e `riprendiSalone` (con `FUNCTIONS_DISCOVERY_TIMEOUT=60`), regole se cambiano, + release APK.
