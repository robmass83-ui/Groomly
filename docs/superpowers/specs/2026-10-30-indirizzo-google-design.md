# Indirizzo con suggerimenti di Google — design

Data: 2026-10-30

## Perché

Oggi l'indirizzo della toelettatura si scrive a mano e finisce così com'è sulla pagina pubblica del salone, che lo apre su Google Maps (`src/lib/paginaPubblica.ts`, `mapsHref`). Un errore di battitura porta i clienti nel posto sbagliato. Roberto vuole che, scrivendo per esempio "via Renoir 8", compaia la lista degli indirizzi veri (Quarto Sant'Elena, Roma, …) e che si scelga quello giusto: niente errori, e l'indirizzo è esattamente quello che compare su Google.

Fa parte del lavoro sul tour "Prepariamo il salone" (`2026-10-30-tour-prepariamo-salone-design.md`): il passo "Indirizzo e orari" usa questo campo. Si costruisce **prima** del tour.

## Obiettivi

- Un campo indirizzo con suggerimenti di Google, uguale ovunque si inserisce l'indirizzo della toelettatura:
  - scheda Toelettatura nell'account (`src/pages/AccountPage.tsx` ~452);
  - passo "Indirizzo e orari" del tour.
- Scelto un suggerimento, si salva l'indirizzo completo come lo scrive Google, più l'identificativo del luogo di Google.
- La pagina pubblica apre su Google Maps proprio quel luogo.

## Non obiettivi

- Indirizzi dei clienti/animali: non toccati.
- Mappa visibile nell'app: no.
- Indirizzo nella registrazione: **tolto** (vedi sotto), non spostato altrove.

## Anti-obiettivi

- La chiave di Google visibile nell'app o usabile da chiunque.
- Costi fuori controllo: ogni richiesta passa dal server, solo per utenti entrati, con un limite.
- Utente bloccato perché Google non trova il suo indirizzo o la rete non c'è.

## Decisioni di Roberto

- **Fonte: Google** (Places API "New" di Google Maps Platform), non OpenStreetMap.
- **Indirizzo tolto dal modulo di registrazione** (`src/pages/LoginPage.tsx` ~133). Si chiede subito dopo nel tour, con i suggerimenti, quando l'account esiste ed è protetto. Se il tour è spento o il passo saltato, restano gli avvisi esistenti per l'indirizzo mancante e la card "Completa il profilo".

## Come funziona per chi lo usa

1. Scrive nel campo. Dopo 3 caratteri e una breve pausa nella digitazione compare sotto il campo una lista di al massimo 5 suggerimenti: riga principale in grassetto (via e numero), riga secondaria più chiara (città, provincia, paese).
2. Tocca un suggerimento: il campo si riempie con l'indirizzo completo di Google (es. "Via Pierre-Auguste Renoir, 8, 09045 Quartu Sant'Elena CA, Italia") e la lista si chiude con una piccola spunta verde accanto al campo ("indirizzo verificato").
3. Se modifica a mano il testo dopo averlo scelto, la spunta sparisce e l'identificativo di Google si toglie: torna un indirizzo "scritto".
4. Se Google non trova niente, o c'è un errore o manca la rete, sotto il campo compare "Non trovi il tuo indirizzo? Usa quello che hai scritto": l'utente non resta mai bloccato; l'indirizzo si salva come testo, senza spunta.
5. In fondo alla lista c'è la dicitura "con tecnologia Google" (obbligatoria per le condizioni d'uso di Google quando i suggerimenti non stanno su una mappa Google).

Stile Groomly: campo `Input` esistente, lista in una card (`--card`, `--line`, `--sh-2`, raggio 12) che si apre con una piccola animazione (sfuma + scende di 6px, 200 ms, curva `cubic-bezier(.22,1,.36,1)`), righe alte almeno 44px, riga evidenziata con `--pri-s`, icona lucide `MapPin` a sinistra di ogni suggerimento. Accessibile come combobox (frecce su/giù, Invio, Esc; `role="combobox"`/`listbox`/`option`). Testi in it/en/es.

