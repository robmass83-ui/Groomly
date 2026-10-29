# Groomly — ultimo giro prima di pubblicare (26/10/2026)

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Scritto da Claude dopo il riepilogo di Cursor del 26/10 notte, il registro, `docs/Groomly_QA_gstack_2026-10-26.md` e lo stato online.
Stato online verificato: `groomlyapp.it/release.json` = **1.1.94** (Laura non vede aggiornamenti). Nel repository la versione è già **1.1.96**.

## 0. Istruzioni già eseguite (non rifare)
1. Un solo `/brainstorm` su questo documento, opzioni consigliate scelte da solo (in `DECISIONI-AUTOMATICHE.md`), un solo piano `docs/superpowers/plans/2026-10-26-ultimo-giro.md`, esecuzione fino in fondo senza fermarti tra le zone.
2. Test prima di ogni modifica, un commit per task, registro aggiornato, `npm test` e `npm run build` verdi.
3. Regole di sempre: flag `mostraPiani` e `abbonamentiAttivi` spenti; mai dati reali di Laura / `salon/shared` / Troddioni; APK GitHub firma debug; **nessuna release pubblicata da te**; regole Firestore solo dopo prova emulatore con i salvataggi della 1.1.94.
4. Hai finito quando ogni voce è «fatto» o «bloccato da Roberto» con il motivo.

## 1. Subito: l'avviso di aggiornamento non deve partire per sbaglio
`hosting/release.json` nel repository dice già 1.1.96. Al prossimo deploy dell'hosting Laura riceverebbe una versione non provata.
- `hosting/release.json` deve contenere **sempre e solo la versione pubblicata** (oggi 1.1.94). La versione pronta sta in `docs/play/release-<versione>.json`.
- Aggiungi un test che fallisce se `hosting/release.json` è più nuovo dell'ultimo tag GitHub pubblicato.
- Stesso discorso per `hosting/groomly.apk`: online deve esserci l'APK della versione pubblicata, oppure il controllo dell'app deve scaricare solo l'APK della versione indicata in `release.json` (es. `groomly-1.1.96.apk`). Scegli la soluzione consigliata e spiegala nel registro.

