package com.sigoteleprompter.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Arranque")
public class ArranquePlugin extends Plugin {
    // Antes:
    // private static PluginCall ultimoCall = null;
    private static PluginCall ultimoCall = null;
    private static boolean yaTermino = false;

    public static void reiniciarEstado() {
        yaTermino = false;
        ultimoCall = null;
    }

    // Antes:
    // @PluginMethod
    // public void listo(PluginCall call) {
    //     call.setKeepAlive(true);
    //     ultimoCall = call;
    //     MainActivity.notificarListo();
    // }
    @PluginMethod
    public void listo(PluginCall call) {
        if (yaTermino) {
            call.resolve();
            return;
        }
        call.setKeepAlive(true);
        ultimoCall = call;
        MainActivity.notificarListo();
    }

    // Antes:
    // public static void resolverListo() {
    //     if (ultimoCall != null) {
    //         ultimoCall.resolve();
    //         ultimoCall = null;
    //     }
    // }
    public static void resolverListo() {
        yaTermino = true;
        if (ultimoCall != null) {
            ultimoCall.resolve();
            ultimoCall = null;
        }
    }
}
