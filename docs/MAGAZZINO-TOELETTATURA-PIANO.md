# Magazzino su misura per la toelettatura — piano

**Data:** 6 novembre 2026
**Per:** Claude Code / Cursor con `/superpowers` → `/brainstorm`, poi spec e piano in `docs/superpowers/`.
**Parte da:** il Magazzino già pubblicato con la 1.1.193 (`/altro/magazzino`, collezione `salons/{id}/prodotti`, spec `docs/superpowers/specs/2026-11-05-magazzino-design.md`).

---

## 1. Perché

Il Magazzino di oggi funziona: conti i pezzi, avvisi sotto il minimo, lista «Da ordinare», ordine via WhatsApp/email, kit base. Però è **costruito come un magazzino generico** e non segue il lavoro reale di un salone di toelettatura:

- Le categorie (`shampoo`, `balsami`, `profumi`, `cura`, `altro`) mescolano cose diverse: in «profumi» ci sono gli spray antinodi e antistatici, in «altro» ci sono lame, guanti e detergente vasca.
- Il catalogo ha voci poco usate in salone o doppioni, e ne mancano altre che si consumano tutti i giorni (cotone, carta, fiocchetti, nastri della molatrice, sacchi, detersivo per gli asciugamani).
- Mancano le informazioni che una toelettatrice guarda davvero: **diluizione** dello shampoo concentrato, **data di apertura** della tanica, **costo**, **quanto dura**.
- I prodotti consumati in salone e quelli **venduti** ai clienti stanno nello stesso elenco.

Nei gestionali per toelettatura l'inventario c'è (MoeGo, PetGroomingPro, eTailPet, PetExec), ma quasi sempre pensato per la vendita al banco. Il controllo dei consumi del salone è più evoluto nei gestionali per parrucchieri (SalonScale: consumo per servizio, costo reale). **Un magazzino pensato per i consumi della toelettatura è un punto di forza per Groomly.**

## 2. Obiettivi

1. Categorie che seguono le fasi del lavoro in salone.
2. Catalogo ripulito: via le voci inutili o doppie, dentro i consumabili che mancano.
3. Scheda prodotto con i dati utili: diluizione, data di apertura, scadenza dopo l'apertura, costo, uso (salone / vendita).
4. «Quanto mi dura?»: una stima dei giorni rimanenti calcolata dai cani lavati, senza dover scalare nulla a mano.
5. Kit base iniziale rifatto, più realistico.
6. Restare semplice: tutto ciò che è nuovo è **facoltativo**, il flusso attuale (– un pezzo, Arrivati, Da ordinare) non cambia.

## 3. Non obiettivi

- Niente scarico automatico «a ml» da ogni appuntamento: i pezzi restano interi (tanica, flacone, confezione). La stima dei consumi è solo un'indicazione.
- Niente cassa / POS per la vendita al banco.
- Niente codici a barre in questa fase.
- Niente gestione dell'attrezzatura costosa (tosatrici, phon, tavoli): non è un consumabile.

---

## 4. Nuove categorie

Ordine dei chip nella pagina: **Tutti · Da ordinare · Lavaggio · Finitura · Cura · Macchinette · Pulizia salone · Tocchi finali · Vendita**

| Chiave nuova | Etichetta IT | Cosa ci va |
|---|---|---|
| `lavaggio` | Lavaggio | shampoo, balsami, maschere, shampoo secco |
| `finitura` | Finitura | profumi, spray districanti, lucidanti, antistatici |
| `cura` | Orecchie, occhi, unghie | detergente orecchie, polvere orecchie, lozione occhi, emostatico, dentifricio, cotone |
| `macchinette` | Macchinette | olio lame, spray refrigerante, lame di ricambio, nastri/punte molatrice |
| `pulizia` | Pulizia salone | disinfettanti, detergente vasca, guanti, carta, sacchi, detersivo asciugamani |
| `tocchi` | Tocchi finali | fiocchetti, elastici, bandane, biscottini omaggio |
| `vendita` | Vendita | prodotti che rivendi ai clienti (vedi §6) |

**Migrazione delle categorie vecchie (in lettura, senza riscrivere tutto subito):**

| Vecchia | Nuova |
|---|---|
| `shampoo` | `lavaggio` |
| `balsami` | `lavaggio` |
| `profumi` | `finitura` |
| `cura` | `cura` (tranne `catCuDisinfettante` → `pulizia`, riconosciuto dal nome solo se il prodotto è nato dal catalogo) |
| `altro` | `pulizia`, ma lame/olio/refrigerante → `macchinette` se il nome corrisponde alla voce del catalogo; altrimenti `pulizia` |

