# Agenda: visite accavallate e razza — piano

> **For agentic workers:** esecuzione in questa sessione con superpowers:test-driven-development, poi superpowers:verification-before-completion. Steps use checkbox (`- [ ]`).

**Goal:** il salone inserisce visite accavallate dopo un avviso, e la razza compare in Giorno, Settimana, lista del Mese e Home.

**Architecture:** solo app, nessuna function o regola. Modulo e avviso cambiano stato e testi; `placeAppointments` limita le colonne a due e l'impilamento esistente di `pushGroup` fa il resto; un aiuto `razzaDaMostrare` decide la riga della razza per tutte le viste.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-05-agenda-accavallati-razza-design.md`

## Global Constraints
- Ogni testo in `src/i18n/{it,en,es,fr,de}.ts`, accanto alla sua area.
- Non toccare `BottomNav`, `Header`, `router`, `functions/`, `src/i18n/paginaPubblica.ts`, `src/hooks/useAppointments.ts`, `SettingsPage`.
- Niente push, merge, deploy o APK.

## Review Focus
- Razza lunghissima a larghezza telefono: si taglia con i puntini, la scheda non si allarga (Task 3).
- Tre o più cani alla stessa ora: tutti toccabili, nessuno coperto (Task 2).
- Visita da confermare: la razza si vede anche senza servizi (Task 3).
- Omonimi: la razza non compare due volte (Task 3).
- Orario occupato già scelto e poi cambiato: l'avviso segue l'orario attuale (Task 1).

---

### Task 1: Orario occupato selezionabile e nuovo avviso

**Files:** Modify `src/pages/AppointmentForm.tsx:835-851`, `src/i18n/{it,en,es,fr,de}.ts`. Test `src/pages/appointments.test.tsx`, `src/pages/AppointmentPage.test.tsx`, `src/pages/monthly.test.tsx`.

- [ ] Test: in `appointments.test.tsx`, «un orario occupato si sceglie e chiede conferma»: il bottone `09:00` ha `data-busy`, è abilitato; dopo il click compare `Si sovrappone a Luna 09:00–10:00`; Salva apre il dialogo `Gli appuntamenti si accavallano, inserire lo stesso?`; `Inserisci lo stesso` salva due visite. Stessa prova con due cani dello stesso proprietario. Un orario fuori apertura resta `disabled`. Cambiando orario su uno libero l'avviso sparisce.
- [ ] Eseguire: fallisce.
- [ ] Codice: `disabled={fuori}`, `textDecoration: 'none'`. Valori nuovi di `formOccupato` e `formSalvaComunque` (le chiavi restano):
  - it: `Gli appuntamenti si accavallano, inserire lo stesso?` / `Inserisci lo stesso`
  - en: `These appointments overlap. Add it anyway?` / `Add anyway`
  - es: `Las citas se solapan. ¿Añadirla igualmente?` / `Añadir igualmente`
  - fr: `Les rendez-vous se chevauchent. L’ajouter quand même ?` / `Ajouter quand même`
  - de: `Die Termine überschneiden sich. Trotzdem eintragen?` / `Trotzdem eintragen`
- [ ] Aggiornare i test esistenti con i nuovi testi. Eseguire `npx vitest run src/pages/appointments.test.tsx src/pages/AppointmentPage.test.tsx src/pages/monthly.test.tsx`: verdi.
- [ ] Commit.

### Task 2: Massimo due colonne nel Giorno

**Files:** Modify `src/lib/calendarView.ts:125-165`, `src/pages/CalendarPage.tsx:530-533`. Test `src/lib/calendarView.test.ts`, `src/lib/calendarLayout.test.ts`, `src/pages/appointments.test.tsx`.

**Produces:** `placeAppointments` con stessa firma, `columnCount` mai sopra `MAX_COLONNE_GIORNO = 2`.

- [ ] Test: tre visite alle 10:00 da 60 minuti danno `columnCount` 2 e colonne {0, 1}; la terza va nella colonna che si libera prima; con `daySegments` la terza ha `top` sotto la scheda della sua colonna. Quattro visite: nessuna coppia nella stessa colonna ha schede sovrapposte. Nel calendario due visite accavallate non hanno `outline`. Aggiornare «affianca 10:00, 10:30 e 11:00».
- [ ] Eseguire: fallisce.
- [ ] Codice: se nessuna colonna è libera e ce ne sono già due, prendere quella con fine minore. Togliere `style.outline` da `AppointmentBlock`.
- [ ] Eseguire `npx vitest run src/lib/calendarView.test.ts src/lib/calendarLayout.test.ts src/pages/appointments.test.tsx`: verdi.
- [ ] Commit.

### Task 3: Razza nelle viste

**Files:** Modify `src/lib/dogList.ts`, `src/lib/calendarLayout.ts`, `src/pages/CalendarPage.tsx`, `src/components/calendar/WeekRows.tsx`, `src/components/domain/AppointmentRow.tsx`. Test `src/lib/dogList.test.ts`, `src/lib/calendarLayout.test.ts`, `src/components/calendar/WeekRows.test.tsx`, `src/pages/appointments.test.tsx`.

**Produces:** `razzaDaMostrare(dog: Dog | undefined, mark: string | null): string`; `contentMinHeightPx` con `hasBreed?: boolean`.

- [ ] Test: `razzaDaMostrare` torna la razza senza spazi attorno; `''` senza cane, con razza vuota o solo spazi, e quando `mark` contiene già la razza (anche con maiuscole diverse). `contentMinHeightPx` cresce con `hasBreed`. `WeekRows`: razza sulla riga del servizio, con `textOverflow: ellipsis`; nessun elemento vuoto per ospite e cane senza razza; visita da confermare mostra la razza. `AppointmentRow`: razza sotto i servizi; Giorno: razza sotto i servizi con altezza sufficiente.
- [ ] Eseguire: fallisce.
- [ ] Codice: aiuto, parametro altezza (4 + 18 px), riga nelle tre viste con `data-razza=""`, `whiteSpace: nowrap`, `overflow: hidden`, `textOverflow: ellipsis`, `minWidth: 0`, `maxWidth: 100%`.
- [ ] Eseguire i test delle aree: verdi. `npx tsc --noEmit` pulito.
- [ ] Commit.

### Task 4: Prova nell'app

- [ ] Anteprima in locale: due cani stessa ora con stessa persona e con persone diverse, tre cani, cane senza razza, ospite, razza lunga; in chiaro e scuro a 375 px; viste Giorno, Settimana, Mese e Home.
- [ ] `npx vitest run` e `npx tsc --noEmit` completi.
