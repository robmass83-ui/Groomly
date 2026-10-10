# Groomly — Fix UX, bug e logiche

Data: 2026-10-10
Stato: approvata il 10 ottobre 2026, con le quattro correzioni di quel giorno (ritorno alla pagina di partenza, occasionale che non diventa mensile da solo, migrazione, verifica sul telefono).

Questa è l’unica specifica del lavoro. Si implementa insieme, non a blocchi separati. Dove il file di fix o la bozza del solo blocco 1 dicono altro, vale questo testo. La specifica di prodotto del 9 ottobre resta la fonte per ciò che qui non è nominato.

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | «Fissa anche il prossimo» crea due appuntamenti: quello che si salva e uno solo, N settimane dopo la data di quello, alla stessa ora. N è 4 se nessuno l’ha cambiata. Stesso `seriesId`. Nessuna serie da 3, 6 o 12 mesi. Il tipo si chiama ancora Mensile. Accendere l’interruttore non cambia `clientType`: su un occasionale nascono i due appuntamenti e il cane resta occasionale. Sotto lo switch, solo se il cane è occasionale, c’è il link «Rendilo cliente mensile». Toccandolo, al salvataggio il cane diventa mensile e tiene N. Se l’interruttore è spento, nasce un solo appuntamento. Il link, se è stato toccato, vale comunque. |
| D2 | «Completato» è abilitato per oggi, a qualsiasi ora, e per i giorni precedenti. Da domani in poi è disabilitato, in scheda, in «Da chiudere» e in calendario. |
| D3 | Sull’appuntamento: **Disdici**, **Disdetto**, **Non venuto**. **Annulla** solo nel toast, per disfare l’ultima azione. Stati: `programmato`, `completato`, `disdetto`, `non_venuto`. |
| D4 | Razza \| Taglia e Proprietario \| Telefono sulla stessa riga da 360 px in su. Sotto i 360 px, una colonna. |
| D5 | La fascia 08–19 entra in uno schermo (50 px per ora). Se quel giorno esce dalla fascia, la griglia si allunga e si scorre. All’apertura si parte dalle 08:00, o dall’ora attuale se è oggi. |
| D6 | Il cane creato dentro l’appuntamento chiede Nome, Specie (default Cane), Taglia (default Piccola), Proprietario, Telefono. Non si cambia pagina. |
| D7 | Niente reset CSS globale. I margini si azzerano solo nei contenitori delle schermate toccate. |
| D8 | Banner Home, pagina Mensili, campanello e notifica Android leggono la stessa funzione. |

Scelte chiuse qui, perché il file di fix ne lasciava due:

- Dopo il salvataggio di un **nuovo** appuntamento il foglio si chiude e si torna alla pagina da cui si era partiti (Home, Mensili, scheda cane o calendario). Compare il toast «Appuntamento salvato per lun 12 ott 09:00» con **Annulla** e **Vedi**. **Vedi** apre il calendario di quel giorno. Non si salta al calendario da soli. Il salvataggio di una modifica resta sul dettaglio.
- La checkbox Anziano non c’è. Il segmento è l’unico comando. `isSenior` vale `ageCategory === 'anziano'`.
- In creazione e in modifica c’è un solo editor, il form. In lettura i dettagli sono una sezione chiusa, senza una seconda griglia viva.
- Il campanello apre `/mensili` e usa lo stesso conteggio del banner. Non è un centro notifiche. «Da chiudere» è il riquadro in Home.
- Avatar per specie (cane, gatto, generico). Se c’è almeno un animale «altro», compare il filtro «Altri». I testi restano «cane» («Nuovo cane», «Nessun cane»). Nessuna impostazione «solo cani».
- Le tre statistiche in Home restano tre destinazioni (calendario di oggi, mensili, listino) su una riga sola, più bassa.

## 1. Form e scheda cane

La pagina tiene un `DogScreen`: specie, razza, sesso, età, taglia, carattere, cliente, nome, proprietario, telefono, nota, avviso, anno di nascita e peso. I controlli lo leggono e lo scrivono. Salva scrive quel valore. Non c’è un secondo stato che possa vincere al salvataggio.

### Creazione

`/animali/nuovo` mostra solo il form. Niente griglia con la matita, niente storico, galleria, icona telefono, bottone Modifica. «+ Contatto» sta dentro «Altri dettagli». Il piede ha solo **Salva**, a tutta larghezza. Si esce con la freccia dell’header, senza una scritta «Annulla».

