# Invio del backup su Google Drive — piano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Con Drive collegato, creare la cartella dell’app e caricarci lo ZIP di Backup completo, anche in automatico all’apertura se il toggle giornaliero è acceso e c’è il Wi-Fi.

**Architecture:** JavaScript costruisce lo ZIP già esistente e lo scrive in cache. `DriveAuth.carica` in Java ottiene il token, trova o crea la cartella e fa l’upload resumable. Il token non torna a JavaScript. L’automatico sta in un componente nuovo, accanto al backup giornaliero, e non lo modifica.

**Tech Stack:** Capacitor 8, Play Services Auth 21.4.0 già presente, `HttpURLConnection`, Vitest, happy-dom.

## Global Constraints

- Scope invariati: `https://www.googleapis.com/auth/userinfo.email` e `https://www.googleapis.com/auth/drive.file`.
- Non chiamare `setServerClientId`. Non aggiungere un client Web. Non modificare `google-services.json`.
- Il token non si logga, non è un campo JS, non va in `localStorage` né in Firestore.
- `carica` non apre il foglio Google. Senza token, con flag `driveScollegato`, o se serve ancora il consenso: rifiuto `ricollega`.
- Sul web `carica` lancia `Error('telefono')` e `wifi` risolve `{ wifi: false }`.
- Cartella: `Groomly Backup – {nomeSicuro(nome salone || 'Groomly')}`.
- File: lo ZIP di `backupCompleto`, stesso nome.
- Chiave `groomly.users.${uid}.driveUltimoInvio`. Non toccare `backup.lastAt` né il chip.
- Non modificare `DailyBackup`, «Esegui ora», il toggle, Esporta, Ripristina, Annulla ripristino, Registro Excel, Backup ZIP, Backup completo.
- Non toccare `client.ts`, `enabled.ts`, `vite.config.ts`, `firebaseEnv.test.ts`, `backupZip.ts`, `backupCompleto.ts`, `registroXlsx.ts`, `firestore.rules`.
- Nessuna dipendenza npm o Gradle nuova.
- Branch `feat/drive-invio`. Non pushare `origin/main`.

---

### Task 1: Il plugin sa caricare un file e dire se c’è il Wi-Fi

**Files:**
- Modify: `src/lib/driveAuth.ts`
- Modify: `src/lib/driveAuth.test.ts`
- Create: `android/app/src/main/java/it/groomly/app/DriveUpload.java`
- Modify: `android/app/src/main/java/it/groomly/app/DriveAuthPlugin.java`

**Interfaces:**
- Consumes: `AuthorizationClient`, `AuthorizationRequest`, SharedPreferences `groomly`, flag `driveScollegato`.
- Produces: `DriveAuth.carica({ cartella, nome, percorso }): Promise<void>` e `DriveAuth.wifi(): Promise<{ wifi: boolean }>`. Rifiuti stringa `telefono`, `ricollega`, `invio`.

- [ ] **Step 1: Estendi il test web**

In `src/lib/driveAuth.test.ts` il test diventa:

```ts
it('non collega, non carica e non è sul Wi-Fi', async () => {
  await expect(DriveAuth.collega()).rejects.toThrow('telefono')
  await expect(DriveAuth.scollega()).rejects.toThrow('telefono')
  await expect(DriveAuth.leggi()).resolves.toEqual({ collegato: false, email: null })
  await expect(DriveAuth.carica({ cartella: 'Groomly Backup – Pelosetti', nome: 'a.zip', percorso: 'file:///tmp/a.zip' })).rejects.toThrow('telefono')
  await expect(DriveAuth.wifi()).resolves.toEqual({ wifi: false })
})
```

- [ ] **Step 2: Fallisce**

Run: `npx vitest run src/lib/driveAuth.test.ts`
Expected: FAIL, `carica` o `wifi` assenti.

- [ ] **Step 3: Interfaccia web**

