# Groomly — Operatori del salone e marchio in accesso

Data: 2026-10-18
Stato: decisioni chiuse il 18 ottobre 2026. Sostituisce la parte di D9 del 17 ottobre che teneva `masala.roberto@hotmail.it` fuori da `shared`.

Due email lavorano nel salone di Laura e, solo loro, vedono chi si è registrato. In accesso, sotto il logo animato, compaiono il nome Groomly e la parola toelettatura, più grande di oggi e più piccola del nome.

## 1. Decisioni

| # | Decisione |
|---|---|
| D1 | `laura.masala@tiscali.it` e `masala.roberto@hotmail.it` entrano sempre in `salon/shared`. Un documento account già salvato con un altro id viene riscritto: `salonId` `shared`, ruolo `titolare`, `legacy` vero. Nome e cognome già presenti restano. I documenti in `salons/{uid}` non si cancellano e non si aprono. |
| D2 | `robmass83@gmail.com` resta un titolare nuovo, con salone vuoto proprio. L’indirizzo scritto `.it` è lo stesso account già in app, con `.com`. Nessun codice speciale per quell’indirizzo: vale la regola di chiunque si registri. |
| D3 | Le due email di D1 sono gli operatori. L’elenco dei saloni è legato all’email, non al fatto di essere dentro `shared`. Un collega futuro sullo stesso salone non lo vede. |
| D4 | In Altro, prima di Attività, gli operatori vedono la sezione «Groomly» e la riga «Utenti». Apre `/impostazioni/utenti`. Gli altri non vedono la riga. Se aprono l’URL tornano a Impostazioni. |
| D5 | La pagina mostra quanti account e quante toelettature esistono, poi una riga per ogni account che ha un salone: nome e cognome del responsabile, sotto il nome della toelettatura. La riga non apre quel salone. Niente cani, visite, foto, partita IVA, telefono o indirizzo. |
| D6 | Sotto il logo animato, nelle schermate di accesso, c’è «Groomly» a 32 px e sotto «toelettatura» a 15 px. La scritta microscopica già disegnata nel file del logo non si vede. |
| D7 | Roberto, entrando in `shared`, non copia i suoi `users/{uid}` nel salone di Laura, non ripete le cancellazioni locali e non ricarica i media locali. Quel travaso resta solo per l’email di Laura. |

## 2. Approcci scartati

Copiare un elenco scritto da ogni telefono alla prossima apertura lascia fuori chi non ha ancora l’aggiornamento. Un ingresso di Roberto in sola lettura non basta: deve lavorare nel salone di Laura. Si leggono quindi gli account già in Firestore e solo il documento impostazioni di ogni salone, e Roberto viene agganciato a `shared` senza travasare il suo archivio.

## 3. Salone condiviso

Costanti, confronto dopo trim e minuscolo:

- `LAURA_EMAIL` = `laura.masala@tiscali.it`
- `ROBERTO_EMAIL` = `masala.roberto@hotmail.it`
- `isSharedEmail` è vero per queste due.
- `isOperator` è vero per le stesse due.
- `isLauraEmail` resta vero solo per Laura.

`sharedMemberAccount(email, existing)` produce `salonId: shared`, ruolo `titolare`, `legacy: true`, email normalizzata, nome e cognome presi da `existing` se ci sono, altrimenti vuoti.

`accountCreateAllowed` accetta il documento shared legacy per entrambe le email. Per ogni altra email vale la regola già in uso: id uguale al proprio utente, ruolo titolare, `legacy` falso, id diverso da `shared`.

`canReadSalon` concede `shared` a `isSharedEmail`. Gli altri leggono solo l’id del proprio account.

All’accesso, prima di fidarsi dell’id salvato:

- Se l’email è condivisa e il documento è già `shared`, titolare, `legacy` vero, si aggancia `shared` e non si riscrive.
- Altrimenti, se l’email è condivisa, si aggancia `shared` e si scrive `sharedMemberAccount`. Se la lettura dell’account è fallita, non si scrive; il salone resta comunque `shared`.
- `writeOwnerSalon` e la riparazione, se l’email è condivisa, scrivono quel documento e non creano `salons/{uid}`.

`entryGate`: senza documento account, un’email condivisa va in home, come Laura oggi. Le altre, con Firebase acceso, vanno in riparazione. `legacy` vero non passa dalla conferma email. Roberto non confermato vede in home la stessa fascia ambra di Laura.

`finishUser` e `watchAuth` agganciano il salone e poi chiamano `migrate` e `ensureShared`. La copia dei dati locali del telefono (`copyLocal`) e il travaso di `users/{uid}` dentro `shared` partono solo se `isLauraEmail`. Per Roberto `migrate` segna il cloud pronto senza copiare, e `ensureShared` scrive solo `salon/shared/members/{uid}`. Non si leggono i suoi `users/{uid}`, non si applicano le sue cancellazioni locali e non si ricaricano i suoi media. Un salone che non è `shared` continua a saltare quella copia, come oggi.

## 4. Regole Firestore

`isOperator()` è vero se l’email del token, in minuscolo, è una delle due.

Sostituisce `isLaura()` su `salon/shared`: lettura e scrittura del salone di Laura per entrambe le email, oltre a chi ha `salonId` `shared`.

`accounts/{uid}`:

- Lettura: il proprio utente, oppure un operatore (anche in elenco).
- Creazione shared legacy: entrambe le email, non le altre.
- Aggiornamento: o id, ruolo e `legacy` restano quelli già salvati, oppure l’email è operatore e il documento diventa `shared`, titolare, `legacy` vero. Serve per riportare un account già creato col proprio uid.
- Cancellazione: invariata, solo il proprio account non legacy.

Lettura aggiunta, senza scrittura nuova:

- `salons/{salonId}/settings/main` se `owns(salonId)` oppure `isOperator()`.
- `salon/shared/settings/main` è già coperto dal salone condiviso.

Un operatore non legge cani, appuntamenti, servizi o file degli altri saloni, e non li scrive.

## 5. Elenco operatori

Tipo puro, senza Firebase:

```ts
interface DirectoryAccount {
  uid: string
  firstName: string
  lastName: string
  email: string
  salonId: string
}

interface DirectoryEntry {
  uid: string
  ownerName: string
  salonName: string
}

interface SalonDirectory {
  accountCount: number
  salonCount: number
  entries: DirectoryEntry[]
}
```

`summarizeDirectory(accounts, salonNames)`:

- `accountCount` è il numero di account, anche senza salone.
- `salonCount` è il numero di `salonId` non vuoti e distinti. Laura e Roberto, entrambi su `shared`, contano due account e una toelettatura.
- `entries` tiene solo gli account con `salonId` non vuoto.
- `ownerName` è nome e cognome uniti e senza spazi agli estremi. Se resta vuoto, l’email. Se anche l’email è vuota, `Senza nome`.
- `salonName` è il nome in mappa, senza spazi. Vuoto o assente diventa `Senza nome`.
- Ordine: nome toelettatura, poi responsabile, poi uid, con `localeCompare` e locale `it`.

`businessName(data)` legge `data.business.name` se è una stringa, altrimenti `''`.

`accountSummary(n)`: `1 account creato`, altrimenti `{n} account creati`.
`salonSummary(n)`: `1 toelettatura creata`, altrimenti `{n} toelettature create`. Vale anche per zero.

`listSalonDirectory()` legge la collezione `accounts` e, per ogni id distinto, `settings/main` (`salon/shared/settings/main` se l’id è `shared`, altrimenti `salons/{id}/settings/main`). Un nome che non si legge diventa stringa vuota e quindi `Senza nome`, senza far fallire la pagina. Se Firebase è spento o la lettura degli account fallisce, errore `Connessione assente` con codice `auth_offline`.

## 6. Schermate

**Accesso.** `AuthMark` resta fisso in alto, nelle viste Entra, Crea account, conferma email, nuova password e Riprova. Il logo animato è quello di oggi, chiaro o scuro col tema. Sta in un riquadro largo 180 px e alto 104 px, con `overflow: hidden`, così la parola già tracciata in fondo al file (intorno a y 223 su 250) esce dal riquadro. Sotto, un paragrafo `Groomly`: 32 px, peso 700, colore `var(--tx)`, interlinea 1. Sotto, un paragrafo `toelettatura`: 15 px, peso 600, `letter-spacing: 0.18em`, `text-transform: uppercase`, colore `var(--tx3)`. Il testo sorgente è minuscolo; lo schermo lo mostra in maiuscolo. 15 è minore di 32. L’immagine tiene `alt` `Groomly`. I due paragrafi non sono titoli di pagina.

**Altro.** Se `isOperator` sull’email della sessione, prima del blocco Attività:

- titolo di sezione `Groomly`
- riga con icona, titolo `Utenti`, chevron, link a `/impostazioni/utenti`

**Utenti.** Titolo `Utenti`, indietro verso `/impostazioni`. Se l’email non è operatore, redirect a `/impostazioni` senza chiamare l’elenco. Altrimenti, durante il caricamento, `Caricamento…`. Se la chiamata fallisce, `Connessione assente`. Se riesce, una card con le due frasi del resoconto (17 px, peso 700) e, sotto, una card per riga: responsabile in peso 600, toelettatura a 12,5 px colore `var(--tx3)`. Le righe non sono pulsanti né link. Se `entries` è vuoto, sotto il resoconto c’è `Nessuna toelettatura`.

## 7. Prove

- `isSharedEmail` e `isOperator` accettano le due email in qualunque maiuscolo e rifiutano `robmass83@gmail.com`.
- Un account shared legacy è creabile per entrambe. Un’altra email non può crearlo. `canReadSalon` concede `shared` a Roberto anche senza documento.
- Senza documento, Roberto va in home. `robmass83@gmail.com` senza documento va in riparazione.
- Accesso di Roberto senza documento, e accesso con documento `salonId` diverso, agganciano `shared` e scrivono legacy vero. Nome e cognome precedenti restano. Nessuna scrittura sotto `salons/{uid}` e nessuna lettura di `users/{uid}` da parte sua. Laura senza documento continua a scrivere `shared` come oggi.
- `robmass83@gmail.com` senza documento non aggancia `shared`.
- Le regole contengono le due email, la lettura degli account per l’operatore, l’aggiornamento che porta a `shared`, e la lettura di `settings/main`.
- Il riassunto conta due account e una toelettatura quando due documenti condividono `shared`, ordina le righe, e usa `Senza nome` se manca il nome.
- `listSalonDirectory` legge gli account e il nome attività, anche di `shared`.
- In Crea account e in Entra si vedono `Groomly` a 32 px e `toelettatura` a 15 px, il logo animato resta, il riquadro è alto 104 px.
- Maria in Altro non vede `Utenti` e `/impostazioni/utenti` la riporta a Impostazioni. Laura vede la riga. Se l’elenco fallisce, la pagina mostra `Connessione assente`. Se l’elenco ha due account sullo stesso salone, mostra `2 account creati`, `1 toelettatura creata`, il responsabile e il nome della toelettatura.

## 8. Fuori da questo lavoro

Non si entra nel salone di un altro. Non si invitano colleghi. Non si sposta Laura fuori da `salon/shared`. Non si aggiunge `robmass83@gmail.com` agli operatori. Non si mostra l’email se il nome c’è. Non si cambia lo splash di avvio.
