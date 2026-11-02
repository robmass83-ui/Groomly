# A10 — Dopo «Esci» i dati dei clienti non restano sul telefono

Audit: `docs/AUDIT-QA-2026-11-01.md`, voce A10. Specifica breve.

## Perché
`logout()` (`src/hooks/useSession.tsx:~155`) scollega l'account (e da A7 dimentica l'invito in sospeso) ma lascia sul telefono:
- le copie per account in `localStorage` (`groomly.users.<uid>.*`: cani, clienti con telefoni ed email, visite, impostazioni) e `groomly.piano.<uid>`;
- la cache persistente di Firestore (IndexedDB, `persistentLocalCache`, `client.ts:~691`);
- le foto in attesa (`pendingPhoto`);
- la lista delle eliminazioni `groomly.deleted` (`src/lib/tombstone.ts:3`), unica per tutto il telefono invece che per account.
L'app è solo APK: il rischio vero è un telefono/tablet del salone usato da più persone o un telefono ceduto.

## Decisioni di Roberto
1. Strada **A**: pulizia completa all'uscita (copie per account, foto in attesa, lista delle eliminazioni, cache di Firestore), poi l'app riparte da zero.
2. Se ci sono **modifiche non ancora inviate al cloud**, prima di uscire un **avviso**: «Ci sono modifiche non ancora salvate online: se esci adesso si perdono.» con **Resta** ed **Esci comunque** (lettura di Claude del «fai un avviso»: avviso con scelta, non blocco).

## Obiettivi
1. **Modifiche in sospeso** = almeno una tra: scritture Firestore non confermate (`waitForPendingWrites` non risolto entro ~1,5 s), compiti nella coda di caricamento (`uploadQueue` di `client.ts`), foto in attesa (`pendingPhoto`). Una funzione `modificheInSospeso(): Promise<boolean>`.
2. **Avviso**: dove oggi c'è «Esci» (Impostazioni `SettingsPage.tsx:~1193`; anche `StaffLock` e le due uscite di `LoginPage`), se `modificheInSospeso()` è vero compare il foglio di conferma con il testo sopra, «Resta» (chiude) ed «Esci comunque». Senza modifiche in sospeso si esce subito come oggi. `EliminaAccountPage` non mostra l'avviso (l'account è già cancellato).
3. **Pulizia** dopo lo scollegamento (`signOutEmail`), solo in modalità Firebase:
   - tutte le chiavi `groomly.users.<uid>.*`, `groomly.piano.<uid>`, le foto in attesa di `uid`, la lista delle eliminazioni di `uid`;
   - cache di Firestore: `terminate` + `clearIndexedDbPersistence` (se fallisce, perché un'altra scheda la tiene, si va avanti: la pulizia di `localStorage` resta);
   - poi l'app ricarica da `/login` (stesso meccanismo stubbabile di `cambioSalone.ts`).
   - Restano: lingua, preferenze notifiche, telefono per le notifiche (`PUSH_TOKEN_KEY` e id dispositivo), suggerimento d'accesso (solo l'email), profilo di una registrazione da finire (`pendingSalon`).
4. **Lista delle eliminazioni per account**: chiave `groomly.deleted.<uid>`. La vecchia `groomly.deleted` viene letta una volta come valore iniziale per l'account che entra e poi cancellata (non si perdono eliminazioni non ancora inviate).
5. **Modalità locale** (senza Firebase, `firebaseEnabled()` falso): nessuna pulizia, perché `localStorage` è l'unica copia.

## Non obiettivi
- Cifrare i dati sul telefono.
- Pulire dopo la chiusura dell'app senza «Esci».
- Cambiare cosa succede eliminando l'account (A8/A9).

## Anti-obiettivi
- Perdere modifiche senza che la persona l'abbia saputo.
- Cancellare dati della modalità locale.
- Lasciare l'app a metà (scollegata ma con l'interfaccia del salone visibile).

## Approcci
- **A — pulizia completa + ripartenza (scelta).**
- B — solo `localStorage`, cache di Firestore tenuta: rientro offline più comodo, ma i dati dei clienti restano nella cache; scartata.

## Lasciato al builder
- Dove vive la pulizia (consigliato: accanto a `pulisciDatiSalone` in `src/data/local/`, riusandone l'elenco delle chiavi) e come `useSession.logout` la chiama.
- Il componente dell'avviso (foglio di conferma come «Torna al mio salone» in `SettingsPage`), testi in it/en/es.
- Come esporre lo stato della coda di caricamento da `client.ts` senza esportarne gli interni.

## Test
- Pulizia: rimuove le chiavi dell'account e della lista eliminazioni, tiene quelle elencate al punto 3; chiama la pulizia della cache; in modalità locale non tocca nulla.
- Avviso: con modifiche in sospeso compare e «Resta» non esce; «Esci comunque» esce e pulisce; senza modifiche esce subito.
- Lista eliminazioni: due account sullo stesso telefono non vedono le eliminazioni l'uno dell'altro; la vecchia chiave viene migrata una volta.
- Verifica in emulatore nel browser: dopo «Esci» `localStorage` non ha `groomly.users.<uid>.*` e IndexedDB di Firestore è vuoto; rientro → i dati tornano dal cloud.
