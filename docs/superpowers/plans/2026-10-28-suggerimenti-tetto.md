# Tetto sui suggerimenti — piano

**Goal:** `mailSuggerimento` spedisce al massimo cinque email al giorno per uid, contate a Roma in `suggerimentiLimiti`. L’indirizzo nella lettera è quello di Auth, non il campo scritto dal client. Le regole accettano il documento solo se `email` è quella del token.

**Non entra in questo piano:** VERIFY-002. Non si alza `APP_VERSION` e non si pubblica Hosting. Il deploy è `firestore:rules` e `functions:mailSuggerimento`.
