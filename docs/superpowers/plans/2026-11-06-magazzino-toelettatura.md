# Magazzino toelettatura — piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (Roberto ha chiesto l'esecuzione in autonomia, in questa sessione). I passi usano `- [ ]`.

**Goal:** rifare il Magazzino per la toelettatura senza cambiare il flusso di oggi.

**Architecture:** conversione in lettura in `prodottoDaDoc`; logica pura in `src/lib/prodotti.ts` e nel nuovo `src/lib/stimeMagazzino.ts`; pagine che leggono da lì. Stime dietro `haAccesso(stato, 'stimeMagazzino')`.

**Tech Stack:** React, TypeScript, Vitest, Firestore rules, ExcelJS.

**Spec:** `docs/superpowers/specs/2026-11-06-magazzino-toelettatura-design.md`; catalogo e formule in `docs/MAGAZZINO-TOELETTATURA-PIANO.md`.

## Global Constraints
- Campi nuovi facoltativi, flusso di oggi invariato.
- Nessuno script riscrive dati in blocco; I Pelosetti non si toccano; test solo su emulatori `demo-`.
- Ogni frase nuova in it, en, es, fr, de; `lingue.test` verde.
- Test: `npx vitest run --exclude ".claude/**" --exclude "**/node_modules/**"`.
- Stile: compatto, chip, variabili CSS (chiaro e scuro).

## Review Focus
1. Prodotto spostato a mano in `cura` con il nome del disinfettante: non deve tornare in `pulizia` (test in Task 1).
2. Filtro su «Altro» quando l'ultimo prodotto esce dalla categoria: la pagina torna a Tutti, non resta vuota (Task 4).
3. Modifica di un prodotto dalla scheda: i campi non mostrati (`mlPerCane` in Go, `confrontoIl`, `apertoIl`) non si perdono (Task 3).
4. Annulla dopo –: torna anche `apertoIl` (Task 3).
5. Backup vecchio con categorie vecchie: stesso checksum, ripristino legge i prodotti (Task 3).

---

### Task 1: Categorie e conversione in lettura
**Files:** `src/lib/prodotti.ts`, `src/lib/catalogoProdotti.ts` (tabella `NOMI_VECCHI`), `src/components/magazzino/categorie.ts`, test `src/lib/prodotti.test.ts`.
**Produces:** `CATEGORIE_PRODOTTO` (`lavaggio, finitura, cura, macchinette, pulizia, tocchi, varie`), `CATEGORIE_SCELTA` (senza `varie`), `categoriaDaDoc(data)`, `ETICHETTA_CATEGORIA`.
- [ ] Test: ogni riga della tabella §4; nome congelato in 5 lingue; `uso` presente blocca la conversione per nome; categoria sconosciuta o assente → `varie`; `unita` assente → `l`.
- [ ] Implementare, aggiornare pagine e test al nuovo elenco, verde, commit.

### Task 2: Catalogo e kit base
**Files:** `src/lib/catalogoProdotti.ts`, `src/i18n/{it,en,es,fr,de}.ts`, `src/components/magazzino/SceltaProdotto.tsx`, `KitBase.tsx`.
- [ ] Test: 14 voci nel kit, voci tolte assenti, ogni voce ha la frase, `mlPerCane` e diluizione come §7.
- [ ] Catalogo §5, chiavi nuove e tolte in 5 lingue, confronto sulla parte prima della « / ». Lingue verdi, commit.

### Task 3: Campi nuovi, scheda, regole, backup
**Files:** `prodotti.ts`, `DatiProdotto.tsx`, `ProdottoPage.tsx`, `client.ts`, `firestore.rules`, `firestoreRules.emulator.test.ts`, `registroModello.ts`, `registroXlsx.ts`, `backup` test.
**Produces:** su `Prodotto`: `uso, diluizione, apertoIl, mesiDopoApertura, costo, prezzoVendita, mlPerCane, giorniConsegna, confrontoIl`; `dosaggio(n)`; `fornitori()` con `giorniConsegna`.
- [ ] Test: lettura documento vecchio → valori `null`/`salone`; – azzera `apertoIl`, + no; checksum fisso di un bundle vecchio; foglio Magazzino solo con prodotti; regole su tipi giusti e sbagliati.
- [ ] Implementare, verde, commit.

### Task 4: Salone / Vendita
**Files:** `prodotti.ts` (`filtraProdotti`), `MagazzinoPage.tsx`, `DatiProdotto.tsx`.
- [ ] Test: chip Vendita, categorie solo `salone`, Tutti e Da ordinare entrambi, chip Altro solo se serve e ritorno a Tutti.
- [ ] Implementare, verde, commit.

### Task 5: Scadenze
**Files:** `prodotti.ts` (`scadenzaProdotto`, `daButtare`), `MagazzinoPage.tsx`, `ProdottoPage.tsx`.
- [ ] Test: fine mese (31 gen + 1 mese), senza `mesiDopoApertura` nessun avviso, striscia e tasto «Ho aperto un pezzo nuovo».
- [ ] Implementare, verde, commit.

### Task 6: Quanto mi dura e costo per lavaggio
**Files:** nuovo `src/lib/stimeMagazzino.ts`, nuovo `src/hooks/useStimeMagazzino.ts`, `piano.ts`, `paywallTesti.ts`, `models.ts`, `firebaseMap.ts`, `ServiceSheet.tsx`, pagine.
**Produces:** `lavaggiRecenti(appointments, dogs, services, adesso)`, `stimaProdotto(p, lavaggi)`, `sottoStima`, `costoLavaggio(p)`, `confrontoTanica(p, stima)`, `correggiConsumo`, `daOrdinare(prodotti, sotto?)`.
- [ ] Test: tutte le taglie, solo `completato` e 30 giorni, `senzaBagno`, personali, consegna + 7, Go spento e anteprima, confronto dopo 2 taniche.
- [ ] Implementare, verde, commit.

### Task 7: Riepilogo
**Files:** `stimeMagazzino.ts` (`riepilogoMagazzino`), nuovo `src/components/magazzino/Riepilogo.tsx`, `MagazzinoPage.tsx`.
- [ ] Test: solo `salone`, carico iniziale escluso, incidenza senza incassi assente, card assente senza costi.
- [ ] Implementare, verde, commit.

### Task 8: Test a 360°
**Files:** nuovo `scripts/test360/magazzino.ts`.
- [ ] 20 saloni finti su emulatori, prodotti e completati in tutte le taglie; controllo indipendente di stime, scadenze, Da ordinare, filtri; prova nel browser a 360 px, chiaro e scuro.
- [ ] Cancellare i dati di test, aggiornare `PROGRESS.md`.
