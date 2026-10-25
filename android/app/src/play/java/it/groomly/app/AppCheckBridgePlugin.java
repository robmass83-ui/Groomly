package it.groomly.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

@CapacitorPlugin(name = "AppCheckBridge")
public class AppCheckBridgePlugin extends Plugin {
    public static void install() {
        if (!BuildConfig.APP_CHECK_ENABLED) return;
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance()
        );
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        if (!BuildConfig.APP_CHECK_ENABLED) {
            call.reject("App Check spento");
            return;
        }
        FirebaseAppCheck.getInstance().getAppCheckToken(false)
            .addOnSuccessListener(token -> {
                JSObject result = new JSObject();
                result.put("token", token.getToken());
                result.put("expireTimeMillis", token.getExpireTimeMillis());
                call.resolve(result);
            })
            .addOnFailureListener(error -> call.reject(error.getMessage()));
    }
}
