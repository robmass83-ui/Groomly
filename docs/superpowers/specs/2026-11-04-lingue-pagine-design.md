# Cinque lingue, T6 Pagine e negozio

Parte del progetto `2026-11-04-cinque-lingue-design.md`, dove le regole di lingua sono decise. Contratto con il server: `2026-11-04-lingue-server-design.md`, sezione «Contratti». Non restano domande aperte per Roberto.

## Cosa cambia

- **Regola della pagina.** `?lang=` valido, poi lingua del browser, poi inglese. Vale per `lingua-pagina.js`, `hosting/azione` e `hosting/s/pagina.js`. In `pagina.js` la lingua decisa dal server (`dati.lang`) sta tra `?lang=` e il browser, così testata e modulo coincidono.
- **Link già inviati.** I parametri restano validi. Cambiando lingua dalla riga in alto restano anche `attesa`, `giorno` e `ora`.
- **Lingua al server.** `inviaRichiesta`, `iscrivitiAttesa` e `confermaAttesa` mandano `lingua`, sempre.
- **Errori.** `pagina.js` legge `corpo.error.details.codice` e lo traduce con la sua tabella. Codice ignoto: `t.ko`. Il `message` italiano non si mostra mai.
- **Policy.** Blocchi `fr` e `de` in privacy, termini, DPA, eliminazione account. In cima a en, es, fr, de la stessa riga: in caso di dubbio fa fede il testo italiano.
- **Titoli.** `lingua-pagina.js` cambia il titolo della scheda con gli attributi `data-titolo-<lingua>` di `<html>`.
- **Android e Play.** `values-fr`, `values-de`, `scheda-fr.md`, `scheda-de.md`. Le schede it, en, es dicono cinque lingue.

## Approcci

Per le policy ho valutato tre strade:

- **Blocchi nella stessa pagina (scelto).** È come funzionano già en ed es. Una sola URL, `?lang=` già gestito.
- Una pagina per lingua. Cambierebbe le URL e i link di app ed email.
- File di testo e generatore. Aggiunge un passo di build per pagine che cambiano di rado.

## Link rotti e copie vecchie

`/termini.html`, `/dpa.html` ed `/elimina-account.html` non esistono sul sito: esistono solo le cartelle. I link interni passano a `/termini/`, `/dpa/`, `/elimina-account/`, `/privacy/`, gli stessi di `linkLegale`.

`hosting/privacy.html` era ferma alla versione del 23 ottobre. Diventa uguale a `hosting/privacy/index.html`, così l'indirizzo vecchio continua a funzionare col testo in vigore.

`docs/legal/*.html` aveva solo l'italiano. Diventa copia esatta delle pagine di `hosting`. Un test tiene uguali le copie.

## Cosa non si fa

- Il testo italiano delle policy cambia solo nei link rotti.
- `functions/src/piano/paginaPubblica.ts` e `src/lib/paginaPubblica.ts` non si toccano: le richieste a T5 sono in `D:\Groomly\.claude\lingue-note\richieste-t6.md`.

## Test

`hosting/lingue.test.ts`: tabelle con cinque lingue e stesse chiavi, codici del contratto, riga delle lingue, riga del testo italiano, nessun link rotto, copie uguali, regola di lingua eseguita su `lingua-pagina.js`. `hosting/s/paginaAttesa.test.ts`: `lingua` nelle richieste, `?lang=`, errori per codice.
