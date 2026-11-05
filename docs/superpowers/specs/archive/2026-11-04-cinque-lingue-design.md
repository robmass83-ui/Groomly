# Groomly in cinque lingue: audit completo, francese e tedesco

Scelte di Roberto del 4/11/2026. Questo documento vale sia come progetto sia come coordinamento delle sessioni, sul modello di `2026-11-04-beta-piani-ondate-coordinamento.md`.

## Perché

Oggi parti dell'app restano in italiano quando si cambia lingua, e mancano francese e tedesco. Chi usa l'app, e chi riceve un'email o una push, deve leggere tutto nella propria lingua, senza frasi rimaste indietro.

**Fatto quando:** cambiando lingua in it, en, es, fr, de non resta nessun testo in un'altra lingua in schermate, pop-up, sottotesti, errori, email, push, notifiche locali, PDF ed Excel, pagine pubbliche, policy.

## Obiettivi

1. Aggiungere francese (`fr`) e tedesco (`de`) ovunque esistano oggi it, en, es.
2. Trovare e tradurre tutto ciò che è fuori dal catalogo, in tutte e cinque le lingue.
3. Far seguire la lingua alla persona: il titolare e i collaboratori la lingua dell'app, i clienti del salone quella del loro telefono.
4. Lasciare un test che fallisce se domani qualcuno aggiunge una frase fissa o dimentica una lingua.
5. Chiudere con un audit reale, schermata per schermata, in cinque lingue.

## Cosa non si fa

- Non si traduce ciò che scrivono le persone: nomi dei servizi creati dal salone, note, messaggi, nomi dei clienti.
- Non si cambia sistema di traduzione: niente i18next o librerie simili, si resta su `src/i18n`.
- Non si aggiungono valute: il franco svizzero e i formati svizzeri sono un progetto a parte. Il tedesco è quello di Germania (`de-DE`), con la ß. *Scelta di Claude: Roberto ha chiesto le lingue, non i mercati.*
- Non si traducono le pagine per soli operatori (`DevKitPage`, `DevBetaPage`, Admin Manager). I testi che l'Admin Manager scrive per i saloni sì (`offertaEarlyAdopter`). *Scelta di Claude: le usa solo Roberto.*

**Sarebbe un fallimento anche se tecnicamente funziona:** un italiano peggiorato; un'email al cliente nella lingua sbagliata; una schermata tedesca con testi tagliati su un telefono piccolo; link di prenotazione già inviati che smettono di funzionare; dati di `salon/shared` toccati.

## Regole di lingua decise

**App (titolare, soci, collaboratori).** Ordine: scelta fatta nelle impostazioni, poi lingua del telefono, poi inglese. Il fuso orario non conta più per la lingua: `linguaDalLuogo` esce da `leggiLinguaAttiva` e si elimina. `paeseDalFuso` resta, serve al paese fiscale.

**Chi ha già l'app.** Al primo avvio della nuova versione, chi non ha mai scelto una lingua si vede salvare come scelta quella che sta vedendo adesso, calcolata con la vecchia regola. Nessuno trova l'app cambiata da un giorno all'altro. La nuova regola vale per le installazioni nuove. T1 fa questo passaggio prima di eliminare `linguaDalLuogo`, che resta solo per questo. *Scelta di Claude.*

**Push ed email al titolare.** Seguono la lingua dell'app, letta da `accounts/{uid}.lingua`. L'app deve aggiornare quel campo a ogni avvio se la lingua attiva è cambiata, anche quando la decide il telefono. Se manca, sul server resta `'it'`: sono gli account vecchi, tutti italiani. *Scelta di Claude.*

**Clienti del salone.**
- La pagina di prenotazione, la lista d'attesa e le pagine pubbliche decidono così: `?lang=` nel link, poi lingua del browser, poi inglese. Oggi `paginaPubblica.ts` e `hosting/s/pagina.js` ripiegano sull'italiano: va cambiato.
- La pagina manda la lingua con la richiesta, e la richiesta la salva nel campo `lingua`.
- Tutte le email di quella richiesta usano `richiesta.lingua`, poi `settings.linguaClienti`, poi `'it'`. La lingua del titolare non entra nella catena: un titolare italiano con il telefono in inglese non deve scrivere in inglese ai suoi clienti italiani. Vale per ricevuta, conferma, proposta, rifiuto, scadenza, disdetta, promemoria, lista d'attesa (`postaHtml`, `inviaRichiesta`, `rispondiRichiesta`, `gestisciPrenotazione`, `giraCoda`, `scadiProposte`).
- La lingua del cliente si copia sulla scheda dell'animale (`dog.lingua`) quando la richiesta diventa cliente. La coda automatica (promemoria, pronto, recensione, auguri in `giraCoda` e `inviaCoda`) oggi sceglie una lingua per salone: passa a una lingua per riga, `dog.lingua` e poi la stessa catena di riserva. *Scelta di Claude: discende dalla decisione di Roberto.* Anche `PulsanteMessaggi` propone `dog.lingua`; la scelta manuale per numero di telefono di `linguaMessaggio` resta e vince.
- I link nelle email portano `?lang=` della stessa lingua.
- **Voce «Lingua dei clienti» in Impostazioni (scelta di Roberto).** La scrive solo il titolare (`puoScrivereLinguaClienti`). Si compila da sola al primo uso con la lingua dell'app (`primoAvvio` oggi restituisce `null`: va cambiato insieme al suo test). Per i saloni esistenti parte in italiano, come succede oggi. La aggiunge T1.

