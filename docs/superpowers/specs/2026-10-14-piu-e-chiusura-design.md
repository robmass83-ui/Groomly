# Groomly — Popup del «+» e chiusura con variazione

Data: 2026-10-14
Stato: design approvato in chat, in attesa di revisione del file.

Questo documento fissa due modifiche. Il «+» della barra diventa un popup centrale. **Completato** chiede prezzo, tempo impiegato e, se servono, la nota, prima di chiudere l'appuntamento.

Non si pubblica l'app con questo file. La pubblicazione arriva con l'implementazione.

## 1. Decisioni prese in chat

| # | Decisione |
|---|---|
| P1 | Il «+» non apre più il foglio basso. Apre un popup centrale, versione C: icona, nome, freccia. Prima **Appuntamento**, poi **Aggiungi Pelosetto**. |
| P2 | In Animali sparisce **Aggiungi** in alto a destra. Se la lista è vuota, il pulsante al centro resta. |
| P3 | **Completato** apre un popup a colonna, già compilato. **Nessuna modifica** chiude com'è. **Salva e completa** registra prezzo, tempo e nota. |
| P4 | Il tempo è quello impiegato davvero. L'inizio e la fine in agenda non si spostano. |
| P5 | La nota è obbligatoria solo se prezzo o tempo sono diversi dal previsto. |
| P6 | Il tempo si scrive in ore e minuti, già compilato con la durata prevista. |
| P7 | Nota, cifra incassata e tempo vero si rileggono sul dettaglio completato e nello storico del cane. Gli incassi mostrano solo la cifra. |
| P8 | Il prezzo della visita si cambia solo in questo popup. Prima di chiudere, il totale si legge e non si tocca. |
| P9 | Dal dettaglio completato, **Correggi** riapre lo stesso popup, con la stessa regola sulla nota. |
| P10 | Le righe servizio restano il listino di quell'appuntamento. La cifra diversa sta in `total`. I minuti veri stanno in `actualDurationMin`. La frase sta in `adjustmentNote`, campo nuovo. |
| P11 | La matita dello storico apre lo stesso popup. La domanda «aggiorna anche il prezzo in scheda» resta solo da lì, con un solo servizio e una cifra diversa da quella del cane. |

## 2. Fuori da questo lavoro

Non si rinomina il tab Animali, la scheda nuovo cane, il listino, gli incassi o le altre scritte **Aggiungi** (file, tag, galleria, servizi). Non si cambia la formula degli incassi. Non si sposta il blocco in agenda. Non si aggiungono colori nuovi: si usano le variabili già in tema, chiaro e scuro.

**Non venuto**, **Disdici**, anticipa e posticipa restano come oggi. La spunta «Completato» nel calendario è solo un segno, non un bottone.

## 3. Popup del «+»

`ShellFrame` non usa più il foglio «Nuovo». Usa il `Dialog` già centrato, titolo **Nuovo**.

Due righe, in quest'ordine, alte almeno 44 px, con bordo, raggio 14, icona a sinistra su riquadro `var(--pri-s)` e freccia a destra:

| Riga | Icona | Azione |
|---|---|---|
| Appuntamento | calendario | Come oggi: `/appuntamenti/nuovo`. Se il percorso è `/calendario` e c'è `data` nel formato `AAAA-MM-GG`, si passa quel giorno. |
| Aggiungi Pelosetto | zampa | Come oggi **Animale**: `/animali/nuovo`. |

La X e il tocco sullo sfondo chiudono il popup senza navigare.

In `DogsPage` si toglie il bottone **Aggiungi** dell'intestazione. Restano l'ordinamento e, a lista vuota, **Aggiungi il primo cane** oppure **Aggiungi un cane**.

## 4. Dati

Su `Appointment`:

- `services[]` — prezzo e durata di listino di quella visita. Questo flusso non li riscrive.
- `total?` — cifra incassata, solo se è diversa da `sumPrice(services)`. Se torna uguale, il campo si toglie.
- `actualDurationMin?` — minuti impiegati. Dopo una chiusura riuscita c'è sempre. Due ore sono `120`.
- `adjustmentNote?` — frase, solo se c'è una variazione. Se prezzo e tempo tornano quelli previsti, il campo si toglie.

Previsto = somma delle righe. Incassato = `total` se c'è, altrimenti la somma. Tempo vero = `actualDurationMin` se c'è, altrimenti la somma dei minuti.

C'è variazione se l'incassato, in centesimi, è diverso dal previsto, o se i minuti veri sono diversi dalla somma delle durate. `50` e `50,00` non sono una variazione.

Il campo nuovo passa da modello, lettura e scrittura locale, `firebaseMap` e dal salvataggio dell'appuntamento, come già fanno `total` e `actualDurationMin`. Nessuna collezione nuova. Una nota assente, vuota o fatta di soli spazi si legge come assente.

Il prezzo in scheda del cane non cambia da solo. Cambia solo se, dalla matita dello storico, si sceglie **Aggiorna anche il prezzo in scheda**. In quel caso si copia la cifra incassata sul prezzo di quell'unico servizio, con la durata già in scheda.

## 5. Popup di chiusura

Lo stesso popup, il `Dialog` centrato, si apre da tre punti:

- **Completato** sul dettaglio, se `canComplete` è vero (oggi o un giorno passato).
- **Completato** in Home, sulla riga di Oggi, con la stessa regola.
- **Correggi** sul dettaglio già completato, e la matita dello storico su una visita completata.

Se il bottone è spento, il popup non si apre. Da domani **Completato** resta spento.

### Prima chiusura

