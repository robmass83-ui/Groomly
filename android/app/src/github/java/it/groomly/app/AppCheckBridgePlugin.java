package it.groomly.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppCheckBridge")
public class AppCheckBridgePlugin extends Plugin {
    public static void install() {
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        call.reject("App Check spento");
    }
}
