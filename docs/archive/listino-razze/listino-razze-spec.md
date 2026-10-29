# Groomly — Listino per razza: modifica in app, stampa e condivisione (A4/A3 · PDF/JPEG)

Data: 2026-10-13
Stato: **archiviata il 22 ottobre 2026, già nell'app** (design 1 «Documento»). Il piano eseguito è `docs/superpowers/plans/archive/2026-10-13-listino-razze.md`.
Prototipo di riferimento: `docs/archive/listino-razze/listino-razze-prototipo.html` (aprilo nel browser; è interattivo e il foglio a destra è il layout di stampa definitivo).
Listino cartaceo originale da replicare: `docs/archive/listino-razze/listino-originale.jpeg`.

> **Per Cursor:** documento storico. Non ricreare il piano e non rieseguire il listino per razza: è già nell'app.

---

## 0. Decisioni

| # | Regola |
|---|---|
| D1 | `ListinoPage` **non perde nulla**: la card file («Aggiungi file», occhio, matita, cestino) resta in cima, identica. La tabella «Prezzi e tempi standard» resta in fondo, identica. |
| D2 | Tra le due si aggiunge la sezione nuova **«Listino per razza»** (design 1): tab Piccola/Media/Grande/Extra/Info, intestazione col logo, card per taglia con le razze e i servizi con puntini e prezzo, poi bagno+tosatura, extra, compresi, informazioni, avviso, saluto. |
| D3 | Ogni servizio mostra la **sua icona sticker** (quelle già in `src/assets/icons/svg` + 6 nuove nello stesso stile, §3). L'icona si sceglie da sola dal nome e si può cambiare. |
| D4 | Il **foglio di stampa** è uguale al listino cartaceo (`listino-originale.jpeg`): stessa intestazione, 3 colonne per taglia, 5 riquadri in basso, saluto finale. Si adatta da solo quando si aggiungono o tolgono razze e servizi (§6.3). |
| D5 | Export: **PDF o JPEG**, in **A4 o A3**. Azioni: **Condividi**, **Scarica**, **Stampa**. |
| D6 | **Logo caricabile** dall'utente; compare nel cerchio in alto a sinistra del foglio (e nell'intestazione in app). |
| D7 | Il listino per razza è un dato nuovo (`settings.priceSheet`), separato dal catalogo servizi (`services`) degli appuntamenti. Nessun collegamento automatico tra i due in questa versione. |
| D8 | Densità: quella attuale dell'app (TYPE.base 12.5, meta 10.5, righe compatte). Tanti contenuti per schermata, come nel prototipo. |

## 1. Schermate e rotte

| Rotta | Pagina | Cosa fa |
|---|---|---|
| `/listino` | `ListinoPage` (esistente, estesa) | Card file (invariata) → **Listino per razza** (nuovo) → Prezzi e tempi standard (invariata). Nell'header 3 bottoni icona (`Header.action`): Gestione (lucide `SlidersVertical`), Aggiorna prezzi (`Pencil`), Stampa e condividi (`Share2`, tono `pri-s`). |
| `/listino/prezzi` | `PriceSheetPricesPage` (nuova) | Aggiorna prezzi: chip taglia (Piccola/Media/Grande/Extra), azioni di massa (+5%, +10%, +1 €, −1 €, Arrotonda), un campo prezzo per ogni voce, prezzo vecchio barrato se cambiato, footer «N prezzi modificati» + **Salva**. |
| `/listino/gestione` | `PriceSheetManagePage` (nuova) | Intestazione e logo, colore del foglio, razze per taglia (tap → scheda razza), nota sotto la taglia, sezioni del foglio (ordine ↑↓ e occhio mostra/nascondi), testi (informazioni, avviso, saluto). |
| `/listino/stampa` | `PriceSheetExportPage` (nuova) | Anteprima del foglio, «Apri a schermo intero», Formato **A4/A3** (`Segmented`), Tipo **PDF/JPEG** (`Segmented`), switch «Scrivi "a partire da"», footer: **Stampa · Scarica · Condividi**. |
| (foglio) | `PriceSheetRazza` in `Sheet` | Scheda razza: nome (senza «Tipo»), taglia, servizi (icona · nome · tipo prezzo · prezzo · ×), chip «Aggiungi servizio», footer Elimina · Duplica · Salva. |

