# Groomly — Listino (ciclo 6)

Data: 2026-10-09
Stato: approvato in dialogo, in attesa di revisione del file

Fonte di verità del prodotto: `GROOMLY.md` §8.9 e il riquadro 08 di `groomly-design.html`.
Questo documento copre solo la tabella **Prezzi e tempi standard**. I cicli 1–5 sono già su `master`. L’app resta in React, con i dati sul dispositivo. La toelettatrice usa solo il telefono.

## 1. Scopo

`/listino` non mostra più «In arrivo». Mostra i servizi attivi già salvati: durata sotto il nome, tre prezzi per un servizio principale, un solo prezzo per un extra. **Modifica** apre la schermata servizi che esiste già.

## 2. Fuori da questo ciclo

File PDF o immagine, **Sostituisci**, **Apri**, **Foto**, anteprima, chip **Attuale**, versioni precedenti, la frase «I prezzi in scheda cane hanno priorità sul listino», prezzi diversi per cane, `actualDurationMin`, Firebase, Storage. Il menu **+**, il campanello, Home, Animali, Calendario, Mensili e Completato non cambiano. **Indietro** di «Servizi e durate» resta `/impostazioni`.

## 3. Decisioni chiuse

| Tema | Scelta |
|---|---|
| Dati | Nessuna chiave `localStorage` nuova. Si leggono i servizi già salvati |
| Quali righe | Solo `active`. Ordine di catalogo, poi `id` crescente |
| Durata | `summarizeDuration`: «30–60m», «60m», «+20m» |
| Principale | Tre celle, ciascuna `formatEuro` di quella taglia: «€ 20» |
| Extra | Una cella con `summarizePrice`: «€ 5» se i tre importi coincidono, «€ 5–8» se no |
| Data | L’`updatedAt` più recente tra i servizi attivi. Nessuna data se non ce n’è uno |
| Account nuovo | `ensureServiceSeed`, come Impostazioni: scrive il catalogo di default solo se manca |
| Vuoto | «Nessun servizio» solo se nessun servizio è attivo. **Modifica** resta |
| Modifica | Link a `/impostazioni/servizi`. Non salva prezzi da questa pagina |

## 4. Architettura

`listinoView(services)` in `src/lib/listino.ts` è pura. Non legge `localStorage`.

```ts
type ListinoPrice =
  | { kind: 'sizes'; piccola: string; media: string; grande: string }
  | { kind: 'single'; text: string }

interface ListinoRow {
  id: string
  name: string
  duration: string
  price: ListinoPrice
}

interface ListinoView {
  updatedAt: Date | null
  rows: ListinoRow[]
}
```

Filtra `active`, ordina per `order` crescente e, a parità, per `id` con `localeCompare`. `duration` è `summarizeDuration`. Un principale ha `kind: 'sizes'` e le tre stringhe di `formatEuro`. Un extra ha `kind: 'single'` e `text` uguale a `summarizePrice`: se gli importi differiscono, l’intervallo va dal più piccolo al più grande, non da piccola a grande. `updatedAt` è il massimo tra i servizi attivi; un servizio spento, anche più recente, non conta. Nessun attivo: `rows` vuoto e `updatedAt` null.

La pagina chiama `ensureServiceSeed(uid)` e passa il risultato a `listinoView`. Non ha un altro salvataggio. Un JSON servizi illeggibile resta la schermata «Dati locali illeggibili»; `findCorruptGroomlyKey` non cambia.

## 5. Schermata

`/listino` rende `ListinoPage` dentro lo stesso guscio con barra e menu **+**. Il titolo è **Listino prezzi**. La voce in basso resta **Listino**.

Se `updatedAt` c’è, sotto il titolo c’è `Aggiornato ${format(updatedAt, 'd MMM yyyy', IT_DATE)}`. Il 3 ottobre 2026 è «Aggiornato 3 ott 2026». Il 12 settembre 2026 è «Aggiornato 12 set 2026».

Poi la riga **Prezzi e tempi standard** e il link **Modifica** verso `/impostazioni/servizi`.

La tabella ha le intestazioni **Servizio**, **Piccola**, **Media**, **Grande**. Un principale mette il nome, la durata sotto il nome, e i tre prezzi. Un extra mette il nome, la durata sotto il nome, e una cella che occupa le tre colonne delle taglie. La tabella usa la larghezza della colonna, senza una larghezza minima che faccia scorrere la pagina in orizzontale a 360 px.

Senza righe: **Nessun servizio**, niente riga **Aggiornato**, **Modifica** presente.

Non ci sono **Sostituisci**, scheda file, **Apri**, **Foto**, versioni, né la nota sui prezzi del cane.

`PlaceholderPage` non ha altri usi: si elimina, così «In arrivo» non resta raggiungibile da `/listino`.

## 6. Errori

La pagina non modifica un catalogo già presente. Il seed scrive solo quando l’account non ha ancora servizi. Non si usa `window.confirm`. Non c’è un toast su questa pagina.

## 7. Test

I test di `App` hanno `// @vitest-environment happy-dom` come prima riga. Lo spy è `vi.spyOn(localStorage, 'setItem')`, mai `Storage.prototype`. Non si alza Vitest. I warning di React Router `v7_startTransition` e `v7_relativeSplatPath` possono comparire e non fanno fallire i test.

`src/lib/listino.test.ts`:

- Bagno attivo: durata «30–60m», prezzi «€ 20», «€ 28», «€ 38».
- Un principale con 60/60/60 minuti: durata «60m».
- Gestione nodi: durata «+20m», una cella «€ 5».
- Un extra con prezzi 5, 8 e 8: una cella «€ 5–8».
- Un servizio spento non compare, e il suo `updatedAt` non diventa la data della vista.
- Due servizi con lo stesso `order`: sta sopra l’`id` che `localeCompare` considera minore.
- Nessun attivo: nessuna riga, `updatedAt` null.

`src/pages/listino.test.tsx`, orologio fermo a sabato 3 ottobre 2026 ore 12:00 locali:

- Un account nuovo apre **Listino prezzi**, vede Bagno a «€ 20», «€ 28», «€ 38», Gestione nodi a «€ 5», la riga «Aggiornato 3 ott 2026», e non vede «In arrivo».
- **Modifica** apre il titolo **Servizi e durate**.
- Con tutti i servizi spenti: «Nessun servizio», niente «Aggiornato», **Modifica** resta.

Si aggiornano i due test che oggi si aspettano il segnaposto: `il Calendario cambia giorno e tiene la data nell'indirizzo` in `appointments.test.tsx`, e `il Listino resta In arrivo` in `monthly.test.tsx`. Il titolo diventa **Listino prezzi**. «In arrivo» non c’è. Il secondo test cambia nome, perché il Listino non resta in arrivo.
