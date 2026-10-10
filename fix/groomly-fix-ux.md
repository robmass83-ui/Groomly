# Groomly — Fix UX, bug e logiche

Specifica di modifiche per Cursor. Fonte: revisione dell'app in locale (`localhost:5173`), 10 ott 2026.
Test eseguito con **30 animali** (cani, 1 gatto, 1 coniglio; tutte le combinazioni di taglia, età, carattere, mensile/occasionale; nomi doppi, nomi lunghissimi, accenti, senza razza/proprietario/telefono) e **40 appuntamenti** (passati completati, passati non chiusi, sovrapposti, prima delle 8 e dopo le 19, domenica, multi-servizio), più posticipo, spostamento, modifica, completamento, cancellazione e archiviazione.

Obiettivo: rendere veloci e lineari i due flussi più usati (inserimento cane, inserimento appuntamento) e correggere i bug di logica (mensili, calendario, appuntamenti passati/cancellati, archivio).

Sezioni: 0 Decisioni · 1 Nuovo cane · 2 Nuovo appuntamento · 3 Generale e spaziature · **4 Bug e logiche emersi dal test** · **4bis Rifiniture di design** · 5 Blocchi di lavoro · 6 Test di accettazione.

---

## 0. Decisioni (prevalgono su qualsiasi frase del documento che dica diversamente)

| # | Tema | Decisione |
|---|------|-----------|
| D1 | **Ripeti / frequenza** | Si crea **solo il prossimo** appuntamento: salvando con "Fissa anche il prossimo" nascono 2 appuntamenti: quello che si sta salvando + uno N settimane **dopo la data di quell'appuntamento**, stessa ora (se Laura fissa giovedì 15, il prossimo è giovedì 12 del mese dopo con N=4, non oggi + 4 settimane). N viene dalla scheda del cane ("Frequenza: ogni [4] settimane", default 4). Nessuna serie da 3/6/12 mesi, nessun semplice promemoria. Il tipo cliente resta "Mensile". |
| D2 | **Completato** | Abilitato per gli appuntamenti **di oggi (qualsiasi ora) e passati**, disabilitato dal giorno dopo in poi. Vale ovunque: scheda appuntamento, box "Da chiudere", calendario. |
| D3 | **Parole** | Per l'appuntamento: bottone **Disdici**, stati **Disdetto** e **Non venuto**. **Annulla** si usa solo nel toast per disfare l'ultima azione. Mai "Annulla" per l'appuntamento. Stati in codice: `programmato`, `completato`, `disdetto`, `non_venuto`. |
| D4 | **Form cane** | Due campi per riga dove sono corti (Razza \| Taglia, Proprietario \| Telefono) da 360px in su; colonna unica sotto i 360px. |
| D5 | **Calendario** | La fascia 08–19 entra in uno schermo (~50px/ora). Se ci sono appuntamenti fuori fascia, la griglia si allunga e si scorre; all'apertura parte dalle 08:00 (o dall'ora attuale se è oggi), con indicatore "↑ 1 prima delle 8". |
| D6 | **Cane creato dall'appuntamento** | Mini-scheda: Nome, **Specie** (default Cane), **Taglia** (default Piccola), Proprietario, Telefono. Specie e taglia sono preselezionate, quindi si toccano solo se servono. |
| D7 | **Spaziature** | Niente reset CSS globale. Margini azzerati solo dentro i contenitori delle schermate che si stanno modificando. |
| D8 | **Mensili, Home, campanello, notifica** | 4.5, 4.6 e 4.9 si fanno insieme: banner Home, pagina Mensili, campanello e testo della notifica Android usano **la stessa funzione** di calcolo (vedi blocco 2). |

Priorità: **P1** = bloccante / da fare subito · **P2** = importante · **P3** = rifinitura.

---

## 1. Nuovo cane (`/animali/nuovo`)

### 1.1 Campi duplicati — P1
**Problema:** la pagina mostra il modulo di inserimento *e sotto* la scheda profilo in modalità visualizzazione. Specie, Razza, Sesso, Età, Taglia e Cliente compaiono due volte (prima come segmented control, poi come campi con matita). L'Età ha anche una checkbox "Anziano" che duplica il segmento Cucciolo/Giovane/Adulto/Anziano.

**Soluzione:**
- In `/animali/nuovo` renderizzare **solo il form**. Il blocco "dettagli con matita" (Specie/Razza/Sesso/Età/Peso/Taglia/Cliente/Durata media) va solo nella scheda profilo `/animali/:id`.
- Eliminare la checkbox "Anziano": l'età si sceglie solo dal segmento.
- Probabile causa: lo stesso componente `AnimalForm`/`AnimalProfile` viene usato per entrambe le modalità senza condizionare le sezioni. Introdurre una prop `mode: 'create' | 'edit' | 'view'` e mostrare le sezioni in base a quella.

### 1.2 Carattere duplicato — P2
**Problema:** ci sono i bottoni Bravo / Agitato / Mordace e poi di nuovo le tre icone sticker (angioletto, faccina, diavoletto).

**Soluzione:** tenere solo le **3 icone sticker** con etichetta sotto (Bravo / Agitato / Mordace), selezione singola, bordo/sfondo evidente sull'icona scelta. Rimuovere il segmented control testuale.

### 1.3 Sezioni inutili in creazione — P1
**Problema:** in un cane nuovo compaiono Storico ("Nessun trattamento"), Galleria, "+ Contatto", "Campi", il bottone **Modifica** accanto a **Salva** e l'icona telefono in header (non c'è ancora nessun numero).

**Soluzione (mode = create):**
- Nascondere Storico, Galleria, icona telefono, bottone Modifica.
- Footer con solo **Salva** (full width). Per uscire senza salvare si usa la freccia indietro/✕ in alto; se ci sono dati inseriti chiede "Uscire senza salvare?" (**Esci** / **Continua**). Mai la parola "Annulla" qui (D3).
- "+ Contatto" (secondo contatto) spostato dentro "Altri dettagli" (vedi 1.6).

### 1.4 Servizi e prezzi poco chiari — P2
**Problema:** 8 righe servizio con due input numerici senza etichetta (es. `30` e `20`): non si capisce quale sia prezzo e quale durata. Sono già precompilati col listino, quindi in creazione sono rumore.

