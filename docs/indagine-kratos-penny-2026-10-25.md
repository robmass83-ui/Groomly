# Indagine — Kratos e Penny nel caricamento (F1)

Data: 2026-10-25. Solo lettura del codice e del seed. Nessuna correzione in questo documento. L'emulatore della sessione QA non era più in esecuzione (`617967`, uscito con codice 1 alle 19:40 UTC), quindi i documenti Firestore di quel seed non sono stati riletti dal vivo. Il rapporto del seed è ancora in `seed-report.json`: il salone 1 è `salone1@test.groomly`, uid `pIFRwqx8IzttAsNOlET12Izc78Gk`, 60 cani, 878 appuntamenti.

## Esito

Nel fotogramma sbagliato Kratos e Penny sono cani del salone a cui l'app è agganciata in quel momento, non una lettura di un altro salone. Non è possibile che la cache di Firestore o IndexedDB restituisca i documenti di un altro salone: ogni ascolto è un percorso preciso, `salons/{salonId}/…` oppure `salon/shared/…`. I due nomi stanno nel vocabolario del seed, uguale per tutti i saloni finti, e nei test di `WeekRows`, che l'app non importa.

Il «Cane assente» stabile del 10 ottobre (F7) è un altro fatto: a dati assestati quelle visite restano in elenco e il loro `dogId` non è tra i cani disegnati. Il seed non crea visite orfane. Quel buco nasce nel client, ed è descritto in fondo.

## Da dove arrivano i nomi

`scripts/test360/seed.ts` pesca il nome di ogni cane da un solo elenco:

`Fido, Luna, Rocky, Bella, Max, Kira, Leo, Nala, Toby, Penny, … Tata, Kratos, Ginger, …`

Il generatore parte da `seed = 42` ed è unico per tutti i 20 saloni e per Laura finta. Un nome può quindi comparire in più saloni, ma l'id è `dog-` più un numero di quel generatore: gli id non si ripetono tra un salone e l'altro. Ogni appuntamento prende `dogId` da un cane `attivo` dello stesso salone, e quel cane è scritto nello stesso batch. Il seed non lascia un appuntamento senza scheda.

L'unica altra occorrenza di «Kratos» e «Penny» nel sorgente dell'interfaccia è `src/components/calendar/WeekRows.test.tsx` (`dog-kratos`, `dog-penny`). È un file di test. Il bundle dell'app non lo carica.

## Firestore e IndexedDB

`listenDogs` e `listenAppointments` ignorano l'uid passato all'argomento e leggono `salonPath()`, che è `salonRootPath()` in `src/data/firebase/salonRoot.ts`. Quel percorso è l'id messo da `bindSalon`. Per il titolare del salone 1, il login chiama `bindSalon` con lo uid del proprietario prima di aprire la home (`finishUser` attende `resolveSalon`). Lo uid del gate e il salone agganciato coincidono.

La query è `collection(db, ...salonPath('dogs'))` e, per le visite, la stessa collezione con `where('start', '>=', floor)`. Non c'è una collection group. Un ascolto su `salons/A/dogs` non può ricevere documenti di `salons/B/dogs`.

La cache locale è `persistentLocalCache` con `persistentMultipleTabManager` (`src/data/firebase/client.ts`, `database()`). È il database IndexedDB del progetto `demo-groomly`, condiviso dalle schede, ma le voci sono il percorso completo del documento. La scheda del salone 2 non soddisfa la query del salone 1. Al primo accesso di uno uid nuovo la cache di quel percorso è vuota: lo snapshot vuoto e `fromCache` viene scartato (`snap.empty && cached`).

## localStorage e stato in memoria

Le chiavi sono `groomly.users.${uid}.dogs` e `groomly.users.${uid}.appointments`. Uno uid nuovo non legge lo specchio di un altro uid.

