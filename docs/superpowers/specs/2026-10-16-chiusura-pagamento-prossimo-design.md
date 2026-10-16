# Groomly — Chiusura senza salvare, nota, pagamento e «Fissa il prossimo»

Data: 2026-10-16
Stato: design approvato in chat, in attesa di revisione del file.

Cinque modifiche al flusso di chiusura dell'appuntamento. Si consegnano e si pubblicano insieme, come da `.cursor/rules/publish-update.mdc`. Questo documento modifica `2026-10-14-piu-e-chiusura-design.md` (§5 e §6) dove le regole sono diverse: vale questo.

## 1. Decisioni prese in chat

| # | Decisione |
|---|---|
| D1 | «Chiudere senza salvare?» è un popup centrale (`Dialog`), non più un riquadro in cima alla scheda. |
| D2 | La nota è obbligatoria solo se cambia il **prezzo**. Se cambia solo il tempo, si salva senza nota. Vale in **Completare** e in **Correggi**. |
| D3 | Il popup chiede il pagamento: **POS**, **Contanti** o **N/A**. Una scelta è obbligatoria. In **Correggi** si cambia. |
| D4 | **N/A** è valido solo con prezzo 0. Con un prezzo diverso il campo Prezzo diventa rosso, con sotto «Con N/A il prezzo deve essere 0». |
| D5 | **N/A** con prezzo 0 non chiede la nota. |
| D6 | La scelta si fa con tre riquadri grandi su una riga (versione A del companion). |
| D7 | In Incassi, tra il grafico e i tre KPI, due riquadri **POS** e **Contanti** con icona, cifra e numero di cani. Sotto, in piccolo, «Non indicato» e «Offerti (N/A)» solo se presenti (versione B). |
| D8 | **Fissa il prossimo** apre **Nuovo appuntamento** con cane e servizi compilati, data e ora vuote. Non scrive niente prima di **Salva**. |
| D9 | Approccio: si allargano i pezzi esistenti (`Dialog`, `closeVisit.ts`, `Appointment`, `earnings.ts`, rotta `/appuntamenti/nuovo`). Nessuna collezione nuova, regole Firestore invariate. |

## 2. Fuori da questo lavoro

Pagamenti divisi (metà POS e metà contanti), resto, mance, export per il commercialista. Il riquadro «Incassi oggi» in Home non cambia. **Non venuto**, **Disdici**, anticipa e posticipa restano come oggi. Gli appuntamenti già completati non vengono riscritti.

## 3. «Chiudere senza salvare?» al centro

`CloseConfirm` in `src/pages/AppointmentPage.tsx` non si disegna più dentro `AppointmentSheet` come primo figlio. Si apre con il `Dialog` centrato (`src/components/layout/Dialog.tsx`), titolo **Chiudere senza salvare?**, sopra la scheda e con lo sfondo scuro, in qualunque punto della pagina ci si trovi.

- Bottoni in riga: **Resta** (primario) e **Chiudi senza salvare** (secondario). Restano i nomi di oggi.
- La X, il tocco sullo sfondo, Esc e il tasto indietro del telefono valgono come **Resta**: chiudono la domanda, il modulo resta com'è.
- Quando esce la domanda e cosa fa **Chiudi senza salvare** non cambiano: nuovo appuntamento e modifica di un appuntamento con modifiche non salvate.
- La prop `confirm` di `AppointmentSheet` sparisce, oppure resta vuota; il popup si monta accanto alla scheda, come già il popup «Cane Mensile» in `withRhythm`.

## 4. Popup «Completare» e «Correggi»

`CloseVisitDialog` si apre da **Completato** sul dettaglio, **Completato** in Home, **Correggi** sul dettaglio completato e dalla matita dello storico in `DogPage`. Tutti ricevono le stesse regole.

Ordine dei campi: **Prezzo**, **Ore** e **Minuti**, **Pagamento**, **Nota**.

### Pagamento

Etichetta «Pagamento». Sotto, tre riquadri uguali in una griglia di 3 colonne, gap 8:

| Riquadro | Icona | Valore |
|---|---|---|
| POS | `icona-pos-chiaro.svg` / `icona-pos-scuro.svg` | `'pos'` |
| Contanti | `icona-contanti-chiaro.svg` / `icona-contanti-scuro.svg` | `'contanti'` |
| N/A | riquadro `var(--surf)` con il testo «N/A» | `'na'` |