```
[ Avatar ]
Nome *
Razza                    | Taglia
Proprietario *           | Telefono *
Carattere                [Bravo] [Agitato] [Mordace]
Avviso critico

▸ Altri dettagli         (chiuso)
    Specie, Sesso, Età, Peso, Cliente, Nota, + Contatto
▸ Prezzi personalizzati  (chiuso)
[ Salva ]
```

Obbligatori: nome, proprietario, telefono. Default: Cane, Adulto, Piccola, Bravo, Occasionale. Da 360 px, Razza | Taglia e Proprietario | Telefono stanno sulla stessa riga. Il carattere è solo le tre icone sticker, 48 px, etichetta sotto, una sola scelta. Il segmento testuale non c’è. Se il cliente è Mensile, in «Altri dettagli» compare «Frequenza: ogni [4] settimane». È la N del D1 e si scrive sulla scheda. Su un occasionale quel campo non c’è.

L’età è il segmento. Un anno completo ricalcola la categoria dalle soglie e la riallinea. Poi la scelta manuale del segmento vale fino al prossimo cambio dell’anno. Un anno incompleto non cambia la categoria. Filtro «Anziani», chip e icona leggono `ageCategory`.

I prezzi personalizzati, da chiusi, non scrivono nulla: il cane usa il listino. Da aperti, le colonne sono Prezzo € e Durata min, il listino è placeholder, si salva solo lo scostamento. Nascondere un servizio è uno switch con la dicitura «nascondi questo servizio per questo cane».

La foto si sceglie toccando l’avatar, con il badge fotocamera. L’input file nativo non si vede.

Dopo Salva: toast «Fido salvato» con Annulla, poi la scheda di quel cane. Se il salvataggio fallisce, lo schermo non cambia e il toast è «Salvataggio non riuscito». I due ingressi (Aggiungi in Animali e «+» → Nuovo cane) aprono questo form.

Su 390×844, con le sezioni chiuse, nome, razza, taglia, proprietario, telefono, carattere, avviso e Salva stanno in una schermata.

### Modifica e lettura

In modifica si usa lo stesso form, con le sezioni apribili e Salva. La griglia con la matita non è un secondo editor.

In lettura: foto 64 px, nome, razza · età, proprietario, telefono come bottone «Chiama», chip carattere, mensile e anziano. Poi, se c’è, la banda rossa dell’avviso. Poi il prossimo appuntamento, o «Fissa appuntamento». Poi lo storico (data, servizi, prezzo a destra; freccia sul prezzo se è cambiato rispetto al precedente). Poi le note. Poi «Dettagli», chiusa: specie, sesso, peso, taglia, cliente, durata media. Poi i contatti. Il listino sta solo in modifica, dentro i prezzi personalizzati. In lettura c’è Modifica (matita nell’header). Salva c’è solo in modifica.

Il ruolo di default di un contatto nuovo è vuoto, non «Proprietaria». «Non più in cura» e «Deceduto» stanno nel menu ⋯, non come link in fondo.

«Fissa il prossimo» e i chip +2 / +4 / +6 settimane, se esiste già un `programmato` futuro, chiedono «Ercole ha già un appuntamento il 22 ott. Crearne un altro?» e non scrivono finché non si conferma.

### Tastiera e campi

`inputmode="tel"` sul telefono, `inputmode="decimal"` su prezzi e peso, `autocapitalize="words"` sui nomi. «Avanti» passa al campo successivo. L’ultimo esegue Salva. Ogni controllo ha la sua etichetta collegata (`label` / `htmlFor`), tramite il componente `Field` del §8.

## 2. Nuovo appuntamento

### Foglio

Le rotte restano `/appuntamenti/nuovo` e `/appuntamenti/:id`. La pagina di partenza resta montata sotto. La pagina del foglio non disegna una seconda shell né la scritta «Calendario».

Ogni apertura dall’app passa `background` con l’indirizzo corrente. Lo passano il «+», il tap su un’ora vuota, la riga, «Fissa» e «Successivo». Se l’URL si apre da solo, la pagina sotto è quella di `backTarget`, ed è anche la voce di storia sotto il foglio: senza parametri la Home; `?da=mensili` i Mensili; `?data=` il calendario di quel giorno; `?cane=` la scheda se il cane c’è. La storia è sistemata prima che si possa tornare indietro, così un passo rivela quella pagina e l’activity non si chiude.

