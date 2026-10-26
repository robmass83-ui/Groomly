# Groomly — Piani, abbonamenti e Google Play Billing

| Funzione | Stato al 26/10/2026 |
| --- | --- |
| `mostraPiani` e `abbonamentiAttivi` | fatto: restano spenti |
| Paywall, prova 30 giorni, Avvisami | dietro flag |
| Team, posti, omaggio dell’operatore | fatto nel codice; il menu Pro resta dietro il flag |
| RevenueCat | dietro flag, senza pacchetto npm e senza acquisti |
| Play Billing scritto a mano | rimandato |
| Crediti messaggi e prezzi nel codice | rimandato |

> **Documento di specifica per Cursor + /superpowers**
> Versione 2.0 — 25 ottobre 2026 · allineata all'app **1.1.93** (ramo `pro-collaboratori`, commit `f8630c3`) e al **test 360°** del 25/10 (`docs/Groomly_Test360_RAPPORTO_2026-10-25.md`)
> Progetto: `D:\Groomly` · React 18 + Vite + Capacitor 8 (Android) · Firebase `groomly-3128b` (Blaze) · Cloud Functions `europe-west1` · Email Brevo
>
> Questo documento **sostituisce** la sezione S2 e i tetti messaggi di `docs/Groomly_Controlli_Avanzati_PIANO.md` e **adatta** `docs/superpowers/specs/2026-10-24-pro-collaboratori-design.md` (vedi §2). Tutto il resto di quei documenti resta valido.

---

---

## ⭐ LEGGI PRIMA: come Cursor deve usare questo documento

**Obiettivo:** con `/brainstorm` (superpowers) Cursor trasforma questo documento in **un unico piano completo dalla A alla Z**, e poi **lo esegue tutto, dall'inizio alla fine, senza fermarsi**, anche se è enorme e serve un giorno intero.

1. **Brainstorm**: leggi questo file, il rapporto del test 360° e i documenti citati in §2. Rileggi il codice reale del ramo indicato in §00. Fai domande **solo** se una decisione manca davvero (le decisioni prese sono in §1, §17 e nelle sezioni ✅). Poi scrivi:
   - `docs/superpowers/specs/2026-10-25-groomly-piani-completo-design.md`: specifica unica di tutto il lavoro;
   - `docs/superpowers/plans/2026-10-25-groomly-piani-completo.md`: piano unico con **tutte** le fasi di §16 in ordine, ogni fase divisa in passi piccoli (test prima, codice dopo, commit per passo).
2. **Esecuzione**: esegui il piano **per intero**, fase dopo fase, senza chiedere conferme intermedie. Fermati **solo** per: (a) una scelta irreversibile sui dati veri di produzione; (b) un passo che richiede Roberto (Play Console, Meta, DNS, commercialista). In quel caso: lascia una nota in `docs/DA-FARE-ROBERTO.md`, salta il passo e **continua** con il resto.
3. **Test 360° obbligatorio** (§19) **all'inizio** (fotografia di partenza) e **alla fine** (verifica). Il lavoro non è finito finché il test finale non è verde e il rapporto finale non è scritto in `docs/Groomly_Test360_RAPPORTO_FINALE.md`.
4. **Il salone di Laura non si tocca mai** (§19.1). Nessuno script del test o del piano scrive sul Firebase vero.
5. Alla fine: rami unificati, test verdi, build pulita, rapporto finale, `APP_VERSION` alzata **una volta sola** alla pubblicazione.

---

## 00. Stato attuale dell'app (25/10/2026) — cosa è cambiato rispetto alla v1 di questo piano

| Tema | Stato reale |
|---|---|
| Versione | **1.1.93**, ramo `pro-collaboratori` (pubblicato). `main` è fermo a 1.1.80 con modifiche non salvate; `scheda-nido` (1.1.88) non è unito. → **Fase 0.2** |
| Collaboratori | **Già fatti**: ruoli `titolare`/`socio`/`collaboratore`, `salons/{id}/members`, `invites/{token}`, callable `setSalonPro`, `createInvite`, `acceptInvite`, `revokeMember`, `changeMemberRole`, `assigneeUid`, "Chi lo fa", incassi filtrati per il collaboratore, pagina `/impostazioni/pro` (popup Invita, ruoli, revoca), route vietate al collaboratore (`StaffSettings`). Pro si accende **solo dall'operatore** (Utenti → interruttore "Servizio Pro"). Posti fissi `PRO_SEAT_LIMIT = 3`. |
| Salone di Laura | Spostato (spec `2026-10-24-allineamento-laura`) da `salon/shared` a **`salons/{uid di Laura}`**, Laura titolare, **Roberto socio con `accessWithoutPro: true`**, `pro/main.enabled = true`. `salon/shared` resta solo in lettura fino al secondo passaggio. Troddioni (`robmass83@gmail.com`) è un salone a parte, da non toccare. |
| Nome "Pro" | Nell'app di oggi "Piano Pro" significa **collaboratori**. Con questo piano: **Pro** = funzioni per un salone da solo, **Salone** = Pro + collaboratori. I testi "Piano Pro / Funzioni Pro" diventano "Il tuo piano" e "Team" (§5). |
| Regole Firestore | `pro` e `members` già protetti. **Falle F1, F3, F4** (rapporto §4) → **Fase 0.1**. |
| Test | 1.490 test verdi, ma le regole sono provate solo come testo (F9) e la suite dura 11 minuti (F10). |

### Mappa vecchio → nuovo (per non rompere niente)
- `salons/{id}/pro/main { enabled, seats, updatedAt }` **resta** e si **estende** con i campi di §7.1. `enabled` continua a esistere (lo leggono regole e app) ma diventa **derivato**: `true` solo con livello **Salone** attivo (o prova/omaggio Salone).
- `setSalonPro(salonId, enabled)` resta per compatibilità e chiama internamente `impostaPianoManuale` (`enabled: true` → Salone omaggio, `false` → Base).
- `PRO_SEAT_LIMIT` → `postiTotali(pro/main)` = `seatsIncluded + seatsExtra`.
- `accessWithoutPro` **resta** (serve a Roberto sul salone di Laura). Nella logica nuova vale come "accesso garantito anche a piano Base".
- Salone di Laura = `piano: "salone"`, `fonte: "omaggio"`, nessuna scadenza. Si scrive **solo** con la callable dell'operatore, mai con script automatici (§19.1).

---

## 0F. FASE 0 — obbligatoria, prima di tutto il resto

