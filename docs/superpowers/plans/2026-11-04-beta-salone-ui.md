# Beta app del salone (B3): piano di implementazione

> **Per chi esegue:** esecuzione nativa (superpowers:executing-plans), in TDD. I passi usano le caselle (`- [ ]`).

**Obiettivo:** le schermate della beta per la toelettatura: invito, BETA e giorni, feedback, fine beta, vetrine «In arrivo · Avvisami».

**Architettura:**
- `faseBeta` e `avvisiBeta` sono funzioni pure in `src/lib/`.
- `BetaProvider` legge l'invito, solo per il titolare, e calcola la fase.
- I componenti stanno in `src/components/beta/` e `src/components/abbonamento/`; le pagine nuove sono sotto `/impostazioni/beta*`.
- Le callable passano da `src/data/firebase/betaClient.ts`, che nei test è simulato.

**Tecnologie:** React 18, TypeScript, react-router, Vitest + Testing Library, Firebase JS SDK.

**Spec:** `docs/superpowers/specs/2026-11-04-beta-salone-ui-design.md`. L'aspetto è in `2026-11-04-admin-manager-design.md` (sezioni 8, 9 e 11).

## Vincoli globali
- Firme fisse:
  - `rispondiInvitoBeta({ accetta, motivo?, altro? }) → { ok: true; scadeIl: string | null }`;
  - `inviaFeedbackBeta(Omit<FeedbackBeta,'salonId'|'uid'|'piano'|'creatoIl'>) → { ok: true }`;
  - le chiamate vanno in `europe-west1`.
- `betaInviti/{salonId}` si ascolta solo se il ruolo è `titolare` o assente **e** `salonId === uid`.
- I testi vanno solo nel blocco `// Beta B3` in fondo a `it.ts`, `en.ts` ed `es.ts`.
- Nelle vetrine si tocca solo il ramo `offerta.acquisto === 'avvisami'`.
- Si usano i token, più le sfumature fisse di oggi (`COLORE_PIANO`, `COLORE_PIANO_SCURO`, i `COLORI` della scheda). Target di almeno 44 px e testo che non si taglia.
- Nessun prezzo se `!abbonamentiAttivi && !configPiani.showPrezziInBeta`.

## Da guardare in revisione
1. L'orologio supera `scadeInvitoIl` mentre la pagina invito è aperta: Partecipo deve dare «non più valido», non il pulsante. Test in `faseBeta` per lo scadere al millisecondo; la pagina ricalcola a ogni render.
2. Il server rifiuta Partecipo (VIP, Play attivo, scaduto): si mostra il messaggio del server e il pulsante torna attivo. Test nella Task 5.
3. Il socio apre `/impostazioni/beta` dal link: deve arrivare alla Home e non deve partire nessun ascolto dell'invito. Test nelle Task 3 e 5.
4. Doppio tocco su Invia o Partecipo: una sola chiamata. Test nelle Task 5 e 7.
5. `betaDal` o `betaFinoAl` mancanti nella traccia di un salone in beta: la barra non deve rompersi; usa `scadeIl` e i `giorni` dell'invito, oppure si nasconde. Test in `faseBeta`.

---

