package it.groomly.app;

import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Scope;
import java.io.File;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;

@CapacitorPlugin(name = "DriveAuth")
public class DriveAuthPlugin extends Plugin {
    private static final String SCOPE_EMAIL = "https://www.googleapis.com/auth/userinfo.email";
    private static final String SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
    private static final String PREFS = "groomly";
    static final String KEY_SCOLLEGATO = "driveScollegato";
    static final String KEY_CONSENSO = "driveConsensoUid";

    private PluginCall pending;
    private String pendingUid = "";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private boolean scollegato() {
        return prefs().getBoolean(KEY_SCOLLEGATO, false);
    }

    private void setScollegato(boolean value) {
        prefs().edit().putBoolean(KEY_SCOLLEGATO, value).commit();
    }

    private String consensoUid() {
        String value = prefs().getString(KEY_CONSENSO, "");
        return value == null ? "" : value;
    }

    private void setConsenso(String uid) {
        prefs().edit().putString(KEY_CONSENSO, uid == null ? "" : uid).commit();
    }

    private String uidOf(PluginCall call) {
        String uid = call.getString("uid", "");
        return uid == null ? "" : uid;
    }

    private void resolveCollegato(PluginCall call, AuthorizationResult result) {
        setScollegato(false);
        if (pendingUid.length() > 0) setConsenso(pendingUid);
        call.resolve(accountOf(result, true));
    }

    private AuthorizationClient client() {
        return Identity.getAuthorizationClient(getActivity());
    }

    private AuthorizationRequest request() {
        return richiesta();
    }

    static AuthorizationRequest richiesta() {
        List<Scope> scopes = Arrays.asList(new Scope(SCOPE_EMAIL), new Scope(SCOPE_DRIVE_FILE));
        return AuthorizationRequest.builder().setRequestedScopes(scopes).build();
    }

    static boolean suWifi(Context context) {
        ConnectivityManager manager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager == null ? null : manager.getActiveNetwork();
        NetworkCapabilities caps = network == null || manager == null ? null : manager.getNetworkCapabilities(network);
        return caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
    }

    static boolean inCaricaOra(Context context) {
        android.os.BatteryManager battery = (android.os.BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
        if (battery == null) return false;
        int stato = battery.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_STATUS);
        return stato == android.os.BatteryManager.BATTERY_STATUS_CHARGING || stato == android.os.BatteryManager.BATTERY_STATUS_FULL;
    }

    private boolean hasToken(AuthorizationResult result) {
        String token = result.getAccessToken();
        return token != null && token.length() > 0;
    }

    private String emailOf(AuthorizationResult result) {
        GoogleSignInAccount account = result.toGoogleSignInAccount();
        if (account == null) return null;
        return account.getEmail();
    }

    private JSObject spento() {
        JSObject out = new JSObject();
        out.put("collegato", false);
        out.put("proposto", false);
        out.put("email", JSONObject.NULL);
        return out;
    }

    private JSObject accountOf(AuthorizationResult result, boolean collegato) {
        JSObject out = new JSObject();
        out.put("collegato", collegato && hasToken(result));
        out.put("proposto", false);
        String email = emailOf(result);
        out.put("email", email == null ? JSONObject.NULL : email);
        return out;
    }

    private JSObject proposta(AuthorizationResult result) {
        JSObject out = new JSObject();
        out.put("collegato", false);
        out.put("proposto", true);
        String email = emailOf(result);
        out.put("email", email == null ? JSONObject.NULL : email);
        return out;
    }

    private void finishQuiet(PluginCall call, AuthorizationResult result) {
        String uid = uidOf(call);
        if (result.hasResolution() || result.getPendingIntent() != null || !hasToken(result) || uid.length() == 0 || !consensoUid().equals(uid)) {
            call.resolve(spento());
            return;
        }
        call.resolve(accountOf(result, true));
    }

