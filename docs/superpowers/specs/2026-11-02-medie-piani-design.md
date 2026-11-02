# Medie «Piani» (audit 8, 10, 11) — design

Data: 2 novembre 2026. Audit: `docs/AUDIT-QA-2026-11-01.md`, sezione Medie → «Prenotazioni online e piani», punti 8, 10, 11.

## Perché
Quando si accenderanno gli abbonamenti Google Play, un toelettatore non deve perdere Plus o Salone senza accorgersene (pagamento non riuscito, disdetta), e alla fine del piano i collaboratori non devono poter continuare a entrare. Oggi nessun piano è in «grazia» o «disdetto» e nessun Salone ha una scadenza (Play non è collegato): 8 e 10 preparano quel giorno. L'11 è un difetto visibile già oggi.

«In grazia» = periodo di tolleranza di Google Play dopo un rinnovo non riuscito: il piano resta attivo per qualche giorno mentre Play riprova l'addebito.

## Cosa cambia

### 8 — Avviso per piano in grazia o disdetto
- Nella scheda «Il tuo piano» delle Impostazioni (`src/components/abbonamento/SchedaAbbonamento.tsx`) e nella pagina Abbonamento (`src/pages/AbbonamentoPage.tsx`), per un piano Plus o Salone ancora attivo:
  - stato `grazia`: «Pagamento non riuscito · aggiorna il pagamento su Google Play», con collegamento alla pagina abbonamenti di Google Play (`https://play.google.com/store/account/subscriptions`) nella pagina Abbonamento;
  - stato `disdetto`: «Disdetto · attivo fino al <data>» (data in formato breve, lingua dell'app).
- Testi in it/en/es come il resto dell'app. Solo il titolare vede l'avviso (socio e collaboratore no, come per gli altri avvisi di piano).
- Si decide da `statoPiano` (`src/lib/piano.ts`), che già conserva `stato` e `scadeIl`.

### 10 — I piani scaduti si chiudono da soli (approccio A scelto da Roberto)
- La funzione pianificata oraria `chiudiProve` (`functions/src/piano/chiudiProve.ts`) chiude, oltre alle prove scadute, ogni piano la cui scadenza è passata **secondo la stessa regola che usa l'app** (`statoPiano`: `scadeIl` valida e passata con stato attivo/prova/grazia/disdetto). Il documento diventa Go (`campiBase` con la traccia di Plus, come le prove), quindi `enabled` torna falso e le regole Firestore chiudono l'accesso a soci e collaboratori.
- Un piano senza scadenza (omaggi, VIP, manuali senza data) non si tocca mai.
- Ritardo massimo accettato: un'ora dopo la scadenza.
- Scartato l'approccio B (controllo della data nelle regole Firestore): servirebbe cambiare il formato di `scadeIl` su tutti i piani esistenti, compreso quello in produzione.

### 11 — Testi della pagina Team e di `/impostazioni/pro`
- Chi non ha Salone e apre `/impostazioni/pro` viene portato a `/impostazioni/abbonamento` (oggi trova la pagina del Team con «Piano Plus · Non attivo» e l'invito ad accendere il piano per invitare collaboratori). L'operatore continua a vedere la pagina con il suo interruttore.
- Nella pagina Team (Salone) la scheda del piano dice «Piano Salone» invece di «Piano Plus»; il testo «Accendi il piano per invitare…» parla del Salone.

## Approcci considerati
- 10: **A, chiusura dal controllo orario esistente** (scelta) contro B, data controllata nelle regole (al secondo, ma richiede di cambiare il formato dei dati in produzione).
- 8: una sola strada sensata (una riga nella scheda e nella pagina Abbonamento).
- 11: rimandare chi non ha Salone alla pagina Abbonamento (scelta) contro correggere solo le scritte, che lascerebbe un Go su una pagina d'inviti che non può usare.

## Non obiettivi
- Nessun collegamento con Google Play / RevenueCat.
- Nessuna mail per grazia o disdetta.
- Nessun cambio alle regole Firestore.

## Lasciato al costruttore
- Testi esatti in en/es e forma della data.
- Test: unità per la scelta dei piani da chiudere (grazia/disdetto/attivo con data passata sì; senza data, data futura, omaggio no) e per gli avvisi; verifica sull'emulatore della funzione compilata (Salone in grazia scaduto → `enabled: false`, il collaboratore non legge più il salone) e nel browser della scheda e del rimando da `/impostazioni/pro`.

## Rilascio
Function `chiudiProve`; APK per scheda, pagina Abbonamento e rimando.