Header su una riga: Chiudi (✕) e il titolo. Niente freccia Indietro nel foglio. Chiudi, lo sfondo, uno swipe di almeno 80 px sulla maniglia e il tasto Indietro di Android (fisico o gesto) chiamano `requestClose`. Sotto gli 80 px il foglio torna su.

- Foglio pulito: un passo verso la pagina sotto. Non si esce dall’app e non si saltano pagine.
- Foglio sporco, domanda chiusa: si resta sull’indirizzo e compare «Chiudere senza salvare?», con Resta e Chiudi senza salvare.
- Domanda aperta: Indietro equivale a Resta. La domanda si chiude, il form resta, l’indirizzo non cambia.

Sporco vuol dire un cambio rispetto ai valori già messi dall’indirizzo o dall’appuntamento. Aprire e chiudere subito non chiede nulla. Il dettaglio in lettura non è sporco. «Appuntamento assente» si chiude senza domanda.

Il salvataggio di un nuovo appuntamento chiude il foglio e torna alla pagina sotto, quella da cui si era partiti. Il toast è «Appuntamento salvato per lun 12 ott 09:00», con **Annulla** e **Vedi**. Annulla toglie l’appuntamento appena creato e, se il cane è nato in questa stessa azione, toglie anche lui. Vedi apre il calendario di quel giorno. Senza Vedi Laura resta dov’era, per esempio sulla lista Mensili.

### Cane

Prima di scrivere, la ricerca mostra fino a 5 cani attivi da `recentDogIds`, i più recenti prima. Se l’elenco è vuoto non compare «Nessun cane»: i risultati arrivano quando si scrive. «Nessun cane» resta solo se non c’è nessun cane attivo. I risultati sono righe: foto, nome, razza, proprietario, icona del carattere, e sotto sempre la riga razza · cognome (§4). Si cerca anche per proprietario e telefono, con `matchesDog`. Al massimo 6 attivi, nello stesso ordine di oggi, con il telefono come ultimo gradino. «+ Nuovo cane "…"» è l’ultima riga.

Se il nome coincide con un attivo, quella riga chiede «Esiste già Ercole (Terranova, Usai). Crearne un altro?». Dopo la scelta il campo diventa la card del cane (foto, nome, razza, proprietario, carattere, avviso, ✕) e i suggerimenti si chiudono.

«+ Nuovo cane» non naviga. Si apre nello stesso foglio la mini-scheda del D6, nome già scritto. Al salvataggio dell’appuntamento si crea prima il cane, poi l’appuntamento. Un gatto resta gatto. Una taglia Grande usa subito i prezzi e le durate da grande. Il resto dei campi prende i default del §1.

### Servizi, quando, ripeti

I chip sono una griglia a due colonne, stessa larghezza. Testo: `Bagno · 30m · €20`, dai prezzi del cane se ci sono. Selezionato: fondo blu ardesia, testo bianco, ✓. Non selezionato: bordo grigio.

Sotto i servizi, e in una riga sticky sopra Salva: il totale vivo, «10:00 → 12:00 · 2h · €60». La durata serve anche all’ora di fine e alle sovrapposizioni.

Data e ora sulla stessa riga. Scorciatoie Oggi, Domani, +7 gg, +30 gg, più il calendario. L’ora è una griglia di slot; quelli già occupati, tenuto conto della durata totale, sono grigi. Si vede «09:00 → 10:15».

«Fissa anche il prossimo» è uno switch, acceso di default solo se il cane è mensile. Sotto, quando è acceso: «tra N settimane» e «Prossimo: sab 7 nov, 10:00». N si può cambiare. Se il cane è già mensile, N aggiorna la frequenza della scheda al salvataggio. Se è occasionale, N serve solo al secondo appuntamento e non cambia il tipo. Sotto lo switch, solo per l’occasionale, c’è «Rendilo cliente mensile»: toccato, al salvataggio il cane diventa mensile e tiene N; non toccato, resta occasionale anche con due appuntamenti. Chiudere il foglio senza salvare non applica il link. Vale il D1.

Salva è disabilitato finché mancano cane, almeno un servizio, data e ora. La sovrapposizione è un riquadro giallo, «Si sovrappone a Zeus 11:00–14:00», calcolato anche in creazione. Si può salvare dopo conferma.

