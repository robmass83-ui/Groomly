# Piano T1 Basi

Spec: `docs/superpowers/specs/2026-11-04-lingue-basi-design.md`. Dopo ogni passo: `npx tsc --noEmit` e i test toccati, poi commit.

1. `lingua.ts` (`LINGUE`, `NOMI_LINGUA`, `LOCALE_INTL`), `fr.ts` e `de.ts` provvisori, `t.ts`, `LinguaContext`, `format.ts` con test per fr e de.
2. Unioni e tabelle: tutti i punti in `src` e `functions/src`, segnaposto con `// LINGUE: da tradurre`, locali da `LOCALE_INTL`.
3. Regola: `linguaLocale.ts` senza fuso, `passaggioLingua`, setup dei test, test della regola e del passaggio.
4. `accounts.lingua`: `allineaLinguaAccount`, `LinguaAccount`, scrittura alla creazione.
5. `primoAvvio`, `linguaClienti` nel salone nuovo, voce in Impostazioni, selettori (Impostazioni, Login, PulsanteMessaggi, stampa listino), chiavi nuove `// Lingue T1`.
6. Test: `lingue.test.ts`, `frasiFisse` esteso, `debitoFrasi.json`, `debitoLingue.ts`.
7. Verifica: `npm run build`, `npm test`, test functions e regole; `PROGRESS.md`, `DECISIONI-AUTOMATICHE.md`, nota di consegna; commit.