In `src/lib/driveAuth.ts` aggiungi a `DriveAuthPlugin` e a `DriveAuthWeb`:

```ts
export interface DriveCarica {
  cartella: string
  nome: string
  percorso: string
}

carica(input: DriveCarica): Promise<void>
wifi(): Promise<{ wifi: boolean }>
```

`carica` lancia `new Error('telefono')`. `wifi` ritorna `{ wifi: false }`.

- [ ] **Step 4: Il test web passa**

Run: `npx vitest run src/lib/driveAuth.test.ts`
Expected: PASS.

- [ ] **Step 5: `DriveUpload.java`**

Crea la classe nello stesso package. Non loggare il token, l’uri o il corpo della risposta.

```java
package it.groomly.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.tasks.Tasks;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

final class DriveUpload {
    static final class Stop extends Exception {
        final String code;
        Stop(String code) { this.code = code; }
    }

    private static final int CHUNK = 8 * 1024 * 1024;
    private static final String PREFS_ID = "driveCartellaId";
    private static final String PREFS_NOME = "driveCartellaNome";

    private DriveUpload() {}

    static void carica(
        Context context,
        AuthorizationClient client,
        AuthorizationRequest request,
        SharedPreferences prefs,
        boolean scollegato,
        String cartella,
        String nome,
        String percorso
    ) throws Exception {
        if (scollegato) throw new Stop("ricollega");
        if (cartella == null || cartella.length() == 0 || nome == null || nome.length() == 0 || percorso == null || percorso.length() == 0) {
            throw new Stop("invio");
        }
        File file = fileOf(percorso);
        if (file == null || !file.isFile() || file.length() <= 0) throw new Stop("invio");
        AuthorizationResult granted;
        try {
            granted = Tasks.await(client.authorize(request), 30, TimeUnit.SECONDS);
        } catch (Exception error) {
            throw new Stop("invio");
        }
        String token = granted.getAccessToken();
        if (granted.hasResolution() || granted.getPendingIntent() != null || token == null || token.length() == 0) {
            throw new Stop("ricollega");
        }
        String folderId = cartellaId(prefs, token, cartella);
        invia(token, folderId, nome, file);
    }

    private static File fileOf(String percorso) {
        Uri uri = Uri.parse(percorso);
        if (!"file".equals(uri.getScheme()) || uri.getPath() == null) return null;
        return new File(uri.getPath());
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("'", "\\'");
    }

    private static String cartellaId(SharedPreferences prefs, String token, String cartella) throws Exception {
        String savedId = prefs.getString(PREFS_ID, "");
        String savedNome = prefs.getString(PREFS_NOME, "");
        if (cartella.equals(savedNome) && savedId != null && savedId.length() > 0 && esiste(token, savedId)) {
            return savedId;
        }
        String q = "mimeType='application/vnd.google-apps.folder' and name='" + escape(cartella) + "' and trashed=false";
        String url = "https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)&q="
            + URLEncoder.encode(q, StandardCharsets.UTF_8);
        HttpResult found = exchange("GET", url, token, null, null);
        if (found.code == 200) {
            JSONArray files = new JSONObject(found.body).optJSONArray("files");
            if (files != null && files.length() > 0) {
                String id = files.getJSONObject(0).getString("id");
                ricorda(prefs, cartella, id);
                return id;
            }
        }
        JSONObject meta = new JSONObject();
        meta.put("name", cartella);
        meta.put("mimeType", "application/vnd.google-apps.folder");
        HttpResult created = exchange("POST", "https://www.googleapis.com/drive/v3/files", token, "application/json; charset=UTF-8", meta.toString().getBytes(StandardCharsets.UTF_8));
        if (created.code != 200 && created.code != 201) throw new Stop("invio");
        String id = new JSONObject(created.body).getString("id");
        ricorda(prefs, cartella, id);
        return id;
    }

    private static boolean esiste(String token, String id) throws Exception {
        String url = "https://www.googleapis.com/drive/v3/files/"
            + URLEncoder.encode(id, StandardCharsets.UTF_8)
            + "?fields=id,trashed";
        HttpResult result = exchange("GET", url, token, null, null);
        if (result.code == 404) return false;
        if (result.code != 200) throw new Stop("invio");
        return !new JSONObject(result.body).optBoolean("trashed", false);
    }

    private static void ricorda(SharedPreferences prefs, String cartella, String id) {
        prefs.edit().putString(PREFS_ID, id).putString(PREFS_NOME, cartella).commit();
    }

    private static void invia(String token, String folderId, String nome, File file) throws Exception {
        JSONObject meta = new JSONObject();
        meta.put("name", nome);
        meta.put("parents", new JSONArray().put(folderId));
        byte[] json = meta.toString().getBytes(StandardCharsets.UTF_8);
        HttpURLConnection start = connection("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", token);
        start.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        start.setRequestProperty("X-Upload-Content-Type", "application/zip");
        start.setRequestProperty("X-Upload-Content-Length", Long.toString(file.length()));
        start.setFixedLengthStreamingMode(json.length);
        try (OutputStream out = start.getOutputStream()) { out.write(json); }
        int code = start.getResponseCode();
        String location = start.getHeaderField("Location");
        start.disconnect();
        if ((code != 200 && code != 201) || location == null || location.length() == 0) throw new Stop("invio");
        long offset = 0;
        byte[] buffer = new byte[CHUNK];
        try (FileInputStream in = new FileInputStream(file)) {
            while (offset < file.length()) {
                int n = (int) Math.min(buffer.length, file.length() - offset);
                int letto = 0;
                while (letto < n) {
                    int r = in.read(buffer, letto, n - letto);
                    if (r < 0) throw new Stop("invio");
                    letto += r;
                }
                HttpURLConnection put = connection("PUT", location, null);
                put.setRequestProperty("Content-Type", "application/zip");
                put.setRequestProperty("Content-Range", "bytes " + offset + "-" + (offset + n - 1) + "/" + file.length());
                put.setFixedLengthStreamingMode(n);
                try (OutputStream out = put.getOutputStream()) { out.write(buffer, 0, n); }
                int stato = put.getResponseCode();
                String body = stato == 200 || stato == 201 ? leggi(put.getInputStream()) : "";
                put.disconnect();
                if (stato == 200 || stato == 201) {
                    if (!body.contains("\"id\"")) throw new Stop("invio");
                    return;
                }
                if (stato != 308) throw new Stop("invio");
                offset += n;
            }
        }
        throw new Stop("invio");
    }

    private static final class HttpResult {
        final int code;
        final String body;
        HttpResult(int code, String body) { this.code = code; this.body = body; }
    }

    private static HttpResult exchange(String method, String url, String token, String contentType, byte[] body) throws Exception {
        HttpURLConnection conn = connection(method, url, token);
        if (body != null) {
            conn.setRequestProperty("Content-Type", contentType);
            conn.setFixedLengthStreamingMode(body.length);
            try (OutputStream out = conn.getOutputStream()) { out.write(body); }
        }
        int code = conn.getResponseCode();
        InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
        String text = leggi(stream);
        conn.disconnect();
        return new HttpResult(code, text);
    }

    private static HttpURLConnection connection(String method, String url, String token) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(120000);
        conn.setInstanceFollowRedirects(false);
        if (token != null) conn.setRequestProperty("Authorization", "Bearer " + token);
        if (!"GET".equals(method)) conn.setDoOutput(true);
        return conn;
    }

    private static String leggi(InputStream in) throws Exception {
        if (in == null) return "";
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        int total = 0;
        while ((n = in.read(buf)) >= 0 && total < 1000000) {
            bos.write(buf, 0, n);
            total += n;
        }
        in.close();
        return bos.toString(StandardCharsets.UTF_8);
    }
}
```

