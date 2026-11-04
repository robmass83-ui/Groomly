# Piano T4 App

Spec: `docs/superpowers/specs/2026-11-04-lingue-app-design.md`.

1. Censimento: elenco di debito e ricerca su tutti i letterali di `src/`, perché il test vede solo le frasi con parole note.
2. Base: `frase()`, `erroreApp()`, blocco `// Lingue T4` nei cinque cataloghi.
3. Tabelle: `report`, `listino`, `servizioVisibile`, `errori`, `avvisoPiano`, `paginaPubblica`, `messaggiManuali`.
4. Frasi fisse: errori, notifiche, `UpdateNotice`, note di rilascio, Registro Excel, LEGGIMI, schemi zod, icone, voci di menu.
5. Errori del server sul contratto di T5.
6. Dati: `dog.lingua` in lettura e salvataggio, `PulsanteMessaggi`.
7. Controllo dei default `lingua = 'it'`: si tolgono per prova e si guarda chi non passa la lingua.
8. Font di PDF e listino.
9. Debito a zero, test, `PROGRESS.md`, decisioni, glossario.