Lo stato iniziale di `useDogs` e `useAppointments` è quello specchio, se c'è. Al primo ingresso del salone 1 lo specchio non c'è: cani e visite partono vuoti. Da lì vengono € 0, mensili 0/0, archivio 0 e l'avviso della partita IVA (le impostazioni partono da `blankSettings` finché `listenSettings` non scrive). Non sono cifre di un altro salone: sono lo stato vuoto, trattato come se fosse vero.

Due cose non sono divise per salone:

- `groomly.deleted` (la pietra delle cancellazioni) e `groomly.deleted.pending`. `deletionForActiveSalon` le unisce al segno cloud di qualunque salone che non sia Roberto dentro `shared`, e `rememberDeletion` riscrive l'unione nella chiave globale. Possono nascondere un id, non possono mostrare il nome di un cane che sta in un altro salone. Con gli id del seed un id del salone 2 non coincide con un id del salone 1.
- La variabile di modulo `salonId`. `listenDogs(uid)` non usa `uid`. Se il salone agganciato e lo uid del hook divergono, lo snapshot è del salone agganciato e lo specchio viene scritto sotto lo uid. Sul login del titolare non diverge. Resta un rischio se `salonId` restasse di un accesso precedente: lo stato React non si azzera quando cambia lo uid, quindi la schermata terrebbe i cani e le visite precedenti finché non arriva lo snapshot nuovo.

La copia dei dati del telefono (`copyLocal`) parte solo se il salone agganciato è `shared` e l'email è quella di Laura. Il salone 1 esce subito da `runMigration` e non importa cani locali.

## Perché si vedono per un attimo e poi no

Tre pubblicazioni anticipate, tutte dello stesso salone agganciato:

1. Le visite hanno due query (`src/lib/finestraAgenda.ts`, `listenAppointments`): prima gli ultimi 21 giorni, poi 13 mesi. La query corta può rendere `synced` e dipingere «Da chiudere» con poche righe. Poi la query lunga sostituisce l'elenco. Un «Da chiudere (2)» seguito da Bobby, Nala e Fido è questa finestra, non un secondo salone.
2. `listenAppointments` chiama `onData` subito. `listenDogs` aspetta `mergedDeletion()` prima di consegnare i cani. Nel mezzo ogni visita è «Cane assente». Quando i cani arrivano, i nomi compaiono.
3. Sullo snapshot `fromCache`, `useAppointments` tiene le visite precedenti che non sono nel pacchetto nuovo (`carried`). `useDogs` invece sostituisce l'elenco con i cani appena arrivati e non ignora una cache successiva al server (`useAppointments` sì: `if (fromCache && sawServer.current) return`). Se i cani cambiano e le visite vecchie restano, gli id non combaciano e l'etichetta diventa «Cane assente». Non diventa il nome di un altro salone, perché gli id non collidono: il nome si vede solo finché il cane con quell'id è ancora nell'elenco.

Kratos e Penny nel fotogramma di «Da chiudere (2)» sono quindi due cani presenti in quell'elenco precoce. Il fotogramma assestato del salone 1 (partita IVA `01234567891`, ottobre € 3.483, mensili 15/15, Bobby, Nala, Fido) è lo snapshot del salone agganciato al login. I due nomi non sono sopravvissuti come dati di un altro salone.

## F7, dallo stesso meccanismo

A elenco assestato, sabato 10 ottobre 09:15 e 11:30 restano «Cane assente», con Apri disabilitato e Completato / Disdetto attivi. Il seed non scrive una visita senza cane. Il client può comunque lasciarla a schermo: `dropMissing` in `MonthlyReminder` (`src/app/providers.tsx`) cancella solo le visite già presenti nel primo snapshot sincronizzato e il cui cane manca. Una visita che arriva con la finestra lunga, dopo che quell'insieme di id è stato congelato, non viene tolta. Se in quel momento il cane non è nell'elenco disegnato, la riga resta «Cane assente» con le azioni di chiusura.

La correzione di F7 deve partire da questo, sull'emulatore, e non da un'ipotesi di fuga tra saloni.