`Context` resta nel signature anche se il metodo non lo usa: le chiamate successive possono aprire un `content://` senza cambiare la firma. Il parametro si può omettere se il compilatore avvisa che è inutilizzato: toglilo e aggiorna la chiamata.

- [ ] **Step 6: Metodi nel plugin**

In `DriveAuthPlugin` aggiungi gli import `android.net.ConnectivityManager`, `android.net.Network`, `android.net.NetworkCapabilities`.

```java
@PluginMethod
public void wifi(PluginCall call) {
    ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
    Network network = manager == null ? null : manager.getActiveNetwork();
    NetworkCapabilities caps = network == null || manager == null ? null : manager.getNetworkCapabilities(network);
    JSObject out = new JSObject();
    out.put("wifi", caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
    call.resolve(out);
}

@PluginMethod
public void carica(PluginCall call) {
    String cartella = call.getString("cartella");
    String nome = call.getString("nome");
    String percorso = call.getString("percorso");
    try {
        DriveUpload.carica(getContext(), client(), request(), prefs(), scollegato(), cartella, nome, percorso);
        call.resolve();
    } catch (DriveUpload.Stop stop) {
        call.reject(stop.code);
    } catch (Exception error) {
        call.reject("invio");
    }
}
```

- [ ] **Step 7: Compila**

