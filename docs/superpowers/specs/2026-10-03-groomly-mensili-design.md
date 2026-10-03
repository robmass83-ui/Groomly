# Groomly — Clienti mensili (ciclo 4)

Data: 2026-10-03
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` e il mockup `groomly-design.html`.
Questo documento copre un taglio del punto 7 del §10 di `GROOMLY.md`. I cicli 1, 2 e 3 sono già su `master` e non si ridisegnano. La toelettatrice usa solo il telefono. L’app resta in React.

## 1. Scopo

Dare una pagina «Clienti mensili» e un banner in Home. Un cane attivo di tipo Mensile è «Da fissare» se non ha nessun appuntamento con inizio da adesso in poi, e «Fissato» se ne ha almeno uno. **Fissa** apre il modulo già esistente, senza scrivere. I dati restano sul dispositivo, nelle mappe già usate per cani e appuntamenti.

## 2. Fuori da questo ciclo

Stato «Completato», scadenza calcolata da un appuntamento completato, `recurrenceWeeks`, mese corrente e mese successivo, filtri Tutti / Da fissare / Fissati, conteggio «3 da fissare · 5 fissati», notifiche locali, Capacitor, campanello, listino PDF, prezzi diversi da quelli del listino, backup, Firebase, Storage, vista settimana, vista mese, griglia, trascinamento, anticipa e posticipa, foto prima/dopo.

Il Listino resta «In arrivo». «Nuovo cane» non cambia. Il chip +2 / +4 / +6 sulla scheda non cambia. Il menu + non cambia. Archiviare un cane non tocca gli appuntamenti e non propone di cancellarli.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Perimetro | Pagina `/mensili` e banner in Home |
| Chi entra | Cane `attivo` e `clientType === 'mensile'` |
| Da fissare | Nessun appuntamento con `start >= now` |
| Fissato | Almeno un appuntamento con `start >= now` |
| Fissa | Apre il modulo. Non salva |
| Con storico | Copia i servizi e l’ora del passato più recente. Il giorno avanza di 4 settimane finché l’inizio proposto è `>= now` |
| Senza storico | Giorno oggi, ora vuota, nessun servizio |
| Banner | Solo se c’è almeno un «Da fissare». Sotto la ricerca, sopra «Oggi». **Vedi** apre `/mensili` |
| Indietro dal modulo | Se l’indirizzo ha `da=mensili`, torna a `/mensili` e abbandona. Altrimenti le regole del ciclo 3 |
| Dopo Salva | Si apre il dettaglio, come oggi. Durata e prezzo si rileggono dal listino |
| Persistenza | Nessuna chiave nuova |

## 4. Architettura

`/mensili` sta dietro l’accesso, in `PhoneShell` senza barra in basso. Home resta in `ShellFrame`, con la barra.

La pagina e il banner chiamano `useDogs` e `useAppointments`. Una funzione pura, senza lettura né scrittura, divide i cani. Non esiste un hook che salvi uno stato mensile. Non si aggiunge nessun campo a `Dog` né a `Appointment`.

Esci toglie solo `groomly.session`. `findCorruptGroomlyKey` non cambia: non c’è una chiave nuova. Un JSON illeggibile mostra «Dati locali illeggibili» e non cancella il valore.

L’indirizzo di **Fissa** è `/appuntamenti/nuovo` con:

- `cane`, l’id
- `data`, `aaaa-mm-gg`
- `ora`, `HH:mm`, solo se c’è uno storico con un’ora valida
- `servizi`, gli id delle righe dello storico, nell’ordine salvato, separati da virgola, solo se dopo il filtro ne resta almeno uno
- `da=mensili`

Un refresh tiene questi valori. `da=mensili` è esatto: un altro valore non attiva il ritorno alla lista.

`backTarget` guarda `da` prima del cane e del giorno. Con `da=mensili`, Indietro è `/mensili`. Senza, resta il ciclo 3: id di un cane presente → `/animali/{id}`; giorno valido → `/calendario?data=`; altrimenti `/`. Il chip e il menu + non mettono `da=mensili`.

Il cane si preseleziona solo se è attivo. Un’ora che non passa `isStartTime` si ignora e il campo resta vuoto. Un id servizio assente o non attivo si toglie. Se non ne resta nessuno, `serviceIds` è `[]`.

Lo storico è l’appuntamento di quel cane con `start < now` e il `start` più grande. L’inizio proposto è quello storico. Con un’ora valida si aggiungono 4 settimane con `addWeeks`, e si ripete finché l’inizio è `>= now`. Il giorno e l’ora del modulo sono quelli di quell’inizio. Se l’ora dello storico non è un quarto d’ora tra le 08:00 e le 19:00, il campo ora resta vuoto e si aggiungono 4 settimane finché il giorno locale è oggi o dopo.

Salva passa da `prepareAppointmentWrite`: durata e prezzo sono quelli del listino per la taglia attuale. Non si ricopiano i prezzi dello storico. Il chip della scheda continua a copiare le righe già salvate e a scrivere subito.

## 5. Schermate

Il banner sta nel blocco sotto la ricerca e sopra il titolo «Oggi». Sfondo `var(--tea-s)`, testo `var(--tea)`. Con un cane: «1 mensile da programmare». Dal secondo: «N mensili da programmare». Il numero conta tutti i «Da fissare». Sotto, al massimo tre nomi, nell’ordine di quella lista, separati da «, ». **Vedi** è un pulsante e naviga a `/mensili`. Zero «Da fissare»: il banner non è nel documento. Ricerca, data, Impostazioni e «Oggi» non cambiano.

La pagina ha titolo «Clienti mensili» e Indietro verso `/`. Zero cani attivi Mensile: solo «Nessun mensile», senza i due titoli di blocco.

**Da fissare**, solo se ha righe. Foto `DogAvatar` `sm`, nome, sottotitolo, **Fissa** a destra. Il sottotitolo è «Ultimo » più `formatHomeDate` del passato più recente con la prima lettera minuscola, per esempio «Ultimo sabato 5 settembre». Senza passato: «Nessun appuntamento». Ordine: prima chi non ha passato, per `localeCompare` `it` del nome e poi `id`; poi chi ha un passato, dal `start` più piccolo, a parità nome e poi `id`.

**Fissati**, solo se ha righe. Foto `sm`, nome, «Sabato 17 ottobre · 09:00»: `formatHomeDate` del prossimo, « · », ora `HH:mm`. Il prossimo è quello già definito da `nextAppointment`. Il tocco sulla riga apre `/appuntamenti/{id}` di quel prossimo. Ordine: `start` crescente, poi `id`. Queste righe non hanno **Fissa**.

Un Occasionale o un archiviato non compare. L’avviso critico non si mostra qui. Il titolo del modulo resta «Nuovo appuntamento».

## 6. Errori

La lista e il banner non scrivono e non mostrano un toast. Il modulo tiene «Scegli un cane», «Scegli un servizio», «Scegli il giorno», «Scegli l’ora». Manca un campo: nessuna scrittura, frase sotto il campo.

Cane archiviato o sconosciuto: campo cane vuoto. Ora non valida: campo vuoto. Nessun servizio rimasto: Salva mostra «Scegli un servizio» e non scrive. In tutti questi casi `da=mensili` continua a far tornare Indietro a `/mensili`.

La sovrapposizione resta quella del ciclo 3: «Si sovrappone a …» e Salva scrive comunque. Salva fallito: «Salvataggio non riuscito», tono `plain`, si resta nel modulo. Il toast nasce dal booleano, non da un effetto sull’errore.

Indietro non chiede conferma e non usa `window.confirm`. Un refresh non crea un appuntamento. «Nessun mensile» e «Nessun appuntamento» non sono errori.

## 7. Test

L’orologio è sabato 3 ottobre 2026, ore 12:00 locali. I test montano `App` con `// @vitest-environment happy-dom` come prima riga del file. Non si alza Vitest. Non si crea `src/lib/firebase.ts`.