## Come funziona dietro

- **Due funzioni del server** (Cloud Functions, regione `europe-west1`, come le altre callable):
  - `suggerisciIndirizzi({ testo, sessione, lingua })` → `{ suggerimenti: { placeId, principale, secondario }[] }` — chiama Places Autocomplete (New) con `languageCode` = lingua dell'app, preferenza per l'Italia (`regionCode: 'it'`), solo indirizzi (`includedPrimaryTypes` adatti a vie/civici).
  - `dettaglioIndirizzo({ placeId, sessione })` → `{ indirizzo, placeId }` — chiama Place Details (New) chiedendo solo `formattedAddress`.
  - Il **token di sessione** (`sessione`, generato dall'app all'inizio di ogni ricerca e riusato fino alla scelta) raggruppa le richieste in una sessione di Google, come raccomanda Google per contenere i costi.
- **Chiave** in un secret delle Functions (`PLACES_API_KEY`, come `BREVO_API_KEY`), mai nell'app.
- **Solo utenti entrati** (`requireUid`). Limite per utente: 200 richieste al giorno, contate in una collezione del server sul modello dei limiti email esistenti (`emailRateLimits`); oltre il limite la funzione risponde "troppe richieste" e l'app mostra il ripiego del punto 4.
- **Dati salvati:** `business.address` = l'indirizzo di Google (o quello scritto); nuovo campo facoltativo `business.placeId` (stringa) quando l'indirizzo viene da Google, tolto se l'indirizzo viene modificato a mano. Va letto/ripulito in `mergeSettings` come gli altri campi di `business`.
- **Pagina pubblica:** con `placeId` presente, il link mappe diventa `https://www.google.com/maps/search/?api=1&query=<indirizzo>&query_place_id=<placeId>`; senza, resta com'è oggi. Il `placeId` va portato fino a dove si costruisce la pagina (oggi arriva solo `indirizzo`).
- **Registrazione:** il campo indirizzo sparisce dal modulo; `RegistrationValues`, profilo in attesa (`src/data/local/pendingSalon.ts`) e `OwnerProfile` (`client.ts` ~1977) mantengono il campo per compatibilità con profili già salvati sui telefoni, ma la registrazione lo manda vuoto.

## Cosa deve fare Roberto (una volta)

1. Nella console Google Cloud del progetto Firebase: attivare **Places API (New)**.
2. Creare una chiave API limitata alla sola Places API (New).
3. Salvarla come secret: `firebase functions:secrets:set PLACES_API_KEY`.
4. (Consigliato) Impostare un budget con avviso sulla fatturazione del progetto.

Senza chiave il campo funziona lo stesso come testo libero (il ripiego del punto 4), così l'app non si rompe prima della configurazione.

## Approcci considerati

1. **Google tramite funzioni del server (scelto).** Chiave nascosta, limite per utente, indirizzi identici a Google Maps.
2. **Google direttamente dall'app** (libreria JavaScript di Maps). Più semplice, ma la chiave è nell'app e ogni pagina carica la libreria di Google; nell'app Android serve comunque una chiave esposta. Scartato.
3. **OpenStreetMap (Photon).** Gratis e senza chiave, ma meno preciso e non identico a Google. Scartato da Roberto.

## Decisioni mie (da verificare)

- Lista dopo 3 caratteri e 300 ms di pausa; massimo 5 suggerimenti.
- Preferenza per l'Italia ma nessun blocco: funziona anche per un salone in Spagna.
- Ripiego "Usa quello che hai scritto" sempre disponibile quando Google non aiuta.
- Limite di 200 richieste al giorno per utente.
- Spunta verde "indirizzo verificato" quando viene da Google.

## Lasciato al builder

- Nomi esatti dei file e del componente (es. `src/components/ui/IndirizzoInput.tsx`), forma della collezione dei limiti e relative regole Firestore (client senza accesso).
- Come simulare Google nei test (la funzione del server riceve un `fetch` iniettabile).
