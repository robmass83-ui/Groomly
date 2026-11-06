# Magazzino su misura per la toelettatura

**Parte da:** `docs/MAGAZZINO-TOELETTATURA-PIANO.md` (il piano di Roberto) e dal Magazzino della 1.1.196. Qui stanno solo le decisioni: il catalogo, i campi e le formule sono nel piano e valgono così come sono scritti, salvo dove sotto c'è scritto altro.

**Perché.** Il Magazzino di oggi è generico. Una toelettatrice ragiona per fasi di lavoro, guarda diluizione, data di apertura e costo, e separa ciò che consuma da ciò che rivende. Un magazzino pensato per i consumi è un punto di forza di Groomly.

**Obiettivi.** Categorie per fasi, catalogo ripulito, scheda con i dati utili, Salone/Vendita, scadenze, «Quanto mi dura?», costo per lavaggio, riepilogo.

**Non obiettivi.** Scarico automatico a ml, cassa, codici a barre, attrezzatura costosa, notifiche push delle scadenze.

**Da non rompere mai.** Il flusso di oggi (togli un pezzo, Arrivati, Da ordinare, ordine via WhatsApp/email, kit base) resta uguale. Tutti i campi nuovi sono facoltativi. Nessuno script riscrive i dati: la conversione avviene in lettura e si salva alla scrittura successiva. Un prodotto con categoria sconosciuta non sparisce. I backup vecchi restano validi con lo stesso checksum. I dati di I Pelosetti non si toccano.

## Approcci
- **Conversione in `prodottoDaDoc` (scelto):** un punto solo, usato da cloud, copia locale, backup e ripristino. Il dato vecchio resta com'è finché qualcuno non salva quel prodotto.
- Script di migrazione una tantum: più pulito dopo, ma riscrive il salone di Laura. Vietato.
- Doppia lista di categorie vecchie e nuove nell'interfaccia: nessuna conversione, ma ogni filtro dovrebbe conoscerle entrambe. Scartato.

Per le stime: **modulo puro `src/lib/stimeMagazzino.ts`** che riceve appuntamenti, cani e servizi, più un hook che li carica solo quando il piano le accende. Niente campi calcolati salvati: si possono cambiare le formule senza toccare i dati.

## Punti aperti del §14 (scelte consigliate, come richiesto)
- Prodotti non riconosciuti: chip «Altro» che compare solo se non è vuoto.
- Prodotto usato e venduto: due prodotti distinti.
- Con bagno: tutti i servizi principali, con l'esclusione nel foglio del servizio.
- «Quanto mi dura?»: Plus, con anteprima bloccata visibile in Go. Il riepilogo segue la stessa regola (§10 lasciava aperto Go o Plus; §11 dice Plus).

## Decisioni mie (dove il piano non basta o si contraddice)
1. **La riserva si chiama `varie`, non `altro`.** `altro` è una chiave vecchia che si converte in `pulizia`: se fosse anche la riserva, un prodotto riservato finirebbe in Pulizia alla lettura dopo. L'etichetta resta «Altro». Si sceglie solo se il prodotto c'è già dentro.
2. **`vendita` non è una categoria salvata, è un filtro su `uso`.** Il piano la elenca fra le categorie ma §6 la definisce con `uso`. Un prodotto in vendita tiene la sua categoria; il chip Vendita guarda solo `uso`. Una `categoria: 'vendita'` trovata in un documento finirebbe in `varie`, senza sparire.
3. **Il campo `uso` segna il formato nuovo.** La conversione per nome (disinfettante, lame, olio, refrigerante) vale solo per i documenti senza `uso`. Altrimenti un prodotto spostato a mano in `cura` tornerebbe in `pulizia` a ogni lettura.
4. **I nomi per il riconoscimento sono congelati.** I nomi di queste 4 voci cambiano o possono cambiare, e il prodotto salvato ha il nome di allora nella lingua di allora. Una tabella fissa in `catalogoProdotti.ts` tiene i nomi vecchi nelle 5 lingue.
5. **`catCuSalviette` resta in `cura`.** Il piano non la mette né nel catalogo nuovo né fra le voci tolte. Tolgo solo ciò che il piano elenca.
6. **`catBaSpray` vecchio migra in `lavaggio`**, come dice la tabella (`balsami` → `lavaggio`), anche se la voce nuova sta in Finitura. Si sposta a mano.
7. **Nomi del catalogo con « / »:** cercando una voce, un prodotto che si chiama come la parte prima della « / » conta come già presente («Shampoo neutro» per «Shampoo neutro / universale»). Così non nascono doppioni.
8. **Campi in più rispetto a §7:**
   - `giorniConsegna` (intero o `null`): §8 lo usa ma nessun campo lo tiene. I contatti del fornitore vivono sui prodotti, quindi sta lì, si scrive nel dialogo del fornitore e vale per tutta la ditta. Se manca conta 0: la soglia resta 7 giorni.
   - `confrontoIl` (ms o `null`): ultima volta che è stato proposto il confronto. Serve a non ripetere la domanda dopo un No.
