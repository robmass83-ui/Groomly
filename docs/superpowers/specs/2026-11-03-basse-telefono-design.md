# Basse «Telefono» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Telefono**; dettagli in `test-results/audit/findings/android.md`.

## Perché
Due difetti dell'APK. (1) Ogni pulsante foto chiede il permesso della fotocamera (`guardCaptureClick` in `src/lib/photoCapture.ts`), ma poi apre solo il selettore di Android: il permesso non serve e la fotocamera non si apre mai. (2) A ogni avvio la pagina riceve un errore `Cannot read properties of undefined (reading 'triggerEvent')`: `MainActivity.onResume` chiama `triggerWindowJSEvent("groomlyResume")` prima che la pagina e il ponte di Capacitor siano caricati.

## Decisioni (prese con Roberto il 3 novembre)
1. **Scatta foto** dove si fotografa il cane: foto del cane (ritratto e riquadro «Altra foto»/«Ingrandisci»), galleria del cane («Aggiungi»), foto della visita (Prima / Dopo / Aggiungi). Toccando il pulsante compare una piccola scelta **«Scatta foto»** / **«Scegli dalla galleria»**. Nel riquadro della foto del cane che già esiste, «Altra foto» diventa le due voci.
2. **Logo** (Account, gestione listino) e **file del listino**: solo galleria/file come oggi, senza nessuna richiesta di permesso.
3. **Galleria** non chiede mai il permesso della fotocamera.

## Approcci
- **A — scelto.** «Scatta foto» usa un `<input type="file" accept="image/*" capture="environment">`: il WebView di Capacitor apre la fotocamera e chiede lui il permesso (CAMERA è nel manifest) solo in quel momento. «Scegli dalla galleria» usa l'input di oggi senza `capture`. La foto segue la stessa strada di adesso (`onFile`/`onAdd`: compressione, salvataggio, coda offline). Se il permesso è negato compare l'avviso già esistente `schedaPermessoFoto`.
- **B — scartato.** `Camera.getPhoto` di `@capacitor/camera`: restituisce un altro formato da convertire in `File`, più codice e più modi di rompersi senza vantaggi visibili.

## Errore all'avvio
`MainActivity.onResume` manda `groomlyResume` solo se la pagina è pronta (es. JS con controllo `window.Capacitor && window.Capacitor.triggerEvent`, oppure saltare il primo resume subito dopo `onCreate`). Nessun cambiamento visibile: chi ascolta `groomlyResume` riceve gli stessi eventi una volta caricata la pagina.

## Fuori dallo scopo
- Niente server, niente regole: solo APK.
- Nel browser (fuori dall'APK) nessuna scelta nuova: i pulsanti aprono il selettore come oggi (decisione di Claude).

## Lasciato al costruttore (scelte di Claude)
- Forma della scelta (foglio/`Dialog` condiviso o hook riusato nei tre punti), nomi; testi nuovi in it/en/es con chiavi nuove.
- Come accorgersi del permesso negato senza perdere il gesto: l'input della fotocamera va cliccato dentro il tocco, **non** dopo un'attesa su `Camera.requestPermissions()` (il commit 66364e6 l'aveva tolto apposta). Per esempio: all'evento `cancel` dell'input, `Camera.checkPermissions()` e avviso se `denied`.
- Se togliere `guardCaptureClick` e l'uso di `@capacitor/camera` dove non servono più.

## Verifica
Test unitari della scelta (nativo: due voci, galleria senza `capture`, fotocamera con `capture="environment"`; web: nessuna scelta) e dei punti logo/listino senza richiesta di permesso. Sull'emulatore Android (APK di prova): galleria senza dialogo del permesso; «Scatta foto» chiede il permesso e apre la fotocamera; nessun `pageerror` `triggerEvent` all'avvio (letto via CDP).
