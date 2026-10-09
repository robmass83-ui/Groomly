# Groomly — Specifica per lo sviluppo (Cursor)

App gestionale per **un salone di toelettatura cani** (un solo utente: la toelettatrice).
Questo file è la fonte di verità. Il riferimento visivo è `design/groomly-design.html`: aprilo nel browser e **riproducilo fedelmente** (misure, colori, densità, icone).

> Regola d'oro: **compatto e ordinato**. Niente grandi spazi vuoti, testo piccolo ma leggibile, chip larghi quanto il loro testo, liste in card unica con divisori sottili.

---

## 0. Contenuto del kit

```
groomly-cursor-kit/
├─ GROOMLY.md                ← questo file
├─ design/groomly-design.html← mockup di tutte le schermate (tema chiaro/scuro)
└─ icons/
   ├─ svg/                   ← icone illustrate da usare nell'app
   ├─ png/64|128|256/        ← stesse icone in PNG trasparente
   ├─ icons.ts               ← manifest TypeScript
   └─ README.md              ← elenco, dimensioni, uso
```

Copia `icons/svg` e `icons/icons.ts` in `src/assets/icons/`.

---

## 1. Stack

| Ambito | Scelta |
|---|---|
| UI | React 18 + TypeScript + Vite |
| Stile | Tailwind CSS con token CSS custom (vedi §4), font **Inter** |
| Routing | React Router v6 |
| Form | react-hook-form + zod |
| Date | date-fns con locale `it` (settimana che inizia di lunedì) |
| Icone UI | `lucide-react` (stroke 2) |
| Icone illustrate | SVG del kit (`icons/svg`) |
| Backend | **Firebase**: Authentication (email/password), Firestore (persistenza offline attiva), Storage (foto e listino PDF) |
| Stato server | TanStack Query oppure listener Firestore in hook dedicati (`useDogs`, `useAppointments`…) |
| App Android | PWA installabile + **Capacitor** per generare l'APK (uso privato, no store) |
| Notifiche locali | `@capacitor/local-notifications` (solo promemoria mensili, vedi §9.5) |
| Foto | `browser-image-compression` (max 1600px lato lungo, JPEG ~0.8) prima dell'upload |

Lingua dell'interfaccia: **solo italiano**. Valuta: euro, formato `€ 25` (intl `it-IT`).

---

## 2. Struttura cartelle

```
src/
├─ app/            App.tsx, router.tsx, providers (Auth, Theme, Query)
├─ assets/icons/   svg + icons.ts (dal kit)
├─ theme/          tokens.css, sizes.ts (costanti di misura), theme.ts
├─ lib/            firebase.ts, format.ts (€, date, durate), age.ts, search.ts, image.ts
├─ types/          models.ts (interfacce §6)
├─ data/           repository Firestore: dogs.ts, appointments.ts, services.ts, settings.ts, backup.ts
├─ hooks/          useDogs, useDog, useAppointments(day|range), useMonthly, useSettings…
├─ components/
│  ├─ layout/      PhoneShell, Header, BottomNav, Fab, Sheet (bottom sheet), Toast
│  ├─ ui/          Chip, Badge, Button, IconButton, Input, SearchBar, Segmented, Toggle, Card, Row, SectionTitle, KeyValueGrid, PriceInput
│  └─ domain/      DogAvatar, TemperamentIcon, ServiceIcon, DogRow, AppointmentRow, CalendarDay, WeekStrip, TreatmentItem, ContactRow, MonthlyRow, PhotoPair
└─ pages/          Home, Animals, DogDetail, DogForm, Calendar, AppointmentNew, AppointmentDetail, Monthly, PriceList, Settings, Archive, Login
```

Tutte le misure (altezze righe, raggi, font, dimensioni icone) stanno in **`src/theme/sizes.ts`**: nessun numero "magico" sparso nei componenti.

---

## 3. Navigazione

Bottom bar fissa (altezza 58px), 5 slot:

| Slot | Voce | Rotta |
|---|---|---|
| 1 | Home | `/` |
| 2 | Animali | `/animali` |
| 3 | **+** (FAB centrale 42px, raggio 14) | apre un mini-menu: *Nuovo appuntamento* / *Nuovo cane* |
| 4 | Calendario | `/calendario` |
| 5 | Listino | `/listino` |

