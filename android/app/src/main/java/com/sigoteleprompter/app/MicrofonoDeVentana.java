// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: de quién es el micrófono abierto. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// DE QUIÉN ES EL MICRÓFONO -9-nov-2026, orden «Tres correcciones», fallos 2 y 3-. VoskNativoPlugin tiene un solo oído
// abierto a la vez. Cada vez que lo abre es una CAPTURA con su número, y es de la sesión de la ventana que estaba
// abierta -0 si no había ventana: Leer o Grabar de siempre-. Las órdenes que llegan atrasadas al hilo de los plugins
// -el cierre de una sesión vieja, la confirmación de un Seguir que ya no vale- nombran la sesión o la captura a la
// que se refieren, y aquí se decide si el oído abierto es ese. Así una orden vieja nunca apaga el micrófono de una
// sesión nueva. Sin Android, para probarlo en la JVM -MicrofonoDeVentanaTest-; VoskNativoPlugin lo usa en su hilo.
//
// Antes -hasta el 9-nov-2026-, en VoskNativoPlugin:
//     private long sesionVentanaDelOido = 0;
//     private long pausaDeVentana = 0;
// Motivo: la sesión sola no distingue dos capturas de la misma sesión -antes y después de una pausa-, y el cierre
// común necesita saber si lo abierto es de la sesión que cierra.
final class MicrofonoDeVentana {
    private long ultimaCaptura;
    // La captura abierta -0: no hay oído abierto- y la sesión de la ventana que es su dueña.
    private long captura;
    private long sesion;
    // La sesión de la ventana que dejó el micrófono en pausa: mientras siga abierta, un escuchar de la página de Sigo
    // -que despierta tarde- no lo vuelve a abrir.
    private long pausa;

    long captura() { return captura; }
    long sesion() { return sesion; }
    long pausa() { return pausa; }
    boolean abierto() { return captura != 0; }

    // Se abrió el oído: una captura nueva, de esa sesión -0 sin ventana-.
    long abrio(long sesionDuena) {
        captura = ++ultimaCaptura;
        sesion = sesionDuena;
        return captura;
    }

    // Se cerró el oído, por el camino que sea -detener de la página, la pausa, el cierre-.
    void cerro() {
        captura = 0;
        sesion = 0;
    }

    // La pausa de la ventana: la captura que hay que cerrar, o 0 si no hay nada abierto o lo abierto es de otra sesión.
    // Con la sesión todavía abierta queda marcada la pausa.
    long pausar(long sesionQuePausa, boolean sesionAbierta) {
        if (captura != 0 && sesion != sesionQuePausa) return 0;
        if (sesionAbierta) pausa = sesionQuePausa;
        return captura;
    }
    // Si la pausa de esa sesión dejó el micrófono cerrado, para que la apertura de Seguir la suelte.
    boolean reanudar(long sesionQueSigue) {
        if (sesionQueSigue == 0 || pausa != sesionQueSigue) return false;
        pausa = 0;
        return true;
    }

    // EL CIERRE COMÚN DE LA SESIÓN -fallo 3-: la captura que hay que liberar, o 0 si lo abierto no es de esa sesión
    // -una sesión nueva, o una lectura sin ventana- o no hay nada abierto. Repetirlo no hace nada más.
    long liberarSesion(long sesionQueCierra) {
        if (sesionQueCierra == 0) return 0;
        if (pausa == sesionQueCierra) pausa = 0;
        return captura != 0 && sesion == sesionQueCierra ? captura : 0;
    }

    // Una confirmación descartada -fallo 2-: si esa captura sigue abierta, se libera; si no, no se toca nada.
    long liberarCaptura(long capturaDescartada) {
        return capturaDescartada != 0 && captura == capturaDescartada ? captura : 0;
    }
}
