# Scheda sicurezza dei dati di Google Play

Da copiare a mano in Play Console › Norme › Contenuti dell'app › Sicurezza dei dati. Vale per la versione con Privacy 3. Va compilata dopo aver collegato Analytics e attivato Crashlytics. Non è una consulenza legale.

## Domande generali

| Domanda | Risposta |
|---------|----------|
| L'app raccoglie o condivide dati utente? | Sì |
| I dati sono criptati in transito? | Sì |
| Gli utenti possono chiedere la cancellazione dei dati? | Sì, nell'app e da `https://groomlyapp.it/elimina-account/` |
| Condivisione con terze parti | No. I fornitori sono responsabili del trattamento e lavorano per conto di Groomly: per Google non è «condivisione» |
| Identificatore pubblicitario | No, il permesso `AD_ID` è tolto dal manifest |

## Dati raccolti

| Categoria Play | Tipo di dato | Raccolto | Condiviso | Obbligatorio | Finalità |
|----------------|--------------|----------|-----------|--------------|----------|
| Informazioni personali | Nome | Sì | No | Sì | Funzionalità dell'app, Gestione account |
| Informazioni personali | Indirizzo email | Sì | No | Sì | Funzionalità dell'app, Gestione account, Comunicazioni dello sviluppatore |
| Informazioni personali | Numero di telefono | Sì | No | Facoltativo | Funzionalità dell'app |
| Informazioni personali | Indirizzo | Sì | No | Facoltativo | Funzionalità dell'app |
| Informazioni personali | Altre informazioni (partita IVA o codice fiscale del salone) | Sì | No | Facoltativo | Funzionalità dell'app |
| Informazioni finanziarie | Altre informazioni finanziarie (incassi del salone) | Sì | No | Facoltativo | Funzionalità dell'app |
| Informazioni finanziarie | Cronologia acquisti (stato dell'abbonamento, quando i piani saranno accesi) | Sì | No | Facoltativo | Funzionalità dell'app, Gestione account |
| Foto e video | Foto | Sì | No | Facoltativo | Funzionalità dell'app |
| Messaggi | Altri messaggi in-app (assistenza e suggerimenti) | Sì | No | Facoltativo | Assistenza |
| Attività nell'app | Interazioni con l'app | Sì | No | Facoltativo, solo col sì del titolare | Analisi |
| Informazioni e prestazioni dell'app | Log degli arresti anomali | Sì | No | Facoltativo, solo col sì del titolare | Analisi |
| Informazioni e prestazioni dell'app | Diagnostica | Sì | No | Facoltativo, solo col sì del titolare | Analisi |
| Dispositivo o altri ID | ID dispositivo o altri ID (token per le notifiche e ID casuale dell'installazione) | Sì | No | Il token è legato alle notifiche, l'ID di installazione solo col sì del titolare | Funzionalità dell'app, Analisi |

## Dati non raccolti

Posizione, contatti del telefono, calendario, file e documenti del telefono, audio, salute, dati di pagamento (carta). I pagamenti, quando saranno accesi, passano da Google Play.

## Controllo

- Se aggiungi un fornitore o un dato, aggiorna insieme questa tabella e `hosting/privacy/index.html`.
- Dopo la pubblicazione controlla in Play Console che l'APK non dichiari `AD_ID`.
