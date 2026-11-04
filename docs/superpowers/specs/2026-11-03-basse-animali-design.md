# Basse «Animali e mensili» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Animali e mensili**; dettagli in `test-results/audit/findings/animali.md` (e `android.md` per «Anziano»).

## Perché
Dieci difetti piccoli della scheda cane, della lista animali e dei Mensili: cose che confondono (omonimi, mese dopo vuoto, «— —», «ogni 6»), azioni irreversibili troppo facili (Deceduto con un tocco) e dati che non si possono più correggere (contatto principale, sesso). Obiettivo: la scheda si può sempre rimettere a posto e i Mensili dicono il vero per entrambi i mesi.

## Decisioni (prese con Roberto il 3 novembre)
1. **Mensili, mese dopo**: ogni mese mostra le visite mensili che ha davvero. Un cane con visita il 19 nov e il 1 dic sta tra i fissati di novembre (19 nov) **e** tra i fissati di dicembre (1 dic). Mese corrente invariato. Badge della scheda del mese, contatore «x/y fissati» e liste usano la stessa regola.
2. **Omonimi in Mensili**: sotto il nome la riga di `dogMark` (razza · cognome, o proprietario breve) solo quando c'è un omonimo, come in `/animali`; vale per tutti i gruppi, fissati compresi.
3. **Deceduto / Non più in cura**: sempre un dialogo, anche senza visite future: «Conferma» / «Annulla». Con visite future resta il dialogo di oggi.
4. **Contatto principale**: su ogni contatto extra del modulo un tasto **«Rendi principale»**: il contatto sale nei campi Proprietario/Telefono, il vecchio proprietario scende tra gli extra con nome e numero; il ruolo segue la persona. Lo scambio vale solo con «Salva» (Annulla lo scarta).
5. **Sesso**: tre scelte «Maschio», «Femmina», «Non indicato» (= campo assente).
6. **«Mensile · ogni 6»** → «Mensile · ogni 6 settimane» (it/en/es).
7. **Ordina** in `/animali`: spunta visibile sulla scelta attiva; l'ordinamento è ricordato sul telefono (localStorage, con try/catch).
8. **Prezzo personalizzato svuotato**: se prezzo e durata sono entrambi vuoti, il servizio esce da «mostra nel profilo» al salvataggio; la scheda non mostra più righe «— · —».
9. **«Troppe note»** tradotto (chiave nuova).
10. **«Anziano» due volte**: con categoria anziano e senza anno di nascita il sottotitolo della scheda non ripete «Anziano» (resta il bollino). Con l'anno resta «12 anni»; le altre categorie invariate.

## Approcci
- **Mensili — A, scelto.** La regola «in quale mese compare un cane e con quale visita» sta in `src/lib/cycle.ts` (funzione pura, testata): nel mese dopo un cane con una visita programmata in quel mese è un fissato con la prima visita di quel mese. `MonthlyPage` la usa per lista, contatore e badge. **B, scartato:** aggiungere le righe solo nella pagina — contatore e badge rischiano di dire altro dalla lista.
- **Rendi principale — A, scelto.** Scambio nello stato del modulo, salvato con «Salva». **B, scartato:** salvataggio immediato al tocco — diverso dal resto del modulo, un tocco sbagliato resta.
- Gli altri otto punti: una sola strada sensata, correzione locale nei file che li contengono.

## Fuori dallo scopo
- Niente server, regole o hosting: solo APK.
- Il ritardo del fissato con visite successive (media già chiusa) non si tocca.
- Gli altri bassi di `animali.md` già chiusi o di altri gruppi (validazioni, listino).

## Lasciato al costruttore (scelte di Claude)
- Nome e forma della funzione dei Mensili; chiave di localStorage dell'ordinamento.
- Testi nuovi in it/en/es con chiavi nuove (attenzione al test «frasi fisse»): «Rendi principale», «Non indicato», «ogni {{n}} settimane», «Troppe note», testi del dialogo di conferma (es. «Segnare {{nome}} come deceduto?»).
- Il ruolo del vecchio proprietario quando scende tra gli extra (oggi `ruoloDelProprietario`).

## Verifica
Test unitari di `cycle.ts`, dello scambio contatti, di `profilePrices`/salvataggio prezzi e dei componenti toccati. Script Playwright `QA-tests/.qa-catalog/verify-basse-animali.cjs` sull'emulatore (account `animali-*`) a 320/360/390 px: Mensili mese dopo con visita in entrambi i mesi e omonimi, dialogo Deceduto senza futuri, Rendi principale + Salva, Sesso non indicato, Ordina con spunta e ricordo, prezzo svuotato, «ogni 6 settimane», «Anziano» una volta.
