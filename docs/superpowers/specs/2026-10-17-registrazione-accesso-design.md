# Groomly — Registrazione e accesso

Data: 2026-10-17
Stato: sezioni approvate il 17 ottobre 2026, in attesa della lettura di questo file.

Questo lavoro prepara l’app a più toelettature. Laura Masala resta nel salone che usa oggi. Un titolare nuovo si registra e ottiene un salone vuoto. Le schermate per invitare un collega arrivano dopo: qui il dato è solo predisposto.

## 1. Decisioni

| # | Decisione |
|---|---|
| D1 | Ogni titolare nuovo ha un salone vuoto. I cani, gli appuntamenti, le foto e il listino di Laura restano i suoi. |
| D2 | Laura non rifà la registrazione. Resta dentro. La stessa email e la stessa password, su un altro telefono, aprono lo stesso salone. |
| D3 | L’invito a un collega è nel modello (ruolo, id del salone che non si cambia dal telefono). Le schermate per invitare e per accettare sono fuori da questo lavoro. |
| D4 | Obbligatori in registrazione: nome, cognome, email, password, nome della toelettatura. Partita IVA e indirizzo si possono lasciare vuoti. |
| D5 | Finché mancano sia la partita IVA sia il codice fiscale, in home c’è una fascia e sulla voce Altro un bollino. Ne basta uno dei due, valido, per toglierli. L’indirizzo non c’entra. La regola vale anche per Laura. |
| D6 | «Password dimenticata» manda un’email per scegliere una nuova password. |
| D7 | Un account nuovo non entra in home finché non apre il link di conferma. Laura non viene bloccata: se la sua email non è confermata vede una fascia e continua a lavorare. |
| D8 | I documenti di Laura restano in `salon/shared`. I saloni nuovi stanno in `salons/{id}` con le stesse cartelle. L’app chiede solo l’id del salone. Spostare Laura nel percorso nuovo è un trasloco successivo, non questo lavoro. |
| D9 | Il salone `shared` è di `laura.masala@tiscali.it`. `robmass83@gmail.com`, se entra, ottiene un salone vuoto. Dal 18 ottobre 2026 `masala.roberto@hotmail.it` torna su `shared`: vedi `2026-10-18-operatori-salone-design.md`. |

## 2. Account e salone

Ogni persona ha `accounts/{uid}`: nome, cognome, email, id del salone, ruolo, `legacy`. Il ruolo scritto dal telefono è solo `titolare`. Dopo la creazione, id del salone, ruolo e `legacy` non si modificano.

L’id `shared` legge e scrive `salon/shared`. Ogni altro id legge e scrive `salons/{id}`, con le cartelle di oggi: cani, appuntamenti, servizi, impostazioni, file, meta. Le pagine non nominano più il percorso fisso.

Alla prima apertura dopo l’aggiornamento, se manca il documento, Laura ottiene `salonId: shared`, ruolo titolare, `legacy` vero, nome e cognome vuoti. I suoi dati non si copiano. Nome della toelettatura, partita IVA e indirizzo restano quelli già in Impostazioni.

Un titolare nuovo ha l’id del salone uguale al suo utente Firebase. Nasce un salone vuoto. Il nome della toelettatura va in `business.name`. Partita IVA e indirizzo, se compilati, vanno in `business.vatNumber` e `business.address`. I servizi di base si seminano in quel salone quando l’elenco servizi è vuoto, come oggi. Non parte il ripristino verso `salon/shared` e quel percorso non si legge.

Regole del database:

- Un account nuovo si crea solo con id del salone uguale al proprio utente, ruolo titolare, `legacy` falso.
- Nessun altro indirizzo può creare un account con id `shared`.
- Un aggiornamento dell’account non cambia id del salone, ruolo o `legacy`.
- `salons/{id}` si legge e si scrive solo se l’account ha quello stesso id.
- `salon/shared` si legge e si scrive se l’email autenticata, in minuscolo, è `laura.masala@tiscali.it`, oppure se l’account ha id `shared`. Così Laura continua anche se il documento account non si è ancora salvato.

