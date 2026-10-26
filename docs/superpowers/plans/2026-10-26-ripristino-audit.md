# Ripristino audit 360 — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ogni tocco descritto nell’audit arriva a un esito visibile e corretto, senza fingere funzioni che non hanno una fonte dati.

**Architecture:** Il foglio Pro diventa il `Dialog` già usato dall’app. L’indietro di Android, senza storia, sale al padre. Drive ricorda l’uid che ha detto sì. I testi passano dal catalogo. I suggerimenti sono documenti creati dal salone e letti solo dall’operatore.

**Tech Stack:** React, React Router, Vitest, Firestore rules, Cloud Functions, Capacitor DriveAuth.

## Global Constraints

- WhatsApp automatico resta «Da sviluppare», senza interruttore.
- Il foglio Pro copre lo schermo anche se Play non vende gli abbonamenti.
- Scollega sta a destra sulla stessa riga, e l’email di Drive compare una sola volta.
- Un uid non eredita il consenso Drive di un altro uid.
- Il grazie dei suggerimenti compare dopo la creazione del documento, non dopo la mail.
- La lista d’attesa non mostra un numero di posti inventato.
- `it`, `en` ed `es` hanno le stesse chiavi.

---

### Task 1: Foglio Pro, indietro, pagine vuote, righe Pro

- [x] `PaywallSheet` usa `Dialog`. `usePiano` lo apre ogni volta che `paywall` è valorizzato.
- [x] `systemBackChoice` senza storia torna a Impostazioni o a Incassi.
- [x] Messaggi, Piano e Privacy hanno guscio e Indietro.
- [x] Le righe Pro incluse navigano o aprono il controllo vero; le altre dicono che la parte automatica non è pronta.
- [x] Home legge le richieste `nuova` e non mostra posti finti.

### Task 2: Lingua e listino di serie

- [x] Stringhe fisse di backup, gestione listino, Pro, Utenti, export e toast nel catalogo.
- [x] `formatPriceApp` e `nomeVoceListino` ricevono la lingua sulle righe del listino.

### Task 3: Drive per salone

- [x] `leggi` / `collega` / `conferma` / `scollega` con uid.
- [x] Domanda «Usare questa email anche per questo salone?».
- [x] Scollega a destra.

### Task 4: Suggerimenti

- [x] Modulo, regole, mail su creazione, elenco operatore.

### Task 5: Verifica

- [x] Test dei file toccati, poi `npm test`.
