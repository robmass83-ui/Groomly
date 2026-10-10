# Installazione APK in-app — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scarica scarica l’APK dentro l’app e apre l’installazione di Android, senza il browser.

**Architecture:** `UpdateNotice` su Android chiama il plugin locale `AppInstaller`. Il plugin scarica in cache e lancia l’intent di sistema. Fuori da Android il bottone apre ancora l’URL con `Browser.open`. Il tocco Installa del sistema resta.

**Tech Stack:** React, Vitest, Capacitor 8, plugin Java in `android/app`.

## Global Constraints

- Il testo del foglio resta: «È pronta la versione {versione}. Scaricala e installala al posto di questa.»
- Percentuale: parte intera di `received / total × 100`, da 0 a 100. Se `total` è 0, la scritta è «Download…».
- Errore di download o intent: «Download non riuscito». Permesso ancora assente: «Per installare, consenti le app di Groomly».
- Solo URL `https`. File di cache: `groomly-update.apk`. Nessuna libreria esterna.
- La promise si risolve quando l’intent parte, non quando l’utente preme Installa.
- `cache-path` in `file_paths.xml` c’è già: non modificarlo.
- **Più tardi** chiude il foglio e, solo se un download è in corso, chiama `cancel()`.

---

### Task 1: Foglio e contratto del plugin

**Files:**
- Create: `src/lib/appInstaller.ts`
- Modify: `src/app/UpdateNotice.tsx`
- Test: `src/app/UpdateNotice.test.tsx`

**Interfaces:**
- Consumes: `AppRelease` da `src/lib/appRelease.ts` (`version`, `url`)
- Produces:
  - `downloadLabel(received: number, total: number): string`
  - `AppInstaller.downloadAndInstall(options: { url: string }): Promise<{ opened: 'installer' | 'settings' }>`
  - `AppInstaller.installDownloaded(): Promise<{ opened: 'installer' | 'settings' | 'none' }>`
  - `AppInstaller.cancel(): Promise<void>`
  - evento `progress`: `{ received: number; total: number }`
  - evento `resume`: `{ opened: 'installer' | 'settings' }`

- [ ] **Step 1: Write the failing test**

Sostituire `src/app/UpdateNotice.test.tsx` con:

```tsx
// @vitest-environment happy-dom
import { Browser } from '@capacitor/browser'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppInstaller } from '../lib/appInstaller'
import { downloadLabel } from './UpdateNotice'
import { UpdateNotice } from './UpdateNotice'

const platform = vi.hoisted(() => ({ value: 'android' }))

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => platform.value },
}))

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn() },
}))

vi.mock('../lib/appInstaller', () => ({
  AppInstaller: {
    downloadAndInstall: vi.fn(),
    installDownloaded: vi.fn(),
    cancel: vi.fn(),
    addListener: vi.fn(async () => ({ remove: async () => {} })),
  },
}))

const release = { version: '9.0.0', url: 'https://github.com/robmass83-ui/Groomly/releases/download/v9.0.0/groomly.apk' }

describe('avviso di aggiornamento', () => {
  beforeEach(() => {
    platform.value = 'android'
    vi.mocked(Browser.open).mockClear()
    vi.mocked(AppInstaller.downloadAndInstall).mockReset()
    vi.mocked(AppInstaller.installDownloaded).mockReset()
    vi.mocked(AppInstaller.cancel).mockReset()
    vi.mocked(AppInstaller.addListener).mockReset()
    vi.mocked(AppInstaller.addListener).mockImplementation(async () => ({ remove: async () => {} }))
    vi.mocked(AppInstaller.cancel).mockResolvedValue()
  })

  it('calcola la percentuale intera e senza lunghezza dice Download…', () => {
    expect(downloadLabel(40, 100)).toBe('Download 40%')
    expect(downloadLabel(1, 3)).toBe('Download 33%')
    expect(downloadLabel(10, 0)).toBe('Download…')
  })

  it('su Android Scarica chiama il plugin e non il browser', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'installer' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledWith({ url: release.url })
    expect(Browser.open).not.toHaveBeenCalled()
  })

  it('il progresso cambia la scritta del bottone', async () => {
    const user = userEvent.setup()
    let progress: (event: { received: number; total: number }) => void = () => {}
    vi.mocked(AppInstaller.addListener).mockImplementation(async (event, listener) => {
      if (event === 'progress') progress = listener as typeof progress
      return { remove: async () => {} }
    })
    vi.mocked(AppInstaller.downloadAndInstall).mockImplementation(() => new Promise(() => {}))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    progress({ received: 40, total: 100 })
    expect(screen.getByRole('button', { name: 'Download 40%' })).toBeDisabled()
  })

  it('se il download fallisce mostra l’errore e Scarica riprova', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockRejectedValueOnce(new Error('rete'))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Download non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scarica' })).toBeEnabled()
  })

  it('senza permesso spiega il consenso e un secondo Scarica non riscarica', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'settings' })
    vi.mocked(AppInstaller.installDownloaded).mockResolvedValue({ opened: 'settings' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Per installare, consenti le app di Groomly')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledTimes(1)
    expect(AppInstaller.installDownloaded).toHaveBeenCalledTimes(1)
  })

  it('al ritorno con il permesso apre l’installazione senza un altro download', async () => {
    const user = userEvent.setup()
    let resume: (event: { opened: 'installer' | 'settings' }) => void = () => {}
    vi.mocked(AppInstaller.addListener).mockImplementation(async (event, listener) => {
      if (event === 'resume') resume = listener as typeof resume
      return { remove: async () => {} }
    })
    vi.mocked(AppInstaller.downloadAndInstall).mockResolvedValue({ opened: 'settings' })
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Per installare, consenti le app di Groomly')).toBeInTheDocument()
    resume({ opened: 'installer' })
    expect(screen.queryByText('Per installare, consenti le app di Groomly')).not.toBeInTheDocument()
    expect(AppInstaller.downloadAndInstall).toHaveBeenCalledTimes(1)
  })

  it('fuori da Android apre il browser', async () => {
    platform.value = 'web'
    const user = userEvent.setup()
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(Browser.open).toHaveBeenCalledWith({ url: release.url })
    expect(AppInstaller.downloadAndInstall).not.toHaveBeenCalled()
  })

  it('non compare se la release è quella già installata e Più tardi chiude', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<UpdateNotice release={{ version: '1.1.1', url: 'https://github.com/apk' }} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<UpdateNotice release={{ version: '1.2.0', url: 'https://github.com/apk' }} />)
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(AppInstaller.cancel).not.toHaveBeenCalled()
  })

  it('Più tardi durante il download lo interrompe', async () => {
    const user = userEvent.setup()
    vi.mocked(AppInstaller.downloadAndInstall).mockImplementation(() => new Promise(() => {}))
    render(<UpdateNotice release={release} />)
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    await user.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(AppInstaller.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

La versione già installata nel test è `1.1.1` perché `APP_VERSION` oggi è `1.1.1`. Se il task 3 l’ha già alzata, usa quel valore.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/UpdateNotice.test.tsx`

Expected: FAIL perché `downloadLabel` e `AppInstaller` non esistono.

- [ ] **Step 3: Write minimal implementation**

`src/lib/appInstaller.ts`:

```ts
import { registerPlugin, WebPlugin, type PluginListenerHandle } from '@capacitor/core'

export type InstallOpened = 'installer' | 'settings' | 'none'

export interface AppInstallerPlugin {
  downloadAndInstall(options: { url: string }): Promise<{ opened: 'installer' | 'settings' }>
  installDownloaded(): Promise<{ opened: InstallOpened }>
  cancel(): Promise<void>
  addListener(event: 'progress', listener: (event: { received: number; total: number }) => void): Promise<PluginListenerHandle>
  addListener(event: 'resume', listener: (event: { opened: 'installer' | 'settings' }) => void): Promise<PluginListenerHandle>
}

class AppInstallerWeb extends WebPlugin implements AppInstallerPlugin {
  async downloadAndInstall(): Promise<{ opened: 'installer' | 'settings' }> {
    throw new Error('unavailable')
  }

  async installDownloaded(): Promise<{ opened: InstallOpened }> {
    return { opened: 'none' }
  }

  async cancel(): Promise<void> {}
}

export const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller', {
  web: () => new AppInstallerWeb(),
})
```

`src/app/UpdateNotice.tsx`:

```tsx
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/layout/Sheet'
import { AppInstaller } from '../lib/appInstaller'
import { fetchLatestRelease, isNewerVersion, type AppRelease } from '../lib/appRelease'
import { APP_VERSION } from '../lib/appVersion'

export function downloadLabel(received: number, total: number): string {
  if (total <= 0) return 'Download…'
  const percent = Math.floor((received / total) * 100)
  const clamped = Math.max(0, Math.min(100, percent))
  return `Download ${clamped}%`
}

export function UpdateNotice({ release }: { release?: AppRelease | null }) {
  const [offer, setOffer] = useState<AppRelease | null>(null)
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState('Scarica')
  const [notice, setNotice] = useState<string | null>(null)
  const [awaitingPermission, setAwaitingPermission] = useState(false)
  const shown = useRef(true)

  useEffect(() => {
    if (release !== undefined) {
      setOffer(release && isNewerVersion(release.version, APP_VERSION) ? release : null)
      return
    }
    if (import.meta.env.MODE === 'test') return
    let live = true
    void fetchLatestRelease().then((latest) => {
      if (!live || !latest || !isNewerVersion(latest.version, APP_VERSION)) return
      setOffer(latest)
    })
    return () => {
      live = false
    }
  }, [release])

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    let remove = () => {}
    void AppInstaller.addListener('progress', (event) => {
      setLabel(downloadLabel(event.received, event.total))
    }).then((handle) => {
      remove = () => {
        void handle.remove()
      }
    })
    let removeResume = () => {}
    void AppInstaller.addListener('resume', (event) => {
      if (event.opened === 'installer') {
        setAwaitingPermission(false)
        setNotice(null)
        setBusy(false)
        setLabel('Scarica')
      }
    }).then((handle) => {
      removeResume = () => {
        void handle.remove()
      }
    })
    return () => {
      remove()
      removeResume()
    }
  }, [])

  if (!offer || hidden) return null

  async function startDownload() {
    if (!offer) return
    shown.current = true
    setBusy(true)
    setNotice(null)
    setLabel(downloadLabel(0, 0))
    try {
      const result = awaitingPermission
        ? await AppInstaller.installDownloaded()
        : await AppInstaller.downloadAndInstall({ url: offer.url })
      if (!shown.current) return
      if (result.opened === 'settings') {
        setAwaitingPermission(true)
        setNotice('Per installare, consenti le app di Groomly')
      } else if (result.opened === 'none') {
        setAwaitingPermission(false)
        setNotice('Download non riuscito')
      } else {
        setAwaitingPermission(false)
        setNotice(null)
      }
    } catch {
      if (shown.current) setNotice('Download non riuscito')
    } finally {
      if (shown.current) {
        setBusy(false)
        setLabel('Scarica')
      }
    }
  }

  return (
    <Sheet open title="Aggiornamento disponibile" onClose={() => setHidden(true)}>
      <p style={{ margin: 0 }}>È pronta la versione {offer.version}. Scaricala e installala al posto di questa.</p>
      {notice ? <p style={{ margin: 0 }}>{notice}</p> : null}
      <Button
        disabled={busy}
        onClick={() => {
          if (Capacitor.getPlatform() === 'android') {
            void startDownload()
            return
          }
          void Browser.open({ url: offer.url })
        }}
      >
        {label}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          shown.current = false
          if (busy) void AppInstaller.cancel()
          setHidden(true)
        }}
      >
        Più tardi
      </Button>
    </Sheet>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/UpdateNotice.test.tsx`

Expected: PASS, 8 test.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/appInstaller.ts src/app/UpdateNotice.tsx src/app/UpdateNotice.test.tsx
git commit -m @"
feat: Scarica avvia il download dell'APK invece del browser

Su Android il foglio mostra l'avanzamento e, senza permesso, il consenso di sistema.
"@
```

---

### Task 2: Plugin Android

**Files:**
- Create: `android/app/src/main/java/it/groomly/app/AppInstallerPlugin.java`
- Modify: `android/app/src/main/java/it/groomly/app/MainActivity.java`
- Modify: `android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: il contratto del task 1 (`downloadAndInstall`, `installDownloaded`, `cancel`, eventi `progress` e `resume`)
- Produces: lo stesso contratto, eseguito dal processo Android

- [ ] **Step 1: Write the failing test**

Il comportamento JS è già coperto dal task 1 contro il mock. Questo task fallisce la build finché la classe non compila. Non aggiungere un test Vitest nuovo.

- [ ] **Step 2: Run test to verify it fails**

Non c’è un test rosso di Java. Il controllo è la compilazione nello step 4, dopo il codice.

- [ ] **Step 3: Write minimal implementation**

In `AndroidManifest.xml`, subito dopo gli altri `uses-permission`:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

`MainActivity.java`:

```java
package it.groomly.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

`AppInstallerPlugin.java`:

```java
package it.groomly.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppInstaller")
public class AppInstallerPlugin extends Plugin {
    private volatile boolean cancelled;
    private volatile boolean fileReady;
    private volatile boolean waitingForPermission;
    private volatile HttpURLConnection connection;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("url");
            return;
        }
        cancelled = false;
        fileReady = false;
        execute(() -> {
            File file = new File(getContext().getCacheDir(), "groomly-update.apk");
            HttpURLConnection conn = null;
            try {
                if (file.exists() && !file.delete()) {
                    call.reject("file");
                    return;
                }
                conn = (HttpURLConnection) new URL(url).openConnection();
                connection = conn;
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Groomly");
                conn.connect();
                int status = conn.getResponseCode();
                if (status < 200 || status >= 300) {
                    call.reject("status");
                    return;
                }
                long total = conn.getContentLengthLong();
                if (total < 0) total = 0;
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(file)) {
                    byte[] buffer = new byte[8192];
                    long received = 0;
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        if (cancelled) {
                            file.delete();
                            call.reject("cancelled");
                            return;
                        }
                        out.write(buffer, 0, read);
                        received += read;
                        JSObject progress = new JSObject();
                        progress.put("received", received);
                        progress.put("total", total);
                        notifyListeners("progress", progress);
                    }
                }
                if (cancelled) {
                    file.delete();
                    call.reject("cancelled");
                    return;
                }
                fileReady = true;
                resolveOpened(call);
            } catch (Exception error) {
                file.delete();
                if (!cancelled) call.reject(error.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
                connection = null;
            }
        });
    }

    @PluginMethod
    public void installDownloaded(PluginCall call) {
        if (!fileReady) {
            JSObject result = new JSObject();
            result.put("opened", "none");
            call.resolve(result);
            return;
        }
        resolveOpened(call);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelled = true;
        HttpURLConnection conn = connection;
        if (conn != null) conn.disconnect();
        call.resolve();
    }

    @Override
    protected void handleOnResume() {
        if (!waitingForPermission || !fileReady || !canInstall()) return;
        waitingForPermission = false;
        if (!openInstaller()) return;
        JSObject event = new JSObject();
        event.put("opened", "installer");
        notifyListeners("resume", event);
    }

    private void resolveOpened(PluginCall call) {
        if (openInstaller()) {
            waitingForPermission = false;
            JSObject result = new JSObject();
            result.put("opened", "installer");
            call.resolve(result);
            return;
        }
        if (openSettings()) {
            waitingForPermission = true;
            JSObject result = new JSObject();
            result.put("opened", "settings");
            call.resolve(result);
            return;
        }
        call.reject("intent");
    }

    private boolean canInstall() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    private boolean openInstaller() {
        if (!canInstall()) return false;
        try {
            File file = new File(getContext().getCacheDir(), "groomly-update.apk");
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private boolean openSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception error) {
            return false;
        }
    }
}
```

`handleOnResume` apre l’installer solo se si era aperta la schermata del permesso e, al ritorno, il permesso c’è. Un semplice ritorno sull’app non rilancia l’installazione.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/UpdateNotice.test.tsx`

Expected: PASS

Run, da `android`: `.\gradlew assembleDebug`

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```powershell
git add android/app/src/main/AndroidManifest.xml android/app/src/main/java/it/groomly/app/MainActivity.java android/app/src/main/java/it/groomly/app/AppInstallerPlugin.java
git commit -m @"
feat: il plugin Android scarica l'APK e apre l'installazione

Il file resta in cache. Senza il permesso si apre la schermata di sistema di Groomly.
"@
```

---

### Task 3: Pubblicare la 1.1.2

Seguire `.cursor/rules/publish-update.mdc`.

- [ ] **Step 1: Alza la versione**

`1.1.1` → `1.1.2`. `versionCode` → `10102`.

- `src/lib/appVersion.ts` → `APP_VERSION = '1.1.2'`
- `package.json` e le due voci `groomly` in `package-lock.json` → `1.1.2`
- `android/app/build.gradle` → `versionName "1.1.2"` e `versionCode 10102`
- `hosting/release.json` → `version` `1.1.2` e url `https://github.com/robmass83-ui/Groomly/releases/download/v1.1.2/groomly.apk`
- Nel test del task 1, la release «già installata» deve essere `1.1.2`, non `1.1.1`

- [ ] **Step 2: Verifica e APK**

Run: `npm test` poi `npm run build`, `npx cap sync android`, e in `android` `.\gradlew assembleDebug`.

Copiare l’APK in `groomly.apk` nella radice, fuori da `hosting/` e fuori dal commit.

- [ ] **Step 3: GitHub e Firebase**

Commit delle versioni, push su `origin`, poi:

```powershell
gh release create v1.1.2 groomly.apk --repo robmass83-ui/Groomly --title "v1.1.2" --notes "Scarica scarica l'APK e apre l'installazione di Android."
npx firebase deploy --only firestore:rules,firestore:indexes,storage,hosting --project groomly-3128b
```

Se Storage non è attivato, pubblicare comunque Firestore e Hosting. L’asset della release si chiama `groomly.apk`.