**Policy.** Privacy, termini, DPA, eliminazione account in francese e tedesco tradotti da Claude e pubblicati, con in testa una riga che dice che in caso di dubbio fa fede il testo italiano. Un legale può rivederle dopo, senza bloccare l'uscita.

**Tono.** Francese con *vous*, tedesco con *Sie*, in tutta l'app e nelle email. *Scelta di Claude:* il testo arriva anche ai clienti del salone e la forma cortese non offende nessuno. I nomi Groomly, Go, Plus, Salon, VIP non si traducono.

## Com'è fatto oggi

- Catalogo: `src/i18n/it.ts`, `en.ts`, `es.ts`, 1.965 chiavi, nessuna mancante. Letto con `useFrasi()` e `t()`.
- Fuori dal catalogo: circa 350 frasi sospette, stima da una ricerca automatica. Tre gruppi: frasi davvero fisse, tabelle con la traduzione accanto (`emailHtml.ts`, `emailBeta.ts`, `report.ts`, `listino.ts`, `components/beta/testi.ts`), messaggi di log interni che non si traducono.
- Punti più sospetti: `src/data/firebase/client.ts`, `src/data/local/auth.ts`, `src/data/local/appointments.ts`, `hooks/useAppointments|useDogs|useServices`, `src/app/UpdateNotice.tsx`, `src/data/seed/priceSheet.ts`, tutti gli `HttpsError` di `functions/src`.
- Il test `frasiFisse` guarda solo i file `.tsx`: per questo non li vede.
- Nessun punto di `src` scrive `accounts.lingua` né `settings.linguaClienti`: oggi push ed email ai clienti ripiegano sempre su `'it'`, qualunque sia la lingua dell'app.
- Le tre lingue sono scritte a mano in molti punti invece di usare `Lingua`: `linguaValida`, `LoginPage`, `NextAppointment`, `avvisoPiano`, `configPiani` (`LinguaOfferta`, `offertaEarlyAdopter`), `htmlEsito`, `settings.ts`, `actionLink`, `paginaPubblica`, `impostaPianoManuale`, `rispondiRichiesta`, `PriceSheetExportPage`, `DevBetaPage`, `hosting/lingua-pagina.js`, `hosting/s/pagina.js`, `hosting/azione`.
- Formati: `src/i18n/format.ts` ha locali, euro e separatori solo per tre lingue.
- Android: `values`, `values-en`, `values-es` con canali e permesso notifiche.
- Brevo: il template 5 (invito nel salone) è in uso, gli altri da verificare. Le email con `emailMessaggio` sono generate dal codice.
- Play: `docs/play/scheda-it|en|es.md`.

## Approcci considerati

- **Tre ondate (scelto da Roberto).** Basi, poi aree, poi audit finale. L'audit controlla il lavoro finito e si fa una volta sola.
- Prima l'audit, poi le correzioni. Dà subito un elenco, ma va rifatto dopo l'aggiunta delle due lingue.
- Una sessione per lingua. Le sessioni toccherebbero gli stessi file e userebbero parole diverse per la stessa cosa.

## Le sessioni

### Regole per ogni sessione

- Worktree suo, commit solo sul suo branch. Non fa merge su `main`, non pubblica APK, non fa deploy: lo fa la sessione di coordinamento a fine ondata.
- Fa il suo **brainstorm** (skill brainstorming), la sua spec in `docs/superpowers/specs/2026-11-04-lingue-<parte>-design.md` e il piano in `docs/superpowers/plans/` (skill writing-plans), poi esegue. Le regole di questo documento sono già decise: non si riaprono. Le domande a Roberto sono solo su ciò che resta aperto.
- Usa il glossario `docs/glossario-lingue.md`. Un termine nuovo si aggiunge lì.
- Le scelte prese senza Roberto vanno in `docs/DECISIONI-AUTOMATICHE.md`.
- Chiude con test verdi (`npm test`, test delle functions e delle regole se toccati) e `PROGRESS.md` aggiornato.
- Non cancellare worktree vecchi: le junction di `node_modules` possono svuotare la cartella principale.
- Nuove chiavi di catalogo: in un blocco unico in fondo a ogni file di lingua, con il commento della sessione (`// Lingue T4`).

### Prima di partire

La sessione di coordinamento scrive `docs/glossario-lingue.md`: i termini del mestiere e dell'app nelle cinque lingue, con il tono. Le sessioni T2 e T3 partono solo con il glossario su `main`.

### Ondata 1: basi, in parallelo

