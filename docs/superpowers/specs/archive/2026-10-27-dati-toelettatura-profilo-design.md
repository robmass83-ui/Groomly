# Dati toelettatura nel profilo, nome unico sul listino, guida in Info

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Data: 2026-10-27. Decisioni prese in autonomia, come chiesto: si implementa questa spec senza un secondo giro di domande.

## Problema

I dati della toelettatura stanno in Impostazioni › Salone › Dati del salone (foglio «Attività»). In Gestisci account › Info personali ci sono solo nome del titolare, nome toelettatura, telefono, email e lingua. Lo stesso campo `business.name` è etichettato «Ragione sociale» nel foglio Attività e «Nome del titolare» nel profilo, quindi non si capisce che cosa si sta modificando.

Il listino e il PDF non leggono quel profilo. L’intestazione del foglio ha un titolo fisso `TOELETTATURA`, un nome, un indirizzo e un telefono propri (`priceSheet.intestazione`). In gestione listino quegli stessi campi si modificano di nuovo. Sul cartaceo e in anteprima a volte esce il nome della toelettatura, a volte la ragione sociale, a volte la parola «TOELETTATURA».

In Funzioni la riga «Promemoria e messaggi» apre una pagina che spiega soltanto dove si scrive al cliente su WhatsApp. Non è una funzione da accendere. Manca un posto unico che dica dove stanno le funzioni e come si usano.

## Decisioni

1. L’unico posto in cui si scrivono i dati della persona e della toelettatura è Gestisci account › Info personali (`/impostazioni/account?scheda=personali`). Si arriva dalla C in Impostazioni, dalla matita «Modifica attività», dal passo «Indirizzo e orari» e dall’avviso fiscale in home.
2. `business.name` resta la ragione sociale. Si aggiunge `business.titolare` (stringa, default vuoto) per il nome della persona. Nessuna copia automatica: chi aveva scritto in Attività tiene quel testo come ragione sociale. Il nome del titolare si compila nel profilo.
3. Il collaboratore apre Info personali (email, lingua, nome del titolare, telefono dell’account) e non vede né modifica il blocco Toelettatura, gli orari, la partita IVA o l’indirizzo del salone.
4. Link recensioni, pubblica pagina e tessera fedeltà non si spostano nel profilo. Restano in Controlli avanzati, dove si accendono già. Il foglio Attività li perde perché non sono anagrafica.
5. Logo, forma, colore e descrizione del listino restano in Gestione listino. Nome, indirizzo e telefono del foglio non si digitano più lì: si leggono dai dati della toelettatura.
6. Sul PDF, sul JPEG e sulla card del listino la parola grande sopra «LISTINO» è il nome della toelettatura (`salonName`). Se manca, la ragione sociale. Se mancano entrambe, il titolo già salvato nel foglio. Il nome a destra, l’indirizzo e il telefono sono gli stessi dati. La descrizione («Servizio di toelettatura») resta quella del foglio.
7. «Promemoria e messaggi» esce da Funzioni. Il testo di WhatsApp e una guida breve «Come si usa» stanno in Info su Groomly. `/impostazioni/messaggi` reindirizza a `/impostazioni/info`.
8. I fogli in cui si compilano questi dati restano il `Dialog` già centrato (`align-items: center`). Non si usa `Sheet` e non si ridisegna il resto dell’app. I campi restano gli `Input` `md` (altezza 44, etichetta 12). Niente chip al posto dei campi, niente altezza `lg`, niente popup dal basso.

## Da → a

| Oggi | Dove finisce |
| --- | --- |
| Foglio Attività: ragione sociale, partita IVA, nome toelettatura, codice fiscale, telefono, indirizzo | Info personali › Toelettatura, un solo dialogo centrato |
| Orari dentro lo stesso foglio | Riga «Orari di apertura» che apre un secondo dialogo centrato, solo gli orari |
| Recensioni, pubblica pagina, tessera dentro Attività | Solo Controlli avanzati, come già oggi |
| Riga Salone › Dati del salone | Esce. Restano Collaboratori, Listino, Servizi, Archivio |
| Matita «Modifica attività» e passo Indirizzo e orari | Aprono Info personali con il dialogo Toelettatura |
| Intestazione Impostazioni (nome, ragione sociale, Copia partita IVA) | Resta un riepilogo. Non è un secondo editor |
| Info personali: nome titolare = `business.name`, nome toelettatura, telefono | Persona: titolare = `business.titolare`, email, lingua, logo. Sotto, Toelettatura, compreso il telefono del salone |
| Gestione listino: Nome salone, Indirizzo, Telefono editabili | Tre righe in sola lettura e un link a Info personali. Descrizione, logo, forma e colore restano editabili |
| Titolo PDF `TOELETTATURA` | Nome della toelettatura. «LISTINO» non cambia |
| Funzioni › Promemoria e messaggi | Esce. Guida in Info su Groomly |

## Info personali

Due blocchi, uno sotto l’altro, sulla scheda già esistente.

**Persona.** Logo (la matita va ancora a Gestione listino), nome del titolare, email, lingua. Titolare, e solo quello tra i dati anagrafici, apre il dialogo centrato piccolo che c’è già: un campo e Salva. Il telefono di recupero resta in Sicurezza. Il telefono del salone non sta in questo blocco.

