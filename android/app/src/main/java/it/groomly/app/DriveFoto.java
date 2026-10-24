package it.groomly.app;

import android.content.SharedPreferences;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

final class DriveFoto {
    static final String RADICE = "Foto cani";
    static final String ELIMINATE = "_Eliminate";

    static final class Gia {
        final String id;
        final String fileId;
        final String name;
        final String parent;

        Gia(String id, String fileId, String name, String parent) {
            this.id = id;
            this.fileId = fileId;
            this.name = name;
            this.parent = parent;
        }
    }

    private static final class Richiesta {
        final String codice;
        final String cartella;
        final String fileId;
        final String percorso;
        final List<String> pezzi;

        Richiesta(String codice, String cartella, String fileId, String percorso, List<String> pezzi) {
            this.codice = codice;
            this.cartella = cartella;
            this.fileId = fileId;
            this.percorso = percorso;
            this.pezzi = pezzi;
        }
    }

    private DriveFoto() {}

    static String codiceDi(String cartella) {
        if (cartella == null) return null;
        int taglio = cartella.indexOf(" - ");
        if (taglio <= 0) return null;
        String codice = cartella.substring(0, taglio);
        if (!codice.matches("C\\d+")) return null;
        return codice;
    }

    static List<String> pezzi(String relativo) {
        List<String> out = new ArrayList<>();
        if (relativo == null || relativo.isEmpty() || relativo.indexOf('\\') >= 0 || relativo.indexOf('\u0000') >= 0) return out;
        String[] parti = relativo.split("/", -1);
        if (parti.length == 0) return out;
        for (String parte : parti) {
            if (parte.isEmpty() || ".".equals(parte) || "..".equals(parte)) return new ArrayList<>();
            out.add(parte);
        }
        return out;
    }

    static boolean stessoPosto(Gia gia, String parent, String nome) {
        return gia != null && parent != null && parent.equals(gia.parent) && nome != null && nome.equals(gia.name);
    }

    static List<Gia> daMettereVia(List<Gia> presenti, Set<String> tenuti, String eliminateId) {
        List<Gia> via = new ArrayList<>();
        if (presenti == null) return via;
        for (Gia gia : presenti) {
            if (gia == null || gia.id == null || gia.id.isEmpty() || gia.fileId == null || gia.fileId.isEmpty()) continue;
            if (tenuti != null && tenuti.contains(gia.fileId)) continue;
            if (eliminateId != null && eliminateId.equals(gia.parent)) continue;
            via.add(gia);
        }
        return via;
    }

    static String nomeEliminate(String fileId, String name) {
        String base = (fileId == null || fileId.isEmpty() ? "foto" : fileId) + " - " + (name == null || name.isEmpty() ? "foto" : name);
        if (base.length() > 200) return base.substring(0, 200);
        return base;
    }

    static void sincronizza(
        AuthorizationClient client,
        AuthorizationRequest request,
        SharedPreferences prefs,
        boolean scollegato,
        String cartella,
        JSONArray voci
    ) throws Exception {
        if (cartella == null || cartella.isEmpty()) throw new DriveUpload.Stop("invio");
        List<Richiesta> richieste = leggiVoci(voci);
        String token = DriveUpload.tokenDi(client, request, scollegato);
        String folderId = DriveUpload.cercaCartella(prefs, token, cartella);
        String fotoId = null;
        List<Gia> presenti = new ArrayList<>();
        if (folderId != null) {
            JSONObject foto = primo(token, cartellaQuery(folderId, RADICE), "id");
            if (foto != null) {
                fotoId = foto.getString("id");
                presenti = elencaSotto(token, fotoId);
            }
        }
        if (richieste.isEmpty() && presenti.isEmpty()) return;
        if (folderId == null) folderId = DriveUpload.cartellaId(prefs, token, cartella);
        if (fotoId == null) fotoId = cartellaNome(token, folderId, RADICE, "radice");
        String eliminateId = idCartella(token, fotoId, ELIMINATE);
        Map<String, Gia> perId = new HashMap<>();
        for (Gia gia : presenti) {
            if (gia.fileId != null && !gia.fileId.isEmpty() && !perId.containsKey(gia.fileId)) perId.put(gia.fileId, gia);
        }
        Map<String, String> cani = new HashMap<>();
        Map<String, String> sotto = new HashMap<>();
        Set<String> tenuti = new HashSet<>();
        for (Richiesta richiesta : richieste) {
            tenuti.add(richiesta.fileId);
            File locale = DriveUpload.fileOf(richiesta.percorso);
            if (locale == null || !locale.isFile() || locale.length() <= 0) throw new DriveUpload.Stop("invio");
            String dogId = cani.get(richiesta.codice);
            if (dogId == null) {
                dogId = cartellaCane(token, fotoId, richiesta.codice, richiesta.cartella);
                cani.put(richiesta.codice, dogId);
            }
            String parent = dogId;
            for (int i = 0; i < richiesta.pezzi.size() - 1; i++) {
                parent = sottocartella(token, parent, richiesta.pezzi.get(i), sotto);
            }
            String nome = richiesta.pezzi.get(richiesta.pezzi.size() - 1);
            Gia gia = perId.get(richiesta.fileId);
            if (gia != null) {
                if (!stessoPosto(gia, parent, nome)) sistema(token, gia.id, parent, gia.parent, nome);
            } else {
                JSONObject props = new JSONObject();
                props.put("groomlyFileId", richiesta.fileId);
                props.put("groomlyRuolo", "foto");
                String id = DriveUpload.inviaFile(token, parent, nome, locale, "application/octet-stream", props);
                perId.put(richiesta.fileId, new Gia(id, richiesta.fileId, nome, parent));
            }
        }
        for (Gia gia : daMettereVia(presenti, tenuti, eliminateId)) {
            if (eliminateId == null) eliminateId = cartellaNome(token, fotoId, ELIMINATE, "eliminate");
            sistema(token, gia.id, eliminateId, gia.parent, nomeEliminate(gia.fileId, gia.name));
        }
    }

