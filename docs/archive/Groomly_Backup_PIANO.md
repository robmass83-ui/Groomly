# Groomly — Backup completo: manuale "Salva su…" + automatico su Google Drive + Registro Excel

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

> **Documento di specifica per Cursor + /superpowers**
> Versione 1.0 — ottobre 2026
> Progetto: `D:\Groomly` · Firebase project `groomly-3128b` (piano Blaze)

---

## ⚠️ Correzioni v1.1 — prevalgono su tutto il resto del documento

Dall'analisi del codice reale:

1. **Stack**: React + Capacitor su Android. Excel con **exceljs**, ZIP con una libreria JS in streaming (es. `fflate`/`zip.js`) scrivendo su file con `@capacitor/filesystem`, condivisione con `@capacitor/share`. Lavori lunghi: tenere l'app in primo piano con schermata di avanzamento (valutare un plugin di foreground service solo se necessario).
2. **Dati**: tutto sotto `salons/{id}/` (cani, appuntamenti, servizi, chiusure, impostazioni, file). **Non esiste una collezione clienti**: il padrone è il `contact` sul cane (più eventuali altri contatti). Quindi:
   - il foglio Excel **"Clienti"** si costruisce **raggruppando i contatti dei cani** (stesso telefono normalizzato = stesso cliente; a parità di telefono vuoto, stesso nome); colonna "Altri contatti" per i contatti aggiuntivi;
   - nel JSON non c'è una sezione `clienti`: si esportano le collezioni reali così come sono.
