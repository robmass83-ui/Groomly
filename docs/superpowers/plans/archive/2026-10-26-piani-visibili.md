# Piani visibili

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Far vedere a Roberto i piani e le funzioni dal suo telefono, con il WhatsApp manuale nel base e il WhatsApp automatico solo segnato «Da sviluppare».

**Architecture:** Il livello arriva da `pro/main`. `funzioneVisibile` decide se una schermata c’è. L’operatore scrive il piano e le singole funzioni dalle liste utenti. `mostraPiani` resta spento, quindi niente paywall.

**Tech Stack:** React, Vitest, Firebase Functions.

## Global Constraints

- Non scrivere su `salon/shared`, sul salone vero di Laura né su Troddioni.
- `mostraPiani` e `abbonamentiAttivi` restano false.
- Il VIP (omaggio Salone senza scadenza) non si abbassa.
- WhatsApp automatico non ha callable, coda né crediti.
- Google Play resta in `docs/DA-FARE-ROBERTO.md`, sezione «Google Play DA FARE».

---

### Task 1: Regole pure

- [x] `src/lib/funzioniPiano.ts` e il test: VIP, base con messaggi, override, «whatsappAuto» non è una chiave.

### Task 2: Lista utenti

- [x] La riga mostra Gratis, Pro, Salone o VIP.
- [x] L’interruttore chiama `impostaPianoManuale`.
- [x] «Funzioni» apre gli interruttori e la riga «WhatsApp automatico · Da sviluppare».

### Task 3: Schermate

- [x] Le funzioni Pro e Salone seguono il piano, non il flag commerciale.
- [x] I messaggi manuali partono accesi.
- [x] Strumenti mostra «Da sviluppare».

### Task 4: Server

- [x] `impostaPianoManuale` rifiuta l’abbassamento del VIP.
- [x] `impostaFunzione` scrive solo chiavi ammesse, unendo la mappa.

### Task 5: Verifica

- [x] `npm test` verde sulle zone toccate, poi l’insieme.
