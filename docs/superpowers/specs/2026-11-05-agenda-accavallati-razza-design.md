# Agenda: visite accavallate e razza nel calendario

## Perché
Molte toelettature lavorano più cani insieme (ne asciugano uno e ne iniziano un altro), anche della stessa persona. Oggi l'app lo impedisce: chi tocca un orario occupato trova il bottone spento. Inoltre, sulle schede del calendario manca la razza, che serve a riconoscere il cane.

## Obiettivi
- Il salone inserisce e sposta visite accavallate dopo un avviso.
- Due o più visite nello stesso orario restano leggibili e toccabili in ogni vista, anche a larghezza telefono.
- La razza si vede sotto il servizio in Giorno, Settimana, lista del Mese e Home.

## Fuori dal lavoro
- Prenotazioni online: `postiLiberi`, `gestisciPrenotazione` e il riquadro della richiesta non cambiano. Una richiesta su un orario occupato resta non accettabile: il salone propone un altro orario (scelta dell'utente).
- Nessuna modifica a functions e regole.
- Il controllo della visita ripetuta dopo N settimane resta com'è: oggi non avvisa e non blocca.

## Approcci per il Giorno
- **Scelto: massimo due colonne, dalla terza visita si va sotto** nella colonna che si libera prima. Due cani restano affiancati e leggibili, il calendario sa già impilare in una colonna. Costo: la terza scheda sta un po' più in basso della sua ora, ma l'orario è scritto sulla scheda.
- Tutte impilate a larghezza piena: più leggibile, ma non si vede che sono contemporanee.
- Colonne senza limite, come oggi: con tre cani il telefono diventa illeggibile.

## Come si comporta
**Modulo.** L'orario occupato resta tratteggiato (`data-busy`), si può toccare e perde il testo barrato. Gli orari fuori apertura restano spenti.

**Avviso.** Titolo «Gli appuntamenti si accavallano, inserire lo stesso?», corpo con l'elenco delle visite coinvolte (`formSovrappone`), pulsanti «Cambia ora» e «Inserisci lo stesso», in cinque lingue. Lo spostamento usa lo stesso titolo e tiene «Sposta comunque». Stesso cane due volte alla stessa ora: stesso avviso.

**Giorno.** `placeAppointments` non supera due colonne. Via il bordo arancione delle visite accavallate: dopo l'avviso è una scelta, non un errore.

**Razza.** Un solo aiuto decide cosa mostrare: niente per ospiti senza scheda, cani senza razza e impegni personali; niente nemmeno quando la riga degli omonimi contiene già la razza.
- Giorno: riga sotto i servizi, tagliata con i puntini; l'altezza della scheda ne tiene conto.
- Settimana: sulla riga dell'icona del servizio, tagliata con i puntini, senza far crescere la scheda.
- Lista del Mese e Home: riga sotto i servizi in `AppointmentRow`.

## Lasciato a chi costruisce
Lunghezza massima della razza nelle schede della Settimana e traduzioni dei testi nuovi. La scelta di togliere il testo barrato e il bordo arancione è una proposta di Claude accettata dall'utente senza obiezioni.