Titolo **Completare**. Sotto, una riga «Previsto» con la cifra (`formatEuro`) e la durata di listino, letta come in §7: `2 h 00` se le ore sono almeno 1, altrimenti `45 min`.

Poi, in colonna:

1. **Prezzo**, compilato con l'incassato (alla prima chiusura è il previsto).
2. **Tempo impiegato**, due campi: ore e minuti, compilati con la durata prevista. 90 minuti sono `1` e `30`.
3. **Nota**, vuota. Accetta al massimo 280 caratteri.

Bottoni, uno sotto l'altro:

- **Nessuna modifica** — attivo solo se prezzo e tempo sono quelli previsti e i campi sono validi. Completa, scrive `actualDurationMin` con i minuti previsti, toglie `total` e `adjustmentNote`. Una frase scritta senza variazione non si salva.
- **Salva e completa** — attivo solo se i campi sono validi, c'è una variazione e la nota, tagliati gli spazi, ha da 1 a 280 caratteri. Scrive la cifra (in `total` solo se è diversa), i minuti veri e la nota, poi segna `completato`.

La X o il tocco fuori non scrivono nulla. L'appuntamento resta `programmato`.

Dopo un successo in Home, il popup si chiude e la riga di Oggi risulta completata. Non si cambia pagina.

### Correzione

Titolo **Correggi**. Stessi tre campi, compilati con incassato, minuti veri e nota già salvata.

- **Annulla**, la X e il tocco fuori non scrivono nulla. Lo stato resta `completato`.
- **Salva** aggiorna i tre campi e non cambia lo stato. È attivo solo se i campi sono validi e, in caso di variazione, la nota c'è. Se prezzo e tempo tornano quelli previsti, **Salva** toglie `total` e `adjustmentNote` e scrive i minuti previsti in `actualDurationMin`.

Dal dettaglio e da **Completato** non si chiede se aggiornare il prezzo in scheda.

Dalla matita dello storico, dopo un **Salva** riuscito, se il servizio è uno solo e la cifra incassata è diversa dal prezzo di quel servizio sulla scheda del cane, si apre la domanda già esistente: **Solo questo appuntamento** oppure **Aggiorna anche il prezzo in scheda**. Se i servizi sono più di uno, o la cifra è già quella della scheda, la domanda non esce.

## 6. Campi validi

Prezzo: zero o più, virgola o punto, al massimo due decimali. `50` e `50,00` sono lo stesso numero. Se il testo non è un importo, sotto il campo c'è «Importo non valido» e i bottoni di conferma sono spenti. **Annulla**, la X e il tocco fuori restano sempre disponibili, anche con i campi non validi.

Ore: intero da 0 a 24. Minuti: intero da 0 a 59. Non c'è riporto: `90` nei minuti non diventa 1 ora e 30. La somma deve essere almeno 1 minuto e al massimo 24 ore e 0 minuti. Fuori da questi limiti, sotto i campi c'è «Tempo non valido» e i bottoni di conferma sono spenti.

## 7. Cosa si legge dopo

Sul dettaglio programmato il totale è testo, non un bottone. Il campo **Durata reale** non c'è più, né prima né dopo la chiusura.

Sul dettaglio completato si vedono la cifra incassata, il tempo impiegato e, se c'è, la nota. Il tempo si legge `2 h 00` se le ore sono almeno 1, altrimenti `45 min`. Il bottone **Correggi** riapre il popup.

Nello storico del cane la riga usa la cifra incassata. Sotto, se c'è `adjustmentNote`, la frase sta su una riga propria. La freccia rispetto alla visita precedente confronta le cifre incassate, non le somme di listino.

Gli incassi continuano a usare la cifra incassata e non mostrano la nota.

## 8. Errori

Salvataggio fallito: toast «Salvataggio non riuscito», tono `plain`. Il popup resta aperto. Lo stato e i valori già salvati non cambiano.

Non si usa `window.confirm`.

## 9. Test

I test dimostrano i comportamenti, non i pixel.

- Il «+» apre il popup centrale con **Appuntamento** prima di **Aggiungi Pelosetto**. Non c'è il foglio «Nuovo». Le due azioni navigano come oggi, data del calendario compresa.
- In Animali l'intestazione non ha **Aggiungi**. La lista vuota ha ancora il pulsante al centro.
- **Completato** apre il popup e lascia `programmato`. **Nessuna modifica** mette `completato`, scrive i minuti previsti e non lascia `total` né `adjustmentNote`.
- Con prezzo o tempo diversi e nota vuota, **Salva e completa** è spento e lo stato non cambia.
- € 70, 2 ore e «Pieno di nodi» salvano `total` 70, `actualDurationMin` 120, `adjustmentNote`, stato `completato`. I prezzi sulle righe restano quelli di prima.
- La X non scrive. Da domani **Completato** è spento e il popup non si apre.
- In Home, **Completato** usa lo stesso popup. Dopo il successo la riga è completata.
- Dopo la chiusura il totale non è un bottone e **Durata reale** non c'è. **Correggi** mostra i valori salvati. **Salva** non riporta lo stato a `programmato`. Riportare prezzo e tempo al previsto toglie `total` e `adjustmentNote`.
- Importo o tempo non validi non si salvano. Salvataggio fallito: toast e popup ancora aperto.
- Lo storico mostra cifra incassata, durata e nota. La freccia confronta le cifre incassate. La matita apre il popup. La domanda sul prezzo in scheda esce solo da lì, con un solo servizio e una cifra diversa.
- Gli incassi non mostrano la nota. `adjustmentNote` si legge e si scrive in locale e nella mappa cloud.
