# Groomly — Registro Excel (Piano 2)

Data: 2026-10-22
Stato: sezioni approvate in chat. Questa stesura va riletta prima del piano di implementazione. Nessun codice finché il piano non è eseguito.

Questo piano aggiunge il file `Registro Groomly.xlsx` e il pulsante **Registro Excel** nella card **Dati e backup**. Il file si costruisce dal JSON del raccoglitore, senza scaricare le foto. I link alle cartelle arrivano dopo, con lo ZIP e con Drive, tramite lo stesso generatore.

La specifica del raccoglitore (`docs/superpowers/specs/2026-10-22-backup-raccoglitore-design.md`) prevale su questo documento per codici, fuso, lapidi e lettura del salone. Le correzioni v1.1 in `docs/Groomly_Backup_PIANO.md` prevalgono sul resto di quel piano. Qui non si trasformano le foto e non si inventa una colonna email: un contatto ha nome, ruolo e telefono.

## Decisioni chiuse

1. `registroXlsx(dati, opzioni)` è pura. `dati` è un `GroomlyDati`. `opzioni` ha `now: Date` e, in seguito, `risolviLink?: (percorsoBackup: string) => string`. Restituisce un `Blob` `.xlsx`.
2. Il pulsante chiama `raccogliBackup(now, { includiByte: false })` e poi il generatore. Nessun byte di foto viene letto.
3. Senza `risolviLink` la colonna «Cartella foto» non esiste. Con `risolviLink`, il testo della cella è «Apri cartella» e il collegamento è il valore restituito per il `percorsoBackup` del cane o della visita. Questo piano non passa la funzione.
4. Le date si leggono dalla forma del JSON di backup, stringhe ISO. `dogFromDoc` accetta solo millisecondi e su queste date metterebbe «adesso». Il Registro non lo usa.
5. Il giorno mostrato e il mese degli incassi sono quelli di `Europe/Rome`. L’ora in cella è testo `HH:mm` di Roma. La data Excel è la mezzanotte UTC di quel giorno di Roma, così un computer in un altro fuso mostra comunque `22/10/2026` per l’istante `2026-10-22T21:30:00.000Z`.
6. Un appuntamento con `kind: 'personale'` non entra in nessun foglio. `classify` lo segna già come escluso.
7. «Esegui ora», il toggle, Esporta, Ripristina, il chip e `uploadBackupFile` restano come sono. Il chip non si aggiorna: questo file non è un backup verificato.
8. Sul telefono il file si apre con `shareFiles`. Nel browser, dove il menu Condividi non c’è, si usa `downloadAnchor`. Annullare la condivisione non mostra un avviso.
9. Senza rete il messaggio è «Serve la connessione per creare il backup». Ogni altro errore del pulsante è «Esportazione non riuscita».
10. Alla fine dell’implementazione si pubblica: la scheda cambia. Questa specifica, da sola, non alza `APP_VERSION`.

## Fuori da questo lavoro

- ZIP, Google Drive, ripristino, schermata di avanzamento.
- Sostituire Esporta, «Esegui ora», il toggle o il chip.
- Mostrare `C0001` sulla scheda del cane.
- Collegare le cartelle. `risolviLink` resta un parametro, non un pulsante.
- Riformattare il telefono in gruppi `+39`. Si scrive la stringa com’è salvata.
- Campi che l’app non ha: email, giorno di nascita. L’anno di nascita, se c’è, è un numero.
- Prezzi personalizzati del cane, campi liberi, chiusure. Restano nel JSON, non nel Registro.

## 1. Flusso

Il pulsante sta in `SettingsPage`, card **Dati e backup**, su una riga nuova sotto Esporta e Ripristina, a tutta larghezza. La scritta è **Registro Excel**. Durante la preparazione è disabilitato e `aria-busy`.

1. `raccogliBackup` assegna i codici come già fa e restituisce `dati` senza byte.
2. `registroXlsx` scrive il file.
3. Il nome è sempre `Registro Groomly.xlsx`.
4. Su piattaforma nativa, `shareFiles([{ blob, name }], 'Registro Groomly')`. Altrimenti `downloadAnchor`.

`backup_offline` mostra il messaggio dell’`AppError`. `isShareCancel` resta in silenzio. Il resto va in toast «Esportazione non riuscita».

## 2. Come si leggono i dati

I cani, le visite, i servizi e le impostazioni sono i record del JSON, con date ISO. Una visita senza `start` si salta. Un cane senza voce in `codiciCane.byId` resta nel foglio, con Codice vuoto, e si ordina in fondo per id. Il raccoglitore, quando il pulsante lo chiama, la voce ce l’ha già.

Il padrone di un cane è il contatto con `isPrimary`, altrimenti il primo di `contacts`, altrimenti `contact`. Il nome è il testo tagliato agli estremi.