Run in `android`: `.\gradlew :app:compileDebugJavaWithJavac`
Expected: BUILD SUCCESSFUL. Se `Context` è inutilizzato, toglilo e ricompila.

- [ ] **Step 8: Commit**

`feat: si può caricare un file su Drive`

---

### Task 2: Lo ZIP di Backup completo parte verso Drive

**Files:**
- Create: `src/lib/driveInvio.ts`
- Create: `src/lib/driveInvio.test.ts`

**Interfaces:**
- Consumes: `DriveAuth.carica`, `raccogliBackup`, `registroXlsx`, `backupCompleto`, `nomeSicuro`, `Filesystem`, `blobBase64`.
- Produces:
  - `chiaveInvioDrive(uid: string): string`
  - `invioDriveDovuto(uid: string, now: Date): boolean`
  - `inviaBackupSuDrive(uid: string, now: Date): Promise<void>` scrive la chiave solo dopo `carica` riuscito.

- [ ] **Step 1: Test che fallisce**

`src/lib/driveInvio.test.ts`:

```ts
import { Directory, Filesystem } from '@capacitor/filesystem'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DriveAuth } from './driveAuth'
import { chiaveInvioDrive, inviaBackupSuDrive, invioDriveDovuto } from './driveInvio'

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: vi.fn(async () => ({ uri: 'file:///cache/backup.zip' })), deleteFile: vi.fn(async () => undefined) },
}))

vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup: vi.fn() }))
vi.mock('../lib/registroXlsx', () => ({ registroXlsx: vi.fn(async () => new Blob(['x'])) }))
vi.mock('../lib/backupCompleto', () => ({
  backupCompleto: vi.fn(async () => ({ blob: new Blob(['zip']), name: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip' })),
  cartellaFoto: vi.fn(() => ''),
}))

const raccolto = {
  json: '{}',
  manifest: { salone: { id: 's', nome: 'Pelosetti' } },
  dati: { fotoMancanti: [] },
}

describe('invio su Drive', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('è dovuto se non c’è un invio, e non lo è entro 24 ore', () => {
    const now = new Date('2026-10-23T12:00:00.000Z')
    expect(invioDriveDovuto('u1', now)).toBe(true)
    localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString())
    expect(invioDriveDovuto('u1', now)).toBe(false)
    localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
    expect(invioDriveDovuto('u1', now)).toBe(true)
  })

  it('carica lo ZIP nella cartella del salone e segna l’istante', async () => {
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(raccogliBackup).mockResolvedValue(raccolto as never)
    const carica = vi.spyOn(DriveAuth, 'carica').mockResolvedValue(undefined)
    const now = new Date('2026-10-23T12:00:00.000Z')
    await inviaBackupSuDrive('u1', now)
    expect(carica).toHaveBeenCalledWith({
      cartella: 'Groomly Backup – Pelosetti',
      nome: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip',
      percorso: 'file:///cache/backup.zip',
    })
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBe(now.toISOString())
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: 'Groomly Backup completo – Pelosetti – 2026-10-23.zip', directory: Directory.Cache })
  })

  it('un rifiuto non segna l’istante e cancella il file', async () => {
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    vi.mocked(raccogliBackup).mockResolvedValue({ ...raccolto, manifest: { salone: { id: 's', nome: '  ' } } } as never)
    vi.spyOn(DriveAuth, 'carica').mockRejectedValue(new Error('ricollega'))
    await expect(inviaBackupSuDrive('u1', new Date('2026-10-23T12:00:00.000Z'))).rejects.toThrow('ricollega')
    expect(localStorage.getItem(chiaveInvioDrive('u1'))).toBeNull()
    expect(Filesystem.deleteFile).toHaveBeenCalled()
  })
})
```

