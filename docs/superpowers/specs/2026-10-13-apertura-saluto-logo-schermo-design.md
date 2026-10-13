# Apertura senza login, saluto, logo in alto e schermo pieno

Data: 13 ottobre 2026. Approvato in brainstorming.

## Problemi

1. All'apertura compare per qualche secondo la schermata di login vuota anche se l'accesso è già stato fatto, poi arriva la Home.
2. Manca un saluto personale nella schermata di caricamento.
3. In alto nella Home il logo è piccolo e sproporzionato; nelle altre pagine il logo non c'è e sopra il titolo resta spazio vuoto.
4. Il contenuto non usa tutto lo schermo: c'è vuoto in alto, a destra e a sinistra.

## Causa del login che lampeggia

Dal commit `380482e` `openingGate` restituisce subito la sessione locale anche con Firebase attivo. Con Firebase la sessione locale non è «dentro», quindi il cancello parte da `out`. `LoadingSplash` si chiude dopo `SPLASH_MIN_MS` (2,2 s), `LoginSwitch` mostra `LoginPage`, poi `watchAuth` risponde e porta alla Home.

## 1. Apertura senza login

- Dopo un accesso Firebase riuscito (`signInEmail`, `registerEmail`, e ogni volta che `watchAuth` riceve un utente) si salva in `localStorage` la chiave `groomly.lastSignIn` con `{ uid, email }`.
- `openingGate(firebase, reconciled, hint)`: se Firebase è attivo, la sessione locale non è `in` né `corrupt` ed esiste `groomly.lastSignIn`, il cancello parte da `pending`. Senza ricordo resta come oggi (`out`, quindi login).
- Con il cancello `pending` resta visibile `LoadingSplash`: non si monta il router e non si vede il login.
- Se dopo 10 s Firebase non ha risposto, il cancello passa a `out` e appare il login. Una risposta successiva di `watchAuth` porta comunque alla Home.
- Se `watchAuth` risponde «nessun utente», si cancella `groomly.lastSignIn` e si va al login.
- `logout()` cancella `groomly.lastSignIn`.
- Il percorso solo locale (senza Firebase) non cambia.

## 2. Schermata di caricamento con saluto

- L'avvio nativo di Android mostra solo il colore di sfondo, senza immagine: `AppTheme.NoActionBarLaunch` usa un `windowBackground`/`android:background` a tinta unita `#ECEFF4`, e in `values-night` `#0C111A` (lo sfondo scuro dei token). Android conosce solo il tema del sistema, non quello scelto nell'app: se i due sono diversi, il primo istante ha il colore del sistema e poi passa a quello dell'app. Il primo fotogramma è uno schermo vuoto, poi parte il logo animato.
- `LoadingSplash` mostra al centro il logo animato esistente (`groomly-logo-animato.svg` / `groomly-logo-animato-scuro.svg`, scelto con `data-theme`) più grande: larghezza `min(84vw, 380px)`.
- Sotto il logo compare il saluto `Ciao Laura` / `Ciao Roberto` / `Ciao!` con un'animazione di entrata (dissolvenza e leggera salita) che parte a 2,4 s, quando la scritta Groomly ha finito di comporsi. Testo grande (circa 22 px, peso 700, colore `--tx`).
- Il nome si ricava dall'email del ricordo `groomly.lastSignIn` (subito, prima che Firebase risponda) oppure dall'account dell'ingresso appena fatto, con la funzione pura `greetingName(email)` in `src/lib/greeting.ts`. Confronto senza maiuscole e spazi:
  - `laura.masala@tiscali.it` → `Laura`
  - `masala.roberto@hotmail.it`, `robmass83@gmail.com` → `Roberto`
  - qualsiasi altra email → nessun nome, il testo è `Ciao!`
- Senza ricordo, cioè quando dopo la schermata va mostrato il login, il saluto non compare.
- Durata minima della schermata: 3,6 s (`SPLASH_MIN_MS`), così il saluto resta leggibile per oltre un secondo; poi dissolvenza di 350 ms come oggi. Se Firebase è più lento, la schermata resta finché il cancello non lascia `pending`.
- Con «riduci animazioni» del sistema (`prefers-reduced-motion`) il saluto compare senza movimento.

