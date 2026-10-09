# Groomly — Specifica finale

Data: 2026-10-09
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md`.
Riferimento visivo: `groomly-design.html`.
Dove il mockup disegna la schermata, l’app la riproduce (misure, colori, densità, icone). Dove il mockup non disegna settimana, mese e promemoria mensili, vale il §8 e il §9 di `GROOMLY.md` insieme alle decisioni di questo documento.

I cicli 1–6 sono su `master` e non si rifanno. Questo documento chiude ciò che quei cicli avevano lasciato fuori, allinea le schermate al mockup e porta l’app fino all’APK. I loro piani e le loro specifiche stanno in `docs/superpowers/plans/archive/` e `docs/superpowers/specs/archive/`.

## 1. Scopo

La toelettatrice usa l’app sul telefono, in italiano, a 360–390 px, senza scroll orizzontale, in chiaro e in scuro.

Ogni schermata del mockup (01–09) arriva completa, aspetto e comportamento insieme. I dati restano sul dispositivo fino a Firebase. Firebase è il penultimo passo e non ridisegna le pagine. Capacitor è l’ultimo e produce l’APK, con fotocamera e notifica locale dei mensili.

## 2. Già fatto

Restano com’è, salvo dove una sezione sotto descrive la stessa schermata:

- Login locale, tema chiaro / scuro / auto, token, font Inter, `sizes.ts`, icone del kit, servizi di default.
- Cani: lista, ricerca, tab, scheda breve, foto profilo, archivio e ripristino.
- Appuntamenti: creazione, modifica, cancellazione, giorno in Home e Calendario, sovrapposizione non bloccante, chip +2 / +4 / +6 dalla scheda, stato `programmato` | `completato`.
- Mensili: liste e banner calcolati con la regola di oggi (un mensile senza prossimo è da fissare).
- Listino: tabella dei servizi attivi.
- Impostazioni: tema e servizi. Esci toglie solo `groomly.session`.

`findCorruptGroomlyKey` non cambia. Un JSON illeggibile resta «Dati locali illeggibili» e il valore non si cancella. Nessuna chiave `localStorage` nuova: i campi nuovi stanno nei documenti già usati (cane, appuntamento, impostazioni).

## 3. Ordine

Il guscio comune si sistema una volta. Poi una schermata finita per fase. Le pagine si aggiornano sul posto. I hook restano l’interfaccia delle pagine.

1. Guscio
2. Home
3. Animali
4. Scheda cane
5. Appuntamento (foglio nuovo e foglio dettaglio)
6. Calendario
7. Mensili
8. Listino file
9. Impostazioni e backup sul dispositivo
10. Firebase
11. Capacitor

L’appuntamento viene prima del calendario, così la griglia apre già il foglio definitivo.

Ogni fase si chiude con i test di quella schermata e un controllo a 360 px in chiaro e in scuro. I test di `App` hanno `// @vitest-environment happy-dom` come prima riga. Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`. Non si alza Vitest. In PowerShell non si usa `&&`.

## 4. Guscio

Si aggiunge `--shadow` in chiaro e in scuro. Lo stile resta su token e `sizes.ts`.

`Chip` ha i toni neutro, bravo, agitato, mordace, anziano, mensile, primario, contorno e selezionato. Resta largo quanto il testo.

`FlagIcon` disegna Anziano e Mensile. Accanto al nome l’ordine è carattere, poi anziano, poi mensile. Misure: 25 px in lista, 23 in griglia, 18 in calendario.

`ServiceIcon` entra nei chip servizio a 13 px. Se i chip non stanno sulla riga, si tagliano e compare `+N`.

`DogAvatar` ha la misura griglia, 52 px, raggio 14. Le altre restano 28, 36, 46 e 84.

Le liste sono una `Card` di `Row`. La prima riga non ha bordo sopra. `AppointmentRow` riceve `onOpen`. Finché la Home non è fatta, il tocco apre ancora il dettaglio.

`SectionTitle` può avere un’icona a sinistra e un link a destra. `IconButton` è il quadrato da 30 px. `SearchBar` è finta in Home (il tocco porta ad Animali) e vera in Animali.

La voce attiva della barra è `--pri`. Il + resta 42 px, raggio 14, con l’ombra. Il foglio ha due righe con icona: «Nuovo appuntamento» e «Nuovo cane».

