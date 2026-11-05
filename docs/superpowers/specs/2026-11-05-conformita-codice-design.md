# Conformità nel codice (blocco 2) — design

Stato delle 18 voci: `docs/legal/STATO-CONFORMITA.md`. Piano di origine: `Groomly_Compliance_Legale_PIANO.md`.

## Perché

Groomly deve poter dimostrare chi ha accettato quali documenti, rispettare chi non vuole email e dire la verità sugli abbonamenti prima di accendere Plus e Salon. Questo blocco prepara il codice. I testi legali cambiano nel blocco 4, che alzerà la versione dei documenti una volta sola.

## Obiettivi

- Voce 4: versione salvata, prova dell'accettazione sul server, nuova richiesta quando la versione sale.
- Voce 2: esportazione completa.
- Voce 9: regole Storage nel progetto, con test.
- Voce 10: disiscrizione per persona e consenso promozionale.
- Voci 12, 13: rinnovo dichiarato e disdetta, invisibili a piani spenti.
- Voci 14, 16, 17: frasi neutre, `docs/licenze_asset.md`, licenze complete.

## Fuori da questo blocco

- Testi di Privacy, Termini, DPA e copie in `docs/legal/*.html`, `hosting/privacy.html`.
- Analytics e Crashlytics, statistiche, nome del titolare.
- Alzare la versione dei documenti.
- Deploy e APK senza il via dell'utente.

## Da non fare mai

- Scrivere nel salone `shared`, né nei test né nelle migrazioni.
- Accendere Plus o Salon.
- Far comparire la schermata di riaccettazione a qualcuno con questo aggiornamento.
- Bloccare un salone senza rete.
- Fermare le email di servizio.

## Vincoli

- Testi nuovi in 5 lingue: it, en, es, fr, de.
- Evitare `src/lib/salonPath.ts`, `src/lib/authGate.ts`, `firestore.rules` (sessione accessi-admin).
- `src/data/firebase/client.ts`: modifiche piccole, da riportare a fine lavoro.
- UI compatta, chiaro e scuro, nello stile attuale.

## Approcci considerati