`prodottoDaDoc` deve accettare sia le chiavi vecchie che le nuove e convertire; la prossima scrittura salva la chiave nuova. Il prodotto con una categoria sconosciuta **non deve sparire** (oggi `prodottoValido` lo scarta): va in una categoria di riserva visibile (vedi §14).

---

## 5. Catalogo rifatto

Formato proposto tra parentesi. «KIT» = nel nuovo kit base.

### Lavaggio
- Shampoo neutro / universale (5 L, 1:10) — KIT
- Shampoo sgrassante / primo lavaggio (5 L, 1:10) — KIT
- Shampoo pelo bianco (5 L, 1:10) — KIT
- Shampoo pelo scuro (5 L, 1:10) — *unisce «pelo nero» e «pelo rosso»*
- Shampoo volumizzante / pelo duro (5 L) — *unisce «volumizzante» e «pelo duro»*
- Shampoo pelo lungo / idratante (5 L) — *unisce «pelo lungo» e «idratante»*
- Shampoo pelle sensibile (1 L)
- Shampoo cuccioli (1 L)
- Shampoo antiparassitario (1 L) — *collegato al servizio Antiparassitario*
- Shampoo anti-muta (5 L) — **nuovo** (usato per i cani da sottopelo)
- Shampoo antiodore (5 L)
- Shampoo secco (250 ml)
- Balsamo districante (5 L, 1:10) — KIT
- Balsamo / maschera nutriente (1 L) — *unisce «maschera nutriente», «maschera ristrutturante», «balsamo idratante», «balsamo pelo lungo»*
- Balsamo pelo bianco (1 L)

### Finitura
- Profumo (250 ml) — KIT — *una voce sola: la fragranza si scrive nel nome (talco, fiorito, agrumi…). Via le 5 voci separate*
- Spray districante / antinodi (500 ml) — KIT
- Spray lucidante (500 ml)
- Spray antistatico (500 ml)
- Balsamo spray senza risciacquo (500 ml)

### Orecchie, occhi, unghie
- Detergente orecchie (250 ml) — KIT
- Polvere per orecchie (pezzi)
- Lozione occhi / macchie lacrimali (250 ml) — KIT
- Emostatico per unghie (pezzi) — KIT
- Dentifricio (pezzi)
- Batuffoli e dischetti di cotone (confezioni) — **nuovo** — KIT
- Garze (confezioni) — **nuovo**

### Macchinette
- Olio per lame (250 ml) — KIT
- Spray refrigerante lame (500 ml)
- Lame per tosatrice (pezzi) — campo misura lama nel nome (10, 7F, 5F, 4F…)
- Nastri / punte per molatrice — **nuovo**

### Pulizia salone
- Disinfettante superfici e attrezzi (1 L) — KIT
- Detergente vasca e tavolo (5 L)
- Guanti monouso (confezioni) — KIT
- Rotoli di carta (confezioni) — **nuovo** — KIT
- Sacchi per i rifiuti / il pelo (confezioni) — **nuovo**
- Detersivo per asciugamani (pezzi) — **nuovo**

### Tocchi finali
- Fiocchetti / elastici (confezioni) — **nuovo**
- Bandane (pezzi) — **nuovo**
- Biscottini omaggio (confezioni) — **nuovo**

### Voci da togliere dal catalogo
Restano valide se qualcuno le ha già nel magazzino, ma non si propongono più:
`catShNero`, `catShRosso`, `catShDuro`, `catShIdratante`, `catShLungo` (unite sopra), `catBaIdratante`, `catBaLungo`, `catMaNutriente`, `catMaRistrutturante` (unite), `catBaOlio` (olio per il pelo: più da vendita che da salone), `catPrTalco`, `catPrFiorito`, `catPrAgrumi`, `catPrFresco`, `catPrCuccioli` (unite in «Profumo»), `catSpOdore` (doppione di «Shampoo antiodore» + profumo), `catCuZampe` (crema zampe: va in Vendita se serve), `catAlAsciugamani` (asciugamani monouso: in salone si usano quelli lavabili; il consumo è il detersivo).

> Tutte le frasi nuove vanno in **it, en, es, fr, de** (i test delle lingue lo richiedono). Il nome del prodotto viene salvato come testo quando lo si crea, quindi le chiavi delle voci tolte si possono eliminare dai file lingua senza toccare i prodotti già salvati (verificarlo nel codice prima di togliere).