Gli stati vuoti sono una riga in `--tx3`. Il toast resta in basso, sfondo `--tx`, testo `--card`.

In questa fase non si aggiungono rotte. Il campanello, i riquadri e «Visti di recente» arrivano con la Home.

## 5. Durate e età

La durata compatta è `45m` sotto l’ora, `2h` sull’ora, `1h05` e `7h15` se ci sono ore e minuti (i minuti su due cifre).

L’età in anni è l’anno corrente meno `birthYear`: «1 anno», «4 anni». Senza anno di nascita si usa la categoria già salvata («Adulto»).

Soglie, salvate nelle impostazioni e non modificabili da una riga: cucciolo sotto 1, giovane sotto 3, adulto sotto 8, anziano da 8. Se manca `isSenior`, l’anziano vale quanto la categoria «anziano». Un anno di nascita nuovo ricalcola la categoria e riallinea la spunta.

Il proprietario in lista è l’iniziale del primo nome e l’ultimo cognome: «Maria Pinna» e «Maria Luisa Pinna» diventano «M. Pinna». Un nome solo resta intero.

## 6. Home

Logo zampa su sfondo da `--pri` a `--tea`, titolo «Groomly», data già in uso («Giovedì 1 ottobre»). Campanello e ingranaggio a destra. Il pallino rosso c’è se almeno un mensile è nel gruppo «in arrivo» del §11. Il tocco sul campanello apre `/mensili`. L’ingranaggio apre Impostazioni. La ricerca finta dice «Cerca cane, proprietario, razza…» e porta ad Animali con il campo pronto.

Il banner compare solo per quel gruppo. Sfondo `--warn-s`, icona Mensile, «N mensili da programmare», al massimo tre nomi, «scadono entro N gg» con N preso dal preavviso (7 finché le Impostazioni non lo cambiano). **Vedi** apre `/mensili`.

I tre riquadri stanno sempre.

- **Oggi:** numero di appuntamenti di oggi, completati compresi, e la somma delle durate. Il tocco apre il calendario di oggi.
- **Mensili:** fissati/totali del mese corrente (§11) e il mese abbreviato («Mensili ott.»). Il tocco apre `/mensili`.
- **Listino:** titolo «Listino». Sottotitolo «PDF · apri» se un file è salvato, altrimenti «Apri». Il tocco apre sempre `/listino`.

**Oggi** ha il link «Calendario ›» verso il giorno corrente. Le righe stanno in una card: ora, durata, miniatura 28 px, nome, chip servizio con icona e `+N`, a destra carattere, anziano e mensile. Il tocco apre la scheda del cane. Senza appuntamenti la card dice «Nessun appuntamento». Senza cane la riga dice «Cane assente» e il tocco non naviga. Un completato di oggi resta in elenco.

**Visti di recente** mostra al massimo 8 cani attivi, griglia a 4 colonne, miniatura 52 px, nome sotto, icona carattere sull’angolo. L’ordine è l’ultimo aperto per primo. Aprire una scheda mette quel cane in cima a `recentDogIds` nelle impostazioni. Un archiviato esce dalla griglia. «Tutti N ›» usa il numero degli attivi e apre `/animali`. Se non c’è nessuno, la sezione non si disegna.

## 7. Animali

Titolo «Animali», sottotitolo «N attivi · N in archivio». Il filtro e **Aggiungi** (icona +) stanno a destra. **Aggiungi** apre `/animali/nuovo`. Il campo dice «Nome, proprietario o razza» e filtra sulla `searchKey` mentre si scrive.

I tab sono una riga sottolineata: **Attivi**, **Mensili**, **Occasionali**, **Archivio**, ciascuno col numero. Archivio ha l’icona. I chip stanno su una riga sola, senza andare a capo: **Tutti**, **Mordaci**, **Anziani**, **In agenda**, **Gatti**. Quello scelto è pieno `--pri`. **In agenda** tiene i cani che hanno un prossimo: inizio da adesso in poi e stato diverso da completato.

Il filtro apre il foglio **Ordina**: **Alfabetico** (default: nome italiano, poi id) e **Per prossimo appuntamento** (prima chi ha un prossimo, dal più vicino; gli altri in alfabeto). La scelta dura finché la pagina è aperta.

