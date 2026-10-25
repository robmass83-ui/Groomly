# Revisione spec lingue — modifiche da applicare

Aggiorna `docs/superpowers/specs/2026-10-25-lingue-design.md` con queste modifiche, poi rifai il piano di implementazione. Tutto il resto della spec resta com'è.

1. **Servizi predefiniti.** I servizi creati da `src/data/seed/services.ts` (es. "Bagno + taglio", "Antiparassitario") nascono nella lingua del telefono del titolare quando si registra. Per i saloni esistenti: se il nome del servizio è ancora esattamente quello italiano predefinito, a schermo e sul listino si mostra la traduzione; se il salone l'ha cambiato, si mostra il suo testo. Aggiungi i test.

2. **Lingua dei clienti separata.** `linguaClienti` non si aggiorna più quando il titolare cambia la propria lingua. In Impostazioni aggiungi la voce «Lingua dei clienti» (Italiano / English / Español), visibile e modificabile solo dal titolare. Alla creazione di un account titolare il valore iniziale è uguale alla sua `lingua`. Nel salone `shared` può modificarla solo il titolare autorizzato dalle regole esistenti, senza nominare persone nella spec. Aggiorna i test di conseguenza.

3. **Listino per i clienti.** Il listino prezzi stampato o condiviso (PDF/JPEG) usa `linguaClienti`. I report Incassi, PDF ed Excel per il commercialista restano nella lingua della persona. Scrivilo in D1/D2 e aggiungi i test.

4. **Pagine e testi mancanti da tradurre:**
   - `hosting/c` (scheda cane per il cliente): in `linguaClienti`, con i testi del salone escapati. Va nelle pagine e nei test.
   - Testi Pro rivolti ai clienti: tessera fedeltà, lista d'attesa, richiesta di recensione Google, messaggi WhatsApp manuali e "Invia tutti". Vanno elencati sotto D2.
   - Notifiche push composte dal server (`sendPush` in `functions/src/index.ts`): il caricamento dell'account legge anche `lingua` e titolo e testo escono dal vocabolario.
   - Stringhe Android native (nome dei canali di notifica, testi dei permessi, nome app se serve): aggiungi `android/app/src/main/res/values-en` e `values-es`.
   - Etichette con chiave di codice (`SPECIES_LABEL`, `SEX_LABEL`, `SIZE_LABEL`, `TEMPERAMENT_LABEL` in `src/lib/dogList.ts`, le label delle icone in `src/assets/icons/icons.ts`, le intestazioni in `earningsPdf.ts`, `earningsXlsx.ts` ed `earningsExport.ts`): vanno nel vocabolario.

5. **Ripiego degli errori.** Se manca la frase di un codice di errore nella lingua richiesta, l'ordine è: lingua richiesta → inglese → italiano. Correggi la regola e il test.

6. **Stile delle email.** Quando i modelli Brevo 3–12 passano al codice, il loro HTML attuale (logo, colori, titoli grandi, pulsante) va riportato fedelmente. Aggiungi un test che controlla la presenza di logo e pulsante in tutte e dieci le email, nelle tre lingue.

7. **Formattazione centralizzata.** Crea un solo modulo (es. `src/i18n/format.ts`) per date (date-fns con locale `it`, `enGB`, `es`), euro, ordinamento (`Intl.Collator`) e plurali (`Intl.PluralRules` al posto della regola fissa "1 = singolare"). Tutti i punti che oggi usano `toLocaleDateString`, `Intl.*` o `localeCompare` passano da lì. Le Cloud Functions usano lo stesso modulo o una sua copia condivisa.

8. **Fuori da questo lavoro:** aggiungi «Scheda Play Store in inglese e spagnolo (da fare alla pubblicazione)».

Procedi come al solito: /brainstorm scegliendo da solo le opzioni consigliate, piano completo, esecuzione fino in fondo, `npm test` verde. Non toccare i dati reali del salone di Laura.
