# Progresso del piano piani completi

Ripartenza dal commit `f60df42` su `main`. Aggiornare questo file e fare commit dopo ogni task. Se la sessione si interrompe, il primo task che non è `fatto` o `bloccato da Roberto` è quello da cui ripartire.

## Fuori piano — regola `users/{uid}` (25/10/2026, urgente)

Separato dai task qui sotto. Non alza la versione, non tocca l’APK, gli indici, l’hosting e non è stato committato.

Base pubblicata: regole della 1.1.93, commit `f8630c3` sul ramo `pro-collaboratori`. L’unica differenza rispetto a quel commit è il match dei dati personali. Prima:

```
match /users/{uid}/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid;
}
```

Adesso, in produzione:

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Nessun elenco chiuso delle raccolte e nessun’altra riga. Le regole di `main` (elenco chiuso e altre modifiche del piano) non sono state pubblicate e il file `firestore.rules` di `main` non è stato modificato.

Quel testo era già online dal 24/10/2026 alle 23:26 UTC (ruleset `89cb4014-30e4-45f8-959e-94a20f524aa5`), caricato dal worktree `pro-collaboratori`. Il deploy di oggi non ha ricaricato un file diverso: Firebase ha risposto «latest version of firestore.rules already up to date, skipping upload» e ha rilasciato di nuovo lo stesso ruleset. `updateTime` della release `cloud.firestore`: `2026-10-25T10:10:28.895641Z`. Comando, dalla cartella `.worktrees/pro-collaboratori`: `npx firebase deploy --only firestore:rules --project groomly-3128b --non-interactive`. Compilazione riuscita. Restano gli avvisi già presenti nella 1.1.93 (`owns` non usata; `exists` e `get` segnate dal compilatore come nomi non validi) e non sono stati toccati.

Prova sull’emulatore Firestore `cloud-firestore-emulator-v1.19.8.jar`, progetto `demo-groomly`, porta `127.0.0.1:8080`, con lo stesso file di regole poi pubblicato. Dati scritti a regole spente: documento `users/laura-finta` e `users/laura-finta/backups/2026-10-01`. Laura finta è l’utente `laura-finta` con email `laura.masala@tiscali.it`. L’altro utente è `uid-salone-1`.

| Prova | Esito |
|---|---|
| L’altro utente legge il backup di Laura | negato |
| L’altro utente legge il documento `users/laura-finta` | negato |
| Laura finta legge il suo backup | permesso |
| Laura finta legge il suo documento | permesso |
| L’altro utente scrive il backup di Laura | negato |
| Laura finta scrive il suo backup | permesso |

6/6. Il log `PERMISSION_DENIED` sulla scrittura dell’altro utente è il rifiuto atteso.

## Prima del task 10 — assignee di un completato

Ripetuta la prova «il collaboratore cambia la persona di una visita completata» con un assignee diverso da quello salvato (`uid-altra-persona`, non l’uid del collaboratore). Esito: negato. Non è una falla. `firestore.rules` di `main` non è stato modificato e non è stato pubblicato. Il caso è in `src/lib/firestoreRules.emulator.test.ts` e in `scripts/test360/rules.ts` (28/28). Vedi D15.

