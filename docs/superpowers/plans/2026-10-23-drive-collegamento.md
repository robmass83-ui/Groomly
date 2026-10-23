# Collegamento Google Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sulla card Dati e backup si collega e si scollega un account Google, con i soli scope email e `drive.file`, senza caricare nulla.

**Architecture:** Un plugin Capacitor `DriveAuth` parla con `AuthorizationClient`. Java non consegna il token a JavaScript. La pagina legge `{ collegato, email }` all'apertura e al clic.

**Tech Stack:** React, Capacitor 8, Play Services Auth 21.4.0, Vitest, happy-dom.

## Global Constraints

- Scope esatti: `https://www.googleapis.com/auth/userinfo.email` e `https://www.googleapis.com/auth/drive.file`. Nessun altro scope Drive.
- Il token non va in JavaScript, in `localStorage` e non in Firestore.
- Plugin `DriveAuth`, metodi `collega`, `leggi`, `scollega`. `leggi` non apre il foglio Google.
- Rifiuto utente: codice `annullato`, nessun toast. Altro rifiuto: «Collegamento Google non riuscito».
- Sul web `collega` e `scollega` lanciano `Error('telefono')`. `leggi` risolve `{ collegato: false, email: null }`.
- Toast: «Google Drive collegato», «Google Drive scollegato», «Collegamento Google non riuscito», «Connessione assente», «Il collegamento a Google Drive funziona sul telefono».
- Non modificare `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`, `firestore.rules`. Nessuna dipendenza npm nuova.
- Chip, «Esegui ora», toggle, Esporta, Ripristina, Annulla ripristino, Registro Excel, Backup ZIP e Backup completo restano.
- Versione resta `1.1.77` fino al task 3. Non pubblicare prima.

---

### Task 1: plugin DriveAuth

**Files:**
- Create: `src/lib/driveAuth.ts`
- Create: `src/lib/driveAuth.test.ts`
- Create: `android/app/src/main/java/it/groomly/app/DriveAuthPlugin.java`
- Modify: `android/app/src/main/java/it/groomly/app/MainActivity.java`
- Modify: `android/app/build.gradle`

**Interfaces:**
- Produces: `DriveAuth.collega(): Promise<{ collegato: boolean; email: string | null }>`, `DriveAuth.leggi()` con lo stesso tipo, `DriveAuth.scollega(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`src/lib/driveAuth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DriveAuth } from './driveAuth'

