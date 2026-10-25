# Prossimi passi — un lavoro dietro l'altro (25/10/2026, sera)

Fai le tre fasi in ordine, senza fermarti tra una e l'altra, tranne dove è scritto «fermati».
Regole di sempre: /brainstorm dove serve scegliendo da solo le opzioni consigliate (annotate in docs/DECISIONI-AUTOMATICHE.md), test prima di ogni modifica, un commit per passo, registro docs/PROGRESSO-PIANO.md aggiornato dopo ogni passo, `npm test` verde. mostraPiani e abbonamentiAttivi restano spenti. Non toccare i dati reali del salone di Laura. Nessuna release GitHub pubblicata da te.

## Fase A — chiudere il giro di oggi (piccola)

1. **Privacy del titolare.** Committa le modifiche locali a docs/legal/{privacy,termini,dpa}.html e hosting/{privacy,termini,dpa}/index.html (tolto «Via Renoir 8, 09045», resta «Quartu Sant’Elena (CA)»). Togli l’indirizzo anche da docs/legal/PRIMA-DEI-PAGAMENTI.md e docs/PROGRESSO-PIANO.md; in PRIMA-DEI-PAGAMENTI scrivi che per Google Play e pagamenti si userà la sede della partita IVA o un domicilio d’impresa, non l’indirizzo di casa. Deploy SOLO hosting e verifica su groomlyapp.it che «Renoir» non compaia più.
2. **Crash «role non definito» in Impostazioni.** Scrivi nel registro se c’è anche nella 1.1.94 installata o se era stato introdotto durante il giro, con la prova.
3. **Test 360 sull’emulatore** con i selettori aggiornati: titolare chiaro/scuro, socio, collaboratore, collaboratore con piano spento, salone tipo Laura con omaggio, offline. Misura il tempo della home dopo il login. Esito nel registro.

Non pubblicare la 1.1.95: le correzioni di oggi usciranno insieme alle lingue (Fase C). Se però il punto 2 dice che il crash c’è nella 1.1.94 installata, **fermati** e prepara subito la 1.1.95 solo con le correzioni (variante github, firma debug come oggi, APK su groomlyapp.it/groomly.apk e release.json), senza pubblicarla: la pubblico io dopo averla provata.

## Fase B — lingue (italiano, inglese, spagnolo)

4. Applica docs/prompt-cursor-lingue-revisione.md alla spec docs/superpowers/specs/2026-10-25-lingue-design.md (punti 1–8). In più:
   - D9: la versione italiana che fa fede è quella attuale (termini 1.1, privacy e DPA senza indirizzo di casa). Le traduzioni partono da questi testi.
   - D6: finché il codice non spedisce le email con il proprio HTML, il template Brevo 5 (inviti) resta attivo. Quando il codice manda tutte le email da solo, segnalo in docs/DA-FARE-ROBERTO.md («template Brevo 3–12 da spegnere») e non spegnerli tu.
   - La variante play e la variante github devono avere le lingue entrambe.
5. Piano completo in docs/superpowers/plans/, poi esecuzione fino in fondo.

## Fase C — prova e versione

6. Test 360 finale sull’emulatore nelle tre lingue (telefono italiano, inglese, spagnolo) più i giri della Fase A. Rapporto in docs/Groomly_Test360_RAPPORTO_LINGUE.md.
7. Deploy di functions e hosting (pagine legali e pubbliche nelle tre lingue), con il controllo online. Regole solo se sono cambiate, annotando il ruleset nuovo e quello vecchio.
8. Prepara la release 1.1.95 (o la prima libera) con correzioni di oggi + lingue: variante github, firma debug come oggi (Laura aggiorna senza reinstallare), APK su groomlyapp.it/groomly.apk, release.json aggiornato, AAB play ricostruito. **Fermati** prima di pubblicarla: la pubblico io dopo averla provata su un telefono.
9. Aggiorna docs/DA-FARE-ROBERTO.md: aggiungi «scheda Play Store in inglese e spagnolo» tra le cose della pubblicazione.

Alla fine dammi un riepilogo breve: cosa è online, cosa è pronto ma non pubblicato, cosa resta a me.
