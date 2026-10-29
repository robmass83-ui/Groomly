# Lingua del telefono e lingua del messaggio

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

## Scelta

Nei settaggi resta solo la lingua di Groomly. Si propone da sola in base al fuso del telefono, che segue il luogo quando l’ora è automatica: Italia in italiano, Inghilterra in inglese, Spagna in spagnolo. Non si chiede il GPS.

La lingua del cliente non sta più nei settaggi, né per l’account gratis né per il Pro. Si sceglie nel popup centrale quando si scrive un WhatsApp precompilato, e nella stampa del listino. Un salone in Italia può mandare l’inglese a un turista senza cambiare la lingua dell’app.

Una lingua scelta a mano resta salvata. Un viaggio non la cambia da solo.

## Lingua di Groomly

`leggiLinguaSalvata()` vince sempre.

Se non c’è una scelta, `linguaDalLuogo(fuso)` legge `Intl.DateTimeFormat().resolvedOptions().timeZone`:

- `Europe/Rome` → `it`
- `Europe/London` → `en`
- `Europe/Madrid`, `Atlantic/Canary`, `Africa/Ceuta` → `es`

Gli altri fusi cadono su `linguaDelTelefono` (`it`, `en`, `es`; il resto in inglese). Il fuso di test `Africa/Cairo` e `UTC` restano sulla lingua del browser, che la suite fissa su `it-IT`.

Il popup «Lingua» è quello centrale già usato (`Dialog`). Contiene una frase sul luogo e una sola lista: Italiano, English, Español. Niente «Lingua dei clienti». Titolare, socio e collaboratore vedono la stessa cosa. `settings.linguaClienti` non si scrive più. Il campo può restare nei dati vecchi e non comanda più nulla.

## Messaggio WhatsApp

`PulsanteMessaggi` apre un `Dialog` centrale, non un foglio dal basso. Dentro, in ordine:

1. Tre tasti uguali, radiogruppo «Lingua del messaggio»: Italiano, English, Español. Altezza almeno 48. Il selezionato usa `--pri`, `--pri-s` e l’icona Check.
2. Una frase: un turista può ricevere un’altra lingua.
3. I cinque modelli (promemoria, conferma, pronto, richiamo, auguri) come radio, altezza almeno 44.
4. Area di testo con etichetta.
5. «Apri WhatsApp» come link a tutta larghezza, stile del bottone primario (`--pri-solid`, `--on-pri`), almeno 48 di altezza.

La lingua iniziale è quella ricordata per quel numero (`groomly.linguaMessaggio.` più sole cifre). Se non c’è, è la lingua dell’app, non `linguaClienti` e non un italiano fisso. Cambiare lingua riscrive il modello, anche se il testo era stato modificato, e la ricorda per quel numero. Vale per chiunque invii il messaggio.

## Listino stampato

Sulla pagina di stampa, una riga «Lingua del listino» apre lo stesso tipo di popup centrale. La scelta si salva in `opzioni.lingua`, campo facoltativo nello schema, così i listini già salvati restano validi. Se manca, si usa `linguaClienti` vecchia e poi la lingua dell’app. Le etichette del foglio (taglie, «da», titolo) seguono quella lingua.

## Fuori scope

WhatsApp automatico resta «Da sviluppare». Nessun permesso di posizione. Nessun cambio di firma dell’APK in questo disegno.