Ordine: Cane, Servizi, Quando, Riepilogo, Salva. 20 px tra i blocchi.

## 3. Scheda appuntamento e stati

In alto la card del cane e la riga «Sab 10 ott · 10:00–12:00». I servizi sono uno scontrino: una riga per servizio, prezzo a destra, totale in grassetto. Niente seconda copia di ora e durata.

In basso, sticky, **Completato**, abilitato secondo il D2. Sopra, una riga di tre bottoni uguali: Anticipa −15, Posticipa +15, Modifica. **Disdici** è rosso e staccato. Sposta non c’è: Modifica è l’unico form.

Nella scheda, sotto Disdici, c’è anche **Non venuto**. Disdici porta a `disdetto` e chiede il motivo, cliente o salone. Non venuto porta a `non_venuto`. Entrambi restano nello storico, non contano come trattamento per la scadenza e non contano come appuntamento futuro. Il toast dura 5 secondi: «Appuntamento disdetto · Annulla» o «Non venuto · Annulla». Annulla riporta lo stato a `programmato`. L’eliminazione vera è solo «⋯ → Elimina», con conferma nel foglio.

Dopo Completato restano durata reale, foto, note e «Fissa il prossimo». Anticipa, Posticipa e Modifica non restano. Strumenti, prodotti, stile e foto stanno in «Note del lavoro», chiusa, aperta dopo Completato. «Fissa il prossimo» usa la frequenza della scheda e avvisa se un futuro c’è già (§1).

Un `programmato` di un giorno precedente a oggi è «da chiudere». Oggi, anche se l’ora è già passata, resta in Oggi e si può completare. Da domani Completato è disabilitato.

## 4. Omonimi e ricerca

Due cani sono omonimi se `normalizeSearch` del nome coincide. In Home, calendario e Nuovo appuntamento i pari sono solo gli `attivo`. Una Luna archiviata non fa comparire la riga sull’altra. Nel tab Archivio i pari sono solo `non_in_cura` e `deceduto`.

`dogMark` è razza e cognome, uniti da « · ». Il cognome è l’ultima parola del proprietario. Se la riga sarebbe identica, si usa `shortOwner`. Se manca tutto, non c’è riga.

- In ricerca la riga c’è sempre.
- In Home, nel giorno del calendario e nella lista sotto il mese, la riga c’è solo se c’è un omonimo.
- In Settimana, colonna intera: icona e nome troncato («Erco…»). Se c’è un omonimo e il blocco è alto almeno 32 px, il mark sta su una seconda riga; altrimenti solo nell’etichetta accessibile. Le prime lettere del nome restano visibili.
- In Settimana, blocco diviso: iniziali se il nome è unico; se c’è un omonimo, il mark troncato, non una sola lettera.

L’etichetta, quando il mark c’è, è «Apri Luna, Maltese, Bianchi». «Cane assente» non ha mark. La lista Animali tiene il sottotitolo razza · età · proprietario e non aggiunge un’altra riga.

`matchesDog` non legge la `searchKey`. Normalizza query e testo (nome, razza, nomi dei contatti) al momento. Il telefono: si toglie un prefisso iniziale `+39` o `0039`, poi si tengono le cifre. Un numero che comincia con 39 senza quel prefisso resta intero. Servono almeno 3 cifre. La query corrisponde se il testo corrisponde oppure le cifre corrispondono. La `searchKey` salvata include le cifre già senza prefisso; la pagina non dipende da lei.

## 5. Calendario

Giorno e Settimana usano `placeAppointments`, gli estremi di griglia e `openingScroll` in `calendarView.ts`. L’ora è alta 50 px. La posizione verticale è l’ora esatta. Il minimo disegnato è 18 px. Una durata zero, solo per le colonne, conta 15 minuti.

La fascia base è 08–19. Si allunga all’ora intera precedente o successiva se un appuntamento del giorno, o della settimana, esce. In Settimana le sette colonne condividono l’intervallo. «08:00» ha 10 px sopra e non è tagliata.

Apertura: se non è oggi, scroll alle 08:00. Se è oggi e l’ora è in griglia, la linea rossa sta circa a un terzo dall’alto. Prima dell’inizio, scroll in cima. Dopo la fine, scroll in fondo. «↑ 1 prima delle 8» e «↓ 1 dopo le 19» compaiono solo finché quel tratto è fuori vista.

