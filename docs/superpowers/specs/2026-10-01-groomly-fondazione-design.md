# Groomly — Fondazione, kit e servizi (ciclo 1)

Data: 2026-10-01
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` e il mockup `groomly-design.html`.
Questo documento copre solo il primo ciclo di implementazione (punti 1–3 del §10 di `GROOMLY.md`). I cicli successivi restano descritti lì e non si progettano qui.

## 1. Scopo

Consegnare un’app Vite usabile da una sola toelettatrice, in italiano, che:

- si apre nel guscio visivo del mockup (telefono, compatto);
- crea un account al primo avvio e poi fa il login;
- salva il tema e il catalogo servizi sul dispositivo;
- tiene i dati nella forma `users/{uid}/…`, così più avanti si sostituisce solo il salvataggio con Firestore.

## 2. Fuori da questo ciclo

Cani, scheda, archivio, calendario, appuntamenti, home con agenda e recenti, mensili, promemoria, listino PDF, backup, export, import, Capacitor, notifiche, campanello, attività (ragione sociale, partita IVA), campi personalizzati, tag, foto e Storage.

Il progetto Firebase non si crea in questo ciclo. La guida (Authentication, regole, indici, persistenza offline) arriva quando si sostituisce il repository locale.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Perimetro | Fondazione + kit interfaccia + servizi (punti 1–3) |
| Impostazioni | Solo Aspetto e Servizi e durate |
| Persistenza | `localStorage`, repository con forma Firestore |
| Guscio | Barra e pulsante + come nel mockup; le pagine future mostrano «In arrivo» |
| Servizi | Modifica, aggiunta, riordino, disattivazione. Nessuna cancellazione. Il tipo si sceglie solo in creazione |
| Extra | Un solo tempo e un solo prezzo, copiati sulle tre taglie |
| Accesso | Primo avvio crea l’unico account. Password con hash e sale |
| Approccio | Schermate vere più pagina `/dev/kit` in sviluppo |
| Desktop | Colonna centrata, larga al massimo 390 px, sfondo `--bg` |

## 4. Architettura

Stack: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, react-hook-form, Zod, date-fns con locale `it` (settimana che inizia di lunedì), lucide-react (stroke 2), SVG del kit.

Token colore del §4.1 di `GROOMLY.md` in `src/theme/tokens.css`, invariati, chiaro e scuro. Misure del §4.3 solo in `src/theme/sizes.ts`. Font Inter. Nessun numero magico nei componenti.

Il kit `groomly-cursor-kit.zip` si estrae e `icons/svg` più `icons/icons.ts` vanno in `src/assets/icons/`.

Cartelle di questo ciclo:

```
src/
├─ app/                 App.tsx, router.tsx, providers (sessione, tema)
├─ assets/icons/        svg + icons.ts
├─ theme/               tokens.css, sizes.ts, theme.ts
├─ lib/                 format.ts, password.ts
├─ types/               models.ts
├─ data/                interfacce repository
│  ├─ local/            auth, settings, services, storage
│  └─ seed/             services.ts
├─ hooks/               useSession, useSettings, useServices
├─ components/
│  ├─ layout/           PhoneShell, Header, BottomNav, Fab, Sheet, Toast
│  ├─ ui/               Chip, Button, IconButton, Input, SearchBar,
│  │                    Segmented, Toggle, Card, Row, SectionTitle
│  └─ domain/           DogAvatar, TemperamentIcon, ServiceIcon
└─ pages/               Login, Home, Placeholder, Settings, Services, DevKit
```

`src/lib/firebase.ts` non esiste in questo ciclo.

Le pagine chiamano solo gli hook. Gli hook chiamano i repository. L’adapter locale è l’unica implementazione. L’adapter Firestore futuro mapperà `Date` ↔ `Timestamp` nello stesso confine: nel dominio le date sono `Date`.

Su viewport più larghi di 390 px, `PhoneShell` centra una colonna `max-width: 390px`. Sotto i 360 px il contenuto resta nella viewport, senza scroll orizzontale.

### Rotte

| Percorso | Pagina | Barra in basso |
|---|---|---|
| `/login` | Crea accesso oppure Entra | no |
| `/` | Home | sì |
| `/animali` | Segnaposto Animali | sì |
| `/calendario` | Segnaposto Calendario | sì |
| `/listino` | Segnaposto Listino | sì |
| `/impostazioni` | Aspetto e link ai servizi | no |
| `/impostazioni/servizi` | Editor servizi | no |
| `/dev/kit` | Galleria componenti | no |

`/dev/kit` è registrata solo se `import.meta.env.DEV`. Non compare in nessun menu.

Senza sessione, ogni rotta diversa da `/login` reindirizza a `/login`. Con sessione, `/login` reindirizza a `/`.

## 5. Schermate e componenti

Lingua dell’interfaccia: solo italiano. Prezzi come nel §1 di `GROOMLY.md`: simbolo euro prima del numero, spazio, formato `it-IT`. Intero se il valore non ha decimali (`€ 25`); altrimenti due decimali (`€ 10,50`). `Intl` con `currency: 'EUR'` produce `25,00 €` e non va usato così com’è.

### Login

Fuori dal mockup, stessa densità. Card unica.

- Nessun account: titolo «Crea accesso», campi email e password, bottone primario «Crea accesso».
- Account presente: titolo «Entra», bottone «Entra». Nessun link per un secondo account.
- Errori di validazione sotto il campo.
- Password minima: 8 caratteri. Nessun interruttore per mostrare la password.

### Home

Header: logo, «Groomly», data di oggi con iniziale maiuscola (`Giovedì 1 ottobre`), ingranaggio verso `/impostazioni`. Il campanello non c’è in questo ciclo.

Barra di ricerca visibile. Il tocco apre `/animali`. Non filtra.

Sotto, una riga di testo `--tx3`: «In arrivo». Nessuna illustrazione.

### Segnaposto

Animali, Calendario e Listino: header con il titolo della voce e la riga «In arrivo».

### Pulsante +

Bottom sheet con due righe: «Nuovo appuntamento» e «Nuovo cane». Il tocco chiude il foglio e mostra il toast «In arrivo» per 2 secondi.

### Impostazioni

Freccia indietro. Sezioni a card:

- **Aspetto.** Segmented Chiaro / Scuro / Auto. Il tocco applica subito `data-theme` e salva. Nessun toast di successo sul tema.
- **Personalizza.** Una riga «Servizi e durate». Sottotitolo con il numero dei servizi attivi: «1 servizio · tempi stimati» oppure «N servizi · tempi stimati». Chevron verso `/impostazioni/servizi`.

In fondo: «Groomly v1.0» e **Esci**. Esci cancella la sessione e torna al login. Account, tema e servizi restano sul dispositivo.

`auto` segue `prefers-color-scheme` e si aggiorna se il sistema cambia tema.

### Servizi e durate

Pagina secondaria. Una card, righe ordinate per `order` crescente, divisore `1px var(--line)`.

Riga: icona servizio, nome, chip «Principale» o «Extra», durata e prezzo in sintesi, controlli su e giù. Una riga con `active: false` usa il colore terziario e il chip «Disattivato». Le righe disattivate restano in lista.

Sintesi durata e prezzo:

- principale: se le tre taglie coincidono, un solo valore (`60m`, `€ 35`); se differiscono, l’intervallo dal minimo al massimo (`30–60m`, `€ 20–38`);
- extra: un valore con il prefisso più sulla durata, per esempio `+20m` e `€ 5`.

Su è disabilitato sulla prima riga, giù sull’ultima. Lo scambio vale per tutta la lista, comprese le righe disattivate.

Il tocco sulla riga (non sui controlli di ordine) apre un bottom sheet:

- nome;
- per un principale, tre coppie durata/prezzo (piccola, media, grande);
- per un extra, una durata e un prezzo;
- interruttore Attivo;
- bottone **Salva**.

Salva chiude il foglio e mostra il toast «Salvato». Il tipo non è nel foglio di modifica.

**Aggiungi servizio**, in fondo alla pagina, apre un bottom sheet di creazione: nome obbligatorio, segmented Principale / Extra, gli stessi campi numerici, interruttore Attivo acceso di default. Nessun selettore di icona. Il documento nasce senza `iconKey`. In lista si usano le forbici Lucide (`Scissors`, `--tx3`), come da §5.1 per un servizio senza icona dedicata.

Non esiste un’azione Elimina.

### Componenti

Quelli del punto 2 del §10, confrontati con il mockup: Chip, Button, IconButton, SearchBar, Segmented, Toggle, Card, Row, SectionTitle, Sheet, Toast, BottomNav, Fab, DogAvatar, TemperamentIcon, ServiceIcon, più Input e Header usati dalle pagine.

`/dev/kit` mostra, su sfondo dell’app, gli stessi componenti con stati rappresentativi (chip selezionato, toggle acceso, avatar senza foto, le tre icone carattere, le icone servizio del seed, un toast e un bottom sheet di prova). Serve a verificare i pezzi che login e impostazioni non esercitano da soli.

Toast: sfondo `--tx`, testo `--card`, 2 secondi, sopra la barra quando la barra è visibile. «Salvato» ha l’icona check verde. «In arrivo» e «Salvataggio non riuscito» usano lo stesso guscio, senza check.

## 6. Dati e flusso

Chiavi `localStorage`:

| Chiave | Contenuto |
|---|---|
| `groomly.auth` | L’unico account |
| `groomly.session` | `uid` della sessione, sopravvive al refresh |
| `groomly.users.{uid}.settings` | Documento impostazioni |
| `groomly.users.{uid}.services` | Mappa `id → servizio` |

### Account

```ts
interface LocalAccount {
  uid: string;            // uuid alla registrazione
  email: string;          // minuscolo, senza spazi esterni
  passwordHash: string;   // base64
  salt: string;           // base64, 16 byte
  iterations: number;     // 100000
  createdAt: string;      // ISO
}
```

Hash: PBKDF2-SHA-256 via Web Crypto, 100.000 iterazioni, sale casuale da 16 byte, chiave derivata da 32 byte. Sale e hash si salvano in base64. La password in chiaro non si scrive e non si logga. Il confronto usa gli hash, non la password ricostruita.

`createAccount` e `login`, se riescono, scrivono `groomly.session` con l’`uid` e la navigazione va a `/`. `logout` cancella solo `groomly.session`.

### Impostazioni

```ts
interface SettingsMain {
  theme: 'light' | 'dark' | 'auto';
  updatedAt: string;      // ISO
}
```

Questo ciclo non aggiunge gli altri campi del §6. Il documento si estenderà nei cicli successivi. Se la chiave manca, `getSettings` la crea con `theme: 'auto'` e `updatedAt` uguale all’istante della creazione.

### Servizio

Come `Service` nel §6 di `GROOMLY.md`: `id`, `name`, `iconKey` opzionale, `kind` (`principale` | `extra`), `durationMin` e `price` per `piccola` | `media` | `grande`, `order`, `active`, `createdAt`, `updatedAt`. In locale le date sono stringhe ISO; nel dominio sono `Date`.

### Seed

`useServices`, al caricamento con sessione valida, chiama `ensureServiceSeed`. Il seed si scrive solo se la mappa è vuota o assente. Disattivare i servizi o cambiarne i prezzi non lo rilancia. Gli id sono stabili.

| Id | Nome | Tipo | Durata P/M/G | Prezzo P/M/G | iconKey |
|---|---|---|---|---|---|
| bagno | Bagno | principale | 30/45/60 | 20/28/38 | bagno |
| taglio | Taglio / tosatura | principale | 45/60/75 | 30/35/45 | taglio |
| bagno-taglio | Bagno + taglio | principale | 60/90/120 | 35/45/60 | bagno_taglio |
| stripping | Stripping | principale | 120/150/180 | 50/65/85 | assente |
| nodi | Gestione nodi | extra | 20/20/20 | 5/5/5 | nodi |
| dermatologico | Dermatologico | extra | 15/15/15 | 10/10/10 | dermatologico |
| antiparassitario | Antiparassitario | extra | 10/10/10 | 12/12/12 | antiparassitario |
| unghie | Unghie | extra | 10/10/10 | 5/5/5 | assente |

`order` da 0 a 7 nell’ordine della tabella. «Da € 5» dei nodi è il numero 5. Tutti nascono `active: true`.

Un extra modificato mostra un campo durata e un campo prezzo. Il salvataggio copia quei due numeri su piccola, media e grande.

Un servizio nuovo: `id` uuid, `order` = massimo attuale + 1 (0 se la mappa è vuota), `active` dal foglio, `iconKey` assente, `kind` scelto nel foglio e poi immutabile.

### Repository

```ts
getAccount(): LocalAccount | null
createAccount(email: string, password: string): Promise<LocalAccount>
login(email: string, password: string): Promise<LocalAccount>
logout(): void
getSession(): string | null