Il mock di `backupCompleto` deve usare il nome che la funzione si aspetta. La funzione calcola la cartella da `nomeSicuro(manifest.salone.nome.trim() || 'Groomly')` e passa a `backupCompleto` il risultato reale solo se non è mockato. Qui è mockato: il nome del file mockato deve restare quello dell’asserzione. Per il salone vuoto il test controlla solo che `carica` riceva `cartella: 'Groomly Backup – Groomly'`. Aggiungi questa asserzione nel terzo test.

- [ ] **Step 2: Fallisce**

Run: `npx vitest run src/lib/driveInvio.test.ts`
Expected: FAIL, modulo assente.

- [ ] **Step 3: Implementazione**

`src/lib/driveInvio.ts`:

```ts
import { Directory, Filesystem } from '@capacitor/filesystem'
import { nomeSicuro } from './nomeSicuro'
import { DriveAuth } from './driveAuth'
import { blobBase64 } from './shareFile'

export function chiaveInvioDrive(uid: string): string {
  return `groomly.users.${uid}.driveUltimoInvio`
}

export function invioDriveDovuto(uid: string, now: Date): boolean {
  const raw = localStorage.getItem(chiaveInvioDrive(uid))
  if (!raw) return true
  const then = Date.parse(raw)
  if (Number.isNaN(then)) return true
  return now.getTime() - then >= 24 * 60 * 60 * 1000
}

function nomeCartella(nome: string): string {
  return `Groomly Backup – ${nomeSicuro(nome.trim() || 'Groomly')}`
}

export async function inviaBackupSuDrive(uid: string, now: Date): Promise<void> {
  const { raccogliBackup } = await import('../data/firebase/backupCollect')
  const { registroXlsx } = await import('../lib/registroXlsx')
  const { backupCompleto, cartellaFoto } = await import('../lib/backupCompleto')
  const scritti: string[] = []
  const file: { percorso: string; bytes: Uint8Array }[] = []
  const raccolto = await raccogliBackup(now, {
    includiByte: true,
    onFile: (_meta, bytes, percorso) => {
      scritti.push(percorso)
      file.push({ percorso, bytes })
    },
  })
  const registro = await registroXlsx(raccolto.dati, { now, risolviLink: (percorso) => cartellaFoto(percorso, scritti) })
  const pronto = await backupCompleto(raccolto, registro, file, now)
  const written = await Filesystem.writeFile({
    path: pronto.name,
    data: await blobBase64(pronto.blob),
    directory: Directory.Cache,
  })
  try {
    await DriveAuth.carica({
      cartella: nomeCartella(raccolto.manifest.salone.nome),
      nome: pronto.name,
      percorso: written.uri,
    })
    localStorage.setItem(chiaveInvioDrive(uid), now.toISOString())
  } finally {
    await Filesystem.deleteFile({ path: pronto.name, directory: Directory.Cache }).catch(() => undefined)
  }
}
```

