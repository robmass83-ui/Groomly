# Admin Manager e beta lato salone — design definitivo (fase 1B)

Data: 4 novembre 2026. Sessione A2. Fonte: `docs/GROOMLY-BETA-PIANI-PROMPT.md` (fase 1B, 2.2, 2.3, 3.1–3.4, 4.4).
Proposte: `2026-11-04-admin-manager-proposte.html` (indice) e `…-proposta-1.html` … `-5.html`.
Contratti dati e callable: `2026-11-04-beta-fondamenta-design.md`, sezione «Contratti» (sessione A1). Questa spec usa quei nomi e non li ridefinisce.

**Scelta di Roberto (4/11):** proposta **2 «Tab in alto»**, con due pezzi della **5**: la lista **«Da fare oggi»** nella Panoramica e il **pannello di accensione** a semaforo in Piani.
Per la toelettatura, come da consiglio: la **card dell'invito in Home** (dalla 1), la **pagina invito viola** come la Vetrina, il **feedback a passi** e il **BETA con la barra dei giorni** (dalla 2).

Chi la usa: **B2** (Admin Manager, sezioni 1–8) e **B3** (app del salone, sezione 9). B4 monta il pannello di accensione (sezione 7.3), che B2 lascia come componente.

## Intento

- Roberto apre l'Admin Manager soprattutto per capire **come va la beta**: prima i numeri, poi «chi» guardare.
- Invita **a gruppi**: filtra, seleziona più saloni, invita insieme.
- Non si perde nessuna funzione di «Utenti Groomly»: Tour, Toelettature, Attiva Plus/Salone, Regala 30 giorni, Torna a Go, Elimina con la parola, Suggerimenti con esportazione.

### Obiettivi
- Una console su telefono (360–400 px), compatta, nello stile di oggi.
- Ogni sezione a un tocco dai tab.
- Selezione multipla con la barra d'invito.

### Non obiettivi
- Nuove funzioni server oltre ai contratti di A1. Per esempio **niente «Ricorda invito»**: non c'è una callable. Un invito scaduto si rifà con un nuovo invito.
- Versione per tablet o desktop: va bene la colonna da telefono centrata, come il resto dell'app.

### Anti-obiettivi
- Le azioni pericolose (Elimina, Revoca, Torna a Go) non devono mai stare accanto all'azione principale senza conferma.
- Nessun prezzo nelle vetrine finché `showPrezziInBeta` è spento.

## Approcci considerati
Le cinque proposte sono nell'indice: Tessere, Tab in alto, Barra in basso, Prima la lista, Imbuto. La 2 è stata scelta perché:
- con un tocco si passa dai numeri alla lista dei saloni;
- mostra il numero delle cose nuove nei tab;
- il dettaglio salone sta in uno schermo.

Della 5 si prendono le due parti più utili durante la beta.
Scartate: la 3, perché toglie la barra dell'app e nasconde il Programma beta, e la 4, perché i numeri sono piccoli e il cambio piano col selettore si tocca per sbaglio.

---

## 1. Nome, percorso, accesso

- Nome: **Admin Manager**, uguale in it, en ed es (chiave `adminManager`). Sostituisce «Utenti Groomly» (`uteTitolo`) ovunque: voce in Impostazioni, titolo, testi.
- Percorso: **`/impostazioni/admin-manager`**. `/impostazioni/utenti` resta e reindirizza (`replace`) al nuovo, mantenendo i parametri. Tiene vivi i link vecchi e i test.
- Accesso come oggi: solo `isOperator(email)`. Gli altri vengono rimandati a `/impostazioni`.
- Voce in Impostazioni: stessa posizione di oggi. Icona `Crown` viola (`#7B3FE4`), titolo «Admin Manager», sottotitolo «Solo operatori».
- File: `src/pages/AdminManagerPage.tsx` sostituisce `UsersPage.tsx`. La logica di oggi va spostata in componenti per sezione, non riscritta: `invia`, `tornaGo`, `scegliBypass`, `serveTesto`, la conferma Elimina, la coda Suggerimenti e l'esportazione.

## 2. Navigazione

Stato nell'URL (`useSearchParams`, come oggi):

| Parametro | Valori | Note |
|---|---|---|
| `tab` | `panoramica` (default) · `saloni` · `beta` · `feedback` · `suggerimenti` · `piani` | Tab attivo |
| `id` | salonId | Con `tab=saloni` apre il dettaglio del salone |
| `cat` | categoria | Con `tab=suggerimenti` apre la coda di una categoria (oggi `zona=coda`) |

- Testata: `Header` con titolo «Admin Manager» e freccia indietro verso `/impostazioni`.
- **Barra dei tab** sotto la testata, fissa in alto mentre si scorre (`position: sticky`, sfondo `--bg`). Scorre di lato.
  - Ogni tab è una pillola alta 38 px (target pieno 44 px con il padding della barra), testo 13 px grassetto.
  - Il tab attivo ha sfondo `--tx` e testo `--bg`.
  - Il numero delle cose nuove è un bollino rosso `--bad` con testo bianco: Beta = inviti aperti, Feedback = feedback non ancora visti, Suggerimenti = da vedere.
  - Il tab attivo si porta in vista da solo (`scrollIntoView({ inline: 'nearest' })`).
  - Ruolo `tablist`; i tab sono `tab` con `aria-selected`.
