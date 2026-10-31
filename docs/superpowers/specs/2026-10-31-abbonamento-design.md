# Abbonamento: piani Go, Plus, Salone e loghi per piano

Data: 2026-10-31

## Perché

Groomly passa a quattro piani con nome proprio: **Groomly Go** (gratis, il vecchio «Base»), **Groomly Plus** (abbonamento mensile, nel codice resta `pro`), **Groomly Salone** (abbonamento, `salone`) e **Groomly VIP** (solo Roberto e Laura, controlli da amministratore e sviluppatore, ricavato con `eVip`).

Oggi «Controlli avanzati» sta nelle Impostazioni e mostra a chiunque, anche a chi ha Go, tutti gli interruttori dei piani a pagamento con i lucchetti. Vogliamo invece una vetrina dei piani, moderna e colorata come Glovo Prime: chi non è abbonato vede cosa ottiene; chi è abbonato vede i propri interruttori. Il piano si riconosce dal logo in alto, non più da una pillola di testo.

Il pagamento dal Play Store non c'è ancora. Per adesso Roberto attiva Plus o Salone a mano dalla pagina Utenti del profilo VIP, che già lo permette. In futuro «Abbonati» verrà collegato al Play Store (RevenueCat, `src/lib/billing.ts`).

## Obiettivi

- Una nuova scorciatoia **Abbonamento** nella griglia in alto delle Impostazioni, a destra di «Avvisi» (riempie lo spazio vuoto della griglia a due colonne).
- Una pagina Abbonamento con tre schede colorate: Go, Plus, Salone.
- Una pagina per ciascun piano:
  - **Go**: sempre «Attivo». Mostra subito gli interruttori gratuiti di oggi, il blocco `BASE` di `StrumentiPage` (Messaggi, Affidabilità).
  - **Plus / Salone, non abbonato**: vetrina con testata colorata del piano, logo del piano, titolo, elenco delle funzioni con spunte, una sezione «Come funziona», poi in basso fisso il prezzo al mese e un grande pulsante **Abbonati** (in inglese «Subscribe»). Salone elenca «Tutto di Plus» più le sue funzioni.
  - **Plus / Salone, abbonato**: stessa testata con «Attivo» e, sotto, gli interruttori di quel piano. Plus contiene il blocco `PRO` di oggi e `LinkCondivisione`. Salone contiene anche la voce Collaboratori (`/impostazioni/pro`).
- Toccando **Abbonati** compare un messaggio «In arrivo». È provvisorio e va tolto quando arriva il pagamento.
- **Controlli avanzati sparisce dalle Impostazioni.** La pagina di oggi viene divisa nei tre piani.
- **Logo dentro l'app per piano**: Go usa il logo attuale, Plus il logo Plus, Salone il logo Salone, VIP il logo VIP, in chiaro e in scuro. Il logo in alto nelle Impostazioni diventa un po' più grande.
- La pillola «Piano · Base» sotto il nome della toelettatura sparisce.

## Fuori dallo scopo

- L'icona dell'app sul telefono non cambia.
- Il pagamento vero, cioè l'acquisto dal Play Store, il rinnovo e la disdetta.
- La schermata di accesso e lo splash di caricamento restano con il logo Go, perché prima del login il piano non si conosce.
- `PaywallSheet` e i blocchi già presenti in altre pagine (Report, Home…) restano come sono.

## Da evitare (sarebbe un fallimento anche se funziona)

- Un utente Go che vede gli interruttori dei piani a pagamento.
- La vetrina con l'aspetto di una normale pagina di impostazioni: deve sembrare la pagina di un prodotto.
- Un utente abbonato che perde l'accesso a un interruttore che oggi ha.

## Vincoli