### Task 1: Fase e avvisi (pure)
**File:** si crea `src/lib/faseBeta.ts` con il suo test, e `src/lib/avvisiBeta.ts` con il suo test.
**Interfacce prodotte:**
```ts
export type FaseBeta = 'nessuna' | 'invitato' | 'in-corso' | 'finita'
export interface StatoBeta {
  fase: FaseBeta
  invito: InvitoBeta | null        // anche se chiuso
  invitoValido: boolean            // stato 'invitato' e scadeInvitoIl > adesso
  piano: 'pro' | 'salone' | null   // invito (invitato) o traccia/stato (in corso, finita)
  giorniInvito: number | null      // invito.giorni
  fine: Date | null                // in corso: scadeIl; finita: betaFinoAl, o revocatoIl se precede
  inizio: Date | null
  giorniRimasti: number | null     // ceil con tolleranza di 5 min; solo in-corso
  giorniTotali: number | null      // da inizio a fine (minimo 1)
  revocata: boolean
  domandaFine: boolean
  feedbackVisibile: boolean        // in-corso, oppure finita da meno di 30 giorni
  earlyAdopter: boolean
}
export function faseBeta(input: { invito: InvitoBeta | null; stato: StatoPiano; traccia: TracciaBeta; adesso: Date }): StatoBeta
export const STATO_BETA_VUOTO: StatoBeta

export type TipoAvvisoBeta = 'invito' | 'promemoria' | 'fine-vicina' | 'fine-domani' | 'finita'
export interface AvvisoBeta { id: string; tipo: TipoAvvisoBeta; data: Date; link: string }
export function avvisiBeta(beta: StatoBeta, adesso: Date, opz: { feedbackInviatoDopo?: number }): AvvisoBeta[]
```
- [ ] Test di `faseBeta`:
  - senza invito e senza traccia → `nessuna`;
  - invitato con scadenza +1 giorno → `invitato`, `invitoValido`;
  - scadenza di 1 ms fa → `nessuna`, `invitoValido` falso;
  - piano `{piano:'pro', stato:'attivo', fonte:'beta', scadeIl:+10 giorni}` → `in-corso`, `giorniRimasti` 10, `feedbackVisibile`;
  - 1 giorno rimasto → `domandaFine`;
  - ex beta con `betaFinoAl` di −3 giorni → `finita` con `domandaFine`;
  - −31 giorni → `feedbackVisibile` falso e `domandaFine` falso;
  - invito `revocato` → `revocata` e niente `domandaFine`;
  - traccia senza `betaDal` → `giorniTotali` null e nessun errore.
- [ ] Test di `avvisiBeta`:
  - invitato → `[invito]` con link `/impostazioni/beta`;
  - in corso al giorno 8 → `promemoria`; non compare se `feedbackInviatoDopo` è successivo all'inizio;
  - 6 giorni rimasti → `fine-vicina`; 1 giorno → `fine-domani` con link `/impostazioni/beta/fine`;
  - finita → `finita`; dopo una revoca non c'è niente.
  - Gli id sono stabili: `${tipo}:${data ISO}`.
- [ ] Scrivere il codice fino al verde. Commit `feat(beta-b3): fase e avvisi beta`.

### Task 2: Client delle callable e dati del piano
**File:**
- si crea `src/data/firebase/betaClient.ts` con il suo test (`firebase/functions` e `firebase/firestore` simulati come in `client.invito.test.ts`);
- si modifica `src/hooks/usePiano.tsx`, aggiungendo a `PianoValore` `traccia: TracciaBeta` e `configPiani: ConfigPiani` (in `spento`: `{}` e `CONFIG_PIANI_DEFAULT`).

**Interfacce prodotte:** `listenInvitoBeta(salonId: string, onData: (i: InvitoBeta | null) => void): Promise<() => void>`, `rispondiInvitoBeta`, `inviaFeedbackBeta`. Esporta anche `ErroreBeta`, che usa il `message` del server; con un messaggio vuoto, «internal» o che inizia con «Firebase», resta `''`.
- [ ] Test:
  - `rispondiInvitoBeta({accetta:true})` chiama `httpsCallable(_, 'rispondiInvitoBeta')` con lo stesso input e restituisce `data`;
  - un errore `failed-precondition` «Invito scaduto» viene rilanciato con quel messaggio;
  - `listenInvitoBeta` passa a `invitoBetaDi` il `data()` di `betaInviti/{id}`, oppure `null` se il documento manca o c'è un errore.
- [ ] Test di `usePiano`: `traccia` legge `exBeta` da `pro/main`; `configPiani.showPrezziInBeta` viene da `config.piani`.
- [ ] Verde. Commit.

### Task 3: BetaProvider
**File:** si crea `src/components/beta/BetaProvider.tsx` con il suo test; si modifica `src/app/providers.tsx` (sotto `PianoProvider`).

**Interfaccia:** `useBeta(): StatoBeta & { pronto: boolean; titolare: boolean; segnaLetto(id: string): void; letti: Set<string>; ricordaFeedback(): void; feedbackInviatoIl: number | null }`. Le chiavi locali sono `groomly.beta.<salonId>.letti` e `.feedbackIl`.
- [ ] Test:
  - il titolare ascolta `listenInvitoBeta(uid)`;
  - il socio (`salonId` diverso, ruolo `socio`) e il collaboratore non lo ascoltano, e la fase non è mai `invitato`;
  - in beta per il socio la fase è `in-corso`, ricavata dal piano;
  - `segnaLetto` resta dopo un nuovo montaggio.