3. **Foto e file del listino NON sono in Firebase Storage** (il bucket non esiste): sono documenti Firestore nella collezione `files` **del salone attivo**. Dalla diagnosi: il salone reale in uso è **`salon/shared`** (82 cani, 112 appuntamenti, 10 servizi, 20 file) ed è l'archivio vivo, non un residuo. Il raccoglitore **non deve mai scrivere a mano il percorso**: usa la stessa funzione che l'app usa oggi per risolvere il salone attivo (`salon/shared` o `salons/{id}`). I byte stanno in `files/{id}/full/data` (oggi tutti con `chunkCount: 0`); sopra i 700 KB in `files/{id}/chunks/{n}` (600 KB l'uno). Il mime va letto dal documento (oggi 12 foto su 20 sono **WebP**): estensione del file nel backup = quella del mime vero, **nessuna conversione**. Quindi ovunque il piano dice "Storage":
   - **stima dimensione** = somma delle dimensioni dichiarate nei documenti file (o, se assente, somma della lunghezza dei chunk);
   - **scaricare una foto** = leggere i suoi chunk da Firestore, ricomporli e **decodificarli in un vero file binario `.jpg/.png`** (le foto in `data:` / base64 non vanno mai messe così nello ZIP o su Drive);
   - **incrementale Drive** = si leggono da Firestore solo i file non ancora caricati (indice degli ID già caricati), per risparmiare letture;
   - **ripristino** = riscrivere i file a chunk in `salons/{id}/files` solo se mancanti.
   - Nota per il futuro (fuori da questo lavoro): tenere le foto in Firestore pesa su letture e spazio; spostarle su Storage sarà un progetto separato.
4. **Backup attuale**: "Esegui ora" e il toggle giornaliero salvano una copia **dentro le impostazioni sul telefono** (non fuori); "Esporta" scarica un JSON o uno ZIP con foto ancora in `data:`; "Ripristina" accetta solo `.json`; il chip può mostrare una data anche senza alcun file esterno. **Non esiste alcun collegamento a Google Drive.** Nel nuovo sistema:
   - la copia interna nelle impostazioni **va eliminata** (non è un backup: se si perde il telefono o l'account, si perde anche lei);
   - **Ripristina** deve continuare ad accettare i vecchi `.json` esportati (lettore del formato vecchio in B3);
   - il chip mostra solo backup **usciti dal telefono e verificati** (file ZIP creato e condiviso, o istantanea completata su Drive).
5. **Frequenza default**: **ogni giorno** (vedi B4).
6. **Nessuna schermata cambia** al di fuori della card "Dati e backup" e della sua nuova sottopagina: il codice `C0001` non appare nella scheda del cane.

---

## 0. Istruzioni già eseguite (non rifare)

1. **Prima di scrivere codice** analizza:
   - la card **"DATI E BACKUP"** già presente in Impostazioni (vedi §9 per com'è oggi: chip data ultimo backup, pulsante "Esegui ora", toggle "Backup automatico giornaliero", pulsanti "Esporta" e "Ripristina"). ⚠️ **Oggi questa sezione NON funziona.** Prima di tutto fai una **diagnosi scritta** (in `docs/backup-diagnosi.md`): cosa dovrebbe fare ogni elemento, dove si rompe (errore, permessi, codice mancante, job mai eseguito, file mai creato), e perché. La causa va capita per **non ripetere lo stesso errore** nel nuovo sistema. Poi:
     - **la grafica della card resta** (stessa posizione, stessi elementi, stesso stile), si estende solo come descritto al §9;
     - **la logica dietro i pulsanti va sostituita** con quella di questo piano;
     - se dalla diagnosi risulta che esistono già file di backup validi creati in passato, aggiungere in B3 un lettore del vecchio formato; altrimenti non serve;
     - la data nel chip ("19 ott 2026") oggi potrebbe essere falsa: deve mostrare solo backup **verificati come riusciti**;
   - lo stack (Android nativo / Capacitor / Flutter / PWA) e la struttura reale dei dati Firestore (cani, padroni/clienti, appuntamenti, foto prima/dopo, listino, file allegati al listino, logo, incassi, impostazioni);
   - dove e come sono salvate le foto in Firebase Storage (percorsi, compressione, metadati).
   **Adatta nomi e percorsi di questo documento alla struttura reale.** I nomi dei campi qui sotto sono indicativi.
2. Il lavoro è diviso in **sezioni B0 → B6**: ognuna può diventare un piano `/superpowers` separato. Ordine al §9.
3. Ogni sezione ha *Obiettivo · Specifica · Casi limite · Criteri di accettazione*. I criteri sono la definizione di "finito".

---

## 1. Requisiti fondamentali

| # | Requisito |
|---|---|
| R1 | Il backup è **completo**: tutti i cani con tutte le informazioni, i padroni, **tutto lo storico appuntamenti** (anche disdetti/non venuto), **tutte le foto** di ogni cane, listino (anche per razza), file allegati, logo, impostazioni. |
| R2 | Un **Registro Excel** ben formattato, pronto per filtrare e cercare, collegato alle **cartelle delle foto** di ogni cane. |
| R3 | **Gratis**: nessun servizio a pagamento, nessun server intermedio. Lo spazio usato è quello dell'utente (memoria del telefono o il suo Google Drive). |
| R4 | Due modalità: **manuale "Salva su…"** (ZIP condiviso con il menu Condividi, va su qualsiasi cloud) e **automatico periodico su Google Drive**. |
| R5 | Ogni backup deve essere **ripristinabile** dall'app. Un backup senza ripristino non è un backup. |
| R6 | Funzione **gratuita** per tutti i piani. |
| R7 | Stile UI attuale di Groomly (pulito, compatto, chiaro/scuro). Nessuna modifica alle altre schermate. |
| R8 | Il dominio `firebaseapp.com` non deve mai comparire all'utente (file, link, testi). |
| R9 | Le foto si scaricano da Firebase Storage **una volta sola** quando possibile (backup Drive **incrementale**), per non consumare traffico e quote inutilmente. |

---

## 2. Struttura del backup (uguale per ZIP e Drive)

```
Groomly Backup – {NomeSalone} – 2026-10-22 11.30/
├── LEGGIMI.txt
├── Registro Groomly.xlsx
├── dati/
│   ├── manifest.json          ← versione formato, data, app, conteggi, checksum
│   └── groomly-dati.json      ← tutti i dati per il ripristino
├── cani/
│   ├── C0001 - Fido - Barboncino (Rossi Mario)/
│   │   ├── profilo.jpg
│   │   ├── 2026-10-15 - Bagno e taglio/
│   │   │   ├── prima-01.jpg
│   │   │   ├── prima-02.jpg
│   │   │   └── dopo-01.jpg
│   │   ├── 2026-08-20 - Bagno/
│   │   │   └── dopo-01.jpg
│   │   └── altre foto/        ← foto non legate a un appuntamento
│   ├── C0002 - Luna - Meticcio (Bianchi Anna)/
│   │   └── …
│   └── …
└── listino/
    ├── logo.png
    └── file/                  ← file caricati con "Aggiungi file"
```

### 2.1 Codice cane stabile
- Ogni cane riceve un **codice permanente** `C0001`, `C0002`, … (campo `codiceCane`), assegnato in ordine di creazione alla prima esecuzione e poi a ogni nuovo cane (contatore in transazione Firestore).
- Il codice **non cambia mai**, anche se si rinomina il cane o cambia padrone. È il collegamento tra Excel e cartella: nel Registro cerchi "Fido", leggi `C0001`, apri la cartella che inizia con `C0001`.
- Il codice **non compare nelle schermate dell'app** (la scheda cane resta identica): vive solo nel database, nell'Excel e nei nomi delle cartelle. Nell'Excel si cerca comunque per nome del cane.

### 2.2 Regole sui nomi di file e cartelle
- Funzione unica `nomeSicuro(testo)`: rimuove `< > : " / \ | ? *` e caratteri di controllo, sostituisce `+` con "e" (es. "Bagno + taglio" → "Bagno e taglio"), comprime spazi, max 60 caratteri, niente punto o spazio finale. Le lettere accentate restano (Windows/Mac/Drive le gestiscono).
- Cartella cane: `{codice} - {nome} - {razza} ({cognome nome padrone})`. Se manca la razza o il padrone, omettere la parte.
- Cartella appuntamento: `{AAAA-MM-GG} - {servizio}`. Due appuntamenti con foto lo stesso giorno: suffisso ` (2)`.
- Foto: `prima-01.jpg`, `dopo-01.jpg`, … in ordine di scatto. Estensione originale mantenuta.
- Test unitari su `nomeSicuro` (accenti, emoji, simboli, stringhe lunghe, vuote).

### 2.3 `manifest.json`
```json
{
  "formato": "groomly-backup",
  "versioneFormato": 1,
  "creatoIl": "2026-10-22T11:30:00+02:00",
  "app": { "versione": "x.y.z" },
  "salone": { "id": "...", "nome": "..." },
  "conteggi": { "cani": 312, "clienti": 280, "appuntamenti": 1840, "foto": 2950, "fileListino": 3 },
  "tipo": "completo" | "solo-dati",
  "fotoIncluse": true,
  "checksum": { "groomly-dati.json": "sha256..." }
}
```

### 2.4 `groomly-dati.json`
- Esportazione **fedele** di tutti i documenti rilevanti (con ID originali, timestamp in ISO 8601), raggruppati per collezione: `cani`, `clienti`, `appuntamenti`, `listino`, `listinoRazze`, `impostazioni`, `servizi`, ecc. (secondo la struttura reale).
- Ogni foto nel JSON ha: `id`, `caneId`, `appuntamentoId?`, `tipo` (profilo/prima/dopo/altra), `percorsoStorage`, **`percorsoBackup`** (percorso relativo nella struttura sopra), `scattataIl`.
- Esclusi: token, segreti, dati di altri saloni, campi tecnici di sistema non necessari al ripristino.
- Campo `versioneFormato` per permettere migrazioni future al ripristino.

### 2.5 `LEGGIMI.txt`
Testo in italiano semplice: cosa contiene il backup, **"estrai lo ZIP prima di aprire l'Excel, altrimenti i link alle cartelle non funzionano"**, come ripristinare da Groomly, data del backup, conteggi.

---

## 3. B0 — Raccoglitore dati (fondamenta)

### Obiettivo
Un modulo unico `raccogliDatiBackup(opzioni)` usato da ZIP, Drive ed Excel, così i tre producono sempre gli stessi dati.

### Specifica
- Legge da Firestore tutte le collezioni del salone (letture in pagine da 500, con progresso).
- Costruisce un modello in memoria normalizzato: `cani[]` con padrone, appuntamenti ordinati per data, foto con `percorsoBackup` calcolato, statistiche (vedi Excel).
- Opzione `includiFoto: boolean`, `soloFotoDopo?: Date` (per l'incrementale).
- Calcola la **stima dimensione** (somma dei `size` dai metadati Storage) *prima* di scaricare, per mostrarla all'utente.
- Non tiene le foto in RAM: restituisce un elenco di "foto da scaricare" che i writer (ZIP/Drive) elaborano **in streaming**, una alla volta (o 3 in parallelo al massimo).

### Criteri di accettazione
- [ ] Assegnazione `codiceCane` a tutti i cani esistenti senza duplicati (test con concorrenza: due dispositivi aperti).
- [ ] Conteggi del raccoglitore = conteggi reali in Firestore (test su emulatore con dataset di prova di almeno 300 cani / 2.000 appuntamenti).
- [ ] Stima dimensione mostrata in < 5 s su dataset di prova.

---

## 4. B1 — Registro Groomly (Excel)

### Obiettivo
Un file `.xlsx` professionale, pronto all'uso: apri, filtri, cerchi il cane, clicchi e trovi la cartella con le foto.

### Libreria
Serve una libreria che supporti **stili, tabelle Excel, collegamenti ipertestuali, riquadri bloccati e filtri**:
- JavaScript/Capacitor/PWA → **exceljs** (gratuita, MIT). ⚠️ *Non* usare SheetJS Community Edition: non salva gli stili.
- Flutter → pacchetto `excel` (verificare supporto hyperlink) o generazione equivalente.
- Android nativo → libreria leggera compatibile (verificare peso APK; Apache POI è molto pesante).

### Fogli

**Foglio 1 — "Cani" (registro principale, si apre su questo)**

| Colonna | Contenuto | Formato |
|---|---|---|
| Codice | `C0001` | testo, grassetto |
| Cane | nome | testo, grassetto |
| Razza | | testo |
| Taglia / Sesso / Data nascita | se presenti nell'app | data `gg/mm/aaaa` |
| Carattere | testo ("Bravo", "Mordace", …) | testo |
| Padrone | Cognome Nome | testo |
| Telefono | formato leggibile `+39 333 123 4567` | testo (mai numero, per non perdere lo zero/+) |
| Email | se presente | testo |
| N° appuntamenti | completati | numero |
| Primo appuntamento | | data |
| Ultimo appuntamento | | data |
| Prossimo appuntamento | se fissato | data |
| Ultimo servizio | | testo |
| Ultimo prezzo | | valuta `€ #.##0,00` |
| Totale speso | somma completati | valuta |
| Tempo medio | se registrato | `h:mm` |
| Note | note profilo (lame usate, ecc.) | testo a capo, larghezza fissa |
| N° foto | | numero |
| **Cartella foto** | testo "Apri cartella" con **collegamento** | hyperlink blu sottolineato |
| Stato | Attivo / Archiviato | testo |

**Foglio 2 — "Appuntamenti"** (uno per riga, tutti, dal più recente)
Data · Ora · Codice · Cane · Razza · Padrone · Telefono · Servizio · Prezzo · Durata · Stato (*Completato / Programmato / Disdetto / Non venuto*) · Note · Foto (n°) · **Cartella foto** (link alla cartella dell'appuntamento, se ha foto).

**Foglio 3 — "Clienti"**
Padrone · Telefono · Email · Cani (codici e nomi, es. "C0001 Fido, C0045 Luna") · N° appuntamenti · Totale speso · Ultimo appuntamento.

**Foglio 4 — "Incassi mensili"**
Mese (`ott 2026`) · Appuntamenti completati · Totale incassato · Media per appuntamento. Riga **Totale anno** per ogni anno in grassetto. (Riusa la logica della pagina Incassi esistente: i numeri devono coincidere.)

**Foglio 5 — "Listino"**
Servizi e prezzi; listino per razza (Razza · Servizio · Prezzo).

**Foglio 6 — "Info"**
Nome salone, data e ora del backup, versione app, conteggi, legenda colori, istruzione "estrai lo ZIP prima di usare i link".

### Formattazione (tutti i fogli dati)
- Ogni elenco è una **Tabella Excel** vera (stile a righe alternate, chiaro e sobrio, intestazione blu ardesia coerente con l'app, testo bianco grassetto) → filtri e ordinamento già pronti, anche dopo aver aggiunto righe.
- **Prima riga e prima/seconda colonna bloccate** (Codice + Cane sempre visibili scorrendo).
- Larghezze colonne calcolate sul contenuto (min/max), altezza righe automatica per le note.
- Date come **vere date** Excel (non testo), così si possono filtrare per mese/anno.
- Valute come numeri con formato euro.
- Foglio "Appuntamenti": **formattazione condizionale** leggera sulla colonna Stato (verde Completato, grigio Programmato, arancione Disdetto, rosso Non venuto).
- Nome file: `Registro Groomly.xlsx`; proprietà documento (titolo, autore = nome salone).
- Il file si apre correttamente in **Excel (Windows/Mac), Google Fogli, LibreOffice**.

### Collegamenti alle cartelle (due modalità)
- **Modalità ZIP**: link **relativi** (`cani/C0001 - Fido - …/`). Funzionano su PC/Mac una volta estratto lo ZIP.
- **Modalità Drive**: link **assoluti** alle cartelle su Google Drive (`https://drive.google.com/drive/folders/{id}`). Funzionano ovunque, anche da telefono, aprendo l'Excel da Drive.
- Un unico generatore con un parametro `risolviLink(cartella)`.

### Esportazione Excel "al volo"
Pulsante separato **"Esporta Registro Excel"** che genera solo il file `.xlsx` (senza foto, colonna "Cartella foto" omessa o con link Drive se il backup Drive è collegato) e apre il menu Condividi. Utile per consultazione rapida o per il commercialista.

### Criteri di accettazione
- [ ] Il file si apre senza avvisi di riparazione in Excel, Google Fogli, LibreOffice.
- [ ] Filtri attivi su tutte le tabelle; date filtrabili per anno/mese; importi sommabili.
- [ ] Da ZIP estratto su Windows: clic su "Apri cartella" apre la cartella giusta del cane.
- [ ] Da Drive: clic apre la cartella giusta su Drive.
- [ ] Generazione < 10 s per 300 cani / 2.000 appuntamenti su un telefono di fascia media.
- [ ] Totali del foglio Incassi = pagina Incassi dell'app.

---

## 5. B2 — Backup manuale "Salva su…" (ZIP)

### Obiettivo
Un tocco → file ZIP completo → menu Condividi → l'utente sceglie dove salvarlo (Drive, Dropbox, OneDrive, email, memoria del telefono…).

### UI (nella sezione Backup esistente delle Impostazioni)
1. Pulsante **"Crea backup e salva su…"**.
2. Foglio di scelta:
   - **Completo con foto** — "circa 1,2 GB" (stima da B0);
   - **Solo dati ed Excel** — "circa 2 MB" (senza foto, per un backup veloce).
3. Avviso se la stima supera lo spazio libero sul telefono (con margine 20%) o se non c'è Wi-Fi e il download supera 50 MB ("Ti consiglio il Wi-Fi").
4. **Schermata di avanzamento**: fase corrente (Lettura dati → Download foto 340/2.950 → Creazione Excel → Compressione), barra, tempo stimato, pulsante **Annulla**. Su Android le operazioni lunghe girano come **servizio in primo piano con notifica** (il backup continua anche se lo schermo si spegne o l'utente cambia app).
5. Al termine: menu **Condividi** con il file `Groomly Backup – {Salone} – {data}.zip`; in più pulsante "Salva nella cartella Download".
6. Riga di stato nella sezione Backup: "Ultimo backup manuale: 22/10/2026 11:30 · 1,2 GB".

### Specifica tecnica
- ZIP scritto **in streaming su file temporaneo** (mai tutto in memoria). Le JPEG si aggiungono **senza ricompressione** (metodo STORE): sono già compresse, si risparmia tempo e batteria.
- Download foto da Storage con al massimo 3 in parallelo e **riprova** (3 tentativi con attesa crescente). Le foto che falliscono definitivamente vengono elencate in `dati/foto-mancanti.txt` e nel riepilogo finale (il backup non si blocca per una foto).
- Al termine verifica: apertura dello ZIP generato e controllo che contenga `manifest.json` e il numero di file atteso.
- File temporanei eliminati dopo la condivisione (o al successivo avvio).
- *(Opzionale, fase successiva)* ZIP protetto da **password** (AES) per chi vuole maggiore riservatezza.

### Casi limite
- Annullamento a metà → nessun file parziale lasciato in giro.
- Cane senza foto → la cartella viene comunque creata (vuota con file `nessuna-foto.txt`? **No**: si crea solo se ha foto; nell'Excel "N° foto = 0" e niente link).
- App chiusa dal sistema durante il backup → al riavvio messaggio "Il backup è stato interrotto, vuoi riprovare?".

### Criteri di accettazione
- [ ] Backup completo di un dataset di prova (300 cani, ~3.000 foto) senza crash di memoria su un telefono con 4 GB di RAM.
- [ ] Lo ZIP si apre su Windows e Mac con gli strumenti di sistema; struttura identica al §2.
- [ ] Il file condiviso arriva correttamente su Google Drive, Dropbox e OneDrive tramite le rispettive app.

---

## 6. B3 — Ripristino da file ZIP

### Obiettivo
Riportare i dati in Groomly da un backup (cambio telefono, errore, account nuovo).

### UI
1. Sezione Backup → **"Ripristina da backup"** → "Da file sul telefono" (selettore file di sistema, accetta `.zip`) / "Da Google Drive" (vedi B5).
2. **Anteprima**: nome salone, data backup, conteggi (cani, appuntamenti, foto), confronto con i dati attuali ("Ora nell'app: 298 cani · Nel backup: 312 cani").
3. Modalità:
   - **Unisci** (default): aggiunge ciò che manca e aggiorna i documenti con data di modifica più vecchia; non cancella nulla;
   - **Sostituisci tutto**: l'app torna esattamente come nel backup. Richiede di scrivere "SOSTITUISCI" per confermare.
4. **Prima di qualsiasi ripristino** l'app crea automaticamente un backup "solo dati" dello stato attuale (salvato in locale e, se collegato, su Drive) → "Annulla ripristino" possibile.
5. Avanzamento con fasi e foto ricaricate su Storage.

### Specifica
- Validazione: `manifest.formato`, `versioneFormato` (migrazioni se più vecchio; blocco con messaggio chiaro se più nuovo dell'app), checksum di `groomly-dati.json`.
- Scrittura Firestore a **batch da 400** operazioni, ripresa da dove si era fermata in caso di errore.
- Foto: ricaricate su Storage **solo se mancanti** (confronto per ID/percorso), mantenendo gli stessi percorsi.
- I `codiceCane` del backup vengono mantenuti; il contatore viene aggiornato al massimo trovato.
- Mai ripristinare campi di abbonamento/piano o dati di sistema (vedi piano Controlli avanzati: scritti solo dal server).

### Criteri di accettazione
- [ ] Ciclo completo su emulatore: backup → cancellazione dati → ripristino → dati identici (confronto automatico documento per documento) e foto visibili nei profili.
- [ ] "Unisci" non duplica cani/appuntamenti già presenti.
- [ ] Backup di sicurezza pre-ripristino sempre creato; "Annulla ripristino" funzionante.

---

## 7. B4 — Backup automatico su Google Drive

### Obiettivo
L'utente collega Google Drive una volta; da quel momento Groomly salva da solo un backup completo e aggiornato nel **suo** Drive, a intervalli regolari, senza costi.

### 7.1 Collegamento
- Sezione Backup → **"Backup automatico su Google Drive"** → pulsante "Collega Google Drive".
- Login/autorizzazione Google con il **solo permesso `drive.file`** (l'app vede e gestisce solo i file e le cartelle che crea lei). **Non usare** permessi Drive completi: richiedono una verifica di sicurezza a pagamento da parte di Google. Da verificare in Google Cloud Console i requisiti della schermata di consenso OAuth per `drive.file` al momento dello sviluppo.
- Implementazione Android con le API di autorizzazione Google attuali (Credential Manager + Authorization API / Google Sign-In equivalente per lo stack). Token gestiti dalla libreria Google, mai salvati in Firestore.
- Dopo il collegamento: mostra l'account ("roberto@gmail.com") e lo spazio libero su Drive; pulsante "Scollega".

### 7.2 Struttura su Drive
```
Groomly Backup – {NomeSalone}/
├── Foto cani/                         ← SPECCHIO INCREMENTALE (foto caricate una sola volta)
│   ├── C0001 - Fido - Barboncino (Rossi Mario)/
│   │   ├── profilo.jpg
│   │   └── 2026-10-15 - Bagno e taglio/ …
│   └── …
├── Listino/ (logo, file)
├── Backup/
│   ├── 2026-10-22 03.00/              ← UNA CARTELLA PER OGNI BACKUP (istantanea dati)
│   │   ├── Registro Groomly.xlsx      (link assoluti alle cartelle in "Foto cani")
│   │   ├── groomly-dati.json
│   │   ├── manifest.json
│   │   └── LEGGIMI.txt
│   ├── 2026-10-15 03.00/
│   └── …
└── Registro Groomly – ULTIMO.xlsx     ← sempre aggiornato, da aprire per la consultazione rapida
```
- Le **foto** non vengono ricaricate a ogni backup: solo le **nuove** dall'ultimo backup (incrementale). Così il traffico e il tempo restano minimi.
- Gli **ID Drive** di cartelle e foto si salvano in Firestore (es. `saloni/{s}/backupDrive/indice` + campo `driveId` sulla foto) per sapere cosa è già stato caricato anche cambiando telefono.
- **Rinomina cane / cambio padrone** → la cartella su Drive viene rinominata (stesso ID, il codice iniziale resta uguale).
- **Foto eliminata nell'app** → spostata in `Foto cani/_Eliminate/` al backup successivo (non cancellata subito: protezione da errori). Opzione "Svuota foto eliminate più vecchie di 90 giorni".

### 7.3 Pianificazione
- Frequenza: **Ogni giorno (default, coerente con il toggle attuale "giornaliero") / Ogni settimana / Ogni mese**. Grazie all'incrementale il backup giornaliero carica solo le novità, quindi resta leggero.
- Condizioni: "Solo con Wi-Fi" (default **sì**), "Solo in carica" (default no).
- Meccanismo doppio per affidabilità:
  1. **Job periodico di sistema** (Android WorkManager o equivalente dello stack) con i vincoli sopra, di notte quando possibile;
  2. **Controllo all'apertura dell'app**: se l'ultimo backup riuscito è più vecchio della frequenza scelta + 1 giorno → backup in sottofondo con piccola notifica.
- **Un solo dispositivo** esegue il backup per salone: lock in Firestore (`backupLock` con scadenza 30 min) per evitare due backup contemporanei da due telefoni.
- Pulsante **"Esegui backup ora"**.

### 7.4 Conservazione
- Mantiene le ultime **10** istantanee in `Backup/` (impostabile 5/10/20) + **una al mese** per gli ultimi 12 mesi. Le più vecchie vengono eliminate dall'app (solo cartelle create da lei).
- Le foto in `Foto cani/` non vengono mai duplicate né eliminate dalla pulizia delle istantanee.

### 7.5 Stato e avvisi
- Riga di stato: "Ultimo backup: oggi 03:00 ✓ · 12 foto nuove · Drive: 3,1 GB liberi".
- Errore → notifica + stato rosso con motivo chiaro (nessuna connessione, Drive pieno, autorizzazione revocata → "Ricollega Google Drive").
- **Nessun backup riuscito da più di 2 cicli** → banner discreto in Home "Il backup automatico non funziona da 15 giorni" (tocco → sezione Backup).
- Drive con meno spazio della stima → avviso prima di iniziare.

### Criteri di accettazione
- [ ] Primo backup completo su Drive con struttura identica al §7.2.
- [ ] Secondo backup: carica **solo** le foto nuove (verificato dai log: 0 foto ricaricate se nulla è cambiato).
- [ ] Rinomina cane → cartella rinominata su Drive, link Excel ancora validi.
- [ ] Revoca permesso da account Google → errore gestito con richiesta di ricollegamento.
- [ ] Due telefoni dello stesso salone: un solo backup per ciclo.
- [ ] `Registro Groomly – ULTIMO.xlsx` apribile da Google Drive sul telefono, link alle cartelle funzionanti.

---

## 8. B5 — Ripristino da Google Drive + rifiniture

- "Ripristina da backup" → **"Da Google Drive"**: elenco delle istantanee (data, conteggi, dimensione) lette dai `manifest.json` in `Backup/`.
- Ripristino identico a B3 (anteprima, Unisci/Sostituisci, backup di sicurezza), con foto prese da `Foto cani/` su Drive.
- Funziona anche su **telefono nuovo / app reinstallata**: dopo il login a Groomly e il collegamento allo stesso account Google, l'app ritrova la cartella `Groomly Backup – …` (creata da lei, quindi visibile con `drive.file`; se non visibile dopo reinstallazione, permettere di selezionarla con il selettore file di Google, che concede l'accesso).
- **Privacy**: nella sezione Backup breve testo "I backup contengono dati dei tuoi clienti (nomi, telefoni, foto). Sono salvati solo nel tuo Google Drive o dove scegli tu; Groomly non li conserva altrove."

### Criteri di accettazione
- [ ] Ripristino completo su un telefono "pulito" partendo solo da Drive.
- [ ] Elenco istantanee caricato in < 5 s.

---

## 9. B6 — UI della sezione Backup (riepilogo) e test finali

### Com'è oggi la card "DATI E BACKUP" (Impostazioni, tra "ASPETTO" e "PERSONALIZZA")
1. Riga in alto: chip verde con data ultimo backup ("● 19 ott 2026") + pulsante "Esegui ora".
2. Riga: "Backup automatico giornaliero" + toggle.
3. Riga: pulsante pieno blu "Esporta" + pulsante contornato "Ripristina".

### Come diventa (stessa card, stessa grafica, estesa al minimo)
1. **Riga stato** (invariata nell'aspetto):
   - chip **verde** "● 19 ott 2026" = ultimo backup automatico **riuscito e verificato**;
   - chip **arancione** "● 8 giorni fa" se più vecchio della frequenza scelta + 1 giorno;
   - chip **rosso** "● Errore" se l'ultimo tentativo è fallito (tocco → motivo e soluzione, es. "Ricollega Google Drive");
   - chip **grigio** "● Mai eseguito" se non c'è ancora nessun backup;
   - sotto il chip, una riga piccola grigia: "su Google Drive · roberto@gmail.com" (o "Google Drive non collegato");
   - "Esegui ora" = backup su Google Drive adesso (se Drive non è collegato, apre il collegamento).
2. **Riga toggle**: il testo diventa "Backup automatico su Google Drive"; sottotitolo piccolo "Ogni giorno · solo Wi-Fi". Attivare il toggle la prima volta avvia il collegamento a Google Drive. Tocco sulla riga (non sul toggle) → pagina **"Backup automatico"** con: account collegato + "Scollega", frequenza (giorno/settimana/mese, **default ogni giorno** per coerenza con il testo attuale), solo Wi-Fi, solo in carica, numero di backup da conservare, "Svuota foto eliminate".
3. **"Esporta"** (stesso pulsante) → bottom sheet:
   - **Backup completo con foto** (ZIP · ~1,2 GB) → "Salva su…";
   - **Solo dati ed Excel** (ZIP · ~2 MB) → "Salva su…";
   - **Registro Excel** (solo .xlsx) → "Salva su…".
4. **"Ripristina"** (stesso pulsante) → bottom sheet: **Da file sul telefono** · **Da Google Drive** (elenco istantanee), poi il flusso di B3/B5.

Nessuna nuova sezione in Impostazioni: tutto resta nella card esistente e nella sottopagina "Backup automatico". Stile identico a quello attuale, chiaro/scuro.

### Dati dell'app da includere (visti nelle Impostazioni attuali)
- **Profilo salone** (nome, titolare, P.IVA, telefono, indirizzo) → foglio "Info" dell'Excel e JSON.
- **Servizi e durate** (servizi e tempi stimati) → foglio "Listino" e JSON.
- **Tag dei cani** → colonna **"Tag"** nel foglio "Cani" (separati da virgola, filtrabile) e JSON.
- **Archivio animali** → colonna "Stato" = Attivo / **Archiviato**; gli archiviati sono inclusi nel backup.
- **Promemoria "Mensili"** e **Notifiche** (impostazioni) → JSON, e foglio Excel "Promemoria" se sono dati per cane.
- Nell'app la sezione si chiama **"Animali"**: se oltre ai cani ci sono altri animali (es. gatti), il foglio si chiama **"Animali"**, il codice resta `C0001…` e la cartella `cani/` diventa `animali/`. Verificare nel codice.

### Test finali
- [ ] Dataset di prova grande (300 cani, 2.000 appuntamenti, 3.000 foto) e piccolo (5 cani).
- [ ] Telefono di fascia media, rete lenta (simulata), interruzione rete a metà.
- [ ] Ciclo completo: backup automatico → ripristino su telefono nuovo → dati e foto identici.
- [ ] Nessuna modifica alle altre schermate dell'app (regressione visiva).

---

## 10. Costi (perché è gratis)

| Voce | Costo |
|---|---|
| Spazio backup | Telefono o Google Drive **dell'utente** (15 GB gratis per account) |
| API Google Drive con `drive.file` | Gratis |
| Letture Firestore per backup | Poche migliaia per backup: dentro la quota gratuita giornaliera |
| Download foto da Firebase Storage | Il backup Drive è **incrementale** (ogni foto scaricata una volta sola); il backup ZIP completo scarica tutto, quindi va proposto come operazione occasionale. Verificare le quote gratuite di download di Storage del progetto e, se serve, suggerire all'utente lo ZIP "solo dati" per i backup frequenti |
| Librerie (exceljs, zip, ecc.) | Open source gratuite |

---

## 11. Ordine di implementazione (piani /superpowers)

| Piano | Contenuto | Dipende da |
|---|---|---|
| **0** | Diagnosi del backup attuale che non funziona (`docs/backup-diagnosi.md`) — nessuna modifica al codice | — |
| **1** | B0 Raccoglitore dati + `codiceCane` + `nomeSicuro` + formato JSON/manifest | 0 |
| **2** | B1 Registro Excel (incluso "Esporta Registro Excel") | 1 |
| **3** | B2 Backup manuale ZIP "Salva su…" | 1, 2 |
| **4** | B3 Ripristino da ZIP | 3 |
| **5** | B4 Google Drive: collegamento + backup automatico incrementale | 2, 4 |
| **6** | B5 Ripristino da Drive + B6 rifiniture UI e test finali | 5 |

Ogni piano termina con test verdi e verifica manuale su dispositivo in chiaro e scuro.