La riga, in una card: miniatura 36 px, nome, chip Mensile e Anziano solo se servono, icona carattere, chevron. Sottotitolo `razza · età · proprietario` come nel §5. Terza riga:

- prossimo oggi → «Oggi 08:30»;
- prossimo in un altro giorno → «Mar 6 ott 10:00»;
- il cane è nel gruppo «in arrivo» del §11 → «Da fissare · ultimo 3 set» in `--warn`; senza un completato, «Da fissare»;
- altrimenti → «Nessun appuntamento» in `--tx3`.

In archivio il nome è `--tx3` e la terza riga è «Non più in cura» o «Deceduto». **Ripristina** sta sulla riga. Il resto della riga apre la scheda. Lista vuota: «Nessun cane».

## 8. Scheda cane

### Dati

Un campo assente si legge vuoto. Se manca l’elenco contatti, si ricostruisce dal proprietario e dal telefono già salvati. Al salvataggio si scrivono i contatti e si aggiorna anche quel contatto singolo. La `searchKey` include tutti i nomi.

Campi aggiunti: `birthYear`, `isSenior`, `weightKg`, `tags`, `servicePrices` (prezzo e durata per servizio), `hiddenServiceIds`, `customFields`, `gallery` (id, JPEG compresso, `takenAt`), `recurrenceWeeks` (4 se manca, per i mensili), `contacts` (`id`, nome, ruolo, telefono, `isPrimary`).

### Testata e metà alta

Indietro torna ad Animali e abbandona le modifiche non salvate, senza conferma. Titolo «Scheda». Il telefono chiama il contatto principale con `tel:`; senza numero il pulsante non fa nulla. Il menu ⋮ ha «Non più in cura», «Deceduto» ed «Elimina definitivamente».

Archiviare, se ci sono appuntamenti programmati da adesso in poi, chiede **Archivia e cancella i futuri** oppure **Archivia soltanto**. I completati restano. Eliminare chiede conferma e toglie solo il cane: gli appuntamenti restano e in lista dicono «Cane assente».

Foto 84 px: senza foto il tocco ne sceglie una; con foto il foglio offre **Cambia** e **Ingrandisci**. Poi nome, `razza · sesso · età`, proprietario, chip carattere, anziano e mensile.

L’avviso critico, se c’è, è il riquadro rosso subito sotto, visibile senza scorrere. La prima frase è il titolo, il resto la riga sotto. Senza un punto, tutto il testo è il titolo.

Il riquadro del prossimo usa la regola già in uso. Con un appuntamento: «Prossimo: oggi 09:30», i servizi e la durata stimata. Senza: «Nessun appuntamento». **Successivo +** apre il foglio nuovo con il cane, i servizi del prossimo (o dell’ultimo, se un prossimo non c’è) e data e ora a quattro settimane, modificabili prima di salvare. I chip **+2 sett**, **+4 sett** e **+6 sett** salvano subito, con il toast e **Annulla** già in uso. **Data…** apre il foglio con il solo cane già scelto.

**Servizi e prezzi** elenca i servizi attivi non nascosti, con icona, durata e prezzo della taglia. Un valore in `servicePrices` vince sul listino. In lettura il prezzo è un tassello. In modifica si può cambiare, si può nascondere la riga e **+ Servizio** la rimette dal catalogo. Si salva solo lo scostamento e l’elenco dei nascosti.

In basso, sempre: **Modifica** (contorno) e **Salva** (primario). In lettura i campi sono fermi. **Salva** scrive, esce dalla modifica e mostra «Salvato». Obbligatori: nome e un contatto con telefono. Il cane nuovo è la stessa scheda già in modifica, con taglia piccola, carattere bravo e cliente occasionale.

### Metà bassa

Il carattere è uno, con le tre icone. I tag sono chip. **+ Tag** propone i tag già usati e, se c’è, l’elenco delle Impostazioni. In modifica un tag si toglie toccandolo. Passando ad anziano la spunta si accende e si può spegnere.

Griglia a due colonne: Specie, Razza, Sesso, Età («2014 · Anziano»), Peso («6,5 kg», oppure «—»), Taglia, Cliente, Durata media. La durata media è la media di `actualDurationMin` degli ultimi 5 completati; se quel dato manca, la durata prevista degli stessi 5; se non ci sono trattamenti, «—».

