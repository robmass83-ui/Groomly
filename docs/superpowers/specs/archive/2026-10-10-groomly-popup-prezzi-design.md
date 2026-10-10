# Groomly — Popup al centro e prezzi compatti

Data: 2026-10-10
Stato: approvato in dialogo, in attesa di revisione del file

I form da compilare si aprono in un riquadro al centro. I menu e l’appuntamento restano fogli dal basso. Nei prezzi personalizzati lo switch «nascondi» sta sulla stessa riga del servizio.

## 1. Due componenti

`Sheet` non cambia: resta attaccato in basso, con maniglia, swipe e raggio solo in alto.

Nasce `Dialog` in `src/components/layout/Dialog.tsx`. Props: `open`, `title`, `onClose`, `children`. Nessuna prop in più. `open` falso non disegna nulla.

Passano a `Dialog`, stessi titoli e stessi figli di oggi:

- scheda cane: Contatto, Tag, Campo
- impostazioni: Attività, Campi scheda, Tag caratteristiche
- listino: Nuovo servizio e Modifica servizio

Restano `Sheet`: il +, Ordina, la scheda appuntamento, Altre azioni, Elimina, Chi disdice, Archivia, il menu Scheda, la foto, «Prezzo», «Orario già occupato», «Appuntamento già fissato», «Ripristina», l’avviso di aggiornamento, il foglio di prova in DevKit.

I campi, i testi dei bottoni, la validazione e ciò che viene salvato non cambiano. Chiudere un popup butta la bozza, come oggi: Contatto, Tag e Campo si riaprono vuoti. Non c’è «chiudere senza salvare». Il popup non cambia l’indirizzo e non entra nella storia. Il tasto Indietro di Android non lo chiude.

## 2. Il riquadro

L’overlay è il padre del riquadro: a tutto schermo, `z-index` 30, flex con `align-items: center` e `justify-content: center`, padding 16. Velo `rgba(12,15,21,.45)`, come il foglio.

`role="dialog"` sta sul riquadro, non sull’overlay. Fondo `var(--card)`, padding 12, larghezza 100% fino a 390 px, altezza massima `min(90dvh, calc(100dvh - 32px))`. Lo stile contiene `border-radius: 18px`, non `18px 18px 0 0`. Non ha un’altezza fissa: cresce col contenuto fino a quel massimo, e solo allora il corpo scorre. Non ha animazione.

In testa, una riga che non scorre: titolo a sinistra (`h2`, 17 px, peso 700, margine 0) e ✕ a destra. La ✕ è l’unico bottone chiamato «Chiudi»: 30×30, raggio 9, fondo `var(--surf)`, icona X da 16. Il velo non è un bottone. Ha `data-testid="dialog-backdrop"` e `aria-hidden="true"`. Un click sul velo chiama `onClose`. Un click nel riquadro no.

Sotto la riga del titolo, il corpo è una colonna con gap 9: i campi restano distanziati come nel foglio. Quel corpo scorre (`overflow: auto`, `min-height: 0`). Titolo e ✕ restano fermi. Così Modifica servizio e Tag caratteristiche si scorrono dentro il riquadro, e con la tastiera aperta si arriva comunque all’ultimo bottone.

L’elemento con `role="dialog"` e `aria-modal="true"` ha `aria-label` uguale al titolo e `tabIndex={-1}`. All’apertura il focus va su quell’elemento, non sul primo campo: la tastiera non si apre da sola. Alla chiusura non si rimette il focus sul bottone che aveva aperto. Esc, mentre è aperto, chiama `onClose`.

## 3. Prezzi personalizzati

In `PriceEditor` ogni servizio attivo è una sola riga, dentro il `group` che ha già il nome del servizio. Griglia `36px 1fr 76px 76px`, gap 6, `min-height` 44, allineata al centro.

1. Lo switch di oggi, 36×22. Etichetta accessibile invariata: «nascondi questo servizio per questo cane». La frase non è più un testo visibile.
2. Icona e nome, come oggi. Il nome ha `min-width: 0`, non va a capo e, se non entra, usa i puntini.
3. Prezzo, colonna 76 px, input alto 34 come oggi. L’etichetta nascosta «Prezzo Bagno» (e lo stesso per gli altri servizi) resta.
4. Durata, colonna 76 px, stesso input. L’etichetta nascosta «Durata Bagno» resta.

L’intestazione usa la stessa griglia. Le prime due celle sono vuote. Sopra il prezzo c’è «Prezzo €», sopra la durata «Durata min», stile di oggi.

Tra un servizio e il successivo restano 8 px. La lista non ha uno scroll proprio: scorre la pagina. Acceso o spento, prezzo e durata restano modificabili. Nascondere non cambia il valore e non disattiva i campi. Si salva lo stesso scostamento di oggi.

## 4. Test

`Dialog`, in un test suo:

- aperto, il dialogo ha il titolo e non ha `sheet-grabber`
- l’overlay, padre del dialogo, ha `align-items: center` e `justify-content: center`
- il riquadro ha `border-radius: 18px` e l’altezza massima sopra, e non un’altezza fissa
- c’è un solo bottone «Chiudi»; la ✕, il backdrop e Esc chiamano `onClose`
- chiuso, il dialogo non c’è

Il test del foglio in `chrome.test.tsx` resta: `max-height: 90vh` e niente altezza fissa. I test di swipe dell’appuntamento non si toccano.

Scheda cane: lo switch di Bagno si trova ancora per nome dentro il gruppo «Bagno», e quel gruppo contiene anche il campo prezzo. `getByText` della frase «nascondi questo servizio per questo cane» non trova un nodo. «+ Contatto» apre un dialogo «Contatto» senza maniglia; «Aggiungi contatto» si comporta come oggi.

Il test dei servizi che lascia aperto il dialogo dopo un salvataggio fallito continua a trovare quel dialogo. In impostazioni, con Tag caratteristiche aperto, «Chiudi» è un solo bottone e lo chiude, come fa già il test. Ripristina, Ordina e l’appuntamento restano fogli con la maniglia.
