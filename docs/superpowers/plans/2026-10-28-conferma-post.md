# Conferma solo con POST — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il link in email non conferma e non rifiuta la visita finché la persona non preme il pulsante.

**Architecture:** `htmlDomandaRisposta` disegna la pagina con un modulo `POST`. `rispondiRichiestaHttp` sulla `GET` risponde con quella pagina e torna prima di `applicaPiano`. La `POST` tiene il percorso di scrittura già presente. `HEAD` e gli altri metodi rispondono 200 senza scrivere.

**Tech Stack:** TypeScript, Vitest, Cloud Functions `onRequest` in `europe-west1`.

## Global Constraints

- Chiude solo VULN-002 di `SECURITY-AUDIT.md`. VULN-003, VULN-004, VERIFY-001 e VERIFY-002 restano fuori.
- La `GET` non chiama `applicaPiano` né `mailDopoScrittura`.
- La `POST` usa gli stessi parametri del link (`salonId`, `id`, `token`, `azione`) e lo stesso `pianoRichiesta`.
- Il token non si scrive nei log (`console` assente in `rispondiRichiesta.ts`).
- Testi della pagina in italiano, inglese e spagnolo, nello stesso file di `htmlEsito`. Colori già della conferma: `#eef3f7`, `#8ADBD9`, `#4A9FCB`, `#2C4560`.
- L’URL del link non cambia: le email già spedite aprono ancora `rispondiRichiesta`.
- Non alzare `APP_VERSION`, non costruire l’APK, non pubblicare Hosting. Il deploy è solo `functions:rispondiRichiesta`.
- Commit solo dei file del task. Non `git add -A`.

### Task 1: pagina con il pulsante

`htmlDomandaRisposta` in `src/lib/htmlEsito.ts`. Il modulo è `method="post"`. L’URL nell’attributo `action` passa da `campo`, quindi `<` e `"` non diventano markup.

### Task 2: la GET non scrive

In `functions/src/piano/rispondiRichiesta.ts` il ramo `GET` chiama `htmlDomandaRisposta` e fa `return` prima di `getFirestore` e di `applicaPiano`. Il test in `functions/src/piano/rispondiRichiesta.test.ts` legge il sorgente e verifica quell’ordine.