## 2. Funzioni gratuite visibili subito (decisione di Roberto)
Il piano `Groomly_Controlli_Avanzati_PIANO.md` dice che F1, F2 e F3 sono **Free**, ma oggi `StrumentiManuali` si vede solo con `mostraPiani`. Roberto vuole vederle adesso.
- **F1 Messaggi WhatsApp manuali** (link `wa.me`, testo precompilato e modificabile): promemoria appuntamento, conferma, cane pronto da ritirare, richiamo dopo X settimane, auguri. Dalla scheda del cane e dall'appuntamento. Testo nella **lingua dei clienti**, firma «Fatto con Groomly» come già previsto per il piano base.
- **F2 Affidabilità cliente** («Spesso non viene» e simili) e **F3 Note vocali**.
- Visibili **senza** `mostraPiani`, in Impostazioni in una sezione «Strumenti» con un interruttore per funzione, tutti **spenti** di default (R1: chi non li accende vede l'app di prima). Con l'interruttore acceso compaiono i pulsanti.
- Restano dietro i flag le funzioni Pro: «Invia tutti», pagella/collage, prenotazioni online, lista d'attesa, recensioni, fedeltà, statistiche avanzate.
- Test: con gli interruttori spenti le schermate sono identiche alla 1.1.94; acceso F1, il link `wa.me` ha numero normalizzato (+39…) e testo nella lingua dei clienti.

## 3. Lingue: niente più italiano in inglese e spagnolo
Il giro a mano ha trovato italiano: «Partita IVA», «Ottobre 2026» sulla riga incassi, «Torna agli animali», «Nessun appuntamento» e «Proprietario» sulla scheda, didascalie della gestione prezzi del listino. Roberto ne vede altre sul telefono.
- Il controllo automatico attuale non le ha prese: aggiungi un **controllo a schermo** (Playwright sull'emulatore) che apre **tutte le route** e tutti i fogli/dialog principali con telefono in `en` e in `es`, legge il testo visibile e fallisce se trova parole di un elenco di italiano comune (Nessun, Proprietario, Torna, Salva, Annulla, Partita IVA, nomi dei mesi e dei giorni in italiano, «cani», «appuntamento», ecc.) che non siano dati del salone.
- Correggi tutto quello che trova, compresi mesi e date (sempre dal modulo `format.ts`), etichette fiscali («VAT number» / «NIF / CIF», campo facoltativo), PDF/Excel/listino.
- Ammessi uguali: Groomly, Privacy, DPA, WhatsApp, POS, nomi dei cani e dei servizi scritti dal salone.

## 4. Email in inglese e spagnolo: prova vera
L'HTML delle 10 email esiste nelle tre lingue, ma nessuna è stata spedita davvero.
- Crea una funzione **solo operatore** (Roberto) che spedisce tramite Brevo **una email per tipo e per lingua** (10 × 3) **solo a `info@groomlyapp.it`**, con dati finti. Nessun cliente, nessun salone reale.
- Prova sull'emulatore senza chiave (non spedisce), poi deploy e **fermati**: Roberto la lancia dal telefono e Claude controlla le email arrivate.
- Solo dopo l'ok: segnale in `DA-FARE-ROBERTO` per spegnere i template Brevo 3–12 (il 5 resta finché l'invito non parte dal codice in produzione).

## 5. Percorsi non ancora provati (emulatore)
- **Prenotazione dalla pagina pubblica**, con il modulo vero, nelle tre lingue: richiesta → il salone accetta / propone altro orario / rifiuta → HTML delle email giuste nella lingua dei clienti. Anche la scheda cliente `/c`.
- **Collaboratore con piano spento**: il seed lo deve creare spento e il giro deve vedere «accesso sospeso».
- Socio e collaboratore anche in inglese e spagnolo.

## 6. Velocità della home
Sull'emulatore restano circa 3,2–4,1 s dal login al primo dato (obiettivo < 3 s). L'emulatore non è il telefono.
- Aggiungi una misura reale: tempo dall'apertura dell'app al primo dato, salvato in locale e visibile solo all'operatore (Impostazioni → Info), così Roberto la legge sul telefono.
- Togli le attese ancora evitabili e riporta i numeri prima/dopo. Se sul telefono è già sotto i 3 s, chiudi la voce.

## 7. Ordine nei documenti
- Riga «Eseguito — vedi registro» in cima a **tutti** i piani già eseguiti (lingue, piani completi, allineamento Laura, personale e chiusure, sync personale, notifiche, impostazioni chiare, interfaccia comoda, note appuntamento, cancellazione e note).
- In `Groomly_Abbonamenti_PIANO.md` e `Groomly_Controlli_Avanzati_PIANO.md` aggiungi in cima una tabella di stato (fatto / dietro flag / rimandato) per ogni funzione.
- `fix/groomly-fix-ux.md` in `docs/archive/` con la nota «assorbito dai piani successivi».
- `DA-FARE-ROBERTO.md` e `GROOMLY-COSA-RESTA.md` aggiornati alla versione pronta vera.

## 8. Scheda «nido» (decide Roberto)
Prepara in `docs/archive/confronto-scheda-nido.html` due immagini affiancate della scheda del cane: quella della 1.1.88 (`scheda-nido`) e quella di oggi, chiaro e scuro, stesso cane finto. Non unire niente: Roberto sceglie.

## 9. Fine: versione pronta
- Test 360 completo sull'emulatore: tutti i ruoli × italiano, inglese, spagnolo; offline; prenotazione; email HTML. Rapporto `docs/Groomly_Test360_RAPPORTO_FINALE_2.md`.
- Deploy di functions e hosting **senza** cambiare la versione pubblicata (vedi punto 1).
- Versione pronta (la prima libera dopo 1.1.96), APK debug e AAB `play`, `docs/play/release-<versione>.json`. **Fermati** e scrivi a Roberto come provarla.

## Rimandato di proposito (non fare)
WhatsApp automatico e crediti; Play Billing scritto a mano (si userà RevenueCat); foto su Storage; accensione dei piani; parere legale estero; valute non euro, campi fiscali stranieri, altre lingue, traduzione dei testi del salone, selettore lingua nella schermata di accesso.
