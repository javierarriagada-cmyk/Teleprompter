// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: el cierre común de la sesión de la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// EL CIERRE COMÚN -9-nov-2026, orden «Tres correcciones», fallo 3-. La sesión de la ventana se cierra por varias
// rutas: la X, Volver a Sigo, «Ver Sigo+», la desconexión del servicio de Accesibilidad, Sigo destruido, cerrar desde
// la web. Antes solo la X apagaba el micrófono -VoskNativoPlugin.pausarParaVentana antes de cerrar-: con la
// desconexión del servicio, el oído de la sesión quedaba abierto hasta que la página de Sigo despertara, y esa página
// puede seguir suspendida. Ahora todas pasan por aquí, una vez: se cancela la cuenta, se ordena liberar el micrófono
// de ESTA sesión -VoskNativoPlugin lo hace en su hilo, sin la página de Sigo, y solo si lo abierto es de esta sesión,
// ver MicrofonoDeVentana.liberarSesion- y se retiran la ventana y Aa. Sin Android, para probarlo en la JVM.
final class CierreDeSesion {
    interface Acciones {
        void cancelarCuenta();
        void liberarMicrofono(long sesion, String motivo);
        void quitarVentanas(String motivo);
    }

    private boolean hecho;

    boolean hecho() { return hecho; }

    // true la primera vez; las siguientes no hacen nada.
    boolean cerrar(long sesion, String motivo, SesionVentana reglas, long ahoraMs, Acciones acciones) {
        if (hecho) return false;
        hecho = true;
        if (reglas != null) reglas.cerrar(ahoraMs);
        acciones.cancelarCuenta();
        acciones.liberarMicrofono(sesion, motivo);
        acciones.quitarVentanas(motivo);
        return true;
    }
}
