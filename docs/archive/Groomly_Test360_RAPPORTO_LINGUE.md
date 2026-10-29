# Test 360 nelle tre lingue — 26 ottobre 2026

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Solo emulatori `demo-groomly`. Nessun salone vero, nessuna lettura di `groomly-3128b`. Password degli account finti: `Test1234!`. Le email sono l’HTML di `emailMessaggio`: nessun invio Brevo.

## Titolare, tre lingue

`salone1@test.groomly`, dopo il login, dalla voce «Lingua» (non «Lingua dei clienti»).

| Lingua | Tema | Esito |
|---|---|---|
| Italiano | chiaro | «Nessun appuntamento», «DA CHIUDERE (2)», Nala, «Taglio / tosatura». |
| Inglese | chiaro | «No appointments», «TO CLOSE (2)», «Completed», «No-show», «Cancelled». Nala, Labrador e «Taglio / tosatura» restano. Non compare «Nessun appuntamento». |
| Spagnolo | chiaro | «Ninguna cita», «POR CERRAR (2)», «Completado», «No vino», «Anulado». Il nome e il servizio del salone restano. |
| Inglese | scuro | Le stesse scritte inglesi. `dataset.theme` è `dark`. |

## Giri già fatti in italiano

Stanno nel registro del kit di oggi, in `docs/PROGRESSO-PIANO.md`: titolare chiaro e scuro, socio di Padova con Pro attivo, collaboratore che non apre servizi né Pro, Laura finta con omaggio «Attivo · 1 di 3 posti», offline con «Offline Fufi3» ancora in scheda al ritorno della rete.

Il collaboratore del salone 14 non ha visto «accesso sospeso»: il seed lascia il piano acceso. Quel messaggio era stato visto il 25 ottobre spegnendo il piano a mano. Non è stato rispento in questo giro.

## Pagine e email

La pagina `hosting/salone/index.html`, con `lingua-pagina.js` e `?lang=`, mostra «Pagina del salone», «Salon page», «Página del salón». Quella pagina non ha il modulo di prenotazione: non è stata inviata una richiesta.

Dieci tipi di email (`verifica`, `reset`, `invito`, `ricevuta`, `conferma`, `proposta`, `rifiuto`, `scadenza`, `disdetta`, `promemoria`) in italiano, inglese e spagnolo. Ogni HTML ha `lang`, il logo, il titolo e il pulsante. Il nome `Luna <b>` esce come `Luna &lt;b&gt;` e il salone `Pelo & C` come `Pelo &amp; C`.
