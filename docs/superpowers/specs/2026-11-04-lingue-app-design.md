# Cinque lingue, T4 App

Parte di `2026-11-04-cinque-lingue-design.md`, ondata 2. Le regole di lingua sono decise lì. Il contratto con il server è in `2026-11-04-lingue-server-design.md`, sezione «Contratti».

## Cosa cambia

Tutto ciò che si legge in `src/` passa dal catalogo o da una tabella in cinque lingue. Restano fuori solo i dati salvati e i nomi fissi, elencati in `src/i18n/frasiAmmesse.ts` con il motivo accanto.

## Come

- **Codice fuori dalle schermate.** `frase(chiave, valori)` in `src/i18n/frase.ts` legge la lingua attiva. I file condivisi con le functions usano `t(lingua, ...)`: `linguaLocale` tocca `localStorage` e il server non ce l'ha.
- **Errori dell'app.** `erroreApp(codice)` in `src/data/errors.ts` costruisce l'`AppError` con il testo nella lingua attiva.
- **Errori del server.** `messaggioCallable`, `messaggioErroreBeta`, `usePiano` e `LinkCondivisione` leggono `details.codice` con `codiceErroreServer` e traducono con `fraseErrore`. Il `message` italiano non si mostra mai. Senza codice si vede la frase generica. Fa eccezione l'Admin Manager, che non si traduce.
- **Decisioni condivise col server.** `salonAccess`, `prenotazione`, `disponibilita`, `funzioniPiano`, `slug` tengono le frasi italiane, che il server trasforma in codice. Quando le usa il client, come in `ProPage`, passano da `codiceDaMessaggio`.
- **Schemi zod.** Nascono una volta sola, quindi il messaggio è una funzione che si legge quando si valida.
- **Valori interni.** Le costanti usate per confronto ora sono codici (`prezzo-na`, `listino-illeggibile`, `gruppoTitolo: 'mese'`) o chiavi del catalogo (`vociMenu`, icone).

## Listino iniziale

Il testo di `seedPriceSheet` resta salvato. Si traduce alla visualizzazione solo se coincide con il testo iniziale, con `nomeVoceListino`, anche nella stampa. Le voci mancanti (intestazione, razze, `Bagno + sistemazione`, `Pelo corto`, `Pelo lungo`) sono state aggiunte. Un test controlla che ogni testo iniziale abbia la traduzione.

## Note di rilascio

Arrivano da GitHub, in italiano. Il testo di una release può avere sezioni per lingua:

```
- Agenda più veloce
[en]
- Faster diary
[fr]
- Agenda plus rapide
```

Chi ha una lingua senza sezione legge «Correzioni e miglioramenti» nella sua lingua, mai l'italiano.

## PDF ed Excel

- **PDF incassi:** Helvetica di jsPDF scrive WinAnsi. Provato con ß, é, œ, Œ, €, virgolette e spazio insecabile: escono bene. Lo spazio stretto U+202F no, e `euro()` non lo usa. Un test controlla le frasi del riepilogo in tutte le lingue.
- **Listino:** diventa immagine dai font Inter, Oswald, Quicksand e Dancing Script. Controllata la tabella dei caratteri di ogni font: hanno tutti i caratteri delle cinque lingue.
- **Registro Excel e LEGGIMI:** nella lingua dell'app. Nomi delle tabelle interne fissi (`TabCani`), perché Excel non vuole spazi né doppioni.

## Cosa non si traduce

- **Nomi su Drive.** `Groomly Backup completo – …` e la cartella restano fissi: la conservazione delle copie in Android cerca quel prefisso, e il registro `ULTIMO` si sovrascrive per nome.
- **Avvisi scritti dall'operatore.** Sono testi di una persona: compaiono come sono stati scritti.
- **Valori salvati:** `Premio fedeltà` sulla visita, i ruoli del proprietario, le voci proposte nel listino. In pagina si leggono tradotti.