- Un mensile senza appuntamenti mostra «1 mensile da programmare» e il nome. **Vedi** apre il titolo «Clienti mensili». Un Occasionale non compare nel banner. Un mensile con un appuntamento futuro non fa comparire il banner.
- Quattro «Da fissare»: il titolo è «4 mensili da programmare» e i nomi visibili sono solo i primi tre.
- Zero mensili attivi: «Nessun mensile». Un archiviato non c’è. L’ordine di «Da fissare» e di «Fissati» è quello del §5. La riga fissata apre il dettaglio. Il sottotitolo di un passato al 5 settembre 2026 è «Ultimo sabato 5 settembre».
- **Fissa** senza storico: cane selezionato, `data` `2026-10-03`, ora «Scegli», nessun servizio premuto. Indietro torna al titolo «Clienti mensili» e la mappa appuntamenti non guadagna chiavi.
- Storico 5 settembre 2026 ore 09:30, servizio Bagno, taglia piccola. Il 3 ottobre 2026 alle 09:30 è prima delle 12:00, quindi **Fissa** propone `2026-10-31` e ora `09:30`, con Bagno premuto. Indietro non scrive. **Salva** mostra nel dettaglio «30 min» e «€ 20». Quel cane è sotto «Fissati» con «Sabato 31 ottobre · 09:30». Se era l’unico da fissare, il banner non c’è.
- Il chip della scheda e «Nuovo appuntamento» dal menu + non mettono `da=mensili`, quindi il loro Indietro non è `/mensili`. Il Listino mostra «In arrivo». Esci lascia cani e appuntamenti nella loro chiave.

I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.
