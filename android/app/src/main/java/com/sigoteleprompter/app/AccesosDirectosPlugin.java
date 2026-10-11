package com.sigoteleprompter.app;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;

/**
 * LOS ACCESOS DIRECTOS DEL ÍCONO -accesos-directos, 11-10-2026-.
 *
 * Administra el acceso dinámico ("Grabar «título»") y lleva las acciones
 * activadas desde los accesos directos ("grabar" y "nuevo") a la web.
 */
@CapacitorPlugin(name = "AccesosDirectos")
public class AccesosDirectosPlugin extends Plugin {
    private static String accionPendiente = null;
    private static AccesosDirectosPlugin instanciaActual = null;

    public static void fijarAccionPendiente(String accion) {
        accionPendiente = accion;
    }

    // Si la web ya escucha el evento, no dejes la acción como pendiente.
    // Antes:
    // public static void notificarAccion(String accion) {
    //     accionPendiente = accion;
    //     if (instanciaActual != null) {
    //         instanciaActual.notificarEventoAccion(accion);
    //     }
    // }
    public static void notificarAccion(String accion) {
        if (instanciaActual != null && instanciaActual.hasListeners("accionShortcut")) {
            instanciaActual.notificarEventoAccion(accion);
        } else {
            accionPendiente = accion;
        }
    }

    @Override
    public void load() {
        super.load();
        instanciaActual = this;
    }

    private void notificarEventoAccion(String accion) {
        JSObject datos = new JSObject();
        datos.put("accion", accion);
        notifyListeners("accionShortcut", datos);
    }

    @PluginMethod
    public void tomarAccionPendiente(PluginCall call) {
        JSObject r = new JSObject();
        r.put("accion", accionPendiente != null ? accionPendiente : "");
        accionPendiente = null;
        call.resolve(r);
    }

    @PluginMethod
    public void fijarAccesoGrabar(PluginCall call) {
        String etiquetaCorta = call.getString("etiquetaCorta", "Grabar");
        String etiquetaLarga = call.getString("etiquetaLarga", "Grabar");
        Context context = getContext();
        ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(context, "grabar")
            .setShortLabel(etiquetaCorta)
            .setLongLabel(etiquetaLarga)
            .setIcon(IconCompat.createWithResource(context, R.drawable.ic_acceso_grabar))
            .setIntent(new Intent("com.sigoteleprompter.app.GRABAR")
                .setPackage(context.getPackageName())
                .setClass(context, MainActivity.class))
            .build();
        ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);
        call.resolve();
    }

    @PluginMethod
    public void quitarAccesoGrabar(PluginCall call) {
        Context context = getContext();
        ShortcutManagerCompat.removeDynamicShortcuts(context, Collections.singletonList("grabar"));
        call.resolve();
    }
}
