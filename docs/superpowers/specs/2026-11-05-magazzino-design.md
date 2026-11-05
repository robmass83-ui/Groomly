# Magazzino

**Perché.** Prima funzione della pagina Altro: un elenco dei prodotti del salone, con ditta e codice a portata di mano quando si riordina. Mockup: artboard «A) Elenco con filtri» e «Scheda prodotto».

**Obiettivi.** Elenco con conteggio, ricerca per nome, ditta o codice, filtri per categoria, tasto + e scheda prodotto con proposta delle ditte già inserite.

**Non obiettivi.** «Da riordinare», telefono del fornitore, scorte che calano con gli appuntamenti.

## Approcci
- **Collezione `salons/{id}/prodotti` (scelto):** come le chiusure, un documento per prodotto. Scritture indipendenti e regole per ruolo.
- Campo dentro `settings/main`: più semplice, ma il collaboratore non può scrivere le impostazioni e un elenco lungo gonfia il documento. Scartato.

## Decisioni dell'utente
- Collaboratore: vede, aggiunge e modifica; elimina solo il titolare (e il socio, stesso rango).
- Disponibile a tutti i piani, anche gratuito.
- Eliminazione definitiva dalla scheda, con conferma.

## Decisioni mie
- Rotte `/altro/magazzino`, `/altro/magazzino/nuovo`, `/altro/magazzino/:id`: la scheda Altro resta attiva.
- Solo il nome è obbligatorio. Quantità, ditta e codice si possono lasciare vuoti.
- `prodotti` è facoltativo nei backup: quelli vecchi si leggono ancora, il loro checksum non cambia e il ripristino non tocca i prodotti esistenti.
- All'eliminazione dell'account ci pensa già `recursiveDelete` sul salone.
- Sull'elenco il + del salone cede il posto al + «Aggiungi prodotto», in basso a destra come nel mockup.
- La proposta delle ditte è una fila di pulsanti sotto il campo: il `datalist` nativo è poco affidabile nella WebView Android.
- Stato vuoto con invito al primo prodotto; ricerca senza risultati con un messaggio.