    @PluginMethod
    public void leggi(PluginCall call) {
        if (scollegato()) {
            call.resolve(spento());
            return;
        }
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
            pendingUid = "";
            // Un errore di Google (es. firma dell'APK non registrata) torna come annullato: va detto, non taciuto.
            call.reject(annullatoDaUtente(result) ? "annullato" : "collegamento");
            return;
        }
        try {
            AuthorizationResult granted = client().getAuthorizationResultFromIntent(result.getData());
            if (!hasToken(granted)) call.reject("collegamento");
            else resolveCollegato(call, granted);
        } catch (ApiException error) {
            call.reject("collegamento");
        }
    }

    private boolean annullatoDaUtente(ActivityResult result) {
        if (result.getData() == null) return true;
        try {
            client().getAuthorizationResultFromIntent(result.getData());
            return true;
        } catch (ApiException error) {
            return error.getStatusCode() == CommonStatusCodes.CANCELED;
        }
    }

    @PluginMethod
    public void collega(PluginCall call) {
        String uid = uidOf(call);
        client().authorize(request())
            .addOnSuccessListener(result -> {
                if (!result.hasResolution() || result.getPendingIntent() == null) {
                    if (!hasToken(result)) call.reject("collegamento");
                    else if (uid.length() > 0 && consensoUid().equals(uid)) call.resolve(accountOf(result, true));
                    else call.resolve(proposta(result));
                    return;
                }
                pending = call;
                pendingUid = uid;
                launcher.launch(new IntentSenderRequest.Builder(result.getPendingIntent()).build());
            })
            .addOnFailureListener(error -> call.reject("collegamento"));
    }

    @PluginMethod
    public void conferma(PluginCall call) {
        String uid = uidOf(call);
        if (uid.length() == 0) {
            call.reject("collegamento");
            return;
        }
        client().authorize(request())
            .addOnSuccessListener(result -> {
                if (!hasToken(result)) {
                    call.reject("collegamento");
                    return;
                }
                setConsenso(uid);
                setScollegato(false);
                call.resolve(accountOf(result, true));
            })
            .addOnFailureListener(error -> call.reject("collegamento"));
    }

    @PluginMethod
    public void scollega(PluginCall call) {
        client().authorize(request())
            .addOnSuccessListener(result -> {
                String token = result.getAccessToken();
                if (token == null || token.length() == 0) {
                    setConsenso("");
                    setScollegato(true);
                    call.resolve();
                    return;
                }
                ClearTokenRequest clear = ClearTokenRequest.builder().setToken(token).build();
                client().clearToken(clear)
                    .addOnSuccessListener(unused -> {
                        setConsenso("");
                        setScollegato(true);
                        call.resolve();
                    })
                    .addOnFailureListener(error -> call.reject("scollega"));
            })
            .addOnFailureListener(error -> call.reject("scollega"));
    }

    @PluginMethod
    public void wifi(PluginCall call) {
        JSObject out = new JSObject();
        out.put("wifi", suWifi(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void carica(PluginCall call) {
        try {
            DriveUpload.carica(client(), request(), prefs(), scollegato(), call.getString("cartella"), call.getString("nome"), call.getString("percorso"));
            call.resolve();
        } catch (DriveUpload.Stop stop) {
            call.reject(stop.code);
        } catch (Exception error) {
            call.reject("invio");
        }
    }

    @PluginMethod
    public void elenco(PluginCall call) {
        try {
            List<DriveConservazione.Voce> copie = DriveUpload.elencoCopie(
                client(), request(), prefs(), scollegato(), call.getString("cartella")
            );
            JSArray lista = new JSArray();
            for (DriveConservazione.Voce voce : copie) {
                JSObject item = new JSObject();
                item.put("id", voce.id);
                item.put("nome", voce.name);
                item.put("giorno", DriveConservazione.giorno(voce.name));
                lista.put(item);
            }
            JSObject out = new JSObject();
            out.put("copie", lista);
            call.resolve(out);
        } catch (DriveUpload.Stop stop) {
            call.reject(stop.code);
        } catch (Exception error) {
            call.reject("invio");
        }
    }

    @PluginMethod
    public void registro(PluginCall call) {
        try {
            DriveUpload.registro(client(), request(), prefs(), scollegato(), call.getString("cartella"), call.getString("nome"), call.getString("percorso"));
            call.resolve();
        } catch (DriveUpload.Stop stop) {
            call.reject(stop.code);
        } catch (Exception error) {
            call.reject("invio");
        }
    }

    @PluginMethod
    public void programma(PluginCall call) {
        boolean attivo = Boolean.TRUE.equals(call.getBoolean("attivo", false));
        boolean wifi = !Boolean.FALSE.equals(call.getBoolean("wifi", true));
        boolean carica = Boolean.TRUE.equals(call.getBoolean("carica", false));
        Double dovuto = call.getDouble("dovuto");
        BackupJob.applica(getContext(), attivo, wifi, carica, dovuto == null ? 0L : dovuto.longValue());
        call.resolve();
    }

    @PluginMethod
    public void inCarica(PluginCall call) {
        JSObject out = new JSObject();
        out.put("carica", inCaricaOra(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void foto(PluginCall call) {
        try {
            DriveFoto.sincronizza(client(), request(), prefs(), scollegato(), call.getString("cartella"), call.getArray("voci"));
            call.resolve();
        } catch (DriveUpload.Stop stop) {
            call.reject(stop.code);
        } catch (Exception error) {
            call.reject("invio");
        }
    }

    @PluginMethod
    public void scarica(PluginCall call) {
        try {
            File dest = new File(getContext().getCacheDir(), DriveUpload.FILE_RIPRISTINO);
            DriveUpload.scaricaCopia(
                client(), request(), prefs(), scollegato(), call.getString("cartella"), call.getString("id"), dest
            );
            call.resolve();
        } catch (DriveUpload.Stop stop) {
            call.reject(stop.code);
        } catch (Exception error) {
            call.reject("invio");
        }
    }

}