Altre rotte: `/animali/:id`, `/animali/nuovo`, `/animali/:id/modifica`, `/appuntamenti/:id` (bottom sheet sopra il calendario), `/mensili`, `/impostazioni`, `/archivio`.
Impostazioni si aprono dall'ingranaggio in alto nella Home. Le pagine secondarie hanno freccia "indietro" a sinistra nell'header e **non** mostrano la bottom bar se sono form o impostazioni.

---

## 4. Design system

### 4.1 Colori (CSS variables, light + dark)

```css
:root{
  --bg:#eceff4; --card:#fff; --surf:#f4f6fa; --surf2:#eef1f6; --line:#e3e7ee;
  --tx:#1b2232; --tx2:#566072; --tx3:#8a93a3;
  --pri:#3a5ba0; --pri-s:#e7edf9;
  --ok:#17905a;  --ok-s:#e2f4eb;    /* bravo, fissato, backup ok */
  --warn:#b9770c;--warn-s:#fcf0d9;  /* agitato, da fissare */
  --bad:#cf4339; --bad-s:#fce6e4;   /* mordace, avvisi critici, cancella */
  --sen:#7254c0; --sen-s:#eee8fb;   /* anziano */
  --tea:#0f8a8a; --tea-s:#dff3f2;   /* mensile */
}
[data-theme="dark"]{
  --bg:#0c0f15; --card:#151a22; --surf:#1b212b; --surf2:#212834; --line:#29303c;
  --tx:#e6e9ef; --tx2:#a2aaba; --tx3:#6c7586;
  --pri:#86a1e4; --pri-s:#1e2940;
  --ok:#3fcd8b; --ok-s:#132a20; --warn:#eeb04c; --warn-s:#2d2412;
  --bad:#f07d72; --bad-s:#331b1a; --sen:#a891f1; --sen-s:#251e3a;
  --tea:#4dd0cf; --tea-s:#12292b;
}
```
Tema: *Chiaro / Scuro / Auto* (Auto segue `prefers-color-scheme`). Salvato in Impostazioni.
Colori servizi nel calendario (bordo sinistro 3px + sfondo tenue): Bagno `pri`, Bagno + taglio `sen`, Antiparassitario/Dermatologico `tea`, ricorrenti mensili `warn`.

### 4.2 Tipografia (Inter)

| Uso | Size / peso |
|---|---|
| Testo base | 12.5px / 400 |
| Titolo pagina | 17px / 700, letter-spacing -0.015em |
| Nome cane in scheda | 18px / 700 |
| Riga lista – titolo | 12.5px / 600 |
| Riga lista – sottotitolo | 11px / 400 `--tx2` |
| Meta / terziario | 10.5px `--tx3` |
| Titoli sezione | 11px / 700 MAIUSCOLO, tracking .04em, `--tx3` |
| Chip | 10.5px / 600 |
| Bottom nav label | 9.5px / 600 |
Numeri (prezzi, orari) con `font-variant-numeric: tabular-nums`.

### 4.3 Misure (`sizes.ts`)

```ts
export const SIZES = {
  pagePadX: 12, sectionGap: 9,
  headerIconBtn: 30, headerIconRadius: 9,
  search: { h: 32, radius: 9 },
  row: { padY: 7, padX: 9, minH: 44 },
  card: { radius: 12, border: 1 },
  chip: { padY: 3, padX: 6, font: 10.5, iconInChip: 14, serviceIconInChip: 13, radius: 999 },
  avatar: { sm: 28, md: 36, lg: 46, xl: 84, grid: 52 },   // raggi: 8 / 10 / 12 / 20 / 14
  temperamentIcon: { row: 25, grid: 23, calendar: 18, title: 18, banner: 28, legend: 50 },
  serviceIcon: { row: 19 },
  button: { h: 26, hLg: 34, radius: 7, radiusLg: 9 },
  bottomNav: { h: 58, icon: 19, fab: 42 },
  sheet: { radiusTop: 18, grab: { w: 34, h: 4 } },
  calendar: { hourHeight: 44, startHour: 8, endHour: 19, gutter: 34 },
} as const;
```

