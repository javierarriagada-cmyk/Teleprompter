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
final class SesionVentana {
    enum Fase { CUENTA_INICIAL, ESCUCHANDO, PAUSA, CUENTA }
    enum Evento { NADA, AVISO, LIMITE }

    static final int SEGUNDOS_CUENTA = 3;

    final boolean conLimite;
    final long lecturaMs, avisoAntesMs;
    private long acumuladoMs;
    private long desdeMs = -1;
    private Fase fase = Fase.CUENTA_INICIAL;
    private int cuenta;
    private boolean avisoDado, limiteDado;

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
        if (fase != Fase.CUENTA_INICIAL) return false;
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return true;
    }

    // Pausa -el botón, la pantalla apagada o el límite-. Devuelve si cambió algo. En la cuenta, la corta.
    boolean pausar(long ahoraMs) {
        if (fase == Fase.PAUSA) return false;
        if (fase == Fase.ESCUCHANDO) acumuladoMs = leidosMs(ahoraMs);
        desdeMs = -1;
        fase = Fase.PAUSA;
        cuenta = 0;
        return true;
    }

    // Seguir: desde la pausa, la cuenta 3-2-1. Devuelve el primer número, o 0 si no corresponde.
    int seguir() {
        if (fase != Fase.PAUSA) return 0;
        fase = Fase.CUENTA;
        cuenta = SEGUNDOS_CUENTA;
        return cuenta;
    }

    // Pasó un segundo de la cuenta: el número siguiente, o 0 cuando terminó -y entonces se vuelve a escuchar-.
    // Fuera de la cuenta devuelve -1: un paso viejo que quedó en la cola no hace nada.
    int pasoDeCuenta(long ahoraMs) {
        if (fase != Fase.CUENTA) return -1;
        cuenta--;
        if (cuenta > 0) return cuenta;
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return 0;
    }

    // El reloj del límite. Solo con límite y escuchando: así las pausas y la cuenta no cuentan.
    Evento revisar(long ahoraMs) {
        if (!conLimite || fase != Fase.ESCUCHANDO) return Evento.NADA;
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
