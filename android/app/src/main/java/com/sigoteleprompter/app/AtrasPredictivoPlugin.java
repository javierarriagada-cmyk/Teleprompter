package com.sigoteleprompter.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * EL ATRÁS PREDICTIVO -rama atras-predictivo, 11-10-2026-. Un plugin chico con dos direcciones.
 *
 * El receptor del gesto NO vive acá: es el OnBackPressedCallback de MainActivity, el único que hay.
 * Este plugin solo lleva y trae:
 *
 *   del nativo a la web -MainActivity.avisarAtras-: 'inicio' con el borde desde donde parte el dedo
 *   -izquierdo, derecho o ninguno-, 'avance' de 0 a 1, 'cancelado' y 'confirmado'. La web
 *   -src/lib/atrasPredictivo.ts y el cableado en App.tsx- anima con los tres primeros, y con
 *   'confirmado' corre handleVolverAtras, el mismo de siempre.
 *
 *   de la web al nativo -hayAdondeVolver-: la web avisa cada vez que cambia algo que decide si hay
 *   adónde volver. Con true el callback de MainActivity queda activo y recibe el gesto; con false
 *   queda inactivo, nadie lo recibe y Android hace su propia animación de volver al inicio.
 *
 *   -corrección del PR 94, 11-10-2026- hayAdondeVolver trae también camara: true cuando el gesto se
 *   va a animar y la cámara está prendida detrás del texto o en el recuadro. Con eso MainActivity
 *   achica la vista previa nativa en cada avance, sin esperar a la web. Si la web llama sin el campo,
 *   camara vale false.
 */
@CapacitorPlugin(name = "AtrasPredictivo")
public class AtrasPredictivoPlugin extends Plugin {
    static final String ETIQUETA = "SigoAtras";

    @PluginMethod
    public void hayAdondeVolver(PluginCall call) {
        Boolean hay = call.getBoolean("hay");
        // Nada en silencio: sin el valor no se adivina, se rechaza y la web lo anota.
        if (hay == null) {
            Log.w(ETIQUETA, "hayAdondeVolver sin 'hay': el callback queda como estaba");
            call.reject("hayAdondeVolver sin 'hay'");
            return;
        }
        if (!(getActivity() instanceof MainActivity)) {
            Log.w(ETIQUETA, "hayAdondeVolver: la actividad no es MainActivity, nadie recibe el gesto");
            call.reject("la actividad no es MainActivity");
            return;
        }
        final MainActivity actividad = (MainActivity) getActivity();
        final boolean camara = Boolean.TRUE.equals(call.getBoolean("camara", false));
        // setEnabled del callback va en el hilo de la pantalla: el despachador de atrás vive ahí.
        // Antes:
        // actividad.runOnUiThread(() -> {
        //     actividad.fijarHayAdondeVolver(hay);
        //     call.resolve();
        // });
        actividad.runOnUiThread(() -> {
            actividad.fijarHayAdondeVolver(hay, camara);
            call.resolve();
        });
    }

    // Del nativo a la web. notifyListeners es protegido en Plugin: MainActivity pasa por acá.
    void avisar(String evento, JSObject datos) {
        notifyListeners(evento, datos);
    }
}