**Campi** aggiunge un campo di quel cane (etichetta e valore). La matita su un’etichetta della griglia la rinomina per tutto l’account, in `fieldLabels`. I nomi di partenza sono Specie, Razza, Sesso, Età, Peso, Taglia, Cliente, Durata media.

Ogni contatto ha nome, chip del ruolo, telefono e chiamata. Il principale ha il chip primario. **+ Contatto** chiede nome, ruolo e telefono. Ruoli suggeriti: Proprietaria, Co-proprietario, Figlia, più quelli già scritti.

Note vuote: la card dice «Nessuna nota».

Lo storico sono i completati di quel cane, dal più recente. Se ne vedono tre; **Tutti N** apre gli altri sulla stessa pagina. A sinistra giorno e mese, poi i servizi, a destra il prezzo (somma delle righe, oppure il totale salvato se c’è). La matita, in modifica, corregge quel prezzo: con un solo servizio aggiorna la riga; con più servizi salva `total` sull’appuntamento. Poi **Solo questo appuntamento**. **Aggiorna anche il prezzo in scheda** compare solo con un servizio e copia il prezzo lì. Strumenti, prodotti, stile, durata reale e miniature Prima/Dopo si disegnano quando l’appuntamento li ha. Senza trattamenti: «Nessun trattamento».

Galleria: miniature 50 px, al massimo quattro, poi «+N». Il tocco ingrandisce. **Aggiungi** scatta o sceglie e comprime come la foto profilo. In modifica una foto si può togliere.

In fondo, «Segna come non più in cura / deceduto → archivio» apre la stessa scelta del menu. Su un cane archiviato la riga è **Ripristina**.

## 9. Appuntamento

Le rotte restano `/appuntamenti/nuovo` e `/appuntamenti/:id`. Si disegnano come foglio dal basso, sopra il calendario del giorno. La chiusura usa il ritorno già in uso: `da=mensili` torna ai mensili, un cane presente torna alla scheda, un giorno valido torna al calendario, altrimenti alla Home.

### Nuovo

La ricerca aspetta 120 ms. Prima i nomi che iniziano col testo, poi quelli che lo contengono, poi proprietario e razza. Al massimo 6 cani attivi. Il pezzo cercato nel nome è evidenziato in `--pri`. L’ultima riga, **+ Nuovo cane**, apre la scheda in modifica col nome compilato e, al salvataggio, torna qui con quel cane. Senza telefono il cane non si crea.

I chip servizio mostrano icona e durata. Quelli dell’ultimo appuntamento del cane partono accesi. Prezzo e durata vengono dalla scheda, altrimenti dal listino della taglia. Data e ora mostrano la fine, «09:00 → 10:15». La fine è l’inizio più la somma delle durate; i minuti si arrotondano al multiplo di 5 più vicino e il mezzo va al multiplo superiore.

Il riquadro dice «Durata stimata», il prezzo «da scheda» e la durata in evidenza. Se l’orario si accavalla, resta «Si sovrappone a …» e **Salva appuntamento** scrive lo stesso.

**Ripeti · cliente mensile** è acceso se il cane è mensile. La riga dice «ogni N settimane · prossimo {data}». N parte da `recurrenceWeeks` o da 4 e si può cambiare. Se al salvataggio è acceso, il cane diventa mensile, tiene quel N e l’appuntamento riceve un `seriesId`. Si crea solo questo appuntamento. I chip +2 / +4 / +6 copiano lo stesso `seriesId`. Se è spento, il tipo cliente non cambia e `seriesId` non c’è.

### Dettaglio

Foto, nome, carattere e flag, «Gio 1 ott · 09:30–11:00 · G. Serra», **Scheda**. L’avviso critico sta subito sotto, se c’è. Poi i servizi col prezzo e la riga **Totale**. Con un solo servizio il totale aggiorna quella riga; con più servizi si salva `total`. Toccare la card dei servizi la rende editabile con gli stessi chip del nuovo.

**Strumenti**, **Prodotti** e **Stile** sono chip. Invio o virgola aggiunge un chip. I suggerimenti arrivano dalle Impostazioni; se l’elenco manca, si propongono i valori già usati e le etichette del kit (tosatrice, shampoo, profumo). **Foto lavoro** ha Prima, Dopo e **Aggiungi**. Se i due slot sono pieni, Aggiungi ne mette un’altra, di tipo «altro». Le foto si comprimono come la foto profilo.