### 4.4 Regole di layout
- Larghezza di riferimento: 360–390px (telefono). Nessuno scroll orizzontale, mai.
- Liste: **una card** con righe separate da `1px var(--line)`, non card separate per ogni elemento.
- Chip: `inline-flex`, `width: max-content`, non devono mai allargarsi a tutta riga. In righe a spazio fisso usare `flex-wrap: nowrap; overflow: hidden` e mostrare `+N` se non entrano.
- Testi lunghi (nomi proprietari) → `text-overflow: ellipsis` su una riga.
- Stati vuoti: una riga di testo `--tx3` + azione, niente illustrazioni grandi.
- Toast di conferma in basso (sopra la barra azioni): sfondo `--tx`, testo `--card`, icona check verde, 2s.

---

## 5. Icone

### 5.1 Illustrate (kit `icons/`)
| Chiave | Significato |
|---|---|
| `bravo`, `agitato`, `mordace` | Carattere (uno solo per cane) |
| `anziano`, `mensile` | Flag aggiuntivi (si sommano al carattere) |
| `bagno`, `taglio`, `bagno_taglio`, `nodi`, `dermatologico`, `antiparassitario` | Servizi |
| `tosatrice`, `shampoo`, `profumo` | Strumenti e prodotti nello storico |
| `avatar-placeholder` | Foto mancante |

Componenti: `<TemperamentIcon kind size />`, `<FlagIcon kind size />`, `<ServiceIcon iconKey size />` → `<img>` con `alt` uguale all'etichetta.
Ordine di visualizzazione accanto al nome: **carattere → anziano → mensile**.
Un servizio creato dall'utente senza icona dedicata usa l'icona `Scissors` di lucide in `--tx3`.

### 5.2 Interfaccia (lucide-react)
Home `Home` · Animali `PawPrint` · Calendario `CalendarDays` · Listino `FileText` · FAB `Plus` · Cerca `Search` · Filtri `Filter` · Impostazioni `Settings` · Notifiche `Bell` · Telefono `Phone` · Durata `Clock` · Modifica `Pencil` · Salva `Save` · Foto `Camera` · Galleria `Image` · Archivio `Archive` · Storico `History` · Avviso `TriangleAlert` · Contatti `Users` · Utente `User` · Tag `Tag` · Campi `SlidersHorizontal` · Backup `CloudUpload` · Esporta `Upload` · Anticipa `ChevronsLeft` · Posticipa `ChevronsRight` · Sposta `Move` · Cancella `Trash2` · Attività `Building2` · Tema `Moon`/`Sun`/`Monitor` · Euro `Euro` · Chiudi `X` · Indietro `ArrowLeft`.

---

## 6. Modello dati (Firestore)

Tutto sotto `users/{uid}/…` (un solo account). Date in `Timestamp`. Ogni documento ha `createdAt`, `updatedAt`.