## 3. Logo in alto in tutte le pagine (disposizione A)

- Nuovi asset in `src/assets/brand/`: `groomly-logo-testata.svg` (logo orizzontale senza «TOELETTATURA», viewBox ritagliato) e `groomly-logo-testata-scuro.svg` (stessa cosa da `groomly-logo-scuro.svg`).
- Nuovo componente `BrandBar` (`src/components/layout/BrandBar.tsx`): il logo allineato a sinistra, un solo `<img alt="Groomly">` con la versione chiara o scura scelta da `useDocumentTheme()` (legge `data-theme` su `<html>` e lo segue con un `MutationObserver`). Può essere un `div` o un `h1` (in Home il titolo della pagina è il logo, nome accessibile «Groomly»). Due misure: `large` (altezza 44 px) per la Home, `regular` (altezza 30 px) per le altre pagine. Nuove voci in `SIZES.brandBar`.
- Home: `BrandBar large` al posto dell'icona da 26 px e del titolo «Groomly»; sotto resta la data (`formatHomeDate`) in piccolo. Nessun saluto nella Home.
- Tutte le altre pagine con `Header` (Animali, Agenda, Avvisi/Mensili, Listino e sottopagine, Impostazioni, Servizi, scheda cane): `BrandBar regular` sopra la riga del titolo. Il punto unico è `Header`: la riga del logo vive lì, così titolo, freccia indietro e pulsanti restano invariati sotto. Le pagine che non usano `Header` ma hanno un titolo di pagina ricevono `BrandBar` direttamente.
- Non hanno il logo: il foglio dell'appuntamento (`Sheet`), i dialoghi e la pagina di login (che ha già il suo logo).

## 4. Contenuto a tutta larghezza, stesse dimensioni

- Testi, chip, icone, pulsanti e spaziature interne restano identici a oggi. Cambia solo la larghezza disponibile.
- `PhoneShell`: niente più `maxWidth: 390`; la colonna usa tutta la larghezza fino a un tetto di 640 px per i tablet, centrata.
- `bottomNav.css`: `left`/`right` seguono lo stesso tetto di 640 px invece di 390.
- `Sheet`: larghezza `min(100%, 640px)`. `Dialog` resta a `min(100%, 390px)` perché è una finestra centrata.
- Vuoto in alto: `MainActivity` consuma anche gli inset `displayCutout` oltre a `systemBars` (padding nativo sull'unione dei due). In più `PhoneShell` usa `var(--safe-top)`: nel browser vale `env(safe-area-inset-top, 0px)`, nell'app Android (classe `native` su `<html>`, messa da `applyPlatform` in `main.tsx`) vale `0px`, perché lì la barra di stato è già fuori dalla WebView. Così il margine non viene mai contato due volte.
- I nomi del listino con il «+» senza spazi (es. «Bagno+sistemazione») vanno a capo subito dopo il «+» (`<wbr>` dopo ogni «+», funzione `breakAfterPlus`), invece che a metà parola. `overflow-wrap: anywhere` resta come ultima risorsa per parole lunghissime. La dimensione del testo non cambia.

## Test

- `greetingName`: le tre email note, maiuscole e spazi, email sconosciuta, email vuota.
- `openingGate`: con Firebase e ricordo → `pending`; senza ricordo → `out`; senza Firebase → sessione locale; `corrupt` resta `corrupt`.
- Sessione: il ricordo si scrive all'accesso, si cancella con `logout` e con risposta «nessun utente»; dopo 10 s senza risposta il cancello passa a `out`.
- `LoadingSplash`: mostra `Ciao Laura` con il ricordo di Laura, `Ciao!` con email sconosciuta, nessun saluto senza ricordo.
- `BrandBar`: presente in Home (misura grande) e nelle pagine con `Header`; assente nel foglio appuntamento.
- `PhoneShell`: niente limite a 390 px, tetto a 640 px (aggiorna `shell.test.tsx`).
- Verifica sul telefono dopo la pubblicazione: niente login all'apertura, saluto corretto, niente vuoto in alto e ai lati.
