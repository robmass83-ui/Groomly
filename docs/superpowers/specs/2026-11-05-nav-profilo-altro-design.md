# Navigazione: icona profilo e pagina Altro

**Perché.** La barra sotto ha sei posti. Le Impostazioni non si usano ogni giorno e cedono il posto ad Altro, un contenitore per le funzioni che le toelettature chiederanno, a partire dal Magazzino.

**Obiettivi.** Impostazioni da un'icona del profilo in alto a destra. Voce Altro nella barra, sulla rotta `/altro`. Aggiungere una funzione ad Altro è una riga in un elenco.

**Non obiettivi.** Nessun percorso `/impostazioni/*` cambia; nessuna ristrutturazione della pagina Impostazioni.

## Approcci
- **Icona nella riga del logo (scelto):** la riga è libera a destra, non si scontra con `action` né col tasto indietro e vale per tutte le testate, perché tutte passano da `BrandBar`.
- Icona nella riga del titolo: occupata da `action`, va gestita pagina per pagina. Scartato.
- Icona posizionata in assoluto da `PhoneShell`: un punto solo, ma slegata dalla testata e sposta il contenuto col banner dei dati stantii. Scartato.

## Decisioni dell'utente
- Altro a righe grandi (icona, titolo, dettaglio), più una riga fissa in fondo «Manca qualcosa? Proponilo» che apre i Suggerimenti.

## Decisioni proposte e non corrette
- Icona generica e rotonda, solo sulle pagine con la barra sotto (`ShellFrame`).
- Altro eredita l'icona a quadretti delle Impostazioni. en More, es Más, fr Plus, de Mehr.
- Pallino dati fiscali sull'icona, nascosto al collaboratore come l'avviso in Home.
- Android: da `/impostazioni` senza cronologia si va alla Home.

## Lasciato a chi costruisce
Dentro le Impostazioni l'icona risulta attiva e nessuna scheda sotto lo è. Niente freccia indietro nella pagina Impostazioni: la barra resta visibile e `SettingsPage` si tocca il meno possibile.
