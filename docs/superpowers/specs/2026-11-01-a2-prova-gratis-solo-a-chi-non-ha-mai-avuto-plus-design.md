# A2 — La prova gratis solo a chi è su Go e non ha mai avuto Plus o Salone

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A2. Specifica breve (lavoro piccolo-medio).

## Perché
«Prova gratis 30 giorni» oggi controlla solo il segno `provaUsata`:
- l'app la offre nella vetrina dei piani a chi non ha usato la prova, qualunque piano abbia (`src/components/abbonamento/Vetrina.tsx:91`);
- il server (`functions/src/piano/avviaProva.ts:20` con `decisioneProva`, `functions/src/piano/scriviPiano.ts:105`) la scrive sopra il piano attuale.

Così un salone in grazia diventa «in prova» e un omaggio senza scadenza diventa una prova che scade. In più Groomly non ricorda sempre che un salone ha avuto un piano superiore: un omaggio riportato a Go dall'operatore, o un abbonamento pagato senza prova, lasciano «prova disponibile».

## Decisioni di Roberto
1. La prova gratis da sé (pulsante nell'app) è concessa **solo a chi oggi è su Go e non ha mai avuto Plus o Salone** in nessuna forma (prova, abbonamento pagato, omaggio).
2. Chi era Plus e torna a Go **non** ha la prova: per riavere Plus deve riabbonarsi.
3. **L'operatore (Roberto) continua a poter attivare prove, omaggi e regali senza limiti** dalla pagina operatore; se poi riporta il salone a Go, vale la regola 1 (niente prova da sé).
4. Strada **A**: una sola regola condivisa da app e server; il server ricorda d'ora in poi ogni piano superiore; nessuna modifica ai dati esistenti.

## Obiettivi
1. **Regola condivisa** in `src/lib/piano.ts` (usata da app e functions, come `statoPiano`):
   `provaConcessa(doc: ProMain | undefined, adesso: Date): boolean` = vero solo se `statoPiano(doc, adesso).livello === 'base'` **e** il documento non mostra traccia di un piano superiore: `provaUsata !== true`, `piano` non `'pro'`/`'salone'`, `fonte` non `'play'`/`'omaggio'`/`'manuale'`/`'prova'`. Documento assente → vero.
2. **Server, prova da sé** (`avviaProva.ts`): resta solo per il titolare del proprio salone (controlli di oggi) e scrive solo se `provaConcessa(snap.data(), adesso)`; altrimenti `failed-precondition` con un messaggio chiaro (es. «Prova non disponibile»). Nessuna scrittura in quel caso.
3. **Memoria del piano superiore**: `scriviPiano` (`functions/src/piano/scriviPiano.ts:28`) mette `provaUsata: true` ogni volta che scrive un piano `'pro'` o `'salone'` (prova, omaggio, bypass manuale). Un ritorno a Go da operatore (`campiBase`) conserva il segno, come oggi.
4. **Operatore** (`impostaPianoManuale`, azione `'prova'` in `campiAzione`): può avviare la prova anche se `provaUsata` è vero (decisione 3). Le altre azioni operatore restano come oggi.
5. **App**: la vetrina (`Vetrina.tsx:91`) e il foglio «Passa a Plus» (`src/hooks/usePiano.tsx:201`) mostrano «Prova gratis» solo se `provaConcessa(...)` sul documento del piano letto da `usePiano` (resta anche il controllo del ruolo titolare). Dove la prova non è concessa resta il solo «Abbonati».
6. **Test**: `provaConcessa` per Go puro (nessun documento; `piano: 'base'` senza tracce) → vero; attivo, prova in corso, grazia, disdetto valido, omaggio, Salone → falso; Plus scaduto pagato (`fonte: 'play'`), omaggio riportato a Go (`piano: 'base'`, `provaUsata: true`), prova scaduta → falso. Server: `avviaProva` su grazia/omaggio/ex-Plus rifiuta senza scrivere; su Go puro scrive la prova. `scriviPiano` con `'pro'`/`'salone'` → `provaUsata: true`. Operatore: prova concessa anche con `provaUsata: true`. App: la vetrina non mostra «Prova gratis» a un salone in grazia o ex-Plus.

## Non obiettivi
- Ripristinare i piani già sovrascritti da prove sbagliate (vale da ora in poi).
- L'integrazione dei pagamenti Play (oggi non scrive `pro/main` nel codice); quando arriverà dovrà passare da `scriviPiano` (così eredita il segno).
- Cambiare durata o contenuto della prova.

## Anti-obiettivi
- Togliere la prova a un Go puro che non l'ha mai avuta.
- Limitare le azioni dell'operatore.

## Approcci
- **A — regola condivisa + segno scritto d'ora in poi (scelta)**: legge le tracce già presenti nei documenti, nessuna migrazione.
- B — segno d'ora in poi + script una tantum su tutti i saloni in produzione: più passaggi, tocca i dati veri (anche di Laura).
- C — solo nascondere il pulsante nell'app: il server accetterebbe ancora.

## Lasciato al builder
- Testo esatto del messaggio di rifiuto (in it/en/es se l'app lo mostra; altrimenti l'errore generico già gestito).
- Dove esporre `provaConcessa` in `usePiano` (campo nuovo accanto a `provaUsata`).
- Deploy: functions `avviaProva` e `impostaPianoManuale` (con `FUNCTIONS_DISCOVERY_TIMEOUT=60`) + release APK, dopo il merge.
