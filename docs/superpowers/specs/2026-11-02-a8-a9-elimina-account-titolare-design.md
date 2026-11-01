# A8 + A9 — Quando il titolare elimina l'account: niente resti online, soci e collaboratori liberi

Audit: `docs/AUDIT-QA-2026-11-01.md`, voci A8 e A9. Specifica breve (lavoro piccolo-medio).

## Perché
`eliminaAccountPer` (`functions/src/piano/eliminaAccount.ts`), quando chi elimina è il titolare (`azione: 'salone'`):
- **A9** fa solo `recursiveDelete(salons/<uid>)` e cancella `accounts/<uid>`, Storage e l'utente Auth. Restano: `pubblici/<slug>` (la pagina pubblica risponde ancora col nome del salone), `invites` del salone, `emailRateLimits/<email>` della persona cancellata, e altri resti che `eliminaSalonePer` (`functions/src/piano/eliminaSalone.ts:70-100`) invece pulisce (`schede`, `suggerimenti`, `pushSfide`, limiti, `users/<uid>`, `pushDeliveries` dei telefoni). In più, 2 volte su 3 il telefono che ha appena eliminato riscrive un `settings/main` vuoto: `listenSettings` (`src/data/firebase/client.ts:~1791-1803`) rimette `blankSettings` mentre `accounts/<uid>` esiste ancora.
- **A8** mette i membri a `revocato` ma non riporta `accounts/<membro>` al proprio salone (come fa `revokeMember`, `functions/src/index.ts:~1133-1136`, con `shouldRestoreAccount`): soci e collaboratori restano bloccati su «Il titolare ha spento il piano. I dati non sono persi» e non possono uscire.

## Decisioni di Roberto
1. Soci e collaboratori **tengono il loro login**. Al prossimo accesso ripartono **come chi crea un salone nuovo** (il proprio salone vuoto), a meno che vengano reinvitati.
2. Strada **A**: una pulizia comune usata da «Elimina salone» (operatore) e da «Elimina account» (titolare); in più «Elimina account» riporta i membri al proprio salone e il telefono smette di ascoltare prima di eliminare.

## Obiettivi
1. **Pulizia comune** estratta da `eliminaSalonePer` (stesso comportamento per l'operatore): tutto ciò che riguarda il salone (`invites`, `pubblici`, `schede`, `suggerimenti` per `salonId`) e, per ogni persona che viene **eliminata**, i suoi resti (`suggerimenti`/`pushSfide` per `uid`, `suggerimentiLimiti`/`placesRateLimits`/`pushRateLimits`, `accounts/<uid>`, `users/<uid>`, Storage, `pushDeliveries` dei suoi telefoni, `emailRateLimits/<email>`).
2. **Elimina account del titolare** usa la pulizia comune con **solo il titolare** come persona eliminata. Ordine: prima i membri riportati al proprio salone, poi il salone, poi le raccolte del salone, poi i resti del titolare, per ultimo l'utente Auth (come oggi).
3. **Membri** (soci e collaboratori del salone eliminato): `members/<uid>` a `revocato` come oggi; inoltre, se `accounts/<membro>.salonId` è ancora il salone eliminato, diventa `{ salonId: <uid del membro>, role: 'titolare' }` (merge, come `revokeMember`). I loro account Auth, email e dati personali restano.
4. **Il telefono che elimina non riscrive nulla**: dopo «Elimina account» non deve ricomparire `salons/<uid>/settings/main` (né altri documenti del salone) — si fermano gli ascolti del salone prima di chiamare l'eliminazione, o `listenSettings` non riscrive le impostazioni vuote durante/dopo l'eliminazione (scelta del builder, coperta da test).
5. **Elimina account di un membro** (`azione: 'membro'`): invariato.
6. **Test**: `eliminaAccountPer` del titolare con un socio e un collaboratore → nessun `pubblici`/`invites`/`emailRateLimits` del salone o del titolare; account dei membri con `salonId` = proprio uid e `role: 'titolare'`; Auth dei membri intatto; `eliminaSalonePer` continua a cancellare tutto come oggi (test esistenti verdi). Lato client: dopo l'eliminazione nessuna scrittura di `settings/main`.

## Non obiettivi
- Email di avviso a soci e collaboratori.
- Ripulire resti di saloni eliminati in passato.
- Cambiare «Elimina salone» dell'operatore oltre all'estrazione della pulizia.

## Anti-obiettivi
- Cancellare gli account di soci e collaboratori.
- Lasciare un membro con l'account che punta a un salone che non esiste.

## Approcci
- **A — pulizia comune + membri riportati al proprio salone (scelta).**
- B — «Elimina account» chiama «Elimina salone»: cancellerebbe anche gli account dei membri (contro la decisione 1).

## Lasciato al builder
- Forma della funzione comune (file e nome) e come si testa con i Firestore finti già usati da `eliminaSalone.test.ts` / `eliminaAccount.test.ts`.
- Modo di fermare la riscrittura di `settings/main` lato client.
- Deploy: functions `eliminaAccount`, `eliminaSalone` (con `FUNCTIONS_DISCOVERY_TIMEOUT=60`) + release APK se cambia il client.
