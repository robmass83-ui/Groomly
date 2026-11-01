# A1 — La lista d'attesa funziona solo col piano che la comprende

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A1. Specifica breve (lavoro piccolo).

## Perché
La lista d'attesa è una funzione Plus. Quando un salone perde il piano (prova finita, passaggio a Go, sospensione) l'impostazione `serviziEmail.attesa` resta accesa e tre punti del server guardano solo quella:
- `functions/src/piano/iscrivitiAttesa.ts:51` accetta le iscrizioni;
- `functions/src/piano/confermaAttesa.ts:60` conferma un'offerta vecchia: nasce una visita `programmato` e una scheda cane nell'agenda di un Go che non vede più la lista;
- `functions/src/piano/paginaPubblica.ts:66` mostra `"attesa": true` sulla pagina pubblica.

L'invio delle offerte (`functions/src/piano/giraCoda.ts:387`) usa già `serviziPerPiano(...)`: è il modello da seguire.

## Decisioni di Roberto
1. Quando il piano non comprende la lista d'attesa, la lista **resta salvata ma ferma**: niente iscrizioni nuove, niente conferme; torna com'era se il salone riprende il piano.
2. Chi apre il link di un'offerta mandata prima vede che l'offerta **non è più disponibile** e di contattare il salone; non si prenota nulla.

## Obiettivi
1. I tre punti decidono «lista accesa» con lo stesso criterio di `giraCoda.ts:387`: `serviziAccesi(serviziPerPiano(settings.serviziEmail, <pro/main del salone>, adesso)).includes('attesa')`, leggendo `salons/<salonId>/pro/main`.
2. Esiti: iscrizione → `{ ok: false, errore: 'spento' }`; conferma/lettura offerta → `{ ok: false, errore: 'spento' }`, nessuna scrittura; pagina pubblica → `attesa: false`.
3. Nessun dato cancellato: iscritti e offerte restano in Firestore.
4. Sulla pagina pubblica (`hosting/s/pagina.js`), aprendo un link `?attesa=<token>` con la lista ferma, il messaggio dice che l'offerta non è più disponibile e di contattare il salone (it/en/es), invece del generico «La lista d'attesa non è attiva.». Il messaggio del modulo di iscrizione resta quello di oggi.
5. Test: per ognuno dei tre punti, salone con `serviziEmail.attesa` acceso ma piano senza lista (es. prova scaduta / Go) → spento; con piano Plus attivo → funziona come oggi.

## Non obiettivi
- Spegnere l'impostazione salvata o pulire la lista quando il piano finisce.
- Onorare le offerte già mandate.
- Cambiare cosa vede il titolare nell'app.

## Anti-obiettivi
- Rompere la lista a un salone Plus attivo, in prova o in grazia (stati in cui `haAccesso` concede la lista).

## Approcci
Uno solo sensato: lo stesso controllo del piano già usato per le email. Alternative scartate: spegnere `serviziEmail.attesa` quando il piano scade (scrive dati dell'utente e perde la scelta per quando riprende Plus); controllare nelle regole Firestore (le funzioni usano l'Admin SDK, le regole non contano).

## Lasciato al builder
- Una funzione comune per «lista accesa per questo salone» se evita tre copie.
- Testo esatto del messaggio dell'offerta non più disponibile (breve, nelle tre lingue, tono della pagina).
- Deploy: functions + hosting dopo il merge (con `FUNCTIONS_DISCOVERY_TIMEOUT=60`, memoria `deploy-functions-timeout`).