**Soluzione:**
- In creazione: sezione **chiusa** di default, titolo "Prezzi personalizzati (opzionale)". Se non toccata, il cane usa il listino generale.
- Quando aperta: intestazione colonne `Prezzo €` e `Durata min`, suffissi negli input (`€`, `min`), e il valore di listino come placeholder (non come valore), così si salvano solo le personalizzazioni reali.
- "Nascondi" → sostituire con un'icona occhio o uno switch, e spiegare con tooltip "nascondi questo servizio per questo cane".

### 1.5 Upload foto grezzo — P3
**Problema:** sotto l'avatar compare l'input file nativo del browser ("Scegli file / Nessun file selezionato").

**Soluzione:** nascondere l'`<input type="file" accept="image/*" capture="environment">` e renderlo attivabile toccando l'avatar, con badge fotocamera sull'angolo. Su mobile offre direttamente fotocamera/galleria.

### 1.6 Ordine e raggruppamento — P1
**Problema:** form molto lungo, tutto allo stesso livello.

**Soluzione — layout proposto:**

```
[ Avatar foto ]
Nome *
Razza                      | Taglia  Piccola | Media | Grande
Proprietario *             | Telefono *   (input type="tel")
Carattere             [😇 Bravo] [😬 Agitato] [😈 Mordace]
Avviso critico        (evidenziato in rosso se compilato)

▸ Altri dettagli      (chiuso di default)
    Specie            Cane | Gatto | Altro
    Sesso             Maschio | Femmina
    Età               Cucciolo | Giovane | Adulto | Anziano
    Peso (kg)
    Cliente           Mensile | Occasionale
    Nota
    + Contatto

▸ Prezzi personalizzati (opzionale)

[ Salva ]
```

Campi obbligatori minimi: **Nome, Proprietario, Telefono**. Tutto il resto ha default sensati (Cane, Adulto, Piccola, Bravo, Occasionale).

**Layout deciso:** due campi per riga dove sono corti (Razza | Taglia, Proprietario | Telefono) da 360px di larghezza in su; sotto i 360px una colonna sola. Tutti gli altri campi restano su una riga intera. La Taglia sta in alto perché decide prezzi e durate.

---

## 2. Nuovo appuntamento (`/appuntamenti/nuovo`)

### 2.1 Creazione cane dall'appuntamento perde i dati — P1 (bug)
**Problema:** scrivo "Fido" nel campo Cane → compare "+ Nuovo cane "Fido"" → cliccandolo si apre il form completo `/animali/nuovo`. Tornando indietro si finisce nella lista Animali e **l'appuntamento è perso** (servizi, data e ora scelti). Era un requisito chiave: creare appuntamenti anche per cani non registrati.

**Soluzione:**
- Cliccando "+ Nuovo cane "Fido"" **non navigare**. Espandere inline, nello stesso sheet, una mini-scheda:
  ```
  Nome          Fido        (precompilato)
  Specie        [Cane] | Gatto | Altro      (default Cane)
  Taglia        [Piccola] | Media | Grande  (serve per prezzi e durate)
  Proprietario  ____        | Telefono  ____
  ```
  Specie e Taglia sono già selezionate (Cane, Piccola), quindi Laura le tocca solo se diverse: un gatto non nasce cane, e il prezzo dei servizi è giusto da subito.
- Al salvataggio dell'appuntamento: creare prima l'animale con i dati base (default per il resto), poi l'appuntamento collegato. Un'unica azione per l'utente.
- Il profilo si completa dopo dalla scheda cane. Opzionale: badge "profilo incompleto" nella lista Animali.

### 2.2 Ricerca cane — P2
**Problema:** sotto il campo compare "Nessun cane" anche prima di scrivere; con dati reali non è chiaro come si presentino i risultati.

**Soluzione:**
- Autocomplete con risultati come righe: foto piccola, nome, razza, proprietario, icona carattere (il diavoletto per i mordaci deve vedersi subito).
- Ricerca anche per nome proprietario e telefono.
- Prima di scrivere: mostrare gli ultimi 3–5 cani usati invece di "Nessun cane".
- "+ Nuovo cane "…"" sempre come ultima riga dei risultati, stile link/azione.

### 2.3 Servizi senza prezzo, totale poco visibile — P2
**Problema:** i chip mostrano solo la durata (`30m Bagno`), nessun prezzo. Il riquadro "Durata stimata · € da scheda" compare solo dopo aver scelto servizi e ora, in fondo al form.

**Soluzione:**
- Chip: `Bagno · 30m · €20`. Se il cane ha prezzi personalizzati, usare quelli.
- Sotto i servizi, riga di riepilogo fissa: **Totale 1h 15m · €45**, aggiornata live.
- La durata totale serve anche per calcolare l'ora di fine e segnalare sovrapposizioni con altri appuntamenti.

### 2.4 Stato selezionato poco visibile — P2
**Problema:** il chip selezionato si distingue appena da quelli non selezionati.

**Soluzione:** chip selezionato pieno (sfondo blu ardesia, testo bianco, icona ✓), non selezionato bordo grigio chiaro. Contrasto sufficiente anche al sole/in negozio.

### 2.5 Data e ora — P3
**Problema:** input data nativo e select con 45 orari (08:00–19:00 ogni 15 min): scomodo su telefono.

**Soluzione:**
- Data: scorciatoie **Oggi / Domani / +7 gg / +30 gg** più selettore calendario.
- Ora: griglia di slot (es. 4 colonne) che mostra in grigio gli slot già occupati in base agli appuntamenti del giorno e alla durata totale.
- Mostrare l'ora di fine calcolata: "09:00 → 10:15".

### 2.6 "Ripeti · cliente mensile" ambiguo — P3
**Problema:** sembra un bottone, ma non è chiaro cosa fa né quante ripetizioni crea.

**Soluzione (decisa, vedi D1):** switch "**Fissa anche il prossimo**" con frequenza "ogni [4] settimane" (presa dalla scheda del cane, modificabile). Acceso di default solo per i clienti Mensili. Sotto, l'anteprima: "Prossimo: sab 7 nov, 10:00". Salvando si crea l'appuntamento che si sta salvando **e uno solo successivo**, N settimane dopo la sua data, non una serie.

