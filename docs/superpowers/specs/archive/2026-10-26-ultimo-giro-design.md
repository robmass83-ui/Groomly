# Ultimo giro prima di pubblicare — specifica

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 26 ottobre 2026. Fonte: `docs/GROOMLY-ULTIMO-GIRO.md`, con il punto 1 aggiornato da Roberto: la versione pubblicata è **1.1.96**, non 1.1.94. Decisioni: `docs/DECISIONI-AUTOMATICHE.md` D41–D50. L’approvazione sezione per sezione non si aspetta: lo chiede la sezione 0 di quel documento.

## Obiettivo

Chiudere le nove zone del documento. Ogni voce finisce «fatto» o «bloccato da Roberto» con il motivo. L’app installata non deve vedere «Aggiornamento disponibile» per una build non provata.

## Versione

- Pubblicata, e quindi unica versione di `hosting/release.json`: `1.1.96`, url `https://groomlyapp.it/groomly.apk`.
- Pronta a fine giro, se i test sono verdi: `1.1.97` (`versionCode` 10197) in `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle` e `docs/play/release-1.1.97.json`.
- L’url del file pronto è `https://groomlyapp.it/groomly-1.1.97.apk`. Quel file non si carica in questo giro. `hosting/groomly.apk` non si sostituisce.
- Un test fallisce se la versione di `hosting/release.json` è maggiore dell’ultimo tag `gh release view --repo robmass83-ui/Groomly`.
- Nessuna release GitHub.

## Strumenti gratuiti

In Impostazioni, sezione «Strumenti», sempre visibile. Tre interruttori, spenti se il campo manca:

- `strumenti.messaggi` (F1)
- `strumenti.affidabilita` (F2)
- `strumenti.noteVocali` (F3)

Con F1 acceso, dalla scheda del cane e dall’appuntamento si apre un foglio con cinque testi precompilati e modificabili: promemoria, conferma, cane pronto, richiamo, auguri. Il link è `https://wa.me/<cifre>?text=...`. Le cifre escono da `normalizzaTelefono` (un cellulare italiano `333…` diventa `39333…`). Il testo e la firma usano `linguaClienti`, con ripiego italiano. Firma: «Fatto con Groomly», «Made with Groomly», «Hecho con Groomly».

Con F2 acceso, se negli ultimi sei mesi ci sono almeno tre «non venuto», si vede «Spesso non viene» (e la frase tradotta). Con F3 acceso, sui campi note c’è il microfono se `MediaRecorder` esiste; la registrazione si salva come nota vocale del cane o dell’appuntamento e si può riascoltare. Spento, il controllo non c’è.

Restano dietro `mostraPiani`: «Invia tutti», pagella e collage, prenotazioni nel menu del salone, lista d’attesa, recensioni, fedeltà, statistiche avanzate. I due flag restano false nel valore di default.

Con gli interruttori spenti, home, scheda e appuntamento non guadagnano pulsanti.

## Lingue

`src/lib/italianoSchermo.ts` giudica un testo visibile. Fallisce se, tolti i pezzi ammessi (Groomly, Privacy, DPA, WhatsApp, POS, nomi del seed), resta una parola dell’elenco italiano: Nessun, Proprietario, Torna, Salva, Annulla, Partita, IVA, cani, appuntamento, i mesi e i giorni in italiano.

Il giro Playwright sull’emulatore `demo-groomly` apre le route di `src/app/router.tsx` e i fogli principali (servizio, chiusura visita, attività, strumenti) con la lingua del telefono `en` e `es`. I dati del salone di prova non contano come italiano.

Le date visibili usano `meseAnno`, `dataBreve`, `dataCorta` e `meseCorto`. `earnings.ts` non stampa più un mese con `IT_DATE` quando la lingua non è l’italiano. Il confine della settimana (`weekStartsOn: 1`) e la chiave giorno non si spostano.

In Impostazioni il campo fiscale è facoltativo. Etichetta inglese: «VAT number». Etichetta spagnola: «NIF / CIF». In italiano resta «Partita IVA».

## Email di campione

Callable `inviaCampioneEmail`. Parte solo se `request.auth.token.email` è `ROBERTO_EMAIL`. Manda i dieci tipi di `TipoEmail` nelle tre lingue, solo a `info@groomlyapp.it`, con salone «Salone Demo» e nome «Luna». Senza `BREVO_API_KEY` non chiama Brevo e restituisce `{ spedite: 0, motivo: 'chiave assente' }`. Il pulsante è in Impostazioni → Info, solo se `isOperator`. Il lancio sul telefono vero e lo spegnimento dei template Brevo 3–12 sono di Roberto. Il template 5 resta acceso.

## Percorsi sull’emulatore

La pagina `hosting/salone` ha il modulo (nome, cellulare, email, inizio, fine, esca vuota) nelle tre lingue e chiama `inviaRichiesta`. Accetta, propone e rifiuta restano le callable già scritte. Il test controlla l’HTML con `emailMessaggio` nella lingua dei clienti, senza spedire a un indirizzo vero se la chiave manca.

Il seed crea un collaboratore con il piano del salone spento. Il giro vede la frase di accesso sospeso. Socio e collaboratore si aprono in inglese e in spagnolo. Solo `demo-groomly`.

## Primo dato

All’avvio si segna l’istante. Quando l’agenda ha il primo risultato, si salva la differenza in locale. Impostazioni → Info la mostra solo all’operatore. Si toglie un’attesa che non contribuisce a quel dato, e si scrivono i numeri dell’emulatore prima e dopo. La lettura sul telefono è di Roberto.

## Documenti e nido

Riga «Eseguito — vedi registro» in cima ai piani già fatti: lingue, piani completi, allineamento Laura, personale e chiusure, sync personale, notifiche, impostazioni chiare, interfaccia comoda, note appuntamento, cancellazione e note. Tabella di stato in cima ai due piani abbonamenti e controlli. `fix/groomly-fix-ux.md` in `docs/archive/` con la nota «assorbito dai piani successivi». `DA-FARE-ROBERTO.md` e `GROOMLY-COSA-RESTA.md` descrivono la 1.1.97 pronta e la 1.1.96 pubblicata.

`docs/archive/confronto-scheda-nido.html` mette affiancate la scheda 1.1.88 (`scheda-nido`) e quella di oggi, chiaro e scuro, stesso cane finto. Il ramo non si unisce.

## Fuori da questo giro

WhatsApp automatico e crediti. Play Billing scritto a mano. Foto su Storage. Accensione dei piani. Parere legale estero. Valute non euro, campi fiscali oltre l’etichetta facoltativa, altre lingue, traduzione dei testi scritti dal salone, selettore lingua nella schermata di accesso.

## Prova

Test prima della modifica. Un commit per task. `docs/PROGRESSO-PIANO.md` dopo ogni task. `npm test` e `npm run build` verdi prima di alzare la versione. Deploy di functions e hosting solo a quel punto, con `release.json` ancora a 1.1.96. Regole Firestore solo se il file cambia, e solo dopo l’emulatore.
