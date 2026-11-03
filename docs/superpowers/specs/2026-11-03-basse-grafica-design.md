# Basse «Grafica» — design breve

Data: 3 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione «Basse (in breve)», riga **Grafica**; dettagli in `test-results/audit/findings/visivo.md`, `android.md` (Varie viste, Backup), `account.md` (Backup manuale). Misure dell'audit in `test-results/audit/work/visivo/res-*.json` (`lowContrast`, `small`).

## Perché
Dieci difetti di aspetto, tutti nell'app: niente deve sembrare rotto o ingannevole (un backup mai fatto in verde), e sui telefoni stretti si deve poter leggere e toccare tutto. Solo APK, niente server né regole.

## Decisioni (prese con Roberto il 3 novembre)
1. **Giro completo con una regola sola** (approccio A): contrasto del testo almeno 4,5:1 (3:1 per testo ≥ 18,66 px grassetto o ≥ 24 px), zona toccabile dei pulsanti almeno 40 px, nessun testo tagliato con «…» a 320 px dove il testo è dell'app (i dati del salone lunghi possono ancora andare in ellissi se la riga lo prevede). Chiaro e scuro.
2. **Durata**: un formato solo, «1h05», «2h», «45 min» (anche «0 min» al posto di «0m» nell'agenda e in Home). Vale per scheda cane, modulo, chiusura della visita («1 h 05» diventa «1h05»), righe e intestazioni dell'agenda.
3. **Backup**: «Mai eseguito» con bollino giallo d'avviso (`warn`), verde solo con un backup recente. Il backup manuale («Completo con foto» / «Solo dati») scrive `backup.lastAt`, quindi la riga dice «Ultimo backup: oggi». Nel riquadro «Completa il tuo salone» il passo diventa un verbo: «Fai il primo backup» (en/es tradotti).
4. **Barra in basso a 320 px**: stessa parola («Impostazioni»), carattere un po' più piccolo solo sui telefoni stretti, finché ci sta intera.
5. **Scheda piano in Impostazioni** (Go, Plus, Salone): titolo e «Passa a Plus» vanno a capo invece di troncarsi.
6. **«← Animali» nella scheda cane**: resta in basso a destra (vicino al pollice) ma diventa un cerchio con la sola freccia (48 px, nome accessibile invariato); in fondo alla scheda uno spazio vuoto alto quanto il pulsante, così contatto, galleria e «Prossimo» si possono sempre portare sopra di esso, anche in orizzontale. *(Scelta di Claude, Roberto ha lasciato decidere.)*

## Approcci
- **A — scelto.** Misurare e correggere il minimo: uno script percorre tutte le rotte a 320/360/390 px in chiaro e scuro (come `work/visivo/giro.cjs`) e misura contrasto, altezza dei pulsanti, testi tagliati. Colori corretti nelle variabili del tema (`src/theme/tokens.css`); pulsanti piccoli scritti nelle pagine allargati con una classe comune che estende la zona toccabile ad almeno 40 px senza cambiare l'aspetto; testi tagliati sistemati dove lo script li trova. Lo script è anche la verifica finale.
- **B — scartato.** Solo tema e componenti comuni: pochi conflitti ma restano piccoli proprio i pulsanti dell'audit (Home «Completato / Non venuto / Disdetto» 24 px, Team 26 px), scritti dentro le pagine.
- Ridisegno pagina per pagina — scartato: troppo lavoro e conflitti con le altre cinque sessioni.

## Fuori dallo scopo
- `AbbonamentoPage.tsx`, `PaywallSheet.tsx`, `Vetrina.tsx`, `LinkCondivisione.tsx`, `RiquadroRichiesta.tsx` (altre sessioni): non si toccano; i prezzi oro/viola e «Attivo» oro dell'Abbonamento e il bianco su oro della pagina Salone restano, segnalati nel report. Se una variabile del tema cambiata li migliora da sola, bene.
- L'ordine di scelta della lingua (salvata → luogo → telefono) resta com'è: è voluto (`06ddeff`). «Toelettatura» sotto il logo è già tradotta («Grooming salon» / «Peluquería»): si controlla soltanto con l'app in inglese.
- Il passo «Prima salva una copia» di Elimina account (è dell'area Account).

## Lasciato al costruttore (scelte di Claude)
- **Toast**: niente «·» isolato tra messaggio e azione; l'azione si separa con lo spazio (o una linea sottile), in `src/components/layout/Toast.tsx`, vale per tutti i toast.
- **Listino «vedi» vuoto** (`PriceViewPage.tsx`): riga con icona come in `ListinoPage` più una frase che spiega («Qui vedi il listino che carichi nella pagina Listino») e il pulsante «Vai al listino»; al collaboratore (sola lettura) solo la frase.
- Nome e forma della classe per la zona toccabile; nuove tonalità dei colori (stesso tono, più scure in chiaro / più chiare in scuro); testi nuovi in it/en/es con chiavi nuove (controllo «frasi fisse»).
- Quali piccoli tagli a 320 px correggere con l'a capo e quali con un carattere più piccolo.

## Verifica
Test unitari: formato durata unico, tono del backup, `lastAt` scritto dal backup manuale. Script `QA-tests/.qa-catalog/verify-basse-grafica.cjs` sull'emulatore (account `grafica-*` propri, Go/Plus/Salone): giro di tutte le rotte a 320/360/390 px chiaro e scuro con contrasto ≥ 4,5:1, pulsanti ≥ 40 px, nessun testo dell'app tagliato (escluse le pagine fuori scopo, elencate); più casi mirati: backup mai fatto giallo e «oggi» dopo un backup manuale, durata «1h05» in scheda cane e modulo, toast senza «·», «← Animali» che non copre il contatto dopo lo scorrimento (anche 844×390 orizzontale), listino vedi vuoto, Impostazioni in inglese con «Grooming salon».