describe('DriveAuth sul web', () => {
  it('non collega e non risulta collegato', async () => {
    await expect(DriveAuth.collega()).rejects.toThrow('telefono')
    await expect(DriveAuth.scollega()).rejects.toThrow('telefono')
    await expect(DriveAuth.leggi()).resolves.toEqual({ collegato: false, email: null })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/driveAuth.test.ts`

Expected: FAIL, modulo assente.

- [ ] **Step 3: Write minimal implementation**

`src/lib/driveAuth.ts`:

```ts
import { registerPlugin, WebPlugin } from '@capacitor/core'

export interface DriveAccount {
  collegato: boolean
  email: string | null
}

export interface DriveAuthPlugin {
  collega(): Promise<DriveAccount>
  leggi(): Promise<DriveAccount>
  scollega(): Promise<void>
}

class DriveAuthWeb extends WebPlugin implements DriveAuthPlugin {
  async collega(): Promise<DriveAccount> {
    throw new Error('telefono')
  }

  async leggi(): Promise<DriveAccount> {
    return { collegato: false, email: null }
  }

  async scollega(): Promise<void> {
    throw new Error('telefono')
  }
}

export const DriveAuth = registerPlugin<DriveAuthPlugin>('DriveAuth', {
  web: () => new DriveAuthWeb(),
})
```

`android/app/build.gradle`, dentro `dependencies`, dopo la riga di `capacitor-android`:

```gradle
implementation "com.google.android.gms:play-services-auth:21.4.0"
```

`MainActivity.onCreate`, subito prima di `registerPlugin(AppInstallerPlugin.class);`:

```java
registerPlugin(DriveAuthPlugin.class);
```

`DriveAuthPlugin.java` intero. Il tipo del risultato di `authorize` è `com.google.android.gms.auth.api.identity.Authorization`. Se il compilatore nomina quella classe `AuthorizationResult`, usa quel nome e non cambiare il resto. Non scrivere il token nei log.

```java
package it.groomly.app;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.Authorization;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;

@CapacitorPlugin(name = "DriveAuth")
public class DriveAuthPlugin extends Plugin {
    private static final String SCOPE_EMAIL = "https://www.googleapis.com/auth/userinfo.email";
    private static final String SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";

    private PluginCall pending;

    private AuthorizationClient client() {
        return Identity.getAuthorizationClient(getActivity());
    }

    private AuthorizationRequest request() {
        List<Scope> scopes = Arrays.asList(new Scope(SCOPE_EMAIL), new Scope(SCOPE_DRIVE_FILE));
        return AuthorizationRequest.builder().setRequestedScopes(scopes).build();
    }

    private boolean hasToken(Authorization result) {
        String token = result.getAccessToken();
        return token != null && token.length() > 0;
    }

    private JSObject accountOf(Authorization result) {
        JSObject out = new JSObject();
        boolean collegato = hasToken(result);
        out.put("collegato", collegato);
        String email = null;
        GoogleSignInAccount account = result.toGoogleSignInAccount();
        if (account != null) email = account.getEmail();
        out.put("email", email == null ? JSONObject.NULL : email);
        return out;
    }

    private void finishQuiet(PluginCall call, Authorization result) {
        if (result.hasResolution() || result.getPendingIntent() != null) {
            JSObject out = new JSObject();
            out.put("collegato", false);
            out.put("email", JSONObject.NULL);
            call.resolve(out);
            return;
        }
        call.resolve(accountOf(result));
    }

    @PluginMethod
    public void leggi(PluginCall call) {
        client().authorize(request())
            .addOnSuccessListener(result -> finishQuiet(call, result))
            .addOnFailureListener(error -> call.reject("collegamento"));
    }

    private androidx.activity.result.ActivityResultLauncher<IntentSenderRequest> launcher;

    @Override
    public void load() {
        launcher = getBridge().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::onGoogle
        );
    }

    private void onGoogle(ActivityResult result) {
        PluginCall call = pending;
        pending = null;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("annullato");
            return;
        }
        try {
            Authorization granted = client().getAuthorizationResultFromIntent(result.getData());
            if (!hasToken(granted)) call.reject("collegamento");
            else call.resolve(accountOf(granted));
        } catch (ApiException error) {
            call.reject("collegamento");
        }
    }

    @PluginMethod
    public void collega(PluginCall call) {
        client().authorize(request())
            .addOnSuccessListener(result -> {
                if (!result.hasResolution() || result.getPendingIntent() == null) {
                    if (!hasToken(result)) call.reject("collegamento");
                    else call.resolve(accountOf(result));
                    return;
                }
                pending = call;
                saveCall(call);
                launcher.launch(new IntentSenderRequest.Builder(result.getPendingIntent()).build());
            })
            .addOnFailureListener(error -> call.reject("collegamento"));
    }

    @PluginMethod
    public void scollega(PluginCall call) {
        client().authorize(request())
            .addOnSuccessListener(result -> {
                String token = result.getAccessToken();
                if (result.hasResolution() || token == null || token.length() == 0) {
                    call.resolve();
                    return;
                }
                ClearTokenRequest clear = ClearTokenRequest.builder().setToken(token).build();
                client().clearToken(clear)
                    .addOnSuccessListener(unused -> call.resolve())
                    .addOnFailureListener(error -> call.reject("scollega"));
            })
            .addOnFailureListener(error -> call.reject("scollega"));
    }

}
```

Togli l'import di `Intent` se non serve. `getPendingIntent()` può essere null: il ramo `hasResolution` già lo controlla. Se `load()` parte troppo tardi e Android rifiuta la registrazione del launcher, fermati e riporta l'eccezione: non spostare la registrazione in un altro punto di tua iniziativa.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/driveAuth.test.ts`

Expected: PASS.

Poi, in `android`: `.\gradlew :app:compileDebugJavaWithJavac`

Expected: BUILD SUCCESSFUL. Se il nome di una classe Play Services non coincide, correggi solo quel nome e ricompila. Non aggiungere scope.

- [ ] **Step 5: Commit**

```powershell
git add -- src/lib/driveAuth.ts src/lib/driveAuth.test.ts android/app/src/main/java/it/groomly/app/DriveAuthPlugin.java android/app/src/main/java/it/groomly/app/MainActivity.java android/app/build.gradle
git commit -m "feat: si può chiedere il permesso drive.file"
```

Se `capacitor.build.gradle` o `package-lock.json` si sporcano, `git checkout --` e non committarli.

---

### Task 2: riga Collega Google Drive

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `DriveAuth` dal task 1.

- [ ] **Step 1: Write the failing test**

Nel `vi.hoisted` di `SettingsPage.test.tsx` aggiungi il mock e resettalo in `beforeEach` con `leggi` che risolve `{ collegato: false, email: null }`.

```ts
const { driveCollega, driveLeggi, driveScollega } = vi.hoisted(() => ({
  driveCollega: vi.fn(),
  driveLeggi: vi.fn(async () => ({ collegato: false, email: null })),
  driveScollega: vi.fn(),
}))
vi.mock('../lib/driveAuth', () => ({
  DriveAuth: { collega: driveCollega, leggi: driveLeggi, scollega: driveScollega },
}))
```

Test:

```tsx
it('collega Google Drive e lo scollega', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  driveLeggi.mockResolvedValue({ collegato: false, email: null })
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('heading', { name: 'Impostazioni' })
  expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Scollega' })).not.toBeInTheDocument()
  driveCollega.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
  await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Google Drive collegato')
  expect(screen.getByText('roberto@gmail.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
  driveScollega.mockResolvedValue(undefined)
  await user.click(screen.getByRole('button', { name: 'Scollega' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Google Drive scollegato')
  expect(screen.queryByText('roberto@gmail.com')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
})

it('all apertura mostra l account gia collegato senza toast', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  expect(await screen.findByText('roberto@gmail.com')).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(driveCollega).not.toHaveBeenCalled()
})

it('chiudere il foglio Google non mostra un errore', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('button', { name: 'Collega Google Drive' })
  driveCollega.mockRejectedValue(new Error('annullato'))
  await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
  await waitFor(() => expect(driveCollega).toHaveBeenCalledOnce())
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeEnabled()
})

it('un collegamento fallito resta scollegato', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('button', { name: 'Collega Google Drive' })
  driveCollega.mockRejectedValue(new Error('collegamento'))
  await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Collegamento Google non riuscito')
  expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
})

it('senza rete non chiama Google', async () => {
  await createAccount('maria@salone.it', 'segretissimo')
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath="/impostazioni" />)
  await screen.findByRole('button', { name: 'Collega Google Drive' })
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
  await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
  expect(driveCollega).not.toHaveBeenCalled()
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SettingsPage.test.tsx -t "collega Google Drive"`

Expected: FAIL, pulsante assente.

- [ ] **Step 3: Write minimal implementation**

In `SettingsPage.tsx` importa `DriveAuth`. Stato:

```tsx
const [driveEmail, setDriveEmail] = useState<string | null>(null)
const [driveBusy, setDriveBusy] = useState(false)
```

Effetto all'apertura, dipendente da `uid`:

```tsx
useEffect(() => {
  if (!uid) return
  let spento = false
  void DriveAuth.leggi()
    .then((account) => {
      if (spento) return
      setDriveEmail(account.collegato ? account.email ?? 'Google Drive collegato' : null)
    })
    .catch(() => {
      if (!spento) setDriveEmail(null)
    })
  return () => { spento = true }
}, [uid])
```

Quando `collegato` è vero e `email` è null, il testo mostrato è «Google Drive collegato». Usa quel testo anche come assente di email, e il pulsante resta **Scollega**.

```tsx
async function collegaDrive() {
  if (driveBusy) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    toast.show('Connessione assente', 'plain')
    return
  }
  setDriveBusy(true)
  try {
    const account = await DriveAuth.collega()
    if (!account.collegato) {
      toast.show('Collegamento Google non riuscito', 'plain')
      return
    }
    setDriveEmail(account.email ?? 'Google Drive collegato')
    toast.show('Google Drive collegato', 'plain')
  } catch (error) {
    if (error instanceof Error && error.message === 'annullato') return
    if (error instanceof Error && error.message === 'telefono') {
      toast.show('Il collegamento a Google Drive funziona sul telefono', 'plain')
      return
    }
    toast.show('Collegamento Google non riuscito', 'plain')
  } finally {
    setDriveBusy(false)
  }
}

async function scollegaDrive() {
  if (driveBusy) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    toast.show('Connessione assente', 'plain')
    return
  }
  setDriveBusy(true)
  try {
    await DriveAuth.scollega()
    setDriveEmail(null)
    toast.show('Google Drive scollegato', 'plain')
  } catch (error) {
    if (error instanceof Error && error.message === 'telefono') {
      toast.show('Il collegamento a Google Drive funziona sul telefono', 'plain')
      return
    }
    toast.show('Collegamento Google non riuscito', 'plain')
  } finally {
    setDriveBusy(false)
  }
}
```

Subito sotto la `SRow` del toggle «Backup automatico giornaliero»:

```tsx
<SRow>
  {driveEmail ? (
    <>
      <span style={{ flex: 1 }}>{driveEmail}</span>
      <Button variant="secondary" size="sm" onClick={() => { void scollegaDrive() }} disabled={driveBusy}>Scollega</Button>
    </>
  ) : (
    <Button variant="secondary" onClick={() => { void collegaDrive() }} disabled={driveBusy} style={{ flex: 1 }}>
      Collega Google Drive
    </Button>
  )}
</SRow>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/SettingsPage.test.tsx src/lib/driveAuth.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/pages/SettingsPage.tsx src/pages/SettingsPage.test.tsx
git commit -m "feat: in Dati e backup si collega Google Drive"
```

---

### Task 3: pubblicazione

**Files:**
- Modify: `src/lib/appVersion.ts`, `package.json`, `android/app/build.gradle`, `hosting/release.json`

- [ ] **Step 1: Versione**

Se `APP_VERSION` non è `1.1.77`, fermati e riporta il valore. Se lo è, pubblica `1.1.78`, `versionCode` 10178. Note: `In Dati e backup si può collegare Google Drive.` URL `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.78/groomly.apk`.

- [ ] **Step 2: APK**

Copia `.env.local` da `D:\Groomly` se manca nel worktree. Non committarlo.

`npm test`, `npm run build`, `npx cap sync android`, in `android` `.\gradlew assembleDebug`. Copia l'apk debug in `groomly.apk` nella radice del worktree, fuori da `hosting/`. Lo script `index-*.js` dentro l'apk deve contenere `AIza`, `1.1.78` e `Collega Google Drive`. Se manca `AIza`, fermati.

Ripristina con `git checkout --` il CRLF di `android/app/capacitor.build.gradle` e `android/capacitor.settings.gradle`, e `package-lock.json` se si è sporcato. Non committarli.

- [ ] **Step 3: Commit**

```powershell
git add -- src/lib/appVersion.ts package.json android/app/build.gradle hosting/release.json
git commit -m "release: 1.1.78, si può collegare Google Drive"
```

- [ ] **Step 4: Push del ramo di integrazione**

In `D:\Groomly`, senza stash e senza committare i file di archivio sporchi:

```powershell
git merge --ff-only feat/drive-collegamento
git push origin HEAD:feat/listino-razze
```

Non `git push origin HEAD` e non `git push origin main`. Se il fast-forward fallisce, fermati.

- [ ] **Step 5: Release e Hosting**

```powershell
gh release create v1.1.78 D:\Groomly-worktrees\drive-collegamento\groomly.apk --repo robmass83-ui/Groomly --target feat/listino-razze --title "v1.1.78" --notes "In Dati e backup si può collegare Google Drive."
npx firebase deploy --only firestore:rules,firestore:indexes,hosting --project groomly-3128b
```

Se `gh` o Firebase non sono autenticati, fermati. Non forzare il push e non saltare gli hook.
