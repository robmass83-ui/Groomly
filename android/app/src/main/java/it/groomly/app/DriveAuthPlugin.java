package it.groomly.app;

import android.app.Activity;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
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

    private boolean hasToken(AuthorizationResult result) {
        String token = result.getAccessToken();
        return token != null && token.length() > 0;
    }

    private JSObject accountOf(AuthorizationResult result) {
        JSObject out = new JSObject();
        boolean collegato = hasToken(result);
        out.put("collegato", collegato);
        String email = null;
        GoogleSignInAccount account = result.toGoogleSignInAccount();
        if (account != null) email = account.getEmail();
        out.put("email", email == null ? JSONObject.NULL : email);
        return out;
    }

    private void finishQuiet(PluginCall call, AuthorizationResult result) {
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
            AuthorizationResult granted = client().getAuthorizationResultFromIntent(result.getData());
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
