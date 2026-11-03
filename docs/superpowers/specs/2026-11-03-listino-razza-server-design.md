# Listino per razza anche nelle visite create dal server — design

Seguito della media 23 dell'audit (`docs/AUDIT-QA-2026-11-01.md`). Cambio piccolo: design breve.

## Perché

Nell'app il prezzo di un servizio segue l'ordine prezzo personale del cane → riga della razza nel listino → prezzo per taglia (`quotedPrice` in `src/lib/quote.ts`, che usa `prezzoDalListino` di `src/lib/listinoRazza.ts`). Le due visite che nascono sul server usano ancora solo il prezzo per taglia, quindi in agenda e negli incassi finisce un prezzo diverso da quello del listino:

- richiesta della pagina pubblica accettata dal salone (`functions/src/piano/gestisciPrenotazione.ts`, `applicaPiano`): la visita prende `serviziDellaRichiesta(richiesta.voci)`, con i prezzi per taglia fissati all'invio (`inviaRichiesta.ts`);
- posto della lista d'attesa confermato dal cliente (`functions/src/piano/confermaAttesa.ts`): `prezzoDi(servizio, taglia)`.

## Obiettivi

- Il prezzo di ogni servizio della visita creata dal server segue lo stesso ordine dell'app, calcolato quando la visita nasce.
- Una sola regola: le functions usano `quotedPrice` (o la parte che serve) da `src/lib`, come già fanno con altri moduli.

## Non obiettivi

- Pagina pubblica e mail al cliente restano come oggi: prezzi per taglia segnati come indicativi (decisione di Roberto).
- La richiesta salvata (`voci`, `totaleIndicativo`) non cambia: è ciò che il cliente ha visto; il riquadro della Home continua a mostrare «Totale indicativo».
- Le durate e gli orari della visita non cambiano (il posto è già stato calcolato e controllato con le durate della richiesta). Cambia solo `price`.

## Approcci considerati

1. **Il server ricalcola il prezzo quando la visita nasce** — scelto da Roberto. Copre richieste e lista d'attesa con la stessa regola dell'app, anche quando la richiesta è collegata a un cane esistente con prezzi personali. Costo: qualche lettura in più nella transazione (impostazioni, servizi, cane esistente).
2. Prezzo fissato all'invio della richiesta confrontando la razza scritta col listino: non sa a quale cane il salone collegherà la richiesta (prezzi personali persi) e salverebbe un prezzo diverso da quello mostrato al cliente.
3. Prezzo calcolato dall'app del salone e passato al server: non copre la lista d'attesa, che conferma il cliente dal link senza app del salone.

## Come

- **Cane usato per il calcolo**
  - richiesta collegata a un cane esistente (`sceltaAnimale` = id): il documento del cane (razza, taglia, `servicePrices`);
  - cane nuovo: quello che `documentoCane` scrive (razza scritta dal cliente, taglia della richiesta, nessun prezzo personale);
  - nessun cane (visita senza `dogId`, `ospiteNome`): razza e taglia della richiesta;
  - lista d'attesa, cane già in archivio trovato per email e nome: il suo documento; cane nuovo: razza vuota, quindi prezzo per taglia (resta come oggi).
- **Listino e servizi**: `settings/main.priceSheet` e la collezione `services` del salone, letti nella transazione.
- **Righe senza servizio vero** (segnaposto `prenotazione`, servizio cancellato o non trovato): tengono il prezzo che hanno oggi.
- **Dove**: in `applicaPiano` sia per `crea` sia per `conferma` quando sostituisce il segnaposto; in `confermaAttesa` al posto di `prezzoDi`.

## Lasciato a chi costruisce

- Se `quotedPrice` / `listinoRazza` / `dogList` si importano nelle functions così come sono o se va spostata una piccola funzione pura (per esempio `normalizeSearch`) per non trascinare dipendenze dell'interfaccia nel build delle functions.
- La forma esatta della funzione condivisa che riceve i dati grezzi di Firestore e restituisce i servizi col prezzo.

## Verifica

- Unità sulla funzione di prezzo con dati grezzi (personale, razza, taglia, segnaposto, servizio mancante).
- Script sull'emulatore con le functions compilate (come `QA-tests/.qa-catalog/verify-*.cjs`): Yorkshire con riga di listino diversa dal prezzo per taglia → visita accettata col prezzo del listino; richiesta collegata a un cane con prezzo personale → prezzo personale; lista d'attesa con cane esistente → listino; lista d'attesa con cane nuovo → taglia.
- Deploy: solo le functions toccate (`gestisciPrenotazione` e chi usa `applicaPiano`, `confermaAttesa`). Nessuna APK se l'app non cambia.
