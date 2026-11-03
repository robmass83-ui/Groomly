# Medie «Home e telefono» (31, 32, 34) — piano

**Spec:** `docs/superpowers/specs/2026-11-03-medie-home-telefono-design.md`

## Global Constraints
- Testi in it/en/es; nessuna chiave nuova senza le tre lingue.
- Nessun cambio a `firestore.rules` né alle functions: solo APK.
- Test dalla radice `npx vitest run <file> --exclude '.claude/**'`; typecheck `npx tsc --noEmit`. Fallimento noto: `src/lib/driveInvio.test.ts`.
- Commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Task 1: righe della Home (31)
- Modify `src/components/piano/RigheHome.tsx` (schede a due righe, nessun `textOverflow: ellipsis`), test `src/components/piano/RigheHome.test.tsx` (creare se manca).
- Test: il nome lungo è intero nel DOM e nessun elemento della riga ha `text-overflow: ellipsis`; «Cestino» e «Sì» restano pulsanti con nome; la riga è dentro una scheda.
- Commit `fix(home): righe promemoria e auguri leggibili`.

### Task 2: notifiche inesatte (32)
- Create `src/lib/notificheLocali.ts` con `programmaNotifiche(notifiche)` → `LocalNotifications.schedule({ notifications: notifiche.map((n) => ({ ...n, isExactNotification: false })) })`.
- Modify `src/app/providers.tsx`, `CompleanniAvviso.tsx`, `OrarioScadutoAvviso.tsx`, `PushHost.tsx`, `UpdateNotice.tsx`: usano `programmaNotifiche`.
- Test `src/lib/notificheLocali.test.ts`; grep `LocalNotifications.schedule` → solo in `notificheLocali.ts`.
- Commit `fix(android): le notifiche non aprono più «Sveglie e promemoria»`.

### Task 3: ripristino (34)
- Modify `src/data/firebase/client.ts`: copia di lettura del ripristino (`readDoc`, `putDoc`, `cloudDeletion`), salto dei documenti uguali in `saveWithMedia` solo durante il ripristino, gruppi da 10, `replaceCloudData(uid, bundle, onAvanzamento?)`.
- Modify `src/pages/SettingsPage.tsx`: testo «Ripristino i dati… {{fatti}} di {{totale}}» (chiave `zampeRipristinoN`).
- Test nel test del client: con 25 visite al massimo 10 salvataggi in corso insieme; avanzamento fino a 25 di 25; una visita uguale non si riscrive; il segno dei cani eliminati si legge una volta.
- Commit `perf(backup): ripristino a gruppi, letture una volta sola e avanzamento`.

### Task 4: verifica sull'emulatore, audit, PROGRESS
- `QA-tests/.qa-catalog/verify-home-telefono.cjs`: Home a 320/360/390 con promemoria e auguri; ripristino di 499 visite con tempo e avanzamento.
- Audit 31, 32, 34 «risolto»; PROGRESS; merge; APK.