Il tap sulle ore vuote 08–19 apre il nuovo appuntamento. Le ore aggiunte non sono un bersaglio. Il trascinamento resta agganciato ai quarti d’ora dentro le 08–19. Un 07:00 si vede al suo posto; trascinato, atterra in fascia.

Le sovrapposizioni si dividono la larghezza, 2 px fra le colonne, prima colonna libera, ordine per inizio e poi per id. 10:00–11:00 e 11:00–12:00 non si dividono. Un blocco che si sovrappone ha anche un contorno `var(--warn)` da 2 px. La linea rossa resta sopra.

Colori di stato, oltre al riempimento già in uso per un `programmato`: completato con spunta verde; da chiudere con bordo arancione; disdetto e non venuto barrati e grigi. Un appuntamento di un cane archiviato, se resta in griglia, è grigio con l’icona archivio.

In Giorno il blocco mostra nome, carattere, servizi, orario e l’avviso, con i puntini se la colonna è stretta. In Settimana vale il §4.

### Mese

In vista Mese la striscia della settimana non c’è. Al posto dei pallini, il numero di appuntamenti del giorno. Sotto la griglia, la lista del giorno selezionato sta nella pagina, non in un foglio. Niente spazio vuoto sotto.

## 6. Mensili, Home, notifica

`monthlyStatus(dog, appointments, now)` è l’unica fonte per il banner, la pagina Mensili, il pallino del campanello e il testo della notifica. La notifica resta «N mensili da programmare: …», con gli stessi cani del banner, al massimo tre nomi.

Un mensile attivo è **fissato** se ha un `programmato` futuro, qualunque sia la distanza dalla scadenza. Se quell’appuntamento cade dopo la scadenza più 14 giorni, la riga dice «Fissato in ritardo · 24 ott», in arancione, e non è «Da fissare». `disdetto` e `non_venuto` non fissano e non spostano la scadenza. Un `programmato` di un giorno già passato non fissa e non è l’ultimo trattamento.

Senza un completato non c’è scadenza. Quei cani sono **Nuovi**, anche se hanno già un appuntamento futuro: non sono Fissati e non sono Da fissare, e non entrano nel banner, nel pallino e nella notifica. Fissato richiede un completato e un `programmato` di oggi o di un giorno successivo. Un mensile con scadenza oltre i giorni di anticipo, e senza futuro, non sta in nessun gruppo e non entra nel conteggio.

Il banner e il pallino contano i **da fissare** la cui scadenza è entro i giorni di anticipo oppure è già passata. I nuovi e i fissati, anche in ritardo, non ci entrano.

Un cane può essere insieme in «Da chiudere» (ha un `programmato` di un giorno precedente) e da fissare (non ha un futuro). Le due cose non si cancellano.

Gruppi in pagina, in quest’ordine: **In ritardo** (scadenza passata, non fissato), **In scadenza questa settimana** (entro l’anticipo, non fissato), **Nuovi**, **Fissati** (verdi, chiusi di default; dentro, il fissato in ritardo resta arancione). La riga ha nome e «ultimo 5 set · scade 3 ott» a sinistra, «Fissa» a destra, allineato. I nuovi non mostrano «Scade oggi».

In lista Animali lo stato sta a destra, sulla riga del §8, non su una terza riga. Se c’è un futuro si mostra la sua data, mai «Da fissare». Se non c’è un futuro e c’è un passato da chiudere, lo stato è «Da chiudere». Se non c’è niente, «Nessun appuntamento».

### Home

Ordine: data, **Oggi**, avvisi (banner mensili, poi «Da chiudere (N)»), riga delle tre statistiche, visti di recente. I completati di oggi hanno la spunta e stanno in fondo. L’appuntamento in corso o il prossimo ha un bordo blu a sinistra. «Da chiudere» offre Completato, Non venuto e Disdetto, con le stesse regole del §3.

I chip servizio non si tagliano a metà parola: se non entrano, si usa il `+N` già previsto e i chip visibili hanno la parola intera. «Visti di recente» non si disegna se i cani sono meno di 3. Il campanello porta a `/mensili`.

## 7. Archivio

«Deceduto» porta tutti i `programmato` futuri a `disdetto`, motivo deceduto, e prima dice quanti sono. Non chiede «Archivia soltanto». «Non più in cura» chiede ancora: archivia e disdici i futuri, oppure archivia soltanto. I completati restano. In calendario, un appuntamento di un archiviato che resta è segnato come nel §5.

