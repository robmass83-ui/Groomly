# Kit test 360° di Groomly

> Archiviato il 27 ottobre 2026. Lavoro chiuso e pubblicato. Non riprendere.

Usato da Claude il 25/10/2026 per il primo test. Il rapporto è in `docs/archive/Groomly_Test360_RAPPORTO_2026-10-25.md`.
Già integrato nel progetto: `scripts/test360/` e `tests/e2e/`. Non riusare questa copia.

- `firebase.emu.json`: emulatori Auth/Firestore/Functions per il progetto finto `demo-groomly`
- `env.emu.txt` (da rinominare in `.env.emu` nella radice del progetto): configurazione dell'app per gli emulatori (`npx vite --mode emu`)
- `client-emulatori.patch`: collega `src/data/firebase/client.ts` agli emulatori quando `VITE_EMULATORS=1`. ATTENZIONE: così com'è rompe 73 test di `client.test.ts`, perché i mock non hanno `connect*Emulator`. Va riscritta con import dinamici condizionati.
- `scripts/seed.ts`: crea 20 saloni finti + copia finta del salone di Laura (si ferma se non trova gli emulatori)
- `scripts/rules.ts`: 28 prove sulle regole vere
- `scripts/setpro.ts`: accende/spegne Pro su un salone finto
- `playwright/*.cjs`: giro delle pagine e azioni (lancio: `node playwright/tour.cjs salone1@test.groomly s1`)

Password di tutti gli account finti: `Test1234!` (solo negli emulatori).
Sicurezza: mai usare questi script con il progetto vero `groomly-3128b`.