**Anticipa** toglie 15 minuti, **Posticipa** ne aggiunge 15, anche più volte. Il toast è «Spostato alle HH:mm», con **Annulla** che rimette l’orario di prima. **Sposta** apre data e ora. **Cancella** chiede conferma nel foglio e toglie l’appuntamento. Non esiste lo stato «cancellato».

**Completato · fissa il prossimo** segna completato, tiene prezzo e righe, e scrive la durata stimata in `actualDurationMin`. Sul foglio quella durata si può correggere. Poi compaiono **+2 sett**, **+4 sett** e **+6 sett**, con «Fissato per …» e **Annulla** che toglie solo il nuovo. Un completato resta completato anche se si correggono prezzo, orario o servizi. Scrittura fallita: «Salvataggio non riuscito» e il foglio non cambia.

Campi aggiunti sull’appuntamento, assenti in lettura se non ci sono: `end`, `total`, `tools`, `products`, `cutStyle`, `actualDurationMin`, `photos` (`prima` | `dopo` | `altro`), `seriesId`. `dogSnapshot` non si duplica: nome, foto, carattere e avviso si leggono dal cane. Se il cane manca, si usa «Cane assente».

## 10. Calendario

Il giorno scelto resta in `?data=`. La vista sta in `?vista=` (`giorno`, `settimana`, `mese`). Se manca, è il giorno.

Frecce e titolo «Ottobre 2026». Le frecce cambiano mese. **Giorno / Settimana / Mese** e **Oggi**: Oggi seleziona oggi e non cambia la vista. La striscia va da lunedì a domenica della settimana che contiene il giorno selezionato: nome, numero, fino a tre pallini. Il giorno selezionato è pieno `--pri`. In vista settimana la striscia è la settimana visibile.

Il riepilogo conta i cani distinti, le ore stimate e, solo se almeno uno è mordace, «N mordace»: «5 cani · 7h15 stimate · 1 mordace». Giorno: il giorno selezionato. Settimana: i sette giorni. Mese: il mese visibile. Vuoto: «0 cani · 0m stimate».

**Giorno.** Griglia 08–19, 44 px per ora. Se il giorno è oggi e l’ora corrente è in fascia, una linea rossa segna adesso. Un solo colore per blocco, in ordine: cliente mensile `--warn`; altrimenti Bagno + taglio `--sen`; altrimenti Antiparassitario o Dermatologico `--tea`; altrimenti `--pri`. Dentro: nome, icone, servizi, orario e, se c’è, la prima frase dell’avviso in rosso. Il tocco sul blocco apre il dettaglio. Il tocco su uno spazio vuoto apre il nuovo appuntamento a quell’ora in punto.

**Settimana.** Sette colonne della stessa griglia, con scroll verticale. Nel blocco stanno nome e icona carattere, con ellissi. Niente scroll orizzontale.

**Mese.** Griglia con gli stessi pallini. Il tocco su un giorno apre un foglio con le righe di quel giorno e **+ Aggiungi**.

In giorno e in settimana un blocco si trascina. L’orario si aggancia ogni 15 minuti, dentro le 08–19; in settimana può cambiare giorno. Al rilascio si salva. Il toast è «Spostato alle HH:mm», con **Annulla**. Se capita sopra un altro appuntamento si salva lo stesso. La vista mese non si trascina.

## 11. Mensili

Solo cani attivi e mensili. La scadenza è l’ultimo completato più `recurrenceWeeks` (4 se manca). Senza un completato, la scadenza è oggi. Un programmato passato non fa da ultimo trattamento.

È fissato se esiste un programmato fra oggi e la scadenza più 14 giorni. Altrimenti è da fissare.

Il mese in testata è quello corrente, con i segmenti di questo mese e del successivo. Nel mese corrente entrano le scadenze di questo mese e quelle già passate ancora da fissare. Nel mese successivo entrano solo le scadenze di quel mese.

Il gruppo «in arrivo», usato da banner, campanello e terza riga di Animali, è il sottoinsieme dei da fissare del mese corrente la cui scadenza è entro i giorni di anticipo oppure è già passata. Il riquadro Mensili in Home usa fissati/totali del mese corrente.

Indietro torna alla Home. Titolo «Clienti mensili», sottotitolo «Ottobre 2026». La barra in basso è visibile e nessuna voce è accesa.