    private static List<Richiesta> leggiVoci(JSONArray voci) throws Exception {
        List<Richiesta> out = new ArrayList<>();
        if (voci == null) throw new DriveUpload.Stop("invio");
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < voci.length(); i++) {
            JSONObject item = voci.optJSONObject(i);
            if (item == null) throw new DriveUpload.Stop("invio");
            String codice = item.optString("codice", "");
            String cartella = item.optString("cartella", "");
            String fileId = item.optString("fileId", "");
            String percorso = item.optString("percorso", "");
            List<String> pezzi = pezzi(item.optString("relativo", ""));
            if (codice.isEmpty() || !codice.equals(codiceDi(cartella)) || pezzi.isEmpty() || fileId.isEmpty() || percorso.isEmpty()) {
                throw new DriveUpload.Stop("invio");
            }
            if (!ids.add(fileId)) throw new DriveUpload.Stop("invio");
            out.add(new Richiesta(codice, cartella, fileId, percorso, pezzi));
        }
        return out;
    }

    private static String cartellaQuery(String parent, String nome) {
        return "mimeType='application/vnd.google-apps.folder' and name='" + DriveUpload.escape(nome)
            + "' and '" + DriveUpload.escape(parent) + "' in parents and trashed=false";
    }

    private static String idCartella(String token, String parent, String nome) throws Exception {
        JSONObject trovata = primo(token, cartellaQuery(parent, nome), "id");
        return trovata == null ? null : trovata.getString("id");
    }

    private static List<Gia> elencaSotto(String token, String radice) throws Exception {
        List<Gia> out = new ArrayList<>();
        List<String> coda = new ArrayList<>();
        coda.add(radice);
        int pagine = 0;
        while (!coda.isEmpty()) {
            String parent = coda.remove(0);
            String page = "";
            do {
                if (pagine >= 20) throw new DriveUpload.Stop("invio");
                pagine += 1;
                String q = "'" + DriveUpload.escape(parent) + "' in parents and trashed=false";
                String url = "https://www.googleapis.com/drive/v3/files?pageSize=100&fields="
                    + URLEncoder.encode("nextPageToken,files(id,name,mimeType,parents,appProperties)", StandardCharsets.UTF_8)
                    + "&q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
                if (!page.isEmpty()) url += "&pageToken=" + URLEncoder.encode(page, StandardCharsets.UTF_8);
                DriveUpload.HttpResult found = DriveUpload.exchange("GET", url, token, null, null);
                if (found.code != 200) throw new DriveUpload.Stop("invio");
                JSONObject json = new JSONObject(found.body);
                JSONArray files = json.optJSONArray("files");
                if (files != null) {
                    for (int n = 0; n < files.length(); n++) {
                        JSONObject file = files.getJSONObject(n);
                        if ("application/vnd.google-apps.folder".equals(file.optString("mimeType", ""))) {
                            String id = file.optString("id", "");
                            if (!id.isEmpty()) coda.add(id);
                            continue;
                        }
                        JSONObject props = file.optJSONObject("appProperties");
                        JSONArray parents = file.optJSONArray("parents");
                        String padre = parents != null && parents.length() > 0 ? parents.optString(0, "") : "";
                        out.add(new Gia(
                            file.optString("id", ""),
                            props == null ? "" : props.optString("groomlyFileId", ""),
                            file.optString("name", ""),
                            padre
                        ));
                    }
                }
                page = json.optString("nextPageToken", "");
            } while (!page.isEmpty());
        }
        return out;
    }

    private static JSONObject primo(String token, String q, String fields) throws Exception {
        String url = "https://www.googleapis.com/drive/v3/files?pageSize=1&fields="
            + URLEncoder.encode("files(" + fields + ")", StandardCharsets.UTF_8)
            + "&q=" + URLEncoder.encode(q, StandardCharsets.UTF_8);
        DriveUpload.HttpResult found = DriveUpload.exchange("GET", url, token, null, null);
        if (found.code != 200) throw new DriveUpload.Stop("invio");
        JSONArray files = new JSONObject(found.body).optJSONArray("files");
        if (files == null || files.length() == 0) return null;
        return files.getJSONObject(0);
    }

    private static String cartellaNome(String token, String parent, String nome, String ruolo) throws Exception {
        String q = "mimeType='application/vnd.google-apps.folder' and name='" + DriveUpload.escape(nome)
            + "' and '" + DriveUpload.escape(parent) + "' in parents and trashed=false";
        JSONObject trovata = primo(token, q, "id");
        if (trovata != null) return trovata.getString("id");
        return creaCartella(token, parent, nome, null, ruolo);
    }

    private static String cartellaCane(String token, String parent, String codice, String nome) throws Exception {
        String q = "mimeType='application/vnd.google-apps.folder' and appProperties has { key='groomlyCodice' and value='"
            + DriveUpload.escape(codice) + "' } and '" + DriveUpload.escape(parent) + "' in parents and trashed=false";
        JSONObject trovata = primo(token, q, "id,name");
        if (trovata == null) return creaCartella(token, parent, nome, codice, null);
        String id = trovata.getString("id");
        if (!nome.equals(trovata.optString("name", ""))) sistema(token, id, null, null, nome);
        return id;
    }

    private static String sottocartella(String token, String parent, String nome, Map<String, String> cache) throws Exception {
        String chiave = parent + "\0" + nome;
        String gia = cache.get(chiave);
        if (gia != null) return gia;
        String q = "mimeType='application/vnd.google-apps.folder' and name='" + DriveUpload.escape(nome)
            + "' and '" + DriveUpload.escape(parent) + "' in parents and trashed=false";
        JSONObject trovata = primo(token, q, "id");
        String id = trovata == null ? creaCartella(token, parent, nome, null, null) : trovata.getString("id");
        cache.put(chiave, id);
        return id;
    }

    private static String creaCartella(String token, String parent, String nome, String codice, String ruolo) throws Exception {
        JSONObject meta = new JSONObject();
        meta.put("name", nome);
        meta.put("mimeType", "application/vnd.google-apps.folder");
        meta.put("parents", new JSONArray().put(parent));
        JSONObject props = new JSONObject();
        if (codice != null) props.put("groomlyCodice", codice);
        if (ruolo != null) props.put("groomlyRuolo", ruolo);
        if (props.length() > 0) meta.put("appProperties", props);
        DriveUpload.HttpResult created = DriveUpload.exchange(
            "POST",
            "https://www.googleapis.com/drive/v3/files",
            token,
            "application/json; charset=UTF-8",
            meta.toString().getBytes(StandardCharsets.UTF_8)
        );
        if (created.code != 200 && created.code != 201) throw new DriveUpload.Stop("invio");
        return new JSONObject(created.body).getString("id");
    }

    private static void sistema(String token, String id, String parentNuovo, String parentVecchio, String nome) throws Exception {
        boolean sposta = parentNuovo != null && !parentNuovo.isEmpty() && !parentNuovo.equals(parentVecchio);
        String url = "https://www.googleapis.com/drive/v3/files/" + URLEncoder.encode(id, StandardCharsets.UTF_8);
        if (sposta && parentVecchio != null && !parentVecchio.isEmpty()) {
            url += "?addParents=" + URLEncoder.encode(parentNuovo, StandardCharsets.UTF_8)
                + "&removeParents=" + URLEncoder.encode(parentVecchio, StandardCharsets.UTF_8);
        } else if (sposta) {
            url += "?addParents=" + URLEncoder.encode(parentNuovo, StandardCharsets.UTF_8);
        }
        JSONObject body = new JSONObject();
        body.put("name", nome);
        DriveUpload.HttpResult result = DriveUpload.exchange(
            "PATCH",
            url,
            token,
            "application/json; charset=UTF-8",
            body.toString().getBytes(StandardCharsets.UTF_8)
        );
        if (result.code != 200) throw new DriveUpload.Stop("invio");
    }
}