- **Scrive il server (scelto dall'utente).** Nuove functions registrano accettazione, consenso e disiscrizione. Prova più solida, `firestore.rules` non cambia. Le functions vanno pubblicate prima dell'APK.
- **Scrive l'app.** Meno codice, ma data e versione alterabili, e l'elenco bloccati richiederebbe di cambiare `firestore.rules`.
- **Lista disiscritti di Brevo (scartato).** Tutti i saloni usano lo stesso mittente: uscire da un salone significherebbe uscire da tutti, email di servizio comprese.

## Voce 4 — Accettazione dei documenti

**Decisioni dell'utente:** schermata che blocca; Laura la vede come tutti, senza «Elimina account»; scrive il server.

**Versione.** Nuovo file `src/lib/versioneLegale.ts`:
- `VERSIONE_DOCUMENTI = 1`, un numero unico per l'insieme dei documenti.
- `DOCUMENTI_IN_VIGORE = { termini: '1.1', privacy: '2' }`, per lo storico.
- `deveRiaccettare(termini, richiesta = VERSIONE_DOCUMENTI)`: vero se la versione accettata è minore. Senza versione, o senza `termini`, vale 1. Così oggi nessuno vede la schermata, e con la versione 2 la vedono tutti.

**Dati.**
- `accounts/{uid}.termini`: `{ accettati, at, versione, documenti, suServer }`.
- Storico `accounts/{uid}/registro/{id}`: `{ tipo: 'documenti', versione, documenti, at, appVersione }`. Nessuna regola lo apre, quindi il client non lo legge né lo scrive. Si cancella con l'account.

**Function `registraAccettazione`** (callable, utente autenticato): accetta solo `versione === VERSIONE_DOCUMENTI`, scrive data del server e storico.

**Registrazione.** `client.ts:2452` aggiunge `versione` e `documenti`, poi chiama la function. Se fallisce, l'account resta valido, senza `suServer`, e l'app riprova in silenzio all'apertura successiva.
Lo stesso codice serve anche la riparazione del salone, dove la casella non si vede: lì non va registrata un'accettazione nuova.

**Schermata.** Componente nuovo montato in `src/app/router.tsx`, dentro `Guard` (non in `authGate.ts`):
- Compare se `entry.kind === 'home'` e `deveRiaccettare` è vero.
- Mostra i link a privacy, termini e DPA, «Accetto», «Esci» ed «Elimina account». L'ultimo si nasconde con `accountNonEliminabile`.
- La pagina `/impostazioni/account/elimina` resta raggiungibile.
- Senza rete non blocca. Se la function risponde «non disponibile» si entra lo stesso e la richiesta torna alla prossima apertura.

## Voce 10 — Clienti dei saloni

**Decisione dell'utente:** chi si disiscrive esce da tutte le email di quel salone, per quell'indirizzo.

**Dati.** `salons/{salonId}/emailBloccate/{sha256(email minuscola)}`: `{ email, at, fonte: 'link' | 'scheda' }`. La regola generica lascia leggere ai membri e, poiché il tipo non è in `salonKindWritable`, solo il server scrive.

**`silenzioEmail`** (estesa):
- Dalla riga ricava l'indirizzo e scrive il blocco.
- Segna `emailBloccata: true` su tutti i cani con quell'indirizzo e ferma le loro righe in coda.
- Il token può venire anche da un'offerta di posto libero.
- Se la riga non ha un indirizzo, si comporta come oggi, per cane.
- Rifiuta `shared`, come oggi.

**Function `impostaEmailCliente({ dogId, bloccata })`:** solo titolare e socio, mai `shared`. Scrive o toglie il blocco e allinea tutti i cani con lo stesso indirizzo.

**Invio.** `giraCoda` legge `emailBloccate` per il salone. `inviaCoda` e `inviaOfferteAttesa` saltano gli indirizzi bloccati, così anche un cane aggiunto dopo resta silenzioso. La lettura su `shared` è ammessa, la scrittura no.

**Scheda.** In `DogPage` un interruttore «Email al cliente» sostituisce il riquadro «Riattiva». Si vede solo con un'email, per titolare e socio, e non in `shared`.

**Posto libero.** `mailPostoLibero` riceve il link e l'offerta conserva un token.

**Pagina `hosting/azione`.** Il testo dice che si esce da tutte le email del salone, in 5 lingue.

**Dati esistenti.** Nessuna migrazione: i vecchi `emailBloccata` continuano a valere per il cane.

## Voce 10 — Email di Groomly ai saloni

**Decisioni dell'utente:** si chiede nel tour, spento finché non si dice sì; solo per i nuovi iscritti; gli account esistenti restano spenti.

**Dati.**
- `accounts/{uid}.emailPromo`: `{ attivo, at, fonte: 'tour' | 'account' | 'link', token }`.
- Ogni cambio aggiunge a `accounts/{uid}/registro` una riga `{ tipo: 'email-promo', attivo, fonte, at }`.

**Function `impostaEmailPromo({ attivo, fonte })`** per l'utente autenticato.
**Function `disiscriviPromo({ uid, token })`** per il link, senza accesso. Nuovo `mode=promo` in `hosting/azione`.

**Tour.** In `src/pages/TourPage.tsx` una schermata `{ tipo: 'promo' }` prima di `fine`:
- Domanda con «Sì» e «No, grazie», niente già selezionato.
- Si salta se l'account ha già risposto.
- Saltare o uscire non scrive nulla e il consenso resta spento.
- Non entra in `passiCompletamento`, quindi non cambia l'avanzamento del salone.

**Account.** Interruttore in Account › Privacy e dati, anche per soci e collaboratori.

**Invio.** Nuovo `functions/src/promo/inviaPromo.ts`: controlla `emailPromo.attivo === true`, crea il token se manca, aggiunge il link «Disiscriviti» e l'intestazione `List-Unsubscribe`. È l'unica strada per le email promozionali e la userà anche la Console.

**Classificazione.**
- Di servizio, senza link: verifica, reset, eliminazione, fine beta, revoca beta, annuncio pagamenti.
- Promozionali: inviti a Plus e Salon, novità, Comunicazioni della Console.

## Voce 2 — Esportazione

- `backupCollect.ts` legge anche `richieste`, `attesa` e `coda`.
- Tre fogli nuovi nel Registro Excel e un file `dati/altri-dati.json` nello ZIP.
- `dati/account.json` con i dati dell'account di chi esporta.
- `GroomlyDati` e `versioneFormato` non cambiano: il ripristino ignora i file nuovi e i vecchi backup restano validi.
- Soci e collaboratori: in Privacy e dati, chi non vede il backup ha «Scarica i miei dati», che salva il proprio `account.json`.

## Voce 9 — Regole Storage

- `storage.rules`: lettura e scrittura solo in `users/{uid}/**` per il proprietario, tutto il resto negato.
- Prima controllare ogni percorso in `storagePaths` (`src/lib/firebaseMap.ts:35`).
- Sezione `storage` in `firebase.json` e test sull'emulatore.
- Nessuna pubblicazione. Con la sezione in `firebase.json`, un `firebase deploy` completo pubblicherebbe anche queste regole: va detto nel riepilogo finale.
- Lanciare anche i test esistenti delle regole Firestore, per chiudere la voce 9.

## Voci 12 e 13 — Abbonamento

- `Vetrina.tsx`: con `offerta.acquisto === 'abbonati'`, riepilogo vicino al pulsante con prezzo, frequenza, rinnovo automatico e disdetta su Google Play.
- Prova: 30 giorni, data di fine calcolata, nessuna carta, ritorno a Go senza addebiti.
- `src/lib/abbonamento.ts`: `linkGestionePlay(prodotto)` con `sku` e `package=it.groomly.app`, aperto con `apriEsterno`.
- `AbbonamentoPage.tsx`: pulsante «Gestisci / Disdici» solo per chi ha un abbonamento con fonte Play, con la riga «si torna a Go, i dati restano».
- Il link del pagamento in sospeso usa la stessa funzione.
- A piani spenti non cambia nulla di visibile, e un test lo verifica.

## Voci 14, 16, 17

- **Frasi:** `vetrinaFoto` e `pwCopieCloudTesto` perdono «al sicuro», in 5 lingue.
- **`docs/licenze_asset.md`:** loghi e icone come opera propria del progetto, su dichiarazione dell'utente; font OFL con il pacchetto di origine.
- **Pacchetti:** `scripts/genera-licenze.mjs` legge i due lockfile e scrive `src/data/licenze.json`. `LicenzePage` mostra nome, versione e licenza. Un test confronta l'elenco con i lockfile.
- Controllare `buffers` e `limiter` e registrare l'esito. Segnare che `jszip` si usa con licenza MIT.

## Test

- Unità per `versioneLegale`, compreso il caso di versione 2.
- Functions con l'archivio finto già usato da `silenzioEmail.test.ts`, compresi il rifiuto di `shared` e l'indirizzo con due cani.
- Componenti per schermata, tour, interruttori, vetrina a piani spenti e accesi.
- Regole Storage e Firestore sull'emulatore, con progetto `demo-groomly`.
- Prova finale su saloni finti, poi eliminazione dei dati di test.

## Lasciato a chi costruisce

Nomi dei campi e delle chiavi di testo, disposizione delle schermate nello stile attuale, ordine delle attività.

## Scelte da confermare

Scelte mie, non dell'utente:
- Numero unico di versione per tutti i documenti.
- `List-Unsubscribe` semplice, senza disiscrizione a un clic: serve un endpoint in più ed è richiesta solo per grandi volumi.
- Fine beta e revoca beta restano di servizio.
- **Gli inviti alla beta seguono il consenso promozionale.** Con tutti gli account spenti l'email non partirebbe e resterebbe solo la scheda dentro l'app. Da confermare.