La card mostra «11/14», la parola «fissati», il chip «3 da fissare» e la barra verde. Filtri: **Tutti** (default), **Da fissare**, **Fissati**.

Da fissare: cerchio tratteggiato arancione, miniatura, nome su una riga, «Ultimo 4 set · scade 2 ott». Senza un completato: «Scade oggi». **Fissa** apre il nuovo appuntamento già compilato, con ritorno ai mensili. Ordine: scadenza, poi nome.

Fissati: cerchio verde con spunta, miniatura, nome, chip «9 ott». Il tocco apre il dettaglio. Ordine: data dell’appuntamento.

Mese vuoto: «Nessun mensile».

## 12. Listino

La tabella resta quella già in uso. **Modifica** porta a Servizi e durate. Sotto: «I prezzi in scheda cane hanno priorità sul listino.»

**Sostituisci** accetta un PDF o un’immagine. Se c’è un file, il sottotitolo è la sua data («Aggiornato 12 set 2026»). Se non c’è, resta la data del catalogo.

La card ha anteprima, nome, chip **Attuale**, **Apri** e **Foto**. La riga sotto il nome è «PDF · 340 KB» o «Immagine · 340 KB». Se il PDF dichiara le pagine, diventa «2 pagine · 340 KB». **Foto** salva un JPEG compresso. Il file che era attuale scende in **Versioni precedenti** (nome e mese, «gen 2025»). Toccare una versione la apre e non la rende attuale.

**Apri** va a `/listino/vedi` (una versione storica con `?id=`). Il PDF usa il riquadro del browser, l’immagine è una foto. Indietro torna a `/listino`. Senza file la card dice «Nessun file» e offre **Sostituisci** e **Foto**. La tabella resta.

File e versioni stanno nelle impostazioni: `id`, `fileName`, `mime`, `byteSize`, `uploadedAt`, dati del file. Non c’è un tetto. Se il salvataggio non entra, si toglie la versione più vecchia e si riprova una volta. Se fallisce ancora: «Salvataggio non riuscito» e il file attuale resta.

## 13. Impostazioni

Indietro torna alla Home. Senza barra in basso. In fondo «Groomly v1.0» ed **Esci** (solo la sessione).

**Attività.** Ragione sociale, partita IVA, telefono e indirizzo. La matita apre un foglio e salva subito. **Copia** sulla partita IVA mostra «Copiato». Vuoto: «Aggiungi».

**Aspetto.** Chiaro, Scuro, Auto, con sole, luna e monitor. Auto segue il sistema.

**Dati e backup.** **Esegui** prepara un JSON con cani, appuntamenti, servizi e impostazioni, foto comprese, lo scarica e segna l’orario. La riga dice «Oggi 07:00 · completato», oppure «Mai eseguito». Il toggle giornaliero parte spento. Se è acceso, all’apertura, e se l’ultimo backup ha più di 24 ore, la copia si riscrive sul dispositivo senza un download. **Esporta** scarica uno ZIP con il JSON e le foto come file. **Ripristina** fa scegliere un JSON, mostra «N cani, N appuntamenti, N servizi» e, con **Ripristina** (o **Annulla**), sostituisce i dati. La sessione non si tocca.

**Personalizza.** **Campi scheda** rinomina le etichette. **Servizi e durate** è la pagina già presente. **Tag caratteristiche** modifica tag, strumenti e prodotti suggeriti. I quattro caratteri restano fissi. Sottotitolo «N tag · 4 caratteri». **Archivio animali** mostra il numero e apre `/animali` sul tab Archivio.

**Promemoria mensili.** Il mockup non la disegna; il §8.10 di `GROOMLY.md` sì. Toggle acceso, orario 18:30, anticipo 7 giorni. I giorni valgono subito per il gruppo «in arrivo». Il toggle non nasconde il banner: decide solo la notifica dell’APK.

Forma delle impostazioni, oltre al tema già presente: `recentDogIds`, `fieldLabels`, `tagSuggestions`, `toolSuggestions`, `productSuggestions`, `business` (nome, partita IVA, telefono, indirizzo), `priceList`, `priceListHistory`, `monthlyReminder` (`enabled`, `time`, `daysBefore`), `backup` (`lastAt`, `autoDaily`), `ageThresholds`.