**Toelettatura.** Visibile solo se il ruolo non è collaboratore. Righe compatte (altezza minima 52, come le altre) con il valore sotto l’etichetta: ragione sociale, partita IVA, codice fiscale, nome toelettatura, telefono, indirizzo. Ogni riga apre lo stesso dialogo centrato intitolato «Toelettatura». Non c’è un secondo pulsante «Modifica». Dentro, in colonna singola, senza griglia a due colonne:

1. Ragione sociale
2. Nome toelettatura
3. Partita IVA
4. Codice fiscale
5. Telefono
6. Indirizzo
7. L’aiuto già esistente: basta la partita IVA oppure il codice fiscale
8. Salva

Validazione invariata: `vatError`, `taxCodeError`, `normalizeVat`, `normalizeTaxCode`. Errore sotto il campo. Se il salvataggio fallisce, il toast `authSalvataggio` e il dialogo resta aperto. Se riesce, il dialogo si chiude. Gli orari non stanno in questo dialogo: una riga «Orari di apertura» apre un secondo `Dialog` centrato con `OrariEditor` e nient’altro. Gli orari si scrivono subito, come oggi, a ogni modifica.

`?modifica=toelettatura` apre quel dialogo una volta e poi la query si toglie, così tornando indietro non si riapre. Il collaboratore ignora il parametro.

Il nome grande sotto la C in Impostazioni e in Home account resta `salonName`, poi ragione sociale, poi email.

## Listino e PDF

Funzione pura `conIntestazioneSalone(sheet, business)` in `src/lib/intestazioneSalone.ts`:

- `titolo` e `nome` = `salonName` trim, altrimenti `name` trim, altrimenti il valore già nel foglio
- `indirizzo` = `business.address` trim, altrimenti quello del foglio
- `telefono` = `business.phone` trim, altrimenti quello del foglio
- logo, forma, colore, descrizione e `sottotitolo` (`LISTINO`) non si toccano

La usano la card in Listino, l’anteprima e l’export in Stampa e condividi (anche il nome file), e il blocco in sola lettura in Gestione listino. Quando si salvano i dati toelettatura si riscrive anche `priceSheet.intestazione` con la stessa funzione, se il foglio c’è ed è valido, così la copia salvata non resta indietro. La resa non dipende da quella scrittura: passa sempre dalla funzione.

In Gestione listino la frase «Nome, indirizzo e telefono partono da Impostazioni › Attività» diventa «Nome, indirizzo e telefono partono da Gestisci account › Info personali.» Il link della frase porta lì.

## Impostazioni

Si toglie il dialogo Attività e lo stato che lo tiene aperto. La riga Dati del salone si toglie. Se `location.state.openBusiness` è vero, si va a `/impostazioni/account?scheda=personali&modifica=toelettatura` e lo state si pulisce, una volta sola. Stesso indirizzo per la matita e per il passo sede. Il riepilogo in testata (nome toelettatura, ragione sociale, partita IVA, Copia) resta.

## Info su Groomly

Sotto la card di versione, contatto e sito, una sezione «Come si usa». Sette righe corte, titolo più una riga di dettaglio, niente pagina nuova:

| Titolo | Dettaglio |
| --- | --- |
| Animali | Il messaggio si scrive dalla scheda del cane, sul pulsante WhatsApp. Scrivi al cliente da WhatsApp. |
| Agenda | Gli appuntamenti del giorno stanno in Agenda. |
| Listino | Prezzi, stampa e condividi. In alto sul foglio c’è il nome della toelettatura, poi Listino. |
| Dati | Ragione sociale, partita IVA, nome e indirizzo si modificano in Gestisci account › Info personali. |
| Incassi | Incassi e report stanno nella scorciatoia in Impostazioni. |
| Backup | La copia del salone sta in Funzioni › Backup e ripristino. |
| Avvisi | La campanella in Impostazioni elenca gli avvisi. Le notifiche stanno in App › Notifiche. |

Le tre lingue hanno le stesse chiavi. La riga Funzioni › Promemoria e messaggi si elimina, anche per il titolare. `/impostazioni/messaggi` fa `<Navigate to="/impostazioni/info" replace />`. I quattro collegamenti Pro che puntavano a quella pagina (`promemoriaAuto`, `pronto`, `richiamo`, `compleanno`) puntano a `/impostazioni/info`. `MessaggiPage` si elimina.

## Cosa non cambia

Colori, navigazione in basso, tab dell’account, Sicurezza, Privacy, backup, servizi, archivio, logo del listino, descrizione, colore del foglio, «LISTINO» come sottotitolo, seed `TOELETTATURA` come titolo di riserva quando non c’è ancora un nome, export incassi che usa la ragione sociale nel nome file.

## Verifica

- Un test di `conIntestazioneSalone`: con nome toelettatura il titolo e il nome del foglio diventano quello; senza, la ragione sociale; indirizzo e telefono vuoti nel profilo lasciano quelli del foglio; la descrizione non cambia.
- I test che oggi aprono il dialogo Attività da Impostazioni compilano e salvano dal dialogo Toelettatura in Info personali (partita IVA, codice fiscale, errore, maiuscolo, riepilogo). In Impostazioni non c’è più il dialogo Attività né la riga Dati del salone. La matita porta al dialogo nel profilo.
- `openBusiness` dalla home apre il dialogo una volta sola.
- Il collaboratore non vede Toelettatura in Info personali né la matita.
- Un test del foglio: con `salonName` Canespa il titolo grande non è `TOELETTATURA`.
- Info su Groomly mostra «Come si usa» e la frase del WhatsApp. Impostazioni non ha «Promemoria e messaggi». La route vecchia arriva a Info su Groomly.