```ts
// types/models.ts
export type Temperament = 'bravo' | 'agitato' | 'mordace';
export type ClientType = 'mensile' | 'occasionale';
export type DogStatus = 'attivo' | 'non_in_cura' | 'deceduto';
export type Size = 'piccola' | 'media' | 'grande';
export type AgeCategory = 'cucciolo' | 'giovane' | 'adulto' | 'anziano';

export interface Contact {           // più persone per cane
  id: string;
  firstName: string; lastName: string;
  role: string;                      // es. "Proprietaria", "Co-proprietario", "Figlia" (testo libero + suggerimenti)
  phone: string;
  isPrimary: boolean;
}

export interface DogServicePrice {   // prezzo personalizzato di QUEL cane
  serviceId: string;
  price: number;                     // euro
  durationMin: number;               // durata tipica per questo cane
}

export interface CustomField {       // campi extra con etichetta rinominabile
  id: string; label: string; value: string;
}

export interface Dog {               // users/{uid}/dogs/{dogId}
  id: string;
  name: string;
  species: 'cane' | 'gatto' | 'altro';
  breed: string;
  sex: 'M' | 'F';
  birthYear?: number;
  ageCategory: AgeCategory;          // calcolata da birthYear se presente, altrimenti scelta a mano
  isSenior: boolean;                 // flag "Anziano" (proposto automaticamente, modificabile)
  size: Size;
  weightKg?: number;
  photoUrl?: string;                 // foto profilo
  gallery: { url: string; takenAt: Timestamp; caption?: string }[];
  temperament: Temperament;
  tags: string[];                    // es. "Ansioso col phon", "Pelo lungo", "Cute sensibile"
  criticalNote?: string;             // SEMPRE visibile in rosso (scheda + appuntamento)
  notes?: string;                    // richieste del cliente, preferenze taglio, orari ritiro
  contacts: Contact[];
  servicePrices: DogServicePrice[];
  customFields: CustomField[];
  clientType: ClientType;
  recurrenceWeeks?: number;          // per i mensili, default 4
  status: DogStatus;                 // non attivo → finisce in Archivio
  archivedAt?: Timestamp;
  searchKey: string;                 // lowercase: nome + razza + nomi/cognomi contatti (per la ricerca)
  lastVisitAt?: Timestamp;           // denormalizzato
  nextAppointmentAt?: Timestamp;     // denormalizzato
}

export interface Service {           // users/{uid}/services/{serviceId} – catalogo
  id: string;
  name: string;                      // "Bagno", "Taglio / tosatura", "Bagno + taglio", "Gestione nodi", "Dermatologico", "Antiparassitario", "Unghie", "Stripping"
  iconKey?: 'bagno'|'taglio'|'bagno_taglio'|'nodi'|'dermatologico'|'antiparassitario';
  kind: 'principale' | 'extra';      // extra = si somma a un principale (+15m, + € 10)
  durationMin: { piccola: number; media: number; grande: number };
  price: { piccola: number; media: number; grande: number };
  order: number; active: boolean;
}

export interface AppointmentService {
  serviceId: string; name: string; price: number; durationMin: number;   // copia al momento della prenotazione
}

export interface Appointment {       // users/{uid}/appointments/{id}
  id: string;
  dogId: string;
  dogSnapshot: { name: string; photoUrl?: string; temperament: Temperament; isSenior: boolean; clientType: ClientType; criticalNote?: string };
  start: Timestamp; end: Timestamp;  // end = start + somma durate (modificabile)
  services: AppointmentService[];
  total: number;                     // modificabile anche dopo (correzione prezzo)
  status: 'programmato' | 'completato' | 'cancellato';
  // compilati al completamento → diventano lo STORICO del cane
  tools: string[];                   // "Lama 7F", "Forbice", "Sfoltitrice"
  products: string[];                // "Shampoo dermatologico", "Profumo vaniglia"
  cutStyle?: string;                 // "A cucciolo"
  actualDurationMin?: number;
  photos: { url: string; kind: 'prima' | 'dopo' | 'altro' }[];
  notes?: string;
  seriesId?: string;                 // appuntamenti generati dalla ricorrenza mensile
}

export interface Settings {          // users/{uid}/settings/main
  business: { name: string; vatNumber: string; phone: string; address: string };
  theme: 'light' | 'dark' | 'auto';
  fieldLabels: Record<'species'|'breed'|'sex'|'age'|'weight'|'size'|'clientType'|'avgDuration', string>; // etichette rinominabili
  tagSuggestions: string[];
  toolSuggestions: string[]; productSuggestions: string[];
  priceList?: { url: string; fileName: string; mime: string; uploadedAt: Timestamp };
  priceListHistory: { url: string; fileName: string; uploadedAt: Timestamp }[];
  monthlyReminder: { enabled: boolean; time: string /* "18:30" */; daysBefore: number /* 7 */ };
  backup: { lastAt?: Timestamp; autoDaily: boolean };
  ageThresholds: { giovaneFrom: number; adultoFrom: number; anzianoFrom: number }; // anni: 1, 3, 8
}
```

**Non c'è nessun campo Microchip.** Lo storico del cane = appuntamenti `completato` di quel `dogId`, ordinati per data decrescente (non serve una collezione separata).

Storage: `users/{uid}/dogs/{dogId}/profile.jpg`, `…/gallery/{uuid}.jpg`, `users/{uid}/appointments/{id}/{prima|dopo}-{uuid}.jpg`, `users/{uid}/pricelist/{fileName}`.

Indici Firestore: `appointments (start asc)`, `appointments (dogId, start desc)`, `appointments (status, start)`, `dogs (status, name)`, `dogs (clientType, status)`.

Regole di sicurezza: lettura/scrittura consentite solo se `request.auth.uid == uid` del path.

---

## 7. Servizi di default (seed)