Le tre pagine nuove vanno in `buildRoutes` dentro `<Guard>` come `/listino/vedi`. Tasto indietro di sistema: torna a `/listino`.

## 2. Modello dati

File nuovo `src/types/priceSheet.ts`:

```ts
import type { DogSize } from './models'
import type { PriceIconKey } from '../assets/icons/icons'

export type PriceKind = 'da' | 'fisso' | 'valutazione'   // «a partire da» · prezzo secco · «su valutazione»

export interface PriceItem {            // una riga «Bagno ........ a partire da 25 €»
  id: string
  nome: string                          // «Bagno», «Bagno + tosatura», «Pelo corto»…
  iconKey: PriceIconKey
  tipo: PriceKind
  prezzo?: number                       // assente se tipo === 'valutazione'
}

export interface Breed {
  id: string
  taglia: DogSize                       // 'piccola' | 'media' | 'grande'
  nome: string                          // senza «Tipo »: il prefisso lo aggiunge il foglio
  voci: PriceItem[]                     // da 1 a N, ordine = ordine di stampa
}

export interface ExtraItem extends PriceItem { sotto: Omit<PriceItem, 'iconKey'>[] }  // es. Shampoo → mini/piccola-media/grande

export type SheetSectionId = 'piccola' | 'media' | 'grande' | 'bagnoTosatura' | 'extra' | 'info' | 'avviso' | 'compresi' | 'saluto'

export interface PriceSheet {
  version: 1
  intestazione: {
    logo?: string                       // `file:{id}` (Firestore) oppure `data:` in modalità solo telefono
    titolo: string                      // «TOELETTATURA»
    sottotitolo: string                 // «LISTINO»
    nome: string                        // «I Pelosetti»  (default da settings.business.name)
    descrizione: string                 // «Servizio di toelettatura»
    indirizzo: string                   // default da settings.business.address
    telefono: string                    // default da settings.business.phone
    colore: string                      // accento del foglio, default '#B8285E'
  }
  razze: Breed[]
  noteTaglia: Record<DogSize, string>   // es. grande: «Tosatura a partire da 55 €\nma su valutazione…»
  bagnoTosatura: { titolo: string; sottotitolo: string; voci: Omit<PriceItem, 'iconKey'>[] }
  extra: { titolo: string; voci: ExtraItem[] }
  compresi: { titolo: string; voci: { id: string; iconKey: PriceIconKey; testo: string }[] }
  info: { titolo: string; intro: string; punti: string[]; chiusura: string }
  avviso: { titolo: string; intro: string; punti: string[] }
  saluto: string
  sezioni: { id: SheetSectionId; visibile: boolean }[]   // ordine dei riquadri in basso + visibilità
  opzioni: { scriviAPartireDa: boolean; formato: 'A4' | 'A3'; tipoFile: 'pdf' | 'jpeg' }  // ultime scelte di stampa
  updatedAt: string                     // ISO
}
```

Salvataggio: nuovo campo **`settings.priceSheet?: PriceSheet`** in `SettingsMain`.
- `blankSettings` non lo crea; `getPriceSheet(settings)` restituisce `settings.priceSheet ?? seedPriceSheet(settings.business)`.
- `mergeSettings` / `settingsFromDoc`: `priceSheet: existing.priceSheet ?? base.priceSheet` (come `priceList`).
- `settingsToDoc`: copiato così com'è (è JSON puro). Il logo segue la stessa strada di `priceList.dataUrl`: in `settingsMediaPatch` (src/lib/uploadPatch.ts) aggiungere `priceSheet.intestazione.logo` → se `data:` viene caricato nell'archivio `files` con `owner: 'listino'`, `kind: 'foto'`, e il campo diventa `file:{id}`. Nessun Cloud Storage.
- Validazione con zod in `src/lib/schemas.ts` (`priceSheetSchema`); dati rotti → si torna al seed senza crash, come per le altre impostazioni.

