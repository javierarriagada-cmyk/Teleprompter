// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: las reglas de la sesión mientras la ventana está abierta. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// MIENTRAS LA VENTANA ESTÁ ABIERTA, LA SESIÓN LA MANDA ANDROID -09-11-2026-. Medido en el g86: la página de Sigo deja
// de correr cerca de un minuto después de quedar atrás -APK 808: anotó 61 s y después nada-, y las siete pausas que
// se tocaron en la ventana le llegaron todas juntas al volver -APK 809-. La pausa, la cuenta 3-2-1, el reloj del
// límite gratis y su aviso no pueden depender de ella: viven aquí, sin Android, para probarlos en la JVM
// -SesionVentanaTest-. VentanaDePrueba les pone la hora -SystemClock.elapsedRealtime-, el micrófono y la ventana.
//
// Las mismas reglas que Leer en App.tsx: el tiempo de lectura cuenta sin pausas ni cuenta -transcurridoSinPausas-;
// el aviso «te queda un minuto» sale una vez, en lecturaSeg − avisoAntesSeg -hayQueAvisar-; en lecturaSeg se pausa
// una vez -llegoAlLimite, accionAlLimiteLectura 'pausar'- y después de esa pausa Seguir sigue sin otro corte, como
// hoy en Sigo -limiteAplicadoRef-. Sin límite -Sigo+ o Velocidad fija- no hay aviso ni pausa.
//
// -9-nov-2026, orden «Tres correcciones», fallo 2- AL TERMINAR EL «1» SE PIDE EL MICRÓFONO, Y SE ESCUCHA CUANDO VOSK
// LO CONFIRMA. Antes pasoDeCuenta ponía ESCUCHANDO de una y VoskNativoPlugin.reanudarParaVentana intentaba abrir
// después: si fallaba, la ventana y el reloj seguían como si la persona leyera. Ahora la cuenta termina en ABRIENDO,
// con un número de intento; solo alAbrirMicrofono de ESE intento pone ESCUCHANDO y echa a andar el reloj. Si falla,
// vuelve a PAUSA y Seguir se puede tocar otra vez. Una confirmación de un intento viejo -después de Pausa, de la
// pantalla apagada, de otro Seguir- o con la sesión cerrada se descarta: la ventana tiene que soltar esa captura.
final class SesionVentana {
    // Antes -hasta el 9-nov-2026-: enum Fase { CUENTA_INICIAL, ESCUCHANDO, PAUSA, CUENTA }
    enum Fase { CUENTA_INICIAL, ESCUCHANDO, PAUSA, CUENTA, ABRIENDO }
    enum Evento { NADA, AVISO, LIMITE }
    // Qué hacer con la respuesta de Vosk: publicar «escuchando», volver a Pausa con el aviso, o descartarla.
    enum Apertura { ESCUCHANDO, PAUSA, DESCARTADA }

    static final int SEGUNDOS_CUENTA = 3;

    final boolean conLimite;
    final long lecturaMs, avisoAntesMs;
    private long acumuladoMs;
    private long desdeMs = -1;
    private Fase fase = Fase.CUENTA_INICIAL;
    private int cuenta;
    private boolean avisoDado, limiteDado;
    // El intento de apertura del micrófono que se pidió al terminar la última cuenta. Sube con cada cuenta terminada.
    private long intento;
    private boolean cerrada;

    // leidosSeg: lo ya leído sin pausas al abrir -0 en una toma nueva-.
    SesionVentana(boolean conLimite, int lecturaSeg, int avisoAntesSeg, double leidosSeg) {
        this.conLimite = conLimite && lecturaSeg > 0;
        this.lecturaMs = Math.max(0, lecturaSeg) * 1000L;
        this.avisoAntesMs = Math.max(0, avisoAntesSeg) * 1000L;
        this.acumuladoMs = Math.max(0, Math.round(leidosSeg * 1000));
    }

    Fase fase() { return fase; }
    boolean escuchando() { return fase == Fase.ESCUCHANDO; }
    boolean enPausa() { return fase == Fase.PAUSA; }
    // La cuenta que se ve -3, 2 o 1-, o 0 si no hay cuenta de Android.
    int cuenta() { return fase == Fase.CUENTA ? cuenta : 0; }
    boolean llegoAlLimite() { return limiteDado; }

