package it.groomly.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.Identity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;

/**
 * Apre Groomly in una WebView senza schermo, sulla stessa origine dell'app (https://localhost):
 * accesso Firebase e impostazioni sono quelli del telefono. Il JS fa il backup e chiama fine().
 */
final class BackupHeadless {
    static final String ORIGINE = "https://localhost/";

    private BackupHeadless() {}

    /** Ritorna il JSON di fine() ({esito, messaggio}), o null se il tempo è scaduto. */
    static String esegui(Context context, long attesaMs) throws InterruptedException {
        Context app = context.getApplicationContext();
        Handler main = new Handler(Looper.getMainLooper());
        CountDownLatch finito = new CountDownLatch(1);
        AtomicReference<String> esito = new AtomicReference<>(null);
        AtomicReference<WebView> vista = new AtomicReference<>(null);
        ExecutorService lavoro = Executors.newSingleThreadExecutor();
        main.post(() -> {
            try {
                vista.set(apri(app, main, lavoro, esito, finito));
            } catch (Exception error) {
                esito.set("{\"esito\":\"errore\",\"messaggio\":\"\"}");
                finito.countDown();
            }
        });
        boolean arrivato = finito.await(attesaMs, TimeUnit.MILLISECONDS);
        main.post(() -> {
            WebView webView = vista.getAndSet(null);
            if (webView != null) {
                webView.stopLoading();
                webView.removeJavascriptInterface("GroomlyBackup");
                webView.destroy();
            }
        });
        lavoro.shutdown();
        return arrivato ? esito.get() : null;
    }

