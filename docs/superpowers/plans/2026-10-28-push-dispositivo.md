# Push senza scansione degli account — piano

**Goal:** `prendiPushTelefono` non legge più tutti gli account. Cerca il token con una collection group su `devices.token`. Con `tieni: false` cancella solo i dispositivi dello stesso uid. Con `tieni: true` registra prima il token e solo dopo stacca le copie sugli altri account. Otto chiamate al minuto per uid, in `pushRateLimits`, illeggibile dal client.

**Non entra in questo piano:** VULN-004 e VERIFY-002. Non si alza `APP_VERSION` e non si pubblica Hosting. Il deploy è `firestore:rules`, `firestore:indexes` e `functions:prendiPushTelefono`.
