# Groomly — Ritorno dalla scheda alla lista animali

Data: 2026-10-17

Nella scheda di un animale la fascia «Indietro», a tutta larghezza e allineata a sinistra, esce. Al suo posto c’è un pulsante compatto in basso a destra, «Animali», nella zona del pollice. La barra delle sezioni resta nascosta, come oggi. Impostazioni, listino, mensili e le altre pagine tengono la freccia in alto, accanto al titolo.

## 1. Dove compare

Il pulsante sta in tre schermate, tutte e tre oggi chiuse da `PhoneShell` con `backTo="/animali"`:

- la scheda di un animale già presente;
- «Nuovo cane»;
- «Cane assente».

`BackBar` e il ramo `backTo` di `PhoneShell` si tolgono: non li usa nessun’altra pagina. La scheda non passa più `backTo`.

## 2. Il pulsante

È un link. La scritta visibile è **Animali**, con una freccia a sinistra del testo (`ArrowLeft`, nascosta allo screen reader). Il nome accessibile è «Torna agli animali». L’indirizzo è `/animali` e la navigazione usa `replace`, come la fascia di oggi: dalla lista, il tasto indietro del sistema non riapre la scheda appena chiusa.

Misure e aspetto, solo con i token già nel tema:

- altezza minima 48 px, larghezza almeno 48 px, padding orizzontale 16 px, distanza fra freccia e scritta 8 px;
- testo 15 px, peso 700, colore `var(--tx)`;
- fondo `var(--card)`, bordo 1 px `var(--line)`, raggio 16 px, ombra `var(--sh-2)`;
- premuto: il fondo passa a `var(--surf)` in 120 ms, senza spostare il riquadro;
- focus da tastiera: anello visibile 2 px `var(--pri)`, staccato di 2 px.

Posizione: fisso, z-index 20, così un dialogo, un foglio o il toast (z-index 30 e 40) lo coprono. In basso sta a `calc(12px + env(safe-area-inset-bottom, 0px))`. A destra sta a `max(12px, calc((100% - 640px) / 2 + 12px))`: 12 px dal bordo della colonna larga al massimo 640 px e centrata. Su uno schermo più largo resta dentro la colonna.

Il contenuto della scheda ha un padding inferiore di `calc(72px + env(safe-area-inset-bottom, 0px))`, così galleria, contatti e l’ultima riga restano sopra il pulsante.

## 3. Entrare e uscire

Aprire un animale resta `navigate` verso `/animali/:id`. Il tasto indietro del sistema torna alla pagina da cui si è entrati: la lista, Home, o un’altra. Il pulsante, invece, porta sempre alla lista.

All’ingresso la scheda scivola da destra di 16 px fino al posto, in 180 ms, ease-out. Parte solo al montaggio della pagina: entrare in modifica, aprire un foglio o un dialogo non la rifà. Con `prefers-reduced-motion: reduce` non c’è spostamento. L’uscita non è animata: il ritorno alla lista è immediato.

Uscire senza salvare abbandona le modifiche ancora solo nel modulo. Non c’è una conferma nuova. **Salva** scrive, **Annulla** resta nel modulo.

Lo scorrimento della lista è già in `sessionStorage` (`groomly.dogs-list-scroll`) e al ritorno si ripristina. Chip, ricerca e ordinamento restano come oggi: vivono nello stato della lista e, rientrando, ripartono dai valori iniziali. Questa modifica non li memorizza.

## 4. Prove

I test della scheda che oggi cercano il link «Indietro» e l’elemento `back-bar` cercano il link «Torna agli animali», con `href` `/animali`, fuori dall’intestazione. Vale per la scheda, per «Nuovo cane» e per l’abbandono di una modifica o di una foto non salvata.

I link «Indietro» dell’intestazione, in Impostazioni, listino, mensili e nelle altre pagine, restano con quel nome e quel posto.