| Passo | Cosa | Perché |
|---|---|---|
| **0.1 Hotfix sicurezza** (pubblicare subito, anche prima del resto) | F1: `users/{uid}` leggibile solo dal proprietario. F3: elenco chiuso di raccolte scrivibili nel salone. F4: il collaboratore non modifica importo, pagamento, durata, stato e persona di una visita completata. M12: `isOperator()` con `email_verified`. **Test delle regole sull'emulatore** per ognuna. | Oggi chiunque abbia un account legge i vecchi dati di Laura. |
| **0.2 Un solo ramo** | Unire `pro-collaboratori` (1.1.93) in `main`. Decidere con i test cosa entra di `scheda-nido` (1.1.88) e delle modifiche non salvate su `main` (DogPage, NextAppointment, Notifiche, PhoneShell, schedaEnter): **non buttare niente** senza confronto. Poi chiudere i worktree vecchi (`D:\Groomly-worktrees\*`, `.worktrees\*`). | Evitare di perdere lavoro o ripubblicare codice vecchio. |
| **0.3 Repo privato** | Rendere privato il repo del codice. Spostare il controllo aggiornamenti su `hosting/release.json` (c'è già) o su un repo pubblico con sole release. Il canale APK resta (B-1). | Codice e regole oggi sono pubblici. |
| **0.4 Kit test 360°** | Portare `docs/test360-kit` nel progetto: `scripts/test360/`, `tests/e2e/`, `firebase.emu.json`, `.env.emu`, collegamento agli emulatori con `VITE_EMULATORS=1` **compatibile con i mock** (la patch del kit rompe 73 test di `client.test.ts`: importare le funzioni `connect*` solo quando il flag è attivo), script npm `test:rules`, `test:e2e`, `test:360`. | Serve per il test iniziale e per quello finale. |
| **0.5 Dati offline** | F2: un cane, un appuntamento o una chiusura creati offline **non devono mai perdersi** (scrivere prima, controllare dopo; letture dalla cache). Test e2e offline → online → ricarica. | Perdita di dati reale in negozio senza segnale. |
| **0.6 Usabilità urgente** | F5 (schermata "accesso sospeso"), F8 (scheletro di caricamento al posto del falso "€ 0"), M1, M2, M4, M7, M8, M9, M10, M11, M13. | Problemi visti usando l'app. |
| **0.7 Test più veloci** | F10: niente rete nei test, separare quelli lenti, obiettivo `npm test` sotto 4 minuti. | Ogni ciclo di Cursor oggi perde 11 minuti. |


## 0. Istruzioni per l'agente

1. Leggi questo documento per intero prima di scrivere codice. Poi rileggi `SettingsPage.tsx`, `HomePage.tsx`, `EarningsReportPage.tsx`, `components/earnings/ExportSheet.tsx`, `firestore.rules`, `functions/src/index.ts`, `lib/salonPath.ts` e la specifica dei collaboratori.
2. Il lavoro è diviso in **fasi (A → F)** e ogni fase in **piani /superpowers** numerati (§16). Un piano = una specifica in `docs/superpowers/specs` + un piano in `docs/superpowers/plans`, come fai già.
3. **Fase A, B e D si fanno subito. Fase C (Google Play Billing) si fa solo quando l'app è completa**: fino ad allora i piani si accendono a mano (omaggio/prova) e la pagina abbonamento mostra "In arrivo".
4. Ogni piano termina con: test verdi (`npm test`), `npm run build` pulito, verifica su telefono in chiaro e scuro, e la **regola R1** (con tutto spento l'app è identica a oggi per Laura).
5. Non cambiare `APP_VERSION` dentro una specifica: si alza solo alla pubblicazione, come da tua abitudine.

---

## 1. Decisioni prese (riassunto per chi legge di fretta)

| # | Decisione |
|---|---|
| D1 | Tre livelli: **Base** (gratis per sempre), **Pro**, **Salone** (= Pro + collaboratori). |
| D2 | Prezzi di lancio Italia, IVA inclusa: **Pro 14,99 €/mese o 149,90 €/anno**, **Salone 29,99 €/mese o 299,90 €/anno** con 3 collaboratori, **posto extra +4,99 €/mese**. (Prezzi da confermare: vedi A6 in §17.) Pacchetti crediti 100/300 solo in futuro, con il WhatsApp automatico. |
| D3 | Pagamenti **dentro l'app solo con Google Play Billing**, gestiti tramite **RevenueCat**. Stripe solo in futuro e solo per il web. |
| D4 | **Prova su richiesta (opt-in), decisa da Roberto il 24/10/2026**: ci si iscrive **in Base gratis**. A un certo punto l'app **propone** "Prova Pro gratis per 30 giorni" (§6.4). Si attiva con **un tocco, senza carta**, lato server, una volta sola per salone. Finita la prova si torna a Base senza perdere dati. Niente prova gratuita su Google Play (eviti la carta obbligatoria e il doppio periodo di prova). |
| D5 | Il **backup su Google Drive resta gratis** (manuale e automatico). Pro aggiunge la **cronologia di copie nel cloud con ripristino in un tocco**. |
| D6 | ⏸ *Rimandato insieme al WhatsApp automatico (§8).* **Crediti messaggi**: Pro 150/mese, Salone 400/mese. Promemoria/cane pronto/pagella = 1 credito; richiamo e compleanno (marketing) = **3 crediti**. Finiti i crediti l'app passa da sola al WhatsApp manuale gratuito. |
| D7 | Le funzioni Pro **si vedono nel punto in cui servono**, con un piccolo badge **PRO** e un lucchetto. Mai grigie "rotte", mai finestre a sorpresa all'avvio, mai bloccare un lavoro in corso. |
| D8 | Scadenza o disdetta: **nessun dato si cancella mai**. Le funzioni Pro si fermano, i dati restano e tornano al riabbonamento. |
| D9 | Il salone di Laura (`salons/{uid di Laura}`, ex `shared`) è **Salone omaggio per sempre** (`fonte: "omaggio"`), con Roberto socio `accessWithoutPro`. Nulla cambia per lei. |
| D10 | Unica fonte di verità del piano: documento **solo server** `salons/{salonId}/pro/main`. Il client non lo scrive mai. |

> ⚠️ *(Vale per la fase futura dei crediti.)* **Correzioni rispetto a quanto detto in chat:** i pacchetti crediti da 150 a 4,99 € andrebbero in perdita (netto ~3,48 € contro un costo Meta di ~3,72 €), quindi diventano 100 crediti a 4,99 €. I messaggi marketing pesano 3 crediti e non 2, perché in Italia un marketing costa a Meta ~2,3 volte un utility.

---

## 2. Cosa cambia rispetto ai documenti esistenti

| Documento | Cosa cambia |
|---|---|
| `Groomly_Controlli_Avanzati_PIANO.md` §R3 | Le funzioni Pro **non sono più nascoste**: si vedono con badge PRO quando `config/globale.mostraPiani == true`. Con il flag spento (oggi) restano nascoste come prima. |
| `Groomly_Controlli_Avanzati_PIANO.md` §S0.1 | *(fase futura)* `tettoMessaggiPro: 400` → `creditiPro: 150`; `tettoMessaggiSalone: 1000` → `creditiSalone: 400`. Il conteggio "messaggi" diventa conteggio "crediti" (§8). |
| `Groomly_Controlli_Avanzati_PIANO.md` §S6 e P1–P4 automatici | ⏸ **Rimandati** (§8). Quando si faranno: WhatsApp **dal numero del salone** con la procedura guidata "Collega il tuo WhatsApp" (§8.0c). Fino ad allora P2, P3, P4 e P7 funzionano solo in **modalità manuale** (WhatsApp con un tocco) e P1 diventa il promemoria **email** (M2, §8.0). |
| `Groomly_Controlli_Avanzati_PIANO.md` §S2 | **Sostituita** da §9 e §10 di questo documento (RevenueCat al posto della verifica Play fatta a mano). |
| `Groomly_Controlli_Avanzati_PIANO.md` "Controlli avanzati" | La schermata unica "Controlli avanzati" diventa **due sezioni per argomento**: *Messaggi ai clienti* e *Strumenti*. Vedi §5. Stesso contenuto, organizzato per lavoro e non per piano. |
| `specs/2026-10-24-pro-collaboratori-design.md` | I collaboratori diventano una funzione del livello **Salone**. Il meccanismo resta identico (inviti, ruoli, regole, `assigneeUid`) con queste differenze: (a) `pro/main.enabled` non è più un interruttore a mano ma è **derivato** dal piano (§7.2); (b) `PRO_SEAT_LIMIT = 3` diventa `seatsTotal(pro/main)` = `seatsIncluded + seatsExtra`; (c) la voce "Funzioni Pro" `/impostazioni/pro` diventa **"Team"** `/impostazioni/team`. **Se quel piano è già in esecuzione, finiscilo così com'è** e poi applica il piano 4 di §16, che fa solo questo adattamento. |

---

## 3. Regole d'oro (valgono in tutte le fasi)

| # | Regola |
|---|---|
| R1 | Con `config/globale.mostraPiani == false` e il salone in Base, **ogni schermata è identica a oggi**. |
| R2 | **Base non peggiora mai.** Nulla di ciò che oggi è gratis diventa a pagamento per chi lo usa già. Unica eccezione voluta: l'export PDF/Excel degli incassi per i **saloni nuovi** (§4). Laura ha il Salone omaggio, quindi per lei non cambia niente. |
| R3 | Il client **legge** il piano, il server lo **scrive**. Ogni controllo "può farlo?" che costa soldi (invio messaggi, posti, crediti) si ripete **lato server**. |
| R4 | Un solo modulo decide l'accesso: `src/lib/piano.ts` (§7). Nessun componente legge `pro/main` o confronta stringhe di piano. |
| R5 | I prezzi **non si scrivono mai nel codice**: arrivano da RevenueCat/Play già localizzati. Nel codice ci sono solo gli id prodotto. |
| R6 | Nessuna proposta di acquisto (paywall) parte da sola durante un lavoro: creazione appuntamento, Completato, Disdici, salvataggio scheda. Si apre solo al tocco su qualcosa di Pro, oppure nei momenti ammessi di §6.4. |
| R7 | Stile invariato ("Pulito e professionale", compatto, chiaro/scuro). Il badge PRO e la paywall usano i token esistenti (`--pri`, `--pri-s`, `--on-pri`, `--card`, `--tx2`, `--tx3`). |
| R8 | Testi nuovi in un dizionario (`src/i18n/it.ts`), mai sparsi nei componenti. Prepara l'estero senza riscrivere l'app (§14). |
| R9 | Nessun dominio `firebaseapp.com`/`cloudfunctions.net` visibile agli utenti (già regola R7 dei piani precedenti). |

---

## 4. Mappa completa delle funzioni per livello

Legenda **Visibilità in Base**: 🔒 = si vede con badge PRO e apre la paywall · 👁 = anteprima (si vede un esempio, non si usa) · 🚫 = non si vede finché non serve.

| Codice | Funzione | Base | Pro | Salone | Visibilità in Base | Stato oggi |
|---|---|:-:|:-:|:-:|:-:|---|
| — | Agenda, cani, appuntamenti, mensili, listino, chiusure, personali | ✅ | ✅ | ✅ | — | esiste |
| — | Foto prima/dopo, note, tag, storico prezzi | ✅ | ✅ | ✅ | — | esiste |
| — | Tile e pagina **Incassi** (giorno/settimana/mese) | ✅ | ✅ | ✅ | — | esiste |
| — | **Incassi e report** del mese corrente | ✅ | ✅ | ✅ | — | esiste |
| R1 | Report di **mesi e anni passati** + confronto | — | ✅ | ✅ | 🔒 sui periodi passati | esiste (diventa Pro per i nuovi) |
| R2 | **Esporta per il commercialista** PDF/Excel | — | ✅ | ✅ | 🔒 sul pulsante Esporta | esiste (diventa Pro per i nuovi) |
| B1 | Backup: Salva ora, giornaliero, Google Drive, file ZIP/Excel, Ripristina da file | ✅ | ✅ | ✅ | — | esiste |
| B2 | **Copie nel cloud**: 30 giorni di copie automatiche, ripristino in un tocco | — | ✅ | ✅ | 🔒 riga nel foglio Backup | nuovo |
| F1 | WhatsApp **manuale** con testo pronto | ✅ | ✅ | ✅ | — | da fare (piano Controlli avanzati) |
| F2 | Affidabilità cliente | ✅ | ✅ | ✅ | — | da fare |
| F3 | Note vocali | ✅ | ✅ | ✅ | — | da fare |
| M1 | Promemoria WhatsApp "Invia tutti" (un tocco) | ✅ | ✅ | ✅ | — | da fare (§8.0) |
| M2 | Promemoria **email automatici** con Confermo/Sposta | — | ✅ | ✅ | 🔒 nella sezione Messaggi | da fare (§8.0) |
| P1 | ⏸ Promemoria **WhatsApp automatico** | — | ✅ | ✅ | 🚫 finché non esiste | futuro (§8) |
| P2 | Richiamo clienti spariti (lista + WhatsApp con un tocco) | — | ✅ | ✅ | 🔒 + 👁 riquadro in Home (§6.4) | da fare |
| P3 | "Il tuo cane è pronto" con foto (WhatsApp con un tocco) | — | ✅ | ✅ | 🔒 nel foglio Completato | da fare |
| P4 | Auguri di compleanno (lista + WhatsApp con un tocco) | — | ✅ | ✅ | 🔒 | da fare |
| P5 | Pagella toelettatura | — | ✅ | ✅ | 👁 anteprima con dati veri | da fare |
| P6 | Prezzo suggerito cane nuovo | — | ✅ | ✅ | 🚫 (compare solo se ci sono ≥3 cani simili) poi 🔒 | da fare |
| P7 | Aumento listino con avviso | — | ✅ | ✅ | 🔒 in Listino › Gestione | da fare |
| P8 | Collage prima/dopo con logo | — | ✅ | ✅ | 👁 | da fare |
| E1 | Documenti senza scritta "Fatto con Groomly" (listino, pagella, collage) | — | ✅ | ✅ | piccola scritta in fondo ai PDF/immagini | nuovo, facoltativo |
| T1 | **Collaboratori** (3 inclusi) e "Chi lo fa" | — | — | ✅ | 🔒 voce Team | specifica pronta |
| T2 | Posti extra | — | — | ✅ | dentro Team | nuovo |
| T3 | Incassi per persona | — | — | ✅ | 🚫 | specifica pronta |
| H0 | Orari di apertura | ✅ | ✅ | ✅ | — | nuovo (§4b.0) |
| H1 | Pagina pubblica del salone (biglietto da visita) | ✅ | ✅ | ✅ | — | nuovo (§4b.1) |
| H2 | **Prenotazioni online** + email di conferma | — | ✅ | ✅ | 🔒 nella pagina e in Impostazioni | nuovo (§4b.1) |
| H3 | **Lista d'attesa** | — | ✅ | ✅ | 🔒 nel form appuntamento | nuovo (§4b.2) |
| H4 | **Recensioni Google** con un tocco | — | ✅ | ✅ | 🔒 dopo Completato (una volta) | nuovo (§4b.3) |
| H5 | Tessera fedeltà | — | ✅ | ✅ | 🔒 | nuovo (§4b.4) |
| H6 | Scheda del cane per il cliente | — | ✅ | ✅ | 🔒 | nuovo (§4b.5) |
| H7 | Statistiche clienti | — | ✅ | ✅ | 👁 card €/ora | nuovo (§4b.6) |
| C1 | ⏸ Crediti mensili inclusi | 0 | 150 | 400 | — | futuro, con P1 |
| C2 | ⏸ Ricariche crediti | — | ✅ | ✅ | — | futuro, con P1 |

**Perché queste scelte**
- **Si vende il risparmio di tempo, non il blocco dei dati.** L'agenda e le schede restano gratis: è ciò che fa usare l'app ogni giorno, e chi la usa ogni giorno è chi poi paga.
- **L'export per il commercialista è il motivo più forte per pagare** che hai già in mano: serve ogni mese, e il mese corrente resta visibile gratis così la toelettatrice capisce cosa ottiene.
- **"Più dispositivi" non si vende**: con Firestore la sincronizzazione c'è già per tutti. Venderla sarebbe disonesto, e un'app seria non lo fa.
- **E1 "Fatto con Groomly"** è il modello di Canva: chi riceve il listino o la pagella vede da dove arriva, ed è pubblicità gratuita. È facoltativo: decidi tu (§17).

---

## 4b. Le funzioni di punta del Pro (decise il 24/10/2026)

Messaggio del Pro: **"Groomly Pro: più clienti, meno buchi in agenda."** Il Pro deve **ripagarsi con un cliente in più al mese**. Le tre funzioni in testa alla paywall sono **Prenotazioni online · Lista d'attesa · Recensioni Google**. Poi, "e in più": tessera fedeltà, scheda del cane per il cliente, statistiche, export per il commercialista, copie nel cloud, promemoria email.

Tutte si possono fare **senza partita IVA e quasi senza costi** (Firebase che c'è già e Brevo gratuito). Gli invii al cliente restano email automatiche (Brevo) o WhatsApp con un tocco dal numero del salone.

### 4b.0 Prerequisito (Base): Orari di apertura
Non esiste ancora nell'app e serve a prenotazioni online, lista d'attesa e statistiche (€/ora).
- Impostazioni › Attività › **Orari di apertura**: per ogni giorno della settimana, chiuso oppure 1–2 fasce (es. 08:30–12:30, 15:00–19:00). Pulsante "Copia su tutti i giorni".
- Dati: `settings.business.orari: { lun: [{da:"08:30",a:"12:30"},{da:"15:00",a:"19:00"}], …, dom: [] }`. Default vuoto: niente cambia per chi non lo compila (R1).
- L'agenda può usarli per i limiti della griglia (facoltativo, piano separato).

### 4b.1 Pagina del salone (Base) + Prenotazioni online (Pro)

**Idea:** ogni salone ha una pagina pubblica `groomlyapp.it/{nome-salone}`, da mettere nella bio di Instagram, su Google Maps, nello stato WhatsApp e su un QR stampato in negozio.
- **Base (gratis)**: pagina "biglietto da visita": logo, nome, indirizzo con mappa, orari, listino (dal listino che c'è già), pulsanti **Chiama** e **Scrivi su WhatsApp**, in fondo "Gestito con Groomly". È pubblicità gratuita per Groomly ed è utile a tutte.
- **Pro**: sulla stessa pagina compare il pulsante **"Prenota online"**.

**Percorso del cliente** (nessun account, nessuna app, 5 schermate da telefono, in italiano semplice):
1. **Cosa** → scelta di uno o più servizi prenotabili. Mostra durata e, se il salone lo vuole, "da 35 €".
2. **Il tuo cane** → "È già venuto da noi?" Sì / No. Poi nome del cane, razza, taglia (piccola/media/grande, con esempi di razze sotto ogni taglia).
3. **Quando** → calendario delle prossime settimane con solo i giorni con posti liberi, poi gli orari liberi del giorno (calcolati dal server). Se nessun orario va bene: "Mettimi in lista d'attesa" (§4b.2).
4. **I tuoi dati** → nome, cellulare, **email (obbligatoria)**, note per la toelettatrice, spunta privacy obbligatoria, spunta facoltativa "voglio ricevere offerte" (= consenso marketing).
5. **Fatto** → "Richiesta inviata a iPelosetti! Ti arriverà un'email di conferma." Pulsante "Aggiungi al calendario" solo dopo la conferma.

**Email automatiche al cliente (Brevo, gratis, mittente `"{salone} via Groomly" <noreply@groomlyapp.it>`, reply-to = email del salone)**

| Quando | Email | Contenuto |
|---|---|---|
| Subito dopo l'invio | **Richiesta ricevuta** | riepilogo; "La toelettatrice ti confermerà a breve" |
| La toelettatrice preme **Accetta** | **Appuntamento confermato** | data, ora, servizi, prezzo indicativo (se attivo), indirizzo con link Maps, pulsante **Aggiungi al calendario** (allegato `.ics` + link Google Calendar), link **Gestisci o disdici** |
| La toelettatrice **propone un altro orario** | **Nuovo orario proposto** | orario proposto con pulsanti **Accetto** / **Non va bene** (link firmati) |
| La toelettatrice **rifiuta** | **Non è stato possibile** | messaggio del salone + "Prenota un altro giorno" |
| Il giorno prima | **Promemoria** (M2) | pulsanti **Confermo** / **Devo spostare** |
| Il cliente disdice dal link | **Disdetta ricevuta** | conferma + "Prenota di nuovo" |
| Richiesta non gestita in 48 h | **Richiesta scaduta** | "Il salone non ha potuto rispondere: chiamalo al …" |

Tutte nello stile delle email Groomly che ci sono già (logo, colori, pulsanti), con il **nome e il logo del salone in testa**. Link "non ricevere più email" in fondo. Template Brevo nuovi: 6–12. Con un tetto di 300 email al giorno in totale (piano gratuito), le email di conferma hanno **priorità** sui promemoria. Il contatore è in `config/globale.emailOggi`.

**Lato toelettatrice**
- **Notifica push** "Nuova prenotazione: Fido (barboncino, media) · mar 4 nov 10:30 · Bagno + taglio".
- **Home, in cima** (sopra "Oggi"): riquadro **"Richieste online (2)"**. Ogni riga ha i pulsanti **Accetta**, **Altro orario** e **Rifiuta**.
- **Accetta**: crea l'appuntamento. Se il cliente è già conosciuto, Groomly propone il cane trovato con il cellulare ("È Fido di Marco Rossi?") e lei conferma. Se è nuovo, usa il flusso esistente "appuntamento per cane nuovo" con i dati già compilati, che creano la scheda. Poi parte l'email di conferma e compare il pulsante facoltativo "Conferma anche su WhatsApp", con un tocco dal suo numero.
- **Altro orario**: apre il selettore di orario con i posti liberi e manda l'email "Nuovo orario proposto".
- **Rifiuta**: motivo veloce (completo / non trattiamo questa razza / altro) e messaggio facoltativo.
- **In agenda** le richieste in attesa occupano il posto con un **blocco tratteggiato** ("In attesa di conferma"), così nessuno prenota la stessa ora. Il posto resta bloccato per 48 h, poi si libera (con un promemoria push dopo 24 h).
- **Impostazioni › Prenotazioni online** (Pro):
  - interruttore, link della pagina, **QR** da stampare (PDF A5 con logo, riusa l'export del listino), pulsanti di condivisione (WhatsApp, Instagram, copia link);
  - **nome della pagina** (slug: minuscole, trattini, unico, controllato dal server);
  - modalità **"Da confermare"** (default) oppure **"Conferma automatica"**, solo per clienti già conosciuti;
  - **servizi prenotabili online**, scelti tra quelli attivi (es. niente "Dermatologico");
  - **preavviso minimo** (2 h / 12 h / 24 h / 48 h) e **massimo** (2 settimane / 1 / 2 / 3 mesi);
  - **orari prenotabili**: tutti gli orari di apertura oppure fasce più ristrette;
  - passo degli orari (15 / 30 min), **pausa tra un cane e l'altro** (0 / 10 / 15 / 30 min);
  - **massimo prenotazioni online al giorno**;
  - **accetta nuovi clienti** sì/no;
  - **mostra i prezzi** sì/no;
  - **messaggio sulla pagina** (es. "Per cani molto annodati chiamaci prima");
  - **disdetta dal link** consentita fino a N ore prima (default 24 h).

**Calcolo dei posti liberi** — `src/lib/disponibilita.ts`, logica pura usata **dal server** (le Functions importano già da `src/lib`, come `pushDue`), con test:
- Ingressi: orari di apertura (o fasce online), chiusure, appuntamenti `programmato`/`completato` (**non** disdetti/non venuti), appuntamenti personali, richieste in attesa non scadute, durata = somma delle durate dei servizi per la taglia scelta (`Service.durationMin[taglia]`) + pausa, passo, preavviso minimo e massimo, tetto giornaliero, capacità (1 postazione; con Salone, una per operatore attivo che fa quel servizio).
- Uscita: elenco di orari d'inizio per giorno.
- Fuso **Europe/Rome** con test sul cambio dell'ora legale (ultima domenica di marzo e di ottobre).
- Il cliente **non vede mai** chi altro ha appuntamento: il server restituisce solo gli orari.

**Architettura e sicurezza**
- **Dominio**: collegare `groomlyapp.it` (oggi su Hostinger) a **Firebase Hosting** come dominio personalizzato (record DNS). Nessun `firebaseapp.com` visibile (R9).
- **Pagina**: piccola web app separata in `hosting/salone/` (Vite, stesso stile, bundle leggero) con rewrite `/{slug}` → Cloud Function `paginaSalone` che restituisce l'HTML con i **meta Open Graph** (nome, logo, foto), così l'anteprima su WhatsApp e Instagram mostra il salone.
- La pagina **non legge Firestore**: parla solo con callable pubbliche: `saloneInfo(slug)`, `postiLiberi(slug, servizi, taglia, mese)`, `inviaRichiesta(...)`, `gestisciPrenotazione(token, azione)`.
- Profilo pubblico in `pubblici/{slug}` (solo server), aggiornato da un trigger quando cambiano impostazioni, listino od orari. Solo i dati pubblici: mai P. IVA o codice fiscale se il salone non lo sceglie.
- Richieste in `salons/{s}/richieste/{id}` (scritte solo dal server, lette da titolare/socio/collaboratore). Stati: `nuova`, `accettata`, `proposta`, `rifiutata`, `scaduta`, `disdetta`.
- **Anti-spam**: Firebase **App Check con reCAPTCHA** (invisibile) sulla pagina, limite per IP e per cellulare (riusa `rateLimit.ts`), al massimo 2 richieste aperte per cellulare per salone e 20 richieste aperte per salone, campo esca invisibile contro i bot. In modalità "Da confermare" uno spam al massimo blocca un orario, che si libera in 48 h.
- **Link firmati** (token da 32 byte, scadenza) per Gestisci/Accetto/Confermo, sulla stessa route `/azione` che esiste già.
- **GDPR**: informativa sulla pagina (il titolare del trattamento è il salone, Groomly è il responsabile), spunta privacy salvata con data e versione, richieste rifiutate o scadute cancellate dopo 90 giorni.
- **Scadenza del Pro**: la pagina resta (Base) ma senza "Prenota online". Le richieste già accettate restano normali appuntamenti.

### 4b.2 Lista d'attesa (Pro)
- **Si aggiunge da**: form appuntamento ("Nessun orario va bene → lista d'attesa"), scheda del cane, pagina di prenotazione online ("Mettimi in lista d'attesa").
- **Dati** `salons/{s}/attesa/{id}`: `dogId` (o dati del cliente online), servizi, durata, preferenze (giorni della settimana, mattina/pomeriggio), "entro il", stato (`attiva`, `fissata`, `scaduta`), creata il.
- **Quando si libera un posto** (Disdici, spostamento, richiesta scaduta, chiusura annullata): `postoLiberato(slot)` cerca chi ci sta (durata ≤ posto libero, preferenze compatibili, ordine di arrivo) e mostra una **notifica push** e un foglio: "Si è liberato **mar 10:30–12:00**. 3 in lista d'attesa possono venire:". Per ognuno ci sono **WhatsApp** (testo: "Ciao Marco, si è liberato un posto martedì alle 10:30 per Fido, ti va bene?") e **Fissa** (crea l'appuntamento e chiude la voce). Per i clienti online con email c'è "Manda email" con il pulsante "Lo prendo" (il primo che conferma vince, gli altri ricevono "Posto già preso").
- **Home**: riquadro "Lista d'attesa (4)" solo se c'è qualcuno e almeno un posto libero nei prossimi 7 giorni.
- **Base**: nel form appuntamento la voce "Lista d'attesa" con badge PRO.

### 4b.3 Recensioni Google con un tocco (Pro)
- **Impostazioni › Recensioni Google**: incolla il link "Chiedi recensioni" del Profilo dell'attività Google (`g.page/r/...`), con una guida di 3 schermate su dove trovarlo. Pulsante "Prova il link".
- **Dopo "Completato"** (e dopo l'eventuale "cane pronto"), un foglio leggero: "Chiedi a Marco una recensione su Google?" [WhatsApp] [Email] [Non ora] [Mai per questo cliente]. Testo modificabile: "Grazie per aver scelto {salone}! Se ti siamo piaciuti, una recensione ci aiuta tantissimo: {link}".
- **Regole**: al massimo una volta ogni 12 mesi per cliente, mai nella stessa visita in cui c'è stata una nota di problema, mai più di 5 proposte al giorno. Campo `contact.recensioneChiestaIl`.
- ⚠️ **Policy Google**: vietato offrire premi in cambio di recensioni e vietato chiedere la recensione **solo ai clienti contenti** (niente "Ti è piaciuto? Sì → Google, No → scrivici"). Si chiede a tutti allo stesso modo. Nel testo predefinito non mettere sconti.
- **Statistiche**: richieste inviate nel mese.

### 4b.4 Tessera fedeltà (Pro)
- **Impostazioni › Fedeltà**: interruttore, regola **"ogni N visite completate"** (default 10), **servizi che contano** (default tutti i principali), **premio** in testo libero (es. "Bagno in omaggio") con valore facoltativo in € (per gli incassi).
- **Per cane** (come il resto dell'app). Il timbro si mette **da solo** a ogni "Completato" valido, e si toglie se il Completato viene annullato.
- **Scheda cane**: riga "Fedeltà ●●●●●●●○○○ 7/10".
- **Alla chiusura della 10ª visita**: nel foglio Completato "Fido ha diritto al premio: Bagno in omaggio" [Usa ora] [La prossima volta]. Usare il premio porta a 0 € il servizio scelto, con la nota "Premio fedeltà" negli incassi e nell'export.
- **WhatsApp con un tocco** (facoltativo) a 9/10: "Fido è a un passo dal premio!"
- Dati: `dog.fedelta: { timbri: number, premiUsati: [{ data, appuntamentoId }] }`, ricalcolabile dagli appuntamenti (`ricalcolaFedelta`) per sicurezza.

### 4b.5 Scheda del cane per il cliente (Pro)
- **Scheda cane › "Condividi col cliente"** → link `groomlyapp.it/c/{token}` (token casuale da 32 byte, revocabile, rigenerabile), da mandare con WhatsApp con un tocco.
- La pagina (servita dalla stessa web app pubblica, letta tramite la callable `schedaCliente(token)`) mostra **solo ciò che la toelettatrice sceglie**: foto del cane, ultime visite (data e servizi), foto prima/dopo, pagelle (P5), prossimo appuntamento, tessera fedeltà, pulsanti **Prenota di nuovo** (se Pro con prenotazioni online) e **Scrivi al salone**. Mai note interne, mai "mordace" o tag, prezzi solo se scelto.
- Impostazioni predefinite in Impostazioni › Strumenti › Scheda per il cliente, modificabili per singolo cane.

### 4b.6 Statistiche (Pro, con anteprima in Base)
Nuova scheda **"Clienti"** in Incassi e report (`/incassi/statistiche`). Tutto calcolato sul telefono dai dati che ci sono già (`src/lib/statistiche.ts`, puro e testato), costo zero:
- **€ all'ora lavorata** per mese e per servizio (usa `actualDurationMin` della chiusura visita, oppure la durata prevista). È la statistica più utile per una toelettatrice: dice quali servizi rendono davvero.
- **Previsione di fine mese** = incassato + appuntamenti programmati (con il tasso storico di non venuti).
- **Clienti migliori** (12 mesi): incasso e numero di visite.
- **Clienti che si stanno perdendo**: oltre il loro intervallo abituale +50% e senza appuntamento futuro (stessa logica di P2), con WhatsApp con un tocco.
- **Nuovi clienti al mese** e da dove arrivano (prenotazione online / inseriti a mano).
- **Tasso di non venuti e disdette** al mese.
- **Base**: si vede la card "€ all'ora questo mese" con il valore vero, le altre card sono 🔒.

### 4b.7 Paywall aggiornata
Le tre righe in testa sono sempre:
1. **Prenotazioni online 24 ore su 24** — "I clienti prenotano da Instagram e Google, tu confermi con un tocco."
2. **Lista d'attesa** — "Quando qualcuno disdice, riempi il buco in un minuto."
3. **Recensioni Google** — "Più recensioni, più clienti nuovi."
Poi "e in più": fedeltà, scheda per il cliente, statistiche, export per il commercialista, copie nel cloud, promemoria email. La funzione toccata resta comunque la prima riga (§6.2).

---

## 5. Nuova organizzazione dei menu

### 5.1 Barra in basso
**Non cambia.** Ci sono già 6 voci (Home, Animali, Agenda, Mensili, Listino, Impostazioni): non aggiungere una scheda "Pro". Le app migliori non mettono l'abbonamento nella barra principale, perché la barra è per il lavoro.

### 5.2 Impostazioni: prima e dopo

```
OGGI                                   DOPO
────────────────────────────           ────────────────────────────────────────
[Groomly] Utenti (solo operatore)      [Groomly] Utenti (solo operatore)
Attività                               ┌──────────────────────────────────────┐
  Ragione sociale / Modifica           │ IL TUO PIANO  (card in evidenza)      │
  Incassi e report                     │ Base · "Prova Pro 30 giorni"  ›       │
Aspetto                                │ oppure Pro · si rinnova il 12 nov    ›│
  Tema                                 └──────────────────────────────────────┘
Dati                                   Attività
  Backup                                 Ragione sociale / Modifica
Personalizza                             Incassi e report
  Servizi e durate                     Clienti e messaggi                 ← nuova
  Tag dei cani                           Messaggi ai clienti        ›  (M1, M2, P2–P4)
  Archivio animali                       Affidabilità clienti       ⏻  (F2)
  Notifiche                            Team                               ← nuova
Groomly 1.1.80                           Collaboratori        [PRO SALONE] ›
Esci                                   Dati
                                         Backup               (con riga Copie nel cloud 🔒)
                                       Personalizza
                                         Servizi e durate · Tag · Archivio · Notifiche
                                         Strumenti                   ›  (F3, P5, P6, P8, E1)
                                       Aspetto
                                         Tema
                                       Account                            ← nuova
                                         Abbonamento e pagamenti     ›
                                         Privacy e termini           ›
                                         Elimina account             ›   (obbligo Play, §12)
                                       Groomly 1.1.x
                                       Esci
```

Regole:
- **Le sezioni nuove compaiono solo con `mostraPiani == true`**, tranne *Account › Elimina account* e *Privacy*, che servono per il Play Store anche in Base (§12).
- **Il collaboratore** (specifica collaboratori §6) non vede: card Il tuo piano, Team, Clienti e messaggi, Strumenti, Abbonamento. Vede Tema, Notifiche, Incassi filtrati, versione, Esci.
- **Il socio** vede tutto tranne il pulsante *Abbonati/Cambia piano*: paga solo il titolare, perché l'abbonamento è legato al suo account Google.

### 5.3 Nuove route

| Route | Pagina | Chi |
|---|---|---|
| `/impostazioni/piano` | Il tuo piano + paywall a pagina intera | titolare, socio (sola lettura) |
| `/impostazioni/messaggi` | Messaggi ai clienti (ex Controlli avanzati, parte messaggi) | titolare, socio |
| `/impostazioni/messaggi/:tipo` | Impostazioni e testo di un tipo di messaggio | titolare, socio |
| `/impostazioni/strumenti` | Note vocali, pagella, prezzo suggerito, collage, firma documenti | titolare, socio |
| `/impostazioni/team` | Collaboratori (ex `/impostazioni/pro` della specifica) | titolare, socio |
| `/impostazioni/crediti` | ⏸ futuro: storico crediti e ricariche | titolare, socio |
| `/impostazioni/account/elimina` | Eliminazione account | tutti |

La **paywall** non è una route: è un `Sheet` (`components/piano/PaywallSheet.tsx`) aperto da `apriPaywall(feature)`, così torna esattamente dove eri. `/impostazioni/piano` usa lo stesso contenuto a pagina intera.

---

## 6. Come si mostrano le funzioni Pro (UX)

### 6.1 Tre modi, e quando usarli

| Modo | Aspetto | Quando |
|---|---|---|
| **Badge PRO** | La voce ha aspetto **normale** (non grigio), con a destra la pillola `PRO` (sfondo `--pri-s`, testo `--pri`, 10 px, maiuscolo) e un lucchetto da 12 px. Tocco → paywall su quella funzione. | Voci di menu, pulsanti, chip (es. "Esporta", "Copie nel cloud", "Promemoria automatico"). |
| **Anteprima (👁)** | Si mostra il risultato vero con i dati del salone, con sopra la fascia "Disponibile con Pro" e il pulsante "Prova gratis". | Funzioni visive: pagella, collage, riquadro "Da richiamare". |
| **Nascosto (🚫)** | Non c'è. | Quando mostrarlo sarebbe rumore: "Chi lo fa" senza collaboratori, incassi per persona, prezzo suggerito senza dati. |

**Perché non il grigio:** un elemento grigio sembra rotto o disattivato per errore, e non dice cosa si ottiene. Il badge su una voce normale invita a toccare e spiega. È lo schema di Spotify, Notion, Canva e Google One.

**Toggle bloccati:** nelle liste con interruttori (Messaggi ai clienti), una funzione Pro in Base mostra al posto del toggle il pulsante compatto `PRO 🔒`. **Mai un toggle che si sposta e poi torna indietro.**

### 6.2 La paywall (sheet)

```
┌───────────────────────────────────────────┐
│  ▬▬                                       │
│  [icona sticker della funzione toccata]   │
│  Export per il commercialista             │  ← titolo = la funzione che hai toccato
│  Il mese in PDF o Excel, pronto da        │
│  mandare, con un tocco.                   │
│                                           │
│  [ Mensile │ Annuale −17% ]               │  ← Annuale preselezionato
│                                           │
│  ┌─ PRO ───────────────┐ ┌─ SALONE ─────┐ │
│  │ 149,90 € / anno     │ │ 299,90 €/anno │ │  ← prezzi da RevenueCat
│  │ = 12,49 € al mese   │ │ 3 collaborat. │ │
│  └─────────────────────┘ └───────────────┘ │
│  ✓ Prenotazioni online 24 ore su 24       │
│  ✓ Lista d'attesa che riempie i buchi     │
│  ✓ Recensioni Google con un tocco         │
│  ✓ Export per il commercialista PDF/Excel │
│  ✓ Fedeltà, statistiche, copie cloud …    │
│  [ Vedi tutto ▾ ]                         │
│                                           │
│  [      Abbonati a Pro      ]  (primario) │
│  Si rinnova ogni anno. Disdici quando     │
│  vuoi da Google Play.                     │
│  Ripristina acquisti · Termini · Privacy  │
└───────────────────────────────────────────┘
```

Regole:
- **La funzione toccata è sempre la prima riga**, con titolo e beneficio. Le altre seguono in ordine fisso.
- **Il piano suggerito è il più basso che sblocca la funzione** (Pro per l'export, Salone per Team).
- Se il salone **non ha mai provato** Pro: il pulsante primario è **"Prova gratis 30 giorni"** e sotto, più piccolo, "oppure abbonati subito".
- Se il salone è **in prova**: il pulsante dice "Continua con Pro dopo la prova" e sopra c'è "Ti restano N giorni di prova".
- Prezzo, periodo, rinnovo automatico e modo di disdire **sempre visibili senza scorrere** (lo chiede la policy abbonamenti di Google Play).
- Con `abbonamentiAttivi == false` (oggi): resta **"Prova gratis 30 giorni"** se non è mai stata usata; al posto dei prezzi "Abbonamenti in arrivo" e il pulsante **"Avvisami"**, che salva `salons/{id}/interesse/{feature}` (lista d'attesa, utile per capire cosa interessa davvero).
- Nessun conto alla rovescia finto, nessun "solo oggi", nessuna X nascosta. La chiusura sta in alto a destra come in tutti gli `Sheet` dell'app.

### 6.3 Card "Il tuo piano" (in cima a Impostazioni)

| Stato | Testo | Azione |
|---|---|---|
| Base, mai provato | **Groomly Base** · "Prova Pro gratis per 30 giorni" | apre la paywall con il pulsante primario **"Prova gratis 30 giorni"** → `avviaProva` (sempre, anche con `abbonamentiAttivi == false`) |
| Base, prova già usata | **Groomly Base** · "Passa a Pro" | paywall con i prezzi (o "In arrivo") |
| Prova attiva | **Pro in prova** · "Ancora 12 giorni" | `/impostazioni/piano` |
| Pro / Salone attivo | **Pro** · "Si rinnova il 12 nov" | `/impostazioni/piano` |
| Disdetto ma ancora valido | **Pro fino al 12 nov** · "Non si rinnoverà" | "Riattiva" |
| Periodo di grazia (pagamento fallito) | fascia arancione: "Pagamento non riuscito. Aggiorna il metodo su Google Play entro il 19 nov" | apre Play › Abbonamenti |
| Sospeso (account hold) | fascia rossa: "Pro in pausa: pagamento non riuscito" | apre Play |
| Omaggio | **Salone** · "Offerto da Groomly" | — |

La stessa fascia di grazia/sospensione compare **una volta al giorno** anche in Home come `Notice` (il componente esiste già), sotto "Completa l'attività".

### 6.4 Quando l'app può proporre Pro da sola

Massimo **una proposta ogni 7 giorni**, salvata in `settings.ui.ultimaProposta` (per salone, così un cambio di telefono non la ripete). Mai prima di **7 giorni di uso** (`settings.createdAt`). Momenti ammessi:

| Momento | Messaggio (con dati veri) | Dove |
|---|---|---|
| **Benvenuto** (subito dopo la registrazione e il primo cane) | Nessuna proposta: prima deve usare l'app. Solo la card "Prova Pro gratis per 30 giorni" in cima a Impostazioni, sempre visibile. | Impostazioni |
| **Proposta della prova** (dopo 7 giorni di uso **e** almeno 10 appuntamenti, oppure al primo tocco su una funzione Pro) | "Ti piace Groomly? Prova gratis tutte le funzioni Pro per 30 giorni. Nessuna carta, nessun impegno." [Prova gratis] [Non ora] | Notice in Home o paywall con pulsante "Prova gratis 30 giorni" |
| Promemoria della prova (se ha detto "Non ora") | Ripropone una sola volta dopo 21 giorni, poi resta solo la card in Impostazioni | Notice in Home |
| 3 giorni prima della fine della prova | "La prova Pro finisce lunedì. Questo mese hai esportato 1 report e mandato 12 promemoria email." (numeri veri) | Notice in Home |
| Fine prova | "La prova è finita. I tuoi dati restano tutti qui." + "Vedi i piani" | Notice in Home, una volta |
| Dopo il 3° "Non venuto" del mese | "3 clienti non sono venuti questo mese. Con i promemoria email confermano il giorno prima." | Notice in Home |
| Dal 1° al 5 del mese, aprendo Incassi e report | "Devi mandare il mese al commercialista? Con Pro lo esporti in PDF o Excel." | fascia in cima al report |
| Riquadro "Da richiamare" (P2, anteprima) | "4 clienti non vengono da più del solito" + solo i nomi, il pulsante WhatsApp è 🔒 | Home, sotto Mensili, chiudibile per 30 giorni |

Ogni proposta ha **"Non ora"**, e chiuderla conta come proposta fatta.

### 6.5 Cosa succede alla scadenza (downgrade)

| Cosa | Comportamento |
|---|---|
| Promemoria email automatici | Non partono più. I clienti tornano nella coda "Invia tutti" (M1), che è gratis. |
| Pagelle e collage già fatti | Restano visibili nello storico, si possono riaprire e condividere. Non se ne creano di nuovi. |
| Copie nel cloud | Si conservano per 30 giorni dalla scadenza, poi la funzione server le cancella (dopo un avviso in app e via email 7 giorni prima). Il backup Drive gratuito resta. |
| Collaboratori (Salone → Pro o Base) | Accesso **sospeso**, non revocato (specifica collaboratori, decisione 5). Al ritorno di Salone rientrano. |
| Crediti ricaricati *(futuro)* | Restano, validi 12 mesi dall'acquisto, e si usano al prossimo abbonamento. |
| Report passati ed export | Tornano 🔒. I dati degli incassi restano tutti. |

---

## 7. Modello dati e modulo `piano.ts`

### 7.1 Documenti Firestore

```
config/globale                                      (solo admin/server)
  mostraPiani: false            // true = badge PRO, card piano, sezioni nuove
  abbonamentiAttivi: false      // true = acquisti veri via RevenueCat
  whatsappAutoAttivo: false     // invariato dal piano Controlli avanzati (futuro)
  canaleAuto: "email"           // unico canale automatico per ora
  emailOggi: { data: "2026-11-02", inviate: 0, limite: 300 }  // tetto Brevo gratuito, scritto solo dal server
  provaGiorni: 30
  // --- campi futuri (crediti, solo con il WhatsApp automatico) ---
  creditiPro: 150
  creditiSalone: 400
  creditiProva: 50              // crediti inclusi durante la prova
  pesoCrediti: { utility: 1, marketing: 3 }
  postiInclusiSalone: 3
  postiMax: 8
  versioneMinimaApp: "1.2.0"

salons/{salonId}/pro/main                           (solo server)   ← esiste già nella specifica collaboratori
  enabled: boolean              // DERIVATO: true se piano != "base" e stato in [attivo, prova, grazia]
  piano: "base" | "pro" | "salone"
  stato: "attivo" | "prova" | "grazia" | "sospeso" | "disdetto" | "scaduto"
  fonte: "play" | "prova" | "omaggio" | "manuale"
  periodo: "mensile" | "annuale" | null
  scadeIl: string ISO | null    // fine periodo pagato o fine prova
  graziaFinoAl: string ISO | null
  rinnovoAutomatico: boolean
  seatsIncluded: number         // 0 per pro, 3 per salone
  seatsExtra: number            // posti comprati in più
  provaUsata: boolean           // la prova si fa una volta sola per salone
  provaIniziataIl: string ISO | null
  productId: string | null      // es. "groomly_salone"
  basePlanId: string | null     // es. "mensile-4"
  rcAppUserId: string | null    // = salonId
  aggiornatoIl: string ISO
  seats: number                 // COMPAT specifica collaboratori: = seatsIncluded + seatsExtra

salons/{salonId}/crediti/main                       (solo server, FUTURO)
  mese: "2026-11"               // mese Europe/Rome in corso
  inclusi: 150                  // assegnati nel mese
  usatiInclusi: 87
  ricaricati: [ { id, crediti: 100, restanti: 100, acquistatoIl, scadeIl } ]
  aggiornatoIl

salons/{salonId}/movimentiCrediti/{id}              (solo server, storico, FUTURO)
  tipo: "assegnazione" | "consumo" | "ricarica" | "rimborso" | "scadenza"
  crediti: number (+/-)
  messaggioId?: string, categoria?: "utility" | "marketing"
  creatoIl

salons/{salonId}/interesse/{featureKey}             (client crea, solo titolare/socio)
  creatoIl, uid

salons/{salonId}/copieCloud/{yyyy-mm-dd}            (solo server, Pro)
  path (Cloud Storage), byte, cani, appuntamenti, creatoIl

rcEventi/{eventId}                                  (solo server, idempotenza webhook)
```

**Security Rules** (da aggiungere, con test in `src/lib/firestoreRules.test.ts`):
- `config/globale`: read per `signedIn()`, write `false`.
- `salons/{s}/pro/main`, `crediti/main`, `movimentiCrediti/*`, `copieCloud/*`: read per chi usa il salone (titolare, socio; il collaboratore legge solo `pro/main`), write `false`.
- `salons/{s}/interesse/{k}`: create per titolare/socio, nessun update/delete.
- `rcEventi/*`: tutto `false`.
- **Attenzione:** la regola generica `match /salons/{salonId}/{kind}/{id}` oggi permette al titolare di scrivere ogni `kind` tranne `files`. **Va ristretta** escludendo `pro`, `crediti`, `movimentiCrediti`, `copieCloud`, `members`, `messaggi`, `whatsapp`, altrimenti il titolare può darsi Pro da solo dalla console. È il bug di sicurezza più importante di tutto il lavoro: test obbligatorio "il titolare non scrive `pro/main`".

### 7.2 `src/lib/piano.ts` (logica pura, testata)

```ts
export type Livello = 'base' | 'pro' | 'salone'
export type FeatureKey =
  | 'reportPassati' | 'export' | 'copieCloud'
  | 'promemoriaAuto' | 'richiamo' | 'pronto' | 'compleanno'
  | 'pagella' | 'prezzoSuggerito' | 'aumentoListino' | 'collage' | 'senzaFirma'
  | 'team' | 'postiExtra'

export const FEATURES: Record<FeatureKey, {
  livello: Livello
  vista: 'badge' | 'anteprima' | 'nascosta'
  titolo: string            // chiave i18n
  beneficio: string         // chiave i18n, una riga per la paywall
  icona: string             // sticker esistente o nuovo
}> = { /* tabella §4 */ }

export interface StatoPiano {
  livello: Livello           // livello EFFETTIVO (tiene conto di stato e scadenza)
  stato: ProMain['stato']
  fonte: ProMain['fonte']
  scadeIl: Date | null
  inProva: boolean
  giorniProva: number | null
  posti: number              // seatsIncluded + seatsExtra
}

export function statoPiano(doc: ProMain | undefined, adesso: Date): StatoPiano
// - doc assente → base
// - stato 'attivo' | 'prova' | 'grazia' | 'disdetto' con scadeIl > adesso → livello del doc
// - 'sospeso' | 'scaduto' o scadeIl passata → base
// - tolleranza offline: se l'ultimo dato letto ha scadeIl passata da meno di 72 h e il
//   telefono è offline, mantieni il livello (eviti blocchi in negozio senza rete)

export function haAccesso(stato: StatoPiano, f: FeatureKey): boolean    // salone ⊇ pro ⊇ base
export function livelloMinimo(f: FeatureKey): Livello
export function mostraBadge(cfg: ConfigGlobale, stato: StatoPiano, f: FeatureKey): boolean
// false se !cfg.mostraPiani (R1), false se haAccesso, altrimenti FEATURES[f].vista === 'badge'
export function costoCrediti(categoria: 'utility' | 'marketing', cfg: ConfigGlobale): number   // futuro
export function creditiDisponibili(c: CreditiMain, adesso: Date): { inclusi: number; ricaricati: number; totale: number }
export function puoProporre(ui: { ultimaProposta?: string }, creatoIl: Date, adesso: Date): boolean // §6.4
```

**Hook e componenti** (`src/hooks/usePiano.tsx`, `src/components/piano/`):
- `usePiano()` → `{ stato, config, haAccesso(f), apriPaywall(f) }`, in ascolto su `pro/main` e `config/globale` (più avanti anche `crediti/main`) (`onSnapshot`, già in cache offline).
- `<ProGate feature="export" fallback="badge">…</ProGate>`: rende i figli se c'è accesso, altrimenti il badge, l'anteprima o niente secondo §4.
- `<ProBadge livello="pro" />`, `<PaywallSheet />`, `<PianoCard />` (`<CreditiMeter />` solo in futuro).
- **Test**: tabella completa `livello × stato × scadenza × offline × feature` (almeno 40 casi), più `mostraBadge` con `mostraPiani` falso (R1).

### 7.3 Compatibilità con la specifica collaboratori
- `pro/main.enabled` resta e le regole Firestore della specifica continuano a leggerlo. La Cloud Function che scrive il piano (§9.4) lo calcola: `enabled = livello === 'salone' && stato ∈ {attivo, prova, grazia, disdetto non scaduto}`. **Solo Salone accende i collaboratori.**
- `seats` = `seatsIncluded + seatsExtra`. `PRO_SEAT_LIMIT` diventa la funzione `postiTotali(proMain)`.
- `setSalonPro` (callable per l'operatore) resta per compatibilità e chiama `impostaPianoManuale({ salonId, piano, fonte: 'omaggio' | 'manuale', scadeIl? })`: stessa protezione (solo operatore, mai `shared`). Il salone di Laura (`salons/{uid di Laura}`) si imposta a Salone omaggio **una volta, a mano dall'operatore**, mai con script automatici.

---

## 8. Crediti messaggi

> ⏸ **RIMANDATO (decisione di Roberto, 24/10/2026).** Il WhatsApp automatico (W1/W3, §8.0b–8.4) e quindi tutto il sistema crediti (§8.1–8.3, prodotti `crediti_100`/`crediti_300`, piano 6) **non si fanno ora**. Si fanno solo quando ci saranno abbonati Pro e ricavi in crescita (servono partita IVA e verifica Meta).
> **Si fanno ora:** M1 "Invia tutti" (Base) e M2 promemoria email automatici (Pro), §8.0. Nel Pro di lancio non compaiono crediti né contatori: il Pro vale per **prenotazioni online, lista d'attesa e recensioni Google** (§4b), più fedeltà, scheda per il cliente, statistiche, export, report passati, copie nel cloud, promemoria email, pagella, collage, prezzo suggerito e aumento listino.
> Il codice deve comunque restare pronto ad aggiungere i canali: `config/globale.canaleAuto` esiste con il solo valore `"email"`.

### 8.1 Regole
- **Assegnazione**: il 1° di ogni mese (Europe/Rome) una funzione schedulata imposta `inclusi` secondo il piano (`creditiPro`, `creditiSalone`, `creditiProva`). I crediti inclusi **non si accumulano** da un mese all'altro.
- **Consumo**: prima gli inclusi, poi le ricariche, dalla più vecchia (FIFO). Si scalano **solo all'invio riuscito** (stato Meta `sent`). Se Meta fallisce → `rimborso`.
- **Peso**: utility = 1 (promemoria, cane pronto, pagella, variazione prezzo), marketing = 3 (richiamo, compleanno). Se Meta riclassifica un template come marketing, il peso segue la categoria che Meta restituisce.
- **Finiti i crediti**: nessun blocco. L'invio passa alla coda manuale (F1) con la fascia "Crediti finiti: i messaggi di oggi sono pronti da inviare a mano" e il pulsante "Ricarica".
- **Avvisi**: all'80% una notifica push e un chip arancione nel contatore; al 100% una notifica.
- **Ricariche**: valide 12 mesi, poi `scadenza`.
- **Tutto lato server, in transazione Firestore**, con idempotenza sull'id del messaggio. Il client mostra soltanto.

### 8.2 UI
- `CreditiMeter`: "87 / 150 crediti · +100 ricaricati" con barra sottile, in card Il tuo piano, in Messaggi ai clienti e in `/impostazioni/crediti`.
- `/impostazioni/crediti`: elenco movimenti del mese (giorno, tipo, cane, −1/−3), pulsanti "Ricarica 100" e "Ricarica 300" (prezzi da store).
- Nel foglio "Invia promemoria" automatico: "Costa 1 credito" in piccolo. Per richiamo/compleanno: "Costa 3 crediti".

### 8.3 Margini con i numeri attuali (da riverificare all'attivazione)
Netto per te = prezzo ÷ 1,22 (IVA) × 0,85 (Google). Costo Meta Italia: utility ≈ 0,0248 €, marketing ≈ 0,0572 €.

| Prodotto | Prezzo | Netto | Costo massimo | Margine minimo |
|---|---|---|---|---|
| Pro mensile (150 utility) | 14,99 € | 10,44 € | 3,72 € + Firebase ~0,5 € | **~6,2 €** |
| Salone mensile (400 utility) | 29,99 € | 20,89 € | 9,92 € + ~1 € | **~10 €** |
| Posto extra | 4,99 € | 3,48 € | ~0,3 € | **~3,2 €** |
| 100 crediti | 4,99 € | 3,48 € | 2,48 € | **~1,0 €** |
| 300 crediti | 11,99 € | 8,35 € | 7,44 € | **~0,9 €** |

Le ricariche **non sono un guadagno**: servono a non lasciare il cliente senza promemoria. Il guadagno è l'abbonamento. Se Meta cambia i prezzi, si cambiano solo `pesoCrediti` e `crediti*` in `config/globale`, senza pubblicare una nuova versione.

> Da ottobre 2026 Meta fa pagare anche i messaggi di servizio (risposte nella finestra di 24 ore) inviati via API. Le risposte che la toelettatrice scrive dall'app WhatsApp Business (coexistence) **non passano dall'API**: verificalo nel listino Meta prima di accendere `whatsappAutoAttivo`.

### 8.0 Promemoria: cosa si fa ADESSO (decisione 24/10/2026)

Roberto non ha ancora la partita IVA. Fino ai primi saloni paganti si fanno **solo questi due canali**, senza costi e senza iscrizioni per nessuno:

**M1 — WhatsApp manuale "Invia tutti" (Base, gratis)** — estende F1 del piano Controlli avanzati.
- Home, riquadro **"Da avvisare · domani (6)"** (dalle 14:00 del giorno prima, orario impostabile) con il pulsante primario **"Invia tutti"**.
- "Invia tutti" apre una **coda**: si apre WhatsApp sulla chat del primo cliente con il testo pronto. Al ritorno in Groomly (evento `App.resume` di Capacitor) compare un foglio piccolo "Inviato a Marco? [Sì, avanti] [Salta]" e poi si apre da solo il cliente successivo. In fondo: "Fatto: 6 avvisati ✓".
- Ogni riga segnata "Avvisato ✓" (persistente, sincronizzata). La coda riparte da dove si era fermata.
- Il messaggio parte dal numero del salone: nessun costo, nessun account, nessuna API.
- Notifica push alle 18:00 (impostabile): "6 clienti da avvisare per domani", tocco → coda.

**M2 — Promemoria via email automatici (Pro, durante il pilota in omaggio)**
- Se il cliente ha un'email nella scheda (campo nuovo facoltativo `contact.email`, visibile solo con M2 attivo), una Cloud Function schedulata la sera prima manda il promemoria via **Brevo** (template in stile Groomly, mittente `"{salone} via Groomly" <noreply@groomlyapp.it>`, *reply-to* = email del salone se presente).
- Pulsanti **Confermo** / **Devo spostare** = link firmati verso `groomlyapp.it/azione?t=…` (riusa la route `/azione` già su Hosting): aggiornano `statoConferma` dell'appuntamento e mandano una push alla toelettatrice.
- Link "Non ricevere più promemoria" → `optOut` email.
- Nella coda M1 i clienti già raggiunti via email compaiono come "Email inviata ✓", così la toelettatrice manda WhatsApp solo a chi non ha l'email.
- Limite: il piano gratuito Brevo ha **300 email al giorno in tutto** (tutti i saloni insieme). Contatore globale in `config/globale.emailOggi`. Oltre il limite le email non partono e quei clienti restano nella coda M1. Quando serve, un piano Brevo a pagamento.
- Costo per Roberto: 0 €.

---

### 8.0b WhatsApp automatico: valutazione dei canali (da decidere più avanti)

Criteri: **semplicità per la toelettatrice**, **semplicità per Roberto**, costo, rischio, partita IVA necessaria, "il messaggio arriva dal salone?".

| # | Canale | Cosa fa la toelettatrice | Cosa fa Roberto | Costo per messaggio (IT) | Rischio | P.IVA | Mittente |
|---|---|---|---|---|---|---|---|
| W1 | **Numero unico Groomly, Meta Cloud API diretta** | niente (un interruttore) | account Meta, SIM dedicata, template, webhook | ~0,025 € (utility) | basso, ufficiale | **no per il pilota** (limite 250 conversazioni/giorno senza verifica), sì per vendere | "Groomly" con il nome del salone nel testo |
| W2 | Numero unico Groomly **via Twilio** | niente | account Twilio (guidato, assistenza), template | ~0,025 € + 0,005 $ Twilio | basso | come W1 | come W1 |
| W3 | Numero **del salone**, Groomly paga (Twilio/partner come ISV, Embedded Signup) | passare a WhatsApp Business, login Facebook, QR (10–15 min), **niente carta** | programma ISV del partner, onboarding, assistenza ai saloni | ~0,025 € + fee partner | medio (coexistence: liste broadcast spente, PC scollegato) | sì | il salone ✓ |
| W4 | Numero del salone, il salone paga Meta | come W3 **più la carta su Meta** | come W3 | ~0,025 € pagati dal salone | medio | sì | il salone ✓ |
| W5 | API **non ufficiali** con QR "tipo WhatsApp Web" (es. Whapi, Green-API) | solo un QR | un servizio a canone | 10–40 €/mese **per salone** | **alto**: violano i Termini di WhatsApp, il numero del salone può essere bloccato | no | il salone |
| W6 | **SMS** (Brevo SMS / Twilio) con mittente = nome del salone | niente | account SMS; in Italia il mittente alfanumerico va registrato (verificare la procedura AGCOM) | ~0,05–0,08 € | basso | sì per vendere | il nome del salone ✓ |

**Valutazione**
- **W5 è escluso**: semplicissimo, ma mette a rischio il numero di lavoro della toelettatrice. Un prodotto serio non può farlo.
- **W4 è escluso**: troppi passaggi (carta su Meta).
- **W1 è il candidato per il pilota**: zero passi per la toelettatrice, nessuna partita IVA finché è in omaggio, costo minimo (5 saloni × 150 promemoria ≈ 19 €/mese). Se la registrazione Meta diretta risulta complicata, **W2** fa la stessa cosa con un'interfaccia più guidata.
- **W3** è il "livello premium" futuro per chi vuole i messaggi dal proprio numero: ha senso solo con molti saloni paganti.
- **W6** è il piano B universale (arriva a tutti, anche a chi non ha WhatsApp), ma costa 2–3 volte tanto.

**Da misurare nel pilota W1 prima di decidere:** % di clienti che premono Confermo, segnalazioni spam/blocchi (qualità del numero su Meta), quante toelettatrici preferirebbero il proprio numero, costo reale per salone.

**Interfaccia uguale per tutti i canali:** la toelettatrice vede solo "Promemoria automatici ⏻" e lo stato (inviato / confermato / da spostare). Il canale si sceglie lato server (`config/globale.canaleAuto: "email" | "wa_groomly" | "sms"`), quindi passare da un canale all'altro non cambia l'app.

### 8.0c W3 semplificato: "Collega il tuo WhatsApp" in 3 passi — ✅ SCELTA DEFINITIVA per l'automatico (Roberto, 24/10/2026)

> Decisione: il WhatsApp automatico di Groomly parte **dal numero della toelettatura**, con questa procedura guidata. W1 (numero Groomly) resta solo come pilota prima della partita IVA e come alternativa per chi non ha Facebook.

Roberto preferisce che i messaggi partano **dal numero della toelettatura**, purché il collegamento sia facilissimo anche per chi non è pratica. Obiettivo: **meno di 5 minuti, nessuna carta, nessun modulo da compilare.**

**Cosa NON si può evitare (regole Meta):** un **profilo Facebook** (per accedere) e l'app **WhatsApp Business** sul telefono del salone. Tutto il resto si può automatizzare o precompilare.

**Procedura guidata in app** (`/impostazioni/messaggi/collega`), un passo per schermata, con illustrazioni sticker e un video di 40 secondi:

| Passo | Cosa vede la toelettatrice | Cosa fa l'app al posto suo |
|---|---|---|
| 0. Controllo | "Ti servono WhatsApp Business e Facebook. 3 minuti." | Verifica se è installato WhatsApp Business (package `com.whatsapp.w4b`). Se manca: pulsante **"Installa WhatsApp Business"** che apre il Play Store, più la guida "come spostare il tuo numero senza perdere le chat" (3 schermate). Al ritorno ricontrolla da sola. |
| 1. Accedi | Pulsante **"Accedi con Facebook"** | Avvia l'Embedded Signup di Meta con **tutti i dati precompilati** dalle Impostazioni di Groomly (nome salone, email, telefono, indirizzo, sito `groomlyapp.it/s/{salone}`): deve solo premere "Avanti". |
| 2. Inquadra | "Apri WhatsApp Business e inquadra il codice" | Modalità coexistence: QR mostrato da Meta. Promemoria in chiaro: "Le liste broadcast si spengono e WhatsApp sul PC va ricollegato." |
| 3. Fatto | "✓ Collegato: +39 333 …. I promemoria partono dal tuo numero." | Registra il numero, attiva i template già approvati, manda un **messaggio di prova al telefono del salone**. |

**Regole per non metterla in difficoltà**
- **Niente carta su Meta**: i messaggi li paga Groomly tramite un partner che lo permette (W3, Twilio come ISV o un altro BSP con credit line). Per la toelettatrice il costo è dentro il Pro (crediti §8.1). Richiede la partita IVA di Roberto: è il passo successivo al pilota W1.
- **Se qualcosa non va a buon fine** in qualunque passo: "Nessun problema, intanto i promemoria li prepari con un tocco" e si resta su M1. Niente errori tecnici a schermo: codice errore nel log, messaggio semplice per lei.
- **Pulsante "Aiutami"** in ogni schermata: apre WhatsApp verso il numero di assistenza Groomly con il testo "Ho bisogno di aiuto per collegare WhatsApp, passo N".
- **Controllo di salute giornaliero** (Cloud Function): se il collegamento si interrompe o la qualità del numero scende, notifica "Il collegamento WhatsApp si è interrotto: tocca per ricollegare" e ritorno automatico alla coda M1 per i promemoria del giorno.
- **Scollega** in un tocco, in Messaggi ai clienti.

**Ordine deciso:** M1 + M2 ora → abbonati Pro e ricavi in crescita → partita IVA e verifica Meta → **W3 semplificato** come opzione principale (W1 eventuale alternativa per chi non ha Facebook o non vuole WhatsApp Business). Nessun pilota W1 per ora.

### 8.4 Alternativa W1: numero unico Groomly (solo pilota o per chi non ha Facebook — futuro)

> ⏸ Futuro. **Non è il default**: il default deciso è "Collega il tuo WhatsApp" (§8.0c). W1 serve solo per un eventuale pilota prima della partita IVA o come alternativa per chi non ha Facebook / WhatsApp Business.

**Come funziona**
- Groomly ha **un solo numero WhatsApp aziendale** (nome visualizzato "Groomly", azienda verificata su Meta) collegato alla Cloud API. È Groomly a pagare Meta, quindi il modello a crediti di §8.1 resta valido.
- La toelettatrice **non fa niente**: attiva "Promemoria automatici" con un interruttore. L'unico dato richiesto è il **telefono del salone** (già in Impostazioni › Attività), e se manca l'app lo chiede in quel momento.
- Ogni template contiene **il nome del salone**, per esempio: *"Ciao Marco! Ti ricordiamo l'appuntamento di Fido da **iPelosetti** domani, martedì 20 ottobre, alle 10:30. [Confermo] [Devo spostare]"*.
- **Pulsanti** Confermo / Devo spostare: aggiornano l'appuntamento in Groomly (P1) e mandano una notifica alla toelettatrice.
- **Risposte scritte dal cliente**: risposta automatica *"Questo numero invia solo promemoria per iPelosetti. Per scrivere al salone: wa.me/39…"* (link al numero del salone) e inoltro del testo come notifica push alla toelettatrice. Il messaggio di cortesia è in risposta, quindi è un messaggio di servizio (verifica il costo nel listino Meta).
- **STOP** → `optOut` per quel cliente **e quel salone** (un cliente può essere cliente di due saloni).
- I messaggi marketing (richiamo, compleanno) partono **solo con consenso marketing** registrato nella scheda: una sola spunta, già prevista in F1.

**Cosa serve a Groomly (una volta sola, fatto da Roberto)**
1. Meta Business Manager "Groomly". Per il **pilota senza partita IVA** si resta non verificati (limite 250 conversazioni avviate al giorno, carta personale di Roberto, Pro in omaggio ai saloni pilota). Per vendere: partita IVA e **verifica dell'azienda** (vedi A4).
2. Un numero dedicato **mai usato su WhatsApp** (una SIM o un numero fisso/virtuale), registrato sulla Cloud API.
3. Template approvati (elenco in S6, con `{salone}` come variabile).
4. Limiti di invio: Meta parte con un tetto di conversazioni avviate al giorno e lo alza da solo se la qualità resta alta. Per questo sono fondamentali opt-out facile, consenso e nessun invio fuori orario.


**Impatto sul codice:** il modulo di invio deve accettare entrambi i casi: `phoneNumberId` del salone (W3, default) oppure quello unico di Groomly (W1, alternativa). Per salone restano `modalita`, contatore e `optOut` per cliente.

---

## 9. Google Play Billing con RevenueCat (Fase C — quando l'app è completa)

### 9.1 Perché RevenueCat
- Gestisce prove, rinnovi, grazia, sospensione, rimborsi, cambi piano e ripristino acquisti, cose che fatte a mano richiedono settimane e generano bug sui soldi.
- Plugin ufficiale Capacitor `@revenuecat/purchases-capacitor`.
- È gratis sotto i 2.500 $ di ricavi mensili tracciati. Sopra prende l'1% (verifica il listino al momento dell'attivazione).
- Più avanti collega anche Stripe/web e iOS con gli **stessi entitlement**, senza riscrivere nulla.

### 9.2 Prodotti in Play Console

> Prezzi indicativi: se si sceglie il prezzo di lancio (A6), Pro 9,99/99,90 e Salone 19,99/199,90 con posto extra 3,99.

| Id prodotto | Tipo | Base plan | Prezzo IT (IVA incl.) | Note |
|---|---|---|---|---|
| `groomly_pro` | Abbonamento | `mensile` | 14,99 € | rinnovo automatico |
|  |  | `annuale` | 149,90 € | "2 mesi gratis" |
| `groomly_salone` | Abbonamento | `mensile-3` | 29,99 € | 3 collaboratori |
|  |  | `mensile-4` … `mensile-8` | +4,99 € a posto | posti extra = cambio di base plan |
|  |  | `annuale-3` … `annuale-8` | 299,90 € +49,90 € a posto |  |
| `crediti_100` | Prodotto in-app **consumabile** | — | 4,99 € | ⏸ futuro |
| `crediti_300` | Prodotto in-app **consumabile** | — | 11,99 € | ⏸ futuro |

**Perché i posti extra sono base plan diversi:** Google Play non permette di comprare due volte lo stesso abbonamento, quindi un "+1 posto" separato non funziona. Passare da `mensile-3` a `mensile-4` è un cambio di piano con conguaglio, gestito da Play. Oltre 8 posti: "Scrivici" (nessun salone piccolo ne ha bisogno, e un salone con più di 8 persone giustifica un'offerta su misura).

Impostazioni Play Console:
- **Periodo di grazia: 7 giorni. Account hold: 30 giorni.**
- **Pausa abbonamento: attiva** (1–3 mesi). Serve per chi chiude d'estate: è meglio una pausa che una disdetta.
- **Nessuna prova gratuita su Play** (c'è già la prova in app, D4). In alternativa, più avanti, un'offerta "primo mese 4,99 €" solo per chi non ha mai pagato.
- **Upgrade Pro → Salone**: `CHARGE_PRORATED_PRICE` (subito, paga la differenza). **Downgrade Salone → Pro** e **riduzione posti**: `DEFERRED` (alla fine del periodo).
- **Annuale ↔ mensile**: `DEFERRED`.

### 9.3 Configurazione RevenueCat
- Progetto "Groomly", app Android `it.groomly.app`, collegato al service account della Play Console e alle **Real-time developer notifications** (Pub/Sub, gestite da RevenueCat).
- **Entitlement**: `pro` (sbloccato da `groomly_pro` e `groomly_salone`), `salone` (solo `groomly_salone`).
- **Offering** `default` con i package `pro_mensile`, `pro_annuale`, `salone_mensile`, `salone_annuale`. I posti extra si leggono dai prodotti dell'offering `posti`.
- **App User ID = `salonId`**, non l'uid della persona: l'abbonamento appartiene al salone. Chiamare `Purchases.logIn(salonId)` dopo il login, `logOut()` all'uscita.
- **Restore behavior: "Keep with original App User ID"**: un acquisto non si sposta su un altro salone se qualcuno ripristina con lo stesso account Google. Se serve un trasferimento, lo fai tu da RevenueCat.
- **Webhook** → Cloud Function `rcWebhook` con header `Authorization` segreto.

### 9.4 Cloud Functions nuove (`functions/src/piano/`)

| Funzione | Tipo | Cosa fa |
|---|---|---|
| `rcWebhook` | HTTPS (`europe-west1`) | Verifica il segreto. Idempotenza con `rcEventi/{event.id}`. Per ogni evento (`INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`, `UNCANCELLATION`, `BILLING_ISSUE`, `SUBSCRIPTION_PAUSED`, `EXPIRATION`, `NON_RENEWING_PURCHASE`, `REFUND`/`TRANSFER`) **rilegge lo stato completo** da RevenueCat (`GET /v1/subscribers/{salonId}`) e chiama `scriviPiano`. Non si fida del contenuto dell'evento. |
| `sincronizzaPiano` | callable | Chiamata dal client subito dopo un acquisto o un ripristino. Rilegge da RevenueCat e scrive il piano, così si attiva in pochi secondi senza aspettare il webhook. Accetta solo titolare/socio del salone. |
| `scriviPiano` | modulo interno | Converte entitlement e scadenze in `pro/main` (§7.1), calcola `enabled` e `seats`, scrive in transazione. Se i posti scendono sotto i membri attivi: **sospende** gli ultimi entrati (non li revoca) e invia l'email al titolare. |
| `accreditaRicarica` *(futuro)* | dentro `rcWebhook` | Su `NON_RENEWING_PURCHASE` di `crediti_*`: aggiunge le ricariche (idempotente per `transaction_id`). Su `REFUND`: toglie i crediti non usati. |
| `avviaProva` | callable | Titolare di un salone senza `provaUsata`, al tocco su "Prova gratis": scrive `piano: pro, stato: prova, fonte: prova, scadeIl: +30gg, provaUsata: true`. **Non parte mai da sola**: solo su richiesta della toelettatrice (D4). Funziona anche con `abbonamentiAttivi == false`. |
| `chiudiProve` | `onSchedule` ogni ora | Prove scadute → `base/scaduto` (se nel frattempo non c'è un acquisto Play). |
| `assegnaCrediti` *(futuro)* | `onSchedule` 00:05 del 1° del mese, Europe/Rome | §8.1. |
| `copieCloudGiornaliere` | `onSchedule` 03:00 | Per i saloni Pro/Salone: esporta il backup completo (riusa `backupCollect`) in **Cloud Storage** `gs://…/copie/{salonId}/{data}.zip`, tiene 30 copie e cancella le più vecchie. |
| `impostaPianoManuale` | callable, solo operatore | Omaggi, saloni pilota, correzioni (§7.3). |

Segreti: `REVENUECAT_API_KEY` (secret key v1 o v2, server), `REVENUECAT_WEBHOOK_AUTH`, con `defineSecret` come `BREVO_API_KEY`.

### 9.5 Client
- `src/lib/billing.ts`: wrapper sottile sul plugin (`init`, `logIn`, `offerte`, `compra(package)`, `ripristina`, `gestisci`), con mock web per i test come `AppInstallerWeb`.
- Dopo `compra()` con esito positivo: chiama `sincronizzaPiano`, mostra "Pro attivo ✓" e un breve foglio "Ecco cosa puoi fare adesso" con 3 collegamenti (Messaggi ai clienti, Export, Copie nel cloud).
- Esito annullato dall'utente: nessun messaggio. Errore: "Acquisto non riuscito. Non ti è stato addebitato nulla."
- **Gestisci abbonamento**: apre `https://play.google.com/store/account/subscriptions?sku={productId}&package=it.groomly.app`. Prima mostra un mini-sondaggio facoltativo "Perché vuoi disdire?" (troppo caro / non lo uso / chiudo per un periodo / altro). Se la risposta è "chiudo per un periodo" suggerisce la **pausa**, se è "troppo caro" suggerisce Pro al posto di Salone o l'annuale.
- Solo il **titolare** vede Abbonati/Cambia piano (§5.2). Il socio vede lo stato e "Chiedi al titolare".

### 9.6 Modifiche Android necessarie per il billing
- `AndroidManifest.xml`: `android:launchMode="singleTask"` → **`singleTop`** (richiesto da RevenueCat, altrimenti gli acquisti si annullano tornando dall'app della banca). Verifica che push, link delle email (`/azione`), Drive e `SystemBack` funzionino ancora.
- Permesso `com.android.vending.BILLING` (lo aggiunge il plugin).
- Test su **license tester** della Play Console: in test un rinnovo mensile avviene ogni 5 minuti, quindi grazia, sospensione e scadenza si provano in un'ora.

### 9.7 Stati di prova da coprire (test manuali, checklist)
- [ ] Acquisto Pro mensile → piano attivo entro 10 s, badge spariti.
- [ ] Upgrade Pro → Salone → Team sbloccato subito, conguaglio corretto.
- [ ] Salone 3 → 4 posti e ritorno a 3 con 4 membri attivi → l'ultimo entrato sospeso alla data del rinnovo, email al titolare.
- [ ] Disdetta → "Pro fino al …", tutto funziona fino alla data, poi Base.
- [ ] Carta rifiutata → grazia (fascia arancione, tutto funziona) → account hold (fascia rossa, Pro fermo) → pagamento aggiornato → Pro ripreso.
- [ ] Rimborso dalla Play Console → Pro tolto.
- [ ] Disinstalla, reinstalla, accedi → piano presente senza toccare nulla. "Ripristina acquisti" funziona.
- [ ] Webhook ripetuto due volte → piano scritto una volta sola (idempotenza).
- [ ] Offline in negozio con Pro valido → nessun blocco. Offline con scadenza passata da più di 72 h → Base.
- [ ] Collaboratore e socio non vedono il pulsante Abbonati.

---

## 10. Prima di Play: modalità "In arrivo" (Fase A, subito)

Finché `abbonamentiAttivi == false`:
- La paywall mostra "In arrivo" con il pulsante **"Avvisami"** (§6.2).
- I piani si assegnano **solo a mano**: dalla pagina **Utenti** (operatore) per ogni salone: "Prova 30 giorni", "Pro omaggio", "Salone omaggio", "Torna a Base".
- Così puoi far provare Pro e Salone agli APK di prova di oggi, raccogliere pareri e capire quali funzioni interessano davvero (collezione `interesse`), **senza Play e senza costi**.

---

## 11. Copie nel cloud (B2) — dettaglio

- **Dove**: nel foglio Backup di Impostazioni, nuovo gruppo "Copie nel cloud" sopra "Se qualcosa va storto".
- **Base**: una riga "Copie nel cloud · 30 giorni" con badge PRO.
- **Pro**: elenco delle ultime 30 copie (data, "312 cani · 2.140 appuntamenti · 1,2 GB foto"), tocco → "Ripristina questa copia". Riusa **interamente** il flusso esistente: `salvaCopiaCloud` (copia di sicurezza prima del ripristino), `replaceCloudData`, `scriviFileRipristino`, "Annulla ripristino".
- **Server**: `copieCloudGiornaliere` (§9.4) scrive in Cloud Storage, non in Firestore: le foto in Firestore a pezzi da 700 KB costano molto di più in letture e spazio. Il client scarica la copia con un URL firmato di 15 minuti generato da una callable `scaricaCopia({ data })`.
- **Costo stimato**: Cloud Storage ~0,02 $/GB al mese. Un salone con 1 GB di foto e 30 copie complete pesa 30 GB, cioè 0,60 $ al mese. Per stare tranquillo: **copie incrementali per le foto** (le foto non cambiano: salvale una sola volta in `copie/{salonId}/foto/{fileId}` e ogni copia giornaliera contiene solo i dati più l'elenco delle foto). Così il costo resta sotto i 0,05 $ al mese per salone.

---

## 12. Prerequisiti per pubblicare su Play Store (Fase B — indipendente dal billing, ma obbligatoria)

Questi punti **bloccano la pubblicazione** o la mettono a rischio di sospensione. Vanno fatti prima del primo invio in revisione.

| # | Problema trovato nel codice | Cosa fare |
|---|---|---|
| B-1 | **⏸ DA NON FARE ORA (decisione di Roberto, 24/10/2026)**: l'aggiornamento via APK da GitHub **resta attivo** finché si pubblicano molte versioni di fila. Si rimuove solo al passaggio al Play Store, quando l'app è stabile. Fino ad allora non toccare `AppInstallerPlugin`, `UpdateNotice`, `appRelease.ts` e il permesso. Quando arriva il momento: caricamento su Play automatizzato (Gradle Play Publisher o GitHub Action verso il canale "test interno"), così nessun upload a mano. — **L'app si aggiorna da sola**: `AppInstallerPlugin.java`, `UpdateNotice.tsx` e `appRelease.ts` scaricano l'APK da GitHub Releases, e il manifest ha `REQUEST_INSTALL_PACKAGES`. La policy Google Play vieta alle app di aggiornarsi fuori dal Play Store e non ammette questo permesso per l'auto-aggiornamento. | Due **build flavor** Gradle: `play` e `sideload`. In `play`: niente `AppInstallerPlugin`, niente permesso (manifest di flavor con `tools:node="remove"`), e `UpdateNotice` usa la **Play In-App Updates API** (plugin `@capawesome/capacitor-app-update`). In `sideload` resta tutto com'è per i tuoi APK di prova. Flag di build `VITE_CANALE=play|sideload`. |
| B-2 | **Nessuna eliminazione account**. Play richiede di poter eliminare l'account sia dall'app sia da una pagina web. | `/impostazioni/account/elimina`: spiega cosa si cancella, chiede la password, avvisa se c'è un abbonamento attivo ("Disdici prima su Google Play, altrimenti continua a rinnovarsi") con il link. Callable `eliminaAccount` cancella salone, file, membri, account Auth e fa `RevenueCat DELETE subscriber`. Pagina web `groomlyapp.it/elimina-account` con modulo che crea la richiesta (via email Brevo). |
| B-3 | **Email personali nel codice**: `isOperator()` in `firestore.rules` e in `salonPath.ts` contiene le email di Laura e la tua, che finiscono nell'APK pubblico. | Custom claim `admin: true` impostato una volta con uno script Admin SDK. Regole: `request.auth.token.admin == true`. Client: legge il claim da `getIdTokenResult()`. Le email restano solo per riconoscere il salone `shared` (lato server). |
| B-4 | **"Pelosetto" nei testi**: per esempio "Fissa appuntamento pelosetto", il tipo `kind: 'pelosetto'`, `PelosettoArt`. È il nome del salone di tua sorella e una toelettatrice estranea non lo capisce. | Testi visibili → "Appuntamento" / "Fissa un appuntamento". I valori salvati (`kind: 'pelosetto'`) **restano** per non migrare i dati: cambia solo l'etichetta. |
| B-5 | **Repository GitHub** `robmass83-ui/Groomly`: l'app legge le release con l'API pubblica, quindi probabilmente il repo è pubblico e chiunque può copiare tutto il codice. | Rendi privato il repo del codice. Per il canale `sideload` pubblica `latest.json` e l'APK su Firebase Hosting (`groomlyapp.it/download`) o in un repo separato che contiene solo le release. |
| B-6 | **Privacy e termini**: nessuna informativa pubblica. | Pagine `groomlyapp.it/privacy` e `/termini` (Hosting). In Play Console: URL privacy, modulo **Sicurezza dei dati** (dati raccolti: email, nome, telefoni dei clienti del salone, foto; finalità; crittografia in transito; eliminazione possibile). Nell'app: link in Impostazioni › Account e nella paywall. |
| B-7 | **GDPR verso le toelettatrici**: Groomly conserva i dati dei clienti delle toelettatrici, quindi sei **responsabile del trattamento** per loro conto. | Termini con l'accordo sul trattamento dei dati (DPA) da accettare alla registrazione (checkbox, salva `accounts/{uid}.termini: { versione, accettatoIl }`). Elenco dei sub-responsabili: Google/Firebase, Brevo, RevenueCat, Meta (se WhatsApp). Falli rivedere da un professionista. |
| B-8 | **Account sviluppatore Play**: un account personale nuovo deve fare un **test chiuso con almeno 12 tester per 14 giorni** prima della produzione (verifica la regola attuale in Play Console). | Prepara subito 12–15 tester (toelettatrici, amici con Android) e la lista email. Valuta un account **Organizzazione** se apri la partita IVA: mostra il nome dell'attività invece del tuo e non ha l'obbligo dei 12 tester, ma richiede il D-U-N-S. |
| B-9 | **Profilo pagamenti** Play Console | Va collegato a un conto e ai dati fiscali prima di creare gli abbonamenti (passo manuale di Roberto in Play Console). |
| B-10 | Scheda dello store | Icona 512 px, immagine in evidenza 1024×500, 4–8 screenshot (riusa `ui-screenshots/`, togliendo dati veri dei clienti), descrizione breve e lunga in italiano, categoria "Attività commerciali". |

---

## 13. Metriche (per capire se funziona)

Eventi Firebase Analytics, solo se l'utente ha accettato (consenso nella prima apertura):
`paywall_aperta{feature, fonte}`, `avvisami{feature}`, `prova_iniziata`, `prova_finita`, `acquisto{prodotto, periodo}`, `cambio_piano`, `disdetta{motivo}`, `promemoria_email{inviati, confermati}`, `invia_tutti{n}`, `proposta_mostrata{momento}`, `proposta_chiusa{momento}`.

Pannello (RevenueCat ti dà MRR, abbonati e churn): cosa guardare ogni mese:
1. Quali `feature` aprono più paywall (sono quelle che vendono).
2. % di saloni in prova che passano a pagamento.
3. Disdette entro 60 giorni e motivi.
4. Quante toelettatrici usano "Invia tutti" ogni giorno e quante chiedono il WhatsApp automatico (lista "Avvisami" su P1): è il segnale per partire con la partita IVA e §8.0c.

---

## 14. Preparazione all'estero (senza farlo adesso)

- **R8**: ogni testo nuovo va in `src/i18n/it.ts`. Più avanti si estraggono gradualmente i testi esistenti (sono scritti a mano nei componenti).
- **Prezzi**: Play li converte e localizza da solo. Imposta prezzi per paese a mano solo nei mercati principali (Spagna, Francia, Germania, USA).
- **Crediti**: `pesoCrediti` diventerà per paese (`pesoCrediti.DE.marketing` ecc.), perché Meta ha tariffe diverse per paese.
- **Fuso orario e formati**: oggi è fisso Europe/Rome (`romeTime.ts`). Aggiungi `settings.business.timeZone` e `locale` di default `Europe/Rome`/`it-IT`, e falli usare a tutte le funzioni nuove.
- **Fattura per il commercialista**: l'export è pensato per l'Italia (P. IVA, codice fiscale). Per l'estero servirà un modello per paese.

---

## 15. Casi limite da gestire

| Caso | Comportamento |
|---|---|
| Il titolare compra con un account Google diverso dall'email Groomly | Va bene: RevenueCat usa `salonId`, non l'email. |
| Due telefoni del titolare comprano insieme | Play impedisce il doppio abbonamento sullo stesso account Google. Con account Google diversi, il secondo acquisto viene rilevato da `scriviPiano` (due abbonamenti attivi sullo stesso salone): email all'operatore e rimborso manuale. |
| Il collaboratore apre una paywall | Non succede: niente badge per lui (§5.2). |
| Salone eliminato con abbonamento attivo | Blocca l'eliminazione finché non c'è "Ho disdetto" + link a Play (policy Play). |
| Orologio del telefono spostato in avanti/indietro | Le scadenze si confrontano con l'ora del server (`pro/main.aggiornatoIl` + tolleranza). La prova e i crediti dipendono solo dal server. |
| Prova già usata, nuovo account sullo stesso telefono | `provaUsata` è per salone. Un secondo account può riprovare: è accettabile, il costo è zero (nessun messaggio a pagamento). Se diventa un abuso, aggiungi un controllo sul numero di telefono del salone. |
| Laura | `salons/{uid di Laura}` = Salone omaggio, `mostraBadge` sempre falso, card piano "Offerto da Groomly". Roberto (socio `accessWithoutPro`) non perde mai l'accesso. R1 garantito da un test dedicato. |
| Prezzi cambiati in Play Console | Gli abbonati esistenti mantengono il prezzo finché non accettano quello nuovo (lo gestisce Play). La paywall mostra sempre il prezzo dallo store. |
| Webhook RevenueCat fuori servizio | `sincronizzaPiano` all'apertura dell'app (al massimo una volta all'ora) recupera lo stato. |

---

## 16. Ordine dei lavori (piani /superpowers)

> **Prima della tabella: FASE 0 (§0F) e test 360° iniziale (§19).** Dopo l'ultimo piano: test 360° finale e rapporto finale. Il piano 4 è in gran parte già fatto (collaboratori pubblicati in 1.1.93): resta solo la mappa vecchio → nuovo di §00.

| Piano | Fase | Contenuto | Dipende da | Rischio |
|---|---|---|---|---|
| **1** | A | `config/globale`, `pro/main` esteso, **restringere le regole** (§7.1 attenzione), `piano.ts` + test, `usePiano` | — | Medio |
| **2** | A | Componenti `ProBadge`, `ProGate`, `PaywallSheet` (modalità "In arrivo" + Avvisami), `PianoCard`. Nuova struttura Impostazioni (§5.2) dietro `mostraPiani` | 1 | Basso |
| **3** | A | Pagina Utenti: azioni piano per salone (prova, omaggio, base), `impostaPianoManuale`, `avviaProva`, `chiudiProve`; salone di Laura → Salone omaggio (a mano, dall'operatore) | 1 | Medio |
| **4** | A | Adattamento della specifica collaboratori: `enabled` derivato da Salone, `postiTotali`, route `/impostazioni/team` | 1, collaboratori | Basso |
| **5** | A | Gating di Incassi: report passati 🔒 ed Export 🔒 (R2), fascia di inizio mese (§6.4) | 2 | Basso |
| **6** | ⏸ futuro | Crediti: documenti, `assegnaCrediti`, consumo/rimborso in transazione, `CreditiMeter`, `/impostazioni/crediti`. **Solo insieme al WhatsApp automatico**, quando ci sono ricavi | Pro con abbonati | Medio |
| **7** | A | Copie nel cloud (B2) con foto incrementali | 1 | Medio |
| **7a** | A | **M1** WhatsApp manuale "Invia tutti" con coda e push serale (§8.0) | 1 | Basso |
| **7b** | A | **M2** promemoria email automatici via Brevo con Confermo/Sposta (§8.0) | 1, 7a | Medio |
| **P-H0** | A | Orari di apertura (§4b.0) | — | Basso |
| **P-H7** | A | Statistiche clienti (§4b.6) | 1, H0 | Basso |
| **P-H4** | A | Recensioni Google (§4b.3) | 1 | Basso |
| **P-H5** | A | Tessera fedeltà (§4b.4) | 1 | Basso |
| **P-H1** | A | Dominio `groomlyapp.it` su Hosting, web app pubblica, `paginaSalone` con Open Graph, `pubblici/{slug}`, pagina biglietto da visita (Base) | H0 | Medio |
| **P-H2a** | A | `disponibilita.ts` + test (ora legale), callable `postiLiberi`, App Check, limiti anti-spam | P-H1 | **Alto** |
| **P-H2b** | A | Percorso cliente (5 schermate), `inviaRichiesta`, email Brevo (richiesta, conferma con `.ics`, proposta, rifiuto, scadenza, disdetta), link firmati | P-H2a, 7b | Alto |
| **P-H2c** | A | Lato toelettatrice: push, riquadro Richieste in Home, Accetta/Altro orario/Rifiuta, blocco tratteggiato in agenda, abbinamento cliente esistente, Impostazioni prenotazioni + QR | P-H2b | Alto |
| **P-H3** | A | Lista d'attesa (§4b.2), anche dalla pagina online | P-H2c | Medio |
| **P-H6** | A | Scheda del cane per il cliente (§4b.5) | P-H1, H5 | Medio |
| **8** | B | ⏸ **Solo quando l'app è stabile** (vedi B-1): build flavor `play`/`sideload`, In-App Updates, via `REQUEST_INSTALL_PACKAGES`, upload automatico su Play | app stabile | Medio |
| **9** | B | Eliminazione account (app + web), privacy/termini, consenso DPA, custom claim `admin`, testi "pelosetto" | — | Medio |
| **10** | B | Test chiuso Play (12 tester, 14 giorni) con la build `play` **senza billing** | 8, 9 | Basso |
| — | A | *Piani del documento Controlli avanzati in **modalità manuale** (F1–F3, P2–P8) proseguono qui, usando `haAccesso()` al posto del loro feature gate. S6 e P1 automatico: ⏸ futuro* | 1 | — |
| **11** | C | RevenueCat: plugin, `launchMode singleTop`, `billing.ts`, prodotti Play, `rcWebhook`, `sincronizzaPiano`, `scriviPiano` | app completa, 10 | **Alto** |
| **12** | C | Paywall con prezzi veri, acquisto, ripristino, gestione, sondaggio disdetta, posti extra, ricariche | 11 | Alto |
| **13** | C | Checklist §9.7 su license tester, poi `abbonamentiAttivi = true` | 12 | Alto |
| **14** | D | Momenti di proposta (§6.4), anteprime (P2, P5, P8), firma "Fatto con Groomly" (E1) | 2 | Basso |
| **15** | E | Metriche (§13) con consenso | 2 | Basso |

**Cosa fare quando, in pratica:**
1. **Adesso**: piani 1 → 7 (e i piani Controlli avanzati in modalità manuale). Tutto spento con i flag, Laura non vede differenze, tu provi Pro/Salone dalla pagina Utenti.
2. **Quando l'app è "finita"**: piani 8 → 10 e test chiuso su Play.
3. **Dopo il test chiuso**: piani 11 → 13, poi accendi `mostraPiani` e `abbonamentiAttivi`.
4. **Quando ci sono abbonati Pro e i ricavi salgono**: partita IVA → verifica Meta → "Collega il tuo WhatsApp" (§8.0c) + crediti (piano 6) + `whatsappAutoAttivo`.

---

## 17. Decisioni ancora aperte (per Roberto)

| # | Domanda | Mia raccomandazione |
|---|---|---|
| A1 | Scritta "Fatto con Groomly" sui documenti in Base (E1)? | Sì, piccola e discreta. È pubblicità gratuita e Pro la toglie. |
| A2 | Prezzo "fondatori" per i primi 50 saloni (es. Pro 9,99 € bloccato per sempre)? | Sì, come offerta Play per i primi mesi: crea passaparola tra toelettatrici. |
| A3 | Durata della prova: 30 o 14 giorni? | 30: la toelettatura ha cicli di 4–8 settimane, in 14 giorni non si vede nessun richiamo. |
| A4 | Account Play personale o organizzazione? | Dipende dalla partita IVA: chiedi al commercialista. |
| A5 | Export: tutto Pro, oppure 1 export gratis al mese? | Tutto Pro, ma con il report del mese corrente visibile gratis. |
| A6 | **Prezzo di lancio senza WhatsApp automatico.** Senza i messaggi automatici il Pro vale meno di quanto pensato all'inizio. | Lancio a **Pro 9,99 €/mese o 99,90 €/anno** e **Salone 19,99 €/mese o 199,90 €/anno** (posto extra 3,99 €). Senza costi per messaggio il margine resta alto (~7,0 € netti sul Pro). Quando arriva il WhatsApp automatico, i prezzi salgono a 14,99/29,99 **solo per i nuovi**: chi è già abbonato tiene il prezzo (lo gestisce Play, si crea un nuovo base plan). |
| A7 | ✅ Deciso (Roberto, 24/10/2026): **gli abbonamenti si fanno come da piano** (Fase C, quando l'app è completa). Gli aspetti fiscali li gestisce Roberto per conto suo; la prova Pro di 30 giorni dà tempo prima dei primi incassi. Non è un blocco per lo sviluppo. |

---

## 18. Criteri di accettazione generali

- [ ] Con `mostraPiani = false`: app identica a oggi (test snapshot di Impostazioni, Home, Incassi per il salone di Laura (copia finta negli emulatori) e per un salone nuovo).
- [ ] Il client non può scrivere `pro/main`, `crediti/*`, `movimentiCrediti/*`, `copieCloud/*`, `members/*`, `config/*` (test delle regole).
- [ ] `haAccesso` coperto da test per ogni combinazione livello × stato × scadenza × offline.
- [ ] Ogni funzione della tabella §4 usa `ProGate`/`haAccesso`, nessun `if (piano === 'pro')` sparso (controllo con `grep`).
- [ ] Nessuna paywall si apre da sola durante un lavoro (R6), e al massimo una proposta ogni 7 giorni.
- [ ] Downgrade: nessun dato perso (test con un salone pieno: Salone → Base → Salone).
- [ ] Promemoria email: nessun doppio invio (idempotenza su appuntamento + data) e rispetto del tetto giornaliero Brevo.
- [ ] Build `play` senza `REQUEST_INSTALL_PACKAGES` (controllo sul manifest unito, `aapt dump permissions`).
- [ ] Eliminazione account funzionante da app e da web.
- [ ] Falle F1–F10 e M1–M13 del rapporto del 25/10 chiuse, ognuna con un test.
- [ ] Test 360° finale verde e rapporto finale scritto (§19.7).
- [ ] Un solo ramo principale, worktree vecchi chiusi, repo privato.

---

## 19. Test 360° — da fare all'INIZIO e alla FINE del lavoro (obbligatorio)

Il primo test è stato fatto il 25/10/2026: rapporto in `docs/Groomly_Test360_RAPPORTO_2026-10-25.md`, kit in `docs/test360-kit/`. Va ripetuto **prima** di iniziare (fotografia di partenza, dopo la Fase 0) e **alla fine** (verifica di tutto il piano).

### 19.1 Regole di sicurezza (non negoziabili)
- **Solo emulatori Firebase** con progetto finto **`demo-groomly`** (il prefisso `demo-` impedisce qualunque contatto con Google). Mai `groomly-3128b` negli script di test.
- Ogni script di test controlla all'avvio che `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST` siano impostati, e **si ferma** se non lo sono (come fa già `seed.ts`).
- **Mai** leggere, scrivere o cancellare sul Firebase vero: il salone di Laura (`salons/{uid di Laura}`), `salon/shared`, il salone Troddioni, i tre account (Laura, Roberto, `robmass83@gmail.com`) e i loro `users/{uid}`.
- Le email di Laura e Roberto esistono **solo** negli emulatori, per provare il loro percorso (salone finto "iPelosetti (FINTO)").
- Se un giorno servisse un test sul Firebase vero: script solo in lettura, oppure saloni con email `@test.groomly` creati e cancellati con elenco + impronta SHA-256 + secondo lancio (stesso schema di `scripts/allinea-laura.ts`), con l'elenco protetto qui sopra escluso per costruzione.

### 19.2 Ambiente
- `firebase emulators:start --config firebase.emu.json --project demo-groomly` (Auth 9099, Firestore 8080, Functions 5001).
- `npx vite --mode emu` (legge `.env.emu`, `VITE_EMULATORS=1`).
- Playwright con Chromium, viewport 390×844, `timezoneId: Europe/Rome`, `locale: it-IT`, tema chiaro **e** scuro, chiamate a GitHub e `web.app` bloccate.

### 19.3 Dati di prova (`scripts/test360/seed.ts`)
20 saloni, 50–60 cani ciascuno (uno vuoto, uno con 130, uno con nomi e note lunghissimi ed emoji), 6 mesi di storico + mese in corso + mese prossimo (4–8 visite al giorno, completati, non venuti, disdetti, da chiudere, personali, sovrapposizioni), chiusure, 5 saloni con collaboratori, un salone con email non confermata, la copia finta del salone di Laura. **Dopo il piano**: anche saloni in **Base, prova, Pro, Salone, grazia, scaduto, omaggio**, con orari di apertura, richieste di prenotazione online, lista d'attesa, tessere fedeltà.

### 19.4 Cosa si prova (ogni riga = un test automatico, con schermata)
1. **Regole sull'emulatore** (`scripts/test360/rules.ts`, da estendere): isolamento tra saloni, `users/{uid}`, raccolte non in elenco, `pro/main`, `members`, `crediti`, `copieCloud`, `richieste`, `pubblici`, collaboratore su completati, socio, collaboratore con Pro/Salone spento, `accessWithoutPro`, operatore, email non confermata.
2. **Giro di tutte le pagine** per ogni ruolo (titolare Base/Pro/Salone, socio, collaboratore, operatore), chiaro e scuro: nessun errore in console, nessuna pagina bianca, nessun testo tagliato.
3. **Azioni del titolare**: nuovo appuntamento (sovrapposizione, cane mensile, giorno chiuso), Completato con e senza cambio prezzo, Non venuto, Disdetto + Annulla, nuovo cane, modifica, archivio e ripristino, chiusura, appuntamento personale, ricerca (nome, razza, proprietario, telefono), listino (modifica, stampa A4/A3, PDF/JPEG), export, backup, ripristino.
4. **Team**: invito (email valida, non valida, già dentro, posti finiti), accettazione, cambio ruolo, revoca, "Chi lo fa", incassi per persona, accesso sospeso.
5. **Piani** (dopo il piano): badge PRO solo con `mostraPiani`, paywall per ogni funzione, prova 30 giorni (avvio, fine, una sola volta), downgrade senza perdita di dati, R1 per Laura, card "Il tuo piano" in tutti gli stati, proposte al massimo una a settimana.
6. **Funzioni di punta** (dopo il piano): orari di apertura, pagina del salone, prenotazione online completa (5 schermate, email di richiesta e conferma, Accetta/Altro orario/Rifiuta, blocco tratteggiato, scadenza 48 h, disdetta dal link), lista d'attesa, recensioni, fedeltà, scheda per il cliente, statistiche.
7. **Offline**: crea cane, appuntamento, Completato, chiusura offline → online → ricarica → tutto c'è (F2).
8. **Tempi**: primo avvio e riapertura per salone piccolo e grande. Obiettivo: niente falso "€ 0", dati in meno di 3 s con cache.
9. **Concorrenza**: titolare e collaboratore aperti insieme, uno crea, l'altro vede entro 5 s; stessa visita modificata da due persone.
10. **Test unitari**: `npm test` tutto verde.

### 19.5 Pulizia
- Gli emulatori tengono i dati **solo in memoria**: spegnendoli tutto sparisce. Non usare `--export-on-exit`.
- Cancellare `test-results/`, `firestore-debug.log`, eventuali download di prova.
- Verificare con `git status` che nel repository non restino dati di prova.

### 19.6 Checklist sul telefono (non automatizzabile)
Push "Da chiudere" e "Mensili", promemoria email (Brevo vero su un indirizzo di prova), Google Drive (collega, invia, ripristina), fotocamera (foto prima/dopo), condivisione PDF/JPEG, aggiornamento APK, tema scuro di sistema, rotazione, pulsante indietro di Android.

### 19.7 Rapporto
`docs/Groomly_Test360_RAPPORTO_FINALE.md` con la stessa struttura del rapporto del 25/10: dati creati, cosa è stato provato, cosa funziona, falle per gravità, tempi, cosa non si è potuto provare. **Tutte le falle 🔴 e 🟠 devono risultare chiuse.**