Senza rete resta la copia locale già legata all’utente. Quella di Laura resta la sua. Un utente nuovo parte da una copia vuota.

In home, se l’account ha il nome, il saluto è «Ciao» seguito dal nome. Per Laura, finché il nome sull’account è vuoto, resta il saluto già in uso.

Con Firebase spento (prove e sviluppo senza cloud) la registrazione salva gli stessi campi sull’account locale e i dati restano separati per utente, come oggi. Conferma email e recupero password in quel modo non partono: non c’è la schermata di conferma e «Password dimenticata» risponde «Connessione assente».

## 3. Schermate

Due viste distinte, entrambe sulla route `/login`. Si passa dall’una all’altra con la riga in fondo, non con un interruttore. In fondo a Entra: «Non hai un account? Crea account». In fondo a Crea account: «Hai già un account? Entra».

Il logo è quello animato dell’apertura: `groomly-logo-animato` in chiaro e `groomly-logo-animato-scuro` con il tema scuro. È intero, senza il cerchio che lo taglia, fisso in alto. Il modulo scorre sotto. Vale per Entra, Crea account, conferma email e nuova password.

Colori, card, pulsante e misure dei testi sono quelli dell’app (fondo, card bianca, blu, titoli 17, testi 12,5, etichette 11).

**Entra.** Email, password, occhio per mostrarla, «Password dimenticata», pulsante «Entra».

**Crea account.** Nome e cognome sulla stessa riga, email, password con l’occhio, nome della toelettatura. Poi l’etichetta «Puoi completarli dopo», partita IVA e indirizzo. Pulsante «Crea account». Il codice fiscale non sta in questa pagina: si aggiunge nel foglio Attività. La password è un solo campo, minimo 8 caratteri.

## 4. Conferma email e password

Dopo «Crea account» l’utente è autenticato e vede «Conferma l’email». Il testo dice l’indirizzo a cui abbiamo scritto. «Ho confermato» ricontrolla. Tornando nell’app il controllo parte da solo. «Invia di nuovo» rimanda il messaggio. «Esci» fa uscire, se l’indirizzo era sbagliato. Finché il link non risulta aperto, la home non si apre.

«Password dimenticata» usa l’email già scritta in Entra. Se è vuota o non è un’email, il campo mostra «Inserisci un’email valida» e non parte l’invio. La schermata successiva dice: se questo indirizzo è un account Groomly, arriva l’email per scegliere una nuova password, poi si torna su Entra. Il testo è lo stesso anche se l’indirizzo non esiste. Il link apre la pagina del servizio di posta; la nuova password si usa poi in Entra.

Laura, con l’email non confermata, in home vede la fascia ambra «Conferma la tua email», con «Invia». Sotto, la giornata di sempre. Se l’email è già confermata, quella fascia non c’è. Un account nuovo non usa questa fascia: usa la schermata di blocco.

## 5. Partita IVA o codice fiscale

La fascia in home ha lo stesso aspetto di quella dei mensili: fondo ambra, titolo «Aggiungi partita IVA o codice fiscale», riga «Per completare l’attività», pulsante «Aggiungi». «Aggiungi» porta in Impostazioni e apre il foglio Attività.

Il bollino è il punto rosso già usato su Avvisi, sulla voce **Altro** della barra, quella che apre Impostazioni. Sparisce insieme alla fascia.

Il foglio Attività tiene Ragione sociale, Partita IVA, Telefono e Indirizzo, e aggiunge Codice fiscale. Il testo nel foglio: «Basta la partita IVA oppure il codice fiscale.» Il valore sta in `business.taxCode`. Un documento vecchio senza quella chiave vale come vuoto.

La fascia e il bollino ci sono quando, tolti gli spazi, partita IVA e codice fiscale sono entrambi vuoti. Vale per ogni salone, Laura compresa. Se la partita IVA è già salvata, non compaiono.