- Le icone vengono da `Icon and logo/icone2/` e si copiano in `src/assets/icons/`. La versione chiara o scura segue il tema attivo.
- Ogni riquadro è un `button` con `aria-pressed`, nome accessibile «POS», «Contanti», «N/A», alto almeno 44 px. Icona 46 px, nome sotto.
- Scelto: bordo 2 px `var(--pri)`, sfondo `var(--pri-s)`, spunta in alto a destra. Quando uno è scelto, gli altri hanno opacità 0,45. Nessuno scelto: tutti pieni, bordo `var(--line)`.
- Alla prima chiusura nessuno è scelto. In **Correggi** è scelto quello salvato; un vecchio completato senza metodo parte senza scelta.
- Nessun colore scritto a mano: solo variabili già in tema.

### Quando si accendono i bottoni

Condizioni comuni: prezzo valido, tempo valido, un pagamento scelto, e nessun errore N/A.

Errore N/A: pagamento `'na'` e prezzo diverso da 0 (in centesimi). Il campo Prezzo prende lo stile d'errore già usato per «Importo non valido» e sotto c'è «Con N/A il prezzo deve essere 0» (`TYPE.meta`, `var(--bad)`). Se il prezzo non è un importo valido, vale il messaggio «Importo non valido» e non questo.

| Cosa è cambiato rispetto al previsto | Pagamento | Nota |
|---|---|---|
| Niente | POS, Contanti, N/A (solo se il previsto è 0) | Si usa **Nessuna modifica** |
| Solo il tempo | POS o Contanti | Non serve |
| Il prezzo (con o senza il tempo) | POS o Contanti | Obbligatoria, 1–280 caratteri dopo il taglio degli spazi |
| Il prezzo, che ora è 0 | N/A | Non serve |

- **Nessuna modifica** (solo in **Completare**): attivo se valgono le condizioni comuni e prezzo e tempo sono quelli previsti.
- **Salva e completa** (in **Completare**) e **Salva** (in **Correggi**): attivi se valgono le condizioni comuni, c'è una variazione, e la nota c'è quando la tabella la chiede. In **Correggi** **Salva** è attivo anche senza variazione, come oggi.
- La X, il tocco fuori e **Annulla** sono sempre disponibili e non scrivono nulla.

### Cosa si scrive

`closePatch` restituisce anche `paymentMethod`. Il resto resta com'è, con una differenza: una nota scritta si salva sempre, anche quando non era obbligatoria (solo tempo, N/A, oppure **Nessuna modifica**). Vuota o di soli spazi resta assente.

| Campo | Valore |
|---|---|
| `total` | la cifra, solo se diversa dal previsto; con N/A e previsto > 0 è `0` |
| `actualDurationMin` | minuti veri, sempre |
| `adjustmentNote` | la nota tagliata, se non vuota; altrimenti si toglie |
| `paymentMethod` | `'pos'`, `'contanti'` o `'na'` |

## 5. Dati

`Appointment.paymentMethod?: PaymentMethod`, con `export type PaymentMethod = 'pos' | 'contanti' | 'na'` in `src/types/models.ts`.

- Passa da lettura e scrittura locale (`src/data/local/appointments.ts`), da `appointmentToDoc` / `appointmentFromDoc` in `src/lib/firebaseMap.ts` e dal salvataggio di chiusura, come fanno già `total` e `adjustmentNote`.
- Un valore assente o diverso dai tre si legge come assente. Un appuntamento vecchio si apre senza errori.
- Nessuna collezione nuova, `firestore.rules` invariato.

## 6. Pagina Incassi

### Logica in `src/lib/earnings.ts`

`EarningsSummary` prende un campo nuovo:

```ts
pagamenti: {
  pos: { importo: number; count: number }
  contanti: { importo: number; count: number }
  nonIndicato: { importo: number; count: number }
  offerti: number
}
```

- Contano solo gli appuntamenti del periodo classificati `incassato` (cioè `completato`), con lo stesso importo di `appointmentAmount`.
- `pos` e `contanti` per metodo. `offerti` = numero dei completati con `'na'`; il loro importo è 0 e non va da nessuna parte. `nonIndicato` = completati senza metodo.
- `pos.importo + contanti.importo + nonIndicato.importo` = `totali.incassato` (un N/A con `total` 0 aggiunge 0).
- La pagina e i riquadri leggono soltanto questi numeri.

### Riquadri in `src/pages/EarningsPage.tsx`

