# Basse «Validazioni» — design breve

Gruppo «Validazioni» delle basse dell'audit (`docs/AUDIT-QA-2026-11-01.md`). Sono controlli piccoli e indipendenti: un design breve.

## Perché

Oggi l'app accetta dati che non hanno senso: una data di nascita che non è ancora arrivata, un peso di 1000 kg, un telefono «abc», un'email «a@b». Quei dati finiscono nella scheda del cane, nei link `tel:` e nelle email, e il salone se ne accorge solo dopo. Lo scopo è fermarli quando vengono scritti, con un messaggio chiaro, senza bloccare i casi reali.

## Decisioni (prese da me, Roberto le può cambiare)

| # | Punto | Cosa fa dopo |
|---|-------|--------------|
| 1 | Data di nascita futura | Rifiutata qualsiasi data dopo oggi, anche nell'anno in corso (`completeBirthday`, `src/lib/dogScreen.ts`). Con mese e giorno senza anno, se la data dell'anno in corso cade nel futuro si usa l'anno prima. |
| 2 | Peso | Si accettano solo cifre con una virgola o un punto, da 0,1 a 150 kg. «1e3», «0x10» e simili sono rifiutati (`weightOf`, `src/pages/DogFields.tsx`). |
| 3 | Telefono | Stessa regola che il server usa già per la pagina pubblica: da 6 a 15 cifre, ammessi spazi, `+`, `-`, `.`, `/` e parentesi. La regola esce da `src/lib/prenotazione.ts` e vale in scheda cane, Account, modulo appuntamento e lista d'attesa. Un campo telefono lasciato vuoto resta vuoto dove oggi è facoltativo. |
| 4 | Email | Il cambio email in Account usa `emailValida` (`src/lib/codaEmail.ts`) al posto del solo controllo sulla «@». Login e registrazione restano come sono, perché già rifiutano «a@b». |
| 5 | Partita IVA con «IT» | Già risolto dalla media 30. Basta un test che lo fissi e la segnalazione «risolto» nell'audit. |
| 6 | Nome del titolare | Massimo 80 caratteri, sia nel campo sia al salvataggio. |
| 7 | Nome lungo, pagina pubblica | Tutti i campi nome della pagina (`hosting/s/pagina.js`) hanno lo stesso limite del server, 80 caratteri, così il cliente non riesce a scriverne di più. Se il server rifiuta comunque, il messaggio dice quale campo è sbagliato invece di «Richiesta non valida». |
| 8 | Servizi con lo stesso nome | Non si può salvare un servizio con lo stesso nome di un altro, senza contare maiuscole, accenti e spazi (`normalizeSearch`). Il messaggio indica il servizio già esistente. |
| 9 | Visita con solo un extra | Nessun cambiamento: chi porta il cane solo per le unghie è un caso reale. Nell'audit diventa «voluto, non è un difetto». |
| 10 | «Non venuto» su una visita futura | Il pulsante compare solo dal giorno della visita in poi (`AppointmentPage.tsx`). |

## Non obiettivi

- I dati già salvati non vengono toccati: nessuna migrazione. Un vecchio telefono strano resta finché qualcuno non riapre la scheda e la salva.
- Nessun controllo nuovo sul server oltre a quelli esistenti, tranne il messaggio della pagina pubblica al punto 7.
- Grafica dei messaggi: si usano quelli di errore già presenti nei moduli, con testi in tutte le lingue dell'app.

## Approcci

1. **Regole pure in `src/lib`, testate, usate dai moduli** — scelto. Ogni controllo è una piccola funzione con i suoi test, e i moduli mostrano l'errore come fanno oggi per i campi obbligatori.
2. Solo limiti HTML sui campi (`maxLength`, `type="tel"`, `inputMode`): costa poco, ma non ferma «1e3», le date future o i nomi doppi, e non si può testare.
3. Controlli nelle regole di Firestore: proteggono anche da client vecchi, ma danno un errore generico, costano più deploy e rischiano di bloccare salvataggi di schede con dati vecchi.

## Lasciato a chi costruisce

- Dove esattamente mostrare ogni errore nel modulo, seguendo lo stile del campo vicino.
- I nomi delle nuove chiavi di traduzione.

## Verifica

- Test unitari per ogni regola (date ai bordi di oggi, pesi «1e3» «0» «150,5» «12,5», telefoni «abc» «+39 333 123 4567» «12345», email «a@b» «a@b.it», IVA «IT01234567890», nomi doppi «Bagno» / « bagno »).
- Nel browser sull'emulatore: scheda cane, Account, servizio doppio, pulsante «Non venuto» su una visita di domani e di oggi, pagina pubblica con un nome di 100 caratteri.
- Deploy: hosting (pagina pubblica). Nuova APK, perché l'app cambia.