| Task | Stato | Commit | Test |
|---|---|---|---|
| R0 Specifica, piano, decisioni | fatto | `6bb5b2b` | solo documenti |
| R1 F5 con le regole vere | fatto | `57dcceb` | accessoSospeso 6/6, client filtrato verde; emulatore non lanciato |
| R2 Nove test rossi e orologio fermo | fatto | `9ef9e47` | i 10 rossi di quei file sono verdi; suite intera 1526/1527, un timeout alzato a 10 s |
| R3 Kit 360° e `VITE_EMULATORS` | fatto | `5108d6a` | guardia 3/3, client.test verde, tsc verde |
| R4 `npm test` senza rete | fatto | `1d56ddc` | `rete.test` verde (prima unstub prendeva HTTP 200 da GitHub). Suite intera ancora ~5,5 min dopo aver spostato 4 file oltre 60 s in `test:slow`. Due test falliscono solo a pieno carico e passano da soli. Terzo tentativo sul tetto dei 4 minuti: non raggiunto, si va avanti. |
| R5 Push di `main` | fatto | `61133f3` | `origin/main` aggiornato da `8ea3fc4` a `61133f3` |
| 0 Nota Roberto | fatto | `26e482f` | documento |
| 1 Un solo ramo | fatto | `d42c4b7`, `e6a633f` | — |
| 2 Regole F1 F3 F4 M12 | fatto | `1b42e94` | emulatore nel commit |
| 3 Kit 360° | sostituito da R3 | — | — |
| 4 Offline F2 | fatto | `940bd4f` | — |
| 5 Usabilità | fatto | `57dcceb`, `284af07` | F5 con `elencoNegato`; M11 lo spazio è già `BOTTOM_NAV_CONTENT_PAD` nel guscio; M13 `revocaMembroAllUscita` (la callable la chiama il task 21) |
| 6 Test senza rete | sostituito da R4 | — | — |
| 7 Test 360° iniziale | fatto | `c3416e1` | rapporto in `docs/Groomly_Test360_RAPPORTO_INIZIALE.md`. Regole emulatore 10/10 (F5 e salvataggi 1.1.93); rules.ts 27/28; giri titolare chiaro/scuro, collaboratore, socio, operatore, offline. Functions non partito. Deploy regole no. |
| 8 `piano.ts` | fatto | `3cad49e` | — |
| 9 Paywall e menu | fatto | `06fcf93` | `usePiano`, card «Prova Pro gratis per 30 giorni», badge, route piano/team/messaggi/strumenti. Flag spento: solo Privacy e Elimina account. «Avvisami» scrive `interesse/{feature}`. Collaboratore senza card. |
| 10 Prova e omaggio | fatto | `f76337a` | decisione pura 6/6; pagina Utenti 8/8; emulatore functions `avviaProva`, `impostaPianoManuale`, `setSalonPro` e `chiudiProve` 8/8 su `demo-groomly`. Non pubblicato. |
| 11 Team e posti | fatto | `4aa903d` | `limitePosti` 4 con extra, quinto invito rifiutato, default 3. «Team» solo con flag e accesso salone; flag spento resta «Funzioni Pro». |
| 12 Report ed export | fatto | `eb03be5` | flag spento: come oggi. Flag acceso e base: mese corrente sì, passato ed export aprono la paywall. Pro e omaggio esportano. Fascia 1–5 solo col flag e se `puoProporre`. |
| 13 Crediti | fatto | `9af8263` | la riga c’era già in `DA-FARE-ROBERTO.md` punto 11. Nessun file di crediti. |
| 14 Copie cloud | fatto | `5ca2c2d` | foto già copiata esclusa; copia oltre 30 giorni da cancellare; Pro ha accesso. Flag spento: riga assente. Base: paywall. Pro senza bucket: «Copie non disponibili» e la funzione non scrive. |
| 15 Invia tutti | fatto | `efb9e1f` | coda di domani 3, il secondo parte dopo il primo, 12 numeri diventano 393… Flag spento: niente riquadro. Flag acceso: il riquadro c’è anche in base. Segnato in `settings.avvisiInviati`. |
| 16 Promemoria email | fatto | `6a27d0d` | stessa visita e stesso giorno una volta sola; il 301° resta in coda; senza email non parte. Senza chiave Brevo: `non_inviata` e nessuna rete. Con chiave: template 12 e reply-to del salone. Campo email nel cane solo col flag. `/azione?mode=promemoria` ha Confermo, Devo spostare, Non scrivermi più. |
| 17 Orari | fatto | `5c0b622` | giorno vuoto chiuso; copia su tutti; orario in fascia valido; domenica vuota non proponibile se gli orari sono compilati; se mancano, il form non cambia. Editor solo col flag. |
| 18 Statistiche | fatto | `14f2542` | €/ora su durata effettiva o prevista; previsione al netto dei non venuti; ritardo = intervallo × 1,5 senza futuri. Flag spento: niente scheda. Base: solo €/ora, il resto apre la paywall. |
| 19 Recensioni | fatto | `8998962` | seconda proposta entro 12 mesi no; stesso giorno di una nota problema no; sesta del giorno no; senza link no. Testo senza sconti. Riga solo col flag, sul completato. |
| 20 Fedeltà | fatto | `75ebee5` | dieci completati danno un premio; toglierne uno toglie il timbro; il premio azzera il servizio e scrive «Premio fedeltà»; ricalcola torna gli stessi timbri. Scheda con accesso, badge in base, nascosta col flag spento. |
| 21 Account e privacy | fatto | `e67157d` | pulsante «Fissa un appuntamento»; kind assente resta pelosetto. eliminaAccount sull’emulatore: Play attivo rifiutato, salonId diverso e shared rifiutati, cancellazione ok (5/5). Pagine in hosting, non pubblicate. Script admin non lanciato. |
| 22 Pagina salone | fatto | `553b94b` | «I Pelosetti!» → i-pelosetti; slug occupato «Nome già preso»; profilo senza iva. saloneInfo sull’emulatore: og:title è il nome, niente partita IVA. |
| 23 Disponibilità | fatto | `439446c` | 10:00 Roma resta 10:00 il 29 marzo e il 25 ottobre 2026. Programmato e richiesta nuova occupano, disdetto no, nessun nome di cane. Oltre 2 per telefono o 20 per salone rifiuta. Esca: ok senza scrittura. Emulatore 1/1. |
| 24 Prenotazione | fatto | `d47bcde` | da nuova si passa ad accettata, proposta, rifiutata, scaduta, disdetta. Token errato non cambia lo stato. Email assente rifiutata. Senza Brevo lo stato si salva e l’email è non_inviata. Il calendario è Europe/Rome. Emulatore 1/1. Cinque schermate in hosting/salone. |
| 25 Lato toelettatrice | fatto | `5a7763d` | accettare una nuova crea un programmato e non lascia lo stato nuova. Blocco 48 ore. Stesso cellulare propone il cane in scheda. Biglietto A5 con nome e URL. In home: badge in base, riquadro con accesso, niente col flag spento. |
| 26 Attesa | fatto | `e2748c0` | durata più lunga del buco esclusa; mattina non prende le 16:00; ordine di arrivo. Il primo conferma vince, il secondo è persa. La disdetta libera il posto. Badge in base, riquadro con accesso. |
| 27 Scheda cliente | fatto | hash nel commit di questo task | la risposta ha nome e specie, non notes, tags né behavior. Token revocato → non_trovata. Emulatore 1/1. Pagina hosting/c. |
| 22 Pagina salone | non fatto | — | — |
| 23 Disponibilità | non fatto | — | — |
| 24 Percorso cliente | non fatto | — | — |
| 25 Lato toelettatrice | non fatto | — | — |
| 26 Lista d’attesa | non fatto | — | — |
| 27 Scheda cliente | non fatto | — | — |
| 28 Controlli manuali | non fatto | — | — |
| 29 Flavor Play | non fatto (previsto: non si fa) | — | — |
| 30 Test chiuso Play | non fatto (previsto: non si fa) | — | — |
| 31 RevenueCat spento | non fatto | — | — |
| 32 Checklist, flag fermi | non fatto | — | — |
| 33 Proposte e firma | non fatto | — | — |
| 34 Metriche | non fatto | — | — |
| 35 Verifica trasversale | non fatto | — | — |
| 36 Test 360° finale | non fatto | — | — |
| 37 Pubblicazione | non fatto | — | deploy Firebase bloccato da Roberto |
