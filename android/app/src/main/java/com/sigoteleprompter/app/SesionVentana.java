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
    // Antes -9-nov-2026, orden t160u, punto 4-: enum Apertura { ESCUCHANDO, PAUSA, DESCARTADA }
    // Razón: la apertura del primer Empezar la hace la página de Sigo y puede llegar antes que el fin de la cuenta.
    // ANOTADA: se guarda para cuando termine la cuenta, sin publicar nada y sin soltar la captura. IGNORADA: una
    // apertura de la página con la ventana ya escuchando -el oído es el de la lectura de la ventana-: no se toca.
    enum Apertura { ESCUCHANDO, PAUSA, DESCARTADA, ANOTADA, IGNORADA }
    // -9-nov-2026, orden t160u, punto 4- Qué hacer con un estado de Sigo durante la cuenta de Empezar: pasarlo a la
    // ventana, descartarlo -la sesión ya es de Android-, o, al terminar la cuenta, mandar el de Android: escuchando si
    // el micrófono ya se confirmó, esperando su confirmación, o en Pausa si su apertura falló.
    // Antes -9-nov-2026, segunda vuelta-: enum Inicial { REENVIAR, DESCARTAR, ESCUCHANDO, ESPERANDO_MICRO, PAUSA }
    // Razón: Sigo ahora también dice que canceló su cuenta: la sesión pasa a Pausa e invalida la apertura pendiente.
    enum Inicial { REENVIAR, DESCARTAR, ESCUCHANDO, ESPERANDO_MICRO, PAUSA, CANCELADA }
    // El intento de la apertura del primer Empezar: la pide la página de Sigo -escuchar-, no una cuenta de Android.
    // Los de Seguir son 1, 2, …: una respuesta de la página que llega después de un Seguir no se confunde con ellos.
    static final long INTENTO_INICIAL = 0;

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
    // -9-nov-2026, orden t160u, punto 4- La cuenta de Empezar: si ya se vio un número, y lo que respondió Vosk a la
    // apertura de la página mientras tanto. Antes cuentaInicialVista vivía en VentanaDePrueba.Sesion.
    private boolean cuentaInicialVista, microInicialAbierto, microInicialFallo;
    // -9-nov-2026, segunda vuelta- Cuándo termina la cuenta de Empezar según el reloj de Android: el primer número que
    // manda Sigo, más esos segundos. -1 mientras no se vio ninguno. Así la cuenta termina aunque la página de Sigo se
    // duerma y no mande su fin.
    private long finCuentaInicialMs = -1;
    long finCuentaInicialMs() { return finCuentaInicialMs; }

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
    // -9-nov-2026, orden t160u, punto 4- VentanaDePrueba ya no la llama directo: pasa por estadoDeSigo, que la llama
    // recién con las dos confirmaciones. Queda para eso y para las pruebas que necesitan una sesión escuchando.
    boolean empezarLectura(long ahoraMs) {
        if (cerrada || fase != Fase.CUENTA_INICIAL) return false;
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return true;
    }

    // EL PRIMER EMPEZAR NECESITA DOS CONFIRMACIONES -9-nov-2026, orden t160u, punto 4-: terminó la cuenta de Sigo y abrió
    // el micrófono. Antes el primer estado sin cuenta de Sigo -después de verla, o ya escuchando si llegaron juntos-
    // ponía ESCUCHANDO y echaba a andar el reloj aunque Vosk no hubiera abierto nada. Ahora, al terminar la cuenta: con
    // el micrófono ya confirmado, ESCUCHANDO; con su apertura fallida, PAUSA -Seguir lo reintenta como siempre-; sin
    // respuesta todavía, ABRIENDO con el intento inicial, igual que el fin de la cuenta de Seguir, y alAbrirMicrofono
    // decide. Pausa o cierre entre medio la invalidan: fase y cerrada ya no lo permiten.
    // Antes -hasta el 9-nov-2026-, en VentanaDePrueba.Sesion.deSigo:
    //     if (conCuenta) cuentaInicialVista = true;
    //     else if ((cuentaInicialVista || o.optBoolean("escuchando", false)) && !o.optBoolean("enPausa", false)) {
    //         reglas.empezarLectura(SystemClock.elapsedRealtime());
    //         anotar(numero, "lectura empezada: cuenta Android");
    //     }
    //     return true;
    // Antes -9-nov-2026, segunda vuelta-:
    // Inicial estadoDeSigo(boolean conCuenta, boolean escuchando, boolean enPausa, long ahoraMs) {
    //     if (cerrada || fase != Fase.CUENTA_INICIAL) return Inicial.DESCARTAR;
    //     if (conCuenta) {
    //         cuentaInicialVista = true;
    //         return Inicial.REENVIAR;
    //     }
    //     // Sin haber visto la cuenta -dos estados juntos-, basta con que Sigo ya escuche.
    //     if (!(cuentaInicialVista || escuchando) || enPausa) return Inicial.REENVIAR;
    // Razón: el fin de la cuenta se deducía de que la cuenta desaparecía -también al cancelarla- o del «escuchando» de
    // Sigo. Ahora Sigo lo dice -terminada o cancelada- y Android lo sabe además por su reloj -terminarCuentaInicial-.
    // La forma corta, con un número cualquiera de la cuenta: la de las pruebas.
    Inicial estadoDeSigo(boolean conCuenta, boolean terminada, boolean cancelada, long ahoraMs) {
        return estadoDeSigo(conCuenta ? SEGUNDOS_CUENTA : 0, terminada, cancelada, ahoraMs);
    }

    // cuenta: el número que manda Sigo -0 sin número-; terminada: Sigo dice que su cuenta llegó al fin; cancelada: que
    // la cortó. La cancelación pasa a Pausa: la apertura del micrófono que llegue después se descarta.
    // Antes -9-nov-2026, orden t162u, punto 1-:
    // Inicial estadoDeSigo(int cuenta, boolean terminada, boolean cancelada, long ahoraMs) {
    //     if (cerrada || fase != Fase.CUENTA_INICIAL) return Inicial.DESCARTAR;
    //     if (cancelada) {
    //         pausar(ahoraMs);
    //         return Inicial.CANCELADA;
    //     }
    // Razón: el reloj de Android puede pasar la cuenta a ABRIENDO un instante antes de que llegue la cancelación de esa
    // misma cuenta: se descartaba, y la confirmación tardía de Vosk empezaba una lectura que la persona había cortado.
    // Ahora la cancelación vale mientras siga en pie lo del primer Empezar -la cuenta, la espera de su micrófono o su
    // lectura-; desde una Pausa o un Seguir posterior -intento distinto del inicial- ya no es de ellos y se descarta.
    Inicial estadoDeSigo(int cuenta, boolean terminada, boolean cancelada, long ahoraMs) {
        if (cancelada && esDelPrimerEmpezar()) {
            pausar(ahoraMs);
            return Inicial.CANCELADA;
        }
        if (cerrada || fase != Fase.CUENTA_INICIAL) return Inicial.DESCARTAR;
        if (cuenta > 0) {
            if (!cuentaInicialVista) finCuentaInicialMs = ahoraMs + cuenta * 1000L;
            cuentaInicialVista = true;
            return Inicial.REENVIAR;
        }
        if (!terminada) return Inicial.REENVIAR;
        return terminarCuentaInicial(ahoraMs);
    }

    // -9-nov-2026, orden t162u, punto 1- Lo que sigue siendo del primer Empezar: su cuenta, la espera de su micrófono
    // -ABRIENDO del intento inicial- o la lectura que empezó con él. Un Seguir sube el intento y una Pausa cambia la fase.
    private boolean esDelPrimerEmpezar() {
        if (cerrada) return false;
        if (fase == Fase.CUENTA_INICIAL) return true;
        return intento == INTENTO_INICIAL && (fase == Fase.ABRIENDO || fase == Fase.ESCUCHANDO);
    }

    // El fin de la cuenta de Empezar: lo dice Sigo o lo marca el reloj de Android -finCuentaInicialMs-, lo que llegue
    // primero; el segundo ya no encuentra la cuenta y se descarta.
    Inicial terminarCuentaInicial(long ahoraMs) {
        if (cerrada || fase != Fase.CUENTA_INICIAL) return Inicial.DESCARTAR;
        if (microInicialAbierto) {
            empezarLectura(ahoraMs);
            return Inicial.ESCUCHANDO;
        }
        if (microInicialFallo) {
            fase = Fase.PAUSA;
            desdeMs = -1;
            return Inicial.PAUSA;
        }
        fase = Fase.ABRIENDO;
        return Inicial.ESPERANDO_MICRO;
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
    // -9-nov-2026, orden t160u, punto 4- La del intento inicial -la página de Sigo abrió en el primer Empezar-: durante
    // la cuenta se anota; con la cuenta terminada -ABRIENDO del intento inicial- decide como la de Seguir; con la
    // ventana escuchando no se toca -ese oído es el de la lectura-; en Pausa o en la cuenta de Seguir se descarta.
    // Antes -hasta el 9-nov-2026- empezaba directo con:
    //     if (cerrada || fase != Fase.ABRIENDO || intentoDeLaRespuesta != intento) return Apertura.DESCARTADA;
    // Razón: el cerrado va primero y aparte, y en medio las respuestas del intento inicial.
    Apertura alAbrirMicrofono(long intentoDeLaRespuesta, boolean abierto, long ahoraMs) {
        if (cerrada) return Apertura.DESCARTADA;
        if (intentoDeLaRespuesta == INTENTO_INICIAL && fase == Fase.CUENTA_INICIAL) {
            microInicialAbierto = abierto;
            microInicialFallo = !abierto;
            return Apertura.ANOTADA;
        }
        if (intentoDeLaRespuesta == INTENTO_INICIAL && (intento != INTENTO_INICIAL || fase != Fase.ABRIENDO)) {
            return fase == Fase.ESCUCHANDO || fase == Fase.ABRIENDO ? Apertura.IGNORADA : Apertura.DESCARTADA;
        }
        if (fase != Fase.ABRIENDO || intentoDeLaRespuesta != intento) return Apertura.DESCARTADA;
        if (!abierto) {
            fase = Fase.PAUSA;
            desdeMs = -1;
            return Apertura.PAUSA;
        }
        fase = Fase.ESCUCHANDO;
        desdeMs = ahoraMs;
        return Apertura.ESCUCHANDO;
    }

    // -9-nov-2026, orden t162u, punto 1- Qué hace la ventana con cada respuesta de alAbrirMicrofono. Sin Android, para
    // probar en la JVM que una respuesta descartada llega a liberar ESA captura -VoskNativoPlugin.liberarCaptura-.
    interface AlAbrir {
        void escuchando();
        void noAbrio();
        void anotada();
        void ignorada();
        void descartada();
        void liberar(long captura);
    }

    static void responder(Apertura r, long captura, AlAbrir a) {
        switch (r) {
            case ESCUCHANDO: a.escuchando(); return;
            case PAUSA: a.noAbrio(); return;
            case ANOTADA: a.anotada(); return;
            case IGNORADA: a.ignorada(); return;
            default:
                a.descartada();
                if (captura != 0) a.liberar(captura);
        }
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
