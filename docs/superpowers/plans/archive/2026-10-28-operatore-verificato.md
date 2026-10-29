# Operatore verificato — piano

> Archiviato il 29 ottobre 2026. Lavoro chiuso e pubblicato entro la 1.1.127. Non riprendere.

**Goal:** Le Functions che assegnano piani e funzioni accettano Laura e Roberto solo con l’email verificata, oppure un claim `admin`, come già fanno le regole Firestore. L’eliminazione protegge Laura con l’email di Auth, non con quella scritta nel documento `accounts`.

**Non entra in questo piano:** VULN-003, VULN-004, VERIFY-002. Non si alza `APP_VERSION` e non si pubblica Hosting. Il deploy tocca `setSalonPro`, `impostaPianoManuale`, `impostaFunzione` e `eliminaAccount`.