- Il **dettaglio salone** e la **coda di una categoria** si aprono sopra i tab. La testata mostra il nome del salone; la freccia torna al tab (`id` o `cat` tolti). I tab restano nascosti.
- **Modalità selezione** (tab Saloni): la testata diventa «N selezionati», con ✕ per uscire e «Tutti» per selezionare tutti i filtrati. I tab restano visibili.
- «Feedback non ancora visti»: si segnano in locale come i Suggerimenti (`revisioneSuggerimenti`); si azzerano aprendo il tab. *Scelta di A2.*

## 3. Panoramica (`tab=panoramica`)

Dati: callable `contatoriAdmin` (un solo invio all'apertura, poi a ogni ritorno sul tab, al massimo una volta al minuto) e lettura operatore di `betaInviti` per «Da fare oggi».

Dall'alto in basso:

1. **Riquadro Beta** scuro (`#141B2B`; in scuro `#1E2738` con bordo `--line2`). Titolo «Beta» con icona `FlaskConical`.
   - Quattro numeri in colonna: **Invitati** (inviti aperti), **In beta** (`accettato` con beta in corso), **Feedback** (totali), **Pagherebbero** (risposte «sì», in verde `#4FCB8F`).
   - Ogni numero si tocca e apre il tab collegato: Beta con il filtro giusto, oppure Feedback.
2. **Da fare oggi** (dalla 5). Titolo di sezione con barra `--warn` e numero di voci, poi una `Card` con righe. Si calcola nel client:
   - invito `invitato` con `scadeInvitoIl` entro 3 giorni → «{salone} non ha risposto · L'invito scade tra N giorni». Tocco: dettaglio salone.
   - beta `accettato` con `betaFinoAl` entro 7 giorni → «{salone} finisce il {data}», con il pulsante tonale viola «+30 gg» (`estendiBeta` con 30, dopo un dialogo di conferma).
   - feedback arrivati da meno di 3 giorni e non visti → «Nuovo feedback da {salone} · {voto} ★ · pagherebbe {fascia}». Tocco: tab Feedback.
   - suggerimenti da vedere > 0 → «{n} suggerimenti da vedere». Tocco: tab Suggerimenti.
   - Massimo 5 righe, le più urgenti per prime. Se non c'è niente, una riga «Niente da fare oggi».
3. **Saloni**: numero totale grande, poi «Attivi a 7 giorni» e «Attivi a 30 giorni» con la percentuale.
   - Sotto, una barra a strati dei piani: Go `#9AA6B8`, Plus `#7B3FE4`, Salone `#DCA50E`, VIP oro `#B8962E`. Sotto la barra, la legenda coi numeri.
   - Ultima riga: «Fonti: beta n · prova n · manuale n · omaggio n · play n».
4. **Avvisami**: titolo con il totale e «n Plus · n Salone». Sotto, barre orizzontali per funzione, ordinate dalla più chiesta (massimo 6), colorate col piano della funzione.
   - Le chiavi `piano-plus` e `piano-salone` si chiamano «Vetrina Plus» e «Vetrina Salone».
5. **Inviti per stato**: una riga di pillole (`StatusPill`), ognuna apre il tab Beta filtrato: Invitati (prim), In beta (ok), Rifiutati (bad), Scaduti (neutral), Revocati (warn).
6. **Tour di benvenuto**: card con interruttore, la logica ottimistica di oggi (`cambiaTour`). Resta qui perché si usa poco ma va trovato subito.

Mentre carica: `AttesaRiga`. Se c'è un errore: «Numeri non disponibili. Riprova», con il pulsante «Riprova».

## 4. Saloni (`tab=saloni`)

Dati: `listSalonDirectory` come oggi; `salon/shared` è sempre escluso (`salonRows`). Stato beta da `betaInviti`.

- **Cerca** (`SearchBar`): cerca in nome del salone, titolare e città.
- **Filtri** (`FilterChip`, riga che scorre, ciascuno con il conteggio):
  - piano: Go · Plus · Salone · VIP;
  - beta: In beta · Invitati · Mai invitati · Chiusi (rifiutati, scaduti o revocati);
  - attività: Attivi 7 gg · Inattivi (oltre 30 gg).
  - Filtri di gruppi diversi si combinano in E; nello stesso gruppo in O. *Scelta di A2.*
- Sotto i filtri: «N saloni» e il link «Seleziona tutti».
- **Riga del salone** (`Row`, almeno 44 px):
  - sinistra: avatar con le iniziali (36 px, raggio 10, colore fisso per salone);
  - centro: nome (14/700) e sottoriga (13, `--tx3`):
    - in beta: «{titolare} · beta, N gg»;
    - invitato: «Invito Plus · scade tra N gg»;
    - altrimenti: «{titolare} · {città}»;
  - destra: bollino del piano (`MarchioLivello`, come oggi). Per invitati e chiusi c'è invece la pillola di stato: Invitato / Ha rifiutato / Invito scaduto / Revocato.
  - Tocco: apre il dettaglio.
- **Selezione**: tieni premuto (500 ms) su una riga, oppure tocca «Seleziona» nella testata. Compaiono le caselle (22 px, raggio 6; selezionata: `--pri-solid` con spunta bianca).
- **Barra d'invito** in basso, sopra il contenuto: scheda scura (`#141B2B`, raggio 16).
  - Prima riga: «✓ N selezionati» e «Annulla».
  - Pulsanti: **Beta Plus** (sfumatura viola), **Beta Salone** (sfumatura oro, testo `#3A2700`) e «⋯». Il «⋯» apre un foglio con «Regala 30 giorni a tutti».
  - Se c'è un VIP o un salone con piano Play attivo, la barra resta: il server li salta e l'esito lo dice.
- **Dialogo Invita** (`Sheet` dal basso, quasi a tutta altezza):
  - titolo «Invita alla beta»;
  - sottotitolo con i nomi: i primi 3, poi «e altri N»;
  - **Piano**: `Segmented` Plus | Salone, con il selezionato col colore del piano;
  - **Durata**: `Segmented` 30 giorni | 60 giorni | 90 giorni | Altro. Il default è 60 giorni. Con «Altro» compare un campo numerico da 1 a 365 giorni;
  - **Messaggio (facoltativo)**: area di testo, massimo 500 caratteri, con il contatore;
  - nota su sfondo `--surf`: «Il piano si accende solo quando accettano. L'invito scade dopo 14 giorni. Email e avviso in app partono subito.»;
  - pulsanti: «Annulla» (secondario) e «Invia N inviti» (sfumatura del piano, icona `Send`);
  - chiama `invitaBeta({ salonIds, piano, giorni, messaggio })`;
  - esito con il toast «N inviti inviati». Se ci sono saltati: «· M saltati», e toccando si vede l'elenco col motivo: VIP · già invitato · piano attivo · non trovato;
  - dopo l'invio si esce dalla selezione e la lista si aggiorna.

## 5. Dettaglio salone (`tab=saloni&id=…`)

Testata con il nome del salone e il sottotitolo «{titolare} · {città}».

1. **Piano effettivo** (card):
   - bollino del piano, poi «Plus · in beta» con l'etichetta BETA (sezione 8);
   - sotto, «Perché:» seguito da una delle cause: VIP · omaggio, senza scadenza / Beta accettata il {data} / Prova 30 giorni, scade il {data} / Attivato a mano, senza scadenza / Abbonamento Play / Go gratis;
   - con una scadenza: barra dei giorni (sfumatura del piano), «N gg» e «al {data}»;
   - pillole: attività (Attivo oggi / Attivo N gg fa), «Early adopter» se è vero, «Feedback: N».
2. **Segmented**: **Azioni** | **Storico** | **Feedback N**.
3. Vista **Azioni**:
   - **Beta** (titolo di sezione con barra viola). Griglia 2 colonne: «Estendi» (tonale viola) e «Revoca» (`--warn-s`/`--warn`).
     - Sotto, la card con l'interruttore **Early adopter**, sottotitolo «Avrà l'offerta fondatori» (`segnaEarlyAdopter`).
     - Senza beta in corso al posto della griglia ci sono «Invita alla beta Plus» e «Invita alla beta Salone»: aprono lo stesso dialogo con un solo salone.
     - Con un invito aperto: «Revoca invito» (`revocaBeta`).
   - **Piano** (barra oro). Griglia 2×2: «Attiva Plus» (tonale viola), «Attiva Salone» (tonale oro), «Regala 30 giorni» (secondario), «Torna a Go» (secondario).
     - Il pulsante del piano già attivo non c'è.
     - Si mantiene il comportamento di oggi: conferma, testo obbligatorio quando `serveTesto`, VIP protetti (`uteVipResta`), mail non inviata (`bypassMailKo`).
   - Distanza di 12 px, poi **Elimina toelettatura** a tutta larghezza (`variant="bad"`, icona `Trash2`), e sotto la nota «Solo per i test · chiede di scrivere ELIMINA». Il dialogo è quello di oggi, identico.
4. Vista **Storico**: linea del tempo (pallino 10 px e testo 12.5 px). Voci:
   - inviti (anche da `betaInviti/{id}/storico`), accettazione, rifiuto col motivo, estensioni, revoca;
   - cambi di piano noti, iscrizione.
   - Dalla più recente alla più vecchia.
5. Vista **Feedback**: le righe di feedback di questo salone (sezione 6), oppure «Nessun feedback».

Dialoghi delle azioni beta (`Dialog`):
- **Estendi**: `Segmented` +15 · +30 · +60 giorni · Altro, poi «Nuova fine: {data}» e Conferma.
- **Revoca**: testo «{salone} torna a Go subito. I dati restano. Gli mandiamo un avviso.», messaggio facoltativo e Conferma in `variant="bad"`.

## 6. Feedback (`tab=feedback`)

Dati: lettura operatore di `betaFeedback`, la più recente per prima.

- `Segmented` Tutti N | Plus N | Salone N, poi un campo «Cerca salone».
- **Riepilogo** (due card):
  1. voto medio grande (30/800) con le stelle, e la distribuzione 5→1 in barrette;
  2. «Pagheresti?»: barra a tre colori (sì `--ok`, forse `--warn`, no `--bad`), legenda coi numeri e «Quanto al mese: fascia (n) · …».
- **Funzioni**: per ogni funzione della Vetrina (`FUNZIONI` di `Vetrina.tsx`, del piano filtrato), una barra utile / poco utile / non usata, col numero di «utile» a destra.
- **Esporta**: pulsante secondario «Esporta PDF o Excel». Stesso dialogo dei Suggerimenti, con il formato.
  - Colonne Excel: data, salone, piano, voto, pagheresti, quanto, ricontatto, fine beta, cosa non va, cosa manca, una colonna per funzione, versione dell'app.
  - Il PDF ha un blocco per feedback. Riusa `esportaSuggerimenti` (nuove funzioni sorelle).
- **Righe**:
  - nome del salone e data;
  - stelle, etichetta del piano, pillola «Pagherebbe: sì · 5–10 €»;
  - «Cosa non va» come citazione (bordo `--line2`), «Manca: …» come citazione (bordo `--pri`);
  - icona busta se accetta di essere ricontattato;
  - toccando la riga si apre il dettaglio salone sulla vista Feedback.

## 7. Suggerimenti (`tab=suggerimenti`) e Piani (`tab=piani`)

### 7.1 Suggerimenti
È la coda di oggi, invariata: categorie col conteggio, poi la coda (`cat=`) con Da vedere / Interessanti / Visti, stella, «Visto», persone espandibili ed esportazione PDF/Excel. Cambia solo dove sta: è un tab.

### 7.2 Piani e pagamenti
Dall'alto:

1. **Pannello di accensione** (7.3).
2. «Durante la beta», card con gli interruttori (`Toggle`):
   - «Mostra i piani», da `mostraPiani`. **Da sistemare:** oggi nessuna function scrive `mostraPiani` (si cambia a mano nella console Firebase) e i contratti di A1 non lo coprono. Serve una callable operatore, per esempio `impostaMostraPiani({ valore })` sul modello di `impostaTourBenvenuto`, che scriva nella radice di `config/globale`. La aggiunge B1; finché manca, l'interruttore è in sola lettura con la nota «Si cambia dalla console».;
   - «Prova gratis self-service» (`provaSelfService`), sottotitolo «Il titolare avvia da solo i 30 giorni di Plus»;
   - «Prezzi durante la beta» (`showPrezziInBeta`), sottotitolo «Se spento, le vetrine non mostrano il prezzo».
   - Interruttori ottimistici con rollback e toast di errore, come il Tour.
3. «Offerta early adopter»: `Segmented` it | en | es, area di testo (massimo 500) e «Salva» (`impostaConfigPiani({ offertaEarlyAdopter })`). La lingua senza testo mostra «Vuoto: si usa l'italiano». *Scelta di A2: il ripiego sull'italiano va confermato con B1/B3.*
4. «RevenueCat»:
   - campi «Chiave pubblica SDK» (placeholder `goog_…`) e «ID offering» (default `groomly_standard`);
   - «Salva»;
   - nota: «La chiave SDK è pubblica: va bene salvarla qui. I segreti restano nelle functions.»
5. «Annuncio pagamenti»: riga con icona `Megaphone`.
   - Prima dell'invio: sottotitolo «Avviso a tutti + email a ex beta ed early adopter. Gli abbonamenti si accendono almeno 15 giorni dopo». Tocco: dialogo con la data e la doppia conferma (`annunciaPagamenti`, fase 4).
   - Dopo l'invio: «Inviato il {data} · si può accendere dal {data+15}».

### 7.3 Pannello di accensione (dalla 5; componente `PannelloAccensione`, logica di B4)
- Riquadro scuro centrato:
  - icona `Power` in un cerchio, rosso finché è bloccato e verde quando è pronto;
  - «Abbonamenti spenti» oppure «Abbonamenti attivi»;
  - «N di 5 pronti. Il clic si sblocca con tutto verde.»;
  - cinque segmenti di avanzamento, verdi quando la voce è a posto.
- Card con le 5 verifiche. Ogni voce ha un cerchio 22 px (verde con spunta oppure rosso con ✕), un titolo e un dettaglio:
  1. Chiave SDK RevenueCat: «Presente» oppure «Manca: incollala qui sotto»;
  2. Offering con tutti i prodotti: «N di 6 pacchetti trovati», poi l'elenco dei mancanti;
  3. Webhook attivo: «Ultimo evento il {data}» oppure «Nessun evento ricevuto»;
  4. Annuncio inviato da almeno 15 giorni: «Inviato il {data}» / «Mancano N giorni» / «Non ancora inviato»;
  5. Ho Partita IVA e profilo pagamenti: casella da spuntare a mano; quando è spuntata mostra «Confermato il {data}».
- Pulsante a tutta larghezza «Accendi gli abbonamenti».
  - Disattivato, con il lucchetto, finché c'è un rosso.
  - Con tutto verde: primo dialogo «Accendere gli abbonamenti?», poi un secondo con la parola **ACCENDI** da scrivere, come Elimina.
- Da acceso: «Spegni gli abbonamenti» (`variant="bad"`), con un dialogo: «Si torna come in beta. Chi ha già pagato tiene il piano fino a scadenza.»

## 8. Etichetta BETA (comune ad admin e app)

Componente `EtichettaBeta({ piano })`:
- pillola alta 18 px, raggio 5, bordo 1.5 px del colore del piano, testo 10/800 con spaziatura `.08em`, icona `FlaskConical` 10 px, testo «BETA»;
- Plus: testo `--plus-ink` (chiaro `#5A2BC0`, scuro `#C9AEFF`) su `--plus-s` (`#F0E9FD` / `rgba(183,148,255,.15)`);
- Salone: testo `--sal-ink` (`#7A5600` / `#F2CC5E`) su `--sal-s` (`#FBF1D6` / `rgba(235,185,40,.14)`).

Sulle sfumature del piano (scheda «Il tuo piano», testata Abbonamento) si usa la variante piena: sfondo `rgba(255,255,255,.22)`, testo bianco, senza bordo.

Token nuovi in `tokens.css` (chiaro e scuro): `--plus-s`, `--plus-ink`, `--sal-s`, `--sal-ink`. Il contrasto va verificato a 4.5:1 nei test dei token.

## 9. App del salone (B3)

Vede l'invito **solo il titolare** (contratto A1). Socio e collaboratore vedono solo il piano attivo e il BETA.

### 9.1 Invito ricevuto
- **Avviso** nella pagina Avvisi, in cima finché l'invito è `invitato`:
  - card evidenziata (anello 2 px `--plus` / `--sal`), icona `FlaskConical` su `--plus-s`;
  - titolo «Hai un invito alla beta Plus»;
  - testo «Prova gratis per N giorni tutte le funzioni Plus. L'invito vale fino al {data}.»;
  - link «Apri l'invito ›»;
  - pallino rosso finché non è stato aperto. La campanella conta l'invito come avviso nuovo.
- **Card in Home** (dalla 1), sopra l'agenda di oggi, finché l'invito è `invitato`:
  - scheda con la sfumatura del piano (`#7B3FE4→#4F2BB8`; Salone `#8A6200→#5E4300`), raggio 14;
  - riga piccola maiuscola «🧪 INVITO BETA · SOLO PER TE»;
  - titolo «Prova Plus gratis per N giorni»;
  - testo «Roberto di Groomly ti invita a provare le funzioni Plus prima di tutti. Nessun pagamento, nessun rinnovo.»;
  - pulsanti: «Scopri l'invito» (bianco, testo viola) e «Più tardi» (bianco al 16%).
  - «Più tardi» nasconde la card per 3 giorni (salvato in locale); l'avviso resta.
- Email Brevo: la fa B1, nello stile Groomly, in it/en/es.

### 9.2 Pagina invito (`/impostazioni/beta`, a tutta pagina, sfumatura del piano come la Vetrina)
- Freccia indietro bianca in alto a sinistra (40 px, come `TestataPiano`).
- Testata centrata: icona tonda del piano (66 px), pillola «🧪 Beta su invito» (bianca al 20%, bordo bianco al 35%), scritta del piano (`groomly-plus-scritta-scura.svg` o salon), poi «Roberto ti invita a provare Plus **gratis per N giorni**».
- Se c'è un messaggio: riquadro bianco al 95% con testo `#2B1863`, tra virgolette.
- Lista delle funzioni del piano, come la Vetrina: riquadro bianco al 14%, cerchi bianchi con l'icona nel colore del piano.
- Lista delle garanzie, con la stessa forma ma sfondo nero al 14%:
  - «Gratis per N giorni, fino al {data}», dove la data è calcolata da oggi;
  - «Nessun pagamento, nessun rinnovo automatico»;
  - «In cambio: un feedback di 2 minuti»;
  - l'offerta early adopter (testo dalla config nella lingua dell'app; se è vuoto la riga non c'è);
  - «Alcune funzioni possono ancora cambiare».
- Piede fisso col colore scuro del piano:
  - casella bianca «Ho capito: è gratis, senza rinnovo, e lascerò un feedback». È obbligatoria e abilita Partecipo;
  - **Partecipo**: pulsante bianco tondo, alto 50, testo del colore del piano. Chiama `rispondiInvitoBeta({ accetta: true })`;
  - **No grazie**: link bianco sottolineato.
- Dopo Partecipo: toast «Ti diamo il benvenuto nella beta! Plus è attivo fino al {data}». La formula è senza genere. *Scelta di A2.* Poi si torna alla Home.
- **No grazie**: `Dialog` «Va bene, nessun problema» / «Ci dici perché? Ci aiuta a migliorare.».
  - Quattro scelte a radio, card alte 44: Non mi serve · È troppo complicato · Non pagherei per queste funzioni · Altro. Con «Altro» compare un campo (massimo 300).
  - Pulsanti «Indietro» e «Rifiuta l'invito», che chiama `rispondiInvitoBeta({ accetta: false, motivo, altro })`.
  - Il motivo è obbligatorio. *Scelta di A2*; i dati lo prevedono non nullo.
- Invito scaduto o revocato aprendo la pagina: messaggio «Questo invito non è più valido» e «Torna alla Home».

### 9.3 Durante la beta
- **Il tuo piano** (`SchedaAbbonamento`):
  - scheda con la sfumatura e il bollino come oggi;
  - riga 1 «Il tuo piano», riga 2 «Beta gratuita · fino al {data}»;
  - a destra l'etichetta BETA piena;
  - sotto, una barra dei giorni (6 px, bianca su bianco al 25%) con «N gg» a destra, dove N sono i giorni rimasti;
  - la scheda cresce in altezza, il testo non si taglia (regola di oggi).
- **Invia feedback beta**: riga sempre visibile in Impostazioni sotto «Il tuo piano», con anello viola, icona `MessageCircle`, sottotitolo «2 minuti · ci aiuta a decidere i prezzi». Resta anche per gli ex beta, finché la beta è finita da meno di 30 giorni. *Scelta di A2.*
- **Pagina Abbonamento**:
  - testata a sfumatura con icona, scritta e la pillola «🧪 BETA · N giorni»;
  - testo «Beta gratuita dal {inizio} al {fine}. Nessun rinnovo: poi torni a Go con tutti i tuoi dati.»;
  - barra dei giorni;
  - sotto, una card con «Invia feedback beta» e «Offerta fondatori», quest'ultima solo con `earlyAdopter` e testo in config;
  - poi l'elenco dei piani di oggi, dove Plus è segnato «Il tuo piano ora · in beta».
- **Promemoria** (avvisi, logica di B1): dopo 7 giorni «Com'è andata finora? 2 minuti per un parere»; a 7 giorni dalla fine e a 1 giorno dalla fine «La tua beta finisce il {data}».

### 9.4 Modulo feedback (a passi, `/impostazioni/beta/feedback`)
- Testata «Feedback beta» con il sottotitolo «Passo N di 4 · circa 1 minuto», poi una barra di avanzamento di 6 px con la sfumatura del piano.
- Passo 1, «Come ti trovi con Plus?»: cinque riquadri stella alti 42 px. Pieni: sfondo `#FDF3D6`, stella `#E3A008`.
- Passo 2, «Quali funzioni ti sono servite?»:
  - una riga per funzione del piano, con tre pulsanti Utile / Poco / No (48×32 px), che mappano `utile`, `poco-utile` e `non-usata`;
  - nessuna scelta preselezionata;
  - le funzioni senza risposta non si inviano.
- Passo 3, «Cosa non va?» e «Cosa manca?»: due aree di testo facoltative, massimo 1000.
- Passo 4, «Pagheresti per Plus?»: `Segmented` Sì | Forse | No.
  - Con Sì o Forse compare «Quanto al mese?»: quattro chip in griglia 2×2 (meno di 5 € · 5–10 € · 10–20 € · più di 20 €).
  - Poi la casella «Potete ricontattarmi per parlarne».
  - Pulsante finale «Invia feedback», con la sfumatura del piano.
- Piede di ogni passo: «Indietro» (secondario) e «Avanti» (sfumatura del piano). Avanti è disattivato al passo 1 senza voto e al passo 4 senza la risposta a «Pagheresti».
- Invio: `inviaFeedbackBeta({ …, fineBeta: false, versioneApp })`. Esito con il toast «Grazie! L'ho ricevuto.» e ritorno alla pagina di partenza. Oltre il limite di 5 al giorno, il messaggio di errore del server.

### 9.5 Domanda di fine beta (pagina, `/impostazioni/beta/fine`)
- Si apre una volta dall'avviso dell'ultimo giorno e dall'avviso di fine, ed è sempre raggiungibile da quegli avvisi.
- Card centrata:
  - icona `Hourglass` in un cerchio `--plus-s`;
  - titolo «La tua beta Plus finisce domani», oppure «La tua beta Plus è finita»;
  - testo «Da {giorno} torni a Go. I tuoi clienti, gli animali e gli appuntamenti restano tutti.»;
  - **«Vorresti continuare con Plus a pagamento?»**;
  - tre pulsanti a tutta larghezza: «Sì, appena si può» (sfumatura) · «Forse, dipende dal prezzo» · «No, mi basta Go» (secondari).
- Sotto la card c'è la scheda «Il tuo piano» con la barra quasi piena.
- La risposta apre il modulo feedback al passo 4 con «Pagheresti» già scelto (sì / forse / no) e `fineBeta: true`. Voto e funzioni restano da dare: se la persona chiude, non si invia niente. *Scelta di A2*, perché il contratto vuole il voto obbligatorio.
- Sotto i pulsanti, se c'è il testo early adopter: «Chi ha partecipato avrà il prezzo fondatori: {testo breve}».

### 9.6 Vetrine «In arrivo · Avvisami» (senza invito)
- Sono le vetrine di oggi (`Vetrina.tsx`). Sotto il claim compare la pillola «🕒 In arrivo» (bianca al 20%).
- Sopra il piede: «Gli abbonamenti non sono ancora aperti. Tocca Avvisami: ti scriviamo appena puoi attivarlo.»
- Nel piede, con `showPrezziInBeta` spento, «Prezzo annunciato all'apertura» al posto del prezzo.
- Pulsante bianco «🔔 Avvisami», che dopo il tocco diventa «✓ Ti avviseremo».
- Toast «Ti avviseremo appena disponibile» al posto del dialogo «In arrivo» di oggi.
- Sotto: «Nessun pagamento ora».
- La logica di `offertaPiano` e di `scriviInteresse` non cambia; la tocca solo A1.

## 10. Componenti

| Nuovo | Dove | Riusa |
|---|---|---|
| `AdminManagerPage` | `src/pages/` | `Header`, `ShellFrame` |
| `TabAdmin` (barra dei tab) | `src/components/admin/` | stile pillola; `tablist` |
| `PanoramicaAdmin`, `DaFareOggi` | `src/components/admin/` | `Card`, `Row`, `StatusPill`, `SectionTitle` |
| `ListaSaloni`, `BarraSelezione`, `DialogoInvitoBeta` | `src/components/admin/` | `SearchBar`, `FilterChip`, `Sheet`, `Segmented` |
| `SchedaSalone` (dettaglio) | `src/components/admin/` | la `Scheda` di oggi e i dialoghi di `UsersPage` |
| `FeedbackAdmin`, `RiepilogoFeedback` | `src/components/admin/` | esportazione dei Suggerimenti |
| `CodaSuggerimenti` | `src/components/admin/` | il codice di oggi, spostato |
| `PianiPagamenti`, `PannelloAccensione` | `src/components/admin/` | `Toggle`, `Dialog` |
| `EtichettaBeta`, `BarraGiorni` | `src/components/abbonamento/` | token `--plus-*`, `--sal-*` |
| `CardInvitoBeta`, `PaginaInvitoBeta`, `ModuloFeedbackBeta`, `FineBeta` | `src/components/beta/` e `src/pages/` | `TestataPiano`, `sfondoPiano`, `Dialog` |

Misure dell'app (`SIZES`): righe da 44 px, `pagePadX` 12, `sectionGap` 9, card con raggio 12, pulsanti da 44/48, chip da 44 di target. Colori solo da token, più le sfumature fisse dei piani di oggi (`COLORE_PIANO`, `BollinoPiano`).

## 11. Testi nuovi (italiano; B2/B3 fanno en/es)

Uso «Salone» (nome del piano) secondo la fase 5.1 di A3.

| Chiave suggerita | Testo |
|---|---|
| `adminManager` | Admin Manager |
| `amSoloOperatori` | Solo operatori |
| `amTabPanoramica` / `amTabSaloni` / `amTabBeta` / `amTabFeedback` / `amTabSuggerimenti` / `amTabPiani` | Panoramica / Saloni / Beta / Feedback / Suggerimenti / Piani |
| `amBeta` | Beta |
| `amInvitati` / `amInBeta` / `amPagherebbero` | Invitati / In beta / Pagherebbero |
| `amDaFare` / `amNienteDaFare` | Da fare oggi / Niente da fare oggi |
| `amInvitoScadeTra` | {{salone}} non ha risposto · L'invito scade tra {{n}} giorni |
| `amBetaFinisce` | {{salone}} finisce il {{data}} |
| `amNuovoFeedback` | Nuovo feedback da {{salone}} |
| `amAttivi7` / `amAttivi30` | Attivi a 7 giorni / Attivi a 30 giorni |
| `amAvvisami` | Avvisami |
| `amFiltroMaiInvitati` / `amFiltroChiusi` / `amFiltroInattivi` | Mai invitati / Chiusi / Inattivi |
| `amSelezionati` | {{n}} selezionati |
| `amBetaPlus` / `amBetaSalone` | Beta Plus / Beta Salone |
| `amInvitaTitolo` | Invita alla beta |
| `amPiano` / `amDurata` / `amAltro` / `amMessaggio` | Piano / Durata / Altro / Messaggio (facoltativo) |
| `amInvitaNota` | Il piano si accende solo quando accettano. L'invito scade dopo 14 giorni. Email e avviso in app partono subito. |
| `amInvia` | Invia {{n}} inviti |
| `amInvitiFatti` / `amSaltati` | {{n}} inviti inviati / {{n}} saltati |
| `amSaltoVip` / `amSaltoGia` / `amSaltoAttivo` / `amSaltoNonTrovato` | VIP · Già invitato · Piano attivo · Non trovato |
| `amPerche` | Perché: |
| `amEstendi` / `amRevoca` / `amRevocaInvito` | Estendi / Revoca / Revoca invito |
| `amEarly` / `amEarlyAiuto` | Early adopter / Avrà l'offerta fondatori |
| `amRevocaTesto` | {{salone}} torna a Go subito. I dati restano. Gli mandiamo un avviso. |
| `amNuovaFine` | Nuova fine: {{data}} |
| `amAzioni` / `amStorico` | Azioni / Storico |
| `amPagheresti` / `amQuantoMese` | Pagheresti? / Quanto al mese |
| `amFunzioniUso` | Utile · Poco utile · Non usata |
| `amEsporta` | Esporta PDF o Excel |
| `amMostraPiani` / `amProvaSelf` / `amPrezziBeta` | Mostra i piani / Prova gratis self-service / Prezzi durante la beta |
| `amOfferta` | Offerta early adopter |
| `amChiaveSdk` / `amOffering` | Chiave pubblica SDK / ID offering |
| `amAnnuncio` | Annuncio pagamenti |
| `amSpenti` / `amAttivi` | Abbonamenti spenti / Abbonamenti attivi |
| `amPronti` | {{n}} di 5 pronti. Il clic si sblocca con tutto verde. |
| `amAccendi` / `amSpegni` / `amParolaAccendi` | Accendi gli abbonamenti / Spegni gli abbonamenti / ACCENDI |
| `betaInvitoAvviso` | Hai un invito alla beta {{piano}} |
| `betaInvitoTesto` | Prova gratis per {{n}} giorni tutte le funzioni {{piano}}. L'invito vale fino al {{data}}. |
| `betaInvitoCardRiga` | Invito beta · solo per te |
| `betaInvitoCardTitolo` | Prova {{piano}} gratis per {{n}} giorni |
| `betaScopri` / `betaPiuTardi` | Scopri l'invito / Più tardi |
| `betaSuInvito` | Beta su invito |
| `betaTiInvita` | Roberto ti invita a provare {{piano}} gratis per {{n}} giorni |
| `betaGratisFino` / `betaNessunPagamento` / `betaInCambio` / `betaCambiano` | Gratis per {{n}} giorni, fino al {{data}} / Nessun pagamento, nessun rinnovo automatico / In cambio: un feedback di 2 minuti / Alcune funzioni possono ancora cambiare |
| `betaHoCapito` | Ho capito: è gratis, senza rinnovo, e lascerò un feedback. |
| `betaPartecipo` / `betaNoGrazie` | Partecipo / No grazie |
| `betaBenvenuto` | Ti diamo il benvenuto nella beta! {{piano}} è attivo fino al {{data}}. |
| `betaNoTitolo` / `betaNoPerche` | Va bene, nessun problema / Ci dici perché? Ci aiuta a migliorare. |
| `betaMotivoServe` / `betaMotivoComplicato` / `betaMotivoPagherei` / `betaMotivoAltro` | Non mi serve / È troppo complicato / Non pagherei per queste funzioni / Altro |
| `betaRifiuta` | Rifiuta l'invito |
| `betaNonValido` | Questo invito non è più valido |
| `betaGratuitaFino` | Beta gratuita · fino al {{data}} |
| `betaFeedbackRiga` / `betaFeedbackAiuto` | Invia feedback beta / 2 minuti · ci aiuta a decidere i prezzi |
| `betaPasso` | Passo {{n}} di 4 · circa 1 minuto |
| `betaComeTiTrovi` / `betaQualiFunzioni` / `betaNonVa` / `betaManca` | Come ti trovi con {{piano}}? / Quali funzioni ti sono servite? / Cosa non va? / Cosa manca? |
| `betaUtile` / `betaPoco` / `betaNo` | Utile / Poco / No |
| `betaPagheresti` / `betaQuanto` | Pagheresti per {{piano}}? / Quanto al mese? |
| `betaFascia1`…`4` | meno di 5 € / 5–10 € / 10–20 € / più di 20 € |
| `betaRicontatto` / `betaInvia` / `betaGrazie` | Potete ricontattarmi per parlarne / Invia feedback / Grazie! L'ho ricevuto. |
| `betaFineDomani` / `betaFinita` | La tua beta {{piano}} finisce domani / La tua beta {{piano}} è finita |
| `betaFineTesto` | Da {{giorno}} torni a Go. I tuoi clienti, gli animali e gli appuntamenti restano tutti. |
| `betaContinuare` | Vorresti continuare con {{piano}} a pagamento? |
| `betaSi` / `betaForse` / `betaNoGo` | Sì, appena si può / Forse, dipende dal prezzo / No, mi basta Go |
| `vetInArrivo` / `vetNonAperti` / `vetPrezzoApertura` / `vetTiAvviseremo` / `vetNessunPagamento` | In arrivo / Gli abbonamenti non sono ancora aperti. Tocca Avvisami: ti scriviamo appena puoi attivarlo. / Prezzo annunciato all'apertura / Ti avviseremo appena disponibile / Nessun pagamento ora |

## 12. Collaudo (per B2/B3)

- 360×640 e 400 px, tema chiaro e scuro. Nessun testo tagliato: va a capo, come la regola di oggi.
- Accessibilità:
  - tab con `aria-selected`;
  - caselle di selezione con `aria-checked` e il nome del salone;
  - interruttori con l'etichetta;
  - target di almeno 44 px.
- Tutte le funzioni di oggi provate dal nuovo Admin Manager: Tour, Attiva Plus/Salone, Regala 30 giorni, Torna a Go (anche da VIP e con testo obbligatorio), Elimina con ELIMINA, coda Suggerimenti ed esportazione.
- `/impostazioni/utenti` reindirizza.

## Lasciato al costruttore
- Nomi interni, forma dei test e ordine dei componenti dentro i file.
- Come mettere in cache `contatoriAdmin`.
- L'aspetto esatto della linea del tempo, purché leggibile.

## Scelte fatte da A2 senza Roberto
Sono annotate anche in `docs/DECISIONI-AUTOMATICHE.md`, sezione «A2 Proposte design»:
- nuovo percorso con reindirizzamento;
- filtri E/O;
- «Ricorda invito» escluso;
- feedback «non visti» in locale;
- motivo del rifiuto obbligatorio;
- «Più tardi» di 3 giorni;
- riga feedback per gli ex beta per 30 giorni;
- benvenuto senza genere;
- domanda finale collegata al passo 4 del modulo;
- ripiego dell'offerta sull'italiano;
- parola ACCENDI.
