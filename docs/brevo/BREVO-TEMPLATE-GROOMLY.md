# Template email Brevo di Groomly (per Cursor)

Creati da Claude il 25/10/2026 nell'account Brevo "Groomly" (robmass83@gmail.com), mittente **id 3 = "Groomly" <noreply@groomlyapp.it>**.
Stile identico ai template 3 e 4 (logo, barra azzurra, pulsanti). **Tutti creati NON attivi**: si attivano dal pannello Brevo (Template › attiva) quando la funzione che li usa va in produzione.

> ⚠️ Il **template 5 (invito)** è già usato dal codice pubblicato (1.1.93, `INVITE_TEMPLATE_ID = 5`): finché non era stato creato, gli inviti veri fallivano. **Va attivato** per far funzionare gli inviti in produzione.

| ID | Nome | Usato da | Parametri (`params.*`) |
|---|---|---|---|
| 3 | Conferma email v2 | già in uso | `link` |
| 4 | Reimposta password v2 | già in uso | `link`, `email` |
| **5** | Invito nel salone | `createInvite` (già in uso) | `link`, `salonName`, `roleLabel` |
| **6** | Prenotazione ricevuta | P-H2b, subito dopo l'invio | `salone`, `cliente`, `cane`, `giorno`, `ora`, `servizi`, `prezzo`?, `indirizzo`?, `telefonoSalone`, `linkStop`, `logoSalone`? |
| **7** | Prenotazione confermata | P-H2c, Accetta | come 6 + `linkCalendario`, `linkMaps`, `linkGestisci` |
| **8** | Nuovo orario proposto | P-H2c, Altro orario | come 6 + `giornoProposto`, `oraProposta`, `linkAccetto`, `linkRifiuto`, `messaggio`? |
| **9** | Prenotazione non possibile | P-H2c, Rifiuta | come 6 + `linkPrenota`, `messaggio`? |
| **10** | Richiesta scaduta | scadenza 48 h | come 6 + `linkPrenota` |
| **11** | Disdetta ricevuta | disdetta dal link | come 6 + `linkPrenota` |
| **12** | Promemoria appuntamento | M2 / piano 7b | come 6 + `linkConfermo`, `linkSposta` |

Note per il codice:
- `?` = facoltativo (il template lo nasconde se vuoto, con `{% if %}`).
- `giorno` già formattato in italiano, es. "martedì 4 novembre"; `ora` "10:30"; `prezzo` già con valuta, es. "da 45 €".
- `logoSalone`: URL pubblico https del logo del salone; se vuoto compare il logo Groomly.
- Mittente nel template: noreply@groomlyapp.it. **Reply-to**: passarlo nella chiamata API (`replyTo: { email: <email del salone>, name: <nome salone> }`) così le risposte dei clienti vanno al salone.
- `linkStop`: link firmato per l'opt-out email del cliente (obbligatorio nelle email ai clienti).
- Gli ID in costanti (`BREVO_TEMPLATE = { invito: 5, ricevuta: 6, confermata: 7, proposta: 8, rifiutata: 9, scaduta: 10, disdetta: 11, promemoria: 12 }`), mai scritti sparsi.
- Il piano gratuito Brevo ha 300 invii al giorno in totale: vedi tetto `emailOggi` del piano.
- I sorgenti HTML sono in `docs/brevo/` (file `0.html` = template 5 … `7.html` = template 12).