    long leidosMs(long ahoraMs) {
        return acumuladoMs + (fase == Fase.ESCUCHANDO && desdeMs >= 0 ? Math.max(0, ahoraMs - desdeMs) : 0);
    }

    // La cuenta inicial la lleva Sigo, que está al frente al tocar Empezar. Cuando termina, empieza la lectura.
    boolean empezarLectura(long ahoraMs) {
        if (cerrada || fase != Fase.CUENTA_INICIAL) return false;
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return true;
    }

    // Pausa -el botón, la pantalla apagada o el límite-. Devuelve si cambió algo. En la cuenta, la corta. Esperando el
    // micrófono -ABRIENDO-, la espera se corta: su confirmación ya no vale.
    boolean pausar(long ahoraMs) {
        if (cerrada) return false;
        if (fase == Fase.PAUSA) return false;
        if (fase == Fase.ESCUCHANDO) acumuladoMs = leidosMs(ahoraMs);
        desdeMs = -1;
        fase = Fase.PAUSA;
        cuenta = 0;
        return true;
    }

    // Seguir: desde la pausa, la cuenta 3-2-1. Devuelve el primer número, o 0 si no corresponde.
    int seguir() {
        if (cerrada || fase != Fase.PAUSA) return 0;
        fase = Fase.CUENTA;
        cuenta = SEGUNDOS_CUENTA;
        return cuenta;
    }

    // Pasó un segundo de la cuenta: el número siguiente, o 0 cuando terminó -y entonces se pide el micrófono, ver
    // intentoPedido-. Fuera de la cuenta devuelve -1: un paso viejo que quedó en la cola no hace nada.
    // Antes -hasta el 9-nov-2026-, al terminar:
    //     fase = Fase.ESCUCHANDO;
    //     desdeMs = ahoraMs;
    //     return 0;
    // Motivo: escuchar y contar recién con el micrófono abierto -alAbrirMicrofono-.
    int pasoDeCuenta(long ahoraMs) {
        if (cerrada || fase != Fase.CUENTA) return -1;
        cuenta--;
        if (cuenta > 0) return cuenta;
        fase = Fase.ABRIENDO;
        intento++;
        return 0;
    }

    // El intento que espera la confirmación de Vosk, o 0 si no se espera ninguna.
    long intentoPedido() { return !cerrada && fase == Fase.ABRIENDO ? intento : 0; }

    // La respuesta de Vosk para un intento: abierto o no. Solo la del intento que se espera cambia algo.
    Apertura alAbrirMicrofono(long intentoDeLaRespuesta, boolean abierto, long ahoraMs) {
        if (cerrada || fase != Fase.ABRIENDO || intentoDeLaRespuesta != intento) return Apertura.DESCARTADA;
        if (!abierto) {
            fase = Fase.PAUSA;
            desdeMs = -1;
            return Apertura.PAUSA;
        }
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return Apertura.ESCUCHANDO;
    }

    // El cierre de la sesión: una vez. Desde ahí nada cambia y toda confirmación se descarta. Lo leído queda como
    // estaba al cerrar -estadoDeLaSesion se toma antes-.
    boolean cerrar(long ahoraMs) {
        if (cerrada) return false;
        if (fase == Fase.ESCUCHANDO) acumuladoMs = leidosMs(ahoraMs);
        desdeMs = -1;
        cerrada = true;
        return true;
    }
    boolean cerrada() { return cerrada; }

    // El reloj del límite. Solo con límite y escuchando: así las pausas y la cuenta no cuentan.
    Evento revisar(long ahoraMs) {
        if (cerrada || !conLimite || fase != Fase.ESCUCHANDO) return Evento.NADA;
        long leidos = leidosMs(ahoraMs);
        if (!limiteDado && leidos >= lecturaMs) {
            limiteDado = true;
            avisoDado = true;
            pausar(ahoraMs);
            return Evento.LIMITE;
        }
        if (!avisoDado && !limiteDado && leidos >= lecturaMs - avisoAntesMs) {
            avisoDado = true;
            return Evento.AVISO;
        }
        return Evento.NADA;
    }
}