- Si riusano i livelli esistenti (`Livello`, `livelloElenco`, `funzioneVisibile`, `usePiano`) e la pagina Utenti per l'attivazione manuale. Non si aggiungono campi a Firestore.
- I testi vanno in it/en/es (`src/i18n`).
- Lo stile segue i componenti esistenti (`ShellFrame`, `Header`, `Card`, `Toggle`, i token CSS) e funziona in tema chiaro e scuro.
- Dopo la modifica si pubblica l'APK come al solito.

## Approcci considerati

- **A. Tre pagine piano, ciascuna con i propri interruttori — scelto.** Ogni piano ha la sua pagina e Go mostra subito i suoi interruttori. Costa un po' di più perché `StrumentiPage` va divisa e i suoi test spostati.
- **B. Vetrine nuove e Controlli avanzati intatta, raggiungibile solo da abbonati.** Più veloce, ma gli interruttori gratuiti di Go finirebbero dentro una pagina visibile solo agli abbonati. Scartato.
- **C. Una pagina con schede Go/Plus/Salone in alto.** Scartato prima ancora di proporlo, perché le schede in alto sono appena state tolte da Gestisci account (1.1.156).

## Cosa è stato deciso

- Percorsi: `/impostazioni/abbonamento`, `/impostazioni/abbonamento/go`, `/impostazioni/abbonamento/plus` e `/impostazioni/abbonamento/salone`. Il vecchio `/impostazioni/strumenti` rimanda a `/impostazioni/abbonamento`, così i collegamenti esistenti (`vociMenu.ts`) non si rompono.
- Chi vede cosa:
  - Go vede la vetrina di Plus e Salone.
  - Plus vede Plus attivo con i suoi interruttori e la vetrina di Salone.
  - Salone e VIP vedono tutti e tre i piani attivi.
- Logo per livello: deciso in `BrandBar` in base a `usePiano().livelloNome`.

## Scelte mie (da controllare)

- **Colori dei piani**, presi dai loghi: Plus viola `#7B3FE4`, Salone oro `#C99200`. Go usa il blu primario attuale.
- **File dei loghi**: Plus e Salone usano `groomly-plus-scritta(-scura).svg` e `groomly-salon-scritta(-scura).svg`, copiati in `src/assets/brand/`. VIP non ha la versione «scritta», quindi usa `groomly-vip-logo-orizzontale.svg` / `groomly-vip-logo-scuro.svg`.
- **Il logo per piano vale ovunque compare `BrandBar`** (Impostazioni, Home, Agenda…), non solo nelle Impostazioni. La misura sale da 30 a circa 36 px solo nelle Impostazioni. Da regolare a occhio.
- **Collaboratori**: vedono Abbonamento e gli interruttori in sola lettura. Al posto di «Abbonati» vedono «Lo attiva il titolare» (testo esistente `pianoLoAccendeTitolare`).
- **La scorciatoia Abbonamento è sempre visibile**, indipendentemente dal flag `mostraPiani`, perché ora è l'unica strada verso gli interruttori.
- **«Pro» diventa «Plus» in tutti i testi visibili** (per esempio «Si sblocca con Pro» e «Servizio Pro», nella pagina Utenti e nelle tre lingue). Nel codice il valore resta `pro`.
- **Il messaggio «In arrivo»** usa il dialogo o l'avviso già presenti nell'app. Il pulsante passa da `compra()` di `billing.ts`, così domani basta agganciare lo store.

## Lasciato a chi costruisce

- La disposizione esatta della vetrina (testata con curva come nell'esempio Glovo, icone delle funzioni, ombre).
- I testi dell'elenco delle funzioni, ricavati dalle `FeatureKey` di `pro` e `salone` e dalle frasi i18n esistenti.
- Come dividere `StrumentiPage` in componenti e come aggiornare i test esistenti (`strumenti.test.tsx`, `SettingsPage.test.tsx`, `brandBar.test.tsx`).

## Prezzi

- Segnaposto approvati: **Plus 9,99 €/mese**, **Salone 19,99 €/mese**. Stanno in un unico punto del codice per poterli cambiare facilmente.
