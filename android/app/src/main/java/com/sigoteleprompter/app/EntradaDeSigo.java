// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: lo que manda Sigo a la sesión de la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// LO QUE MANDA SIGO, SIN ANDROID -9-nov-2026, orden t163u, caso 1-. Era el cuerpo de VentanaDePrueba.Sesion.deSigo:
// el contrato rehace las reglas y un estado mueve la cuenta de Empezar. Vive aquí, con el JSON ya leído -Mensaje-,
// para probar en la JVM -EntradaDeSigoTest- a qué sesión se aplica cada mensaje. deSigo lee el JSON y llama a recibir.
final class EntradaDeSigo {
    // El mensaje de Sigo, ya leído. sesion: -1 si no trae.
    static final class Mensaje {
        String tipo = "";
        long sesion = -1;
        boolean conLimite;
        int lecturaSeg, avisoAntesSeg;
        double leidosSeg;
        int cuenta;
        boolean terminada, cancelada;
    }

    // Lo que la sesión receptora hace con cada mensaje.
    interface Receptor {
        SesionVentana reglas();
        void ponerReglas(SesionVentana nuevas);
        // El reloj del fin de la cuenta de Empezar, desde el primer número.
        void programarFinCuenta(long finMs);
        void quitarFinCuenta();
        // La respuesta de las reglas a un estado: lo que hace la ventana -Pausa, micrófono, enviarEstado-. true: el
        // mensaje pasa a la página de la ventana.
        boolean alFinDeLaCuentaInicial(SesionVentana.Inicial r);
        void anotar(String linea);
    }

    // true: el mensaje pasa a la página de la ventana -el guion del contrato, por ejemplo-.
    static boolean recibir(Mensaje m, long numero, long ahoraMs, Receptor r) {
        // -9-nov-2026, orden t163u, caso 1- enviarAPagina entrega el mensaje a la sesión que esté abierta cuando Android
        // procesa la tarea: un contrato o una cancelación atrasados de una ventana anterior le llegaban a la nueva, y le
        // rehacían las reglas o le cortaban la cuenta. Antes de aplicar cualquiera de los dos, su número tiene que ser el
        // de esta sesión; si no -o si no trae número-, se descarta y queda en el registro.
        if (("contrato".equals(m.tipo) || "estado".equals(m.tipo)) && m.sesion != numero) {
            r.anotar(m.tipo + " de la sesión " + (m.sesion < 0 ? "sin número" : String.valueOf(m.sesion))
                + " descartado: la abierta es la " + numero);
            return false;
        }
        if ("contrato".equals(m.tipo)) {
            r.ponerReglas(new SesionVentana(m.conLimite, m.lecturaSeg, m.avisoAntesSeg, m.leidosSeg));
            r.quitarFinCuenta();
            r.anotar("contrato: límite=" + (m.conLimite ? m.lecturaSeg + "s aviso " + m.avisoAntesSeg + "s" : "sin límite")
                + " leídos=" + m.leidosSeg);
            return true;
        }
        if (!"estado".equals(m.tipo)) return true;
        SesionVentana reglas = r.reglas();
        boolean primerNumero = m.cuenta > 0 && reglas.finCuentaInicialMs() < 0;
        SesionVentana.Inicial res = reglas.estadoDeSigo(m.cuenta, m.terminada, m.cancelada, ahoraMs);
        if (primerNumero && reglas.finCuentaInicialMs() >= 0) r.programarFinCuenta(reglas.finCuentaInicialMs());
        return r.alFinDeLaCuentaInicial(res);
    }
}
