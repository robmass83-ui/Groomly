# Basse «Account» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Account**; dettagli in `test-results/audit/findings/account.md` (cartella del checkout principale).

## Perché
Piccoli difetti di accesso, tour e account: frasi che promettono cose non vere («6 piccole cose», «Email inviata», un conto alla rovescia senza email), un tasto indietro che fa perdere il tour, un link che si perde dopo l'accesso, un nome dato alla registrazione che poi non si trova e non si corregge, tre traduzioni ambigue. Obiettivo: l'app dice il vero e non fa perdere strada.

## Decisioni (prese con Roberto il 3 novembre)
1. **Titolare e «Il tuo nome»** sono due cose diverse.
   - Alla registrazione di un salone proprio (`writeOwnerSalon`, non chi arriva da invito né l'account condiviso) `business.titolare` = «Nome Cognome» (trim, max `TITOLARE_MAX`). Resta modificabile come oggi. Nessuna migrazione dei saloni esistenti.
   - In Gestisci account una riga nuova **«Il tuo nome»** per tutti (titolare, socio, collaboratore) con foglio Nome + Cognome, che aggiorna `accounts/<uid>.firstName/lastName` (le regole lo permettono già) e quindi il saluto in Home. Nome obbligatorio, cognome facoltativo, limiti di lunghezza ragionevoli.
2. **Tour, tasto indietro**: indietro torna al passo precedente; dal primo passo al benvenuto; solo dal benvenuto esce. Un passo saltato, rivisitato, si rifà normalmente; il «saltato» salvato resta finché non lo si completa.
3. **Tour, conteggio**: il benvenuto dice il numero vero dei passi che seguono (frase con `{{n}}`, singolare per 1); finché i passi non sono pronti, una frase senza numero. L'anello e l'elenco finali contano solo i passi del tour (senza la verifica email).
4. **Link profondo**: aprendo da sloggati una pagina protetta, la destinazione (percorso + query) si ricorda nella memoria di sessione del telefono e si usa una volta sola dopo l'accesso, anche dopo registrazione + conferma email. Un invito in sospeso (`RimandoInvito`) ha la precedenza. Chiudendo l'app si dimentica.
5. **Conto alla rovescia** della schermata «Conferma l'email»: il telefono ricorda l'ora dell'ultima email di conferma spedita (registrazione o «Invia di nuovo»); all'apertura il conto mostra i secondi rimasti davvero; oltre 60 s o mai spedita → «Invia di nuovo» subito attivo e niente riga dei secondi.
6. **«Verifica email» già verificata**: se il server risponde `alreadyVerified`, il messaggio è «La tua email è già verificata» invece di «Email inviata».
7. **Traduzioni**: EN «Suggestions» per Suggerimenti; «Diary» ovunque (anche `infoGuidaAgenda`); ES pagina Notifiche «Notificaciones» (resta un solo «Avisos»).

## Approcci
- Tour: **A — scelto.** Ogni passo è una voce di cronologia su `/benvenuto` (stato della navigazione), così tasto indietro Android (`SystemBack` fa già `history.back`) e freccia del browser si comportano uguale. Costo: non rompere la ripresa dopo ricarica né l'animazione di uscita. **B — scartato**: caso speciale in `systemBackChoice`, ma sul web la freccia continuerebbe a uscire.
- Link profondo: **B — scelto.** `sessionStorage`, usato una volta: regge alla ricarica durante la conferma email. **A — scartato**: stato passato a `/login`, si perde alla ricarica.

## Fuori dallo scopo
- Il nome mostrato nella lista del team (scheda del membro) non si aggiorna cambiando «Il tuo nome»: seguito, se serve.
- Niente server, regole o hosting: solo APK.

## Lasciato al costruttore (scelte di Claude)
- Chiavi e testi nuovi in it/en/es (controllo «frasi fisse»); limiti di lunghezza di nome/cognome; chiave di `sessionStorage`/`localStorage`; quali percorsi valgono come destinazione (non `/login`, non `/invito/…` già gestito).
- Forma della funzione pura che calcola i secondi rimasti e di quella che sceglie la destinazione dopo l'accesso (testabili senza schermo).

## Verifica
Test unitari delle funzioni pure, di `TourPage` (indietro tra i passi, conteggio) e di `AccountPage` (riga «Il tuo nome», «già verificata»). Script `QA-tests/.qa-catalog/verify-basse-account.cjs` sull'emulatore a 320/360/390 px con account `account-*`: registrazione → titolare compilato; «Il tuo nome» cambia il saluto; conferma email dopo ricarica senza conto alla rovescia; `/impostazioni/notifiche` da sloggati → accesso → arriva lì; tour con indietro; «Verifica email» su account verificato; testi EN/ES.