getSettings(uid: string): SettingsMain
setTheme(uid: string, theme: SettingsMain['theme']): SettingsMain

listServices(uid: string): Service[]          // ordinate per order
ensureServiceSeed(uid: string): Service[]
createService(uid: string, input: ServiceInput): Service
updateService(uid: string, id: string, patch: ServicePatch): Service
moveService(uid: string, id: string, direction: 'up' | 'down'): Service[]
```

`ServicePatch` può cambiare `name`, `durationMin`, `price`, `active`. Non include `kind` né `id`. `ServiceInput` include `name`, `kind`, `durationMin`, `price`, `active`.

`createAccount` rifiuta se `groomly.auth` esiste già. `login` rifiuta se email o password non coincidono con l’unico account. `moveService` rifiuta, senza scrivere, se la riga è già al bordo nella direzione chiesta. `updateService` e `moveService` rifiutano se l’id non esiste e non creano un documento nuovo.

### Hook

`useSession`, `useSettings`, `useServices`. Dopo una scrittura riuscita, lo stato in memoria coincide con ciò che è stato appena letto dallo storage.

## 7. Errori e casi limite

Validazione Zod. Errori di campo sotto il campo. Fallimenti di salvataggio: toast «Salvataggio non riuscito» (2 secondi) e ritorno all’ultimo stato letto. Il toast di successo dei servizi è «Salvato».

| Caso | Comportamento |
|---|---|
| Email non valida o password sotto 8 caratteri | Messaggio sotto il campo, nessuna scrittura |
| Credenziali diverse dall’account | «Email o password non corretti» |
| Account già presente | La schermata è «Entra» |
| Una chiave `groomly.*` presente ma non parsabile | Schermata con la sola riga «Dati locali illeggibili», senza form. Nessuna chiave viene cancellata |
| Sessione con `uid` diverso da `groomly.auth` | Sessione azzerata, redirect al login. I servizi di quell’uid restano |
| Scrittura fallita (quota, storage bloccato) | Stato precedente ripristinato, toast di errore |
| `setTheme` fallito | Resta il tema precedente |
| Durata non intera o minore di 1; prezzo minore di 0 o con più di due decimali | Errore sotto il campo |
| Nome vuoto | Errore sotto il campo |
| Su sulla prima riga, giù sull’ultima | Controllo disabilitato |
| Ultimo servizio disattivato | Consentito. La lista mostra le righe disattive |
| Id assente in update o move | Nessun duplicato, toast di errore |
| Seed con mappa non vuota | Il seed non parte |

Web Crypto assente: la creazione account e il login mostrano «Questo dispositivo non può proteggere la password» e non salvano l’account.

## 8. Verifica

Vitest e React Testing Library (jsdom).

Logica pura:

- schemi Zod di login e servizio;
- PBKDF2 con poche iterazioni nel test: hash, verifica giusta, verifica sbagliata;
- tema `light`, `dark`, `auto` rispetto a `prefers-color-scheme`;
- euro (`€ 25`, `€ 10,50`) e data Home (`Giovedì 1 ottobre`);
- seed: 8 id, extra con lo stesso numero sulle tre taglie, nodi a 5 euro.

Repository con `localStorage` finto:

- crea account e login riuscito scrivono `groomly.session`; login fallito non la scrive;
- Esci toglie la sessione e lascia account, tema e servizi;
- il seed si scrive una volta;
- update, disattivazione, create, move;
- move agli estremi non scrive;
- JSON illeggibile non cancella chiavi;
- sessione con uid diverso azzera la sessione e lascia i servizi.

Pagine:

- rotta interna senza sessione → `/login`;
- `/login` con sessione → `/`;
- il + mostra il toast «In arrivo»;
- salvataggio servizio → toast «Salvato»;
- scrittura fallita → stato precedente e toast «Salvataggio non riuscito».

Controllo manuale a fine ciclo, a 360 px di larghezza della colonna, in chiaro e in scuro:

- nessuno scroll orizzontale e nessun testo sovrapposto;
- testi del tema scuro leggibili sul loro sfondo;
- dopo un refresh restano account, tema e servizi;
- `/dev/kit` risponde solo in `vite` di sviluppo;
- Impostazioni contiene Aspetto, Servizi e durate, «Groomly v1.0» ed Esci.

## 9. Criteri di accettazione del ciclo

1. Primo avvio: email e password creano l’account; al riavvio la stessa coppia entra e una coppia diversa no.
2. Il tema scelto resta dopo il refresh e, con Auto, segue il sistema.
3. All’ingresso compaiono gli 8 servizi del seed, con icone del kit dove `iconKey` c’è e forbici Lucide dove manca.
4. Si modifica nome, durate e prezzi, si aggiunge un servizio, si disattiva, si riordina. Dopo il refresh lo stato è lo stesso. Non c’è modo di cancellare un servizio.
5. Un extra ha un solo prezzo e una sola durata in modifica, e in storage i tre slot coincidono.
6. Home, Animali, Calendario, Listino e il + si comportano come al §5. Impostazioni non mostra Attività, backup, campi, tag, archivio né campanello.
7. A 360 px non c’è scroll orizzontale. Il tema scuro è leggibile.
8. I test del §8 passano.

## 10. Ciclo successivo

Il ciclo dopo questo, quando il documento sarà stato rivisto e ne esisterà un piano, è il punto 4 di `GROOMLY.md`: cani (lista, ricerca, scheda, foto, archivio). Firestore si innesta sostituendo `src/data/local` quando si decide di creare il progetto Firebase, con guida passo passo. Le pagine non cambiano interfaccia per quel passaggio.