| Servizio | Tipo | Durata P/M/G | Prezzo P/M/G | Icona |
|---|---|---|---|---|
| Bagno | principale | 30/45/60 | 20/28/38 | `bagno` |
| Taglio / tosatura | principale | 45/60/75 | 30/35/45 | `taglio` |
| Bagno + taglio | principale | 60/90/120 | 35/45/60 | `bagno_taglio` |
| Stripping | principale | 120/150/180 | 50/65/85 | – |
| Gestione nodi | extra | +20 | da 5 | `nodi` |
| Dermatologico | extra | +15 | +10 | `dermatologico` |
| Antiparassitario | extra | +10 | +12 | `antiparassitario` |
| Unghie | extra | +10 | 5 | – |

Tutto modificabile da Impostazioni → *Servizi e durate*.

---

## 8. Schermate

Riferimento numerato al mockup (`design/groomly-design.html`).

### 8.1 Home (01)
1. Header: logo Groomly, "Groomly" + data di oggi (es. *Giovedì 1 ottobre*), campanella (pallino rosso se ci sono avvisi), ingranaggio → Impostazioni.
2. Barra di ricerca globale (nome, proprietario, razza): tap → pagina Animali con focus sulla ricerca.
3. **Banner mensili** (solo se presenti): icona `mensile`, "N mensili da programmare", nomi (max 3), "scadono entro 7 gg", bottone **Vedi** → `/mensili`.
4. Tre riquadri: *Oggi* (n. appuntamenti + ore stimate totali) → Calendario oggi · *Mensili* (fissati/totali del mese) → Mensili · *Listino* (PDF, apri) → apre il file.
5. Sezione **OGGI** (link "Calendario ›"): righe appuntamento = ora + durata, miniatura, nome, chip servizi (nowrap, `+N`), icone carattere/flag a destra. Tap → **scheda del cane**.
6. Sezione **VISTI DI RECENTE** (link "Tutti 48 ›"): griglia 4 colonne di miniature 52px con nome sotto e icona carattere sull'angolo in alto a destra. Massimo 8.