- [ ] Verde. Commit.

### Task 4: EtichettaBeta, BarraGiorni e token
**File:**
- si creano `src/components/abbonamento/EtichettaBeta.tsx`, `BarraGiorni.tsx` e un test unico;
- si modificano `src/theme/tokens.css` e `src/theme/tokens.test.ts` (contrasto di `--plus-ink` su `--plus-s` e di `--sal-ink` su `--sal-s`, almeno 4.5, in chiaro e scuro).

**Interfacce:**
- `EtichettaBeta({ piano: 'pro'|'salone', piena?: boolean })`: alta 18, raggio 5, testo 10/800 con spaziatura `.08em`, icona `FlaskConical` da 10;
- `BarraGiorni({ rimasti: number, totali: number | null, chiara?: boolean })`: `role="progressbar"` con `aria-valuenow={rimasti}`, alta 6, etichetta «N gg».
- Token chiari: plus-s `#F0E9FD`, plus-ink `#5A2BC0`, sal-s `#FBF1D6`, sal-ink `#7A5600`. Token scuri: `rgba(183,148,255,.15)`, `#C9AEFF`, `rgba(235,185,40,.14)`, `#F2CC5E`.
- [ ] Test:
  - c'è il testo «BETA»;
  - la variante piena ha sfondo `rgba(255,255,255,.22)` e niente bordo;
  - la barra a 10 su 30 ha la parte piena al 33%; con `totali` null non c'è la barra, solo «N gg».
- [ ] Verde. Commit.

### Task 5: Invito (testi, card in Home, avviso, pagina)
**File:**
- si creano `src/components/beta/CardInvitoBeta.tsx`, `AvvisiBetaLista.tsx` e `src/pages/BetaInvitoPage.tsx`, con i test;
- si modificano `src/pages/HomePage.tsx` (card dopo `RigaRichieste`), `src/pages/AvvisiSistemaPage.tsx` (lista beta in cima, letti segnati dopo 700 ms come oggi), `src/pages/SettingsPage.tsx` (campanella: `avvisiDaLeggere + avvisi beta non letti`), `src/app/router.tsx` (`/impostazioni/beta`) e i18n (blocco `// Beta B3` con tutte le chiavi `beta*`/`vet*` della sezione 11, più `betaAvvisoPromemoria`, `betaAvvisoFine`, `betaApriInvito`, `betaOffertaFondatori`, `betaInBetaOra`, `betaPillolaGiorni` e `betaDal`).
- [ ] Test della card:
  - con l'invito valido compare «Prova Plus gratis per 30 giorni»;
  - «Più tardi» la nasconde e salva `piuTardi`; dopo 3 giorni torna;
  - per il collaboratore non c'è.
- [ ] Test della pagina:
  - Partecipo è disattivato finché la casella non è spuntata;
  - con la casella spuntata, Partecipo chiama `rispondiInvitoBeta({accetta:true})` una volta anche con un doppio tocco, poi mostra il toast con la data e va a `/`;
  - se il server rifiuta, si vede il messaggio e il pulsante torna attivo;
  - in «No grazie», «Rifiuta l'invito» è disattivato senza motivo; con «Altro» si apre il campo (`maxLength` 300) e la chiamata è `{accetta:false, motivo:'altro', altro:'…'}`;
  - per gli stati `scaduto` e `revocato` si vede «Questo invito non è più valido» con «Torna alla Home»;
  - il socio viene mandato a `/`.
- [ ] Test degli avvisi: l'avviso dell'invito ha il pallino finché la pagina invito non è stata aperta; la campanella conta 1 in più.
- [ ] Verde. Commit.

### Task 6: Beta in corso (scheda, Impostazioni, Abbonamento)
**File:** si modificano `SchedaAbbonamento.tsx`, `SettingsPage.tsx` (riga `RigaFeedbackBeta` sotto la griglia; il componente nuovo va in `src/components/beta/RigaFeedbackBeta.tsx`) e `AbbonamentoPage.tsx`, con i loro test.
- [ ] Test della scheda in beta: «Il tuo piano», «Beta gratuita · fino al …», l'etichetta BETA e una progressbar.
- [ ] Test della riga feedback:
  - c'è per il titolare e il socio, non per il collaboratore;
  - c'è per un ex beta a −10 giorni, non a −31.