### 2.7 Pagina di sfondo e header — P3
**Problema:** dietro lo sheet si vede una pagina vuota con la scritta "Calendario" non stilizzata. Lo sheet ha titolo "Nuovo appuntamento" e sotto una freccia indietro separata, ridondante.

**Soluzione:**
- Aprire lo sheet sopra la pagina da cui si parte (Home/Calendario/Animali/Scheda cane).
- Header sheet su una riga: `[✕]  Nuovo appuntamento`. Chiusura anche con swipe giù / tap fuori, con conferma se ci sono dati inseriti.

### 2.8 Validazione e sovrapposizioni — P2
**Stato attuale:** c'è già l'errore "Scegli un cane". L'avviso "Si sovrappone a Luna, Zeus" esiste ma è una riga di testo piccola, facile da non notare. Nelle viste (Home, Calendario, lista del giorno) le sovrapposizioni non sono segnalate in nessun modo (es. Max e Penny entrambi lun 12 ott 09:00; Toby e Chicca oggi 14:00).
**Soluzione:** "Salva appuntamento" disabilitato finché non ci sono cane + almeno 1 servizio + data + ora. Avviso sovrapposizione sempre calcolato (anche in creazione), in un box giallo ben visibile con nomi e orari ("Si sovrappone a Zeus 11:00–14:00"); salvataggio comunque permesso dopo conferma.

---

## 3. Generale

| # | Tema | Problema | Soluzione | P |
|---|------|----------|-----------|---|
| 3.1 | Due ingressi per "nuovo cane" | Sia "+ Aggiungi" in Animali sia il "+" centrale → "Nuovo cane" | Va bene tenerli, ma devono aprire **lo stesso** form (quello di 1.6) | P3 |
| 3.2 | Feedback salvataggio | Nessuna conferma visibile | Toast "Fido salvato" / "Appuntamento salvato per lun 12 ott 09:00" con azione "Annulla" | P2 |
| 3.3 | Dopo il salvataggio | — | Nuovo cane → aprire la sua scheda. Nuovo appuntamento → tornare al Calendario sul giorno dell'appuntamento | P2 |
| 3.4 | Tastiera mobile | — | `inputmode="tel"` per telefono, `inputmode="decimal"` per prezzi/peso, `autocapitalize="words"` per nomi | P3 |
| 3.5 | Lista vuota | "Nessun cane" piccolo e grigio | Stato vuoto con illustrazione e bottone "Aggiungi il primo cane" | P3 |
| 3.6 | Spaziatura campi | Troppo spazio tra etichetta e campo, il form sembra più lungo e dispersivo | Ridurre la distanza etichetta→campo (vedi 3.7) | P2 |

### 3.7 Spaziatura etichetta / campo — P2
**Problema:** il titolo del campo (es. "Nome", "Proprietario", "Telefono") è troppo staccato dal campo da compilare. Etichetta e campo non si leggono come un'unica coppia, e il form si allunga inutilmente.

**Soluzione:** regola unica per tutti i form (Nuovo cane, Nuovo appuntamento, Modifica):
- **Etichetta → campo:** 4px (massimo 6px).
- **Fine campo → etichetta del campo successivo:** 14–16px, così si capisce dove finisce un gruppo e inizia il successivo.
- **Tra sezioni** (es. prima di "Altri dettagli" o "Prezzi personalizzati"): 24px.
- **Etichette:** 13px, peso 500–600, `line-height: 1.2`, nessun margine di default del browser (`margin: 0`).
- **Altezza input:** 40–44px (tocco comodo su telefono), padding verticale 8–10px.
- **Segmented control senza etichetta** (Maschio/Femmina, taglia, ecc.): stessa distanza di 14–16px dal campo precedente.

Implementazione consigliata: un componente unico `<Field label="Nome">…</Field>` con il gap interno fisso, così la spaziatura è uguale ovunque e non va ripetuta a mano.

```css
.field        { display: flex; flex-direction: column; gap: 4px; }
.field + .field,
.field + .segmented,
.segmented + .field,
.segmented + .segmented { margin-top: 14px; }
.field label  { margin: 0; font-size: 13px; font-weight: 600; line-height: 1.2; }
.form-section + .form-section { margin-top: 24px; }
```
(Se si usa Tailwind: `flex flex-col gap-1` sul campo, `space-y-3.5` sul contenitore del form, `mt-6` tra le sezioni.)

### 3.8 Eliminare gli spazi vuoti inutili — P2
**Obiettivo:** nelle schermate non devono restare spazi vuoti. Tutto deve stare il più possibile in una schermata di telefono, senza scorrere a vuoto.

**Problemi visti:**
- Nella griglia dettagli (scheda profilo), sotto "Sesso" resta un buco grande perché la cella accanto (Età + checkbox "Anziano" + "Adulto") è molto più alta. Le righe della griglia si allineano alla cella più alta.
- Le etichette di sezione ("SERVIZI E PREZZI", "STORICO", "GALLERIA") hanno margini ampi sopra e sotto anche quando il contenuto è vuoto o è una sola riga.
- I testi di stato vuoto ("Nessun cane", "Nessun trattamento") occupano una riga a sé con il suo margine.
- Lo sheet "Nuovo appuntamento" lascia metà schermo grigio vuoto sopra di sé.

