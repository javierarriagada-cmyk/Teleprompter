// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: el arrastre de la banda por el asa, medido en la pantalla. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// EL ARRASTRE SIN TEMBLOR -09-11-2026-. Medido en el g86 con la APK 808: con el dedo bajando parejo por el asa la
// ventana pasó por y = 570, 551, 538, 535, 521, 520, 535, 546… La página medía el dedo con clientX/clientY, relativos
// a la propia ventana, y mandaba cada paso; mientras el mensaje viajaba la ventana ya se había movido o todavía no, y
// al sumar pasos el error se acumulaba.
//
// Aquí el dedo se mide en la PANTALLA -MotionEvent.getRawX/getRawY, que no cambian cuando la ventana se mueve- y la
// posición sale siempre desde el comienzo: la del DOWN más lo que avanzó el dedo desde el DOWN, acotada al área
// segura. No se suman pasos: el mismo recorrido da la misma ventana con 2 pasos o con 50.
//
// Sin Android, para probarlo en la JVM -ArrastreVentanaTest-. VentanaDePrueba le pasa los toques de la WebView de la
// banda y pone en la ventana lo que devuelve, en píxeles. El arrastre solo empieza cuando la página avisa que el dedo
// se apoyó en el asa -moverInicio- y el dedo sigue apoyado: un toque en la lectura o en un botón nunca mueve la ventana.
final class ArrastreVentana {
    // El primer dedo del toque en curso: dónde se apoyó en la pantalla y dónde estaba la ventana en ese momento.
    private boolean apoyado;
    private int dedo = -1;
    private float rawX0, rawY0;
    private int x0, y0;
    // El arrastre de este toque, si la página lo pidió.
    private boolean activo;
    private int pasos;
    private int ultimaX, ultimaY;

    // ACTION_DOWN: un toque nuevo. Lo que quedara de un toque anterior se olvida: un DOWN nunca sigue un arrastre viejo.
    void alApoyar(int idDedo, float rawX, float rawY, int ventanaX, int ventanaY) {
        apoyado = true;
        dedo = idDedo;
        rawX0 = rawX; rawY0 = rawY;
        x0 = ventanaX; y0 = ventanaY;
        ultimaX = ventanaX; ultimaY = ventanaY;
        activo = false;
        pasos = 0;
    }

    // moverInicio de la página. Si el dedo ya se levantó, no hace nada: el aviso llegó tarde.
    boolean empezar() {
        if (!apoyado || activo) return false;
        activo = true;
        pasos = 0;
        return true;
    }

    boolean activo() { return activo; }
    int dedo() { return dedo; }
    int pasos() { return pasos; }
    int x0() { return x0; }
    int y0() { return y0; }
    int ultimaX() { return ultimaX; }
    int ultimaY() { return ultimaY; }

    // ACTION_MOVE del primer dedo: {x, y} de la ventana, o null si no hay arrastre. ancho y alto son los de la
    // ventana; (l, t, r, b) el área segura; minAncho y minAlto, el mínimo en la misma unidad.
    int[] alMover(float rawX, float rawY, int ancho, int alto, int l, int t, int r, int b, int minAncho, int minAlto) {
        if (!activo) return null;
        pasos++;
        int[] p = posicion(x0, y0, rawX0, rawY0, rawX, rawY, ancho, alto, l, t, r, b, minAncho, minAlto);
        ultimaX = p[0]; ultimaY = p[1];
        return p;
    }

    // ACTION_UP, ACTION_CANCEL, el primer dedo que se levanta o el giro: termina. Devuelve si había arrastre, para
    // guardar la geometría y mandarla a la página una sola vez.
    boolean terminar() {
        boolean habia = activo;
        activo = false;
        apoyado = false;
        dedo = -1;
        return habia;
    }

    // La posición desde el comienzo, sin sumar pasos.
    static int[] posicion(int x0, int y0, float rawX0, float rawY0, float rawX, float rawY,
                          int ancho, int alto, int l, int t, int r, int b, int minAncho, int minAlto) {
        int x = x0 + Math.round(rawX - rawX0);
        int y = y0 + Math.round(rawY - rawY0);
        int[] g = GeometriaVentana.acotar(new int[] { x, y, ancho, alto }, l, t, r, b, minAncho, minAlto);
        return new int[] { g[0], g[1] };
    }
}
