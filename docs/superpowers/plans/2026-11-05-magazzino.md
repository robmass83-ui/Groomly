# Magazzino: piano

**Goal:** elenco e scheda dei prodotti del salone dentro Altro.
**Architecture:** stesso percorso delle chiusure: `lib/prodotti.ts`, `data/local/prodotti.ts`, `hooks/useProdotti.ts`, funzioni in `client.ts`, regole proprie, campo facoltativo nei backup.
**Spec:** `docs/superpowers/specs/2026-11-05-magazzino-design.md`

## Global Constraints
Testi nei cinque cataloghi. Modifiche minime a `firestore.rules`, `client.ts`, `SettingsPage.tsx`. Niente merge, push, APK o deploy.

## Review Focus
- Backup vecchio senza prodotti: si legge e non cancella i prodotti presenti.
- Quantità con la virgola («0,5») e quantità non valida.
- Ditta scritta con maiuscole o accenti diversi: una sola proposta.
- Collaboratore: nessun tasto Elimina e regole che rifiutano.
- Scheda di un prodotto che non esiste più: si torna all'elenco.

### Task 1: dati
`src/lib/prodotti.ts`, `src/data/local/prodotti.ts`, `storage.ts`, `useProdotti.ts`, `client.ts`, `backupDoc.ts`, `backupBundle.ts`, `backupCollect.ts`, `leggiRipristino.ts`, `SettingsPage.tsx`, `firestore.rules`.
Test: `prodotti.test.ts`, `data/local/prodotti.test.ts`, `firestoreRules.emulator.test.ts`.

### Task 2: pagine
`MagazzinoPage.tsx`, `ProdottoPage.tsx`, `vociAltro.ts`, `router.tsx`, `systemBack.ts`, `SystemBack.tsx`, cataloghi. Test: `MagazzinoPage.test.tsx`, `systemBack.test.tsx`, `AltroPage.test.tsx`.

### Task 3: prova e commit
Titolare e collaboratore, chiaro e scuro, telefono, indietro.
