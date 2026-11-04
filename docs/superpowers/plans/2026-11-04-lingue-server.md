# Piano T5 Server

Spec: `docs/superpowers/specs/2026-11-04-lingue-server-design.md`.

1. Contratto scritto e copiato in `lingue-note`, prima di tutto.
2. Tabella errori in `src/i18n/errori.ts`, `erroreServer`, sostituzione di tutti gli `HttpsError`, test che lo impone.
3. `emailHtml.ts` a tabelle con fr e de; poi `emailBeta`, `emailAnnuncio`, `emailEliminazione`, `htmlEsito`.
4. Catena: `inviaRichiesta`, `iscrivitiAttesa`, `confermaAttesa`, `gestisciPrenotazione`, `rispondiRichiesta`, `dog.lingua`, `?lang=`.
5. Coda per riga in `inviaCoda` e `giraCoda`; titolo della push personale nella lingua di chi la riceve.
6. Richieste di T6 su `functions/src/piano/paginaPubblica.ts`.
7. Debiti svuotati, test, documenti, commit.
