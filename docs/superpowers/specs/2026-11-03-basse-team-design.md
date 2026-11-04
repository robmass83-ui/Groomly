# Basse «Team» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Team**; dettagli in `test-results/audit/findings/team.md` (cartella del checkout principale).

## Perché
Cinque difetti piccoli della squadra. Tre sono già stati risolti da medie successive all'audit; ne restano due: un testo sbagliato (e non tradotto) nella pagina Team e il titolare che manca dall'elenco `members` quando il Salone non arriva dall'operatore, un problema che oggi non si vede ma arriverà con l'acquisto da Play.

## Decisioni (prese con Roberto il 3 novembre)
1. **Pulsante d'invito** (`ProPage.tsx` ~311): «Invita una persona» / «Invite someone» / «Invitar a alguien», perché nel foglio si sceglie socio o collaboratore. Nello stesso foglio si traducono anche i testi oggi fissi in italiano: titolo «Invita», etichetta «Email», tasto «Invia» (chiavi nuove in `it/en/es`).
2. **Titolare in `members` — approccio A.** Quando qualcuno accetta un invito, `acceptInvite` (stessa transazione) controlla che esista `salons/<salonId>/members/<salonId>`; se manca lo crea dai dati di `accounts/<salonId>` (email, nome, cognome, `role: 'titolare'`, `status: 'attivo'`), solo se quell'account è davvero il titolare di quel salone. La regola «crea il titolare se manca» va in una funzione comune usata anche da `impostaPianoManuale` (che oggi lo fa da sé, righe 78-87), così sta in un posto solo. Il titolare non occupa posti (`activeStaffCount` e `usedSeats` contano solo socio e collaboratore).
3. **Invito non valido, «Salvataggio non riuscito» dopo l'accettazione, pulsanti del Listino per il collaboratore:** già risolti (medie 12, A7, 16). Solo verifica sull'emulatore; si tocca il codice solo se la verifica trova ancora il problema.

## Approcci (per 2)
- **A — scelto.** Il server aggiunge il titolare all'ingresso di una persona: è il momento in cui serve (Team, «Chi lo fa»), vale per qualunque via arrivi il Salone e sistema anche saloni già esistenti al primo invito accettato. Costo: deploy di `acceptInvite` e `impostaPianoManuale`.
- **B — scartato.** Crearlo a ogni scrittura del piano Salone: ogni via nuova (Play) dovrebbe ricordarsene e non copre i saloni già esistenti.
- **C — scartato.** Aggiungerlo solo nell'app: il collaboratore non legge l'account del titolare (niente nome) e il dato su Firestore resta sbagliato.

## Fuori dallo scopo
- Nessuna migrazione dei saloni esistenti (in produzione solo Laura, che ha il titolare perché il Salone viene dall'operatore).
- Regole Firestore invariate.

## Lasciato al costruttore (scelte di Claude)
- Nome e posto della funzione comune (in `functions/src/piano/` o vicino a `invitiTeam.ts`), purché testabile senza emulatore.
- Nomi delle chiavi i18n nuove.

## Deploy richiesti (dalla coordinatrice)
- Functions `acceptInvite`, `impostaPianoManuale`; APK per il testo. Niente regole, niente hosting.

## Verifica
Test unitari della funzione comune (titolare mancante → creato; presente → non toccato; account non titolare o di un altro salone → niente) e del testo del pulsante. Script `QA-tests/.qa-catalog/verify-basse-team.cjs` sull'emulatore (account `team-…`): server — salone Salone senza member titolare, invito accettato con le funzioni compilate → member titolare creato, posti invariati; browser a 320/360/390 px — pulsante «Invita una persona» intero, foglio in inglese tradotto, pagina di un invito scaduto con «Vai alla Home» e senza «[400]», dopo l'accettazione nessun «Salvataggio non riuscito» né «Dati non aggiornati», Listino del collaboratore senza Gestione/Aggiorna prezzi/Gestisci, «Chi lo fa» del titolare con il titolare.
