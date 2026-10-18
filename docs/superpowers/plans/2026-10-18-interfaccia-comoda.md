# Interfaccia comoda — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere Groomly più comoda da toccare e da leggere, senza cambiare route, salvataggi o flussi.

**Architecture:** Le misure, i contrasti e i controlli condivisi stanno in `src/theme` e nei componenti `src/components/ui` e `src/components/layout`. Le pagine consumano `USER_TEXT`, `TYPE` e `SIZES` e non reintroducono altezze fisse né ellipsis sui dati dell’utente.

**Tech Stack:** React 18, Vite, TypeScript, Vitest, CSS variables, Lucide.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-18-interfaccia-comoda-design.md`
- Testo dell’utente: `USER_TEXT` da `src/theme/text.ts`. Vietato ellipsis e nowrap su nomi, razze, note, tag, servizi, file, saloni.
- Toccare almeno 44 px. Bottoni con `minHeight` e altezza automatica.
- Non cambiare route, Firestore, calcoli, login vero, listino stampato.
- Non pubblicare a metà. I test del compito devono passare prima di chiudere il compito.
- Nomi barra: Mensili e Impostazioni.

---

### Task 1: Fondazione

Già applicata in questo piano: token, `TYPE`, `SIZES`, `USER_TEXT`, Button, Chip, FilterChip, Segmented, Toggle, IconButton, Toast, Dialog, Sheet, barra, splash 900/1400, Inter locale.

- [x] Controlli condivisi e token
- [ ] `npm test` sui file di theme, ui, chrome, toast

### Task 2: Home e accesso

**Files:** `src/pages/HomePage.tsx`, `src/pages/LoginPage.tsx`, test collegati.

- [ ] Griglia 2×2, chiusure in colonna, «Fissa» con nome intero, giorno vuoto con «Nuovo appuntamento», sezione `id="da-chiudere"`
- [ ] Entra mostra «Accesso…» e disabilita il pulsante; occhio allineato

### Task 3: Animali e scheda

**Files:** `src/pages/DogsPage.tsx`, `src/pages/DogPage.tsx`, `src/pages/DogFields.tsx`, test collegati.

- [ ] Schede scorrevoli alte 44, copia «animale», ordine con `aria-pressed`
- [ ] Fatti in griglia che va a capo, «Occasionale» intero, bersagli da 44

### Task 4: Agenda e appuntamento

**Files:** `src/pages/CalendarPage.tsx`, `src/pages/AppointmentPage.tsx`, `src/pages/AppointmentForm.tsx`, `src/components/appointment/CloseVisitDialog.tsx`

- [ ] Celle alte 44, alone `var(--card)`, un solo scorrimento nel foglio, nomi servizio con `USER_TEXT`

### Task 5: Mensili e incassi

**Files:** `src/pages/MonthlyPage.tsx`, `src/pages/EarningsPage.tsx`, `src/pages/EarningsReportPage.tsx`, `src/components/earnings/EarningsChart.tsx`

- [ ] Titolo Mensili, selettore sotto, nome che apre la scheda
- [ ] Frecce 44, legenda a capo, swipe solo sul titolo, «animale/animali», link Chiudi a `#da-chiudere`

### Task 6: Listino

**Files:** `src/pages/ListinoPage.tsx`, `src/pages/PriceViewPage.tsx`, `src/pages/PriceSheetPricesPage.tsx`, `src/pages/PriceSheetManagePage.tsx`, `src/pages/PriceSheetExportPage.tsx`

- [ ] Azioni sotto il titolo, tabella che va a capo, conferma elimina file, pulsante Apri sul PDF, conferma Annulla tutto, tavolo `var(--surf)`

### Task 7: Impostazioni, servizi, utenti

**Files:** `src/pages/SettingsPage.tsx`, `src/pages/ServicesPage.tsx`, `src/pages/UsersPage.tsx`

- [ ] Niente freccia sulle radici, conferma Esci, ripristino esplicito, «Copia non riuscita», riga servizio su due livelli, cerca utenti