9. **Servizio:** nuovo campo facoltativo `senzaBagno`, interruttore solo per i principali. Un appuntamento conta se ha almeno un servizio principale non escluso. Un servizio cancellato dall'elenco conta come bagno. Le visite personali non contano. Un cane non più in elenco conta come taglia media.
10. **`mlPerCane` in Go:** il valore del catalogo si salva comunque, ma il campo si vede e si modifica solo con il piano acceso. Se si passa a Plus le stime sono già pronte. Salvando in Go il valore resta.
11. **Pulizia al salvataggio:** diluizione solo per `lavaggio`, `mlPerCane` solo per `lavaggio`/`finitura` con formato, prezzo solo per `vendita`. Il resto si azzera.
12. **Confronto tanica (§8):** servono 3 tocchi su – da un pezzo solo dopo `confrontoIl`, quindi 2 taniche finite. Si confronta l'ultima (giorni fra gli ultimi due tocchi, minimo 1) con `contenuto ÷ consumo al giorno`. Si propone solo con almeno il 20% di differenza. Con Sì, `mlPerCane` si moltiplica per stima ÷ reali, arrotondato, minimo 1. Sia Sì sia No aggiornano `confrontoIl`.
13. **Diluizione 1:N** = 1 parte di prodotto e N d'acqua. Per 1 L pronto con 1:10: 91 ml di prodotto e 909 ml d'acqua.
14. **Durata a parole:** sotto i 14 giorni in giorni, sotto i 60 in settimane, poi in mesi. Con consumo zero o pezzi zero non si mostra nulla.
15. **Spesa del mese (§10):** movimenti positivi del mese × costo, solo `salone`, escluso il carico iniziale (il movimento nato insieme al prodotto). Lo storico tiene 30 movimenti, quindi è un valore indicativo. Senza incassi nel mese niente incidenza.
16. **Interruttore:** nuova funzione `stimeMagazzino` di livello `pro` in `piano.ts`, con il suo testo di paywall. Passa da `haAccesso`, che è l'interruttore già usato per il resto.
17. **Registro Excel:** oggi non ha i prodotti. Nuovo foglio «Magazzino», solo se ci sono prodotti, così i registri senza prodotti restano uguali. Colonne: Nome, Categoria, Uso, Pezzi, Contenuto, Ditta, Codice, Diluizione, Aperto il, Costo.
18. **Regole:** controllo dei tipi solo se il campo c'è; `categoria` non si restringe, altrimenti le APK vecchie non potrebbero più scrivere.
19. **Scheda compatta:** i campi nuovi stanno in una sezione richiudibile «Altri dettagli», chiusa di partenza. Il pop-up di oggi non si allunga.
20. **Anche `unita` non fa più sparire un prodotto:** se manca o è sconosciuta vale `l`.

## Limiti da dire a Roberto
- **Stima per prodotto:** come da piano, ogni prodotto con `mlPerCane` conta tutti i lavaggi. Con più shampoo 1:10 ognuno sembra consumato su ogni cane, e uno specialistico (pelo bianco) risulta sovrastimato. Il confronto tanica lo corregge solo col tempo.
- **APK vecchie:** una vecchia versione scarta i prodotti con categoria nuova e, salvando, cancella i campi nuovi. Finché tutti i telefoni di un salone non sono aggiornati i prodotti si possono vedere a metà. Nessun dato si perde se non si risalva da una versione vecchia.