**Regole:**
- **Niente margini di default, ma schermata per schermata:** nelle schermate che si stanno toccando, azzerare i margini di titoli, paragrafi, label e liste dentro i form/le card (es. classe `.stack > * { margin: 0 }` sul contenitore) e usare solo `gap` / `space-y`. **Niente reset globale** su `h1–h6`, `p`, `label`, `ul`: sposterebbe anche le schermate che non stiamo modificando.
- **Niente righe fantasma:** non renderizzare elementi vuoti (`{x && <Componente/>}`), né placeholder "—" in griglie di sola visualizzazione dentro i form.
- **Griglie a 2 colonne:** usare `align-items: start` e celle di altezza simile. Le opzioni che allungano una cella (es. checkbox "Anziano") vanno tolte (vedi 1.1).
- **Sezioni vuote:** se una sezione non ha contenuto, mostrare solo il titolo con il link "+ Aggiungi" sulla stessa riga (es. `GALLERIA ········ + Aggiungi`), senza una riga "Nessun…" separata.
- **Titoli di sezione:** 16px sopra, 6px sotto, nessuno spazio extra.
- **Padding pagina:** 12–16px laterali, 12px in alto; header pagina alto al massimo 48–52px.
- **Sheet e modali:** altezza adattata al contenuto (`max-height: 90vh`, `height: auto`), non fissa. Se il contenuto è lungo, meglio uno sheet a tutta altezza che mezzo schermo vuoto sopra.
- **Footer con il bottone Salva:** sticky in basso con padding di 8–12px, senza spazio vuoto sotto oltre la safe-area (`padding-bottom: env(safe-area-inset-bottom)`).
- **Liste:** righe compatte (altezza 56–64px con foto 40px), divisori sottili invece di card con grandi margini.

**Controllo rapido:** su un telefono di 390×844 il form "Nuovo cane" chiuso (senza "Altri dettagli" e "Prezzi") deve stare tutto in una schermata, bottone Salva compreso.

---

## 4. Bug e logiche emersi dal test (30 animali, 40 appuntamenti)

### 4.1 Form Nuovo cane: due stati separati che non si parlano — P1 (bug)
**Problema:** compilando la parte alta (Barboncino, Maschio, Anziano, Mordace, Mensile), la griglia sotto continua a mostrare Razza "—", Sesso "—", Età "Adulto" con "Anziano" non spuntato, Cliente "Occasionale" e l'icona Bravo selezionata. Solo la Taglia è sincronizzata. Al salvataggio vince la parte alta, ma prima di salvare Laura vede dati contraddittori e se tocca le icone/matite in basso non si sa quale valore verrà salvato.
**Soluzione:** un solo stato del form (una sola fonte di verità). In creazione eliminare del tutto la griglia "dettagli" (vedi 1.1). In modifica, la griglia e i controlli devono leggere e scrivere lo stesso oggetto.

### 4.2 Scheda cane (vista) ripetitiva — P2
**Problemi:**
- Razza/sesso/età sono nel sottotitolo **e** nella griglia; nome e telefono del proprietario in alto **e** nel box contatti; il carattere come chip **e** come 3 icone.
- Il listino "Servizi e prezzi" completo (8 righe) occupa mezza scheda, mentre era stato deciso che nel profilo basta lo storico con trattamento e prezzo.
- In visualizzazione compaiono comunque i bottoni **Modifica** e **Salva** affiancati.
- Il contatto principale ha ruolo di default "Proprietaria" anche per un uomo (Mario Rossi).
- Le scorciatoie "+2 / +4 / +6 sett" compaiono anche quando il cane ha già un appuntamento futuro (vedi 4.11).

**Soluzione:** ordine della scheda: foto + nome + chip (carattere, mensile, anziano) → avviso critico → prossimo appuntamento → storico (data, servizi, prezzo, con evidenza se il prezzo è cambiato) → note → dettagli (chiusi) → contatti. Listino prezzi solo dentro "Modifica" (prezzi personalizzati). In vista solo "Modifica"; "Salva" solo in modifica. Ruolo contatto di default neutro: "Proprietario/a" o vuoto.

### 4.3 Calendario Giorno/Settimana: appuntamenti sovrapposti si coprono — P1 (bug)
**Problema:** oggi Ercole 10:00–12:00, Luna 10:30 e Zeus 11:00 sono disegnati uno sopra l'altro: **Ercole sparisce del tutto** dalla vista. Stessa cosa per Toby e Chicca alle 14:00 (si vede solo Chicca). In vista Settimana i nomi sono ridotti a "B…", "L…", "Z…".
**Soluzione:** layout a colonne per gli eventi sovrapposti (come Google Calendar): gli appuntamenti che si accavallano si dividono la larghezza. In Settimana mostrare almeno 4–5 lettere del nome o solo l'icona carattere + iniziali, e al tocco aprire il dettaglio. Bordo/colore di avviso sugli slot in sovrapposizione.

### 4.4 Calendario: appuntamenti fuori dalla griglia 08–19 — P1 (bug)
**Problemi:**
- Kratos domenica alle **07:00** non compare nella vista Giorno (la griglia parte dalle 08:00), però viene contato nel riepilogo "2 cani · 3h stimate". L'appuntamento è invisibile.
- Micio alle **18:45** (Stripping 2h) viene disegnato a partire dalla riga delle 19:00 e tagliato in fondo.
- L'etichetta "08:00" in cima è tagliata a metà.

