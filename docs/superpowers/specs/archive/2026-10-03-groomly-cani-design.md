# Groomly — Cani (ciclo 2)

Data: 2026-10-03
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` e il mockup `groomly-design.html`.
Questo documento copre il ciclo cani, il punto 4 del §10 di `GROOMLY.md`, nel taglio chiuso sotto. Il ciclo 1 (fondazione, kit, servizi) è già su `master` e non si ridisegna.

## 1. Scopo

Sostituire il segnaposto Animali con una lista vera e una scheda. La toelettatrice può aggiungere un cane, cercarlo, filtrarlo, modificarlo, archiviarlo e ripristinarlo. I dati restano sul dispositivo, nella forma `users/{uid}/dogs`, così più avanti si sostituisce solo il repository.

## 2. Fuori da questo ciclo

Appuntamenti, calendario, agenda in Home, «Fissa il successivo», clienti mensili come promemoria, listino PDF, backup, Firebase, Storage, Capacitor, notifiche, campanello, attività, campi personalizzati, tag, peso, contatti oltre al primo, prezzi in scheda, storico trattamenti, galleria, foto prima/dopo, chip «In agenda», ordinamento per prossimo appuntamento, eliminazione definitiva.

«Nuovo appuntamento» resta il toast «In arrivo».

I cani di esempio del §11 di `GROOMLY.md` non si caricano. La lista parte vuota.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Perimetro | Lista, ricerca, scheda unica, foto profilo locale, archivio |
| Lista | Tab Attivi, Mensili, Occasionali, Archivio. Chip Tutti, Mordaci, Anziani, Gatti |
| Scheda | Una pagina. Si legge, Modifica la rende editabile, Salva torna in sola lettura |
| Campi | Foto, nome, specie, razza, sesso, categoria di età, taglia, carattere, tipo cliente, un contatto, nota, avviso critico |
| Obbligatori | Nome del cane e telefono. Il resto ha un default oppure può restare vuoto |
| Età | La toelettatrice sceglie la categoria. Nessun anno di nascita |
| Foto | Un JPEG quadrato, lato massimo 256 px, qualità 0.7, salvato sul cane |
| Archivio | «Non più in cura» oppure «Deceduto». Ripristina. Nessuna eliminazione |
| Persistenza | Una mappa `localStorage` per account, come i servizi |

Default di un cane nuovo: specie `cane`, taglia `piccola`, carattere `bravo`, tipo cliente `occasionale`, categoria `adulto`. Il sesso parte non scelto.

## 4. Architettura

Le pagine chiamano solo `useDogs`. L’hook chiama solo il repository in `src/data/local/dogs.ts`. Il repository usa `readJson` e `writeJson`. La chiave è `groomly.users.{uid}.dogs`.

Nel dominio le date sono `Date`. Nello storage sono stringhe ISO. La foto è la stringa `data:image/jpeg;base64,…` sullo stesso oggetto. `createdAt` e `updatedAt` si aggiornano a ogni scrittura riuscita.

`findCorruptGroomlyKey` riconosce anche questa chiave. Un JSON illeggibile mostra «Dati locali illeggibili» e non cancella nulla.

La ricerca, le tab e i chip sono funzioni pure sulla lista già letta. Non scrivono.

La compressione della foto sta in `src/lib/dogPhoto.ts`. Il repository riceve solo la stringa già pronta.

### Rotte

| Percorso | Pagina | Barra in basso |
|---|---|---|
| `/animali` | Lista | sì |
| `/animali/nuovo` | Scheda vuota, già editabile | no |
| `/animali/:id` | Scheda del cane | no |

`/animali/nuovo` è registrata prima di `/animali/:id`. Aggiungi e «Nuovo cane» aprono `/animali/nuovo`. Dopo il primo salvataggio l’indirizzo diventa `/animali/:id` in sola lettura, così un refresh non apre un’altra scheda vuota.

La ricerca della Home resta un bottone. Apre `/animali` e mette il fuoco nel campo di ricerca della lista. Non porta un testo già scritto.

## 5. Schermate

Interfaccia in italiano. Colonna massima 390 px. Nessuno scroll orizzontale a 360 px.

### 5.1 Lista

Intestazione «Animali». Sottotitolo «N attivi · M in archivio»: N è il numero di cani `attivo`, M è la somma di `non_in_cura` e `deceduto`. Questi due numeri ignorano tab, chip e ricerca. Azione in testata: Aggiungi.

Il campo di ricerca filtra mentre si scrive. Confronta nome del cane, razza e nome del contatto, dopo la stessa normalizzazione di `searchKey`. Il telefono non entra nella ricerca.

Tab, ciascuna con il conteggio calcolato sull’intera lista, prima di chip e ricerca:

| Tab | Cani inclusi |
|---|---|
| Attivi | `status === 'attivo'` |
| Mensili | attivi con `clientType === 'mensile'` |
| Occasionali | attivi con `clientType === 'occasionale'` |
| Archivio | `non_in_cura` e `deceduto` |

Un solo chip è attivo. Si applicano dentro la tab corrente: Tutti, Mordaci (`temperament === 'mordace'`), Anziani (`ageCategory === 'anziano'`), Gatti (`species === 'gatto'`). Ogni cane attivo ha un tipo cliente, quindi Mensili più Occasionali coincide con il conteggio di Attivi.

Ordine alfabetico con `localeCompare('it')` sul nome. Una riga mostra la foto a 36 px tramite `DogAvatar`, il nome, il chip Mensile se il cliente è mensile, il chip Anziano se la categoria è anziano, la riga «razza · categoria · proprietario» e `TemperamentIcon`. Le parole della riga sono le etichette italiane (Adulto, non `adulto`). I pezzi vuoti di quella riga si omettono, insieme al separatore. Una riga archiviata è attenuata (`--tx3` sul nome) e mostra «Non più in cura» oppure «Deceduto». Non c’è una riga sull’appuntamento. Il tocco apre `/animali/:id`.

Nessuna riga visibile: «Nessun cane».

### 5.2 Scheda

Cane nuovo: titolo «Nuovo cane», campi editabili. Cane esistente: titolo «Scheda», sola lettura, Indietro verso `/animali`.

Contenuto, dall’alto: foto, nome, specie, razza, sesso, categoria, taglia, carattere, tipo cliente, nome del contatto, telefono, nota. Se l’avviso critico è compilato, un riquadro rosso (`--bad`) sta sotto l’intestazione del cane, visibile senza cercarlo in fondo. In sola lettura il telefono è un link `tel:`. Il sesso vuoto non si mostra. La foto mancante usa il segnaposto del kit.

Modifica rende editabili gli stessi campi. Salva valida, scrive, mostra il toast «Salvato» e torna in sola lettura. Indietro prima di Salva abbandona le modifiche, compresa una foto scelta e non salvata, e torna alla lista.

In sola lettura, su un cane attivo, ci sono «Non più in cura» e «Deceduto». Il tocco archivia subito, senza conferma. Sulla scheda archiviata c’è Ripristina. Modifica resta disponibile anche da archiviato. La foto si sceglie solo in modifica, con `accept="image/*"`, e si salva insieme al resto.

Etichette dei valori: Cane, Gatto, Altro; Maschio, Femmina; Cucciolo, Giovane, Adulto, Anziano; Piccola, Media, Grande; Bravo, Agitato, Mordace; Mensile, Occasionale. Il nome del cane è «Nome». Il contatto è «Proprietario» e «Telefono».

## 6. Dati

```ts
export type Species = 'cane' | 'gatto' | 'altro'
export type Sex = 'M' | 'F'
export type AgeCategory = 'cucciolo' | 'giovane' | 'adulto' | 'anziano'
export type DogSize = 'piccola' | 'media' | 'grande'
export type Temperament = 'bravo' | 'agitato' | 'mordace'
export type ClientType = 'mensile' | 'occasionale'
export type DogStatus = 'attivo' | 'non_in_cura' | 'deceduto'