## 8. Spazi e rifiniture

`Field` ha l’etichetta a 4 px dal controllo (massimo 6), etichetta 13 px, peso 600, margine 0. Tra un campo e il successivo, 14–16 px. Tra sezioni, 24 px. Input alti 40–44 px. I segmented hanno la stessa distanza. Niente reset su `h1`, `p`, `label`, `ul` fuori da questi contenitori.

Nelle schermate toccate non si disegnano blocchi vuoti. Una sezione senza contenuto è il titolo e «+ Aggiungi» sulla stessa riga. I titoli di sezione hanno 16 px sopra e 6 px sotto. Il padding di pagina è 12–16 px ai lati e 12 px in alto. L’header di pagina sta entro 48–52 px. Il Salva è sticky, con la safe area e nient’altro sotto. Le righe di lista sono alte 56–64 px, foto 40 px, con divisori.

Il foglio si adatta al contenuto, `max-height: 90vh`. Se il contenuto è lungo, è alto quanto lo schermo, non mezzo schermo vuoto.

Una sola azione primaria per schermata, blu, in basso, a tutta larghezza. Testi, etichette e campi partono a 16 px dal bordo. Tre misure: titolo 18–20 px, testo 15 px, secondario 13 px grigio. Il carattere sta a destra del nome. L’avviso critico è la banda rossa sotto il nome, in lista, scheda, appuntamento e calendario. I bersagli sono almeno 44 px, con 8 px fra due vicini. Prezzi, durate e orari sono a destra, in cifre tabulari.

Lista Animali: due righe, nome e icone, poi razza · proprietario. Lo stato («Sab 17 ott 08:00», «Da fissare», «Da chiudere») sta a destra. «Da fissare» è un badge arancione. Ricerca, tab e filtri restano sticky; tab e filtri stanno su una riga di chip. I nomi lunghi sono una riga con «…».

Lista vuota di Animali: l’icona zampa già in app, e «Aggiungi il primo cane». Non si aggiunge un disegno nuovo. Le altre liste vuote seguono la riga titolo + azione, non un paragrafo «Nessun…» staccato.

Listino: un prezzo unico occupa una cella «€ 5 · tutte le taglie», non solo la colonna Grande. Intestazione sticky. I servizi extra stanno sotto «Servizi aggiuntivi · prezzo unico».

Impostazioni: righe alte 52 px, icona, etichetta, valore. «Esci» è rosso e staccato in fondo. Il backup mostra la data dell’ultimo; «Mai eseguito» è arancione.

Il «+» apre due bottoni grandi, prima **Appuntamento** poi **Animale**. La voce attiva della barra è in grassetto e nel colore primario.

## 9. Test

Form e scheda:

- Con solo nome, proprietario e telefono, Salva crea il cane e apre la sua scheda.
- In creazione ogni dato compare una volta. Non ci sono «Rinomina Razza», storico, galleria, Modifica, né la checkbox Anziano.
- Il segmento Anziano salva `isSenior: true`. Adulto salva `isSenior: false`.
- Un anno da Giovane sposta il segmento. Un cambio manuale successivo resta fino a un nuovo anno.
- Su 390×844, sezioni chiuse, il form e Salva stanno in una schermata. L’etichetta dista circa 4 px dal campo e i campi circa 14–16 px.

Appuntamento:

- Un nome nuovo, con specie gatto o taglia grande, proprietario e telefono, servizi, data e ora, crea cane e appuntamento senza cambiare pagina. Il gatto resta gatto. La taglia grande ha i prezzi da grande.
- Bagno + Unghie aggiornano «Totale … · €…».
- Un mordace mostra il diavoletto nei risultati.
- Un nome già presente chiede conferma prima di «+ Nuovo cane». Dopo la scelta il campo è una card.
- Chiudere con dati inseriti chiede conferma. Il passo indietro fa lo stesso. Con la domanda aperta, Indietro equivale a Resta. Da pulito, il passo indietro torna alla pagina sotto e l’app resta aperta.
- «Fissa anche il prossimo» su un occasionale crea esattamente due appuntamenti, il secondo N settimane dopo la data del primo, alla stessa ora, e il cane resta occasionale. Compare «Rendilo cliente mensile». Toccato e poi salvato, il cane è mensile con quella N. Spento, nasce un solo appuntamento.
- Dopo il salvataggio di un nuovo appuntamento si torna alla pagina di partenza. Il toast ha Annulla e Vedi. Vedi apre il calendario di quel giorno.
- Completato funziona oggi, a qualsiasi ora, e sui giorni passati. Da domani è disabilitato.
- Disdici lascia «Disdetto» nello storico. Il toast ha Annulla per 5 secondi.
- «Fissa il prossimo» avvisa se un futuro c’è già.
- «Deceduto» porta i futuri a Disdetto.

