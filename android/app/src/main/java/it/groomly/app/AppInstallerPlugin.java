package it.groomly.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
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
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 30000;
    private static final long PROGRESS_INTERVAL_MS = 100;

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
        // Plugin methods share one handler thread: downloading there would queue cancel() behind it.
        Thread worker = new Thread(() -> download(call, url), "groomly-apk-download");
        worker.start();
    }

    private void download(PluginCall call, String url) {
        File file = new File(getContext().getCacheDir(), "groomly-update.apk");
        HttpURLConnection conn = null;
        try {
            if (file.exists() && !file.delete()) {
                call.reject("file");
                return;
            }
            conn = (HttpURLConnection) new URL(url).openConnection();
            connection = conn;
            if (cancelled) {
                call.reject("cancelled");
                return;
            }
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "Groomly");
            conn.connect();
            int status = conn.getResponseCode();
            if (status < 200 || status >= 300) {
                call.reject(cancelled ? "cancelled" : "download");
                return;
            }
            long total = conn.getContentLengthLong();
            if (total < 0) total = 0;
            try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(file)) {
                byte[] buffer = new byte[8192];
                long received = 0;
                int lastPercent = -1;
                long lastNotify = 0;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (cancelled) break;
                    out.write(buffer, 0, read);
                    received += read;
                    if (total > 0) {
                        int percent = (int) Math.min(100, (received * 100) / total);
                        if (percent == lastPercent) continue;
                        lastPercent = percent;
                    } else {
                        long now = SystemClock.elapsedRealtime();
                        if (now - lastNotify < PROGRESS_INTERVAL_MS) continue;
                        lastNotify = now;
                    }
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
            call.reject(cancelled ? "cancelled" : "download");
        } finally {
            if (conn != null) conn.disconnect();
            connection = null;
        }
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
        if (cancelled) {
            call.reject("cancelled");
            return;
        }
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
