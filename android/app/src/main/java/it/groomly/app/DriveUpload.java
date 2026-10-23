package it.groomly.app;

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

        Stop(String code) {
            this.code = code;
        }
    }

    private static final int CHUNK = 8 * 1024 * 1024;
    private static final String PREFS_ID = "driveCartellaId";
    private static final String PREFS_NOME = "driveCartellaNome";

    private DriveUpload() {}

    static void carica(
        AuthorizationClient client,
        AuthorizationRequest request,
        SharedPreferences prefs,
        boolean scollegato,
        String cartella,
        String nome,
        String percorso
    ) throws Exception {
        if (scollegato) throw new Stop("ricollega");
        if (cartella == null || cartella.isEmpty() || nome == null || nome.isEmpty() || percorso == null || percorso.isEmpty()) {
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
        if (granted.hasResolution() || granted.getPendingIntent() != null || token == null || token.isEmpty()) {
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
        if (cartella.equals(savedNome) && savedId != null && !savedId.isEmpty() && esiste(token, savedId)) {
            return savedId;
        }
        String q = "mimeType='application/vnd.google-apps.folder' and name='" + escape(cartella) + "' and trashed=false";
        String url = "https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)&q="
            + URLEncoder.encode(q, StandardCharsets.UTF_8);
        HttpResult found = exchange("GET", url, token, null, null);
        if (found.code != 200) throw new Stop("invio");
        JSONArray files = new JSONObject(found.body).optJSONArray("files");
        if (files != null && files.length() > 0) {
            String id = files.getJSONObject(0).getString("id");
            ricorda(prefs, cartella, id);
            return id;
        }
        JSONObject meta = new JSONObject();
        meta.put("name", cartella);
        meta.put("mimeType", "application/vnd.google-apps.folder");
        HttpResult created = exchange(
            "POST",
            "https://www.googleapis.com/drive/v3/files",
            token,
            "application/json; charset=UTF-8",
            meta.toString().getBytes(StandardCharsets.UTF_8)
        );
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
        try (OutputStream out = start.getOutputStream()) {
            out.write(json);
        }
        int code = start.getResponseCode();
        String location = start.getHeaderField("Location");
        start.disconnect();
        if ((code != 200 && code != 201) || location == null || location.isEmpty()) throw new Stop("invio");
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
                try (OutputStream out = put.getOutputStream()) {
                    out.write(buffer, 0, n);
                }
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

        HttpResult(int code, String body) {
            this.code = code;
            this.body = body;
        }
    }

    private static HttpResult exchange(String method, String url, String token, String contentType, byte[] body) throws Exception {
        HttpURLConnection conn = connection(method, url, token);
        if (body != null) {
            conn.setRequestProperty("Content-Type", contentType);
            conn.setFixedLengthStreamingMode(body.length);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body);
            }
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