Calendario, omonimi, mensili:

- Tre appuntamenti alle 10:00, 10:30 e 11:00 sono affiancati in Giorno e in Settimana.
- In Settimana, uno senza sovrapposizioni mostra le prime lettere del nome, non solo l’iniziale.
- Un 07:00 e un 18:45 da due ore si vedono interi, al posto giusto.
- Due Luna attive si distinguono in ricerca, Home e calendario. Se una è archiviata, l’altra resta «Luna».
- «artu» trova «Àrtù» anche con una `searchKey` non normalizzata. «3452424242» trova «+39 345 2424242». «+393452424242» trova «345 2424242». «33» non trova un telefono.
- Un mensile con un futuro, anche oltre 14 giorni dalla scadenza, non è «Da fissare».
- Un mensile senza completati non accende il banner.
- Un `programmato` di un giorno passato sta in «Da chiudere» e nel calendario ha lo stile da chiudere.
- Banner, pagina Mensili, campanello e testo della notifica riportano lo stesso numero.

## 10. File

Funzioni, con test accanto:

- `src/lib/dogScreen.ts` — bozza, età, carattere.
- `src/lib/calendarView.ts` — colonne, estremi, scroll, suggerimenti fuori fascia.
- `src/lib/dogList.ts` — `matchesDog`, telefono senza prefisso, `dogMark`.
- `src/lib/quote.ts` — `rankDogs` con il telefono.
- `src/lib/cycle.ts` — `monthlyStatus`, fissato, in ritardo, nuovi, da fissare. `reminderText` riceve già quel gruppo.
- `src/lib/migrate.ts` — le quattro regole del §11, usate all’avvio e da `restoreBackup`.

Pagine: `DogPage`, `DogFields`, `DogsPage`, `HomePage`, `AppointmentRow`, `AppointmentForm`, `AppointmentPage`, `CalendarPage`, `MonthlyPage`, `ListinoPage`, `SettingsPage`, `ShellFrame`, router. `SIZES.calendar.hourHeight` diventa 50. `snapQuarter` resta fra le 08:00 e le 19:00.

## 11. Migrazione dei dati già salvati

Una sola funzione legge i cani e gli appuntamenti già scritti e li riscrive solo se qualcosa cambia. Gira all’avvio, prima che le pagine leggano. `restoreBackup` passa dalla stessa funzione prima di scrivere le chiavi: un backup di prima di queste modifiche, una volta ripristinato, esce già migrato.

- Un cane con `isSenior: true` e `ageCategory` diversa da `anziano` diventa `anziano`. `isSenior` resta `true`.
- Un cane `mensile` senza `recurrenceWeeks`, o con un valore che non è un numero finito, prende `4`. Un occasionale senza quel campo resta senza.
- La `searchKey` si ricalcola: testo normalizzato, più le cifre del telefono già senza prefisso `+39` o `0039`.
- Uno stato appuntamento che non è `programmato`, `completato`, `disdetto` o `non_venuto` diventa `programmato`. I quattro stati noti non si toccano.

Il test carica un backup con la forma di prima: un cane senior segnato solo dalla checkbox, un mensile senza settimane, una `searchKey` scritta a mano, un appuntamento con uno stato sconosciuto. Dopo il ripristino valgono le quattro regole.

## 12. Verifica sul telefono

I test automatici non chiudono il lavoro. Alla fine si installa la build Android su un telefono o su un emulatore e si provano tre gesti, con l’app aperta su un appuntamento sporco e con un mensile da fissare:

- Il tasto Indietro, fisico o con il gesto, fa quello che fa Chiudi: se il foglio è sporco chiede conferma; se la domanda è aperta equivale a Resta; se è pulito torna alla pagina sotto e l’app resta aperta.
- Uno swipe di almeno 80 px sulla maniglia chiude come Chiudi. Sotto gli 80 px il foglio torna su.
- La notifica Android dice gli stessi cani e lo stesso numero del banner in Home.
