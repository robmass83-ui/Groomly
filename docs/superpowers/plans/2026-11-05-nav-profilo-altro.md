# Navigazione profilo e Altro: piano

**Goal:** spostare le Impostazioni sull'icona del profilo e aggiungere la pagina Altro.
**Architecture:** `ShellFrame` offre un contesto alla testata; `BrandBar` mostra l'icona solo se il contesto c'è. Altro legge un elenco di voci filtrato per ruolo.
**Spec:** `docs/superpowers/specs/2026-11-05-nav-profilo-altro-design.md`

## Global Constraints
Ogni testo nei cinque cataloghi `src/i18n/{it,en,es,fr,de}.ts`, vicino alla sua area. Niente merge, push, APK o deploy. Modifiche minime a `SettingsPage.tsx`.

## Review Focus
- Logo lungo (Plus, Salone) a 320 px: logo e icona non si sovrappongono.
- Tedesco e francese: le etichette della barra non si tagliano.
- Pagine senza `ShellFrame` (invito, scheda cane): nessuna icona.
- Suggerimenti aperti da Altro: la freccia torna ad Altro.
- Collaboratore con dati fiscali mancanti: nessun pallino.

### Task 1: icona del profilo
Files: `src/components/layout/ProfiloTestata.tsx`, `profiloTestata.css`, `BrandBar.tsx`, `src/pages/ShellFrame.tsx`, `PhoneShell.tsx`. Test: `brandBar.test.tsx`, `chrome.test.tsx`.
Produce: `ProfiloContext` (`{ avviso: boolean } | null`), `ProfiloTestata({ avviso })`. Link `/impostazioni`, nome «Impostazioni» o «Impostazioni, dati da completare», `tax-dot` dentro il link.

### Task 2: voce Altro e pagina
Files: `BottomNav.tsx`, `src/pages/AltroPage.tsx`, `src/lib/vociAltro.ts`, `router.tsx`, cataloghi. Test: `chrome.test.tsx`, `AltroPage.test.tsx`.
Produce: `VOCI_ALTRO`, `vociVisibili(voci, ruolo)`.

### Task 3: tasto indietro e guide
Files: `src/lib/systemBack.ts`, `SystemBack.tsx`, `InfoGroomlyPage.tsx`, `SuggerimentiPage.tsx`. Test: quelli di `systemBack`.
Scelta `'home'`: `/impostazioni` senza cronologia.

### Task 4: prova nell'app e commit
Titolare e collaboratore, chiaro e scuro, larghezza telefono, pallino, indietro.
