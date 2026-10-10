# Groomly — Logo e icona

Data: 2026-10-09
Stato: approvato in dialogo, in attesa di revisione del file

I cinque SVG in `Icon and logo` sono il marchio. Si usano così come sono. Nessun tratto, colore o testo del disegno cambia.

## 1. File

I file originali restano in `Icon and logo` e non si modificano.

Copie identiche, byte uguali, in `src/assets/brand/`:

- `groomly-icon.svg` — quadrato con angoli già arrotondati
- `groomly-icon-fullbleed.svg` — lo stesso disegno fino al bordo
- `groomly-logo-verticale.svg` — marchio impilato, testo scuro
- `groomly-logo-scuro.svg` — marchio orizzontale, testo bianco
- `groomly-logo-orizzontale.svg` — marchio orizzontale, testo scuro

Le schermate importano da `src/assets/brand/`. Una copia ulteriore di `groomly-icon.svg` sta in `public/groomly-icon.svg`.

`groomly-icon-fullbleed.svg` e `groomly-logo-orizzontale.svg` si copiano e non compaiono su una schermata. Il file a tutto bordo è la fonte dell’icona di lancio Android quando esisterà il progetto Capacitor. Il file orizzontale a testo scuro resta tra le copie, senza essere mostrato: in chiaro il login usa il marchio impilato.

Niente manifest, niente PNG, niente progetto Android in questo lavoro.

## 2. Home

Al posto del riquadro da 26 px con sfumatura e della zampa Lucide si mette `groomly-icon.svg` a 26×26. Il file ha già gli angoli arrotondati, quindi non va dentro un altro riquadro colorato.

La parola «Groomly», la data, il campanello e l’ingranaggio restano. L’immagine è decorativa: `alt` vuoto, perché il titolo dice già il nome. Si toglie l’import di `PawPrint` da Home.

## 3. Login

Il logo è centrato sopra il titolo già presente («Crea accesso» o «Entra»). Il modulo, i campi e il pulsante restano.

La scelta usa la stessa risoluzione del tema già in app: `resolveTheme(settings.theme, prefersDark())` da `useSettings`, al primo disegno.

- Tema risolto chiaro: `groomly-logo-verticale.svg`, largo 168 px.
- Tema risolto scuro: `groomly-logo-scuro.svg`, largo 220 px.
- Auto segue il sistema, con la stessa funzione.

Il nome accessibile dell’immagine è «Groomly». L’altezza segue le proporzioni del file.

Senza account il tema è `auto`. Con un account già creato, anche dalla schermata «Entra», vale il tema salvato, perché le impostazioni leggono l’account anche senza sessione.

## 4. Icona del browser

In `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/groomly-icon.svg" />
```

Il file servito è la copia in `public/groomly-icon.svg`.

## 5. Cosa non cambia

Impostazioni resta la riga «Groomly v1.0», senza logo. Icone di servizio, carattere e segnali restano quelle del kit. Nessuna chiave `localStorage` nuova. Il resto delle schermate, misure e colori resta com’è.

La specifica finale, al §15, descrive l’icona dell’APK come una zampa su `--pri`. Quel progetto Android non si crea qui. Quando si farà Capacitor, l’icona di lancio si ricava da `groomly-icon-fullbleed.svg`.

## 6. Errori

I file sono locali. Non si rimette la zampa di riserva e non si aggiunge un messaggio di errore. Se un’immagine non si carica, i titoli della schermata restano.

## 7. Test

- In Home il titolo è ancora «Groomly». L’`img` nell’intestazione ha `src` uguale all’import di `groomly-icon.svg`, larghezza e altezza 26, `alt` vuoto.
- Login con tema risolto chiaro: immagine con nome accessibile «Groomly», `src` del file verticale, larghezza 168. Il titolo resta «Crea accesso» o «Entra».
- Login con tema risolto scuro: `src` di `groomly-logo-scuro.svg`, larghezza 220. Il tema scuro si forza con `theme: 'dark'` salvato sull’account, oppure con `prefers-color-scheme: dark` quando il tema è `auto`.
- Un test legge `index.html` e trova `href="/groomly-icon.svg"`.

I test già presenti di login, Home e Impostazioni restano e passano. I test di `App` tengono `// @vitest-environment happy-dom` come prima riga dove già c’è. In PowerShell non si usa `&&`.
