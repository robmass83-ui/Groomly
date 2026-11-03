# Medie «Home e telefono» (31, 32, 34) — specifica

Audit: `docs/AUDIT-QA-2026-11-01.md`, punti 31, 32 e 34.

## 31. Righe «Promemoria» e «Auguri» della Home illeggibili

**Oggi.** `RigaPromemoria` mette nome, data, «Promemoria», stato e «Cestino» su una sola riga senza a capo, ognuno con i puntini: a 320-390 px resta «Ginge… Domenica 1 nov… o… Da … Cestino», fuori da ogni riquadro. `RigaAuguri` uguale.

**Dopo.** Ogni riga è una scheda (`Card`) come le altre della Home:
- Promemoria: prima riga il nome del cane in grassetto (a capo su parole intere, mai tagliato) e a destra l'etichetta «Promemoria»; seconda riga la data e lo stato (pallino o spunta + parola), con a capo se serve; «Cestino» a destra, tocco da 44 px.
- Auguri: la domanda («È il compleanno di …») a capo su parole intere, l'errore sotto, «Sì» e «Cestino» sotto la domanda allineati a destra.
- Conferma lista d'attesa: stessa scheda, testo a capo.
- Nessun testo tagliato con i puntini; nessuno scorrimento orizzontale a 320, 360 e 390 px. Lo spazio sotto il contenuto per il «+» resta quello della shell.

## 32. Android apre da solo «Sveglie e promemoria»

**Causa.** `@capacitor/local-notifications` 8.3: `schedule()` con `isExactNotification` predefinito a `true` apre la schermata di sistema «Sveglie e promemoria» se l'app non ha il permesso delle sveglie esatte. Al primo accesso il promemoria mensile, i compleanni o l'orario scaduto chiamano `schedule()` subito dopo la richiesta delle notifiche.

**Dopo.** Tutte le notifiche locali si programmano inesatte (`isExactNotification: false`): sono promemoria, qualche minuto di scarto non conta. Un unico punto, `programmaNotifiche()` in `src/lib/notificheLocali.ts`, aggiunge l'opzione a ogni notifica; tutti i `LocalNotifications.schedule` dell'app passano da lì. La richiesta del permesso notifiche resta com'è.

## 34. Ripristino lento di un backup grande, senza avanzamento

**Oggi.** `replaceCloudData` lancia insieme un `saveDog`/`saveAppointment` per documento; ognuno rilegge il segno dei cani eliminati (e `saveDog` tutta la raccolta `deletedDogs`, due volte) e il documento attuale, poi scrive e aspetta la conferma. Con 499 visite: ~1500 letture contemporanee, heap fino a 726 MB, ~22 minuti sull'emulatore; a schermo solo «Ripristino i dati… Non chiudere l'app».

**Dopo** (stessa logica per documento, nessun cambio a cosa si scrive):
- All'inizio del ripristino si leggono una volta i documenti attuali di cani e visite e il segno dei cani eliminati; durante il ripristino `readDoc` e `cloudDeletion` rispondono da questa copia. Una scrittura toglie il documento dalla copia, così una lettura successiva dello stesso documento va al database. Le letture chieste «dal server» non usano la copia. A fine ripristino (anche con errore) la copia si butta.
- Un documento uguale a quello già presente (stessi campi e valori) non si riscrive.
- Cani e visite si salvano a gruppi di 10 alla volta, non tutti insieme.
- A schermo: «Ripristino i dati… 120 di 499» (cani + visite), aggiornato man mano; poi servizi, impostazioni e pulizia come oggi.

Fuori: scrittura a blocchi `writeBatch` (cambierebbe la logica per documento: media, scritture vecchie, segni), ascoltatori sospesi durante il ripristino.

## Verifica

Unità per ognuno; emulatore: Home a 320/360/390 con una riga promemoria lunga e una di auguri (misura, nessun testo tagliato); ripristino di un backup con 499 visite diverse da quelle presenti: tempo e avanzamento, dati finali uguali al backup.
