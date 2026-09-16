package com.teleprompter.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Arranque")
public class ArranquePlugin extends Plugin {
    @PluginMethod
    public void listo(PluginCall call) {
        MainActivity.notificarListo();
        call.resolve();
    }
}