L’importo di una visita è `appointmentAmount`. La durata in minuti è `actualDurationMin` se è un numero, altrimenti `sumDuration` dei servizi. I nomi dei servizi si uniscono con ` e `.

Le foto visibili di un cane sono: una se `photo` è una stringa non vuota, più le voci di `gallery`, più le foto delle sue visite. Lo stesso file citato in due posti conta due volte, perché si vede due volte.

Lo stato del cane:

| Condizione | Testo |
|---|---|
| id in `deletedDogs.ids` | Nascosto |
| `status` `deceduto` | Deceduto |
| `status` `non_in_cura` | Non più in cura |
| altrimenti | Attivo |

Taglia, sesso e carattere usano `SIZE_LABEL`, `SEX_LABEL` e `TEMPERAMENT_LABEL`. Sesso assente: cella vuota.

Lo stato di una visita:

| `status` | Testo |
|---|---|
| `completato` | Completato |
| `programmato` | Programmato |
| `disdetto` | Disdetto |
| `non_venuto` | Non venuto |

I clienti usano la stessa chiave di `contaClienti`: cifre del telefono, altrimenti il nome tagliato e in minuscolo, altrimenti l’id del cane. Il numero di righe è quindi il conteggio clienti del manifest. Nome e telefono mostrati sono quelli del primo cane del gruppo nell’ordine del foglio Cani. I cani nella cella sono `C0001 Fido, C0045 Luna`, in ordine di codice.

Il nome del salone è `settings.business.salonName` tagliato, altrimenti `settings.business.name` tagliato, altrimenti `Groomly`. È lo stesso ordine di `buildManifest`.

## 3. Fogli

Il file si apre su **Cani**. L’ordine dei fogli è quello di questa sezione.

### Cani

Una riga per ogni cane del JSON, lapide compresa se il documento esiste. Ordine per codice, poi per id.

| Colonna | Contenuto |
|---|---|
| Codice | `byId[id]`, altrimenti vuoto |
| Cane | nome |
| Razza | vuota se manca |
| Taglia | Piccola, Media, Grande |
| Sesso | Maschio, Femmina, oppure vuoto |
| Anno | `birthYear` se è un numero, altrimenti vuoto |
| Carattere | Bravo, Agitato, Mordace |
| Padrone | come al §2 |
| Telefono | testo, la stringa salvata |
| Appuntamenti | numero dei completati |
| Primo | data del completato con `start` minore |
| Ultimo | data del completato con `start` maggiore |
| Prossimo | data del `programmato` con `start` maggiore o uguale a `now` più vicino |
| Ultimo servizio | nomi dei servizi di quell’ultimo completato |
| Ultimo prezzo | importo di quell’ultimo completato |
| Totale speso | somma degli importi completati |
| Tempo medio | media di `actualDurationMin` dei completati che ce l’hanno. Se non ce n’è nessuno, vuoto |
| Note | nota critica, a capo, poi le note. Una sola delle due occupa la cella da sola |
| Foto | conteggio del §2 |
| Stato | tabella del §2 |

Primo, Ultimo, Prossimo e Ultimo prezzo restano vuoti se non c’è una visita che li definisce.

### Appuntamenti

Una riga per ogni visita, `start` decrescente, poi id. Colonne: Data, Ora, Codice, Cane, Razza, Padrone, Telefono, Servizio, Prezzo, Durata, Stato, Note, Foto. Note è `adjustmentNote`. Foto è il numero di foto di quella visita. Cane, razza, padrone, telefono e codice vengono dal cane. Se il cane manca, quelle celle restano vuote e la riga resta.

### Clienti

Ordine per nome del padrone, poi per la chiave. Colonne: Padrone, Telefono, Cani, Appuntamenti, Totale speso, Ultimo appuntamento. Appuntamenti e totale sono i completati dei cani del gruppo. Ultimo appuntamento è la data dell’ultimo di quei completati.

### Incassi mensili

Una riga per ogni mese di Roma, dal mese del primo appuntamento incassato fino al mese di `now`, compresi i mesi a zero in mezzo. Se non c’è nessun incassato, il foglio ha solo l’intestazione.

Entra una visita se `classify(visita, now)` è `incassato`. L’importo è `appointmentAmount`. Il mese è quello di Roma di `start`.

Colonne della tabella: Mese, Appuntamenti, Totale, Media. Il mese è `ott 2026`, con le abbreviazioni italiane `gen feb mar apr mag giu lug ago set ott nov dic`. La media è il totale diviso gli appuntamenti, arrotondata al centesimo. Con zero appuntamenti la media è vuota.

Sotto la tabella, fuori da essa, una riga in grassetto per ogni anno presente: `Totale 2026`, somma degli appuntamenti, somma dei totali, e la media dell’anno (totale dell’anno diviso gli appuntamenti dell’anno, al centesimo). Così una somma della colonna Totale non conta l’anno due volte.