| Sessione | Contenuto | File principali |
|---|---|---|
| **T1 Basi** | `Lingua` a cinque valori con un solo elenco `LINGUE`, tutte le unioni scritte a mano sostituite; regola del telefono e passaggio per chi ha già l'app; scrittura di `accounts.lingua`; voce «Lingua dei clienti»; selettore in Impostazioni e Login; `format.ts`; test (vedi sotto) | `src/i18n/lingua*.ts`, `t.ts`, `LinguaContext.tsx`, `format.ts`, `frasiFisse*` |
| **T2 Francese** | `src/i18n/fr.ts`, tutte le chiavi | solo `fr.ts` |
| **T3 Tedesco** | `src/i18n/de.ts`, tutte le chiavi, attenzione alla lunghezza delle parole | solo `de.ts` |

Per compilare, T1 crea `fr.ts` e `de.ts` provvisori che copiano l'inglese, e nelle tabelle con la traduzione accanto mette l'inglese con il commento `// LINGUE: da tradurre`. All'unione vincono i file di T2 e T3. Il segnaposto sparisce nell'ondata 2.

### Ondata 2: aree, in parallelo, dopo l'unione dell'ondata 1

Ogni sessione lavora in tutte e cinque le lingue.

| Sessione | Contenuto | Possiede |
|---|---|---|
| **T4 App** | Frasi fisse nei `.ts` e `.tsx`, errori del client, PDF ed Excel (controllare che i font abbiano ß, é, œ), report, `listino.ts`, listino iniziale `seed/priceSheet.ts`, `UpdateNotice`, note di rilascio, Avvisi, notifiche locali | `src/` tranne `src/i18n/emailHtml.ts` |
| **T5 Server** | Email (`emailHtml`, `emailBeta`, `emailAnnuncio`, `emailEliminazione`), template Brevo in uso, push, `lingua` sulla richiesta e sulla scheda cliente, errori del server | `functions/src/*`, `src/i18n/emailHtml.ts`, `src/lib/htmlEsito.ts` |
| **T6 Pagine e negozio** | Pagine pubbliche, prenotazione, lista d'attesa, azione, policy, `lingua-pagina.js`, `docs/legal`, Android `values-fr`/`values-de`, scheda Play fr e de | `hosting/*`, `docs/legal/*`, `docs/play/*`, `android/app/src/main/res/values-*` |

**Errori del server:** le functions mettono un codice stabile in `details` e il client lo traduce in `src/i18n/errori.ts`. Le pagine pubbliche fanno lo stesso con le loro tabelle. Il messaggio italiano resta accanto al codice per le APK già installate, che non conoscono i codici: il test accetta un `HttpsError` in italiano solo se ha il codice. *Scelta di Claude.* T5 scrive l'elenco dei codici all'inizio, in `docs/superpowers/specs/2026-11-04-lingue-server-design.md`, sezione «Contratti», insieme al campo `lingua` di `inviaRichiesta`: T4 e T6 li leggono da lì.

### Ondata 3: verifica finale, dopo l'unione dell'ondata 2

**T7 Audit.** Riallinea il catalogo QA (`/qa-my-app:sync`: 36 rotte risultano cambiate). Percorre ogni rotta, modale e stato nelle cinque lingue su emulatori con dati di prova, a 320, 360 e 390 px. Genera ogni email con `campioneEmail`, ogni push, PDF ed Excel. Prova il cambio lingua in tempo reale, il telefono in lingua non prevista (portoghese → inglese), e una prenotazione fatta da browser tedesco su salone italiano. Corregge ciò che trova. Scrive `docs/audit-cinque-lingue.md` con una riga per schermata e lingua.

**Chiusura.** Unione, deploy di functions e hosting (prima dell'APK, senza `--force`, con `FUNCTIONS_DISCOVERY_TIMEOUT=60`), una sola APK firmata su release GitHub. Se serve agire su Brevo o Play Console, va in `docs/DA-FARE-ROBERTO.md`.

## Test che restano

- Stesse chiavi e stessi segnaposto `{{...}}` in tutte le lingue.
- Una frase `fr` o `de` uguale a `en` o `it` è ammessa solo se in un elenco esplicito (Email, Plus, Backup...).
- `frasiFisse` esteso ai file `.ts` di `src` e a `functions/src`, con un elenco esplicito di ciò che non si traduce (log).
- Nessuna unione `'it' | 'en' | 'es'` scritta a mano e nessun commento `// LINGUE: da tradurre`.
- Le tabelle di `hosting` hanno tutte e cinque le lingue.
- La regola di lingua: scelta, telefono, inglese; fuso ignorato.
- Le email di una richiesta seguono `richiesta.lingua`, con la catena di riserva.

## Listino già salvato

Il testo iniziale del listino (`seedPriceSheet`) resta salvato nei saloni e sembra scritto da loro. Si traduce alla visualizzazione solo quando coincide esattamente col testo iniziale, come fa `nomeServizioVisibile`, anche nella stampa in altra lingua. Se il salone l'ha cambiato, è testo suo e non si tocca. *Scelta di Claude.*

## Lasciato a chi costruisce

Come dividere le chiavi nei file, come estrarre le frasi, la struttura dei test, l'ordine interno di ogni sessione, la forma del report di audit.
