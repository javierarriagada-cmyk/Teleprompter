// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t167u: el cambio de tamaño por la esquina, medido en la pantalla. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// EL TAMAÑO SIN TEMBLOR -10-11-2026, orden t167u-. Javier lo vio en el g86 con la APK 819: de lado, al arrastrar la
// esquina, la banda temblaba; de pie no, y el asa tampoco. La página medía el dedo con clientX/clientY, que están en el
// marco de su WebView, y mandaba cada diferencia como 'tamano'. Con la banda girada -compensación 1, 2 o 3- la WebView
// gira dentro de su ventana, y al cambiar el tamaño la ventana se corre en la pantalla -GeometriaVentana.aPantalla: con
// c = 1 la x de la ventana es ancho - (y + alto)-; mientras la vista ya está con la medida nueva y la ventana todavía
// donde estaba, el dedo quieto se lee corrido y la diferencia siguiente lleva ese error: el tamaño avanza a saltos y
// sigue moviéndose con el dedo quieto. De pie, y con Android ya girado, la esquina de arriba a la izquierda de la
// ventana no se mueve y no pasa. Además cada paso ponía la ventana dos veces -banda.cambiar y encuadrar- y la guardaba,
// y al llegar al borde GeometriaVentana.acotar corría la banda entera: la esquina opuesta se movía con el dedo.
//
// Igual que el asa -ArrastreVentana-: el dedo se mide en la PANTALLA -getRawX/getRawY, pasado al marco de la persona
// con BandaGirada.aPersona, que no depende de la ventana- y el tamaño sale siempre desde el comienzo: el del DOWN más lo
// que avanzó el dedo desde el DOWN. La esquina opuesta -arriba a la izquierda de la persona- no se mueve: el ancho y
// el alto se detienen en el borde del área segura y en el mínimo. No se suman pasos.
//
// Sin Android, para probarlo en la JVM -TamanoVentanaTest-. VentanaDePrueba le pasa los toques de la banda; el cambio
// solo empieza cuando la página avisa que el dedo se apoyó en la esquina -tamanoInicio- y el dedo sigue apoyado.
final class TamanoVentana {
    private boolean apoyado;
    private int dedo = -1;
    private float u0, v0;
    private int[] g0 = new int[4];
    private boolean activo;
    private int pasos;

    // ACTION_DOWN, en el marco de la persona: el dedo y la banda de ese momento. Un DOWN nunca sigue un gesto viejo.
    void alApoyar(int idDedo, float u, float v, int[] banda) {
        apoyado = true;
        dedo = idDedo;
        u0 = u; v0 = v;
        g0 = banda.clone();
        activo = false;
        pasos = 0;
    }

    // tamanoInicio de la página. Si el dedo ya se levantó, no hace nada: el aviso llegó tarde.
    boolean empezar() {
        if (!apoyado || activo) return false;
        activo = true;
        pasos = 0;
        return true;
    }

    boolean activo() { return activo; }
    int dedo() { return dedo; }
    int pasos() { return pasos; }
    int[] inicial() { return g0.clone(); }

    // ACTION_MOVE del primer dedo, en el marco de la persona: {x, y, ancho, alto} de la banda, o null si no hay cambio
    // de tamaño. r y b, el borde derecho y el de abajo del área segura de la persona; minAncho y minAlto, el mínimo.
    int[] alMover(float u, float v, int r, int b, int minAncho, int minAlto) {
        if (!activo) return null;
        pasos++;
        return tamano(g0, u0, v0, u, v, r, b, minAncho, minAlto);
    }

    // ACTION_UP, ACTION_CANCEL, el primer dedo que se levanta, el giro o el cierre. true si había cambio de tamaño, para
    // guardar la geometría y mandarla a la página una sola vez.
    boolean terminar() {
        boolean habia = activo;
        activo = false;
        apoyado = false;
        dedo = -1;
        return habia;
    }

    // El tamaño desde el comienzo, con la esquina opuesta fija en (g0[0], g0[1]).
    static int[] tamano(int[] g0, float u0, float v0, float u, float v, int r, int b, int minAncho, int minAlto) {
        int maxAncho = Math.max(minAncho, r - g0[0]);
        int maxAlto = Math.max(minAlto, b - g0[1]);
        int ancho = Math.max(minAncho, Math.min(maxAncho, g0[2] + Math.round(u - u0)));
        int alto = Math.max(minAlto, Math.min(maxAlto, g0[3] + Math.round(v - v0)));
        return new int[] { g0[0], g0[1], ancho, alto };
    }
}
