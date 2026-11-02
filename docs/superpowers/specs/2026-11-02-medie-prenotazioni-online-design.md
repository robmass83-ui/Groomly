# Medie «Prenotazioni online» (audit 5, 6, 7, 9) — design

Data: 2 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione Medie → «Prenotazioni online e piani», punti 5, 6, 7, 9.

## Perché
Un cliente che ha chiesto un appuntamento online deve sempre avere una risposta, e il salone deve poter rispondere alle richieste già arrivate anche se nel frattempo ha spento le prenotazioni o il piano è finito. La pagina pubblica non deve offrire orari che sforano la chiusura né mostrare l'email di login del titolare.

## Cosa cambia

### 5 — Piano scaduto: le richieste restano e il cliente riceve una risposta
- La Home ascolta e mostra le richieste «nuova» **sempre**, non solo con il piano che comprende le prenotazioni (`src/pages/HomePage.tsx`, oggi `vedeRichieste`). Senza piano non ne arrivano di nuove (la pagina pubblica è già chiusa), quindi si vedono solo quelle arrivate prima.
- Da Home il salone può accettarle, proporre un altro orario o rifiutarle anche senza piano (vedi punto 6).
- **Mail nuova «richiesta scaduta»** (approccio A scelto da Roberto): quando il controllo automatico (`chiudiNuovePassate` in `functions/src/piano/scadiProposte.ts`) segna «scaduta» una richiesta «nuova» rimasta senza risposta oltre l'orario chiesto, al cliente parte una mail breve: «Il salone non è riuscito a confermare la tua richiesta per <giorno, ora>. Contattalo direttamente», con nome e telefono del salone e risposta diretta al salone come le altre mail delle richieste. Tre lingue (it/en/es) come le altre, nella lingua clienti del salone. Vale per ogni richiesta che scade così, con o senza piano.
- La mail parte solo dopo che la transazione ha segnato «scaduta» (una sola volta per richiesta); l'esito si registra nella richiesta (`emailStato`) come per le altre mail. Se la richiesta non ha email valida o l'invio fallisce, la richiesta resta comunque «scaduta» e si scrive nel log.

### 6 — Prenotazioni spente: le richieste già arrivate si gestiscono
- Il controllo «prenotazioni accese e piano attivo» (`salonPrenota`) resta per tutto ciò che fa il **cliente** (pagina pubblica: `postiLiberi`, `inviaRichiesta`).
- Quando è il **salone** ad accettare o proporre un orario per una richiesta già arrivata (`gestisciPrenotazione`), il calcolo degli orari liberi salta quel controllo e verifica solo che l'orario sia libero e dentro gli orari del salone. Un solo calcolo degli orari, con un'opzione per saltare il controllo (niente funzione duplicata).

### 7 — Servizi più lunghi di 180 minuti
- Tolto il tetto dei 180 minuti in `durataUtile` (`functions/src/piano/postiLiberi.ts`); resta il minimo di 15 minuti e il valore predefinito di 60 per durate non valide. Così pagina pubblica, invio e conferma controllano con lo stesso calcolo che il servizio finisca dentro la fascia d'apertura.

### 9 — Pagina pubblica senza email di login
- La pagina pubblica (`functions/src/piano/paginaPubblica.ts`) non mostra più l'email dell'account in nessun caso; restano telefono e indirizzo se compilati.
- Il link continua a essere registrato in automatico per tutti i saloni (chi passa a Plus ritrova lo stesso indirizzo).

## Approcci considerati
- Mail della richiesta scaduta: **A, mail nuova e breve** (scelta) contro B, riusare la mail di rifiuto (meno lavoro, ma direbbe al cliente che il salone ha rifiutato e lo inviterebbe a riprenotare anche quando non si può).
- Punti 5-6: opzione nel calcolo esistente (scelta) contro una funzione separata per il salone (due calcoli da tenere allineati).
- Punto 9: togliere l'email (scelta) contro non registrare il link per i Go (il link cambierebbe se il nome del salone cambia prima del passaggio a Plus).

## Non obiettivi
- Nessun avviso al cliente quando il salone spegne le prenotazioni o il piano scade prima dell'orario: la mail parte solo alla scadenza dell'orario chiesto.
- Nessun cambio alle proposte (`proposteScadute`), che hanno già la loro mail.
- Nessun campo «email pubblica» nuovo nelle impostazioni.

## Lasciato al costruttore
- Testo esatto della mail nelle tre lingue (tono come le altre mail delle richieste) e il suo oggetto.
- Verificare che le regole Firestore lascino leggere le richieste a un salone senza piano (non dovrebbero dipendere dal piano).
- Test: unità per il calcolo senza controllo, durate > 180, scelta delle richieste da avvisare; verifica sull'emulatore chiamando le funzioni compilate (accetta con prenotazioni spente e con piano scaduto, scadenza con mail, pagina pubblica senza email) e in browser la Home di un Go con una richiesta in attesa.

## Rilascio
Functions: `postiLiberi`, `inviaRichiesta`, `gestisciPrenotazione`, la funzione pianificata che chiama `scadiProposteScadute`, `paginaPubblica`. APK per la Home.