### Nuovo kit base
Shampoo neutro, shampoo sgrassante, shampoo pelo bianco, balsamo districante, profumo, spray districante, detergente orecchie, lozione occhi, emostatico, cotone, olio per lame, disinfettante, guanti, rotoli di carta (14 voci, tutte deselezionabili come oggi).

---

## 6. Salone o vendita

Nuovo campo `uso: 'salone' | 'vendita'` (predefinito `salone`).

- Il chip **Vendita** mostra solo i prodotti `uso = 'vendita'`; tutti gli altri chip mostrano solo `salone`. «Tutti» e «Da ordinare» mostrano entrambi.
- Per un prodotto in vendita la scheda mostra in più il **prezzo di vendita** (facoltativo).
- Nella scheda prodotto: interruttore «Lo vendo anche ai clienti» → se un prodotto è sia usato sia venduto, si crea come due prodotti distinti (più semplice da contare). Decidere in `/brainstorm`.

---

## 7. Nuovi campi della scheda prodotto (tutti facoltativi)

| Campo | Tipo | Per cosa |
|---|---|---|
| `uso` | `'salone' \| 'vendita'` | §6 |
| `diluizione` | numero intero (es. `10` = 1:10), `null` se pronto all'uso | mostrata sulla scheda: «Diluizione 1:10» + quanta acqua per 1 L di prodotto pronto |
| `apertoIl` | data (ms) o `null` | tasto «Ho aperto un pezzo nuovo» sulla scheda; si resetta da solo quando il pezzo si toglie con – |
| `mesiDopoApertura` | intero o `null` | il simbolo «12M» sull'etichetta; avviso «Da buttare» quando è passato il tempo |
| `costo` | numero (euro per pezzo) o `null` | costo del magazzino e costo per lavaggio |
| `prezzoVendita` | numero o `null` | solo per `uso = 'vendita'` |
| `mlPerCane` | `{ piccola, media, grande }` in ml di **concentrato**, o `null` | stima del consumo (§8). Valori proposti dal catalogo, modificabili |

Regole:
- Tutti i campi nuovi sono facoltativi in lettura (documenti e backup vecchi restano validi, come già fatto per `prodotti` nel backup).
- La diluizione si propone solo per le categorie `lavaggio`.
- `mlPerCane` si propone solo per i prodotti con formato in L/ml e categoria `lavaggio` o `finitura`.

Valori proposti di `mlPerCane` (concentrato, punto di partenza, poi li corregge lei):

| Prodotto | Piccola | Media | Grande |
|---|---|---|---|
| Shampoo concentrato 1:10 | 15 ml | 30 ml | 50 ml |
| Balsamo concentrato 1:10 | 10 ml | 20 ml | 35 ml |
| Profumo | 2 ml | 3 ml | 5 ml |
| Spray districante | 5 ml | 10 ml | 20 ml |

> Riferimento usato: un fornitore professionale calcola circa 50 ml di concentrato per cane (quindi una tanica da 5 L ≈ 20 giorni con 5 cani al giorno). I valori sono **stime**: il testo nell'app deve dirlo chiaramente («stima, puoi correggerla»).

---

## 8. «Quanto mi dura?»

Sulla scheda prodotto e (in piccolo) sulla riga dell'elenco, per i prodotti con `mlPerCane`:

- **Consumo stimato al mese** = somma, sugli appuntamenti con stato `completato` degli ultimi 30 giorni, di `mlPerCane[taglia del cane]` — solo per gli appuntamenti con un servizio che comprende il bagno (tutti i servizi principali tranne quelli senza lavaggio: decidere in `/brainstorm` se aggiungere al servizio un flag «con bagno», o considerare tutti i principali).
- **Durata stimata** = (pezzi × contenuto) ÷ consumo giornaliero medio → «Ti dura circa 3 settimane».
- Se la durata stimata scende sotto i **giorni di consegna** del fornitore + 7 → il prodotto compare in «Da ordinare» anche se i pezzi sono sopra il minimo, con la dicitura «Sta per finire (stima)».
- **Costo per lavaggio** (se c'è `costo`): `costo ÷ contenuto × mlPerCane[media]` → «circa 0,30 € a cane».

Niente scala automatica dei pezzi: la toelettatrice continua a premere – quando finisce una tanica. In più, quando preme –, l'app confronta i giorni reali con la stima e, dopo 2 taniche, propone: «Questa tanica è durata 18 giorni, la stima diceva 25. Aggiorno il consumo?» (Sì / No).

---

## 9. Scadenze

- Chip/striscia in alto «1 prodotto da buttare» (come l'avviso «Da ordinare»), solo se `apertoIl + mesiDopoApertura` è passato.
- Sulla scheda: «Aperto il 3 ott · da usare entro apr 2027».
- Nessuna notifica push in questa fase, solo l'avviso nella pagina.

---

## 10. Riepilogo del magazzino (facoltativo, fase 2)

Card in cima all'elenco, solo se almeno un prodotto ha `costo`:
- Valore del magazzino (somma di pezzi × costo, solo `salone`)
- Spesa del mese per prodotti (dagli arrivi registrati con «Arrivati» × costo)
- Incidenza sui guadagni del mese (spesa prodotti ÷ incassi del mese): nei saloni di bellezza un valore sano è 5–8%, oltre il 10% c'è spreco. Collegare alla pagina Incassi solo come numero, senza grafici nuovi.

Da valutare in `/brainstorm` se questa card è Go (gratis) o Plus.

---

## 11. Piani (Go / Plus / Salon)

Proposta:
- **Go:** tutto il magazzino attuale + nuove categorie + catalogo + nuovi campi + scadenze.
- **Plus/Salon:** «Quanto mi dura?», costo per lavaggio, riepilogo con incidenza sui guadagni.

Coerente con la regola esistente: le funzioni a pagamento sono pronte nel codice ma accese solo con l'interruttore del piano.

---

## 12. Dati, backup, regole

- Collezione invariata `salons/{id}/prodotti`; campi nuovi facoltativi. Aggiornare `firestore.rules` per accettare i campi nuovi con i tipi giusti (stessi limiti di oggi: testi ≤ 120, numeri ≥ 0).
- `backupBundle.ts`: i prodotti sono già nel backup; i campi nuovi vanno inclusi, i backup vecchi devono continuare a funzionare e il loro checksum non cambia.
- Registro Excel del backup: aggiungere colonne Categoria, Uso, Diluizione, Aperto il, Costo.
- Collaboratore: come oggi (vede, aggiunge, modifica; elimina solo titolare/socio).
- **Il salone di Laura (I Pelosetti) è in uso:** la migrazione delle categorie deve essere solo in lettura + riscrittura al prossimo salvataggio. Nessuno script che riscrive i dati in blocco.

---

## 13. Ordine di lavoro

1. **Categorie + migrazione in lettura** (`prodotti.ts`, `categorie.ts`, test di conversione vecchio → nuovo, prodotto con categoria sconosciuta non deve sparire).
2. **Catalogo e kit base** (`catalogoProdotti.ts`, frasi in 5 lingue, test lingue verdi).
3. **Campi nuovi + scheda** (`DatiProdotto.tsx`, `ProdottoPage.tsx`, regole Firestore, backup).
4. **Salone / Vendita** (filtro e chip).
5. **Scadenze** (avviso in pagina).
6. **Quanto mi dura? + costo per lavaggio** (dietro interruttore Plus).
7. **Riepilogo** (fase 2).
8. Test a 360° come da regola: saloni finti con prodotti e appuntamenti completati, poi cancellare i dati di test. Non toccare I Pelosetti.

## 14. Da decidere in `/brainstorm` (scegli le opzioni consigliate)

- Categoria di riserva per i prodotti non riconosciuti → *consigliato:* chip «Altro» che compare solo se non è vuoto.
- Prodotto usato e venduto → *consigliato:* due prodotti distinti.
- Quali servizi contano come «con bagno» → *consigliato:* tutti i servizi principali, con possibilità di escluderne uno nelle impostazioni del servizio.
- «Quanto mi dura?» in Go o Plus → *consigliato:* Plus, con anteprima bloccata visibile in Go.

---

## Fonti usate per il catalogo
- Funzioni inventario di MoeGo, PetGroomingPro, eTailPet, PetExec, SalonScale (schede Capterra / siti ufficiali).
- Groomica: gestione scorte del salone e diluizioni 1:10 – 1:20 delle taniche da 5 L.
- Liste materiali per toelettatori (Highland Canine, GroomArts, Ryan's Pet, Groomer's Choice): cotone, polvere orecchie, emostatico, olio e refrigerante lame, fiocchetti e bandane.
- Rework / Salon Today: separazione consumi in salone vs vendita, incidenza 5–8% dei prodotti sui guadagni.