**Soluzione (vedi D5):** la fascia 08–19 è quella che entra in uno schermo. Se nel giorno (o nella settimana) c'è un appuntamento prima delle 8 o che finisce dopo le 19, la griglia si allunga per includerlo e **si scorre**; all'apertura la vista parte posizionata sulle 08:00 (o sull'ora attuale, se è oggi). Un'etichetta in cima/in fondo segnala "1 appuntamento prima delle 8 ↑". Posizione verticale calcolata dall'ora di inizio esatta. Primo orario della griglia con padding sopra. La fascia resta fissa 08–19 (nessuna impostazione nuova), coerente con gli orari del select.

### 4.5 Clienti mensili: "Da fissare" anche se l'appuntamento è già preso — P1 (bug di logica)
**Problema:** in `cycle.ts` (`bookedOf`) un appuntamento conta come "fissato" solo se cade entro **scadenza + 14 giorni**. Se Laura lo ha messo più avanti, il cane resta "Da fissare". Esempi dal test:
- Tata: ultimo 10 set, scade 8 ott, ha già appuntamento **24 ott** → mostrata "Da fissare".
- Mia: ultimo 13 set, ha già **30 ott** → "Da fissare".
- Gigi: ultimo 11 ago, ha già **4 nov** → "Da fissare".
- La lista Animali invece mostra correttamente "Sab 24 ott 10:00": le due schermate si contraddicono.

Rischio concreto: Laura preme "Fissa" e crea un **doppione**.
**Soluzione:** un cane mensile è "fissato" se ha **qualsiasi** appuntamento futuro `programmato`. Se quell'appuntamento è molto oltre la scadenza (es. > scadenza + 14 gg), mostrarlo come "Fissato in ritardo · 24 ott" in arancione, non come "Da fissare".

### 4.6 Mensili nuovi senza storico "scadono oggi" — P2 (logica)
**Problema:** un cliente mensile appena inserito, senza appuntamenti completati, ha scadenza = oggi. Appena inseriti 17 mensili, la Home mostrava "17 mensili da programmare · scadono entro 7 gg" e la pagina Mensili "Scade oggi" per tutti.
**Soluzione:** senza un appuntamento completato la scadenza non esiste: mostrarli in un gruppo a parte "Nuovi – primo appuntamento da fissare", senza contarli come "in scadenza" nel banner della Home.

### 4.7 Mensile con frequenza diversa da 4 settimane — P3
**Problema:** se `recurrenceWeeks` è 2 o 6, nel form compare "Ripeti · cliente mensile · ogni 6 settimane". Il campo numerico "6" è senza etichetta e "mensile" non è più vero.
**Soluzione (vedi D1):** il tipo cliente resta "Mensile" (nessun cambio di nome per ora, per non toccare filtri, notifica e testi). Nella scheda c'è il campo "Frequenza: ogni [4] settimane" (default 4). Il form appuntamento mostra "Fissa anche il prossimo · tra 6 settimane" invece di "ogni 6 settimane · cliente mensile", e il campo numerico ha la sua etichetta.

### 4.8 "Ripeti" non crea gli appuntamenti successivi — P2 (da chiarire/bug)
**Problema:** salvando un appuntamento con "Ripeti · cliente mensile · prossimo 21 nov", viene creato solo quello del giorno (con un `seriesId`), nessun appuntamento il 21 nov. Laura si aspetta di vederlo in calendario.
**Soluzione (decisa, vedi D1):** si crea **solo il prossimo** appuntamento, alla stessa ora dopo N settimane. Quando quello viene segnato "Completato", il bottone "Fissa il prossimo" propone di nuovo la data a N settimane. Il cane non compare mai in "Da fissare" finché ha un appuntamento futuro (4.5).

### 4.9 Appuntamenti passati mai chiusi spariscono — P1 (logica)
**Problema:** Bobby (mer 7 ott) e Ugo (ieri) hanno appuntamenti passati ancora `programmato`. Nella lista Animali risultano "Nessun appuntamento", in Home non c'è nessun avviso, nel calendario sembrano identici a quelli completati. Quindi lo storico e gli incassi non tornano, e per i mensili la scadenza resta calcolata dal completato precedente.
**Soluzione:**
- Box in Home "**Da chiudere (2)**": appuntamenti passati non completati.
- Nel calendario stile diverso per stato: completato (spunta verde), da chiudere (bordo arancione), disdetto / non venuto (barrato, grigio).
- "Completato" abilitato per gli appuntamenti **di oggi (a qualsiasi ora) e dei giorni passati**; disabilitato dai giorni successivi (vedi D2). Oggi lo si può premere anche su appuntamenti di settimane dopo.
- Azioni rapide nel box "Da chiudere": "Completato" / "Non venuto" / "Disdetto" (vedi D3).

### 4.10 Cancella = eliminazione definitiva — P2
**Problema:** "Cancella" (dopo conferma) elimina l'appuntamento dal database. Non resta traccia di disdette o assenze, e non c'è "Annulla" (che invece c'è per Posticipa).
**Soluzione (vedi D3):** bottone **Disdici** (rosso) che porta l'appuntamento allo stato `disdetto` (motivo: cliente / salone), più lo stato `non_venuto`. Entrambi restano nello storico del cane (utile per sapere chi disdice spesso) e non contano nella scadenza dei mensili. Dopo "Disdici" compare il toast "Appuntamento disdetto · **Annulla**" per 5 secondi. Eliminazione vera solo da "⋯ → Elimina", con conferma.

### 4.11 Scheda appuntamento: azioni e gerarchia — P2
**Problemi:**
- **Sposta** e **Modifica** aprono lo stesso form: due bottoni per la stessa cosa.
- **Modifica** è il bottone primario blu; **Completato**, l'azione più usata, è testo in fondo.
- Dopo "Completato" restano visibili Anticipa / Posticipa / Sposta.
- Ora e durata sono ripetute: nel sottotitolo "Sab 10 ott · 10:00–12:00" e di nuovo nei campi "Ora 10:00 / Durata 2h".
- Le scorciatoie "+2/+4/+6 sett" dopo il completamento creano un nuovo appuntamento anche se ne esiste già uno futuro. Nel test, Ercole aveva già il 22 ott e "+4 sett" ha creato anche il 7 nov, senza avviso.

**Soluzione:** in basso, sticky, un grande bottone **Completato** (abilitato solo per oggi e giorni passati, vedi D2). Sopra, una riga con Anticipa −15 / Posticipa +15 / Modifica. **Disdici** in rosso, separato (vedi D3). Dopo il completamento mostrare solo "Durata reale", foto, note e "Fissa il prossimo". Quest'ultimo deve avvisare se esiste già un appuntamento futuro ("Ercole ha già un appuntamento il 22 ott. Crearne un altro?"). Togliere i campi Ora/Durata duplicati.

### 4.12 Cani con lo stesso nome indistinguibili — P1
**Problema:** con due "Luna" (Maltese di G. Bianchi e Labrador di P. Verdi), la ricerca nel Nuovo appuntamento mostra due righe identiche "Luna / Luna". Anche in Home, calendario e lista del giorno l'appuntamento dice solo "Luna". Alto rischio di prenotare il cane sbagliato.
**Soluzione:** ovunque appaia un cane in liste compatte, aggiungere sotto il nome razza e cognome del proprietario ("Luna · Maltese · Bianchi"), almeno quando esiste un omonimo. Nei risultati di ricerca sempre.

### 4.13 Suggerimento "+ Nuovo cane" anche se il cane esiste — P2
**Problema:** scrivendo "Ercole" o "Max" compare sia il cane esistente sia "+ Nuovo cane "Ercole"". Con un tocco sbagliato si crea un doppione (e si perde l'appuntamento, vedi 2.1). Dopo aver scelto il cane non c'è un segnale chiaro che è selezionato: la lista dei suggerimenti resta aperta.
**Soluzione:** quando il nome corrisponde esattamente a un cane esistente, mostrare "+ Nuovo cane" in secondo piano o con conferma ("Esiste già Ercole (Terranova, Usai). Crearne un altro?"). Dopo la selezione il campo si trasforma in una "card" del cane scelto (foto, nome, razza, proprietario, icona carattere, ✕ per cambiare) e i suggerimenti si chiudono.

### 4.14 Animale archiviato con appuntamenti futuri — P2
**Problema:** archiviando Nala come "Deceduto" con "Archivia soltanto", il suo appuntamento del 15 ott resta in calendario senza nessuna indicazione. L'opzione "Archivia e cancella i futuri" esiste, ma nel caso "Deceduto" non dovrebbe essere facoltativa.
**Soluzione:** con "Deceduto" portare sempre i futuri a `disdetto` (motivo: deceduto), mostrando quanti sono. Con "Non più in cura" chiedere, come oggi. Gli appuntamenti di animali archiviati, se restano, vanno marcati in calendario (icona archivio/grigio).

### 4.15 Ricerca troppo rigida — P2
**Problemi dal test (lista Animali):**
- Per telefono non trova nulla: "347", "333 123".
- Non ignora gli accenti: "artu" non trova "Àrtù", "frise" non trova "Bichon Frisé".
- Il nome, il proprietario e la razza invece funzionano (anche "LUNA" maiuscolo).

**Soluzione:** includere nel `searchKey` il telefono (solo cifre, così "3331234567" trova "333 1234567") e normalizzare togliendo gli accenti (`normalize('NFD').replace(/\p{Diacritic}/gu,'')`) sia sui dati che sulla query.

### 4.16 Specie: gatti e altri animali — P3
**Problemi:** Micio (gatto) e Nuvola (coniglio) hanno l'avatar del cane. Il filtro "Gatti" esiste ma non "Altro", quindi Nuvola non si può filtrare. Titoli e testi dicono sempre "cane" ("Nuovo cane", "Nessun cane", "Cani" nel riepilogo calendario).
**Soluzione:** avatar placeholder per specie (cane / gatto / generico). Testi neutri ("Nuovo animale", "Nessun animale"), oppure un'impostazione "Lavoro solo con cani" che nasconde gatto/altro. Filtro "Altri" se ce ne sono.

### 4.17 Vista Mese: settimana duplicata e pallini limitati — P3
**Problemi:** in vista Mese resta in alto anche la striscia della settimana, quindi i giorni appaiono due volte. I pallini sono al massimo 3 anche con 6 appuntamenti (oggi). Sotto il mese c'è un grande spazio vuoto; la lista del giorno si apre solo in un foglio sopra.
**Soluzione:** in Mese nascondere la striscia settimana. Al posto dei pallini mostrare il numero di appuntamenti ("6") o una barra di carico. Sotto la griglia, la lista del giorno selezionato direttamente in pagina (niente foglio, niente spazio vuoto).

### 4.18 Home — P3
- I chip dei servizi vengono tagliati a metà parola ("Bagno + taglic", "Gestione nod"): usare un'icona + abbreviazione o andare a capo.
- Gli appuntamenti già completati restano nella lista "Oggi" senza segno distintivo: aggiungere la spunta e spostarli in fondo.
- La campanella porta alla pagina "Clienti mensili": o si rinomina/cambia icona (es. "Mensili"), o diventa un vero centro notifiche (mensili + da chiudere + promemoria).
- "Visti di recente" mostra un solo cane occupando una riga intera: nasconderlo se ci sono meno di 3 elementi.

### 4.19 Listino — P3
**Problema:** i servizi extra (Nodi, Dermatologico, Antiparassitario, Unghie) hanno un prezzo unico ma è scritto solo nella colonna "Grande": sembra che costino qualcosa solo per i cani grandi.
**Soluzione:** per i servizi a prezzo unico unire le tre colonne in una cella "€ 5 · tutte le taglie".

### 4.20 Accessibilità dei campi — P3
**Problema:** gli input del form cane non hanno etichetta collegata (lettore schermo e autofill vedono "textbox" anonimi). Gli input Durata/Prezzo dei servizi sono distinguibili solo da `aria-label`.
**Soluzione:** usare `<label htmlFor>` o il componente `<Field>` (vedi 3.7), che risolve insieme spaziatura e accessibilità.

### Cosa funziona bene (da non rompere)
- Prezzi e durate si aggiornano in automatico in base alla taglia.
- Filtri lista Animali (Mensili, Occasionali, Mordaci, Anziani, Gatti) e contatori corretti.
- Posticipa +15 min con "Annulla" nel toast.
- Conferma prima di cancellare un appuntamento e scelta "Archivia e cancella i futuri" in archiviazione.
- Errore "Scegli un cane" se si salva senza cane.
- Storico nella scheda con data, servizio e prezzo; "Durata media" calcolata.
- Tema scuro leggibile.
- Nessun errore in console durante tutto il test.

---

## 4bis. Rifiniture di design (senza stravolgere l'app)

**Regola:** restano invariati stile, colori (bianco + blu ardesia), icone sticker, navigazione in basso e struttura delle pagine. Cambiano solo **spazi, allineamenti, ordine degli elementi e gerarchia visiva**, così le informazioni importanti si trovano subito e i campi si compilano più in fretta.

### Principi validi ovunque
- **Una sola azione primaria per schermata** (bottone blu pieno), sempre nella stessa posizione: in basso, sticky, larghezza piena. Le azioni secondarie vanno come bottoni chiari o link.
- **Allineamento a sinistra unico:** tutti i testi, le etichette e i campi partono dalla stessa linea verticale (16px dal bordo). Nessun elemento "fuori asse".
- **Gerarchia tipografica a 3 livelli:** titolo 18–20px bold, testo principale 15px, testo secondario 13px grigio. Oggi molti testi hanno la stessa dimensione e si confondono.
- **Informazioni critiche sempre nello stesso punto:** il carattere (icona sticker) sempre a destra del nome; l'avviso critico sempre come banda rossa sotto il nome, in tutte le schermate (lista, scheda, appuntamento, calendario).
- **Aree di tocco ≥ 44px** per chip, bottoni e righe di lista, con almeno 8px tra due elementi toccabili vicini.
- **Numeri allineati a destra** (prezzi, durate, orari) e in carattere tabellare (`font-variant-numeric: tabular-nums`), così si leggono in colonna.

### Home
- Ordine: data → **Oggi** (lista) → avvisi (Mensili da fissare, Da chiudere) → statistiche → visti di recente. Oggi la lista del giorno viene dopo banner e card: invertire, perché è la cosa che Laura guarda per prima.
- Le 3 card statistiche: altezza ridotta (una riga numero + etichetta), oppure una sola riga compatta "6 cani · 8h05 · 12/17 mensili".
- Riga appuntamento: ora grande a sinistra in colonna fissa (48px), poi nome + razza/proprietario su 2 righe, a destra solo l'icona carattere. Le altre icone (mensile, anziano) piccole accanto al nome, non come terza colonna.
- L'**appuntamento in corso o il prossimo** evidenziato (bordo blu a sinistra o sfondo tenue) per capire a colpo d'occhio a che punto è la giornata.

### Lista Animali
- Riga a 2 righe fisse: **Nome** + icone piccole / *Razza · Proprietario*. Lo stato appuntamento ("Sab 17 ott 08:00", "Da fissare") come etichetta allineata a destra sotto l'icona carattere, non come terza riga: righe più basse e lista più lunga visibile.
- "Da fissare" come badge arancione; data prossimo appuntamento in grigio.
- Barra di ricerca + tab (Attivi / Mensili / Occasionali / Archivio) + filtri **sticky** in alto durante lo scorrimento.
- Riunire tab e filtri in una sola riga scorrevole di chip, per togliere una riga di altezza.
- Nomi lunghi: massimo 1 riga con "…", nome completo nella scheda.

### Scheda cane
- **Blocco identità compatto:** foto 64px a sinistra, a destra nome, razza · età, proprietario con il telefono come bottone "Chiama" (non testo semplice). Tutto in ~90px di altezza invece degli attuali ~250.
- Subito sotto: banda rossa avviso critico → card **Prossimo appuntamento** (o bottone "Fissa appuntamento" se non c'è) → **Storico**.
- Storico come tabella leggera: data | servizi | prezzo a destra; freccia ↑ verde/rossa accanto al prezzo se è cambiato rispetto al precedente.
- Dettagli (specie, sesso, peso, taglia, ecc.) in una sezione richiudibile "Dettagli", chiusa di default.
- Bottone **Modifica** in alto a destra nell'header (icona matita), non in fondo alla pagina.
- "Segna come non più in cura / deceduto" nel menu ⋯ dell'header, non come link in fondo: è un'azione rara e delicata.

### Form Nuovo cane / Modifica cane
- Vedi layout in 1.6 e spaziature in 3.7.
- **Due campi per riga** dove sono corti: Razza | Taglia, Proprietario | Telefono (su schermi ≥ 360px), come nel layout di 1.6 (vedi D4).
- I segmented control (sesso, età, taglia) a tutta larghezza con le opzioni distribuite uguali, così si toccano facilmente; etichetta piccola sopra ("Età"), oggi mancante.
- Le 3 icone carattere più grandi (48px) con etichetta sotto, centrate in una riga: sono l'informazione più importante per la sicurezza.
- Tastiera: "Avanti" passa al campo successivo; l'ultimo campo fa "Salva".

### Nuovo appuntamento
- Ordine dei blocchi: **Cane → Servizi → Quando → Riepilogo → Salva**, con un titoletto piccolo per ciascuno e 20px tra un blocco e l'altro.
- Cane selezionato come **card** (foto, nome, razza, proprietario, icona carattere, avviso critico): si vede subito con chi si sta lavorando (vedi 4.13).
- Servizi in **griglia a 2 colonne** di chip della stessa larghezza, invece di chip a larghezza variabile che vanno a capo in modo irregolare. Ogni chip ha icona, nome e "30m · €20" su due righe.
- Data e ora sulla **stessa riga** (Giorno | Ora), con le scorciatoie Oggi/Domani sopra.
- **Riepilogo sticky in basso** sopra il bottone: "10:00 → 12:00 · 2h · €60". Sempre visibile, non in fondo al form.

### Scheda appuntamento
- In alto: card del cane (come sopra) + riga grande "**Sab 10 ott · 10:00–12:00**".
- Servizi e prezzi come mini-scontrino: una riga per servizio con prezzo a destra, linea, **Totale** in grassetto.
- Strumenti / Prodotti / Stile / Foto lavoro raggruppati in una sezione "Note del lavoro", richiudibile, aperta solo dopo "Completato".
- Bottoni come in 4.11: Completato grande in basso sticky; Posticipa/Anticipa/Modifica in una riga di 3 bottoni uguali.

### Calendario
- Altezza di ogni ora calcolata perché la fascia 8–19 entri in uno schermo (circa 50px per ora su 390×844); se la giornata è più lunga si scorre (vedi 4.4 e D5). Colonna orari più stretta (40px) per lasciare più spazio alle card.
- Linea rossa "adesso" sull'ora corrente nella vista Giorno.
- Card appuntamento: nome in grassetto + icona carattere sulla prima riga, servizi abbreviati sulla seconda, orario in piccolo. Colore del bordo per stato (programmato blu, completato verde, da chiudere arancione).
- Riepilogo del giorno ("6 cani · 8h05 · 2 mordaci") come riga compatta sotto la striscia dei giorni, con i mordaci in rosso.

### Clienti mensili
- Gruppi chiari: **In ritardo** (rosso) → **In scadenza questa settimana** (arancione) → **Nuovi** → **Fissati** (verde, richiusi di default).
- Riga: nome + "ultimo 5 set · scade 3 ott" a sinistra; a destra il bottone "Fissa" piccolo, allineato in colonna su tutte le righe.

### Listino
- Intestazione colonne sticky; servizi principali e servizi extra separati da un titoletto ("Servizi aggiuntivi · prezzo unico").
- Durata sotto il nome in grigio (già così), prezzi allineati a destra in colonne della stessa larghezza.

### Impostazioni
- Ogni riga con icona a sinistra, etichetta e valore/freccia a destra, altezza uniforme 52px.
- "Esci" in rosso, separato in fondo con spazio sopra, così non si preme per sbaglio.
- Backup: mostrare la data dell'ultimo backup in evidenza; "Mai eseguito" in arancione come promemoria.

### Barra di navigazione in basso
- Il "+" centrale apre un foglio con 2 bottoni grandi (icona + testo): **Appuntamento** (primo, più usato) e **Animale**. Oggi sono due righe di testo piccole.
- Etichetta attiva in grassetto + colore; icone inattive più chiare.

---

## 5. Blocchi di lavoro (in quest'ordine)

### Blocco 1 — Bug già decisi (si parte da qui)
Non cambia nessuna regola di mensili, disdette o ripetizioni.
- 4.1 un solo stato nel form cane. **Confine:** in creazione (`mode = create`) la griglia "dettagli con matita" non viene renderizzata; in modifica griglia e controlli leggono e scrivono lo stesso oggetto. Il riordino/compattamento del form (1.3–1.6, D4) resta nel blocco 3.
- 4.3 appuntamenti sovrapposti tutti visibili (Giorno e Settimana)
- 4.4 + D5 appuntamenti fuori dalle 8–19 visibili e al posto giusto
- 4.12 omonimi distinguibili (razza + proprietario) in ricerca, Home, calendario
- 4.15 ricerca per telefono e senza accenti
- 2.7 foglio appuntamento sopra la pagina di partenza

### Blocco 2 — Logiche degli appuntamenti e dei mensili
Un solo blocco, perché condividono gli stati dell'appuntamento e il calcolo della scadenza.
- Stati `programmato` / `completato` / `disdetto` / `non_venuto` (D3) e regola Completato (D2)
- 4.5 mensile fissato = qualsiasi appuntamento futuro programmato
- 4.6 mensili nuovi senza storico in gruppo a parte, fuori dal banner
- 4.9 box "Da chiudere" in Home e stili per stato nel calendario
- 4.10 Disdici al posto dell'eliminazione
- 2.6 + 4.7 + 4.8 + D1 "Fissa anche il prossimo"
- 4.14 deceduto → futuri disdetti
- 4.11 parte logica: avviso se esiste già un appuntamento futuro
- **Una sola funzione** (es. `monthlyStatus(dog, appointments, now)`) usata da banner Home, pagina Mensili, campanello e testo della notifica Android ("N mensili da programmare"), così i numeri coincidono ovunque (D8)

### Blocco 3 — I due flussi veloci
- Sezione 1 + D4: Nuovo cane compatto (1.1–1.6, 4.2)
- 2.1 + D6, 2.2, 4.13: cane creato dentro l'appuntamento, card del cane selezionato
- 2.3, 2.4, 2.8: prezzi sui chip, totale sempre visibile, sovrapposizione evidente
- 4.11 parte grafica: gerarchia dei bottoni nella scheda appuntamento

### Blocco 4 — Rifiniture
- 3.7, 3.8 (con D7: niente reset globale) e 4bis, schermata per schermata, **insieme al blocco che quella schermata già tocca**
- P3 rimanenti: 2.5, 4.16–4.20, 3.1–3.6

## 6. Test di accettazione

- [ ] Creo un cane nuovo compilando solo Nome, Proprietario, Telefono e premo Salva in meno di 30 secondi.
- [ ] Nel form Nuovo cane nessun campo appare due volte.
- [ ] Da Nuovo appuntamento scrivo un nome inesistente, compilo proprietario e telefono inline, scelgo servizi, data e ora, salvo: si creano sia il cane sia l'appuntamento, senza cambiare pagina.
- [ ] Selezionando Bagno + Unghie vedo "Totale 40m · €…" aggiornato.
- [ ] Un cane Mordace mostra il diavoletto nei risultati di ricerca dell'appuntamento.
- [ ] Chiudendo lo sheet con dati inseriti compare una conferma.
- [ ] In tutti i form l'etichetta sta a ~4px dal suo campo e i campi sono separati da ~14–16px. Ogni etichetta si legge chiaramente come parte del campo sotto.
- [ ] Su 390×844 il form Nuovo cane (sezioni opzionali chiuse) sta in una sola schermata, Salva compreso, senza buchi vuoti nelle griglie o tra le sezioni.

**Logiche e calendario (ripetere con ~30 cani e ~40 appuntamenti):**
- [ ] Tre appuntamenti sovrapposti (10:00, 10:30, 11:00) sono tutti visibili affiancati in vista Giorno e Settimana.
- [ ] Un appuntamento alle 07:00 e uno alle 18:45 da 2h si vedono interi e nella posizione corretta.
- [ ] Un mensile con appuntamento futuro (anche oltre 2 settimane dalla scadenza) non compare mai in "Da fissare".
- [ ] Un mensile nuovo senza storico non fa scattare il banner "in scadenza".
- [ ] Un appuntamento passato non completato compare in Home in "Da chiudere" e nel calendario con stile diverso.
- [ ] "Completato" funziona su appuntamenti di oggi (anche più tardi nella giornata) e passati; è disabilitato da domani in poi.
- [ ] "Disdici" lascia l'appuntamento nello storico come "Disdetto"; il toast offre "Annulla" per 5 secondi.
- [ ] "Fissa il prossimo" avvisa se esiste già un appuntamento futuro.
- [ ] Con due cani "Luna" si distinguono sempre (razza + proprietario) in ricerca, Home e calendario.
- [ ] Scegliendo un cane esistente, il campo diventa una card e "+ Nuovo cane" non è più proponibile senza conferma.
- [ ] Archiviando come "Deceduto" gli appuntamenti futuri passano a "Disdetto".
- [ ] La ricerca trova per telefono ("3331234567") e ignora gli accenti ("artu" → Àrtù).
- [ ] Con "Fissa anche il prossimo" acceso, salvando si creano esattamente 2 appuntamenti (quello salvato + uno N settimane dopo la sua data, alla stessa ora).
- [ ] Un gatto creato dal Nuovo appuntamento risulta gatto, e un cane grande ha subito prezzi e durate da grande.