- [ ] **Step 4: Passa**

Run: `npx vitest run src/lib/driveInvio.test.ts src/lib/driveAuth.test.ts`
Expected: PASS. Se `vi.restoreAllMocks()` cancella `mockResolvedValue` del filesystem, sposta il reset dentro `mockReset` dei soli spy di `DriveAuth` e non chiamare `restoreAllMocks` sul mock del modulo.

- [ ] **Step 5: Commit**

`feat: il backup completo si prepara per Drive`

---

### Task 3: Pulsante e invio all’apertura

**Files:**
- Create: `src/app/DriveInvioAuto.tsx`
- Create: `src/app/DriveInvioAuto.test.tsx`
- Modify: `src/app/providers.tsx` (solo inserire `<DriveInvioAuto />` dentro `ToastProvider`, dopo `SaveFailedToast`)
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx` (il mock di `driveAuth` e i test nuovi)

**Interfaces:**
- Consumes: `inviaBackupSuDrive`, `invioDriveDovuto`, `DriveAuth.wifi`, `DriveAuth.leggi`, `getSettings`, `useSession`, `useToast`.
- Produces: pulsante **Invia su Drive** e l’avvio automatico.

- [ ] **Step 1: Test di `messaggioInvio` e di `provaInvioAutomatico`**

Nello stesso `src/lib/driveInvio.test.ts`, con i mock già presenti di raccoglitore, filesystem e `backupCompleto`. `getSettings` si mocka con `vi.mock('../data/local/settings', () => ({ getSettings: vi.fn() }))`.

```ts
it('traduce gli errori di invio', () => {
  expect(messaggioInvio(new Error('telefono'))).toBe('Il collegamento a Google Drive funziona sul telefono')
  expect(messaggioInvio(new Error('ricollega'))).toBe('Ricollega Google Drive')
  expect(messaggioInvio(new AppError('Serve la connessione per creare il backup', 'backup_offline'))).toBe('Serve la connessione per creare il backup')
  expect(messaggioInvio(new Error('invio'))).toBe('Invio su Drive non riuscito')
})

it('l automatico parte solo se è dovuto, c è il Wi-Fi e Drive è collegato', async () => {
  const { getSettings } = await import('../data/local/settings')
  const { raccogliBackup } = await import('../data/firebase/backupCollect')
  vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: true } } as never)
  vi.mocked(raccogliBackup).mockResolvedValue(raccolto as never)
  const carica = vi.spyOn(DriveAuth, 'carica').mockResolvedValue(undefined)
  vi.spyOn(DriveAuth, 'wifi').mockResolvedValue({ wifi: false })
  vi.spyOn(DriveAuth, 'leggi').mockResolvedValue({ collegato: true, email: 'a@b.c' })
  const now = new Date('2026-10-23T12:00:00.000Z')
  await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
  expect(carica).not.toHaveBeenCalled()
  vi.spyOn(DriveAuth, 'wifi').mockResolvedValue({ wifi: true })
  vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: false } } as never)
  await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
  vi.mocked(getSettings).mockReturnValue({ backup: { autoDaily: true } } as never)
  localStorage.setItem(chiaveInvioDrive('u1'), new Date(now.getTime() - 60 * 60 * 1000).toISOString())
  await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
  localStorage.removeItem(chiaveInvioDrive('u1'))
  vi.spyOn(DriveAuth, 'leggi').mockResolvedValue({ collegato: false, email: null })
  await expect(provaInvioAutomatico('u1', now)).resolves.toBe('saltato')
  vi.spyOn(DriveAuth, 'leggi').mockResolvedValue({ collegato: true, email: 'a@b.c' })
  await expect(provaInvioAutomatico('u1', now)).resolves.toBe('inviato')
  expect(carica).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Funzione e componente**

`provaInvioAutomatico(uid, now)` ritorna `'saltato'` nei casi del test e `'inviato'` dopo `inviaBackupSuDrive`. Gli errori li rilancia. `messaggioInvio` è la tabella della specifica.