Su un telefono in ora italiana, gli appuntamenti e il totale di un mese coincidono con la pagina Incassi per quel mese: stessi inclusi, stesso importo. Il bordo del mese è Roma, non il fuso del telefono.

### Listino

Due tabelle nello stesso foglio, separate da una riga vuota.

**Servizi**, una riga per ogni servizio, in ordine di `order` poi di nome. Colonne: Nome, Tipo (Principale o Extra), Prezzo piccola, Prezzo media, Prezzo grande, Durata piccola, Durata media, Durata grande, Attivo (`sì` o `no`).

**Razze**, una riga per ogni voce di `settings.priceSheet.razze`, nell’ordine del listino. Colonne: Razza, Taglia, Voce, Tipo (`Da`, `Fisso`, `Valutazione`), Prezzo. `valutazione`, o un prezzo assente, lascia il prezzo vuoto. Se `priceSheet` manca, la tabella Razze ha solo l’intestazione.

### Info

Celle in colonna, non una tabella filtrabile:

- Salone: il nome del §2
- Creato il: `romeIso(now)`
- Versione app: `APP_VERSION`
- Cani, clienti, appuntamenti, foto, file di listino: gli stessi numeri che calcolerebbe `buildManifest` per questi dati. Gli appuntamenti del manifest includono i personali, quindi possono essere di più delle righe del foglio Appuntamenti
- Frase: «La colonna delle cartelle foto arriva con il backup completo.»
- Legenda: Completato verde, Programmato grigio, Disdetto ambra, Non venuto rosso

## 4. Formato

Intestazione di ogni tabella: fondo `#3A5BA0`, testo bianco, grassetto. Righe alternate con `#E6ECF8`, lo stesso chiaro del primario dell’app. Filtri attivi. Prima riga ferma su tutti i fogli dati. Su Cani sono ferme anche Codice e Cane.

Larghezza di colonna fra 10 e 40 caratteri, sul contenuto. Le note vanno a capo. Telefono e Ora sono testo. Anno, conteggi, durate e foto sono numeri interi. Date e prezzi sono numeri: `dd/mm/yyyy` e `€ #,##0.00`. Tempo medio è un numero di minuti con un decimale, non un orario Excel.

Sul foglio Appuntamenti la colonna Stato ha un fondo: Completato `#E2F4EA`, Programmato `#F5F7FA`, Disdetto `#FCF0D8`, Non venuto `#FBE6E4`.

Proprietà del documento: titolo `Registro Groomly`, autore il nome del salone del §2.

## 5. Prove

I test caricano il `Blob` con `exceljs`, come `earningsXlsx.test.ts`. Excel, Google Fogli e LibreOffice non partono da Vitest. Aprirli una volta, senza richiesta di riparazione, è la prova a mano prima della pubblicazione.

Il generatore, con un `GroomlyDati` fisso:

- I fogli sono Cani, Appuntamenti, Clienti, Incassi mensili, Listino, Info, e Cani è il foglio attivo.
- Il cane di prova ha codice `C0001`, il telefono è testo, il prezzo è un numero, e l’istante `2026-10-22T21:30:00.000Z` è la data Excel del 22 ottobre 2026 e l’ora `23:30`.
- Due cani con lo stesso telefono sono una riga in Clienti.
- Un id in `deletedDogs.ids` ha stato Nascosto ed è nel foglio.
- Un appuntamento personale non ha riga.
- Senza `risolviLink` non c’è una colonna «Cartella foto». Con una funzione che restituisce `https://esempio/cartella`, la cella dice «Apri cartella» e il collegamento è quell’indirizzo.
- Il totale di un mese di Roma è la somma di `appointmentAmount` sulle visite che `classify` segna come incassate.
- Trecento cani e duemila visite finiscono in meno di dieci secondi. È un tetto sulla macchina di test, non una misura del telefono.

Sulla scheda, il pulsante **Registro Excel** c’è, è disabilitato mentre lavora, e il file consegnato si chiama `Registro Groomly.xlsx`. Senza rete il toast è «Serve la connessione per creare il backup». Esporta, Ripristina, «Esegui ora» e il toggle restano coperti dai test che già hanno.

## Criteri di accettazione

- [ ] Il pulsante è sulla card, sotto Esporta e Ripristina, e non cambia gli altri controlli.
- [ ] Il file ha i sei fogli, le colonne di questa specifica e nessun byte di foto.
- [ ] Date, ora e mesi sono quelli di Roma, anche se il processo di test non è in Italia.
- [ ] I clienti coincidono con `contaClienti`. Gli incassi di un mese coincidono con `classify` e `appointmentAmount`.
- [ ] `risolviLink` aggiunge la colonna e il collegamento. Senza, la colonna non c’è.
- [ ] I test del §5 passano.
- [ ] Dopo l’implementazione, e solo allora, si alza la patch e si pubblica.