Tra la `Card` del grafico e la griglia dei tre KPI, una griglia di 2 colonne, gap 6:

- **POS**: icona 36 px, etichetta «POS», cifra con `maskEuro`, sotto «N cani» (`1 cane`, `2 cani`).
- **Contanti**: uguale.
- Con zero completati i riquadri mostrano «€ 0» e «0 cani».

Sotto la griglia, una riga `TYPE.meta` `var(--tx3)`, solo se almeno una parte è presente: «Non indicato € 15», «Offerti (N/A) 1», separati da « · ». Con l'occhio chiuso le cifre sono «•••», i conteggi restano.

Valgono per Giorno, Settimana e Mese, e seguono il periodo scelto.

## 7. «Fissa il prossimo»

`bookNext` in `AppointmentPage` non crea più l'appuntamento da solo.

1. Se il cane ha già un programmato futuro, esce la domanda di oggi («… ha già un appuntamento il … Crearne un altro?»). **Non creare** chiude, **Crea** prosegue.
2. Si naviga a `/appuntamenti/nuovo?da=prossimo&cane={dogId}&servizi={id1,id2}` e, se l'appuntamento completato ha `seriesId`, `&serie={seriesId}`. Navigazione con push: chiudendo si torna al dettaglio.

Sulla rotta `/appuntamenti/nuovo`:

- Il cane è scelto. I servizi sono quelli passati, tolti quelli non più attivi (`activeServiceIds`, già esistente).
- Con `da=prossimo` data e ora partono vuote. Senza `da=prossimo` tutto resta come oggi (senza `data` il giorno parte da oggi), così i link esistenti non cambiano.
- `serie` valida (stringa non vuota) finisce in `write.seriesId` al salvataggio.
- I prezzi sono quelli attuali della scheda del cane, come per ogni nuovo appuntamento.
- **Salva** passa dal salvataggio normale: sovrapposizioni e domanda «Cane Mensile» comprese.
- Il toast «Fissato per …» con **Annulla** sparisce insieme alla creazione automatica.

## 8. Errori

Salvataggio fallito: toast «Salvataggio non riuscito», tono `plain`, popup ancora aperto, nessun valore cambiato. Non si usa `window.confirm`.

## 9. Test

I test dimostrano i comportamenti, non i pixel.

- **Chiusura**: con modifiche non salvate, Indietro apre un `dialog` «Chiudere senza salvare?». **Resta** e la X lo chiudono lasciando il modulo; **Chiudi senza salvare** esce. Senza modifiche si esce subito. I test esistenti in `AppointmentPage.test.tsx`, `appointments.test.tsx` e `monthly.test.tsx` si aggiornano dove cercano il riquadro.
- **Regole** (`closeVisit.test.ts`): solo tempo diverso + POS → si salva senza nota; prezzo diverso + Contanti senza nota → no; prezzo 0 + N/A senza nota → sì; N/A con prezzo 38 → errore e nessun bottone attivo; nessun pagamento → nessun bottone attivo; previsto 0 + N/A → **Nessuna modifica** attivo.
- **Popup** (`CloseVisitDialog.test.tsx`): i tre riquadri con `aria-pressed`; la scritta «Con N/A il prezzo deve essere 0» compare e sparisce; **Correggi** parte con il metodo salvato; cambiare solo le ore in **Correggi** accende **Salva**.
- **Scrittura**: `paymentMethod` si scrive alla chiusura e alla correzione, in locale e nella mappa cloud, e si rilegge. Un documento senza il campo si apre.
- **Incassi** (`earnings.test.ts`, `EarningsPage.test.tsx`): totali e conteggi per POS, Contanti, Non indicato, Offerti; somma uguale all'incassato; riga piccola assente senza Non indicato e senza Offerti; «•••» con l'occhio chiuso.
- **Fissa il prossimo** (`completato.test.tsx`): apre **Nuovo appuntamento** con cane e servizi scelti e data vuota; nessun appuntamento nuovo finché non si salva; con un futuro già presente chiede prima; `seriesId` passa al nuovo. I test che oggi si aspettano «Fissato per …» si riscrivono.

## 10. Criteri di accettazione

- [ ] I cinque punti funzionano sul telefono, in chiaro e in scuro, a 360 e 390 px.
- [ ] `npm test` e `npm run build` verdi.
- [ ] Versione patch +1, APK, release GitHub e deploy Firebase come da regola del progetto.
