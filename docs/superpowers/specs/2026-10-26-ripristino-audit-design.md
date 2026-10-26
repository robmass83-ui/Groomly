# Ripristino dopo l’audit 360

26 ottobre 2026. La specifica precedente descriveva l’inventario. Questa descrive la riparazione. L’inventario resta in `docs/Groomly_Audit360_2026-10-26.md`. Le decisioni qui sotto sono quelle da implementare: dove c’era una scelta, è già stata fatta.

WhatsApp automatico non si implementa. La riga resta, con la scritta «Da sviluppare» e senza interruttore.

## Radici verificate sul codice

1. `PaywallSheet` è un `div` senza `position: fixed`, disegnato fuori dal guscio. In più `usePiano` lo tiene chiuso quando `abbonamentiAttivi` è vero. Il tocco su «Prova Pro» o su una riga bloccata non mostra nulla. Il `role="dialog"` resta nel documento: `SystemBack` sceglie `dismiss`, `dismissTopOverlay` non trova `aria-label` Chiudi, e il gesto indietro non fa nulla.
2. `MessaggiPage`, `PianoPage` e `PrivacyPage` sono un `h1` senza `ShellFrame` e senza Indietro. Se il WebView non ha storia, `systemBackChoice` restituisce `exit`.
3. Una riga Pro inclusa nel piano apre un dialogo che dice solo «inclusa». Non porta alla funzione.
4. `DriveAuthPlugin.collega` e `leggi`, se Google ha già un token, segnano collegato senza chiedere. `driveScollegato` è un booleano unico del telefono. Scollega è un pulsante a tutta larghezza.
5. Il foglio backup, la gestione listino, la pagina Pro, Utenti e alcuni toast hanno stringhe italiane scritte nel sorgente. `formatPriceApp` viene chiamato senza lingua, quindi «su valutazione» resta italiano. I nomi del listino di serie («Taglia piccola», «Bagno + tosatura», …) non passano da `nomeVoceListino`.
6. Suggerimenti è una guida. Non c’è modulo, né documento, né mail.
7. Home passa `richieste={[]}` e `posti={0}` anche se `salons/{id}/richieste` esiste. Le copie cloud hanno `bucket` nullo e `eseguiCopie` non scrive. Queste due non si fingono funzionanti.

## Foglio Pro

`PaywallSheet` usa `Dialog`. Il foglio copre lo schermo, ha Chiudi con `aria-label`, il tasto indietro del telefono lo chiude.

Si apre ogni volta che `paywall` è valorizzato, anche se gli abbonamenti Play non sono in vendita. Testo: «Abbonamenti in arrivo» e «I prezzi arriveranno con Google Play.» Pulsanti: Avvisami (scrive l’interesse, poi chiude) e, se la prova non è stata usata, «Prova Pro gratis per 30 giorni». Quel pulsante chiama `callAvviaProva`. Se la chiamata fallisce, il foglio resta aperto e mostra l’errore di salvataggio. Non si chiude nel nulla.

## Indietro

`systemBackChoice`, quando non c’è un foglio aperto e `canGoBack` è falso:

- `/impostazioni/...` torna a `/impostazioni`
- `/incassi/...` torna a `/incassi`
- le pagine listino e la scheda cane restano come oggi

`/impostazioni/messaggi`, `/impostazioni/piano` e `/impostazioni/privacy` usano `ShellFrame` e `Header` con `backTo="/impostazioni"`.

Messaggi spiega che il testo si manda dalla scheda del cane e che l’invio automatico è ancora «Da sviluppare», con un link ad Animali. Il piano mostra se è base o attivo e, in base, il pulsante della prova. Privacy tiene il testo che ha già.

## Righe Pro

Se la funzione non è inclusa, si apre il foglio Pro.

Se è inclusa:

- Promemoria, Cane pronto, Richiamo, Auguri aprono `/impostazioni/messaggi`
- Statistiche apre `/incassi/statistiche`
- Copie delle foto apre Impostazioni con il foglio backup (`state.openBackup`)
- Tessera fedeltà apre un dialogo con l’interruttore già salvato in `settings.fedeltaAccesa`
- Recensione Google apre un dialogo con il campo `linkRecensioni`, salvato nelle impostazioni
- Prenotazioni online apre un dialogo con il pulsante che chiama `callPubblicaSalone`
- Pagella, Lista d’attesa ed Email aprono un dialogo che dice che la parte automatica non è ancora pronta. Non mostrano un numero di posti finto e non dicono solo «inclusa».

Home, quando le prenotazioni sono visibili e Firebase risponde, legge `salons/{salonId}/richieste` con `status == nuova` e le passa al riquadro. Accetta chiama `gestisciPrenotazione` con il token del documento e l’azione `accettata`. Se la lettura fallisce, il riquadro dice che non ci sono richieste. La lista d’attesa non mostra più «0» come se fosse un conteggio vero: senza una fonte, il riquadro non inventa i posti.

In fondo a Strumenti c’è spazio abbastanza per far scorrere l’ultima riga sopra il pulsante +.

## Google Drive

Il consenso è l’uid del salone (`driveConsensoUid`), non un booleano del telefono.

- `leggi({ uid })` è collegato solo se c’è un token e `driveConsensoUid` è quell’uid.
- `collega({ uid })` apre la scelta Google se serve un consenso nuovo. Se il token c’è già, risponde `{ collegato: false, proposto: true, email }` e non scrive l’uid.
- L’interfaccia, in quel caso, chiede «Usare {email} anche per questo salone?» con Collega e Non ora. Collega chiama `conferma({ uid })`, che scrive l’uid.
- `scollega` cancella il token e svuota `driveConsensoUid`.
- Sulla riga collegata del foglio backup, il testo sta a sinistra e Scollega sta a destra, sulla stessa riga. L’email sul rigo Backup di Impostazioni resta quella già letta dai test (`overflow-wrap`), una sola volta.

## Lingua

Le stringhe fisse del foglio backup, della gestione listino, del ruolo in pagina Pro, di Utenti, dei toast di export, dell’avviso di aggiornamento e del toast «salvataggio non riuscito» passano dal catalogo `it` / `en` / `es`, con le stesse chiavi.

`formatPriceApp(item, lingua)` e `nomeVoceListino(lingua, nome)` sono usati dalle righe del listino. `nomeVoceListino` traduce i nomi del listino di serie (taglie, bagno + tosatura, servizi extra, titoli di sezione). Un nome che il salone ha riscritto e che non è nel catalogo resta com’è.

## Suggerimenti

Sei categorie, una obbligatoria: bug, critica, miglioramento, funzione che manca, testo o lingua, altro. Testo da 10 a 2000 caratteri.

Invio crea `suggerimenti/{id}` con uid, salonId, email, categoria, testo, lingua, versione, data. Il client può solo creare. Legge solo l’operatore. Update e delete sono negati. Una funzione `onDocumentCreated` manda la nota a `info@groomlyapp.it`. Se Brevo fallisce, il documento resta e il salone ha già visto il grazie, perché il grazie compare dopo la creazione, non dopo la mail.

Testo del grazie: «Grazie. La nota è arrivata. Bug, critiche e idee nuove sono benvenuti: li leggiamo uno per uno, per fare un Groomly più utile a ogni toelettatura.»

La guida e le novità restano sotto il modulo. In Utenti, solo per l’operatore, compare l’elenco. Senza rete l’invio fallisce e il grazie non appare.

## Sicurezza

Nessuna regola allarga la lettura dei cani. `suggerimenti` non è leggibile dal salone che l’ha scritto, né da un altro salone. Il token Drive di un uid non collega un uid diverso.