- [ ] Test dell'Abbonamento in beta:
  - «BETA · 10 giorni», la frase con le date, la card feedback;
  - «Offerta fondatori» solo con `earlyAdopter` e il testo in config;
  - «Il tuo piano ora · in beta» nella scheda Plus;
  - i prezzi sono nascosti se spenti.
- [ ] Verde. Commit.

### Task 7: Modulo feedback e fine beta
**File:** si creano `src/pages/BetaFeedbackPage.tsx`, `src/pages/BetaFinePage.tsx`, `src/components/beta/AperturaFineBeta.tsx` e `src/lib/funzioniFeedback.ts` (`FUNZIONI_FEEDBACK: Record<'pro'|'salone', { feature: FeatureKey; chiave: Chiave }[]>`), con i test. Si modifica `router.tsx` (`/impostazioni/beta/feedback`, `/impostazioni/beta/fine`, `<AperturaFineBeta />` accanto a `TourAvvio`).
- [ ] Test del modulo:
  - «Passo 1 di 4»; Avanti disattivato senza voto;
  - al passo 2 le funzioni non hanno nulla scelto e quelle senza risposta non si inviano;
  - al passo 4, con «No» la domanda «Quanto» non c'è e `quanto` vale null;
  - Invia chiama una volta `inviaFeedbackBeta({voto:4, funzioni:{export:'utile'}, nonVa:'', manca:'', pagheresti:'si', quanto:'5-10', ricontatto:true, fineBeta:false, versioneApp: APP_VERSION})`;
  - con `?pagheresti=forse&fine=1` si parte dal passo 1, al passo 4 c'è «Forse» e `fineBeta` è vero;
  - se il server dà errore, si vede il messaggio.
- [ ] Test della fine beta:
  - «finisce domani» con 1 giorno rimasto, «è finita» quando è finita;
  - i tre pulsanti portano a `/impostazioni/beta/feedback?pagheresti=si|forse|no&fine=1`;
  - la riga fondatori c'è solo con il testo.
- [ ] Test di `AperturaFineBeta`:
  - con `domandaFine` in `/` naviga una volta e salva `fineVista.<fine>`;
  - non naviga al secondo montaggio, né per il socio, né fuori dalla Home.
- [ ] Verde. Commit.

### Task 8: Vetrine «In arrivo · Avvisami» e paywall
**File:** si modificano `src/components/abbonamento/Vetrina.tsx`, `Vetrina.test.tsx` e `src/hooks/usePiano.tsx` (`PaywallPiano`: toast `vetTiAvviseremo` dopo `onAvvisami`).
- [ ] Test della vetrina (abbonamenti spenti):
  - c'è la pillola «In arrivo»; c'è «Prezzo annunciato all'apertura» e non «9,99 €»; con `showPrezziInBeta` c'è «9,99 €»;
  - il tocco su «Avvisami» chiama `scriviInteresse('piano-plus')`, mostra il toast «Ti avviseremo appena disponibile» e il pulsante diventa «Ti avviseremo»; il dialogo «In arrivo» non c'è;
  - con l'invito valido per `pro`, nella vetrina plus c'è «Apri l'invito», che porta a `/impostazioni/beta`;
  - con `abbonamentiAttivi` vero il ramo resta invariato.
- [ ] Test del paywall: dopo Avvisami compare il toast.
- [ ] Verde. Commit.

### Task 9: Rifinitura, prova grafica e chiusura
- [ ] `npm test` e `npx tsc --noEmit` (o lo script `typecheck`) verdi.
- [ ] Browser a 360×640, chiaro e scuro: Home con la card, Avvisi, pagina invito, dialogo No grazie, Impostazioni in beta, Abbonamento in beta, modulo (4 passi), fine beta e vetrina. Confronto con `-proposta-2.html`. Stati simulati con il seed locale o con un override di sviluppo; niente scritture su Firestore reale.
- [ ] `docs/DECISIONI-AUTOMATICHE.md` (sezione B3) e `PROGRESS.md`. Commit finale.