Se mancano sia la conferma email (caso Laura) sia il dato fiscale, la fascia dell’email sta sopra quella fiscale.

Salvare con entrambi vuoti lascia gli avvisi. Uno dei due, compilato e valido, li toglie. L’indirizzo e il telefono non li tolgono.

Partita IVA, se scritta: dopo gli spazi, 11 cifre, senza il prefisso IT. Codice fiscale, se scritto: dopo gli spazi, 16 tra lettere e numeri; maiuscole e minuscole si accettano e si salvano in maiuscolo. Vuoto è ammesso. Un valore scritto male resta nel campo con il suo errore e non spegne l’avviso. Lo stesso controllo sulla partita IVA vale in registrazione, se il campo non è vuoto. L’indirizzo è testo libero.

## 6. Errori e salvataggi a metà

**Crea account.** Prima il controllo sul telefono. Poi si crea l’utente, si scrive l’account, si apre il salone vuoto e solo allora si manda l’email di conferma. Se l’email è già registrata: «Questa email ha già un account» e il passaggio a Entra. Non si entra con quella password al posto della persona. Senza rete: «Connessione assente». Se l’utente è stato creato e l’account o il salone no: «Salvataggio non riuscito» e «Riprova», non la schermata «Conferma l’email». Il tentativo successivo completa il suo salone. Non legge `salon/shared`. Alla riapertura, un utente autenticato che non è Laura e non ha ancora il documento account vede la stessa ripresa, non la home. Se account e salone ci sono e l’invio dell’email fallisce, si vede «Conferma l’email» e il recupero è «Invia di nuovo».

**Entra.** Credenziali sbagliate: «Email o password non corretti». Account nuovo con email non aperta: la schermata del §4. «Ho confermato» prima del link: «Il link non risulta ancora aperto».

**Invii.** Senza rete: «Connessione assente». Se il servizio chiede di aspettare: «Aspetta un momento e riprova». Vale per il recupero password e per «Invia di nuovo».

**Laura.** Se il documento account non si salva, le regole del §2 le lasciano il salone. L’app riprova da sola. Nessuna schermata la ferma. «Salvataggio non riuscito» può comparire una volta in quella sessione.

## 7. Prove

Ogni punto ha un test automatico.

- Le due viste sono collegate in fondo. Il logo animato è quello dell’apertura, intero, e resta fuori dallo scorrimento del modulo. Entra ha l’occhio e «Password dimenticata». Crea account ha i cinque obbligatori sopra «Puoi completarli dopo».
- Un titolare nuovo scrive l’account con id del salone uguale al suo utente, ruolo titolare, `legacy` falso, e un salone vuoto con il nome della toelettatura. I servizi di base finiscono in quel salone. Nessuna lettura e nessuna scrittura tocca `salon/shared`.
- Email già registrata: «Questa email ha già un account», senza entrare. Salone mancante dopo l’utente: «Riprova» lo completa.
- Account nuovo con link non aperto: la home non si raggiunge. «Ho confermato» prima del link: «Il link non risulta ancora aperto». Laura non confermata: fascia e home sotto. Laura già confermata: quella fascia non c’è. Il recupero password mostra sempre lo stesso testo.
- Fascia fiscale e bollino su Altro se mancano sia la partita IVA sia il codice fiscale, anche per Laura. Uno dei due, valido, li toglie. L’indirizzo non li tocca. Undici cifre e sedici caratteri solo se il campo è compilato.
- Un iscritto nuovo non legge il salone di Laura. L’email di Laura lo legge anche senza documento account. Un account non cambia id del salone, ruolo o `legacy`. Un altro indirizzo non crea un account con id `shared`.

## 8. Fuori da questo lavoro

Non si costruiscono le schermate per invitare o accettare un collega. Non si copiano i documenti di Laura fuori da `salon/shared`. Non si pubblica su App Store. Non si chiede il telefono in registrazione. Non si aggiunge un secondo campo password.
