// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import androidx.webkit.WebViewFeature;
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
        r.put("volvioSolo", VentanaDePrueba.volvioSolo());
        r.put("paginaAjustes", VentanaDePrueba.paginaAjustes());
        call.resolve(r);
    }
    @PluginMethod public void abrirAjustesAccesibilidad(PluginCall call) {
        principal.post(() -> {
            try {
                android.content.Context ctx = getContext();
                ComponentName componente = new ComponentName(ctx, AccesibilidadDePrueba.class);
                Intent detalles = new Intent("android.settings.ACCESSIBILITY_DETAILS_SETTINGS");
                detalles.putExtra(Intent.EXTRA_COMPONENT_NAME, componente);
                detalles.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                String pagina = null;
                // EN EL MOTO G86, ANDROID 16 -revisión del 957fc97, 08-11-2026-: la página del servicio existe
                // -resolveActivity la encuentra- pero abrirla pide OPEN_ACCESSIBILITY_DETAILS_SETTINGS, un permiso
                // que solo tienen las apps del sistema: SecurityException, y el botón no hacía nada. Ahora, si falla,
                // va a la lista. Antes -957fc97-: if (resolveActivity != null) startActivity(detalles) sin respaldo.
                if (detalles.resolveActivity(ctx.getPackageManager()) != null) {
                    try {
                        ctx.startActivity(detalles);
                        pagina = "ACCESSIBILITY_DETAILS_SETTINGS";
                    } catch (SecurityException negada) {
                        VentanaDePrueba.anotar(VentanaDePrueba.numero(), "página del servicio negada: " + negada.getMessage());
                    }
                }
                if (pagina == null) {
                    Intent lista = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    // La lista de Ajustes resalta la fila cuya clave llega aquí; en AOSP la clave de cada servicio
                    // es su componente. Si el teléfono no lo respeta, se abre la lista igual. Idea mía, sin verificar
                    // en el g86 al escribirla.
                    String clave = componente.flattenToString();
                    android.os.Bundle argumentos = new android.os.Bundle();
                    argumentos.putString(":settings:fragment_args_key", clave);
                    lista.putExtra(":settings:fragment_args_key", clave);
                    lista.putExtra(":settings:show_fragment_args", argumentos);
                    lista.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(lista);
                    pagina = "ACTION_ACCESSIBILITY_SETTINGS";
                }
                VentanaDePrueba.marcarPaginaAjustes(pagina);
                VentanaDePrueba.marcarVolvioSolo(false);
                VentanaDePrueba.marcarEsperandoActivacion(true);
                VentanaDePrueba.anotar(VentanaDePrueba.numero(), "ajustes de accesibilidad página=" + pagina);
                JSObject r = new JSObject();
                r.put("pagina", pagina);
                call.resolve(r);
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
            if (accesibilidad == null) {
                VentanaDePrueba.anotar(0, "abrir rechazado: SIN_ACCESIBILIDAD");
                call.reject("Sin accesibilidad conectada", "SIN_ACCESIBILIDAD");
            } else if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                VentanaDePrueba.anotar(0, "WEB_MESSAGE_LISTENER no disponible");
                call.reject("Este teléfono no puede abrir la ventana flotante.");
            } else {
                try {
                    VentanaDePrueba.abrir(this, servicio, accesibilidad);
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
    void accion(long numero, String tipo) { accion(numero, tipo, -1); }
    void accion(long numero, String tipo, long token) {
        // Cerrar ya soltó la sesión: la generación evita enviar una acción vieja a una nueva.
        if (destruido || !VentanaDePrueba.esUltimaGeneracion(numero)) {
            VentanaDePrueba.anotar(numero, "acción descartada: plugin destruido o generación vieja " + tipo);
            return;
        }
        JSObject d = new JSObject();
        d.put("tipo", tipo);
        d.put("sesion", numero);
        if (token >= 0) d.put("token", token);
        notifyListeners("accion", d);
    }
    @PluginMethod public void enviar(PluginCall call) {
        JSObject raw = call.getData();
        VentanaDePrueba.enviarAPagina(raw == null ? "{}" : raw.toString());
        call.resolve();
    }
    // Antes -hasta el 08-11-2026-: call.resolve(VentanaDePrueba.preferencias(getContext())), sin el ancho de la banda.
    @PluginMethod public void preferencias(PluginCall call) {
        JSObject r = VentanaDePrueba.preferencias(getContext());
        try { r.put("anchoVentana", VentanaDePrueba.anchoDeLaBandaDp(getActivity())); }
        catch (Exception e) { VentanaDePrueba.anotar(VentanaDePrueba.numero(), "no se pudo medir el ancho de la banda: " + e); }
        call.resolve(r);
    }
    @PluginMethod public void guardarPreferencias(PluginCall call) {
        VentanaDePrueba.guardarPreferencias(getContext(), call.getData());
        call.resolve();
    }
    @Override protected void handleOnDestroy() {
        destruido = true;
        principal.post(() -> VentanaDePrueba.cerrarDelPlugin(this, "handleOnDestroy"));
        super.handleOnDestroy();
    }
}
