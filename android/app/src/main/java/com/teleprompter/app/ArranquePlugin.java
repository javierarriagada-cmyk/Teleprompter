package com.teleprompter.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Arranque")
public class ArranquePlugin extends Plugin {
    private static PluginCall ultimoCall = null;

    @PluginMethod
    public void listo(PluginCall call) {
        call.setKeepAlive(true);
        ultimoCall = call;
        MainActivity.notificarListo();
    }

    public static void resolverListo() {
        if (ultimoCall != null) {
            ultimoCall.resolve();
            ultimoCall = null;
        }
    }
}