## 3. Icone dei servizi

Quelle **già installate** (non toccarle): `service-bagno`, `service-taglio`, `service-bagno-taglio`, `service-nodi`, `service-dermatologico`, `service-antiparassitario`, `product-shampoo`, `tool-tosatrice`.

**Nuove**, da creare in `src/assets/icons/svg/` copiando l'SVG dall'oggetto `ICONS` del prototipo (stesso viewBox 40×40, stessi colori, aggiungere `xmlns`, `width="48" height="48"` come le altre):

| File | Chiave | Uso |
|---|---|---|
| `service-bagno-sistemazione.svg` | `bagno_sistemazione` | Bagno + sistemazione (vasca + pettine) |
| `service-pelo-corto.svg` | `pelo_corto` | Pelo corto |
| `service-pelo-lungo.svg` | `pelo_lungo` | Pelo lungo |
| `service-unghie.svg` | `unghie` | Taglio unghie (extra e «compresi») |
| `service-orecchie.svg` | `orecchie` | Pulizia orecchie (compresi) |
| `service-occhi.svg` | `occhi` | Pulizia occhi (compresi) |

In `src/assets/icons/icons.ts` aggiungere `PRICE_ICONS` = `SERVICE_ICONS` + le 6 nuove + `shampoo` e `tosatrice` (riusando gli import esistenti), e `export type PriceIconKey = keyof typeof PRICE_ICONS`. **Non** allargare `ServiceIconKey`/`SERVICE_ICON_KEYS` dei servizi appuntamento (D7).

Componente `PriceIcon({ iconKey, size })` come `ServiceIcon`. Toni in `uiStyle.ts` → `priceTone(key)`:
`bagno→bagno`, `taglio→taglio`, `bagno_taglio→combo`, `bagno_sistemazione→combo`, `pelo_corto|pelo_lungo→pelo` (**token nuovo** `--s-pelo:#A3622E; --s-pelo-bg:#F8ECE1`, scuro `#E2A877` / `rgba(226,168,119,.14)` in `tokens.css`), `nodi→nodi`, `dermatologico→derma`, `antiparassitario→anti`, `shampoo→combo`, `unghie→taglio`, `orecchie|occhi→bagno`, `tosatrice→strip`.

Icona automatica dal nome: `iconForName(nome)` in `src/lib/priceSheet.ts` (stesse regole della funzione `iconFor` del prototipo: «sistemaz» → bagno_sistemazione; «bagno» + «tosat|taglio» → bagno_taglio; «pelo corto»; «pelo lungo»; «unghie»; «orecch»; «occhi»; «antiparass»; «dermat»; «shampoo»; «nodi»; «tosat|taglio» → taglio; altrimenti bagno). Cambiando il nome nella scheda razza l'icona si ricalcola; toccando l'icona si apre la griglia per sceglierla a mano.

