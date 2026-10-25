# Prima di accendere gli abbonamenti — lista pronta

Preparata il 25/10/2026. Oggi Groomly è gratuito e i flag `mostraPiani` e `abbonamentiAttivi` sono spenti.
Le pagine legali (privacy, termini, DPA) **valgono già per entrambe le fasi**: dicono che oggi l'app è gratis
e contengono già le regole per quando gli abbonamenti saranno attivi (Google Play, rinnovo, disdetta,
rimborsi, IVA a carico di Google, recesso). Quando si accende il pagamento basta seguire questa lista.

> Non è una consulenza fiscale o legale: è la lista di cose da portare al commercialista e da fare nel Play Console.

## 1. Fisco (dal commercialista, prima del primo euro)
- [ ] **Partita IVA.** Gli abbonamenti sono un incasso continuativo, non occasionale: serve la partita IVA
      prima di accendere i pagamenti (probabile regime forfettario). Il codice ATECO lo sceglie il commercialista.
- [ ] **IVA verso i saloni**: la incassa e la versa **Google** (Google è il venditore per l'IVA nell'UE).
      Groomly riceve da Google l'importo netto (commissione 15% sugli abbonamenti). Il commercialista sistema
      come registrare i pagamenti di Google (fattura/autofattura verso Google Ireland).
- [ ] **Contributi INPS** e scadenze, dal commercialista.

## 2. Google Play Console
- [ ] **Profilo pagamenti** collegato al Play Console, con IBAN e dati fiscali (partita IVA).
- [ ] **Stato di «operatore commerciale» (trader, Digital Services Act)**: chi vende nell'UE deve dichiararsi
      trader. Indirizzo, telefono ed email vengono **mostrati pubblicamente** sulla scheda dell'app.
      Se non vuoi mostrare l'indirizzo di casa (Via Renoir 8), valuta una sede o un domicilio d'impresa.
- [ ] Prodotti in abbonamento: Pro 9,99 €/mese o 99,90 €/anno; Salone 19,99 €/mese o 199,90 €/anno;
      posto extra 3,99 €/mese o 39,90 €/anno. Periodo di tolleranza 7 giorni, sospensione account 30 giorni.
- [ ] **Sicurezza dei dati**: aggiungere «Informazioni finanziarie → Cronologia acquisti» (raccolta, non condivisa).
- [ ] **Classificazione dei contenuti**: alla domanda «L'app consente di acquistare beni digitali?» rispondere **Sì**.
- [ ] License tester per provare gli acquisti senza pagare (checklist §9.7 in `DA-FARE-ROBERTO.md`).

## 3. App (lo fa Cursor)
- [ ] RevenueCat: progetto, chiavi `REVENUECAT_API_KEY` e `REVENUECAT_WEBHOOK_AUTH`, pacchetto
      `@revenuecat/purchases-capacitor`.
- [ ] Accendere prima `mostraPiani` (si vedono piani e prova), poi `abbonamentiAttivi` (si può comprare).
- [ ] Avviso nell'app **15 giorni prima** che partano i pagamenti (lo promettono i termini, punto 3 e punto 8).

## 4. Pagine legali
- [ ] Aggiornare la data e la versione dei termini e della privacy. Scrivere la partita IVA accanto all'indirizzo.
- [ ] Far rileggere privacy, termini e DPA a un professionista.
- [ ] Dopo la partita IVA, se cambia, aggiornare l'indirizzo del titolare anche nel Play Console.

## Cosa è già fatto
- Email di contatto **info@groomlyapp.it** (inoltrata a Gmail con ImprovMX).
- Titolare: Roberto Masala, Via Renoir 8, 09045 Quartu Sant'Elena (CA). Foro: Cagliari.
- Termini v1.1: app gratuita oggi, regole per gli abbonamenti, recesso, IVA a carico di Google.
- Scheda Google Play in bozza, con privacy, sicurezza dei dati e classificazione.
