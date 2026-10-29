# Groomly — Controlli avanzati, piani Pro/Salone e WhatsApp automatico

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

| Funzione | Stato al 26/10/2026 |
| --- | --- |
| F1 messaggi WhatsApp manuali | fatto: interruttore in Impostazioni, spento di default |
| F2 affidabilità | fatto: interruttore in Impostazioni, spento di default |
| F3 note vocali | fatto: interruttore in Impostazioni, spento di default |
| Invia tutti, pagella, prenotazioni nel menu, lista d’attesa, recensioni, fedeltà, statistiche | dietro flag |
| WhatsApp automatico e crediti | rimandato |

> **Documento di specifica per Cursor + /superpowers**
> Versione 1.0 — ottobre 2026
> Progetto: `D:\Groomly` · Firebase project `groomly-3128b` (piano Blaze) · Email transazionali via Brevo (`noreply@groomlyapp.it`)

---

## 0. Istruzioni già eseguite (non rifare)

1. **Prima di scrivere codice**, esplora il codebase esistente e annota: stack (framework UI, Android nativo / Capacitor / Flutter / PWA), struttura dati Firestore reale, pattern dei componenti, gestione tema chiaro/scuro, navigazione, Cloud Functions già presenti (email Brevo). **Adatta tutti i percorsi e i nomi di questo documento alla struttura reale**: i path Firestore qui sotto sono *logici*, non obbligatori.
2. Il lavoro è diviso in **Sezioni indipendenti (S0 → S7)**. Ogni sezione può diventare un piano `/superpowers` separato (brainstorm → write-plan → execute). Ordine obbligatorio: **S0 prima di tutto**, poi S1–S3, il resto nell'ordine indicato al §11.
3. Ogni feature ha: *Obiettivo · UI · Dati · Logica · Impostazioni · Casi limite · Criteri di accettazione*. I criteri di accettazione sono la definizione di "finito".
4. Lavora per piccoli commit, uno per sotto-feature. Non rifattorizzare codice esistente se non strettamente necessario.

---

## 1. Regole d'oro (valgono per TUTTE le sezioni)

| # | Regola |
|---|---|
| R1 | **L'app attuale non deve cambiare.** Con tutte le nuove opzioni spente, ogni schermata esistente deve essere identica a oggi (layout, testi, comportamento). |
| R2 | Tutte le nuove funzioni sono **spente di default**. |
| R3 | Le funzioni **Pro/Salone non compaiono da nessuna parte** nell'app finché il piano non è attivo (eccezione: le card con lucchetto in *Controlli avanzati*, vedi S2). |
| R4 | **Stile UI**: mantenere lo stile attuale ("Pulito e professionale": bianco, blu ardesia, compatto). Font e campi piccoli, molte informazioni per schermata, chip, ombre leggere, highlight al tocco, divisori tra sezioni. Supporto **chiaro e scuro**. Icone carattere in stile *sticker colorato* (es. angioletto/diavoletto) dove serve. |
| R5 | Vocabolario esistente da rispettare: **Disdici / Disdetto / Non venuto**, "Annulla" solo nel toast; "Completato" solo per oggi e passati; servizi: *Bagno + taglio*, *Antiparassitario*, ecc. |
| R6 | **Nessun costo fisso** finché non ci sono saloni paganti: niente fornitori con canone, niente servizi a pagamento attivi. Tutto ciò che può generare costi è dietro un **interruttore globale spento**. |
| R7 | Il dominio `firebaseapp.com` / `groomly-3128b.firebaseapp.com` **non deve mai essere visibile** agli utenti (email, link, messaggi). |
| R8 | Timezone di riferimento: **Europe/Rome**. Date in italiano ("martedì 20 ottobre"). |
| R9 | Ogni scrittura sensibile (piano/abbonamento, invii automatici, contatori) avviene **solo lato server** (Cloud Functions). Le Security Rules devono impedire al client di modificare questi campi. |

---

## 2. Mappa delle funzioni e dei piani

| Codice | Funzione | Piano | Usa WhatsApp API? |
|---|---|---|---|
| F1 | Messaggi WhatsApp manuali (testo precompilato) | **Free** | No (link `wa.me`) |
| F2 | Affidabilità cliente (disdette / non venuto) | **Free** | No |
| F3 | Note vocali "mani bagnate" | **Free** | No |
| P1 | Promemoria appuntamento automatico (+ pulsanti Confermo/Devo spostare) | **Pro** | Sì (con fallback manuale) |
| P2 | Richiamo clienti che non vengono da tempo | **Pro** | Sì (con fallback manuale) |
| P3 | "Il tuo cane è pronto" con foto del dopo | **Pro** | Sì (con fallback manuale) |
| P4 | Auguri di compleanno del cane (+ sconto facoltativo) | **Pro** | Sì (con fallback manuale) |
| P5 | Pagella della toelettatura | **Pro** | Opzionale |
| P6 | Prezzo suggerito per cane nuovo | **Pro** | No |
| P7 | Aumento listino con avviso ai clienti | **Pro** | Sì (con fallback manuale) |
| P8 | Collage prima/dopo con logo | **Pro** | No |
| S1 | Più operatori (dipendenti) | **Salone** (= Pro + S1) | No |

**Principio chiave "Pro vendibile anche senza API":** ogni funzione Pro che invia messaggi deve funzionare in **modalità manuale** (coda "Da inviare" che apre WhatsApp con testo pronto) finché l'interruttore globale `whatsappAutoAttivo` è spento o il salone non ha il WhatsApp automatico collegato. Quando l'API viene attivata, la stessa funzione passa a **modalità automatica** senza cambiare UI. Così il Pro si può vendere subito, e l'API si accende solo quando conviene.

---

## S0 — Fondamenta (obbligatoria, prima di tutto)

### S0.1 Modello dati comune