    @SuppressLint({ "SetJavaScriptEnabled", "AddJavascriptInterface" })
    private static WebView apri(
        Context app,
        Handler main,
        ExecutorService lavoro,
        AtomicReference<String> esito,
        CountDownLatch finito
    ) {
        WebView webView = new WebView(app);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                android.net.Uri url = request.getUrl();
                if (!"https".equals(url.getScheme()) || !"localhost".equals(url.getHost())) return null;
                String path = url.getPath() == null ? "" : url.getPath();
                return pagina(app, path.startsWith("/") ? path.substring(1) : path);
            }
        });
        webView.addJavascriptInterface(new Ponte(app, main, webView, lavoro, esito, finito), "GroomlyBackup");
        webView.resumeTimers();
        webView.onResume();
        webView.loadUrl(ORIGINE);
        return webView;
    }

    /** Come Capacitor: i file dell'app stanno in assets/public, ogni pagina sconosciuta è index.html. */
    private static WebResourceResponse pagina(Context app, @NonNull String path) {
        String nome = path.isEmpty() || path.endsWith("/") ? path + "index.html" : path;
        try {
            return risposta(app, nome);
        } catch (IOException missing) {
            try {
                return risposta(app, "index.html");
            } catch (IOException error) {
                return null;
            }
        }
    }

    private static WebResourceResponse risposta(Context app, String nome) throws IOException {
        InputStream input = app.getAssets().open("public/" + nome);
        return new WebResourceResponse(mime(nome), null, input);
    }

    static String mime(String nome) {
        String lower = nome.toLowerCase(java.util.Locale.ROOT);
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".wasm")) return "application/wasm";
        int punto = lower.lastIndexOf('.');
        String trovato = punto < 0 ? null : MimeTypeMap.getSingleton().getMimeTypeFromExtension(lower.substring(punto + 1));
        return trovato == null ? "application/octet-stream" : trovato;
    }

    static final class Ponte {
        private final Context app;
        private final Handler main;
        private final WebView webView;
        private final ExecutorService lavoro;
        private final AtomicReference<String> esito;
        private final CountDownLatch finito;

        Ponte(Context app, Handler main, WebView webView, ExecutorService lavoro, AtomicReference<String> esito, CountDownLatch finito) {
            this.app = app;
            this.main = main;
            this.webView = webView;
            this.lavoro = lavoro;
            this.esito = esito;
            this.finito = finito;
        }

        @JavascriptInterface
        public void fine(String json) {
            esito.set(json);
            finito.countDown();
        }

        @JavascriptInterface
        public void chiama(String id, String metodo, String args) {
            lavoro.execute(() -> {
                try {
                    JSONObject input = new JSONObject(args == null || args.isEmpty() ? "{}" : args);
                    rispondi(id, true, esegui(metodo, input));
                } catch (DriveUpload.Stop stop) {
                    rispondi(id, false, JSONObject.quote(stop.code));
                } catch (Exception error) {
                    rispondi(id, false, JSONObject.quote("invio"));
                }
            });
        }

        private void rispondi(String id, boolean ok, String dati) {
            String script = "window.__groomlyRisposta && window.__groomlyRisposta("
                + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(dati == null ? "" : dati) + ")";
            main.post(() -> webView.evaluateJavascript(script, null));
        }

        private String esegui(String metodo, JSONObject input) throws Exception {
            SharedPreferences prefs = app.getSharedPreferences(BackupJob.PREFS, Context.MODE_PRIVATE);
            boolean scollegato = prefs.getBoolean(DriveAuthPlugin.KEY_SCOLLEGATO, false);
            switch (metodo) {
                case "scrivi": {
                    File file = cache(input.getString("path"));
                    byte[] bytes = Base64.decode(input.getString("dati"), Base64.DEFAULT);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(bytes);
                    }
                    JSONObject out = new JSONObject();
                    out.put("uri", android.net.Uri.fromFile(file).toString());
                    return out.toString();
                }
                case "cancella": {
                    File file = cache(input.getString("path"));
                    if (file.exists() && !file.delete()) throw new IOException("cancella");
                    return "";
                }
                case "carica":
                    DriveUpload.carica(client(), request(), prefs, scollegato, input.getString("cartella"), input.getString("nome"), input.getString("percorso"));
                    return "";
                case "registro":
                    DriveUpload.registro(client(), request(), prefs, scollegato, input.getString("cartella"), input.getString("nome"), input.getString("percorso"));
                    return "";
                case "foto":
                    DriveFoto.sincronizza(client(), request(), prefs, scollegato, input.getString("cartella"), input.getJSONArray("voci"));
                    return "";
                case "leggi": {
                    String uid = input.optString("uid", "");
                    String consenso = prefs.getString(DriveAuthPlugin.KEY_CONSENSO, "");
                    boolean collegato = false;
                    if (!scollegato && uid.length() > 0 && uid.equals(consenso)) {
                        try {
                            DriveUpload.tokenDi(client(), request(), false);
                            collegato = true;
                        } catch (Exception senza) {
                            collegato = false;
                        }
                    }
                    JSONObject out = new JSONObject();
                    out.put("collegato", collegato);
                    out.put("proposto", false);
                    out.put("email", JSONObject.NULL);
                    return out.toString();
                }
                case "wifi": {
                    JSONObject out = new JSONObject();
                    out.put("wifi", DriveAuthPlugin.suWifi(app));
                    return out.toString();
                }
                case "inCarica": {
                    JSONObject out = new JSONObject();
                    out.put("carica", DriveAuthPlugin.inCaricaOra(app));
                    return out.toString();
                }
                case "programma":
                    BackupJob.salva(
                        app,
                        input.optBoolean("attivo", false),
                        input.optBoolean("wifi", true),
                        input.optBoolean("carica", false),
                        (long) input.optDouble("dovuto", 0)
                    );
                    return "";
                default:
                    throw new IOException("metodo");
            }
        }

        private File cache(String path) throws IOException {
            File dir = app.getCacheDir();
            File file = new File(dir, path);
            if (!file.getCanonicalPath().startsWith(dir.getCanonicalPath() + File.separator)) throw new IOException("percorso");
            return file;
        }

        private AuthorizationClient client() {
            return Identity.getAuthorizationClient(app);
        }

        private AuthorizationRequest request() {
            return DriveAuthPlugin.richiesta();
        }
    }
}
