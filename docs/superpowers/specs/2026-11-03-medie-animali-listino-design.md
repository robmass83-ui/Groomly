# Medie «Animali, mensili, listino» (audit 23-26) e media 35 — design

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, Medie 23-26 e 35. Dettagli: `test-results/audit/findings/animali.md`, `visivo.md`.

## Perché
Il cliente legge sul foglio stampato un prezzo per la sua razza e l'app ne propone un altro; i mensili dicono «puntuale» a un cane fissato un mese dopo la scadenza; i tag si vedono ma non si gestiscono più; su un telefono piccolo i nomi dei servizi spariscono; il collaboratore che chiude una visita vede errori di salvataggio che non dipendono da lui. Obiettivo: un solo prezzo coerente tra foglio e agenda, conteggi dei mensili veri, niente pezzi d'interfaccia morti.

## Cosa cambia

### 23 — Il foglio per razza guida il prezzo in agenda (approccio A, scelto da Roberto)
- Il foglio per razza (`settings.priceSheet`, `src/types/priceSheet.ts`) resta com'è e resta il listino che il cliente vede.
- Ogni riga di una razza (`PriceItem` dentro `Breed.voci`) ha un abbinamento facoltativo a un servizio: campo nuovo `servizioId?: string`.
  - Abbinamento automatico per nome quando manca (`Bagno` → servizio Bagno; `Bagno + tosatura` → Bagno + taglio; `Taglio`/`Tosatura` → Taglio / tosatura; `Stripping` → Stripping), confrontando i nomi normalizzati con i servizi attivi del salone; righe senza corrispondenza restano senza abbinamento.
  - In Gestione listino (`/listino/gestione`) ogni riga di razza mostra il servizio abbinato e si può cambiare o togliere («Nessun servizio»).
- Razza del cane → razza del foglio: il testo `dog.breed`, normalizzato (minuscole, senza accenti, spazi compattati), corrisponde a una razza del foglio se è uguale a una delle parti del suo nome separate da «/» (es. «Shih Tzu» → «Maltese / Shih Tzu / Barboncino / Maltipoo»). Prima corrispondenza nell'ordine del foglio.
- Prezzo proposto per un servizio (`quotedPrice` in `src/lib/quote.ts`), in quest'ordine:
  1. prezzo personalizzato del cane (`dog.servicePrices`) — come oggi;
  2. prezzo della riga del foglio della razza del cane abbinata a quel servizio, se la riga ha un prezzo (`tipo` `da` o `fisso`; `valutazione` non ha prezzo e non conta);
  3. prezzo del servizio per la taglia — come oggi.
  La durata resta quella del servizio (o del cane), il foglio non ha durate.
- «Aggiorna prezzi» del foglio (`/listino/prezzi`) cambia il foglio e quindi, da quel momento, i prezzi proposti in agenda per le razze abbinate. Le visite già fissate non cambiano.
- Nel modulo dell'appuntamento, accanto al prezzo proposto dal foglio, una piccola indicazione «dal listino <razza>» per capire da dove viene.
- Valori iniziali: nessun cambio ai semi (i prezzi per razza sono diversi da quelli per taglia per scelta).

### 24 — Mensili: fissato in ritardo
- In `monthlyStatus` (`src/lib/cycle.ts` ~180) la scadenza di confronto per un cane fissato si calcola solo dalle visite **completate prima** dell'appuntamento fissato (oggi `openDue` scorre anche quelli dopo, ~83). Un fissato oltre la soglia risulta «Fissato in ritardo · <data>».

### 25 — Tag del cane tolti del tutto (decisione di Roberto)
- Nessuna parte dell'app mostra o modifica più i tag: scheda del cane, liste, ricerca, suggerimenti in impostazioni (`settings.tagSuggestions`), frasi i18n non più usate.
- I salvataggi non scrivono più il campo `tags`; i dati già presenti restano nel documento ma non si leggono (nessuna migrazione).

### 26 — Servizi e durate su telefono piccolo
- Riga del servizio (`src/pages/ServicesPage.tsx`): nome intero su una o due righe (parole intere), durata e prezzo sotto il nome; mai troncato a una lettera. Leggibile a 320, 360 e 390 px. Il pulsante indietro della testata allineato al titolo.

### 35 — Il collaboratore non scrive le impostazioni chiudendo una visita
- Per il ruolo `collaboratore` non partono le scritture su `settings/main` che le regole gli rifiutano:
  - premi fedeltà nella chiusura (`AppointmentPage.tsx` ~970, `HomePage.tsx` ~546): il premio non viene applicato né consumato dal collaboratore;
  - mail «pronto» (`AppointmentPage.tsx` ~999): non gli viene proposta;
  - contatore delle richieste di recensione (`AppointmentPage.tsx` ~1264);
  - sincronizzazione della coda email in Home (`HomePage.tsx` ~437).
- Il menu «Altre azioni» della visita non mostra «Elimina» al collaboratore (le regole glielo vietano; oggi la visita sparisce solo dal suo telefono).
- Nessun cambio alle regole Firestore.

## Approcci considerati
- 23: **A, il foglio per razza guida il prezzo in agenda con righe abbinate ai servizi** (scelta di Roberto: il cliente paga ciò che legge) contro B, due listini aggiornati insieme (corrispondenza mai esatta: più razze per una taglia) e C, il foglio mostra i prezzi dei servizi (si perdono i prezzi per razza, che Roberto vuole tenere).
- 25: **togliere i tag del tutto** (decisione di Roberto) contro rimettere l'editor.
- 35: **saltare le scritture per il collaboratore** contro spostarle in una callable del server (più lavoro, e fedeltà e mail sono scelte del titolare).

## Non obiettivi
- Nessuna durata nel foglio per razza.
- Nessun cambio ai prezzi delle visite già fissate.
- Nessuna migrazione dei tag esistenti.
- Nessun cambio a regole o functions.

## Decisioni di Claude (da controllare)
- Abbinamento automatico per nome con correzione manuale in Gestione listino.
- Corrispondenza della razza del cane: uguaglianza con una delle parti del nome separate da «/», dopo la normalizzazione; niente corrispondenze parziali («Yorkshire terrier» non trova «Yorkshire»).
- Il prezzo personalizzato del cane vince sul foglio.
- Righe «su valutazione» non danno prezzo: vale quello del servizio.
- Il collaboratore che chiude una visita non applica il premio fedeltà (lo vede il titolare).

## Lasciato al costruttore
- Testi esatti in en/es; aspetto dell'indicazione «dal listino».
- Test: unità per l'abbinamento automatico, la corrispondenza razza e l'ordine dei prezzi in `quotedPrice`; per `monthlyStatus` (fissato oltre soglia con un appuntamento dopo); per l'assenza dei tag; per la riga servizi (struttura); per le scritture saltate dal collaboratore e il menu senza «Elimina»; verifica nel browser sull'emulatore a 320/360/390 px.

## Rilascio
Solo APK.