Path logici (adattare alla struttura reale; `{salone}` = documento radice dell'account/salone):

```
config/globale                                   (scrivibile solo da admin/server)
  whatsappAutoAttivo: false        // interruttore generale API WhatsApp
  abbonamentiAttivi: false         // se false la pagina abbonamento mostra "In arrivo"
  mostraPianiPagamento: true       // se false le card Pro/Salone non si vedono affatto
  tettoMessaggiPro: 400            // messaggi automatici/mese inclusi nel Pro
  tettoMessaggiSalone: 1000
  versioneMinimaApp: "x.y.z"

saloni/{salone}/abbonamento                      (solo server)
  piano: "free" | "pro" | "salone"
  stato: "attivo" | "in_prova" | "periodo_grazia" | "sospeso" | "scaduto"
  fonte: "play" | "omaggio" | "manuale"
  scadenza: Timestamp | null
  purchaseToken: string | null
  aggiornatoIl: Timestamp

saloni/{salone}/impostazioni/avanzate            (scrivibile dal titolare)
  f1_messaggiManuali: { attivo: false, ... }      // vedi F1
  f2_affidabilita:    { attivo: false, ... }
  f3_noteVocali:      { attivo: false }
  p1_promemoria:      { attivo: false, ... }
  ... (una chiave per funzione)

saloni/{salone}/whatsapp                          (solo server)
  collegato: false
  phoneNumberId: null
  wabaId: null
  modalita: "manuale" | "automatico"
  messaggiMese: { "2026-10": 0 }

saloni/{salone}/messaggi/{id}                     (log invii, solo server per gli automatici)
  tipo: "promemoria" | "richiamo" | "pronto" | "compleanno" | "pagella" | "listino"
  canale: "wa_manuale" | "wa_api" | "email"
  clienteId, caneId, appuntamentoId?
  stato: "preparato" | "aperto" | "inviato" | "consegnato" | "letto" | "fallito"
  categoriaMeta?: "utility" | "marketing"
  errore?: string
  creatoIl: Timestamp
```

Campi nuovi su entità esistenti (**tutti opzionali, nessuna migrazione obbligatoria**):

- Cliente/padrone: `telefonoE164` (calcolato), `consensoWhatsApp: { servizio: bool, marketing: bool, data: Timestamp }`, `consensoFotoSocial: bool`, `optOut: bool`.
- Cane: `dataNascita?: Date`, `intervalloRichiamoSettimane?: number`.
- Appuntamento: `disdettoIl?: Timestamp`, `statoConferma?: "in_attesa" | "confermato" | "richiesta_spostamento"`, `promemoriaInviatoIl?`, `prontoInviatoIl?`, `operatoreId?` (solo S1), `pagella?` (P5).

### S0.2 Feature gate centralizzato

Creare **un unico modulo** (es. `features.ts` / equivalente) con:

```
type Piano = "free" | "pro" | "salone"
const FEATURE_PIANO = {
  f1: "free", f2: "free", f3: "free",
  p1: "pro", p2: "pro", p3: "pro", p4: "pro", p5: "pro", p6: "pro", p7: "pro", p8: "pro",
  s1: "salone",
}
pianoAttivo(): Piano                       // da abbonamento, considera stato/scadenza
haAccesso(feature): boolean                // piano >= piano richiesto (salone ⊇ pro ⊇ free)
isAttiva(feature): boolean                 // haAccesso && toggle impostazioni attivo
modalitaInvio(): "manuale" | "automatico"  // automatico solo se config.whatsappAutoAttivo
                                           // && saloni/{s}/whatsapp.collegato
                                           // && sotto il tetto mensile
```

**Nessun componente** deve leggere direttamente piano o toggle: usa sempre questo modulo. Così spegnere/accendere una funzione è un solo punto.

### S0.3 Utility comuni

1. **Normalizzazione telefono → E.164** (`normalizzaTelefono(input)`):
   - rimuovere spazi, trattini, punti, parentesi;
   - `00` iniziale → `+`;
   - numero italiano senza prefisso (es. `3xx…` 9–10 cifre, o fisso che inizia con `0`) → `+39…`;
   - se già `+` lo lascia;
   - restituisce `null` se non valido (lunghezza fuori 8–15 cifre).
   - Per `wa.me` usare solo cifre, senza `+`.
   - Test unitari con almeno 12 casi (cellulari, fissi, stranieri, spazzatura).
2. **Motore template** (`renderTemplate(testo, contesto)`): segnaposto `{cliente}`, `{cane}`, `{giorno}` (es. "martedì"), `{data}` ("20 ottobre"), `{giorno_data}` ("martedì 20 ottobre"), `{ora}` ("10:30"), `{servizio}`, `{prezzo}`, `{salone}`, `{telefono_salone}`, `{nuovo_prezzo}`, `{vecchio_prezzo}`, `{sconto}`. Segnaposto mancanti → stringa vuota e spazi doppi ripuliti. Formattazione con `Intl` it-IT, timezone Europe/Rome.
3. **Apertura WhatsApp** (`apriWhatsApp(telefonoE164, testo)`): `https://wa.me/<cifre>?text=<encodeURIComponent(testo)>`. Su Android, se l'impostazione *"Usa WhatsApp Business"* è attiva e l'app è installata, preferire il package `com.whatsapp.w4b` (via intent), altrimenti `wa.me` generico. Emoji e accenti devono arrivare corretti.
4. **Condivisione immagine** (`condividiImmagine(file, testo)`): Share sheet nativo (Android `ACTION_SEND` / Web Share API con `files`), usato da P3, P5, P8 in modalità manuale.
5. **Log messaggi**: ogni apertura manuale crea un record `messaggi` con `canale: "wa_manuale"`, `stato: "aperto"`.

### S0.4 Security Rules

- `config/*`, `saloni/*/abbonamento`, `saloni/*/whatsapp`, contatori: **read** per utenti del salone, **write** negato al client.
- `impostazioni/avanzate`: write solo per ruolo titolare (vedi S1; prima di S1 = proprietario account).
- Test delle rules con l'emulatore Firebase.

### S0.5 Criteri di accettazione S0
- [ ] Con `config/globale` assente o default, l'app funziona esattamente come prima.
- [ ] `haAccesso` / `isAttiva` coperti da test (free/pro/salone × toggle on/off × stati abbonamento scaduto/grazia).
- [ ] Il client non riesce a scrivere `abbonamento` (test rules).
- [ ] `normalizzaTelefono` e `renderTemplate` con test unitari verdi.

---

## S1 — Schermata "Controlli avanzati" (contenitore)

### Obiettivo
Nuova voce in **Impostazioni** (o in "Altro", dove oggi stanno le impostazioni) → **Controlli avanzati**. È l'unico punto nuovo visibile con tutto spento.

### UI (dall'alto verso il basso)
1. **Intestazione** con breve descrizione: "Funzioni extra per comunicare con i clienti e lavorare più veloce. Attivale solo se ti servono."
2. **Sezione "Gratuite"** — una riga per funzione (F1, F2, F3): icona sticker, titolo, sottotitolo di 1 riga, **toggle a destra**. Tocco sulla riga (non sul toggle) → pagina impostazioni della funzione. Riga disabilitata visivamente se toggle off, ma sempre apribile.
3. **Sezione "Pro"**:
   - se piano < pro: **card con lucchetto** "Groomly Pro — promemoria automatici, pagella, collage e altro" + pulsante "Scopri" → pagina abbonamento (S2). Se `config.mostraPianiPagamento == false` la card non c'è.
   - se piano ≥ pro: elenco P1–P8 con toggle, come le gratuite. In alto un badge "Pro attivo" e lo stato messaggi: "Invio: manuale" oppure "Invio automatico · 132/400 messaggi questo mese".
4. **Sezione "Salone"**: stessa logica (card lucchetto oppure voce "Operatori" → S1).
5. **Sezione "WhatsApp"** (solo se F1 o qualunque P di messaggistica è attiva):
   - "Usa WhatsApp Business" (toggle);
   - "Numero del salone" (per `{telefono_salone}`);
   - "Orari silenziosi" (default 21:00–08:30, nessun invio automatico, e in modalità manuale un avviso se si apre fuori orario);
   - stato collegamento API: "Non collegato — invio manuale" / "Collegato (+39 …)". Pulsante "Collega WhatsApp" visibile **solo** se `config.whatsappAutoAttivo == true` e piano ≥ pro (vedi S6).

### Criteri di accettazione
- [ ] Voce nuova presente; nient'altro cambia nell'app.
- [ ] Piano free: Pro/Salone mostrano solo le card con lucchetto (o nulla se flag spento).
- [ ] Toggle salvati in `impostazioni/avanzate` e riletti all'avvio; funziona offline (cache Firestore) e si sincronizza.
- [ ] Chiaro/scuro corretti, layout compatto coerente.

---

## S2 — Pagina abbonamento e Google Play Billing

### Obiettivo
Pagina che presenta **Pro** e **Salone** con abbonamento mensile. Costruita ora, ma **spenta** con `config.abbonamentiAttivi = false` (mostra "In arrivo — scrivici se ti interessa" + pulsante email/WhatsApp verso lo sviluppatore).

### UI
- Toggle in alto "Pro | Salone" oppure due card affiancate.
- Per ciascun piano: prezzo mensile (letto dal Play Store, **mai hardcoded**), elenco funzioni con spunte, eventuale prova gratuita, pulsante "Abbonati".
- Card Salone: "Tutto il Pro + più operatori".
- In fondo: "Gestisci abbonamento" (link alla pagina abbonamenti di Google Play), "Ripristina acquisti", note legali (rinnovo automatico, disdetta quando vuoi).
- Stato corrente se già abbonato: piano, prossimo rinnovo, eventuale "periodo di grazia: aggiorna il metodo di pagamento".

### Implementazione
1. **Prodotti Play Console** (da creare in Fase 2, documentare ora): abbonamenti `groomly_pro` e `groomly_salone`, base plan mensile, prova gratuita opzionale (es. 14 giorni), upgrade Pro→Salone con proration.
2. **Client**: libreria di billing adatta allo stack (Play Billing Library nativa / plugin Capacitor / `in_app_purchase` per Flutter). Se l'app **non** è distribuita via Play Store (PWA), segnalarlo e proporre Stripe come alternativa: non implementare finché non si decide.
3. **Verifica server** — Cloud Function `verificaAcquisto(purchaseToken, productId)`: chiama Google Play Developer API (`purchases.subscriptionsv2.get`), valida, scrive `saloni/{s}/abbonamento`, fa l'acknowledge. Mai fidarsi del client.
4. **Notifiche in tempo reale (RTDN)**: topic Pub/Sub collegato a Play Console → Cloud Function `playRtdn` che aggiorna stato (rinnovo, cancellazione, grazia, sospensione, scadenza). Costo trascurabile a questi volumi.
5. **Downgrade/scadenza**: le funzioni Pro si nascondono, **i dati restano** (pagelle, operatori, impostazioni) e riappaiono al riabbonamento. Gli operatori extra in scadenza Salone: accesso sospeso, non cancellato.
6. **Omaggio/test**: script admin (o funzione callable protetta da custom claim `admin`) per impostare `fonte: "omaggio"` su un salone (es. account di prova o saloni amici), senza Play.

### Criteri di accettazione
- [ ] Con `abbonamentiAttivi = false`: pagina "In arrivo", nessuna chiamata al billing.
- [ ] Con flag true e account di test Play: acquisto → entro pochi secondi `abbonamento.piano = "pro"` e le funzioni compaiono.
- [ ] Cancellazione/scadenza gestite via RTDN (testare con licenze di test).
- [ ] "Ripristina acquisti" funziona su reinstallazione / altro telefono con stesso account.

---

## F1 — Messaggi WhatsApp manuali (Free)

### Obiettivo
L'app ricorda chi va avvisato e prepara il messaggio; la toelettatrice tocca un pulsante, si apre WhatsApp con il testo già scritto, lei preme Invia.

### Tipi di messaggio (ognuno con toggle in impostazioni F1)
| Tipo | Quando compare | Testo predefinito |
|---|---|---|
| Promemoria | appuntamenti di domani (o tra N giorni, impostabile 1–3) | "Ciao {cliente}! Ti ricordo che {cane} ha appuntamento {giorno_data} alle {ora} per {servizio}. A presto! 🐾 {salone}" |
| Cane pronto | quando si preme "Completato" | "Ciao {cliente}, {cane} è pronto/a! Puoi passare a prenderlo/a quando vuoi 🐶 {salone}" |
| Compleanno | se P4 non attivo ma è presente la data di nascita → *solo con P4*: in F1 non c'è | — |
| Generico | dal profilo cane, pulsante WhatsApp | "Ciao {cliente}, " |

(Richiamo, compleanno e aumento listino sono funzioni Pro: P2, P4, P7.)

### UI
1. **Home → riquadro "Da avvisare"** (visibile solo se F1 attivo e c'è almeno un appuntamento da avvisare):
   - titolo "Da avvisare · domani (5)";
   - righe compatte: foto cane, nome cane, ora, servizio, nome cliente; a destra pulsante verde WhatsApp;
   - dopo il tocco la riga diventa "Avvisato ✓" (grigia) con possibilità di annullare ("Segna come da avvisare");
   - righe con numero non valido: icona ⚠ "Numero non valido" → tocco apre la scheda cliente per correggerlo;
   - righe con cliente in `optOut`: nascoste.
   - Il riquadro si inserisce **sotto** gli elementi Home esistenti senza spostarli in alto.
2. **Scheda appuntamento**: pulsante WhatsApp "Invia promemoria" (se F1 attivo).
3. **"Completato"** → se "Cane pronto" attivo, bottom sheet: "Avvisare {cliente} che {cane} è pronto?" [WhatsApp] [Con foto] [No]. "Con foto" usa `condividiImmagine` con la foto del *dopo* (se esiste) e il testo.
4. **Impostazioni F1**: per ogni tipo → toggle + **editor testo**:
   - campo testo multilinea;
   - chip dei segnaposto cliccabili (inseriscono `{cane}` ecc. al cursore);
   - **anteprima live** con dati di un cane reale (il prossimo appuntamento) o di esempio;
   - "Ripristina testo predefinito".
   - Opzione "Mostra promemoria per: domani / tra 2 giorni / tra 3 giorni".
5. **Consenso**: nella scheda cliente, quando F1 è attivo, compare "Consenso messaggi WhatsApp" (servizio) — default *sì* per i messaggi di servizio (promemoria e cane pronto sono parte del servizio richiesto), con nota informativa. Il consenso *marketing* serve solo per P2/P4 (vedi lì).

### Dati
- Appuntamento: `avvisatoIl?: Timestamp` (manuale), log in `messaggi`.
- Impostazioni: `f1_messaggiManuali: { attivo, promemoria: { attivo, testo, giorniPrima }, pronto: { attivo, testo }, usaWhatsAppBusiness }`.

### Casi limite
- Appuntamento disdetto dopo essere apparso in lista → sparisce.
- Due cani dello stesso cliente lo stesso giorno → **un solo messaggio** con "{cane}" = "Fido e Luna" e orari elencati.
- Cliente senza telefono → riga con "Aggiungi numero".
- WhatsApp non installato → fallback `wa.me` nel browser; se anche quello fallisce, copia il testo negli appunti con toast.

### Criteri di accettazione
- [ ] Con F1 spento: nessun riquadro, nessun pulsante, nessun campo consenso visibile.
- [ ] Tocco → WhatsApp si apre sulla chat giusta con testo corretto (accenti, emoji, a capo).
- [ ] "Avvisato ✓" persiste e si sincronizza tra dispositivi.
- [ ] Editor con anteprima live funzionante; ripristino predefinito ok.

---

## F2 — Affidabilità cliente (Free)

### Obiettivo
Vedere a colpo d'occhio se un cliente tende a disdire all'ultimo o a non presentarsi.

### Logica
Conteggio sugli ultimi **12 mesi** (impostabile 6/12/24) per cliente (tutti i suoi cani):
- **Non venuto** = appuntamenti con stato "Non venuto";
- **Disdetta last minute** = stato "Disdetto" con `disdettoIl` entro **24 ore** (impostabile 12/24/48) dall'orario dell'appuntamento;
- **Disdetta** = altri "Disdetto".
- Da ora in poi, quando si preme "Disdici", salvare `disdettoIl = now` (per gli storici senza timestamp: contarli come "Disdetta" normale).

Livelli (soglie impostabili, default):
- 🟢 **Affidabile**: 0 non venuto e ≤ 1 disdetta last minute;
- 🟡 **Attenzione**: 1 non venuto **oppure** ≥ 2 disdette last minute;
- 🔴 **Poco affidabile**: ≥ 2 non venuto **oppure** ≥ 4 disdette last minute.
- Meno di 3 appuntamenti totali → nessun badge ("Cliente nuovo").

### UI
- **Profilo cane**: chip accanto al nome del padrone (sticker colorato coerente con le icone carattere) + riga "2 non venuto · 1 disdetta all'ultimo (12 mesi)". Tocco → elenco degli appuntamenti conteggiati.
- **Creazione appuntamento**: se il cliente è 🟡/🔴 mostra un piccolo avviso non bloccante sotto il campo cane.
- **Impostazioni F2**: toggle, finestra (6/12/24 mesi), soglia last minute (12/24/48 h), soglie livelli, "Mostra avviso in creazione appuntamento".

### Criteri di accettazione
- [ ] Calcolo corretto con test (casi: zero storico, solo disdette, misti, timestamp mancante).
- [ ] Nessun impatto sulle prestazioni della lista cani (calcolo lazy o cache per cliente aggiornata alla modifica stato).
- [ ] Con F2 spento non compare nulla.

---

## F3 — Note vocali "mani bagnate" (Free)

### Obiettivo
Dettare una nota senza toccare la tastiera.

### UI
- Nei campi note (profilo cane, appuntamento, pagella P5) compare un'**icona microfono** se F3 attivo.
- Tocco → registra con indicatore (onda/pulsante rosso), testo riconosciuto in tempo reale; tocco di nuovo o 3 s di silenzio → stop.
- Il testo viene **aggiunto** alla nota esistente (mai sostituito), preceduto da data breve: "19/10 – …". Possibilità di modificare prima di salvare.
- Pulsante grande (minimo 56 dp) pensato per essere premuto con un dito anche con mani umide.

### Tecnica
- Riconoscimento vocale del sistema (Android `SpeechRecognizer` / plugin equivalente / Web Speech API), lingua `it-IT`. **Nessun servizio a pagamento.**
- Permesso microfono richiesto alla prima pressione con spiegazione.
- Se il riconoscimento non è disponibile sul dispositivo → icona nascosta.

### Criteri di accettazione
- [ ] Dettatura in italiano aggiunta correttamente alla nota.
- [ ] Permesso negato gestito con messaggio chiaro.
- [ ] Con F3 spento nessun microfono visibile.

---

## P1 — Promemoria appuntamento automatico (Pro)

### Obiettivo
Il giorno prima il cliente riceve un promemoria con due pulsanti **"Confermo ✓"** e **"Devo spostare"**; la risposta aggiorna l'appuntamento in Groomly.

### Modalità
- **Manuale** (API spenta/non collegata/tetto superato): identico a F1 promemoria, ma con in più lo stato di conferma aggiornabile a mano dalla riga ("Ha confermato" / "Vuole spostare").
- **Automatica**: Cloud Function invia il template Meta `promemoria_appuntamento` (vedi S6).

### Regole di invio (automatico)
- Orario di invio impostabile: "il giorno prima alle 18:00" (default) oppure "N ore prima" (12/24/48).
- Non inviare se: appuntamento creato meno di 3 h prima dell'orario di invio previsto (invia subito solo se mancano > 6 h all'appuntamento, altrimenti salta), stato Disdetto/Non venuto/Completato, cliente `optOut`, numero non valido, orari silenziosi (posticipa all'apertura della finestra).
- **Idempotenza**: campo `promemoriaInviatoIl`; transazione Firestore per evitare doppi invii.
- Appuntamento spostato dopo l'invio → nuovo promemoria per la nuova data (reset del campo).

### Risposte (webhook, S6)
- "Confermo" → `statoConferma = "confermato"`; in agenda chip verde ✓.
- "Devo spostare" → `statoConferma = "richiesta_spostamento"`; notifica push/in-app alla toelettatrice "Fido vuole spostare l'appuntamento di domani"; in agenda chip arancione; pulsante "Rispondi su WhatsApp" (apre la chat).
- Risposta testuale libera → mostrata nella notifica, nessuna azione automatica.

### UI
- Agenda/giorno: chip stato conferma accanto agli appuntamenti di domani (in attesa = grigio, confermato = verde, spostare = arancione).
- Impostazioni P1: toggle, orario invio, scelta tra 2–3 **varianti di testo approvate** (in automatico il testo NON è libero: Meta approva solo template fissi con variabili), anteprima.

### Criteri di accettazione
- [ ] Modalità manuale funziona con API spenta.
- [ ] Con API di test (numero di test Meta): invio alle 18:00, pulsanti funzionanti, stato aggiornato in app entro pochi secondi.
- [ ] Nessun doppio invio anche con funzione eseguita due volte.

---

## P2 — Richiamo clienti che non vengono da tempo (Pro)

### Obiettivo
Ricordare ai clienti abituali di prenotare quando sono "in ritardo" rispetto alla loro frequenza.

### Logica
Per ogni cane con almeno 2 appuntamenti completati e **nessun appuntamento futuro**:
- `intervalloAbituale` = mediana dei giorni tra gli ultimi appuntamenti completati (max ultimi 6), oppure `intervalloRichiamoSettimane` impostato a mano nel profilo cane, oppure default impostazioni (8 settimane);
- **da richiamare** se `oggi - ultimoAppuntamento > intervalloAbituale + tolleranza` (tolleranza default 7 giorni);
- non richiamare di nuovo prima di 30 giorni dall'ultimo richiamo (impostabile); massimo 2 richiami consecutivi senza risposta, poi il cane esce dalla lista ("Cliente perso?" in un filtro dedicato).
- Più cani dello stesso cliente → un solo messaggio.

### Consenso
È un messaggio di **marketing** → richiede `consensoWhatsApp.marketing = true`. Senza consenso il cane compare in lista con icona "consenso mancante" e il messaggio non parte in automatico (resta possibile l'invio manuale solo dopo aver registrato il consenso).

### UI
- **Home → "Da richiamare (4)"** (riquadro compatto, collassabile) con: foto, nome cane, "ultima visita 11 settimane fa (di solito ogni 6)", pulsante WhatsApp (manuale) o stato "Programmato per domani 10:00" (auto).
- Profilo cane: campo opzionale "Ricordami ogni __ settimane" (visibile solo con P2 attivo).
- Impostazioni P2: toggle, intervallo default, tolleranza, pausa tra richiami, giorno/ora di invio automatico (default martedì–giovedì 10:00), testo (manuale libero / automatico varianti approvate).

Testo predefinito: "Ciao {cliente}! È passato un po' dall'ultima visita di {cane} 🐾 Se vuoi fissare il prossimo appuntamento rispondi a questo messaggio. {salone}"

### Criteri di accettazione
- [ ] Calcolo intervallo testato (mediana, override manuale, default).
- [ ] Nessun cane con appuntamento futuro in lista.
- [ ] Rispetto consenso marketing e pausa tra richiami.

---

## P3 — "Il tuo cane è pronto" con foto (Pro)

### Obiettivo
Alla pressione di "Completato" il cliente riceve la foto del *dopo* e l'avviso di ritiro.

### Flusso
1. "Completato" → se manca la foto del dopo, bottom sheet propone **"Scatta foto del dopo"** (fotocamera diretta, salvata come oggi nelle foto prima/dopo).
2. **Manuale**: share sheet con foto + testo.
3. **Automatico**: template `cane_pronto` con header immagine. L'immagine va fornita a Meta come URL pubblico temporaneo: Cloud Function genera **URL firmato Firebase Storage con scadenza breve (es. 1 h)** oppure carica il media sull'endpoint media di WhatsApp e usa l'ID. Immagine ridimensionata (lato lungo 1600 px, JPEG ~80%).
4. Idempotenza: `prontoInviatoIl`.

### Impostazioni P3
Toggle, "Chiedi conferma prima di inviare" (default sì, anche in automatico: bottom sheet "Invia ora" / "Non inviare"), "Includi foto" (sì/no), testo/varianti.

### Criteri di accettazione
- [ ] Foto corretta, orientamento corretto, peso < 1 MB.
- [ ] Nessun invio se "Completato" viene annullato dal toast entro il tempo del toast (attendere la scadenza dell'annulla prima di inviare in automatico).

---

## P4 — Auguri di compleanno del cane (Pro)

### Obiettivo
Messaggio di auguri il giorno del compleanno, con sconto facoltativo.

### Dati e UI
- Campo **"Data di nascita"** nel form cane (2 campi per riga come gli altri), **visibile solo se P4 attivo**. Accetta anche solo mese/anno (in quel caso: auguri il 1° del mese? → **no**, si invia solo se c'è giorno e mese).
- **Home → "Compleanni oggi 🎂"** (se ce ne sono).
- Impostazioni P4: toggle, ora di invio (default 09:30), sconto facoltativo (testo libero es. "10% sul prossimo bagno", entra in `{sconto}`), validità sconto (es. 30 giorni, solo informativa), testo/varianti.
- Marketing → richiede consenso marketing.
- Cani deceduti/archiviati (se esiste lo stato) esclusi; prevedere un'opzione "Non inviare auguri per questo cane" nel profilo.

Testo predefinito: "Tanti auguri a {cane} che oggi compie gli anni! 🎂🐶 {sconto} Un abbraccio da {salone}"

### Criteri di accettazione
- [ ] 29 febbraio → inviato il 28 negli anni non bisestili.
- [ ] Un solo messaggio per cane per anno.

---

## P5 — Pagella della toelettatura (Pro)

### Obiettivo
Una scheda grafica con logo da mandare al cliente dopo la toelettatura: stato del pelo, cute, comportamento e consiglio sul prossimo appuntamento.

### Contenuto (compilazione rapida a chip, tutto opzionale)
- **Pelo**: Ottimo · Qualche nodo · Molti nodi · Infeltrito (rasato)
- **Cute**: Ok · Arrossamenti · Secca · Parassiti trovati
- **Orecchie**: Pulite · Da controllare
- **Unghie**: Tagliate · Non tagliate
- **Comportamento**: sticker esistenti (angioletto, diavoletto, ecc.)
- **Prodotti usati** (testo breve, opzionale)
- **Consiglio**: "Prossimo appuntamento tra __ settimane" (precompilato da intervallo abituale/razza) + nota libera (con microfono se F3)
- Foto del dopo (opzionale)

### Flusso
- Dopo "Completato" (o dalla scheda appuntamento) → pulsante "Crea pagella".
- Generazione **immagine** (1080×1350, JPEG) e opzionalmente **PDF A5**, con logo (riusare l'upload logo del listino), colori dell'app, nome salone, nome cane, data.
- Invio: manuale (share sheet) o automatico (template con header immagine/documento).
- Salvata nell'appuntamento (`pagella`) e visibile nello storico del cane (icona 📋 nella riga dell'appuntamento).
- Se "Consiglio prossimo appuntamento" compilato → pulsante "Fissa ora" che riusa la logica esistente "Fissa anche il prossimo".

### Criteri di accettazione
- [ ] Compilazione in < 20 secondi con soli tocchi.
- [ ] Immagine leggibile su telefono, coerente in chiaro/scuro (la pagella è sempre su sfondo chiaro).

---

## P6 — Prezzo suggerito per cane nuovo (Pro)

### Obiettivo
Quando si inserisce un cane nuovo (o un appuntamento per cane nuovo) suggerire il prezzo in base ai cani simili già serviti.

### Logica
1. Cerca appuntamenti **completati** negli ultimi 12 mesi con **stessa razza** e **stesso servizio**.
2. Se ≥ 3 campioni → **mediana** del prezzo (e mediana del tempo impiegato se registrato).
3. Se < 3 campioni → usa il **listino per razza** se presente; altrimenti, se esiste un campo taglia, stessa taglia; altrimenti nessun suggerimento.
4. Arrotondamento a 1 € (impostabile 0,5 / 1 / 5).

### UI
- Nel campo prezzo dell'appuntamento: chip sotto il campo "Suggerito: 45 € · da 6 cani simili · tempo medio 1h20". Tocco → applica. Non sovrascrive mai automaticamente.
- Tocco lungo/ⓘ → elenco dei cani usati per il calcolo.
- Impostazioni P6: toggle, finestra temporale (6/12/24 mesi), arrotondamento.

### Criteri di accettazione
- [ ] Nessun suggerimento con dati insufficienti (niente numeri inventati).
- [ ] Calcolo testato con dataset di prova.

---

## P7 — Aumento listino con avviso ai clienti (Pro)

### Obiettivo
Aggiornare i prezzi in blocco e avvisare ogni cliente con il nuovo prezzo del suo cane.

### Wizard (4 passi)
1. **Cosa aumentare**: tutto il listino / solo alcuni servizi / solo alcune razze.
2. **Di quanto**: percentuale (%) o importo fisso (€), arrotondamento (0,5 / 1 / 5 €), data di decorrenza.
3. **Anteprima**: tabella listino vecchio → nuovo; elenco clienti interessati con, per ogni cane, il prezzo dell'ultimo appuntamento → nuovo prezzo previsto. Possibilità di escludere singoli clienti/cani (es. clienti storici).
4. **Avviso**: testo con `{vecchio_prezzo}` `{nuovo_prezzo}` `{data}`; invio:
   - manuale → **coda di invio**: schermata con un cliente alla volta, pulsante WhatsApp, "Avanti" (contatore 12/48);
   - automatico → invii scaglionati (max 30/ora per non sembrare spam), solo clienti con consenso servizio.

### Effetti
- Aggiorna il **listino per razza** esistente dalla data di decorrenza (salvare la versione precedente per storico/ripristino: "Annulla aumento" entro 7 giorni).
- Non modifica prezzi degli appuntamenti già fissati prima della decorrenza (opzione: "Applica anche agli appuntamenti già fissati dopo la data").
- Il listino stampabile/PDF esistente usa automaticamente i nuovi prezzi.

Testo predefinito: "Ciao {cliente}, ti informiamo che dal {data} il prezzo per {servizio} di {cane} sarà di {nuovo_prezzo} €. Grazie per la fiducia! {salone}"

### Criteri di accettazione
- [ ] Anteprima corretta e coerente con il listino.
- [ ] Ripristino versione precedente funzionante.
- [ ] Coda manuale riprende da dove si era interrotta.

---

## P8 — Collage prima/dopo con logo (Pro)

### Obiettivo
Creare un'immagine pronta per Instagram/stato WhatsApp con le foto prima e dopo e il logo del salone.

### UI
- Dal profilo cane / appuntamento (se esistono foto prima **e** dopo) → "Crea collage".
- Editor semplice:
  - **Formato**: Post 4:5 (1080×1350) · Storia 9:16 (1080×1920) · Quadrato 1:1 (1080×1080);
  - **Layout**: affiancate · sopra/sotto · "dopo" grande con "prima" in riquadro;
  - etichette "PRIMA" / "DOPO" (on/off);
  - **logo** (dal listino) in un angolo a scelta, nome salone, nome cane (on/off);
  - colore cornice (colori dell'app o bianco/nero);
  - ritaglio/zoom di ciascuna foto con le dita.
- Esporta JPEG → share sheet (Instagram, WhatsApp, galleria).

### Privacy
- Se `consensoFotoSocial` del cliente non è registrato → avviso "Il cliente ha dato il consenso a pubblicare le foto?" con pulsante per registrarlo. Non bloccante (la toelettatrice può comunque salvare per uso interno).

### Criteri di accettazione
- [ ] Rendering nitido alle risoluzioni indicate, nessun distorsione.
- [ ] Funziona offline.

---

## S1 (Salone) — Più operatori

> ⚠️ **Sezione più rischiosa**: può richiedere di separare il concetto di "utente" da quello di "salone" nel modello dati. **Prima di tutto**, l'agente analizza la struttura attuale e produce un piano di migrazione con **backup completo** di Firestore e test sull'emulatore. Implementare per ultima.

### Ruoli
- **Titolare**: tutto, incluse impostazioni, abbonamento, incassi di tutti, gestione operatori.
- **Operatore**: agenda (propria o di tutti, impostabile), profili cani, creazione/modifica appuntamenti, foto, note, pagelle; **non** vede impostazioni, abbonamento, report incassi complessivi (vede solo i propri, se il titolare lo permette).

### Funzioni
1. **Invito operatore**: Impostazioni → Operatori → "Aggiungi operatore" (nome, email, colore). Invio email di invito via Brevo (stile email Groomly esistente, mittente `noreply@groomlyapp.it`). L'operatore crea account/accede con Firebase Auth e viene collegato al salone (custom claims `salone`, `ruolo` impostati da Cloud Function).
2. **Agenda**: ogni appuntamento ha `operatoreId`; filtro rapido a chip "Tutti · Anna · Sara" con colore per operatore; in creazione appuntamento campo "Operatore" (default: chi lo crea).
3. **Incassi** (riuso della pagina Incassi esistente e dell'export per il commercialista): suddivisione per operatore, filtro.
4. **Disattivazione operatore**: perde l'accesso, i suoi appuntamenti storici restano attribuiti.
5. **Limite**: numero di operatori incluso nel piano Salone (es. fino a 5, valore in `config/globale`).
6. **Security Rules**: tutte le collezioni del salone accessibili ai membri del salone secondo ruolo.

### Criteri di accettazione
- [ ] Salone con un solo utente (titolare) funziona esattamente come prima della migrazione.
- [ ] Operatore non riesce a leggere/scrivere impostazioni e abbonamento (test rules).
- [ ] Scadenza Salone → operatori sospesi, dati intatti; riattivazione ripristina tutto.

---

## S6 — Modulo WhatsApp Cloud API (costruito ma SPENTO)

### Obiettivo
Avere tutto pronto per l'invio automatico dal **numero del salone** (WhatsApp Business + Coexistence), attivabile con un interruttore, **senza alcun costo finché è spento**.

### Principi
- Integrazione **diretta con Meta Cloud API** (nessun BSP con canone).
- Sviluppo e test con il **numero di test gratuito** fornito da Meta, verso numeri di test verificati.
- Segreti (token di sistema, app secret, verify token) in **Secret Manager / parametri segreti di Cloud Functions**, mai nel client né nel repository.
- Tutto passa dal feature gate: se `config.whatsappAutoAttivo == false` le funzioni di invio **escono subito** senza chiamare Meta.

### Componenti
1. **`waInvia` (modulo server)**: invia un template (`name`, `language: it`, componenti header/body/buttons). Gestisce errori Meta (numero non su WhatsApp, template non approvato, rate limit) con stato `fallito` + motivo nel log e **fallback alla coda manuale** (la riga ricompare in "Da avvisare" con icona ⚠).
2. **Scheduler** (`onSchedule`, ogni 15 minuti, Europe/Rome): raccoglie gli invii dovuti (P1, P2, P4) per i saloni con modalità automatica; rispetta orari silenziosi, tetto mensile, idempotenza (transazioni).
3. **Trigger Firestore**: P3 (Completato), P5 (pagella inviata), P7 (coda aumento).
4. **Webhook `waWebhook` (HTTPS)**:
   - verifica `hub.verify_token` in GET;
   - verifica firma `X-Hub-Signature-256` con app secret in POST;
   - **status** (sent/delivered/read/failed) → aggiorna `messaggi`;
   - **risposte pulsanti** (Confermo/Devo spostare) → aggiorna appuntamento (P1);
   - parole **STOP / BASTA / CANCELLAMI** → `optOut = true` + conferma;
   - messaggi testuali → notifica alla toelettatrice.
   - URL del webhook su dominio pulito se possibile (non esporre `firebaseapp.com`/`cloudfunctions.net` agli utenti — il webhook non è visibile agli utenti, ma documentarlo).
5. **Contatore e tetto**: incremento atomico `messaggiMese[YYYY-MM]` per ogni invio riuscito; superato il tetto del piano → modalità manuale fino al mese successivo + avviso in app "Hai usato tutti i messaggi automatici del mese".
6. **Onboarding salone (Fase 2, solo scaffolding ora)**: schermata "Collega WhatsApp" con istruzioni (serve WhatsApp **Business**, versione aggiornata) e pulsante che avvierà l'**Embedded Signup / Coexistence** di Meta (QR). Ora: schermata e callback predisposti, nascosti dal flag.

### Template da preparare (testi in `docs/whatsapp-templates.md`, da sottoporre a Meta in Fase 2)
| Nome | Categoria Meta | Variabili | Pulsanti |
|---|---|---|---|
| `promemoria_appuntamento` (2–3 varianti) | Utility | cliente, cane, giorno_data, ora, servizio, salone | Quick reply: "Confermo", "Devo spostare" |
| `cane_pronto` | Utility | header immagine; cliente, cane, salone | — |
| `pagella_toelettatura` | Utility | header immagine/documento; cane, salone | — |
| `variazione_prezzo` | Utility (Meta potrebbe classificarlo Marketing) | cliente, cane, servizio, nuovo_prezzo, data, salone | — |
| `richiamo_cliente` | Marketing | cliente, cane, salone | Quick reply: "Prenoto", "Non ora" |
| `compleanno_cane` | Marketing | cane, sconto, salone | — |

Nota: in modalità automatica il testo **non è personalizzabile liberamente** (solo template approvati); la toelettatrice sceglie tra le varianti. In modalità manuale il testo resta libero.

### Costi (da riverificare al momento dell'attivazione)
Meta addebita per messaggio, con tariffe diverse per categoria (Utility più economica di Marketing) e il modello di prezzo è stato modificato più volte nel 2025–2026. **Prima di accendere**, controllare il listino Meta aggiornato per l'Italia e tarare i tetti in `config/globale` in modo che il costo massimo per salone resti sotto il prezzo dell'abbonamento.

### Criteri di accettazione
- [ ] Con `whatsappAutoAttivo = false`: zero chiamate verso Meta (verificabile dai log).
- [ ] Con numero di test Meta: invio template, ricezione status, pulsanti che aggiornano l'app, STOP che imposta optOut.
- [ ] Firma webhook verificata (richieste non firmate → 403).
- [ ] Errori Meta → fallback in coda manuale.

---

## 10. Privacy e consensi (GDPR) — requisiti minimi

- Messaggi di **servizio** (promemoria, cane pronto, pagella, variazione prezzo): legati al servizio richiesto dal cliente; registrare comunque il consenso WhatsApp e offrire sempre lo stop.
- Messaggi **marketing** (richiamo, compleanno): solo con `consensoWhatsApp.marketing = true`, con data del consenso.
- **Foto sui social**: `consensoFotoSocial`.
- **Opt-out** rispettato ovunque (manuale e automatico).
- Testo informativo breve nella scheda cliente e predisposizione di un'informativa privacy del salone (link configurabile in impostazioni).
- Nessun dato personale nei log oltre il necessario; i numeri non vanno mai negli URL di Cloud Functions.
- (Non è consulenza legale: far verificare i testi da un professionista prima del lancio commerciale.)

---

## 11. Ordine di implementazione consigliato (piani /superpowers)

| Piano | Contenuto | Dipende da | Rischio |
|---|---|---|---|
| **1** | S0 Fondamenta (modello dati, feature gate, utility, rules) | — | Medio |
| **2** | S1 schermata Controlli avanzati + F1 messaggi manuali | 1 | Basso |
| **3** | F2 Affidabilità + F3 Note vocali | 1 | Basso |
| **4** | S2 Pagina abbonamento (in modalità "In arrivo") + omaggio admin | 1 | Medio |
| **5** | P1–P4 in **modalità manuale** (code Home, consensi, impostazioni) | 2 | Medio |
| **6** | P5 Pagella + P8 Collage (generazione immagini) | 1 | Medio |
| **7** | P6 Prezzo suggerito + P7 Aumento listino | 1 | Medio |
| **8** | S6 Modulo WhatsApp Cloud API (spento) + test con numero di test Meta | 5 | Alto |
| **9** | S2 Play Billing completo (verifica server + RTDN) | 4 | Alto |
| **10** | S1 Salone — più operatori (con migrazione dati) | tutti | **Alto** |

Ogni piano termina con: test verdi, verifica manuale su dispositivo in chiaro e scuro, controllo R1 ("con tutto spento l'app è identica").

---

## 12. Checklist di attivazione (Fase 2 — NON è codice, da fare quando ci saranno saloni interessati)

1. [ ] Business Verification su Meta Business Manager (gratuita).
2. [ ] Registrazione come **Tech Provider** e configurazione Embedded Signup / Coexistence.
3. [ ] Invio template a Meta e attesa approvazione; verificare la categoria assegnata a ciascuno.
4. [ ] Riverificare prezzi Meta per l'Italia e aggiornare `tettoMessaggiPro` / `tettoMessaggiSalone`.
5. [ ] Creare abbonamenti `groomly_pro` / `groomly_salone` in Play Console, collegare RTDN, testare con licenze di test.
6. [ ] Impostare `abbonamentiAttivi = true`.
7. [ ] Impostare `whatsappAutoAttivo = true`.
8. [ ] Collegare il primo salone pilota e monitorare log/costi per 2 settimane.
