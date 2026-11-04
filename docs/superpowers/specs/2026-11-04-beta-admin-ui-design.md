# Beta B2 — Admin Manager (interfaccia) — design breve

Data: 4/11/2026. Sessione B2. Segue `2026-11-04-admin-manager-design.md` (sezioni 1–8, 10–12) e i punti 2.2, 3.3, 3.4 del prompt. Contratti dati: `2026-11-04-beta-fondamenta-design.md` § «Contratti». Qui solo ciò che quella spec lascia aperto.

## Intento
Roberto apre l'Admin Manager per capire come va la beta e per invitare saloni a gruppi. Sostituisce «Utenti Groomly» senza perdere funzioni (Tour, Toelettature, Attiva Plus/Salon, Regala 30 giorni, Torna a Go, Elimina con ELIMINA, Suggerimenti ed esportazioni).

## Approcci considerati
1. **Pagina sottile + componenti per tab, logica pura in `src/lib/adminManager.ts`** (scelto). La pagina tiene l'URL, i dati e i dialoghi dei piani di oggi; ogni tab è un componente in `src/components/admin/`. Filtri, «Da fare oggi», «Perché», riepilogo feedback e righe d'esportazione sono funzioni pure testabili senza DOM.
2. Rinominare `UsersPage.tsx` e aggiungere i tab dentro: meno file, ma un file da 2000 righe e i test diventano lenti da leggere.
3. Una pagina per tab con rotte proprie: rompe lo stato in `?tab=` voluto dalla spec.

## Decisioni di Roberto
- **Attività e città per salone** (filtri «Attivi 7 gg / Inattivi», pillola «Attivo oggi», città nella sottoriga): oggi nessun dato le fornisce. Scelta a): il client legge un campo **facoltativo** `perSalone?: Record<salonId, { ultimaAttivita?: string; citta?: string }>` nell'esito di `contatoriAdmin`; se manca, filtri attività, pillola e città **non compaiono**. È un'aggiunta al contratto: va segnalata a B1 e alla coordinatrice, non la impongo.

## Scelte del costruttore (in `DECISIONI-AUTOMATICHE.md`, sezione B2)
- Wrapper in `src/data/firebase/adminClient.ts`; in `client.ts` si esportano solo `callCallableData`, `database`, `loadFirestore` (nessuna logica cambiata).
- `impostaMostraPiani({ valore: boolean })` → `{ ok: true }`: firma della spec A2. L'interruttore è attivo; se la callable manca il rollback mostra l'errore.
- Letture operatore: `betaInviti` (tutti), `betaInviti/{id}/storico` (al dettaglio), `betaFeedback` (ultimi 400, come i Suggerimenti), `config/globale` in ascolto.
- «Feedback non visti»: id visti in `localStorage` (`groomly.am.feedbackVisti`), azzerati aprendo il tab.
- Nomi delle funzioni (Avvisami e feedback): titoli del paywall `pw…Titolo` per `FeatureKey`; `piano-plus`/`piano-salone` → «Vetrina Plus/Salon».
- Funzioni nel riepilogo feedback: quelle del piano filtrato (`livelloMinimo`), senza le nascoste, più quelle che compaiono nelle risposte.
- `EtichettaBeta` in `src/components/abbonamento/EtichettaBeta.tsx` identica alla sezione 8; i colori usano `var(--plus-s, #F0E9FD)` ecc. con ripiego, così non tocco `tokens.css` (lo fa B3). All'unione vale quella di B3.
- Pannello di accensione: segnaposto con `abbonamentiAttivi` in sola lettura (lo monta B4).
- Il dettaglio salone mantiene la `Scheda` piani di oggi (tre card piano) dentro la vista Azioni, sotto il blocco Beta: così Attiva Plus/Salon, Torna a Go, VIP, testo obbligatorio e mail non partita restano identici e i test di oggi passano. La griglia 2×2 della spec diventa: card piano + «Regala 30 giorni» + Elimina.
- Invito multiplo: «Regala 30 giorni a tutti» chiama `impostaPianoManuale(prova)` salone per salone, con conferma, e riassume riusciti/negati.

## Lasciato al costruttore
Cache di `contatoriAdmin` (in memoria, 60 s), aspetto della linea del tempo, ordine dei componenti.
