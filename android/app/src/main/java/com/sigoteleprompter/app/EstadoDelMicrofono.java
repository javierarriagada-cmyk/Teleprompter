// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import java.util.ArrayList;
import java.util.List;

/** Solo la sesión de Vosk decide; el MIC del corpus y las grabaciones ajenas no votan. */
final class EstadoDelMicrofono {
    static final String PAUSA = "En pausa";
    static final String SILENCIADO = "Silenciado por Android";
    static final String DISPONIBLE = "Disponible";
    static final String SIN_DATOS = "Sin datos";

    static final class Grabacion {
        final int sesion;
        final boolean silenciada;
        Grabacion(int sesion, boolean silenciada) { this.sesion = sesion; this.silenciada = silenciada; }
    }

    static String de(long ahora, long ultimoEvento, int sesionVosk, List<Grabacion> grabaciones) {
        if (sesionVosk < 0 || ultimoEvento < 0 || ahora - ultimoEvento > 1000) return PAUSA;
        if (grabaciones == null) return SIN_DATOS;
        List<Boolean> silenciadas = new ArrayList<>();
        for (Grabacion g : grabaciones) if (g.sesion == sesionVosk) silenciadas.add(g.silenciada);
        if (silenciadas.isEmpty()) return SIN_DATOS;
        return PerdidaDeRecursos.microfonoPerdido(true, silenciadas) ? SILENCIADO : DISPONIBLE;
    }
}
