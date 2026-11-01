# A5 — Il collaboratore non vede i soldi del salone e non può distruggere una scheda cane

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A5. Specifica breve (lavoro piccolo-medio).

## Perché
Nel piano Salone il collaboratore lavora nell'agenda condivisa, ma oggi:
- vede incassi (i suoi) e la pagina Team promette «vede solo i propri incassi»;
- le regole Firestore gli lasciano riscrivere per intero la scheda di un cane (svuotarla), cosa che l'app non fa mai.

Roberto ha deciso che **i soldi del salone sono roba da titolare e socio**: il collaboratore non vede né l'incasso del giorno né le pagine Incassi/Report/Statistiche.

## Decisioni di Roberto
1. Sulle visite degli altri (titolare o colleghi) il collaboratore può fare tutto: vederle, spostarle, modificarle, **chiuderle con importo e metodo di pagamento**.
2. Il collaboratore **non vede**: la chip Incassi della Home (incasso di oggi), le pagine `/incassi`, `/incassi/report`, `/incassi/statistiche`. Titolare e socio come oggi.
3. Gli importi restano dentro le visite: chi aggira l'app e legge Firestore direttamente li vede ancora. **Rischio accettato** (spostarli fuori dalle visite è un lavoro grosso, sproporzionato per un salone con dipendenti).
4. Prezzi personalizzati del cane: il collaboratore li **vede e li cambia**.
5. Scheda cane: strada **A** — le regole pretendono che la scheda resti intera (vedi sotto).

## Obiettivi
1. **App, ruolo collaboratore:**
   - la chip Incassi di oggi (`src/components/earnings/EarningsTile.tsx`, usata in Home) non compare;
   - `/incassi`, `/incassi/report`, `/incassi/statistiche` portano alla Home (`replace`), anche aprendo il link a mano o con il tasto indietro di sistema (`src/app/SystemBack.tsx:43` porta a `/incassi`);
   - nessun altro punto dell'app porta a quelle pagine per lui (il builder cerca i link).
   - Il testo `proRuoloDettaglio` (`src/i18n/it.ts:1153` e le altre lingue) diventa: il collaboratore gestisce cani e appuntamenti e **non vede gli incassi**.
2. **Regole `dogs`, ruolo collaboratore** (`firestore.rules`, `match /salons/{salonId}/dogs/{dogId}`): oltre ai controlli di oggi su `status`, un `update` (e un `create`) del collaboratore è permesso solo se il documento risultante ha `name` stringa non vuota (dopo trim lato client: basta `size() > 0`), `species` presente e `contact` mappa presente. Lo stato resta `attivo`, l'eliminazione resta vietata (come oggi). Tutto il resto, prezzi compresi, resta libero.
3. **Regole `appointments`:** nessuna modifica. Si aggiungono i test che mancano: il collaboratore modifica e chiude una visita non chiusa di un altro (permesso); su una visita chiusa non può cambiare `total`, `paymentMethod`, `actualDurationMin`, `status`, `assigneeUid` (negato).
4. **Test delle regole** (`src/lib/firestoreRules.emulator.test.ts` o accanto): casi del punto 2 (svuotare la scheda negato; nome vuoto negato; modifica normale con prezzi cambiati permessa) e del punto 3.

## Non obiettivi
- Nascondere gli importi a chi legge Firestore direttamente (decisione 3).
- Nascondere l'importo dentro una singola visita o nel modulo di chiusura: il collaboratore li vede perché chiude lui le visite (scelta del controller coerente con la decisione 1).
- Cambiare cosa vede il socio.
- Recuperare schede cane già svuotate.

## Anti-obiettivi
- Bloccare una modifica normale di una scheda fatta dall'app (contatti, note, foto, prezzi): sarebbe peggio del problema. Le regole devono accettare ogni documento che `dogToDoc` produce per un cane valido.
- Rompere il lavoro offline del collaboratore.

## Approcci considerati (scheda cane)
- **A — invarianti minime nelle regole (scelta):** poche righe, test semplici, nessun impatto sull'app.
- B — elenco dei campi permessi: inutile, il collaboratore può cambiare quasi tutto.
- C — salvataggi dei cani via Cloud Function: protegge di più ma rompe l'offline; sproporzionato.

## Lasciato al builder
- Dove mettere il controllo di ruolo (hook/componente comune vs. per pagina), purché coperto da test.
- Forma esatta del controllo nelle regole (funzione `dogIntact()` o simile).
- Deploy delle regole: `firebase deploy --only firestore:rules` dopo il merge, insieme alla release APK.
