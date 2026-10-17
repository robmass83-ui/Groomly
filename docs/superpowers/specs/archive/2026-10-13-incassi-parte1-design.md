# Groomly — Incassi, Parte 1: riquadro in Home e pagina Incassi

Data: 2026-10-13
Stato: design approvato in chat.

Fonte: `docs/incassi/incassi-spec.md` (§0–§13) e il prototipo `docs/incassi/incassi-prototipo.html` (schermate 1A e 1B). Misure, colori, testi e comportamenti si prendono da lì. Questo documento fissa l'ambito della Parte 1 e le decisioni prese dopo il confronto col codice. Dove i due testi dicono cose diverse, vale questo.

La Parte 2 della fonte (§14–§22: voce in Altro, pagina Report, export PDF/CSV per il commercialista) **non** fa parte di questo lavoro. Avrà una specifica e un piano propri, dopo che la Parte 1 è pubblicata.

## 1. Decisioni prese in chat

| # | Decisione |
|---|---|
| P1 | La Parte 1 si consegna e si pubblica da sola (versione patch +1, APK, release, deploy, come da `.cursor/rules/publish-update.mdc`). |
| P2 | `ui.hideAmounts` sta in `settings/main` del salone: l'occhio vale **per tutti i telefoni** del salone. |
| P3 | La logica sta tutta in `src/lib/earnings.ts`, pura e scritta in TDD. Pagina, riquadro e grafico leggono soltanto `EarningsSummary` e non ricalcolano nulla. La Parte 2 riusa lo stesso modulo. |
| P4 | Il grafico è fatto con div e CSS, senza librerie. |
| P5 | I colori del prototipo scritti a mano diventano colori nuovi in `src/theme/tokens.css`, nel tema chiaro e nel tema scuro. |
| P6 | Il link «Report ed esportazione ›» in fondo alla pagina Incassi (fonte §15) **non** si mette ora: arriva con la Parte 2. |

## 2. Cosa c'è già nel codice

- `Appointment` (`src/types/models.ts`, `src/data/local/appointments.ts`) ha `status: 'programmato' | 'completato' | 'disdetto' | 'non_venuto'`, `cancelReason?: 'cliente' | 'salone' | 'deceduto'`, `total?`, `actualDurationMin?`, `services[]` con `price` e `durationMin`. Non servono campi nuovi negli appuntamenti.
- `SettingsMain` (`src/data/local/settings.ts`) ha già i gruppi `business`, `monthlyReminder`, `backup` e `ageThresholds`, uniti in `mergeSettings`. Il passaggio a Firestore è in `src/lib/firebaseMap.ts` (`settingsToDoc`, `settingsFromDoc`).
- In Home (`src/pages/HomePage.tsx`, righe 257–270 circa) ci sono i 3 riquadri `Link` con gli stili `tile`, `tileValue` e `tileLabel`.
- Le rotte stanno in `buildRoutes` (`src/app/router.tsx`).
- Nessuna dipendenza nuova.

## 3. Logica — `src/lib/earnings.ts` (+ `earnings.test.ts`)

Tipi e funzioni come nella fonte, §3: `EarningsPeriod`, `Money`, `EarningsBucket`, `EarningsSummary`, `appointmentAmount`, `classify`, `periodRange`, `niceScale`, `buckets`, `compare`, `summarize`.

Regole (fonte D2, D3, D7):
- Importo = `a.total ?? sumPrice(a.services)`.
- `completato` → incassato.
- `programmato` con inizio ≥ adesso → previsto.
- `programmato` con inizio < adesso → `da_chiudere`. Non entra né in incassato né in previsto.
- `non_venuto`, e `disdetto` con `cancelReason === 'cliente'` → perso.
- `disdetto` con motivo `salone`, `deceduto` o senza motivo → escluso.
- Settimana da lunedì. Periodi con `to` escluso.

Il dettaglio «Per servizio» (mese) divide l'importo di ogni appuntamento tra i suoi servizi in proporzione ai prezzi. Se la somma dei prezzi è 0, lo divide in parti uguali. I servizi `extra` vanno in un'unica riga «Extra».

Test obbligatori:
- Giorno 13 e settimana 12–18 con i dati del §11 della fonte: devono dare esattamente i numeri della tabella (110/65, «3 di 5», media 37, scala 25/75; 255/435, «7 di 21», persi 35, media barre 128, scala 50/200).
- Mese: dati scritti nel test; i totali attesi si ricavano da quei dati. **Non** si usano i 1.840 €/1.120 € del prototipo, perché vengono da un seed che non è descritto.
- `niceScale`: 175 → 50/200; 60 → 25/75; 845 → 250/1000; 0 → 25/100.
- Un disdetto dal salone non entra nei persi.
- Un programmato di ieri va in `daChiudere`.
- `total` manuale vince sulla somma dei servizi.
- Settimana a cavallo di due mesi; mese che inizia di domenica.
- Confronto a parità di avanzamento, e `null` se il periodo precedente vale 0.