export interface DogContact {
  name: string
  phone: string
}

export interface Dog {
  id: string
  name: string
  species: Species
  breed: string
  sex?: Sex
  ageCategory: AgeCategory
  size: DogSize
  temperament: Temperament
  clientType: ClientType
  photo?: string
  criticalNote?: string
  notes?: string
  contact: DogContact
  status: DogStatus
  archivedAt?: Date
  searchKey: string
  createdAt: Date
  updatedAt: Date
}
```

Razza e nome del proprietario, se lasciati vuoti, si salvano come stringa vuota. Nota e avviso critico vuoti non si salvano. Il sesso assente non si salva.

`searchKey` lo ricostruisce il repository a ogni creazione e aggiornamento. È il nome, la razza e il nome del contatto, uniti da spazi, in minuscolo, senza accenti (NFD, segni combinanti rimossi), con gli spazi ripetuti compressi. Il telefono ne resta fuori.

L’id è `crypto.randomUUID()`. Due cani possono avere lo stesso nome.

`createDog`, `updateDog`, `archiveDog` e `restoreDog` riscrivono l’intera mappa e restituiscono il cane. `listDogs` restituisce la lista ordinata. Un id assente lancia `AppError` con codice `dog_missing` e non scrive. `archiveDog` imposta lo status richiesto e `archivedAt` a adesso. `restoreDog` imposta `attivo` e toglie `archivedAt`.

La pagina valida con Zod prima di chiamare l’hook. Nome e telefono sono trimmati. Vuoti, gli errori sono «Il nome è obbligatorio» e «Il telefono è obbligatorio». Il telefono non ha un formato: basta che dopo il trim non sia vuoto. Specie, taglia, carattere, categoria e tipo cliente arrivano solo dai controlli del form.

`prepareDogPhoto(file)` ritaglia il centro a quadrato, scala il lato a al massimo 256 px, esporta JPEG a qualità 0.7 e restituisce il data URL. Un file che non è un’immagine, o una compressione fallita, non cambia la foto e la pagina mostra «Foto non utilizzabile». Gli altri campi restano come digitati.

## 7. Errori

| Situazione | Comportamento |
|---|---|
| Nome o telefono vuoti | Errore sotto il campo. Nessuna scrittura. Si resta in modifica |
| `setItem` lancia durante Salva, anche per quota | Toast «Salvataggio non riuscito». Il cane salvato non cambia. Si resta in modifica con il testo digitato |
| `dog_missing` | Stesso toast. Non si crea un duplicato |
| Archivio o ripristino non scritti | Stesso toast. Si resta in sola lettura e lo status a schermo non cambia |
| Foto non usabile | «Foto non utilizzabile». Nessun cambio foto |
| Mappa cani illeggibile | «Dati locali illeggibili». Non si cancella nulla |
| Esci | Si toglie solo la sessione. I cani restano |

Salva, archivia e ripristina passano dall’hook, che restituisce `false` senza aggiornare la lista in memoria. Un successo di Salva mette `error` a vuoto, aggiorna la lista e mostra «Salvato». Archivio e ripristino riusciti non hanno un toast proprio: la scheda mostra il nuovo status.

## 8. Test

Repository, su `localStorage` vero:

- il cane nuovo sta in `groomly.users.{uid}.dogs` e `searchKey` nasce da nome, razza e contatto;
- le date rilette sono `Date`;
- archivio scrive `non_in_cura` o `deceduto` con `archivedAt`;
- ripristino rimette `attivo` e toglie `archivedAt`;
- un id assente lancia `dog_missing` e la mappa resta identica;
- `setItem` che lancia lascia il cane precedente.

Pagine, tramite `App`, con happy-dom come impostazioni e servizi:

- si crea un cane con nome e telefono, compare in Attivi, la scheda si apre, e un nome vuoto non scrive;
- «Deceduto» lo toglie da Attivi, lo mostra in Archivio, e Ripristina lo riporta;
- ricerca, tab Mensili e chip Gatti filtrano le righe visibili.

`prepareDogPhoto` ha un test: un’immagine grande diventa un JPEG il cui lato non supera 256 px.

Il JSON cani illeggibile riusa il controllo «Dati locali illeggibili» e il valore rotto è ancora nella chiave.

Controllo manuale a 360 px, in chiaro e in scuro: lista vuota, cane nuovo, modifica e Salva, ricerca, ogni tab e ogni chip, entrambi gli archivi, ripristino, Indietro che abbandona una modifica, salvataggio fallito che tiene il nome vecchio. «Nuovo appuntamento» dice ancora «In arrivo». Nessuno scroll orizzontale.

## 9. Criteri di accettazione

1. Da Animali si aggiunge un cane con nome e telefono e lo si ritrova in Attivi dopo un refresh.
2. La ricerca restringe per nome, razza e proprietario. Le tab e i chip si combinano. I conteggi delle tab non cambiano mentre si scrive nella ricerca.
3. Modifica e Salva aggiornano la scheda. Indietro senza Salva non scrive.
4. «Non più in cura» e «Deceduto» spostano il cane in Archivio. Ripristina lo rimette tra gli attivi.
5. La foto salvata è un JPEG di lato al massimo 256 px. Senza foto si vede il segnaposto.
6. Un salvataggio fallito non sostituisce il cane già salvato.
7. Calendario, listino PDF, appuntamenti e «Nuovo appuntamento» restano com’erano alla fine del ciclo 1.
