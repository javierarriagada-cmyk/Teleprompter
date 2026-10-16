package com.sigoteleprompter.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * MEDICIÓN DEL SERVIDOR LOCAL -medir-servidor-local, 16-10-2026-. direccion: la dirección http de una
 * toma en ServidorLocal. anotar: deja en logcat -MEDIR-SERVIDOR- lo que el visor ve del <video>.
 */
@CapacitorPlugin(name = "MedirServidor")
public class MedirServidorPlugin extends Plugin {

    @PluginMethod
    public void direccion(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null || ruta.isEmpty()) {
            call.reject("ruta requerida");
            return;
        }
        try {
            JSObject ret = new JSObject();
            ret.put("url", ServidorLocal.obtener(getContext()).direccion(ruta));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(ServidorLocal.ETIQUETA, "no arrancó el servidor: " + e);
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void anotar(PluginCall call) {
        Log.i(ServidorLocal.ETIQUETA, "visor: " + call.getString("texto", ""));
        call.resolve();
    }
}