## 4. Impostazione `ui.hideAmounts`

- `SettingsMain.ui: { hideAmounts: boolean }`, valore iniziale `false`.
- Va aggiunta in `blankSettings` e in `mergeSettings` (`ui: { ...base.ui, ...existing.ui }`), e in `settingsToDoc`/`settingsFromDoc`. Un documento vecchio senza `ui` si legge come `hideAmounts: false`.
- Test di andata e ritorno, in locale e verso Firestore.
- Si salva subito al tocco dell'occhio, con lo stesso salvataggio usato dalle altre impostazioni.

## 5. Colori nuovi in `tokens.css`

Nomi (chiaro / scuro presi dal prototipo, righe 17–22):
- `--bar-a`, `--bar-b`: incassato.
- `--bar-sa`, `--bar-sb`: incassato selezionato.
- `--prev-a`, `--prev-b`, `--prev-line`: previsto.
- `--grid`: griglia.
- `--tip-bg`, `--tip-tx`, `--tip-sub`: fumetto.

Se un token esistente ha già lo stesso valore (`--pri-solid`, `--pri-ink`, `--line`), il nuovo colore lo richiama invece di ripetere il valore.

## 6. `src/components/earnings/EarningsChart.tsx`

Come nella fonte, §6. Props: `{ buckets, scala, mediaBarre, selectedKey, onSelect, hidden }`.
- Selezione di partenza: la decide la pagina, con le regole del §6.4 della fonte.
- Swipe e frecce ‹ › li gestisce la pagina, non il grafico.

Test con Testing Library:
- Il tocco su «Mercoledì 14» mostra «nessun incasso · +160 € previsti».
- `aria-pressed` passa alla barra toccata.
- Il fumetto della prima barra è allineato a sinistra, quello dell'ultima a destra.
- Con `hidden` l'asse Y è senza numeri e i valori sopra le barre mostrano «•».

## 7. `src/pages/EarningsPage.tsx` sulla rotta `/incassi`

Come nella fonte, §5, tranne il link al Report (P6).
- La rotta va tra le pagine, in `buildRoutes`.
- Indirizzo: `?periodo=giorno|settimana|mese&data=AAAA-MM-GG`. Senza parametri valgono settimana e oggi. Si leggono con `parseDayParam`/`localDayKey` come nell'Agenda.
- Il tocco su un appuntamento apre lo stesso foglio che usa `AppointmentRow` in Home.
- «Chiudi ›» dell'avviso «da chiudere» porta alla Home.

Test della pagina:
- Cambiare periodo mantiene la data.
- ‹ › cambiano periodo, e › è disabilitato oltre 4 settimane da oggi.
- Il tocco su un giorno della settimana apre Giorno su quella data.
- Il foglio Persi elenca i persi.
- L'occhio mostra «•••» e salva l'impostazione.
- Stato vuoto.

## 8. `src/components/earnings/EarningsTile.tsx` in Home

Come nella fonte, §4.
- La riga diventa `grid` con 4 colonne e gap 6, in quest'ordine: Oggi · Incassi oggi · Mensili · Listino.
- Il riquadro è un `Link` a `/incassi?periodo=giorno`.
- Mostra «•••» quando `hideAmounts` è attivo.
- A 360 px, se il valore «5 · 3h30» non entra, il riquadro Oggi va su due righe senza rimpicciolire il carattere.
- Vanno aggiornati i test della Home che contano o cercano i riquadri.

## 9. Fuori scope

- Tutta la Parte 2 della fonte (§14–§22), compresi `jspdf-autotable`, `shareFile.ts` e `settings.export`.
- Lo spostamento del «+» nella barra in basso.
- Totali nell'Agenda, obiettivi, vista anno.

## 10. Criteri di accettazione

Quelli della fonte, §13, senza il link al Report, più:
- [ ] Nessun colore scritto a mano nei componenti degli incassi: solo token.
- [ ] Un vecchio `settings/main` senza `ui` si apre senza errori, con gli importi visibili.
- [ ] `npm test` e `npm run build` verdi. Controllo a occhio a 360 e 390 px, in chiaro e in scuro.
- [ ] Pubblicata come da regola: versione, APK, release GitHub, deploy Firebase.

Nota: la fonte cita `.superpowers/sdd/global-constraints.md`, che nel repository non esiste. Valgono le stesse regole dette lì: italiano, stile del codice esistente, comandi PowerShell, `git add` con percorsi espliciti.