## 14. Firebase

Le schermate non cambiano. I hook chiamano le stesse funzioni. Sotto ci sono Authentication (email e password), Firestore con persistenza offline e Storage.

Il piano di implementazione conterrà i passi in console: creare il progetto, attivare email e password, creare Firestore e Storage, incollare la configurazione in `.env.local` (non entra in git), pubblicare regole e indici. Le regole consentono lettura e scrittura solo se `request.auth.uid` è il `uid` di `users/{uid}`. Indici: appuntamenti per inizio, per cane e inizio, per stato e inizio; cani per stato e nome, e per tipo cliente e stato.

Nel codice le date restano `Date`. Il `Timestamp` sta solo nel repository. I test di pagina usano i dati locali. Il mapper Firebase si prova con oggetti semplici, senza un progetto vero.

«Email o password non corretti» resta. Senza rete si entra solo se questo dispositivo ha già una sessione Firebase; altrimenti «Connessione assente». **Esci** chiude la sessione Firebase.

Al primo accesso, se sul dispositivo ci sono cani, appuntamenti, servizi o impostazioni, si inviano a `users/{uid}`. Fino a invio riuscito le schermate leggono i dati locali. La password locale non si copia. Se l’invio riesce, si tolgono `groomly.auth`, `groomly.session` e le chiavi dati di quell’account. Se fallisce, restano e il toast è «Salvataggio non riuscito»; all’accesso successivo si riprova.

Foto profilo, galleria, foto di lavoro e listino vanno nello Storage, nei percorsi del §6 di `GROOMLY.md`. Finché il caricamento non finisce, si mostra la copia sul dispositivo. **Esegui** e il backup automatico, con rete, scrivono anche `users/{uid}/backups/aaaa-mm-gg.json`. Senza rete la copia locale resta in coda.

Ogni scrittura funziona offline e si allinea al ritorno della rete. Una scrittura rifiutata mostra «Salvataggio non riuscito» e non cancella i dati precedenti.

## 15. Capacitor

L’app nel browser resta. Si aggiunge il progetto Android `it.groomly.app`. Icona: zampa su fondo `--pri`. Splash: la stessa zampa e la parola Groomly. Permessi: fotocamera, foto già presenti, notifiche. Prima di aprire fotocamera o rullino si chiede il permesso. Se è negato: «Permesso foto negato»; si può comunque scegliere un file se quel permesso c’è. Il piano di implementazione indicherà i comandi dell’APK di prova. Serve Android Studio. Non si pubblica su uno store.

Una notifica al giorno, all’orario del promemoria, canale «Promemoria mensili». Testo: «3 mensili da programmare: Toby, Kira, Oscar». Il numero è quello del gruppo «in arrivo»; i nomi sono al massimo tre. Con un cane: «1 mensile da programmare: Toby». Elenco vuoto o toggle spento: nessuna notifica in programma. Si ricalcola all’apertura e quando cambiano orario, anticipo o toggle. Il tocco apre `/mensili`. Nessun messaggio ai clienti.

Nel browser il toggle si salva e non parte alcuna notifica. Senza rete la notifica usa l’ultimo elenco già calcolato.

Prova sull’APK: installare la build di prova, concedere e negare la fotocamera, anticipare l’orario di un minuto, verificare che la notifica arrivi e apra i Mensili, poi rimettere 18:30.

## 16. Frasi

Interfaccia solo in italiano. Si riusano le frasi già in uso e si aggiungono, quando la sezione le nomina: «Salvato», «Salvataggio non riuscito», «Copiato», «Connessione assente», «Permesso foto negato», «Si sovrappone a …», «Fissato per …», «Spostato alle HH:mm», «Completato · fissa il prossimo», «Nessun appuntamento», «Nessun cane», «Nessun mensile», «Nessun file», «Nessun trattamento», «Nessuna nota», «Mai eseguito», «Cane assente», «Appuntamento assente», «Dati locali illeggibili».

Non si usa `window.confirm`. Le conferme stanno in un foglio.

## 17. Fuori da questa specifica

Pubblicazione su uno store. Messaggi automatici ai clienti. Campo microchip. Modifica delle soglie di età da interfaccia. Stato «cancellato» al posto della cancellazione. Rendere attuale una versione del listino toccandola. Emulatore Firebase nella suite di test.