In app ogni riga servizio è: `IconTile size="sm"` col tono + `PriceIcon` 14px · nome · puntini · prezzo. Nel foglio di stampa **no** icone sulle righe (come l'originale: solo zampette); le icone sticker compaiono solo in «Servizi extra» (titolo) e «Nel servizio bagno sono compresi».

## 4. Seed iniziale (uguale al listino cartaceo)

`seedPriceSheet(business)` in `src/data/seed/priceSheet.ts`. Prezzi tipo `'da'` salvo dove indicato.

**Taglia piccola**
- Yorkshire: Bagno 25 · Bagno + tosatura 35 · Bagno + sistemazione 30
- Maltese / Shih Tzu / Barboncino / Maltipoo: Bagno 30 · Bagno + tosatura 40 · Bagno + sistemazione 35
- Jack Russell: Bagno 23
- Chihuahua / Pinscher: Pelo corto 18 · Pelo lungo 20 · Bagno + sistemazione 25 · Bagno + tosatura **valutazione**
- Volpino / Pomerania: Bagno 30 · Bagno + sistemazione 35
- Bassotto pelo corto: Bagno 20
- Bassotto pelo lungo: Bagno 23

**Taglia media**
- Cocker Inglese: Bagno 35 · Bagno + tosatura 50 · Bagno + sistemazione 40
- Cavalier King: Bagno 30 · Bagno + sistemazione 35
- Beagle 28 · Bulldog Francese / Carlino 25 · Bulldog Inglese 30 · Border Collie 35 · Fonnese 40 · Amstaff / Pitbull / Boxer 30 · Shar Pei 35 · Shiba Inu 30 · Akita Inu 50 (tutti: Bagno)

**Taglia grande** (tutti: Bagno)
- Labrador Retriever 35 · Golden Retriever 45 · Pastore Tedesco 45 · Husky 45 · Malamute 50 · Chow Chow 50 · Samoiedo 60 · Maremmano 50 · Rottweiler 40 · Cane Corso 40
- `noteTaglia.grande`: «Tosatura a partire da 55 €\nma su valutazione del tipo di cane, mantello e problematiche.»

**Bagno + tosatura** (sottotitolo «(indicativo)»): Taglia piccola 35 · Taglia media 50 · Taglia grande 55 (tipo `da`).
**Servizi extra**: Taglio unghie 5 (`da`, icona unghie) · Shampoo dermatologico e antiparassitario (icona dermatologico) con sotto-voci `fisso`: Taglia mini 3 · Taglia piccola/media 4 · Taglia grande 5.
**Compresi** («Nel servizio bagno sono compresi:»): Taglio unghie (unghie) · Pulizia orecchie (orecchie) · Pulizia occhi (occhi).
**Informazioni importanti**: intro «I prezzi indicati sono da considerarsi a partire da e possono aumentare in base a:»; punti «presenza di nodi o feltri» / «condizioni del mantello che richiede lavorazioni extra (muta)» / «comportamento del cane (agitato, difficile da gestire)» / «tempo necessario per completare il servizio»; chiusura «In questi casi verrà applicato un supplemento proporzionato al lavoro richiesto.»
**Avviso**: titolo «Non si accettano cani infestati da pulci o zecche»; intro «Per il benessere di tutti gli animali presenti in toelettatura:»; punti «non vengono accettati cani con infestazioni in corso di pulci o zecche» / «è consigliato effettuare preventivamente un trattamento antiparassitario a casa» / «il servizio di toelettatura potrà essere eseguito successivamente».
**Saluto**: «Grazie per la fiducia!»
**Intestazione**: titolo «TOELETTATURA», sottotitolo «LISTINO», descrizione «Servizio di toelettatura», nome/indirizzo/telefono da `settings.business` (se vuoti: «I Pelosetti», «corso Vitt. Emanuele 4/c», «349 0989700»), colore `#B8285E`.
**Sezioni** (ordine): piccola, media, grande, bagnoTosatura, extra, info, avviso, compresi, saluto — tutte visibili.

## 5. Logica pura (`src/lib/priceSheet.ts`, con test)

- `formatPriceApp(item)` → «da 25 €» · «25 €» · «su valutazione» (decimali con virgola: «27,50 €»).
- `formatPricePaper(item, scriviAPartireDa)` → «a partire da **25** €» · «**25** €» · «su valutazione».
- `breedsBySize(sheet, taglia)` nell'ordine salvato.
- `applyBulk(sheet, scope, op)` con `scope = DogSize | 'extra'`, `op = 'p5' | 'p10' | 'e+1' | 'e-1' | 'round'`: salta le voci `valutazione`; % → arrotonda all'euro intero; −1 non va sotto 0. Restituisce una **bozza** (mappa `chiave → prezzo`), non tocca il foglio finché non si salva.
- `commitDraft(sheet, draft)` → nuovo `PriceSheet` con `updatedAt` aggiornato.
- `upsertBreed`, `removeBreed`, `duplicateBreed` («(copia)» nel nome, id nuovi), `moveSection(i, ±1)`, `toggleSection(id)`.
- `iconForName(nome)` (§3).

## 6. Foglio di stampa

### 6.1 Componente
`src/components/priceSheet/PriceSheetPaper.tsx` → `<PriceSheetPaper sheet logoSrc format="A4"|"A3" />`. Rende il foglio **a misura reale in px CSS**: A4 = 794 × 1123, A3 = 1123 × 1587 (96 dpi). Tutte le misure sono `calc(Npx * var(--s))` con `--s = larghezza/794`: l'A3 è lo stesso foglio ingrandito di 1,414. Copiare la struttura e il CSS di `.fly` / `.f-*` dal prototipo (funzione `paperHTML` + blocco CSS «FOGLIO DI STAMPA»), in un file `priceSheetPaper.css` importato dal componente. Il foglio usa sempre colori chiari, anche col tema scuro.

Struttura (dall'alto):
1. **Intestazione**: cerchio logo (bordo accento; senza logo: zampa + nome in corsivo) · «TOELETTATURA» (Oswald 700) / «🐾 LISTINO 🐾» (accento, spaziatura larga) / linea a puntini con forbici · a destra, dopo una barra verticale accento: NOME (Oswald, accento), descrizione, 📍 indirizzo, 📞 telefono grande.
2. **3 colonne** (solo le taglie visibili): barra rosata con zampa + «TAGLIA PICCOLA»; per ogni razza «🐾 Tipo {nome}» e sotto le voci `nome ……… a partire da 25 €`; nota della taglia in fondo alla colonna.
3. **Riquadri in basso** (griglia 1fr 1fr 1.08fr, nell'ordine di `sezioni`, solo visibili): Bagno + tosatura (indicativo) · Servizi extra · Informazioni importanti (alto 2 righe, con «i» nel cerchio e piccola vasca) · Avviso pulci e zecche (triangolo accento) · Compresi nel bagno (cuore accento + icone).
4. **Saluto**: linea a puntini, zampe, «Grazie per la fiducia!» in corsivo (Dancing Script) accento.

### 6.2 Font
Il foglio deve uscire uguale anche offline: installare e importare `@fontsource/oswald` (500,600,700), `@fontsource/quicksand` (500,600,700), `@fontsource/dancing-script` (700). Niente Google Fonts a runtime. Prima di esportare: `await document.fonts.ready`.

### 6.3 Adattamento automatico (dinamico)
In `useLayoutEffect` del foglio (e prima di ogni export):
1. `--k` parte da **1.12** e scende di 0.02 finché nessuna colonna (`.f-col .b`) va in overflow (`scrollHeight > clientHeight`), minimo **0.62**. `--k` scala solo testo e spaziature delle colonne razze.
2. Se il titolo non entra in larghezza, il titolo si riduce (stesso loop del prototipo, minimo 0.5).
3. Se a 0.62 le colonne ancora non entrano → **2 pagine**: pagina 1 = intestazione + colonne riempite fino al limite; pagina 2 = intestazione ridotta (solo nome + «LISTINO · segue») + il resto delle razze + riquadri + saluto. La funzione pura `paginate(heights, available)` decide dove spezzare (test). In app sotto l'anteprima: «Tutto in 1 pagina A4 · testo al 74%» oppure «Il listino non entra in 1 pagina: verrà diviso su 2 pagine» → suggerire A3.
4. Con i dati del seed su A4 deve stare in **1 pagina** (nel prototipo: testo colonne ~74%).

## 7. Export: PDF / JPEG · A4 / A3 · Condividi / Scarica / Stampa

Dipendenze nuove: `html-to-image`, `jspdf`, `@capacitor/share` (+ `npx cap sync android`). `@capacitor/filesystem` e `@capacitor/file-viewer` ci sono già.

`src/lib/priceSheetExport.ts`:
- `renderSheetJpeg(node, format)`: monta `PriceSheetPaper` fuori schermo (portal in un `div` `position:fixed; left:-10000px`), aspetta font e immagini (logo), poi `htmlToImage.toJpeg(node, { quality: 0.92, backgroundColor: '#fff', pixelRatio })` con larghezza finale **2480 px (A4)** / **3508 px (A3)** = 300 dpi. Una JPEG per pagina.
- `buildSheetFile(sheet, { format, tipoFile })` → `{ blob, name, mime }`:
  - JPEG: 1 pagina → `Listino_{Nome}_{A4}.jpg`; 2 pagine → due file `…_p1.jpg`, `…_p2.jpg`.
  - PDF: `new jsPDF({ unit: 'mm', format: 'a4'|'a3', compress: true })`, una pagina per immagine con `addImage(jpg, 'JPEG', 0, 0, 210|297, 297|420)`; `setProperties({ title })`; nome `Listino_{Nome}_{A4}.pdf`.
- **Condividi**: scrivi in `Directory.Cache` con `Filesystem.writeFile` (base64), poi `Share.share({ files: [uri], title: 'Listino prezzi' })` → WhatsApp, email, Drive…
- **Scarica**: `Filesystem.writeFile` in `Directory.Documents` (sottocartella `Groomly/`), toast «Salvato in Documenti/Groomly». Se la scrittura fallisce (permessi Android), ripiega su Condividi con toast «Scegli dove salvarlo». Su web: `<a download>`.
- **Stampa**: genera sempre il **PDF** nel formato scelto e aprilo con la funzione esistente `openPdfBlob(blob, name)` (src/lib/openDocument.ts): il visualizzatore PDF di Android ha «Stampa». Su web: `window.open(blobUrl)`.
- Mentre genera: bottoni disabilitati + toast «Preparo il PDF A4…». Errori → toast «Esportazione non riuscita».
- Formato e tipo file scelti si ricordano in `priceSheet.opzioni`.

## 8. Logo

In Gestione › Intestazione: anteprima rotonda 64 px + «Carica logo» / «Cambia logo» + «Rimuovi logo». `input type="file" accept="image/*"` (stessa protezione `guardCaptureClick` del listino). Elaborazione: `prepareLogo(file)` in `src/lib/dogPhoto.ts` sul modello di `prepareListinoPhoto`: lato massimo 600 px, **PNG** se l'originale ha trasparenza (o WebP con alpha), altrimenti JPEG 85; massimo 450 KB, altrimenti toast «La foto è troppo grande per essere salvata. Prova con un'altra immagine.». Il logo si legge con `useFileSrc(logo, 'full')`; nel foglio va dentro il cerchio con `object-fit: contain` al 88%.

## 9. Dettagli UI (dal prototipo, con componenti esistenti)

- **ListinoPage › Listino per razza**: `SectionTitle` «Listino per razza» + link «Gestisci»; tab sticky (`top: 0`, sfondo `--bg`), tap = `scrollIntoView` della sezione; card intestazione (logo 44 px, nome 13.5/800, descrizione meta, indirizzo · telefono); per taglia una `Card` con testata `--pri-s` (zampa + «TAGLIA PICCOLA» + `count`), razze separate da `--line`, righe servizio 20 px con puntini `1.5px dotted var(--line2)`, prezzo in grassetto, «su valutazione» in `--warn`; nota taglia in box `--warn-s`; extra con sotto-voci rientrate; compresi come chip con icona 20 px; informazioni (card); avviso (card `--bad-s`, titolo `--bad`); saluto in corsivo accento.
- **Aggiorna prezzi**: campo prezzo compatto (`h 30`, `inputMode="decimal"`, «da» davanti se tipo `da`), cambiato = bordo `--pri` 1.5 px + sfondo `--pri-s` + vecchio prezzo barrato; voci `valutazione` = pillola tratteggiata `--warn` non modificabile qui. Footer con `--sh-foot`. Uscire con modifiche non salvate → `Dialog` «Uscire senza salvare?».
- **Gestione**: razze raggruppate per taglia con icone dei servizi a destra; riordino razze **trascinando** la maniglia (o, se più semplice, frecce ↑↓ come le sezioni); `textarea` «Nota sotto la taglia»; sezioni con ↑ ↓ e occhio; testi con un punto elenco per riga.
- **Scheda razza** (`Sheet`): `Segmented` taglia; righe servizio: icona (tap → griglia icone 22 px), nome, `select` tipo (da / fisso / valutaz.), prezzo (nascosto se valutazione), ×; chip rapidi Bagno · Bagno + tosatura · Bagno + sistemazione · Pelo corto · Pelo lungo · Tosatura · + Personalizzato; nome vuoto → toast «Scrivi il nome della razza». Elimina con `Dialog` di conferma.
- **Stampa e condividi**: anteprima in riquadro grigio, foglio scalato a 236 px di larghezza; «Apri a schermo intero» → vista con pinch (riusare `pinchScale`/`clampPan` di `PriceViewPage`).
- Tutto in italiano, tema chiaro/scuro con i token esistenti, `Toast` esistente per i messaggi.

## 10. Fuori scope

- Collegare i prezzi del listino per razza ai servizi degli appuntamenti o alla scheda cane.
- Più listini (es. listino gatti), lingue diverse, QR code.
- Modificare `PriceViewPage`, upload dei file del listino, regole Firestore esistenti (salvo ciò che serve al logo nell'archivio `files`, già coperto da `owner: 'listino'`).

## 11. Piano a task (da espandere con `superpowers:writing-plans`)

1. **Icone**: 6 SVG nuovi, `PRICE_ICONS` + `PriceIconKey`, `PriceIcon`, `priceTone`, token `--s-pelo` (chiaro/scuro). Test: ogni chiave ha `src` e label; `brand.test`/`ui.test` verdi.
2. **Modello + seed + schema**: `types/priceSheet.ts`, `data/seed/priceSheet.ts`, `priceSheetSchema`, `getPriceSheet`, campo `priceSheet` in `SettingsMain` (merge, `settingsToDoc`, `settingsFromDoc`). Test: seed = §4 (28 razze: 7/11/10; Chihuahua con 4 voci di cui 1 valutazione); round-trip Firestore.
3. **Logica pura** `lib/priceSheet.ts` (§5) con TDD.
4. **ListinoPage**: sezione «Listino per razza» tra card file e «Prezzi e tempi standard», bottoni header. Test: le due parti esistenti restano (test `listino.test.tsx` invariati e verdi), compaiono le 3 taglie e «Tipo Yorkshire».
5. **Aggiorna prezzi** `/listino/prezzi`. Test: +10% su Piccola porta Yorkshire Bagno 25 → 28 (arrotondato), valutazione invariata, Salva aggiorna e azzera il contatore.
6. **Gestione** `/listino/gestione` + **scheda razza** + **logo** (`prepareLogo`, `settingsMediaPatch` per `priceSheet.intestazione.logo`). Test: nuova razza compare nella sua taglia; nascondere «Servizi extra» lo toglie dal foglio; logo salvato come `file:` con Firebase acceso.
7. **PriceSheetPaper** + font locali + auto-fit + `paginate`. Test: `paginate` puro; con il seed su A4 → 1 pagina.
8. **Export** (`priceSheetExport.ts`, `@capacitor/share`, `/listino/stampa`): PDF/JPEG × A4/A3, Condividi/Scarica/Stampa. Test con mock di `html-to-image`, `jspdf`, `Share`, `Filesystem`: nomi file, formato pagina jsPDF, una pagina per immagine, fallback Scarica → Condividi.
9. **Verifica finale**: `npm test`, `npm run build`, `npx cap sync android`; prova su telefono: condividi PDF A4 su WhatsApp, scarica JPEG A3, stampa; confronto a occhio col listino originale; versione in `package.json` +1 (patch) come da abitudine del repo.

## 12. Criteri di accettazione

- [ ] In `/listino` ci sono ancora «Aggiungi file» e «Prezzi e tempi standard», invariati.
- [ ] Il listino per razza mostra tutte le 28 razze del cartaceo con i loro servizi e le icone giuste.
- [ ] Ogni prezzo si cambia da «Aggiorna prezzi»; le azioni di massa funzionano per taglia ed extra.
- [ ] Si aggiungono/modificano/eliminano razze e servizi (qualsiasi numero di voci per razza) e il foglio si riadatta da solo.
- [ ] Il logo caricato compare in app e nel foglio esportato.
- [ ] Export PDF e JPEG, in A4 e A3, con Condividi, Scarica e Stampa funzionanti su Android.
- [ ] Il foglio con i dati del seed è visivamente uguale a `listino-originale.jpeg` (A4, 1 pagina).
- [ ] Funziona in chiaro e scuro; testi in italiano; build e test verdi.
