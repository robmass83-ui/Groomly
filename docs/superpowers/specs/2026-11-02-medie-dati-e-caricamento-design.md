# Medie «Dati e caricamento» (audit, gruppo 1)

Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Medie → Dati e caricamento», punti 1-4. Specifica breve; proposte approvate da Roberto il 2 novembre 2026. Solo app (APK), nessuna function.

## 1. Avviso «Dati non aggiornati · offline» solo quando è vero
- **Oggi:** `ShellFrame` (`src/pages/ShellFrame.tsx:~48`) mostra `frasi.homeDatiStantii` se uno fra `useDogs`, `useAppointments`, `useSettings` ha `stantio`. Dopo una ricarica, o dopo una caduta di rete, almeno uno resta `stantio` anche quando le modifiche dal server arrivano in tempo reale (osservato sul telefono per oltre 3 minuti).
- **Da fare:** trovare **con una prova riprodotta** (emulatore + browser: ricarica; rete tolta e rimessa) quale ascolto non torna «dal server» e perché, e correggere la causa. Il comportamento atteso: l'avviso compare solo offline o quando il server non risponde, e sparisce appena un ascolto riceve di nuovo dati dal server (o la sincronizzazione riprende) per **tutti e tre**.
- **Vietato:** nascondere l'avviso con un timer o toglierlo del tutto.

## 2. La Home non dice «nessuno» / «0» mentre carica
- **Oggi:** al primo accesso, per circa 10 s, parti della Home mostrano «Nessun appuntamento» e «0/0» (riquadri dei numeri) prima che i dati arrivino. L'agenda ha già «Carico l'agenda…».
- **Da fare:** finché i dati da cui dipende una parte della Home non sono arrivati (`attesaSalone` / `synced` / `settled` / `ready`), quella parte mostra l'attesa (stesso stile già usato: zampette `AttesaRiga` o «…» come nei riquadri «Incassi oggi»/«Mensili»), mai uno stato vuoto o uno zero. Prima di correggere, riprodurre sull'emulatore quali parti mostrano lo stato vuoto.

## 3. Un orologio avanti non fa scartare in silenzio le modifiche degli altri
- **Oggi:** `isStaleWrite` (`src/data/firebase/client.ts:~1036`) scarta una scrittura se il documento in cloud ha `updatedAt` più recente; se un telefono con l'orologio avanti ha scritto «nel futuro», tutti gli altri vedono rifiutati i propri salvataggi.
- **Da fare:** un `updatedAt` in cloud più avanti dell'ora di questo telefono di oltre **5 minuti** non conta come «più nuovo»: la scrittura passa. Entro i 5 minuti, come oggi. Vale per tutti i tipi di documento che usano `isStaleWrite` (numerico e ISO).

## 4. Accesso con il database irraggiungibile
- **Oggi:** `resolveSalon` (`client.ts:~2161`) chiama `clearSalon()` anche quando la lettura di `accounts/<uid>` è fallita (`readFailed`): un salone esistente vede «Il salone non è stato salvato» con il modulo per riscriverlo (entrata `repair-salon`) e resta lì anche col ritorno della rete.
- **Da fare:** se la lettura è fallita, non si conclude che il salone manca: l'app mostra «Connessione assente» (`frasi.authOffline`, già esistente) con l'attesa e **riprova da sola** (al ritorno della rete e ogni pochi secondi), poi apre il salone normalmente. Il modulo di riparazione compare solo se il server **conferma** che `accounts/<uid>` non esiste. Il percorso di Laura (email condivisa) resta invariato.

## Non obiettivi
- Rendere più veloce il caricamento della Home (si sistema solo cosa si vede mentre carica).
- Cambiare il testo dell'avviso «Dati non aggiornati · offline».

## Approcci
Sono quattro difetti con un solo comportamento corretto ciascuno (proposto e approvato). Per 1 e 2 la scelta del come dipende dalla causa trovata riproducendo il problema; si correggono le cause, non i sintomi.

## Verifica
Emulatore + browser: ricarica e rete tolta/rimessa → l'avviso sparisce entro pochi secondi dal ritorno; Home al primo accesso senza «0» né «Nessun appuntamento» prima dei dati; documento con `updatedAt` a +1 giorno → il salvataggio passa; accesso con Firestore bloccato → «Connessione assente», poi entra da solo quando torna.