```tsx
export function DriveInvioAuto() {
  const { gate, entry } = useSession()
  const toast = useToast()
  const uid = gate.kind === 'in' && entry.kind === 'home' ? gate.account.uid : null
  const started = useRef(false)
  useEffect(() => {
    if (!uid || started.current) return
    started.current = true
    void (async () => {
      try {
        const esito = await provaInvioAutomatico(uid, new Date())
        if (esito === 'inviato') toast.show('Backup inviato su Google Drive', 'plain')
      } catch (error) {
        toast.show(messaggioInvio(error), 'plain')
      }
    })()
  }, [uid, toast])
  return null
}
```

`src/app/DriveInvioAuto.test.tsx` rende il componente dentro `Providers` dopo `createAccount`, con `provaInvioAutomatico` mockato che risolve `'saltato'`, e si aspetta che non ci sia un toast. Poi un secondo test con esito `'inviato'` trova il toast «Backup inviato su Google Drive».

```ts
const { provaInvioAutomatico } = vi.hoisted(() => ({ provaInvioAutomatico: vi.fn(async () => 'saltato' as const) }))
vi.mock('../lib/driveInvio', () => ({ provaInvioAutomatico, messaggioInvio: (error: Error) => error.message }))
```

Il render usa `<App memory isDev={false} />` dopo `createAccount`, come `LoginPage.test.tsx`. Se `entry` non è `home` nei test, il componente non chiama la funzione: in quel caso il test crea l’account e aspetta la home «Oggi» prima di asserire la chiamata.

`messaggioInvio` sta in `driveInvio.ts`:

- `error.message === 'telefono'` → `Il collegamento a Google Drive funziona sul telefono`
- `error.message === 'ricollega'` → `Ricollega Google Drive`
- `error instanceof AppError && error.code === 'backup_offline'` → `error.message`
- altrimenti → `Invio su Drive non riuscito`

- [ ] **Step 3: Pulsante**

In `SettingsPage`, stato `invioBusy`. Handler `inviaDrive`: se `driveBusyRef` o `invioBusy` return; se offline toast «Connessione assente» e return; poi `inviaBackupSuDrive(uid, new Date())` e il toast di `messaggioInvio` nel catch, «Backup inviato su Google Drive» nel then. `finally` spegne `invioBusy`.

Sotto la `SRow` di Collega/Scollega, solo se `driveEmail`:

```tsx
<SRow>
  <Button variant="secondary" onClick={() => { void inviaDrive() }} disabled={driveBusy || invioBusy} style={{ flex: 1 }}>
    Invia su Drive
  </Button>
</SRow>
```

Nel mock di `SettingsPage.test.tsx` aggiungi `driveCarica` e `driveWifi` sull’oggetto hoisted, e nel `beforeEach` dopo `mockReset` `driveWifi.mockResolvedValue({ wifi: false })`. Il tipo di `driveLeggi` resta `Promise<{ collegato: boolean; email: string | null }>`.

Test: account collegato, il pulsante c’è; `inviaBackupSuDrive` risolto, toast «Backup inviato su Google Drive». Scollegato, il pulsante non c’è. Offline, la funzione non è chiamata. Rifiuto `telefono`, toast del telefono. Mocka `../lib/driveInvio` con `vi.hoisted` così l’automatico, con `autoDaily` falso, non costruisce uno ZIP durante i test della pagina.

- [ ] **Step 4: Test**

Run: `npx vitest run src/app/DriveInvioAuto.test.tsx src/lib/driveInvio.test.ts src/pages/SettingsPage.test.tsx src/lib/driveAuth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`feat: da Impostazioni si invia il backup su Drive`

Non alzare la versione in questo commit. La pubblicazione è un passo successivo, sul branch `feat/drive-invio`, con push verso `origin/feat/listino-razze` e senza spostare `origin/main`.
