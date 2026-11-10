// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t165u: el camino del sensor y del reloj del giro, el mismo que usa la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// EL RELOJ QUE CONFIRMA EL GIRO -10-11-2026, orden t165u-. Hasta 529caf6 VentanaDePrueba hacía esto mismo en línea
// -alGradosDelSensor, el Runnable relojGiro, el observador de «Rotación automática» y reprogramarRelojGiro-: pasar la
// lectura o la hora a OrientacionDeVentana, anotar, volver a poner el reloj en proximoReloj() y encuadrar si la
// compensación cambió. Se saca aquí, sin Android, para probar en la JVM que la ventana de verdad pone el primer
// vencimiento de ESTABLE_MS después de UNA sola lectura y que, al vencer, la banda gira sin otra muestra
// -RelojDelGiroTest-. VentanaDePrueba pone el Handler, la hora y el encuadre; ConexionDelGiroTest comprueba que los usa.
final class RelojDelGiro {
    interface Plataforma {
        long ahora();
        // Quita el vencimiento puesto, si hay.
        void quitarReloj();
        // Pone un vencimiento dentro de demoraMs; al llegar, la ventana llama a alVencer().
        void programarReloj(long demoraMs);
        void anotarGiro();
        // La compensación cambió: la ventana vuelve a encuadrar la banda -VentanaDePrueba.alCambiarPantalla-.
        void encuadrarGiro();
    }

    private final OrientacionDeVentana orientacion;
    private final Plataforma plataforma;

    RelojDelGiro(OrientacionDeVentana orientacion, Plataforma plataforma) {
        this.orientacion = orientacion;
        this.plataforma = plataforma;
    }

    // Una lectura de OrientationEventListener.
    void alSensor(int grados) {
        despues(orientacion.alSensor(grados, plataforma.ahora()));
    }

    // Venció el reloj: la confirmación de la candidata o la gracia.
    void alVencer() {
        despues(orientacion.alReloj(plataforma.ahora()));
    }

    // «Rotación automática» cambió.
    void alAuto(boolean rotacionAutomatica) {
        despues(orientacion.alAuto(rotacionAutomatica, plataforma.ahora()));
    }

    // Un solo vencimiento a la vez: el que diga proximoReloj(), o ninguno.
    void reprogramar() {
        plataforma.quitarReloj();
        long t = orientacion.proximoReloj();
        if (t >= 0) plataforma.programarReloj(Math.max(0, t - plataforma.ahora()));
    }

    private void despues(boolean cambio) {
        plataforma.anotarGiro();
        reprogramar();
        if (cambio) plataforma.encuadrarGiro();
    }
}