### 8.2 Animali (02)
- Header "Animali" + sottotitolo "48 attivi · 9 in archivio", bottone filtri, bottone **Aggiungi**.
- Ricerca predittiva (filtra mentre scrivi su `searchKey`).
- Tab: **Attivi · Mensili · Occasionali · Archivio** con contatori.
- Chip filtro (una riga, nowrap): Tutti · Mordaci · Anziani · In agenda · Gatti.
- Riga: avatar 36, **nome** + chip *Mensile*/*Anziano*, sottotitolo `razza · età · proprietario principale abbreviato (M. Pinna)`, terza riga prossimo appuntamento (oppure in `--warn` "Da fissare · ultimo 3 set" per mensili scaduti, o "Nessun appuntamento"), icona carattere, chevron.
- Ordine: alfabetico; opzione "per prossimo appuntamento".
- Archivio: stessi elementi in grigio, etichetta *Non più in cura* / *Deceduto*, azione **Ripristina**.

### 8.3 Scheda cane (04) — una sola pagina scorrevole
In ordine:
1. Header: indietro, "Scheda", telefono (chiama il contatto principale con `tel:`), menu ⋮ (Archivia come *Non più in cura* / *Deceduto*, Elimina definitivamente con conferma).
2. Intestazione: foto 84px (tap = cambia/ingrandisci), **nome**, `razza · sesso · età`, proprietario principale, chip carattere/flag.
3. **Avviso critico** (se `criticalNote`): box rosso con triangolo, sempre visibile.
4. **Prossimo appuntamento**: data/ora, servizi, durata stimata, bottone **Successivo +**; sotto i chip rapidi *Fissa tra: +2 sett · +4 sett · +6 sett · Data…* che creano subito l'appuntamento con gli stessi servizi e lo stesso orario (vedi §9.4). Se non c'è un appuntamento futuro: "Nessun appuntamento" + gli stessi chip.
5. **Servizi e prezzi**: righe `icona · nome · durata · prezzo` modificabile (campo `€` piccolo con bordo). "+ Servizio" aggiunge una riga dal catalogo. Il prezzo vince sul listino.
6. **Caratteristiche**: carattere (selettore a 3 opzioni con icone) + tag chip, "+ Tag" con suggerimenti.
7. **Dati animale**: griglia 2 colonne `etichetta / valore` (Specie, Razza, Sesso, Età, Peso, Taglia, Cliente, Durata media calcolata). Link "Campi" per aggiungere campi personalizzati; le etichette sono rinominabili (icona matita accanto all'etichetta).
8. **Contatti**: righe con nome, chip ruolo, telefono, bottone chiamata. "+ Contatto".
9. **Note**: testo libero.
10. **Storico trattamenti** ("Tutti N"): giorno/mese a sinistra, servizi, **prezzo** a destra (modificabile, icona matita), chip strumenti / prodotti / stile taglio / durata reale, miniature PRIMA/DOPO.
11. **Galleria**: miniature 50px, "+N", "Aggiungi".
12. Riga finale: "Segna come non più in cura / deceduto → archivio".
- Barra fissa in basso: **Modifica** (outline) · **Salva** (primario). In sola lettura i campi non sono editabili; con *Modifica* diventano editabili inline. *Salva* → toast "Salvato".

### 8.4 Nuovo / modifica cane
Stessi campi della scheda in un form unico compatto. Obbligatori solo: **nome** e **un contatto con telefono**. Taglia di default *piccola*, carattere default *bravo*, tipo cliente default *occasionale*.

### 8.5 Calendario (03)
- Header: `‹ Ottobre 2026 ›`; segmented **Giorno / Settimana / Mese**; bottone **Oggi**.
- Striscia settimana (Lun→Dom): giorno, numero, pallini = numero appuntamenti (max 3). Giorno selezionato pieno `--pri`.
- Riepilogo: "5 cani · 7h15 stimate · 1 mordace".
- **Vista Giorno**: griglia oraria 08–19, 44px per ora, linea rossa "adesso". Blocchi evento con bordo sinistro colorato: **nome + icone carattere/flag**, servizi, orario; se c'è `criticalNote` riga rossa breve. Tap evento → dettaglio (8.7). Tap su uno spazio vuoto → nuovo appuntamento precompilato con quell'ora.
- **Vista Settimana**: 7 colonne compatte con i blocchi (solo nome + icona).
- **Vista Mese**: griglia con pallini; tap su un giorno → **pop-up del giorno** (bottom sheet) con la lista degli appuntamenti e "+ Aggiungi".
- Trascinamento di un blocco (vista giorno/settimana) = sposta orario (con conferma toast "Spostato alle 10:30 · Annulla").

### 8.6 Nuovo appuntamento (05) — bottom sheet
1. Campo cane con **ricerca predittiva** (prefisso sul nome evidenziato in `--pri`, poi corrispondenze su proprietario/razza). Ogni suggerimento: miniatura, nome, razza · proprietario, icona carattere. Ultima voce: **+ Nuovo cane "testo"** → crea una scheda base (nome + telefono) e prosegue.
2. **Servizi**: chip selezionabili con icona e durata (precaricati dagli ultimi servizi del cane).
3. **Data** e **Ora** (inizio → fine calcolata).
4. Box **Durata stimata** con prezzo da scheda: "Durata stimata · € 45 da scheda · **1h15**".
5. Toggle **Ripeti · cliente mensile** (ogni N settimane, prossimo dd/mm) — visibile/attivo di default se il cane è *mensile*.
6. Bottone **Salva appuntamento**. Avviso non bloccante se si sovrappone a un altro appuntamento.

### 8.7 Dettaglio appuntamento (06) — bottom sheet
- Testata: foto, nome + icone, `giorno · orario · proprietario`, bottone **Scheda ›**.
- Avviso critico (se presente).
- Servizi con prezzo, riga **Totale** modificabile.
- Campi **Strumenti** e **Prodotti** (input a chip con suggerimenti da Impostazioni).
- **Foto lavoro**: PRIMA · DOPO · Aggiungi (fotocamera o galleria). Nessuna condivisione esterna.
- Azioni: **Anticipa** (−15 min, tap ripetuti) · **Posticipa** (+15 min) · **Sposta** (scegli data/ora) · **Cancella** (conferma).
- Bottone principale **Completato · fissa il prossimo**: segna `completato`, salva durata reale, poi propone i chip +2/+4/+6 settimane.

### 8.8 Mensili (07)
- Header con indietro, "Clienti mensili", mese, segmented **mese corrente / mese successivo**.
- Card riepilogo: "11/14 fissati", chip "3 da fissare", barra di avanzamento verde.
- Filtri: Tutti · Da fissare · Fissati.
- Sezione **DA FISSARE**: cerchio tratteggiato arancione con orologio, miniatura, nome (ellipsis), "Ultimo 4 set · scade 2 ott", bottone **Fissa** (apre Nuovo appuntamento precompilato).
- Sezione **FISSATI**: **spunta verde piena** + miniatura + nome + chip data (es. "9 ott"). La spunta sostituisce la data lunga quando lo spazio è poco.

### 8.9 Listino prezzi (08)
- Header "Listino prezzi · Aggiornato gg mmm aaaa", bottone **Sostituisci** (carica PDF o immagine).
- Card file: anteprima, nome file, pagine/peso, chip *Attuale*, bottoni **Apri** (visualizzatore a schermo intero) e **Foto** (scatta/aggiorna da foto).
- Tabella **Prezzi e tempi standard** dal catalogo servizi: colonne Piccola / Media / Grande, durata sotto il nome, extra su una cella unica. Link **Modifica** → Impostazioni servizi.
- Nota: "I prezzi in scheda cane hanno priorità sul listino."
- **Versioni precedenti** del file.

### 8.10 Impostazioni (09)
Sezioni a card:
- **Attività**: Ragione sociale, **Partita IVA** (bottone *Copia*), Telefono · indirizzo.
- **Aspetto**: Tema Chiaro / Scuro / Auto.
- **Dati e backup**: Backup online (stato ultimo backup + **Esegui**), Backup automatico giornaliero (toggle), Esporta / ripristina.
- **Personalizza**: Campi scheda (rinomina etichette, aggiungi campi), Servizi e durate, Tag caratteristiche, Archivio animali (contatore).
- **Promemoria mensili**: on/off, orario, giorni di anticipo.
- Footer "Groomly v1.0", Esci.

---

## 9. Logiche

### 9.1 Prezzo e durata di un servizio per un cane
`prezzo = dog.servicePrices[serviceId]?.price ?? service.price[dog.size]` (idem per la durata).
Durata appuntamento = somma durate dei servizi selezionati. Fine = inizio + durata (arrotondata a 5 minuti).
"Durata media" in scheda = media di `actualDurationMin` degli ultimi 5 completati.

### 9.2 Età
Se `birthYear`: età = anno corrente − birthYear; categoria con `ageThresholds` (cucciolo < 1, giovane < 3, adulto < 8, anziano ≥ 8). Altrimenti si sceglie la categoria a mano.
Quando la categoria diventa *anziano* si propone `isSenior = true` (l'utente può togliere la spunta).

### 9.3 Ricerca predittiva
Lato client sui cani attivi in cache: normalizza (minuscolo, senza accenti), prima i nomi che **iniziano** con il testo, poi quelli che lo **contengono**, poi corrispondenze su proprietario/razza. Max 6 risultati. Debounce 120 ms.

### 9.4 Fissa il successivo
Chip `+N sett`: nuovo appuntamento = stesso giorno della settimana e stessa ora dell'ultimo (o del prossimo) appuntamento + N settimane, stessi servizi. Se lo slot è occupato → apre il form con lo slot suggerito libero più vicino. Toast "Fissato per gio 29 ott 09:30 · Annulla".
Il nuovo appuntamento appare subito in Calendario e, il giorno stesso, nella sezione OGGI della Home.

### 9.5 Clienti mensili e promemoria
- Scadenza = ultimo appuntamento completato + `recurrenceWeeks` (default 4).
- **Fissato** se esiste un appuntamento `programmato` tra oggi e scadenza + 14 giorni.
- **Da fissare** se non fissato e la scadenza è entro `monthlyReminder.daysBefore` giorni (o già passata).
- Home mostra il banner quando ci sono "da fissare". Notifica locale giornaliera all'orario impostato (es. 18:30): "3 mensili da programmare: Toby, Kira, Oscar". **Nessun messaggio automatico ai clienti**: i contatti con i clienti li gestisce la toelettatrice (solo link `tel:`).

### 9.6 Archiviazione
*Non più in cura* o *Deceduto* → `status` cambia, `archivedAt` = ora, il cane sparisce da liste, ricerca e mensili ma resta in **Archivio** con tutto lo storico. Gli appuntamenti futuri vengono proposti per la cancellazione.

### 9.7 Correzioni
Prezzo e servizi di un appuntamento completato restano modificabili (per correggere il prezzo dopo il servizio). Il prezzo personalizzato del cane si aggiorna solo se si sceglie "Aggiorna anche il prezzo in scheda".

### 9.8 Backup
- I dati vivono su Firestore/Storage (già online). In più:
- **Esegui backup**: esporta un JSON (cani, appuntamenti, servizi, impostazioni) e lo salva in Storage `users/{uid}/backups/aaaa-mm-gg.json`; aggiorna `backup.lastAt`.
- **Automatico giornaliero**: all'apertura dell'app, se l'ultimo backup ha più di 24h, lo esegue in background.
- **Esporta**: scarica uno ZIP (JSON + foto). **Ripristina**: importa un JSON (con conferma e anteprima dei conteggi).

---

## 10. Ordine di sviluppo (checklist)

1. **Setup**: Vite + React + TS + Tailwind, token CSS, font Inter, `sizes.ts`, Firebase (Auth, Firestore offline, Storage), login email/password, tema chiaro/scuro.
2. **UI kit**: Chip, Button, IconButton, SearchBar, Segmented, Toggle, Card/Row, SectionTitle, Sheet, Toast, BottomNav + FAB, DogAvatar, TemperamentIcon, ServiceIcon. Confronta ogni componente con il mockup.
3. **Catalogo servizi + Impostazioni** (seed §7).
4. **Cani**: lista Animali, ricerca, filtri, form nuovo/modifica, scheda completa, foto profilo e galleria, archivio.
5. **Appuntamenti**: Nuovo appuntamento (ricerca predittiva, stima tempi), Calendario giorno/settimana/mese, Dettaglio (sposta/anticipa/posticipa/cancella, foto prima/dopo, completato).
6. **Home** (oggi, recenti, riquadri) e **Fissa il successivo**.
7. **Mensili** + banner + notifiche locali.
8. **Listino** (upload PDF/immagine, visualizzatore, tabella).
9. **Backup/export/import**.
10. **Capacitor Android**: icona app (usa `icons/png/256/temperament-bravo.png` come base o il logo zampa), splash, permessi fotocamera/notifiche.

**Criteri di accettazione generali**
- A 360px di larghezza nessuna schermata ha scroll orizzontale o testo sovrapposto.
- Ogni icona carattere è visibile accanto al nome in Home, Animali, Calendario, ricerca e dettaglio appuntamento.
- L'avviso critico è visibile senza scorrere in scheda e in dettaglio appuntamento.
- Tutte le operazioni funzionano offline e si sincronizzano al ritorno della rete.
- Tema scuro: tutti i testi leggibili sul loro sfondo.

---

## 11. Dati di esempio (seed per sviluppo)

| Cane | Razza | Età | Taglia | Carattere | Flag | Proprietario | Tel |
|---|---|---|---|---|---|---|---|
| Birba | Barboncino toy | 4 | piccola | bravo | mensile | Maria Pinna | 340 112 4455 |
| Rocky | Shih Tzu | 12 | piccola | mordace | anziano, mensile | Giovanna Serra (+ Marta Serra, figlia) | 347 218 9054 |
| Luna | Golden Retriever | 2 | grande | bravo | – | Francesca Mura | 333 908 1122 |
| Kira | Schnauzer nano | 6 | piccola | agitato | mensile | Antonio Deiana | 349 667 0031 |
| Oscar | Cocker spaniel | 8 | media | bravo | mensile | Luca Satta | 328 445 9910 |
| Penny | Yorkshire | 5 | piccola | agitato | – | Roberta Melis | 345 220 7781 |
| Maya | Lagotto | 3 | media | bravo | – | Paola Cossu | 338 771 2204 |
| Toby | Maltese | 9 | piccola | bravo | anziano, mensile | Elena Fadda | 351 403 6618 |

Rocky: `criticalNote` = "Morde se toccato sulle zampe posteriori. Usare museruola per unghie · cardiopatico, niente phon caldo".

---

## 12. Prompt iniziale da dare a Cursor

> Leggi `GROOMLY.md` per intero e apri `design/groomly-design.html` come riferimento visivo. Crea il progetto Groomly seguendo lo stack del §1 e la struttura del §2. Lavora seguendo l'ordine del §10, un punto alla volta: alla fine di ogni punto fermati, elenca cosa hai fatto e cosa manca rispetto ai criteri di accettazione. Le misure e i colori devono essere quelli del §4 (mettili in `tokens.css` e `sizes.ts`), le icone illustrate quelle in `src/assets/icons` (§5). Interfaccia solo in italiano. Non aggiungere funzioni non richieste (niente messaggi automatici ai clienti, niente campo microchip).
