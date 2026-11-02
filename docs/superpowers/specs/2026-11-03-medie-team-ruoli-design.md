# Medie «Team e ruoli» gruppo B (audit 16, 17) — design

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione Medie → «Team e ruoli», punti 16-17. Dettagli: `test-results/audit/findings/team.md`.

## Perché
Il collaboratore vede tasti che sembrano funzionare ma che il server rifiuta in silenzio (listino, «Correggi»), e da Elimina account riceve testi da titolare e arriva al backup completo con «Ripristina da un file». Il titolare non può cambiare il ruolo di una persona senza toglierla e reinvitarla. Obiettivo: ogni ruolo vede solo ciò che può fare, e il ruolo si cambia dall'app.

## Cosa cambia

### 16 — Il collaboratore vede solo ciò che può fare
- **Listino** (`src/pages/ListinoPage.tsx`): per il collaboratore il listino è in sola lettura. Spariscono «Aggiungi il tuo listino prezzi», rinomina ed elimina dei file, «Gestione listino», «Aggiorna prezzi», «Gestisci» e ogni altra azione che oggi lo rimanda a Impostazioni. Vede e apre i file e i prezzi come oggi.
- **«Correggi chiusura»** (`src/pages/AppointmentPage.tsx`, e il modulo `AppointmentForm.tsx` dove una visita chiusa si modificherebbe): su una visita `completato` il collaboratore non vede «Correggi»; al suo posto la riga «Per correggere la chiusura chiedi al titolare». Vale per tutte le visite chiuse, anche le sue. Le regole Firestore restano come sono.
- **Elimina account** (`src/pages/EliminaAccountPage.tsx`) per socio e collaboratore di un salone altrui (`membro`, già calcolato nella pagina):
  - primo passo: «Si cancella solo il tuo account. I dati del salone restano al titolare.» al posto dell'elenco «Profilo, salone, cani…»;
  - il passo «Prima salva una copia» (che apre il foglio Backup con «Ripristina da un file») non c'è;
  - ultimo passo: «Scrivi ELIMINA» e si accetta solo `ELIMINA` (non il nome del salone del titolare).
  - Il titolare resta come oggi.
- Il foglio Backup aperto da `openBackup` in `SettingsPage.tsx` non si apre per il collaboratore (difesa in più se ci arriva da altre strade).

### 17 — Cambio di ruolo; «Esci dal salone» c'è già
- **Cambio di ruolo** nella pagina Team (`src/pages/ProPage.tsx`): accanto a «Revoca», per ogni socio o collaboratore diverso da chi guarda, un tasto «Rendi socio» / «Rendi collaboratore». Conferma:
  - verso socio: «Rendere <nome> socio? Avrà il pieno controllo del salone, incassi compresi.»
  - verso collaboratore: «Rendere <nome> collaboratore? Non vedrà più gli incassi e non potrà cambiare servizi, listino e impostazioni.»
  - «Annulla» / «Conferma». Usa la callable esistente `changeMemberRole` (`callChangeMemberRole` in `client.ts`). Lo vedono titolare e socio; il titolare non si può cambiare (già vietato dal server).
  - Il server oggi richiede il piano Salone acceso: resta così (il cambio di ruolo ha senso solo con il team attivo; senza Salone c'è solo «Togli», gruppo A).
- **Esci dal salone**: esiste già come «Torna al mio salone» in Impostazioni per ogni socio e collaboratore (A7) e nella schermata di blocco (gruppo A). Nessun lavoro: si segna nell'audit.
- **Sospensione / riattivazione**: decisione di Roberto, non si fa. Resta Revoca (e un nuovo invito per riportare la persona).

## Approcci considerati
- «Correggi» del collaboratore: **A, nasconderlo con una riga di spiegazione** (scelta di Roberto: regole invariate, importi fuori dalla sua portata come deciso con A5) contro B, cambiare le regole per lasciargli correggere le sue chiusure.
- Cambio di ruolo: **A, tasto accanto a «Revoca» con conferma** (scelta di Roberto: diretto, usa la callable esistente) contro B, un foglio per persona con ruolo e azioni.
- Listino, Elimina account: una sola strada sensata (nascondere ciò che il ruolo non può fare; testi e passi da membro).

## Non obiettivi
- Nessuna sospensione.
- Nessun cambio alle regole Firestore né alle callable.
- Nessun cambio per titolare e socio nel listino e in Elimina account.

## Decisioni di Claude (da controllare)
- Il socio può cambiare il ruolo degli altri membri (così fa già il server); nessuno vede il tasto sul proprio nome.
- La riga al posto di «Correggi» compare anche sulle visite chiuse del collaboratore stesso.
- Il foglio Backup non si apre per il collaboratore nemmeno da `openBackup`.

## Lasciato al costruttore
- Testi esatti in en/es.
- Come la persona a cui cambia il ruolo vede il cambio sul suo telefono (verificare che l'app rilegga il ruolo; se serve, al prossimo avvio basta).
- Test: unità per Listino (collaboratore senza azioni, titolare con), AppointmentPage (collaboratore senza «Correggi» e con la riga), EliminaAccountPage (membro: testo, niente backup, solo ELIMINA), SettingsPage (`openBackup` ignorato dal collaboratore), ProPage (tasto ruolo, conferma, chiamata, nessun tasto su se stessi né sul titolare); verifica nel browser sull'emulatore a 390 e 360 px.

## Rilascio
Solo APK (nessuna function, nessuna regola).
