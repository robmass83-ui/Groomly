# Lingua del messaggio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La lingua dell’app segue il luogo e si cambia solo nei settaggi; la lingua del cliente si sceglie nel WhatsApp precompilato e nel listino stampato.

**Architecture:** Una funzione pura mappa il fuso su `it` | `en` | `es`. I settaggi mostrano solo quella scelta. Il compositore messaggi e la stampa del listino hanno un popup centrale con le tre lingue. Il ricordo del messaggio è per numero di telefono, in localStorage.

**Tech Stack:** React, Vite, Vitest, Dialog esistente, cataloghi `it` / `en` / `es`, token CSS `--pri`, `--pri-s`, `--pri-solid`, `--on-pri`.

## Global Constraints

- Testo visibile solo dai cataloghi `src/i18n/it.ts`, `en.ts`, `es.ts`. `en` e `es` restano `Record<keyof typeof it, string>`. Stesse chiavi, stesso ordine.
- Niente emoji come icone. Lucide, `aria-hidden` se c’è il testo.
- Tocchi almeno 44px. Popup solo `Dialog` centrale, mai `Sheet` per questa scelta.
- Colori solo token. Il bottone primario usa `--pri-solid` e `--on-pri`.
- Non alzare la versione, non fare commit, non fare push, non pubblicare.
- Non chiedere il GPS.
- `npm test` esclude `DogsPage.test.tsx`. I test di questo lavoro stanno nella suite normale.

---

### Task 1: Fuso e settaggi

**Files:** `src/i18n/linguaLuogo.ts`, `src/i18n/linguaLuogo.test.ts`, `src/i18n/linguaLocale.ts`, `src/i18n/scritturaLingua.ts`, `src/i18n/scritturaLingua.test.ts`, `src/pages/SettingsPage.tsx`, `src/pages/SettingsPage.test.tsx`, `src/i18n/it.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`

- [ ] `linguaDalLuogo('Europe/Rome')` è `it`, `Europe/London` è `en`, `Europe/Madrid` / `Atlantic/Canary` / `Africa/Ceuta` sono `es`, `Africa/Cairo` e `UTC` e stringa vuota sono `null`.
- [ ] `leggiLinguaAttiva(telefono, fuso)` restituisce la lingua salvata se c’è; altrimenti il luogo; altrimenti `linguaDelTelefono`. Il fuso predefinito è quello di `Intl`.
- [ ] `primoAvvio` restituisce sempre `linguaClienti: null`.
- [ ] Nel dialog Lingua togliere il radiogruppo dei clienti e `onLinguaClienti`. Sotto il titolo, la frase aggiornata di `linguaMessaggiDettaglio`: italiano «Groomly usa questa lingua. In Italia si propone l’italiano e in Inghilterra l’inglese. Puoi cambiarla.»; inglese «Groomly uses this language. In Italy it suggests Italian, and in England it suggests English. You can change it.»; spagnolo «Groomly usa este idioma. En Italia propone italiano y en Inglaterra inglés. Puedes cambiarlo.»
- [ ] Il test «la lingua della persona non cambia quella dei clienti» diventa: titolare e collaboratore, aperto Lingua, vedono solo «Lingua del dispositivo» e la frase sul luogo, e non vedono «Lingua dei clienti». Scegliere English salva `groomly.lingua` e non scrive `linguaClienti`.
- [ ] Eseguire `npx vitest run src/i18n/linguaLuogo.test.ts src/i18n/scritturaLingua.test.ts src/pages/SettingsPage.test.tsx`.

### Task 2: WhatsApp e listino

**Files:** `src/lib/linguaMessaggio.ts`, `src/lib/linguaMessaggio.test.ts`, `src/components/piano/PulsanteMessaggi.tsx`, `src/pages/strumenti.test.tsx`, `src/pages/PriceSheetExportPage.tsx`, `src/types/priceSheet.ts`, `src/lib/schemas.ts`, cataloghi

- [ ] `leggiLinguaMessaggio` / `scriviLinguaMessaggio`: chiave `groomly.linguaMessaggio.` + sole cifre. Senza cifre non si scrive e si usa la lingua predefinita.
- [ ] `PulsanteMessaggi` usa `Dialog`. Radiogruppo `frasi.linguaMessaggio` («Lingua del messaggio» / «Message language» / «Idioma del mensaje»). Tre nomi nativi. Frase `linguaMessaggioAiuto`: «Puoi scriverlo nella lingua di questo cliente, anche se è un turista.» / «You can write it in this client’s language, even for a tourist.» / «Puedes escribirlo en el idioma de este cliente, también si es un turista.»
- [ ] I tipi restano un radiogruppo con i nomi già in `strumPromemoria`, `strumConferma`, `strumPronto`, `strumRichiamo`, `strumAuguri`. Cambiare lingua azzera la bozza e rigenera `testoMessaggio`. Il link si chiama ancora `strumApriWa`.
- [ ] All’apertura, lingua ricordata per quel telefono, altrimenti `useLingua().lingua`. Non leggere `settings.linguaClienti`.
- [ ] Il test strumenti non imposta `linguaClienti`. Apre il messaggio, vede l’italiano (`Ciao`), sceglie English, e il link contiene `Hello Giulia` e `Made with Groomly`. Riaprendo lo stesso cane, English è già selezionato.
- [ ] `opzioni.lingua` opzionale `it|en|es` nel tipo e in `priceSheetSchema`. Sulla stampa, riga che apre un `Dialog` titolato `linguaListino` («Lingua del listino» / «Price list language» / «Idioma de la lista»). Valore iniziale `sheet.opzioni.lingua ?? linguaValida(settings.linguaClienti) ?? lingua`. Al cambio, `persistOpzioni({ lingua })`. I tre `PriceSheetPaper` usano quella lingua.
- [ ] Chiavi nuove in fondo a `it`, poi `en`, poi `es`, prima della chiusura: `linguaMessaggio`, `linguaMessaggioAiuto`, `linguaListino`.
- [ ] Eseguire `npx vitest run src/lib/linguaMessaggio.test.ts src/pages/strumenti.test.tsx src/pages/listino.test.tsx src/i18n/frasiFisse.test.ts` e `npx tsc --noEmit`.

Non pubblicare.
