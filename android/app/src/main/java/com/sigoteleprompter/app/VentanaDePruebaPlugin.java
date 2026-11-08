// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.content.Intent;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VentanaDePrueba")
public class VentanaDePruebaPlugin extends Plugin {
    private final Handler principal = new Handler(Looper.getMainLooper());
    private boolean destruido;


    @PluginMethod public void estado(PluginCall call) {
        JSObject r = new JSObject();
        r.put("accesibilidad", AccesibilidadDePrueba.vigente != null);
        call.resolve(r);
    }
    @PluginMethod public void abrirAjustesAccesibilidad(PluginCall call) {
        principal.post(() -> {
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
                call.resolve();
            } catch (Exception e) {
                VentanaDePrueba.anotar(VentanaDePrueba.numero(), "no se abrieron ajustes: " + e);
                call.reject(e.getMessage(), e);
            }
        });
    }
    @PluginMethod public void abrir(PluginCall call) {
        boolean servicio = Boolean.TRUE.equals(call.getBoolean("servicio", false));
        boolean ventana = Boolean.TRUE.equals(call.getBoolean("ventana", false));
        principal.post(() -> {
            if (destruido || getActivity() == null || !getActivity().getLifecycle().getCurrentState().isAtLeast(androidx.lifecycle.Lifecycle.State.RESUMED)) {
                VentanaDePrueba.anotar(VentanaDePrueba.numero(), "abrir rechazado: Sigo no está a la vista");
                call.reject("Sigo debe estar a la vista para abrir la prueba.");
                return;
            }
            AccesibilidadDePrueba accesibilidad = AccesibilidadDePrueba.vigente;
            if (ventana && accesibilidad == null) {
                VentanaDePrueba.anotar(0, "abrir rechazado: SIN_ACCESIBILIDAD");
                call.reject("Sin accesibilidad conectada", "SIN_ACCESIBILIDAD");
            } else if (!ventana && accesibilidad != null) {
                VentanaDePrueba.anotar(0, "abrir rechazado: ACCESIBILIDAD_ACTIVA");
                call.reject("El control C0 requiere accesibilidad apagada", "ACCESIBILIDAD_ACTIVA");
            } else {
                try {
                    VentanaDePrueba.abrir(this, servicio, ventana ? accesibilidad : null);
                    JSObject r = new JSObject();
                    r.put("sesion", VentanaDePrueba.numero());
                    call.resolve(r);
                } catch (Exception e) { call.reject(e.getMessage(), e); }
            }
        });
    }
    @PluginMethod public void cerrar(PluginCall call) {
        principal.post(() -> { VentanaDePrueba.cerrarDelPlugin(this, "cerrar desde la web"); call.resolve(); });
    }
    void accion(long numero, String tipo) {
        // Cerrar ya soltó la sesión: la generación evita enviar una acción vieja a una nueva.
        if (destruido || !VentanaDePrueba.esUltimaGeneracion(numero)) {
            VentanaDePrueba.anotar(numero, "acción descartada: plugin destruido o generación vieja " + tipo);
            return;
        }
        JSObject d = new JSObject();
        d.put("tipo", tipo);
        d.put("sesion", numero);
        notifyListeners("accion", d);
    }
    @Override protected void handleOnDestroy() {
        destruido = true;
        principal.post(() -> VentanaDePrueba.cerrarDelPlugin(this, "handleOnDestroy"));
        super.handleOnDestroy();
    }
}
