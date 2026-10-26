# Menu Impostazioni e Gestisci account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riorganizzare Impostazioni e aggiungere Gestisci account Groomly senza perdere funzioni, con eliminazione account conforme a Play e GDPR.

**Architecture:** L’hub resta `SettingsPage` e riusa i fogli già presenti. Le pagine nuove (account a tab, legale, info, suggerimenti, licenze, elimina a passi) stanno su route dedicate. La decisione di eliminare, il blocco VIP e la frase di conferma sono funzioni pure testate prima della UI. La Cloud Function esegue la cancellazione e l’email.

**Tech Stack:** React, React Router, vitest, Firebase Functions, Brevo, i18n `it` / `en` / `es`.

## Global Constraints

- Colori, font e componenti Groomly già in tema chiaro e scuro. Stile compatto, chip, ombre leggere, highlight al tocco, divisori.
- Ogni voce attuale si sposta secondo la tabella della spec `docs/superpowers/specs/2026-10-26-menu-account-design.md`.
- Stringhe nuove solo nel vocabolario IT / EN / ES.
- `MOSTRA_INVITO_COLLEGA` resta `false`.
- L’account di Laura, il salone `shared` e il titolare VIP non si eliminano. I test non li cancellano.
- Indirizzo legale: solo «Quartu Sant’Elena (CA)».
- Non copiare Family, Simple mode, regali, guida, business Uber, gruppi, ads, location sharing.

---

### Task 1: Regole pure

- [ ] Test e implementazione di passi salone, cani del mese, conferma `ELIMINA`, account protetto, flag invito.
- [ ] Aggiornare `decisioneEliminazione`: blocco protetto, abbonamento Play non blocca, `avvisoAbbonamentoPlay`.
- [ ] Testo email di conferma puro.

### Task 2: Hub Impostazioni

- [ ] Intestazione, scorciatoie, anello, card mese, gruppi, Esci, versione.
- [ ] Stessi nomi accessibili richiesti dai test esistenti (Tema, Lingua, Funzioni Pro, Strumenti, Backup, Notifiche, servizi, tag, archivio).
- [ ] Deep link di stato: `openBusiness`, `openBackup`, `openLingua`.

### Task 3: Account, legale, info, elimina

- [ ] Route e pagine. Tab con `?scheda=`.
- [ ] Flusso elimina a passi, incluso il blocco protetto.
- [ ] Preferenze `emailPromo` e `telefonoRecupero` nelle impostazioni.
- [ ] Password, email, Google e revoca altri dispositivi sul client, attivi solo con Firebase.

### Task 4: Server e pagina pubblica

- [ ] `eliminaAccountPer` cancella Firestore, Storage `users/{uid}/` e Auth, poi invia Brevo.
- [ ] `esciAltriDispositivi` revoca i refresh token.
- [ ] Aggiornare il percorso indicato in `hosting/elimina-account`.

### Task 5: Verifica

- [ ] `npm test` sui file toccati, poi la suite.
- [ ] Controllo visivo chiaro e scuro dell’hub e dei tab.
- [ ] Pubblicazione secondo la regola di release solo a suite verde.
