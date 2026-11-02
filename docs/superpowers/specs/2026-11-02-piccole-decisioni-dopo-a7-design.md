# Tre piccole decisioni rimaste aperte (dopo A7)

Specifica breve. Decisioni di Roberto del 2 novembre 2026 (approvate tutte e tre come proposte).

## 1. Card «Il tuo piano» del collaboratore a tutta riga
- **Oggi:** in `src/pages/SettingsPage.tsx:~866` la griglia a due colonne ha Suggerimenti, (Incassi solo per chi `vedeIncassi`), Avvisi, `SchedaAbbonamento`. Senza Incassi (collaboratore, decisione A5) la scheda del piano resta sola su mezza riga.
- **Da fare:** quando Incassi non c'è, `SchedaAbbonamento` occupa tutta la riga (`gridColumn: '1 / -1'`). Con Incassi niente cambia.
- **Test:** da collaboratore la scheda ha `grid-column: 1 / -1`; da titolare no.

## 2. Dal link di un'offerta si può sempre uscire dalla lista d'attesa
- **Oggi:** `confermaAttesaPer` (`functions/src/piano/confermaAttesa.ts:~62`) risponde `spento` a ogni azione quando la lista non è compresa nel piano, anche a `esci`. La pagina pubblica (`hosting/s/pagina.js`, `avviaLink` ~1236 ed `esitoLink` ~1224) mostra solo «Questa offerta non è più disponibile. Per prenotare contatta il salone.»
- **Da fare:**
  - server: con la lista spenta, l'azione `esci` funziona come oggi con la lista accesa (iscritto `attivo: false`, esito `uscito`); tutte le altre azioni restano `spento`.
  - pagina: dove oggi mostra `offertaFinita` (lista spenta, sia subito sia dopo una risposta `spento`) aggiunge sotto il pulsante esistente `t.esco` («Esci dalla lista» nelle tre lingue, già presente). Toccato, chiama `esci` e mostra `t.uscito`; su errore il solito `t.ko` e si può riprovare.
- **Test:** server: lista spenta + `esci` → `{ ok: true, esito: 'uscito' }` e iscritto `attivo: false`; lista spenta + `conferma`/`leggi` → `spento` come oggi. Pagina: `hosting/s/paginaAttesa.test.ts` con lista spenta → testo `offertaFinita` e pulsante «Esci dalla lista»; il click chiama `confermaAttesa` con `azione: 'esci'` e mostra «Sei uscito dalla lista.»
- **Deploy:** function `confermaAttesa` + hosting. Niente APK per questo punto.

## 3. Membro con l'app aperta quando esce dal salone non suo
- **Oggi:** `StaffLock` (`src/components/AccessoSospeso.tsx`) ascolta `watchSalonAccess`; quando il proprio `members/<uid>` diventa `revocato` (revoca, eliminazione dell'account del titolare, eliminazione del salone) mostra «Il titolare ha spento il piano. I dati non sono persi.» finché la persona non esce e rientra, anche se il server l'ha già riportata al suo salone.
- **Da fare:** quando `accessoSospeso(...)` diventa vero **e** il proprio member non è più `attivo` (assente o revocato), `StaffLock` rilegge l'account dal server una volta (`reloadSignedInAccount`). Se `salonId` non è più quello in uso, chiama `dopoCambioSalone(uid)` (`src/data/local/cambioSalone.ts`, A7): pulizia delle copie locali e ripartenza nel suo salone. Altrimenti (piano davvero spento dal titolare, member ancora attivo, o rilettura fallita) resta il messaggio di oggi.
- **Test:** con member revocato e account riletto che punta al proprio uid → `dopoCambioSalone` chiamato una volta, nessun messaggio «spento»; member attivo con piano spento → messaggio di oggi, nessuna rilettura; rilettura fallita → messaggio di oggi.

## Non obiettivi
- Cambiare il testo «Il titolare ha spento il piano» per i casi in cui resta.
- Togliersi dalla lista d'attesa dall'app o da altre pagine.

## Approcci
Per ciascun punto c'è una sola via sensata coerente con quanto già fatto (A5, A1, A7): le alternative (nascondere la scheda, una pagina nuova per uscire dalla lista, un ascolto continuo dell'account) costano di più senza dare di più.

## Rilascio
Prima function `confermaAttesa` e hosting, poi APK (punti 1 e 3).
